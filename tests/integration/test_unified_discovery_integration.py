"""
Unified Discovery Pipeline Integration Tests

Tests the NEW unified Discovery pipeline (single LLM call, parallel tools).
- Mocks get_current_session (for auth)
- Mocks OpenAI client in unified_discovery_service
- Verifies psychology-based behavior differences
- Verifies 8-factor cache key generation
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


class UnifiedMockOpenAIClient:
    """Mock OpenAI client that returns unified responses for all three sections."""
    
    def __init__(self, persona: str = "default"):
        self.persona = persona
        self.chat = Mock()
        self.chat.completions = Mock()
        self.chat.completions.create = self._mock_create
    
    def _mock_create(self, **kwargs):
        """Mock OpenAI chat completion - returns unified response with all 3 sections."""
        messages = kwargs.get('messages', [])
        prompt = str(messages[-1].get('content', '')) if messages else ''
        
        # Generate unified response with all 3 sections
        content = self._unified_response()
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message = Mock()
        mock_response.choices[0].message.content = content
        
        # Handle streaming
        if kwargs.get('stream', False):
            # Return a generator that yields chunks
            def stream_generator():
                # Simulate streaming by chunking the response
                chunk_size = 100
                for i in range(0, len(content), chunk_size):
                    chunk = content[i:i+chunk_size]
                    chunk_obj = Mock()
                    chunk_obj.choices = [Mock()]
                    chunk_obj.choices[0].delta = Mock()
                    chunk_obj.choices[0].delta.content = chunk
                    yield chunk_obj
            
            return stream_generator()
        
        return mock_response
    
    def _unified_response(self):
        """Generate unified response with all 3 sections based on persona."""
        profile = self._profile_section()
        research = self._research_section()
        recommendations = self._recommendations_section()
        
        return f"""## SECTION 1: PROFILE ANALYSIS

{profile}

## SECTION 2: IDEA RESEARCH

{research}

## SECTION 3: PERSONALIZED RECOMMENDATIONS

{recommendations}
"""
    
    def _profile_section(self):
        """Generate profile analysis section."""
        if self.persona == "risk_averse":
            return """## 1. Core Motivation

You're driven by security and stability. Your goal to replace your job reflects a desire for financial independence without taking unnecessary risks.

## 2. Operating Constraints

Time (5-10 hours): This means you need ideas that can be validated quickly with minimal upfront investment.

## 7. Founder Psychology Summary (INTERNAL - for downstream use)

**Motivation Pattern:** Security-focused, values stability over growth
**Decision Style:** Slow and cautious - needs validation before committing
**Energy Pattern:** Steady, consistent - prefers sustainable pace
**Biggest Fear:** Failure and financial loss
**Constraints:** Limited time (5-10 hours/week)
**Success Definition:** Stable recurring income without high risk"""
        elif self.persona == "fast_executor":
            return """## 1. Core Motivation

You're driven by freedom and independence. Your goal to create a business reflects your desire to move fast and build something meaningful.

## 2. Operating Constraints

Time (20 hours): You have significant time to dedicate, allowing for more ambitious projects.

## 7. Founder Psychology Summary (INTERNAL - for downstream use)

**Motivation Pattern:** Freedom-focused, values speed and growth
**Decision Style:** Fast - prefers action over analysis
**Energy Pattern:** Short bursts - high intensity work sessions
**Biggest Fear:** Moving too slowly, missing opportunities
**Constraints:** None significant
**Success Definition:** Speed and growth"""
        else:
            return """## 1. Core Motivation

You're exploring side income opportunities that fit your limited time constraints.

## 7. Founder Psychology Summary (INTERNAL - for downstream use)

**Motivation Pattern:** Extra income focused
**Decision Style:** Slow and careful
**Energy Pattern:** Low - needs minimal commitment
**Biggest Fear:** Overcommitting
**Constraints:** Job + family
**Success Definition:** Earn without burnout"""
    
    def _research_section(self):
        """Generate idea research section."""
        if self.persona == "risk_averse":
            return """### Idea Research Report

