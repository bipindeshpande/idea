"""
Integration tests for Authentication flows.
Run with: pytest tests/integration/test_auth_flows.py -v
"""
import pytest
import json
import uuid
from datetime import datetime, timedelta
from app.models.database import (
    db, User, UserSession
)


class TestRegistrationFlow:
    """Integration tests for user registration."""
    
    def test_register_new_user(self, client, app):
        """Test complete registration flow."""
        with app.app_context():
            unique_email = f"newuser_{uuid.uuid4().hex[:8]}@example.com"
            
            response = client.post("/api/auth/register", json={
                "email": unique_email,
                "password": "test-password-123",
                "confirm_password": "test-password-123",
            })
            
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
            assert "session_token" in data
            assert data["user"]["email"] == unique_email
            
            # Verify user was created
            user = User.query.filter_by(email=unique_email).first()
            assert user is not None
            assert user.check_password("test-password-123")
            
            # Cleanup
            if user:
                db.session.delete(user)
                db.session.commit()
    
    def test_register_duplicate_email_rejected(self, client, app, test_user):
        """Test that duplicate email registration is rejected."""
        response = client.post("/api/auth/register", json={
            "email": test_user.email,
            "password": "test-password",
            "confirm_password": "test-password",
        })
        
        assert response.status_code == 400
        data = response.get_json()
        error_msg = data.get("error", "").lower()
        assert "already" in error_msg or "registered" in error_msg


class TestLoginFlow:
    """Integration tests for user login."""
    
    def test_login_with_valid_credentials(self, client, test_user):
        """Test login with valid credentials."""
        response = client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "test-password",
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "session_token" in data
        assert data["user"]["email"] == test_user.email
    
    def test_login_with_invalid_credentials(self, client, test_user):
        """Test login with invalid credentials."""
        response = client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "wrong-password",
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert data["success"] is False
        assert "invalid" in data.get("error", "").lower()
    
    def test_login_creates_session(self, client, app, test_user):
        """Test that login creates a session."""
        with app.app_context():
            response = client.post("/api/auth/login", json={
                "email": test_user.email,
                "password": "test-password",
            })
            
            assert response.status_code == 200
            data = response.get_json()
            session_token = data["session_token"]
            
            # Verify session exists
            session = UserSession.query.filter_by(session_token=session_token).first()
            assert session is not None
            assert session.user_id == test_user.id
            
            # Cleanup
            if session:
                db.session.delete(session)
                db.session.commit()


class TestSessionManagement:
    """Integration tests for session management."""
    
    def test_authenticated_request_with_valid_session(self, authenticated_client, test_user):
        """Test that authenticated requests work with valid session."""
        response = authenticated_client.get("/api/user/usage")
        assert response.status_code == 200
    
    def test_unauthenticated_request_rejected(self, client):
        """Test that unauthenticated requests are rejected."""
        response = client.get("/api/user/usage")
        assert response.status_code == 401
    
    def test_logout_invalidates_session(self, client, app, test_user):
        """Test that logout invalidates the session."""
        with app.app_context():
            # Login first
            login_response = client.post("/api/auth/login", json={
                "email": test_user.email,
                "password": "test-password",
            })
            assert login_response.status_code == 200
            session_token = login_response.get_json()["session_token"]
            
            # Logout
            logout_response = client.post("/api/auth/logout", headers={
                "Authorization": f"Bearer {session_token}"
            })
            assert logout_response.status_code == 200
            
            # Verify session is invalidated
            session = UserSession.query.filter_by(session_token=session_token).first()
            assert session is None or session.expires_at < datetime.utcnow()

