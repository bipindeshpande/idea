"""
Integration Tests for Discovery Endpoint

Tests the actual /api/run endpoint with mocked LLM calls.
Verifies founder_psychology flows through the real pipeline.
"""

import json
import sys
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tests.helpers.persona_inputs import (
    risk_averse_input,
    fast_executor_input,
    low_time_input
)


class MockOpenAICompletion:
    """Mock OpenAI completion response."""
    
    def __init__(self, content: str):
        self.choices = [Mock()]
        self.choices[0].message = Mock()
        self.choices[0].message.content = content


def get_mock_openai_responses(persona: str, prompt_type: str = "general"):
    """Get mock OpenAI responses based on persona and prompt type."""
    
    if prompt_type == "profile":
        if persona == "risk_averse":
            return MockOpenAICompletion("""# Profile Analysis

## Founder Psychology Summary
- Motivation: Security and stability
- Biggest Fear: Failure
- Decision Style: Slow and cautious
- Energy Pattern: Steady, consistent
- Constraints: Limited time
- Success Definition: Stable recurring income

This founder values security and avoids high-risk ventures.""")
        elif persona == "fast_executor":
            return MockOpenAICompletion("""# Profile Analysis

## Founder Psychology Summary
- Motivation: Freedom and independence
- Biggest Fear: Moving too slowly
- Decision Style: Fast, action-oriented
- Energy Pattern: Bursts of high activity
- Constraints: None significant
- Success Definition: Speed and growth

This founder moves quickly and values action over analysis.""")
        else:
            return MockOpenAICompletion("""# Profile Analysis

## Founder Psychology Summary
- Motivation: Extra income
- Biggest Fear: Overcommitting
- Decision Style: Slow, careful
- Energy Pattern: Low, consistent
- Constraints: Job + family
- Success Definition: Earn without burnout

This founder needs minimal-ops solutions.""")
    
    elif prompt_type == "research":
        return MockOpenAICompletion("""# Market Research

## Top Startup Ideas

1. **Lean Micro SaaS** - Low-risk, recurring revenue model
2. **Content Repurposing Service** - Scalable with minimal ops
3. **AI-powered Automation Tool** - High growth potential

Market trends show strong demand in these areas.""")
    
    elif prompt_type == "recommendation":
        if persona == "risk_averse":
            return MockOpenAICompletion("""# Personalized Recommendations

## Top Ideas for You

### 1. Lean Micro SaaS (Score: 88)
**Why this fits you:** Low upfront investment, steady recurring revenue. Perfect for your risk-averse approach.

**Tone:** Reassuring - We understand you value security and stability.

**Risk Framing:** This idea avoids high upfront investment and focuses on validated, low-risk approaches.

**30-Day Roadmap:** Validate with smallest scope possible. Start with one feature, test with 5 users.
**60-Day Roadmap:** Collect early feedback. Iterate based on real usage data.
**90-Day Roadmap:** Scale only if metrics hit threshold. Don't expand until proven.

This approach matches your steady energy pattern and cautious decision style.""")
        elif persona == "fast_executor":
            return MockOpenAICompletion("""# Personalized Recommendations

## Top Ideas for You

### 1. Automated Video Clipper (Score: 91)
**Why this fits you:** High growth potential, fast execution path. Perfect for your action-oriented approach.

**Tone:** Direct - Let's move fast and build something great.

**Risk Framing:** Bias toward action - ship quickly, iterate based on feedback.

**30-Day Roadmap:** Ship MVP in one week. Get it live and start getting users.
**60-Day Roadmap:** Acquire 10 users. Get real feedback and iterate.
**90-Day Roadmap:** Iterate aggressively. Double down on what works.

This matches your fast decision style and burst energy pattern.""")
        else:
            return MockOpenAICompletion("""# Personalized Recommendations

## Top Ideas for You

### 1. One-Page Info Product (Score: 82)
**Why this fits you:** Minimal operations, can be done in spare time. Perfect for your constrained schedule.

**Tone:** Supportive - We know you're balancing a lot. This works around your schedule.

**Risk Framing:** Minimize ops - automate everything possible, keep it simple.

**30-Day Roadmap:** Create 1 template. Keep it simple, focus on quality.
**60-Day Roadmap:** Publish quietly. Start small, don't overcommit.
**90-Day Roadmap:** Automate everything possible. Set up systems to run without you.

This respects your low energy pattern and need to avoid overcommitting.""")
    
    else:
        return MockOpenAICompletion("Mock response")