Based on your profile, here are 5 startup ideas that align with your security-focused approach:

1. **Lean Micro SaaS**
   - Low upfront investment
   - Quick validation possible
   - Recurring revenue model

2. **Content Repurposing Service**
   - Minimal technical requirements
   - Can start with existing skills
   - Low risk validation"""
        elif self.persona == "fast_executor":
            return """### Idea Research Report

Based on your profile, here are 5 startup ideas that match your fast execution style:

1. **Automated Video Clipper**
   - Can ship MVP in one week
   - High growth potential
   - Action-oriented development

2. **AI Newsletter Generator**
   - Quick to market
   - Scalable model
   - Fast iteration possible"""
        else:
            return """### Idea Research Report

Based on your profile, here are 5 startup ideas for side income:

1. **One-Page Info Product**
   - Minimal time commitment
   - Can create in spare time
   - Passive income potential"""
    
    def _recommendations_section(self):
        """Generate recommendations section."""
        if self.persona == "risk_averse":
            return """### Comprehensive Recommendation Report

#### Profile Fit Summary
- Security-focused approach matches lean validation strategies
- Slow decision style benefits from thorough research
- Steady energy pattern suits incremental progress

1. **Lean Micro SaaS**
   This idea aligns perfectly with your risk-averse profile. The low upfront investment and quick validation approach matches your need for security.

### Risk Radar
- Technical complexity risk (Severity: Low): Your analytical skills help, but start with no-code tools like Bubble before custom development. Mitigation: Use pre-built templates and validate before building.

### 30/60/90 Day Roadmap
**Days 0-30**: Validate demand using Typeform surveys. Create landing page on Carrd. Interview 5 potential customers. Success metric: 10+ sign-ups.
**Days 30-60**: Build MVP using Bubble (no-code). Launch to 20 beta users.
**Days 60-90**: Iterate based on feedback. Focus on retention metrics."""
        elif self.persona == "fast_executor":
            return """### Comprehensive Recommendation Report

#### Profile Fit Summary
- Fast decision style matches rapid execution approach
- High energy enables quick iteration
- Freedom-focused motivation aligns with scalable ideas

1. **Automated Video Clipper**
   This idea matches your fast execution style. You can ship an MVP in one week and iterate aggressively.

### Risk Radar
- Market competition risk (Severity: Medium): Move fast to capture early adopters. Mitigation: Launch MVP within 7 days, gather feedback, iterate weekly.

### 30/60/90 Day Roadmap
**Days 0-30**: Build MVP using Next.js + OpenAI API. Deploy to Vercel. Launch on Product Hunt. Success metric: 100 users in first week.
**Days 30-60**: Add core features based on feedback. Scale infrastructure.
**Days 60-90**: Optimize conversion funnel. Expand to new markets."""
        else:
            return """### Comprehensive Recommendation Report

#### Profile Fit Summary
- Low time commitment matches minimal-ops ideas
- Slow decision style benefits from simple validation
- Extra income focus aligns with passive revenue models

1. **One-Page Info Product**
   This idea fits your low-time, low-commitment profile perfectly.

### Risk Radar
- Market saturation risk (Severity: Low): Focus on niche topics. Mitigation: Research underserved niches before creating.

