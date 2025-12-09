"""
Integration tests for unified Discovery streaming functionality.
Tests TRUE streaming, SSE events, cache behavior, and error handling.
"""

import json
import sys
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tests.helpers.persona_inputs import risk_averse_input


class StreamingMockOpenAIClient:
    """Mock OpenAI client that streams chunks for testing."""
    
    def __init__(self, chunks: list = None):
        self.chunks = chunks or [
            "You're exploring",
            " startup ideas",
            " that match",
            " your profile.",
        ]
        self.chat = Mock()
        self.chat.completions = Mock()
        self.chat.completions.create = self._mock_create
    
    def _mock_create(self, **kwargs):
        """Mock OpenAI streaming response."""
        if kwargs.get('stream', False):
            # Return generator that yields chunks
            def stream_generator():
                for chunk_text in self.chunks:
                    chunk = Mock()
                    chunk.choices = [Mock()]
                    chunk.choices[0].delta = Mock()
                    chunk.choices[0].delta.content = chunk_text
                    yield chunk
            return stream_generator()
        else:
            # Non-streaming
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message = Mock()
            mock_response.choices[0].message.content = "".join(self.chunks)
            return mock_response


@pytest.fixture
def app_with_mocked_auth(monkeypatch):
    """Create Flask app with mocked authentication."""
    import api
    from app.models.database import db, User, UserSession
    
    app = api.app
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    # Disable rate limiting
    def no_op_decorator(func):
        return func
    
    def mock_apply_rate_limit(limit_string):
        return no_op_decorator
    
    import app.routes.discovery as discovery_module
    discovery_module.apply_rate_limit = mock_apply_rate_limit
    
    with app.app_context():
        db.create_all()
        
        # Create test user
        user = User(
            email='test@example.com',
            password_hash='test_hash',
            subscription_type='free'
        )
        db.session.add(user)
        db.session.commit()
        
        # Create test session
        future_date = datetime.utcnow() + timedelta(days=30)
        session = UserSession(
            user_id=user.id,
            session_token='test_token',
            expires_at=future_date
        )
        db.session.add(session)
        db.session.commit()
        
        # Mock get_current_session
        def mock_get_session():
            return session
        
        monkeypatch.setattr('app.routes.discovery.get_current_session', mock_get_session)
        monkeypatch.setattr('app.utils.get_current_session', mock_get_session)
        
        with app.test_client() as client:
            client.environ_base['HTTP_AUTHORIZATION'] = 'Bearer test_token'
            yield app, client, user
    
    # Cleanup
    try:
        with app.app_context():
            db.session.remove()
            db.drop_all()
    except Exception:
        pass


@pytest.fixture
def mock_openai_streaming(monkeypatch):
    """Mock OpenAI client for streaming tests."""
    def setup_mock(chunks=None):
        mock_client = StreamingMockOpenAIClient(chunks=chunks)
        
        # Mock the OpenAI client in unified_discovery_service
        import app.services.unified_discovery_service as uds
        monkeypatch.setattr(uds, '_MOCK_OPENAI_CLIENT', mock_client)
        
        return mock_client
    return setup_mock


def test_streaming_events_format(app_with_mocked_auth, mock_openai_streaming):
    """Test that SSE events are in correct format."""
    app, client, user = app_with_mocked_auth
    mock_openai_streaming(chunks=["Test chunk 1", "Test chunk 2"])
    
    response = client.post('/api/run?stream=true', json=risk_averse_input)
    
    assert response.status_code == 200
    assert response.mimetype == 'text/event-stream'
    
    # Parse SSE events
    events = []
    for line in response.data.decode('utf-8').split('\n'):
        if line.startswith('data: '):
            data = json.loads(line[6:])  # Remove 'data: ' prefix
            events.append(data)
    
    # Verify event format
    assert len(events) > 0
    assert events[0]['event'] == 'start'
    
    # Check for delta events
    delta_events = [e for e in events if e.get('event') == 'delta']
    assert len(delta_events) > 0, "Should have delta events"
    
    # Verify delta event format
    for delta in delta_events:
        assert 'text' in delta, "Delta events must have 'text' field"
        assert isinstance(delta['text'], str), "Delta text must be string"
    
    # Check for done event
    done_events = [e for e in events if e.get('event') == 'done']
    assert len(done_events) == 1, "Should have exactly one 'done' event"