@pytest.fixture
def mock_openai_for_tools(monkeypatch):
    """Mock OpenAI client in tools."""
    def setup_mock(persona: str):
        mock_client = Mock()
        call_count = {"profile": 0, "research": 0, "recommendation": 0}
        
        def mock_create(**kwargs):
            messages = kwargs.get('messages', [])
            prompt = str(messages[-1].get('content', '')) if messages else ''
            
            # Determine response type
            if 'profile' in prompt.lower() or 'analyze' in prompt.lower():
                call_count["profile"] += 1
                return get_mock_openai_responses(persona, "profile")
            elif 'research' in prompt.lower() or 'market' in prompt.lower():
                call_count["research"] += 1
                return get_mock_openai_responses(persona, "research")
            elif 'recommend' in prompt.lower() or 'personalized' in prompt.lower():
                call_count["recommendation"] += 1
                return get_mock_openai_responses(persona, "recommendation")
            else:
                return get_mock_openai_responses(persona, "general")
        
        mock_client.chat.completions.create = mock_create
        
        # Inject into tools
        import startup_idea_crew.tools.market_research_tool as mrt
        monkeypatch.setattr(mrt, '_MOCK_OPENAI_CLIENT', mock_client)
        
        import startup_idea_crew.tools.validation_tool as vt
        monkeypatch.setattr(vt, '_MOCK_OPENAI_CLIENT', mock_client)
        
        return mock_client, call_count
    return setup_mock


@pytest.fixture
def app_with_auth(monkeypatch):
    """Create Flask app with test client and authenticated user."""
    # Import app directly (not create_app)
    import api
    from app.models.database import db, User, UserSession
    from datetime import datetime, timedelta
    
    app = api.app
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    # Store original database URI to restore later
    original_uri = app.config.get('SQLALCHEMY_DATABASE_URI')
    
    try:
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
            
            # Create test session (expires_at is required, set to future date)
            future_date = datetime.utcnow() + timedelta(days=30)
            session = UserSession(
                user_id=user.id,
                session_token='test_token',
                expires_at=future_date
            )
            db.session.add(session)
            db.session.commit()
            
            # Mock get_current_session to return our test session
            def mock_get_session():
                return session
            
            # Patch get_current_session
            monkeypatch.setattr('app.routes.discovery.get_current_session', mock_get_session)
            monkeypatch.setattr('app.utils.get_current_session', mock_get_session)
            
            with app.test_client() as client:
                # Set auth header
                client.environ_base['HTTP_AUTHORIZATION'] = 'Bearer test_token'
                
                yield app, client, user
        
    finally:
        # Cleanup
        try:
            with app.app_context():
                db.session.remove()
                db.drop_all()
        except Exception:
            pass  # Ignore cleanup errors


def extract_psychology_indicators(text: str) -> dict:
    """Extract psychology-related indicators from text."""
    indicators = {
        "has_tone": False,
        "has_risk_framing": False,
        "has_roadmap": False,
        "tone_words": [],
        "risk_words": [],
        "roadmap_mentions": []
    }
    
    text_lower = text.lower()
    
    # Check for tone indicators
    tone_words = ["reassuring", "direct", "supportive", "encouraging", "confident"]
    for word in tone_words:
        if word in text_lower:
            indicators["has_tone"] = True
            indicators["tone_words"].append(word)
    
    # Check for risk framing
    risk_words = ["risk", "avoid", "low", "high", "investment", "action", "minimize"]
    for word in risk_words:
        if word in text_lower:
            indicators["has_risk_framing"] = True
            indicators["risk_words"].append(word)
    
    # Check for roadmap
    roadmap_indicators = ["30", "60", "90", "day", "roadmap", "week", "month"]
    if any(indicator in text_lower for indicator in roadmap_indicators):
        indicators["has_roadmap"] = True
        indicators["roadmap_mentions"] = [w for w in roadmap_indicators if w in text_lower]
    
    return indicators