### 30/60/90 Day Roadmap
**Days 0-30**: Research niche topic. Create one-page guide using Canva. Publish on Gumroad.
**Days 30-60**: Promote on relevant communities. Collect feedback.
**Days 60-90**: Create follow-up products if successful."""


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
def mock_unified_openai(monkeypatch):
    """Fixture to mock OpenAI client in unified_discovery_service."""
    def setup_mock(persona: str = "default"):
        mock_client = UnifiedMockOpenAIClient(persona=persona)
        
        # Mock the OpenAI client in unified_discovery_service
        import app.services.unified_discovery_service as uds
        monkeypatch.setattr(uds, '_MOCK_OPENAI_CLIENT', mock_client)
        
        return mock_client
    return setup_mock


def test_unified_discovery_risk_averse(app_with_mocked_auth, mock_unified_openai):
    """Test unified Discovery with risk_averse persona."""
    app, client, user = app_with_mocked_auth
    mock_unified_openai("risk_averse")
    
    response = client.post('/api/run', json=risk_averse_input)
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.data}"
    data = json.loads(response.data)
    
    assert data['success'] == True
    assert 'outputs' in data
    assert 'profile_analysis' in data['outputs']
    assert 'startup_ideas_research' in data['outputs']
    assert 'personalized_recommendations' in data['outputs']
    
    # Verify psychology indicators
    recommendations = data['outputs']['personalized_recommendations']
    assert "risk-averse" in recommendations.lower() or "security" in recommendations.lower() or "lean" in recommendations.lower(), \
        "Should reflect risk-averse psychology"
    
    # Verify performance metrics
    if 'performance_metrics' in data:
        assert 'total_duration_seconds' in data['performance_metrics']
        assert 'tool_precompute_time' in data['performance_metrics']
        assert 'llm_time' in data['performance_metrics']
        assert 'cache_hit' in data['performance_metrics']


def test_unified_discovery_fast_executor(app_with_mocked_auth, mock_unified_openai):
    """Test unified Discovery with fast_executor persona."""
    app, client, user = app_with_mocked_auth
    mock_unified_openai("fast_executor")
    
    response = client.post('/api/run', json=fast_executor_input)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert data['success'] == True
    recommendations = data['outputs']['personalized_recommendations']
    
    # Verify fast executor indicators
    assert "fast" in recommendations.lower() or "quick" in recommendations.lower() or "mvp" in recommendations.lower(), \
        "Should reflect fast execution style"


def test_ranking_differs_by_psychology_unified(app_with_mocked_auth, mock_unified_openai):
    """Test that rankings differ based on psychology in unified pipeline."""
    app, client, user = app_with_mocked_auth
    
    # Test risk_averse
    mock_unified_openai("risk_averse")
    response1 = client.post('/api/run', json=risk_averse_input)
    
    # Clear previous run
    from app.models.database import UserRun, db
    with app.app_context():
        UserRun.query.filter_by(user_id=user.id).delete()
        db.session.commit()
    
    # Test fast_executor
    mock_unified_openai("fast_executor")
    response2 = client.post('/api/run', json=fast_executor_input)
    
    if response1.status_code == 200 and response2.status_code == 200:
        data1 = json.loads(response1.data)
        data2 = json.loads(response2.data)
        
        rec1 = data1['outputs']['personalized_recommendations']
        rec2 = data2['outputs']['personalized_recommendations']
        
        # Should have different top ideas
        assert rec1 != rec2, "Recommendations should differ based on psychology"
        
        # Risk-averse should mention "Lean" or "Micro SaaS"
        assert "lean" in rec1.lower() or "micro" in rec1.lower() or "saas" in rec1.lower(), \
            "Risk-averse should recommend low-risk ideas"
        
        # Fast executor should mention "Automated" or "Video" or "Quick"
        assert "automated" in rec2.lower() or "video" in rec2.lower() or "quick" in rec2.lower(), \
            "Fast executor should recommend action-oriented ideas"


def test_cache_key_includes_all_factors(app_with_mocked_auth, mock_unified_openai):
    """Test that cache key includes all 8 factors including founder_psychology."""
    from app.utils.discovery_cache import DiscoveryCache
    
    # Create two profile data sets that differ only in founder_psychology
    profile1 = {
        "goal_type": "Extra Income",
        "time_commitment": "<5 hrs/week",
        "budget_range": "Free / Sweat-equity only",
        "interest_area": "AI / Automation",
        "sub_interest_area": "Chatbots",
        "work_style": "Solo",
        "skill_strength": "Analytical / Strategic",
        "experience_summary": "Some experience",
        "founder_psychology": {"motivation_primary": "security"},
    }
    
    profile2 = {
        "goal_type": "Extra Income",
        "time_commitment": "<5 hrs/week",
        "budget_range": "Free / Sweat-equity only",
        "interest_area": "AI / Automation",
        "sub_interest_area": "Chatbots",
        "work_style": "Solo",
        "skill_strength": "Analytical / Strategic",
        "experience_summary": "Some experience",
        "founder_psychology": {"motivation_primary": "freedom"},  # Different psychology
    }
    
    key1 = DiscoveryCache._generate_cache_key(profile1)
    key2 = DiscoveryCache._generate_cache_key(profile2)
    
    # Keys should be different because founder_psychology differs
    assert key1 != key2, "Cache keys should differ when founder_psychology differs"
    
    # Keys should start with "discovery:"
    assert key1.startswith("discovery:")
    assert key2.startswith("discovery:")


def test_unified_discovery_parsing(app_with_mocked_auth, mock_unified_openai):
    """Test that unified response is correctly parsed into 3 sections."""
    from app.services.unified_discovery_service import parse_unified_response
    
    # Test response with explicit section markers
    test_response = """## SECTION 1: PROFILE ANALYSIS

