"""
Authentication Integration Tests

Tests the REAL authentication system without mocking get_current_session.
Verifies:
- /api/auth/login returns valid session token
- /api/run requires authentication
- /api/run rejects invalid tokens
- /api/run rejects expired tokens
- /api/run succeeds only with valid token
"""

import json
import sys
import pytest
from pathlib import Path
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from unittest.mock import Mock, patch

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


@pytest.fixture
def app_with_db(monkeypatch):
    """Create Flask app with test database."""
    import api
    from app.models.database import db, User, UserSession
    
    app = api.app
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    # Disable rate limiting for tests - patch before routes are called
    def no_op_decorator(func):
        return func
    
    def mock_apply_rate_limit(limit_string):
        return no_op_decorator
    
    import app.routes.auth as auth_module
    import app.routes.discovery as discovery_module
    
    # Patch rate limiting using monkeypatch
    monkeypatch.setattr(auth_module, 'apply_rate_limit', mock_apply_rate_limit)
    monkeypatch.setattr(discovery_module, 'apply_rate_limit', mock_apply_rate_limit)
    monkeypatch.setattr(auth_module, 'get_limiter', lambda: None)
    monkeypatch.setattr(discovery_module, 'get_limiter', lambda: None)
    monkeypatch.setattr(auth_module, '_limiter', None)
    monkeypatch.setattr(discovery_module, '_limiter', None)
    
    # Also patch at api level if limiter exists
    try:
        if hasattr(api, 'limiter'):
            mock_limiter = Mock()
            mock_limiter.limit = lambda x: no_op_decorator
            monkeypatch.setattr(api, 'limiter', mock_limiter)
    except:
        pass
    
    with app.app_context():
        db.create_all()
        
        # Create test user
        user = User(
            email='test@example.com',
            password_hash=generate_password_hash('testpassword123'),
            subscription_type='free'
        )
        db.session.add(user)
        db.session.commit()
        
        yield app, user
    
    # Cleanup
    try:
        with app.app_context():
            db.session.remove()
            db.drop_all()
    except Exception:
        pass


def test_login_returns_valid_session_token(app_with_db):
    """Test that /api/auth/login returns a valid session token."""
    app, user = app_with_db
    
    with app.test_client() as client:
        response = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'testpassword123'
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.data}"
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'session_token' in data
        assert 'user' in data
        
        session_token = data['session_token']
        assert len(session_token) > 0, "Session token should not be empty"
        
        # Verify session exists in database
        from app.models.database import UserSession
        session = UserSession.query.filter_by(session_token=session_token).first()
        assert session is not None, "Session should exist in database"
        assert session.user_id == user.id, "Session should belong to test user"


def test_login_rejects_invalid_credentials(app_with_db):
    """Test that /api/auth/login rejects invalid credentials."""
    app, user = app_with_db
    
    with app.test_client() as client:
        # Wrong password
        response = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'wrongpassword'
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.data}"
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'error' in data
        
        # Wrong email
        response = client.post('/api/auth/login', json={
            'email': 'wrong@example.com',
            'password': 'testpassword123'
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.data}"


def test_api_run_requires_authentication(app_with_db):
    """Test that /api/run requires authentication."""
    app, user = app_with_db
    
    with app.test_client() as client:
        # No Authorization header
        response = client.post('/api/run', json={
            'goal_type': 'create_business',
            'interest_area': 'AI Tools'
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.data}"
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'error' in data
        assert 'Authentication' in data['error'] or 'authentication' in data['error'].lower()


def test_api_run_rejects_invalid_token(app_with_db):
    """Test that /api/run rejects invalid tokens."""
    app, user = app_with_db
    
    with app.test_client() as client:
        # Invalid token
        response = client.post('/api/run', 
            json={'goal_type': 'create_business'},
            headers={'Authorization': 'Bearer invalid_token_12345'}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.data}"
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'error' in data


def test_api_run_rejects_expired_token(app_with_db):
    """Test that /api/run rejects expired tokens."""
    app, user = app_with_db
    
    from app.models.database import UserSession, db
    
    with app.app_context():
        # Create expired session
        expired_date = datetime.utcnow() - timedelta(days=1)
        expired_session = UserSession(
            user_id=user.id,
            session_token='expired_token',
            expires_at=expired_date
        )
        db.session.add(expired_session)
        db.session.commit()
    
    with app.test_client() as client:
        response = client.post('/api/run',
            json={'goal_type': 'create_business'},
            headers={'Authorization': 'Bearer expired_token'}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.data}"
        data = json.loads(response.data)
        assert data['success'] == False
        assert 'error' in data


def test_api_run_succeeds_with_valid_token(app_with_db):
    """Test that /api/run succeeds only with a valid token."""
    app, user = app_with_db
    
    # First, login to get a valid token
    with app.test_client() as client:
        login_response = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'testpassword123'
        })
        
        assert login_response.status_code == 200
        login_data = json.loads(login_response.data)
        session_token = login_data['session_token']
        
        # Now try to use /api/run with the valid token
        # Note: We'll mock CrewAI to avoid actual LLM calls, but auth should work
        from unittest.mock import patch, Mock
        from crewai import Crew
        
        def mock_kickoff(self, inputs):
            # Just return a mock result - we're only testing auth here
            return Mock()
        
        with patch.object(Crew, 'kickoff', mock_kickoff):
            response = client.post('/api/run',
                json={
                    'goal_type': 'create_business',
                    'interest_area': 'AI Tools',
                    'sub_interest_area': 'Automation',
                    'time_commitment': '10 hours',
                    'budget_range': 'low',
                    'work_style': 'structured',
                    'skill_strength': 'analysis',
                    'experience_summary': 'I have experience in software development and want to build a SaaS product.'
                },
                headers={'Authorization': f'Bearer {session_token}'}
            )
            
            # Should not be 401 (auth should pass)
            assert response.status_code != 401, f"Auth should pass, got 401: {response.data}"
            # Could be 200 (success), 422 (validation), or 500 (crew execution error), but not 401
            assert response.status_code in [200, 422, 500], f"Expected 200/422/500, got {response.status_code}: {response.data}"