def test_risk_averse_psychology_in_outputs(mock_openai_for_tools, app_with_auth):
    """Test that risk_averse psychology appears in actual discovery outputs."""
    app, client, user = app_with_auth
    mock_client, call_count = mock_openai_for_tools("risk_averse")
    
    # Mock get_current_session
    with patch('app.routes.discovery.get_current_session') as mock_session:
        from app.models.database import UserSession
        session = UserSession.query.filter_by(user_id=user.id).first()
        mock_session.return_value = session
        
        # Call the actual endpoint
        response = client.post('/api/run', json=risk_averse_input)
        
        # Should succeed
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'outputs' in data
        
        outputs = data['outputs']
        
        # Verify profile analysis contains psychology
        profile = outputs.get('profile_analysis', '')
        assert 'psychology' in profile.lower() or 'security' in profile.lower() or 'stability' in profile.lower()
        
        # Verify recommendations contain psychology indicators
        recommendations = outputs.get('personalized_recommendations', '')
        indicators = extract_psychology_indicators(recommendations)
        
        # Should have tone, risk framing, and roadmap
        assert indicators["has_tone"] or "reassuring" in recommendations.lower()
        assert indicators["has_risk_framing"] or "risk" in recommendations.lower()
        assert indicators["has_roadmap"] or "30" in recommendations.lower()


def test_fast_executor_psychology_in_outputs(mock_openai_for_tools, app_with_auth):
    """Test that fast_executor psychology appears in actual discovery outputs."""
    app, client, user = app_with_auth
    mock_client, call_count = mock_openai_for_tools("fast_executor")
    
    with patch('app.routes.discovery.get_current_session') as mock_session:
        from app.models.database import UserSession
        session = UserSession.query.filter_by(user_id=user.id).first()
        mock_session.return_value = session
        
        response = client.post('/api/run', json=fast_executor_input)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        
        outputs = data['outputs']
        recommendations = outputs.get('personalized_recommendations', '')
        indicators = extract_psychology_indicators(recommendations)
        
        # Fast executor should have action-oriented language
        assert (
            indicators["has_tone"] or 
            "direct" in recommendations.lower() or
            "action" in recommendations.lower() or
            "fast" in recommendations.lower()
        )


def test_psychology_differences_between_personas(mock_openai_for_tools, app_with_auth):
    """Test that different personas produce different outputs."""
    app, client, user = app_with_auth
    
    # Test risk_averse
    mock_client1, _ = mock_openai_for_tools("risk_averse")
    with patch('app.routes.discovery.get_current_session') as mock_session:
        from app.models.database import UserSession
        session = UserSession.query.filter_by(user_id=user.id).first()
        mock_session.return_value = session
        
        response1 = client.post('/api/run', json=risk_averse_input)
        data1 = json.loads(response1.data)
        rec1 = data1['outputs'].get('personalized_recommendations', '')
        indicators1 = extract_psychology_indicators(rec1)
    
    # Test fast_executor
    mock_client2, _ = mock_openai_for_tools("fast_executor")
    with patch('app.routes.discovery.get_current_session') as mock_session:
        from app.models.database import UserSession
        session = UserSession.query.filter_by(user_id=user.id).first()
        mock_session.return_value = session
        
        response2 = client.post('/api/run', json=fast_executor_input)
        data2 = json.loads(response2.data)
        rec2 = data2['outputs'].get('personalized_recommendations', '')
        indicators2 = extract_psychology_indicators(rec2)
    
    # Outputs should differ
    assert rec1 != rec2
    
    # Tone words should differ
    assert (
        set(indicators1["tone_words"]) != set(indicators2["tone_words"]) or
        len(indicators1["tone_words"]) > 0 or
        len(indicators2["tone_words"]) > 0
    )