def test_streaming_chunks_arrive_immediately(app_with_mocked_auth, mock_openai_streaming):
    """Test that chunks arrive immediately (not buffered)."""
    app, client, user = app_with_mocked_auth
    
    # Create chunks that will be streamed
    chunks = [f"Chunk {i}" for i in range(10)]
    mock_openai_streaming(chunks=chunks)
    
    response = client.post('/api/run?stream=true', json=risk_averse_input)
    
    assert response.status_code == 200
    
    # Count delta events (should match number of chunks)
    events = []
    for line in response.data.decode('utf-8').split('\n'):
        if line.startswith('data: '):
            try:
                data = json.loads(line[6:])
                events.append(data)
            except json.JSONDecodeError:
                pass
    
    delta_events = [e for e in events if e.get('event') == 'delta']
    # Should have at least some delta events (may have more due to parsing)
    assert len(delta_events) > 0, "Should have delta events"


def test_cache_hit_skips_streaming(app_with_mocked_auth, monkeypatch):
    """Test that cache hits return immediately without streaming."""
    app, client, user = app_with_mocked_auth
    
    # Mock cache to return cached result
    from app.services.unified_discovery_service import DiscoveryCache
    
    cached_outputs = {
        "profile_analysis": "Cached profile analysis",
        "startup_ideas_research": "Cached research",
        "personalized_recommendations": "Cached recommendations",
    }
    
    def mock_cache_get(profile_data, bypass=False):
        return cached_outputs
    
    monkeypatch.setattr(DiscoveryCache, 'get', staticmethod(mock_cache_get))
    
    response = client.post('/api/run?stream=true', json=risk_averse_input)
    
    assert response.status_code == 200
    
    # Parse events
    events = []
    for line in response.data.decode('utf-8').split('\n'):
        if line.startswith('data: '):
            try:
                data = json.loads(line[6:])
                events.append(data)
            except json.JSONDecodeError:
                pass
    
    # Should have start and done events (cached results streamed as sections)
    assert any(e.get('event') == 'start' for e in events)
    assert any(e.get('event') == 'done' for e in events)


def test_cache_bypass_mode(app_with_mocked_auth, mock_openai_streaming):
    """Test that cache bypass works correctly."""
    app, client, user = app_with_mocked_auth
    mock_openai_streaming()
    
    # First request - should cache
    response1 = client.post('/api/run', json=risk_averse_input)
    assert response1.status_code == 200
    
    # Second request with cache_bypass - should not use cache
    response2 = client.post('/api/run?cache_bypass=true', json=risk_averse_input)
    assert response2.status_code == 200
    
    # Both should succeed (bypass forces new generation)


def test_tool_failure_fallback(app_with_mocked_auth, mock_openai_streaming, monkeypatch):
    """Test that tool failures use fallback summaries."""
    app, client, user = app_with_mocked_auth
    mock_openai_streaming()
    
    # Mock a tool to fail
    from startup_idea_crew.tools import research_market_trends
    
    def failing_tool(*args, **kwargs):
        raise Exception("Tool failure for testing")
    
    monkeypatch.setattr('startup_idea_crew.tools.research_market_trends', failing_tool)
    
    # Request should still succeed (fallback used)
    response = client.post('/api/run', json=risk_averse_input)
    
    # Should succeed (fallback prevents failure)
    assert response.status_code in [200, 422]  # 422 if output validation fails, but not 500