def test_api_run_with_multiple_valid_sessions(app_with_db):
    """Test that different valid sessions can both access /api/run."""
    app, user = app_with_db
    
    with app.test_client() as client:
        # Login twice to get two different sessions
        login1 = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'testpassword123'
        })
        assert login1.status_code == 200
        token1 = json.loads(login1.data)['session_token']
        
        login2 = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'testpassword123'
        })
        assert login2.status_code == 200
        token2 = json.loads(login2.data)['session_token']
        
        # Both tokens should be different
        assert token1 != token2, "Each login should create a unique session token"
        
        # Both should work with /api/run
        from unittest.mock import patch, Mock
        from crewai import Crew
        
        def mock_kickoff(self, inputs):
            return Mock()
        
        with patch.object(Crew, 'kickoff', mock_kickoff):
            # Test first token
            response1 = client.post('/api/run',
                json={
                    'goal_type': 'create_business',
                    'interest_area': 'AI Tools',
                    'sub_interest_area': 'Automation',
                    'time_commitment': '10 hours',
                    'budget_range': 'low',
                    'work_style': 'structured',
                    'skill_strength': 'analysis',
                    'experience_summary': 'I have experience in software development.'
                },
                headers={'Authorization': f'Bearer {token1}'}
            )
            
            # Verify first call auth passed (not 401)
            # Note: 429 (rate limit) is acceptable - we're testing auth, not rate limiting
            assert response1.status_code != 401, f"First token should authenticate, got {response1.status_code}: {response1.data}"
            
            # Test second token (might hit rate limit, but auth should still pass)
            response2 = client.post('/api/run',
                json={
                    'goal_type': 'create_business',
                    'interest_area': 'AI Tools',
                    'sub_interest_area': 'Automation',
                    'time_commitment': '10 hours',
                    'budget_range': 'low',
                    'work_style': 'structured',
                    'skill_strength': 'analysis',
                    'experience_summary': 'I have experience in software development.'
                },
                headers={'Authorization': f'Bearer {token2}'}
            )
            
            # Key assertion: Both tokens authenticated successfully (not 401)
            # 429 (rate limit) is acceptable - we're testing auth, not rate limiting
            # The important thing is that both tokens are accepted (not 401)
            assert response2.status_code != 401, f"Second token should authenticate, got {response2.status_code}: {response2.data}"
            
            # Final verification: Both sessions authenticated (not 401)
            # This proves multiple sessions work for authentication
            # Status codes other than 401 prove auth worked (could be 200, 422, 429, 500)
            auth_passed_1 = response1.status_code != 401
            auth_passed_2 = response2.status_code != 401
            assert auth_passed_1 and auth_passed_2, \
                f"Both sessions should authenticate (not 401). Got: {response1.status_code} and {response2.status_code}"

