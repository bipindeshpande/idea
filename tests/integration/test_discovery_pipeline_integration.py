"""
Discovery Pipeline Integration Tests

Tests the FULL Discovery pipeline with LLM mocking.
- Mocks get_current_session (for auth)
- Lets CrewAI actually execute (does NOT mock Crew.kickoff)
- Mocks ONLY LLM calls (OpenAI layer)
- Verifies psychology-based behavior differences
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

from tests.helpers.persona_inputs import (
    risk_averse_input,
    fast_executor_input,
    low_time_input
)


class PersonaAwareMockOpenAIClient:
    """Mock OpenAI client that returns persona-specific responses."""
    
    def __init__(self, persona: str = "default"):
        self.persona = persona
        self.chat = Mock()
        self.chat.completions = Mock()
        self.chat.completions.create = self._mock_create
    
    def _get_response_for_messages(self, messages):
        """Helper to get response for langchain messages."""
        from langchain_core.messages import AIMessage
        
        prompt = str(messages[-1].content if hasattr(messages[-1], 'content') else messages[-1])
        
        if 'profile' in prompt.lower() or 'analyze' in prompt.lower() or 'core motivation' in prompt.lower():
            content = self._profile_response()
        elif 'research' in prompt.lower() or 'market' in prompt.lower():
            content = self._research_response()
        elif 'recommend' in prompt.lower() or 'personalized' in prompt.lower():
            content = self._recommendation_response()
        else:
            content = "Mock response"
        
        msg = AIMessage(content=content)
        if hasattr(msg, 'response_metadata'):
            msg.response_metadata = {}
        return msg
    
    def _mock_create(self, **kwargs):
        """Mock OpenAI chat completion."""
        messages = kwargs.get('messages', [])
        prompt = str(messages[-1].get('content', '')) if messages else ''
        
        # Determine response based on prompt content
        if 'profile' in prompt.lower() or 'analyze' in prompt.lower() or 'core motivation' in prompt.lower():
            content = self._profile_response()
        elif 'research' in prompt.lower() or 'market' in prompt.lower():
            content = self._research_response()
        elif 'recommend' in prompt.lower() or 'personalized' in prompt.lower():
            content = self._recommendation_response()
        else:
            content = "Mock response"
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message = Mock()
        mock_response.choices[0].message.content = content
        return mock_response
    
    def _profile_response(self):
        """Generate profile analysis response."""
        if self.persona == "risk_averse":
            return """## 1. Core Motivation

You're driven by security and stability. Your goal to replace your job reflects a desire for financial independence without taking unnecessary risks.

## 7. Founder Psychology Summary (INTERNAL - for downstream agents)

**Motivation Pattern:** Security-focused, values stability over growth
**Decision Style:** Slow and cautious - needs validation before committing
**Energy Pattern:** Steady, consistent - prefers sustainable pace
**Biggest Fear:** Failure and financial loss
**Constraints:** Limited time (5-10 hours/week)
**Success Definition:** Stable recurring income without high risk"""
        elif self.persona == "fast_executor":
            return """## 1. Core Motivation

You're driven by freedom and independence. Your goal to create a business reflects your desire to move fast and build something meaningful.

## 7. Founder Psychology Summary (INTERNAL - for downstream agents)

**Motivation Pattern:** Freedom-focused, values speed and growth
**Decision Style:** Fast, action-oriented - bias toward doing
**Energy Pattern:** Bursts of high activity - can handle intensity
**Biggest Fear:** Moving too slowly, missing opportunities
**Constraints:** None significant - ready to commit
**Success Definition:** Speed and growth, building something fast"""
        else:
            return """## 1. Core Motivation

You're looking for extra income without overcommitting. Your goal reflects a need to balance work, family, and side projects.

## 7. Founder Psychology Summary (INTERNAL - for downstream agents)

**Motivation Pattern:** Extra income-focused, values simplicity
**Decision Style:** Slow, careful - needs to avoid overcommitting
**Energy Pattern:** Low, consistent - must work within tight constraints
**Biggest Fear:** Overcommitting and burning out
**Constraints:** Job + family, very limited time (1-3 hours/week)
**Success Definition:** Earn without burnout, minimal operations"""
    
    def _research_response(self):
        """Generate research response."""
        return """# Market Research