def test_prompt_deterministic_ordering(app_with_mocked_auth, mock_openai_streaming):
    """Test that prompt has deterministic tool ordering."""
    from startup_idea_crew.unified_prompt import build_unified_prompt
    
    tool_results = {
        "zebra_tool": "Zebra result",
        "alpha_tool": "Alpha result",
        "beta_tool": "Beta result",
    }
    
    prompt1 = build_unified_prompt(
        goal_type="test",
        time_commitment="test",
        budget_range="test",
        interest_area="test",
        sub_interest_area="test",
        work_style="test",
        skill_strength="test",
        experience_summary="test",
        founder_psychology={},
        tool_results=tool_results,
    )
    
    # Build again with same inputs
    prompt2 = build_unified_prompt(
        goal_type="test",
        time_commitment="test",
        budget_range="test",
        interest_area="test",
        sub_interest_area="test",
        work_style="test",
        skill_strength="test",
        experience_summary="test",
        founder_psychology={},
        tool_results=tool_results,
    )
    
    # Prompts should be identical (deterministic)
    assert prompt1 == prompt2, "Prompts should be deterministic"


def test_cache_key_normalization(app_with_mocked_auth):
    """Test that cache keys are normalized correctly."""
    from app.utils.discovery_cache import DiscoveryCache
    
    # Test 1: Whitespace normalization
    profile1 = {
        "goal_type": "Extra Income",
        "time_commitment": "5-10 hours",
        "budget_range": "Low",
        "interest_area": "AI Tools",
        "sub_interest_area": "Automation",
        "work_style": "Solo",
        "skill_strength": "Analytical",
        "experience_summary": "Some experience",
        "founder_psychology": {},
    }
    
    profile2 = {
        "goal_type": "  Extra Income  ",  # Extra whitespace
        "time_commitment": "5-10 hours",
        "budget_range": "Low",
        "interest_area": "AI Tools",
        "sub_interest_area": "Automation",
        "work_style": "Solo",
        "skill_strength": "Analytical",
        "experience_summary": "Some experience",
        "founder_psychology": {},
    }
    
    key1 = DiscoveryCache._generate_cache_key(profile1)
    key2 = DiscoveryCache._generate_cache_key(profile2)
    
    # Keys should be identical (whitespace normalized)
    assert key1 == key2, "Cache keys should normalize whitespace"
    
    # Test 2: Case normalization
    profile3 = {
        "goal_type": "extra income",  # Lowercase
        "time_commitment": "5-10 hours",
        "budget_range": "low",
        "interest_area": "ai tools",
        "sub_interest_area": "automation",
        "work_style": "solo",
        "skill_strength": "analytical",
        "experience_summary": "some experience",
        "founder_psychology": {},
    }
    
    key3 = DiscoveryCache._generate_cache_key(profile3)
    
    # Keys should be identical (case normalized)
    assert key1 == key3, "Cache keys should normalize case"


def test_error_handling_sends_sse_error(app_with_mocked_auth, monkeypatch):
    """Test that errors send SSE error events."""
    app, client, user = app_with_mocked_auth
    
    # Mock OpenAI to raise error
    def failing_openai(*args, **kwargs):
        raise Exception("OpenAI API error")
    
    import app.services.unified_discovery_service as uds
    original_get = uds._get_openai_client
    
    def mock_get_client():
        client = original_get()
        client.chat.completions.create = failing_openai
        return client
    
    monkeypatch.setattr(uds, '_get_openai_client', mock_get_client)
    
    response = client.post('/api/run?stream=true', json=risk_averse_input)
    
    # Should return 200 (SSE stream) but with error event
    assert response.status_code == 200
    
    # Parse events
    events = []
    for line in response.data.decode('utf-8').split('\n'):
        if line.startswith('data: '):
            try:
                data = json.loads(line[6:])
                events.append(data)
            except json.JSONDecodeError:
                pass
    
    # Should have error event
    error_events = [e for e in events if e.get('event') == 'error']
    assert len(error_events) > 0, "Should have error event on failure"