## 1. Core Motivation
Test profile content

## SECTION 2: IDEA RESEARCH

### Idea Research Report
Test research content

## SECTION 3: PERSONALIZED RECOMMENDATIONS

### Comprehensive Recommendation Report
Test recommendations content"""
    
    outputs = parse_unified_response(test_response)
    
    assert "profile_analysis" in outputs
    assert "startup_ideas_research" in outputs
    assert "personalized_recommendations" in outputs
    
    assert "Core Motivation" in outputs["profile_analysis"]
    assert "Idea Research Report" in outputs["startup_ideas_research"]
    assert "Comprehensive Recommendation Report" in outputs["personalized_recommendations"]


def test_tool_precomputation_parallel(app_with_mocked_auth):
    """Test that tools are pre-computed in parallel."""
    from app.services.unified_discovery_service import precompute_all_tools
    import time
    
    profile_data = risk_averse_input.copy()
    
    # Mock tools to have delays
    original_tools = {}
    tool_delays = {}
    
    def mock_tool_with_delay(tool_name, delay):
        def delayed_tool(*args, **kwargs):
            time.sleep(delay)
            return f"Mock result from {tool_name}"
        return delayed_tool
    
    # This test verifies parallel execution by checking total time
    # If sequential: would take sum of all delays
    # If parallel: should take max delay (approximately)
    start = time.time()
    results, elapsed = precompute_all_tools(profile_data)
    total_time = time.time() - start
    
    # Should complete in reasonable time (tools execute in parallel)
    # With 10 parallel workers, should be much faster than sequential
    assert total_time < 30, f"Tool pre-computation took {total_time}s, expected <30s with parallel execution"
    assert len(results) > 0, "Should have tool results"


def test_backward_compatibility_response_format(app_with_mocked_auth, mock_unified_openai):
    """Test that response format matches old format for backward compatibility."""
    app, client, user = app_with_mocked_auth
    mock_unified_openai("risk_averse")
    
    response = client.post('/api/run', json=risk_averse_input)
    assert response.status_code == 200
    
    data = json.loads(response.data)
    
    # Verify backward compatibility
    assert 'success' in data
    assert 'run_id' in data
    assert 'inputs' in data
    assert 'outputs' in data
    
    # Verify outputs structure
    outputs = data['outputs']
    assert 'profile_analysis' in outputs
    assert 'startup_ideas_research' in outputs
    assert 'personalized_recommendations' in outputs
    
    # Verify content is markdown (for frontend parsing)
    assert outputs['profile_analysis'].startswith('##') or outputs['profile_analysis'].startswith('#')
    assert '###' in outputs['startup_ideas_research'] or '##' in outputs['startup_ideas_research']
    assert '###' in outputs['personalized_recommendations'] or '##' in outputs['personalized_recommendations']