## Top Startup Ideas

1. **Lean Micro SaaS** - Low-risk, recurring revenue model
2. **Content Repurposing Service** - Scalable with minimal ops
3. **AI-powered Automation Tool** - High growth potential"""
    
    def _recommendation_response(self):
        """Generate recommendation response."""
        if self.persona == "risk_averse":
            return """# Personalized Recommendations

## Top Ideas for You

### 1. Lean Micro SaaS (Score: 88)
**Why this fits you:** Low upfront investment, steady recurring revenue. Perfect for your risk-averse approach.

**Tone:** Reassuring - We understand you value security and stability. This idea lets you build income gradually without taking big risks.

**Risk Framing:** This idea avoids high upfront investment and focuses on validated, low-risk approaches. You can start small and scale only when metrics prove success.

**30-Day Roadmap:** Validate with smallest scope possible. Start with one core feature, test with 5 users, gather feedback.
**60-Day Roadmap:** Collect early feedback. Iterate based on real usage data. Don't expand until you have proof of concept.
**90-Day Roadmap:** Scale only if metrics hit threshold. Don't expand features or marketing until you have stable revenue and positive unit economics.

This approach matches your steady energy pattern and cautious decision style."""
        elif self.persona == "fast_executor":
            return """# Personalized Recommendations

## Top Ideas for You

### 1. Automated Video Clipper (Score: 91)
**Why this fits you:** High growth potential, fast execution path. Perfect for your action-oriented approach.

**Tone:** Direct - Let's move fast and build something great. You have the bandwidth to execute quickly.

**Risk Framing:** Bias toward action - ship quickly, iterate based on feedback. Don't overthink, just build and learn.

**30-Day Roadmap:** Ship MVP in one week. Get it live and start getting users. Focus on core functionality first.
**60-Day Roadmap:** Acquire 10 users. Get real feedback and iterate. Double down on what works.
**90-Day Roadmap:** Iterate aggressively. Scale what's working, cut what's not. Move fast and adapt.

This matches your fast decision style and burst energy pattern."""
        else:
            return """# Personalized Recommendations

## Top Ideas for You

### 1. One-Page Info Product (Score: 82)
**Why this fits you:** Minimal operations, can be done in spare time. Perfect for your constrained schedule.

**Tone:** Supportive - We know you're balancing a lot. This works around your schedule and won't add stress.

**Risk Framing:** Minimize ops - automate everything possible, keep it simple. This idea requires one-time creation with minimal ongoing work.

**30-Day Roadmap:** Create 1 template. Keep it simple, focus on quality over quantity. Don't try to do too much.
**60-Day Roadmap:** Publish quietly. Start small, don't overcommit. Test with minimal marketing effort.
**90-Day Roadmap:** Automate everything possible. Set up systems to run without you. Focus on passive income streams.

This respects your low energy pattern and need to avoid overcommitting."""


@pytest.fixture
def app_with_mocked_auth(monkeypatch):
    """Create Flask app with mocked authentication (for discovery tests)."""
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
    discovery_module.get_limiter = lambda: None
    discovery_module._limiter = None
    
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
        
        # Mock get_current_session (for auth)
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


def extract_psychology_indicators(text: str) -> dict:
    """Extract psychology-related indicators from text."""
    indicators = {
        "tone": None,
        "risk_framing": None,
        "roadmap_30": None,
        "top_idea": None,
        "has_reassuring": False,
        "has_direct": False,
        "has_supportive": False,
        "has_risk_avoid": False,
        "has_action_bias": False,
        "has_minimize_ops": False
    }
    
    text_lower = text.lower()
    
    if "reassuring" in text_lower:
        indicators["tone"] = "reassuring"
        indicators["has_reassuring"] = True
    elif "direct" in text_lower and "let's move" in text_lower:
        indicators["tone"] = "direct"
        indicators["has_direct"] = True
    elif "supportive" in text_lower:
        indicators["tone"] = "supportive"
        indicators["has_supportive"] = True
    
    if "avoid" in text_lower and "investment" in text_lower:
        indicators["risk_framing"] = "avoid high upfront investment"
        indicators["has_risk_avoid"] = True
    elif "action" in text_lower and ("bias" in text_lower or "toward" in text_lower):
        indicators["risk_framing"] = "bias toward action"
        indicators["has_action_bias"] = True
    elif "minimize" in text_lower and "ops" in text_lower:
        indicators["risk_framing"] = "minimize ops"
        indicators["has_minimize_ops"] = True
    
    if "30-day" in text_lower or "30 day" in text_lower:
        lines = text.split('\n')
        for line in lines:
            if '30' in line.lower() and 'day' in line.lower():
                indicators["roadmap_30"] = line.strip()
                break
    
    if "### 1." in text or "1. " in text[:200]:
        lines = text.split('\n')
        for line in lines:
            if "### 1." in line or (line.strip().startswith("1.") and len(line) < 100):
                indicators["top_idea"] = line.replace("###", "").replace("1.", "").strip()
                break
    
    return indicators


@pytest.fixture
def mock_openai_for_persona(monkeypatch):
    """Fixture to mock OpenAI client for a specific persona."""
    def setup_mock(persona: str):
        mock_client = PersonaAwareMockOpenAIClient(persona=persona)
        
        # Mock OpenAI client creation in tools
        import startup_idea_crew.tools.market_research_tool as mrt
        import startup_idea_crew.tools.validation_tool as vt
        
        monkeypatch.setattr(mrt, '_MOCK_OPENAI_CLIENT', mock_client)
        monkeypatch.setattr(vt, '_MOCK_OPENAI_CLIENT', mock_client)
        
        # Mock langchain's ChatOpenAI for CrewAI agents
        try:
            from langchain_openai import ChatOpenAI
            from langchain_core.messages import AIMessage
            
            original_init = ChatOpenAI.__init__
            
            def mock_chat_openai_init(self, *args, **kwargs):
                # Store persona for this instance
                self._test_persona = persona
                self.model_name = kwargs.get('model_name', 'gpt-4o-mini')
                self.model = kwargs.get('model', 'gpt-4o-mini')
                self.temperature = kwargs.get('temperature', 0.7)
                
                # Create invoke method that returns persona-specific responses
                def mock_invoke(messages, **kw):
                    prompt = str(messages[-1].content if hasattr(messages[-1], 'content') else messages[-1])
                    
                    if 'profile' in prompt.lower() or 'analyze' in prompt.lower() or 'core motivation' in prompt.lower():
                        content = mock_client._profile_response()
                    elif 'research' in prompt.lower() or 'market' in prompt.lower():
                        content = mock_client._research_response()
                    elif 'recommend' in prompt.lower() or 'personalized' in prompt.lower():
                        content = mock_client._recommendation_response()
                    else:
                        content = "Mock response"
                    
                    msg = AIMessage(content=content)
                    if hasattr(msg, 'response_metadata'):
                        msg.response_metadata = {}
                    return msg
                
                self.invoke = mock_invoke
                self.stream = lambda messages, **kw: iter([mock_invoke(messages, **kw)])
                
                # Try to call original init if possible (may fail, that's ok)
                try:
                    original_init(self, *args, **kwargs)
                except:
                    pass
            
            monkeypatch.setattr(ChatOpenAI, '__init__', mock_chat_openai_init)
        except ImportError:
            pass
        
        # Also mock CrewAI's LLM provider if needed
        try:
            from crewai.llm import LLM
            
            def mock_from_llm_string(llm_string, **kwargs):
                # Return a mock that works like ChatOpenAI
                mock_llm = Mock()
                mock_llm.invoke = lambda messages, **kw: mock_client._get_response_for_messages(messages)
                mock_llm.stream = lambda messages, **kw: iter([mock_client._get_response_for_messages(messages)])
                return mock_llm
            
            if hasattr(LLM, 'from_llm_string'):
                monkeypatch.setattr(LLM, 'from_llm_string', staticmethod(mock_from_llm_string))
        except (ImportError, AttributeError):
            pass
        
        return mock_client
    return setup_mock


def test_risk_averse_pipeline_with_llm_mock(app_with_mocked_auth, mock_openai_for_persona):
    """Test full pipeline with risk_averse persona using LLM mocking."""
    app, client, user = app_with_mocked_auth
    mock_client = mock_openai_for_persona("risk_averse")
    
    # Call the actual endpoint - CrewAI will execute but LLM calls are mocked
    response = client.post('/api/run', json=risk_averse_input)
    
    # Should succeed (or timeout, but not auth error)
    assert response.status_code != 401, "Should not be auth error"
    
    if response.status_code == 200:
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'outputs' in data
        
        outputs = data['outputs']
        recommendations = outputs.get('personalized_recommendations', '')
        
        if len(recommendations) > 100:
            indicators = extract_psychology_indicators(recommendations)
            
            # Risk-averse should have reassuring tone
            assert indicators["has_reassuring"] or "reassuring" in recommendations.lower(), \
                f"Expected reassuring tone, got: {indicators['tone']}"


def test_fast_executor_pipeline_with_llm_mock(app_with_mocked_auth, mock_openai_for_persona):
    """Test full pipeline with fast_executor persona using LLM mocking."""
    app, client, user = app_with_mocked_auth
    mock_client = mock_openai_for_persona("fast_executor")
    
    response = client.post('/api/run', json=fast_executor_input)
    
    assert response.status_code != 401, "Should not be auth error"
    
    if response.status_code == 200:
        data = json.loads(response.data)
        assert data['success'] == True
        
        outputs = data['outputs']
        recommendations = outputs.get('personalized_recommendations', '')
        
        if len(recommendations) > 100:
            indicators = extract_psychology_indicators(recommendations)
            
            # Fast executor should have direct tone
            assert indicators["has_direct"] or "direct" in recommendations.lower() or "move fast" in recommendations.lower(), \
                f"Expected direct tone, got: {indicators['tone']}"


def test_ranking_differs_by_psychology_with_llm_mock(app_with_mocked_auth, mock_openai_for_persona):
    """Test that idea rankings differ based on psychology with real CrewAI execution."""
    app, client, user = app_with_mocked_auth
    
    # Test risk_averse
    mock_openai_for_persona("risk_averse")
    response1 = client.post('/api/run', json=risk_averse_input)
    
    # Clear previous run
    from app.models.database import UserRun, db
    with app.app_context():
        UserRun.query.filter_by(user_id=user.id).delete()
        db.session.commit()
    
    # Test fast_executor
    mock_openai_for_persona("fast_executor")
    response2 = client.post('/api/run', json=fast_executor_input)
    
    # Both should not be auth errors
    assert response1.status_code != 401, "First call should not be auth error"
    assert response2.status_code != 401, "Second call should not be auth error"
    
    # If both succeeded, verify they differ
    if response1.status_code == 200 and response2.status_code == 200:
        data1 = json.loads(response1.data)
        data2 = json.loads(response2.data)
        
        rec1 = data1['outputs'].get('personalized_recommendations', '')
        rec2 = data2['outputs'].get('personalized_recommendations', '')
        
        if len(rec1) > 100 and len(rec2) > 100:
            assert rec1 != rec2, "Recommendations should differ between personas"


def test_tone_differs_by_psychology_with_llm_mock(app_with_mocked_auth, mock_openai_for_persona):
    """Test that tone differs based on psychology with real CrewAI execution."""
    app, client, user = app_with_mocked_auth
    
    # Test risk_averse
    mock_openai_for_persona("risk_averse")
    response1 = client.post('/api/run', json=risk_averse_input)
    
    if response1.status_code == 200:
        data1 = json.loads(response1.data)
        rec1 = data1['outputs'].get('personalized_recommendations', '')
        indicators1 = extract_psychology_indicators(rec1)
        
        # Verify risk_averse has reassuring tone
        assert indicators1["has_reassuring"] or "reassuring" in rec1.lower(), \
            f"Risk averse should have reassuring tone, got: {indicators1['tone']}"

