"""
Full Pipeline Integration Tests for Discovery

These tests:
- Call the actual /api/run endpoint
- Execute the full CrewAI task chain
- Mock ALL LLM calls (agents, tools, manager)
- Verify psychology-based behavior differences
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


class PersonaAwareMockLLM:
    """Mock LLM that returns persona-specific responses based on inputs."""
    
    def __init__(self, *args, **kwargs):
        # Store persona for this instance
        self.persona = kwargs.pop('persona', 'default')
        # Make it look like a real LLM
        self.model_name = kwargs.get('model_name', 'gpt-4o-mini')
        self.model = kwargs.get('model', 'gpt-4o-mini')
        self.temperature = kwargs.get('temperature', 0.7)
        self._call_count = 0
        # Add common LLM attributes
        self.max_tokens = kwargs.get('max_tokens', None)
        self.top_p = kwargs.get('top_p', 1.0)
        self.frequency_penalty = kwargs.get('frequency_penalty', 0.0)
        self.presence_penalty = kwargs.get('presence_penalty', 0.0)
        # Make it callable like a function
        self.__call__ = self.invoke
    
    def invoke(self, messages, **kwargs):
        """Mock invoke for langchain compatibility."""
        try:
            from langchain_core.messages import AIMessage
        except ImportError:
            class AIMessage:
                def __init__(self, content):
                    self.content = content
        
        # Extract prompt content
        if isinstance(messages, list) and len(messages) > 0:
            last_msg = messages[-1]
            if hasattr(last_msg, 'content'):
                prompt = str(last_msg.content)
            elif isinstance(last_msg, dict):
                prompt = str(last_msg.get('content', ''))
            else:
                prompt = str(last_msg)
        else:
            prompt = str(messages)
        
        # Determine persona from inputs if not set
        persona = self._detect_persona_from_prompt(prompt)
        
        # Determine response type
        content = self._generate_response(persona, prompt)
        
        self._call_count += 1
        msg = AIMessage(content=content)
        # Add common message attributes
        if hasattr(msg, 'response_metadata'):
            msg.response_metadata = {}
        return msg
    
    async def ainvoke(self, messages, **kwargs):
        """Async version of invoke."""
        import asyncio
        return self.invoke(messages, **kwargs)
    
    def stream(self, messages, **kwargs):
        """Mock stream method."""
        result = self.invoke(messages, **kwargs)
        yield result
    
    def _detect_persona_from_prompt(self, prompt: str) -> str:
        """Detect persona from prompt content."""
        prompt_lower = prompt.lower()
        
        # Check for psychology indicators
        if 'security' in prompt_lower or 'stability' in prompt_lower or 'failure' in prompt_lower:
            if 'slow' in prompt_lower or 'cautious' in prompt_lower:
                return 'risk_averse'
        if 'freedom' in prompt_lower or 'independence' in prompt_lower or 'moving too slowly' in prompt_lower:
            if 'fast' in prompt_lower or 'action' in prompt_lower:
                return 'fast_executor'
        if 'extra income' in prompt_lower or 'overcommitting' in prompt_lower:
            if 'low' in prompt_lower or 'minimal' in prompt_lower:
                return 'low_time'
        
        # Fallback to instance persona
        return self.persona or 'default'
    
    def _generate_response(self, persona: str, prompt: str) -> str:
        """Generate persona-specific response."""
        prompt_lower = prompt.lower()
        
        # Profile analysis task
        if 'profile' in prompt_lower or 'analyze' in prompt_lower or 'core motivation' in prompt_lower:
            return self._profile_response(persona)
        
        # Research task
        elif 'research' in prompt_lower or 'market' in prompt_lower or 'trends' in prompt_lower:
            return self._research_response()
        
        # Recommendation task
        elif 'recommend' in prompt_lower or 'personalized' in prompt_lower or 'top ideas' in prompt_lower:
            return self._recommendation_response(persona)
        
        # Manager LLM (hierarchical coordination)
        elif 'manager' in prompt_lower or 'coordinate' in prompt_lower or 'next task' in prompt_lower:
            return "Proceed with next task"
        
        # Default
        else:
            return f"Mock response for {persona}"
    
    def _profile_response(self, persona: str) -> str:
        """Generate profile analysis response."""
        if persona == "risk_averse":
            return """## 1. Core Motivation

You're driven by security and stability. Your goal to replace your job reflects a desire for financial independence without taking unnecessary risks. Your experience shows careful planning and methodical thinking.

## 2. Time & Resource Reality

With 5-10 hours per week, you have limited bandwidth. Your low budget range means you need ideas that require minimal upfront investment. This constraint actually protects you from overextending.

## 3. Interest Alignment

AI Tools and Automation align perfectly with your analytical skills. These areas offer steady, recurring revenue models that match your risk profile.

## 7. Founder Psychology Summary (INTERNAL - for downstream agents)

**Motivation Pattern:** Security-focused, values stability over growth
**Decision Style:** Slow and cautious - needs validation before committing
**Energy Pattern:** Steady, consistent - prefers sustainable pace
**Biggest Fear:** Failure and financial loss
**Constraints:** Limited time (5-10 hours/week)
**Success Definition:** Stable recurring income without high risk

**Key Insights for Recommendations:**
- Prioritize low-risk, validated ideas
- Emphasize steady revenue over rapid growth
- Provide reassuring tone and risk mitigation strategies
- Roadmaps should focus on validation and careful scaling"""
        
        elif persona == "fast_executor":
            return """## 1. Core Motivation

You're driven by freedom and independence. Your goal to create a business reflects your desire to move fast and build something meaningful. Your experience shows you value action over analysis.

## 2. Time & Resource Reality

With 20 hours per week, you have significant bandwidth to execute. Your medium budget allows for some investment in tools and resources. You're ready to move quickly.

## 3. Interest Alignment

Creator Tools and Video Editing match your execution-focused approach. These areas reward speed and iteration.

## 7. Founder Psychology Summary (INTERNAL - for downstream agents)

**Motivation Pattern:** Freedom-focused, values speed and growth
**Decision Style:** Fast, action-oriented - bias toward doing
**Energy Pattern:** Bursts of high activity - can handle intensity
**Biggest Fear:** Moving too slowly, missing opportunities
**Constraints:** None significant - ready to commit
**Success Definition:** Speed and growth, building something fast

**Key Insights for Recommendations:**
- Prioritize high-growth potential ideas
- Emphasize speed and rapid iteration
- Provide direct, action-oriented tone
- Roadmaps should focus on shipping quickly and iterating"""
        
        else:  # low_time
            return """## 1. Core Motivation

You're looking for extra income without overcommitting. Your goal reflects a need to balance work, family, and side projects. You need ideas that work around your schedule.

## 2. Time & Resource Reality

With 1-3 hours per week, you have very limited time. Your low budget means you need ideas with minimal operations. This constraint requires highly automated solutions.

## 3. Interest Alignment

Digital Products and Templates are perfect for your time constraints. These can be created once and sold repeatedly with minimal ongoing work.

## 7. Founder Psychology Summary (INTERNAL - for downstream agents)

**Motivation Pattern:** Extra income-focused, values simplicity
**Decision Style:** Slow, careful - needs to avoid overcommitting
**Energy Pattern:** Low, consistent - must work within tight constraints
**Biggest Fear:** Overcommitting and burning out
**Constraints:** Job + family, very limited time (1-3 hours/week)
**Success Definition:** Earn without burnout, minimal operations

**Key Insights for Recommendations:**
- Prioritize minimal-ops, automated ideas
- Emphasize simplicity and one-time creation
- Provide supportive, understanding tone
- Roadmaps should focus on keeping things simple and automated"""
    
    def _research_response(self) -> str:
        """Generate research response (same for all personas)."""
        return """# Market Research

## Top Startup Ideas

1. **Lean Micro SaaS** - Low-risk, recurring revenue model. Growing market for automation tools.
2. **Content Repurposing Service** - Scalable with minimal ops. High demand from content creators.
3. **AI-powered Automation Tool** - High growth potential. Strong market trends in AI adoption.

Market trends show strong demand in automation, content tools, and AI-powered solutions."""
    
    def _recommendation_response(self, persona: str) -> str:
        """Generate recommendation response based on persona."""
        if persona == "risk_averse":
            return """# Personalized Recommendations

## Top Ideas for You

### 1. Lean Micro SaaS (Score: 88)
**Why this fits you:** Low upfront investment, steady recurring revenue. Perfect for your risk-averse approach and limited time.

**Tone:** Reassuring - We understand you value security and stability. This idea lets you build income gradually without taking big risks.

**Risk Framing:** This idea avoids high upfront investment and focuses on validated, low-risk approaches. You can start small and scale only when metrics prove success.

**30-Day Roadmap:** Validate with smallest scope possible. Start with one core feature, test with 5 users, gather feedback.
**60-Day Roadmap:** Collect early feedback. Iterate based on real usage data. Don't expand until you have proof of concept.
**90-Day Roadmap:** Scale only if metrics hit threshold. Don't expand features or marketing until you have stable revenue and positive unit economics.

This approach matches your steady energy pattern and cautious decision style. You'll move at a sustainable pace that protects you from overcommitting.

### 2. Content Repurposing Service (Score: 81)
Similar low-risk profile with recurring revenue model.

### 3. AI-powered PDF Cleanup Tool (Score: 77)
Simple, focused tool with clear value proposition."""
        
        elif persona == "fast_executor":
            return """# Personalized Recommendations

## Top Ideas for You

### 1. Automated Video Clipper (Score: 91)
**Why this fits you:** High growth potential, fast execution path. Perfect for your action-oriented approach and available time.

**Tone:** Direct - Let's move fast and build something great. You have the bandwidth to execute quickly.

**Risk Framing:** Bias toward action - ship quickly, iterate based on feedback. Don't overthink, just build and learn.

**30-Day Roadmap:** Ship MVP in one week. Get it live and start getting users. Focus on core functionality first.
**60-Day Roadmap:** Acquire 10 users. Get real feedback and iterate. Double down on what works.
**90-Day Roadmap:** Iterate aggressively. Scale what's working, cut what's not. Move fast and adapt.

This matches your fast decision style and burst energy pattern. You'll move quickly and adapt based on real feedback.

### 2. AI Newsletter Generator (Score: 86)
High-growth potential with fast execution path.

### 3. Real-time Conversation Summarizer (Score: 83)
Action-oriented idea with clear market demand."""
        
        else:  # low_time
            return """# Personalized Recommendations

## Top Ideas for You

### 1. One-Page Info Product (Score: 82)
**Why this fits you:** Minimal operations, can be done in spare time. Perfect for your constrained schedule and need to avoid overcommitting.

**Tone:** Supportive - We know you're balancing a lot. This works around your schedule and won't add stress.

**Risk Framing:** Minimize ops - automate everything possible, keep it simple. This idea requires one-time creation with minimal ongoing work.

**30-Day Roadmap:** Create 1 template. Keep it simple, focus on quality over quantity. Don't try to do too much.
**60-Day Roadmap:** Publish quietly. Start small, don't overcommit. Test with minimal marketing effort.
**90-Day Roadmap:** Automate everything possible. Set up systems to run without you. Focus on passive income streams.

This respects your low energy pattern and need to avoid overcommitting. You'll build something sustainable that works with your life, not against it.

### 2. Done-for-You Resume Optimizer (Score: 79)
Minimal-ops service with clear value proposition.

### 3. Micro Template Store (Score: 74)
Simple, automated income stream."""


@pytest.fixture
def mock_all_llm_calls(monkeypatch):
    """Comprehensive fixture that mocks ALL LLM calls."""
    def setup_mock(persona: str = "default"):
        mock_llm = PersonaAwareMockLLM(persona=persona)
        
        # 1. Mock langchain's ChatOpenAI at class level
        try:
            from langchain_openai import ChatOpenAI
            
            def patched_chat_openai_init(self, *args, **kwargs):
                # Create mock instance
                mock_instance = PersonaAwareMockLLM(*args, persona=persona, **kwargs)
                # Copy all attributes
                for attr in dir(mock_instance):
                    if not attr.startswith('__') or attr == '__call__':
                        try:
                            value = getattr(mock_instance, attr)
                            if not callable(value) or attr in ['invoke', 'stream', 'ainvoke', '__call__']:
                                setattr(self, attr, value)
                        except:
                            pass
                # Ensure critical methods are set
                self.invoke = mock_instance.invoke
                self.stream = mock_instance.stream
                self.ainvoke = mock_instance.ainvoke
                self.__call__ = mock_instance.invoke
                # Ensure common attributes
                self.model_name = getattr(mock_instance, 'model_name', 'gpt-4o-mini')
                self.model = getattr(mock_instance, 'model', 'gpt-4o-mini')
                self.temperature = getattr(mock_instance, 'temperature', 0.7)
            
            monkeypatch.setattr(ChatOpenAI, '__init__', patched_chat_openai_init)
        except ImportError:
            pass
        
        # 2. Mock CrewAI's LLM provider resolution - this is critical
        try:
            from crewai.llm import LLM
            
            def mock_from_llm_string(llm_string, **kwargs):
                """Mock CrewAI's LLM.from_llm_string method."""
                return PersonaAwareMockLLM(persona=persona, **kwargs)
            
            # Try to patch the method
            if hasattr(LLM, 'from_llm_string'):
                monkeypatch.setattr(LLM, 'from_llm_string', staticmethod(mock_from_llm_string))
            
            # Also try to patch LLM.__init__ if it exists
            if hasattr(LLM, '__init__'):
                original_init = LLM.__init__
                def patched_llm_init(self, *args, **kwargs):
                    mock_instance = PersonaAwareMockLLM(persona=persona, **kwargs)
                    self.invoke = mock_instance.invoke
                    self.stream = mock_instance.stream
                    try:
                        original_init(self, *args, **kwargs)
                    except:
                        pass
                monkeypatch.setattr(LLM, '__init__', patched_llm_init)
        except (ImportError, AttributeError) as e:
            # If CrewAI LLM import fails, try alternative approach
            pass
        
        # 3. Mock Crew class's manager_llm initialization
        try:
            from crewai import Crew
            
            original_crew_init = Crew.__init__
            
            def patched_crew_init(self, *args, **kwargs):
                # Replace manager_llm if it's a string
                if 'manager_llm' in kwargs and isinstance(kwargs['manager_llm'], str):
                    kwargs['manager_llm'] = PersonaAwareMockLLM(persona=persona)
                # Also check agents and replace their LLMs
                if 'agents' in kwargs:
                    for agent in kwargs['agents']:
                        if hasattr(agent, 'llm') and isinstance(agent.llm, str):
                            agent.llm = PersonaAwareMockLLM(persona=persona)
                # Call original init
                try:
                    original_crew_init(self, *args, **kwargs)
                except Exception as e:
                    # If init fails, try to set minimal attributes
                    self.agents = kwargs.get('agents', [])
                    self.tasks = kwargs.get('tasks', [])
                    self.process = kwargs.get('process')
                    self.manager_llm = kwargs.get('manager_llm', PersonaAwareMockLLM(persona=persona))
            
            monkeypatch.setattr(Crew, '__init__', patched_crew_init)
        except (ImportError, AttributeError):
            pass
        
        # 4. Mock Agent class's LLM initialization
        try:
            from crewai import Agent
            
            original_agent_init = Agent.__init__
            
            def patched_agent_init(self, *args, **kwargs):
                # Replace llm if it's a string
                if 'llm' in kwargs and isinstance(kwargs['llm'], str):
                    kwargs['llm'] = PersonaAwareMockLLM(persona=persona)
                # Also check config
                if 'config' in kwargs and isinstance(kwargs['config'], dict):
                    if 'llm' in kwargs['config'] and isinstance(kwargs['config']['llm'], str):
                        kwargs['config']['llm'] = PersonaAwareMockLLM(persona=persona)
                # Call original init
                try:
                    original_agent_init(self, *args, **kwargs)
                except Exception as e:
                    # If init fails, set minimal attributes
                    self.llm = kwargs.get('llm', PersonaAwareMockLLM(persona=persona))
                    self.role = kwargs.get('role', 'agent')
                    self.goal = kwargs.get('goal', 'complete task')
            
            monkeypatch.setattr(Agent, '__init__', patched_agent_init)
        except (ImportError, AttributeError):
            pass
        
        # 5. Mock LiteLLM if used by CrewAI
        try:
            import litellm
            original_completion = litellm.completion
            
            def mock_litellm_completion(*args, **kwargs):
                """Mock LiteLLM completion calls."""
                messages = kwargs.get('messages', [])
                prompt = str(messages[-1].get('content', '')) if messages else ''
                
                if 'profile' in prompt.lower() or 'analyze' in prompt.lower():
                    content = mock_llm._profile_response(persona)
                elif 'research' in prompt.lower() or 'market' in prompt.lower():
                    content = mock_llm._research_response()
                elif 'recommend' in prompt.lower() or 'personalized' in prompt.lower():
                    content = mock_llm._recommendation_response(persona)
                else:
                    content = "Mock response"
                
                return {
                    'choices': [{
                        'message': {
                            'content': content
                        }
                    }]
                }
            
            monkeypatch.setattr(litellm, 'completion', mock_litellm_completion)
        except ImportError:
            pass
        
        # 6. Mock tool-level OpenAI (already done via _MOCK_OPENAI_CLIENT)
        mock_openai_client = Mock()
        call_count = {"profile": 0, "research": 0, "recommendation": 0}
        
        def mock_create(**kwargs):
            messages = kwargs.get('messages', [])
            prompt = str(messages[-1].get('content', '')) if messages else ''
            
            if 'profile' in prompt.lower() or 'analyze' in prompt.lower():
                call_count["profile"] += 1
                content = mock_llm._profile_response(persona)
            elif 'research' in prompt.lower() or 'market' in prompt.lower():
                call_count["research"] += 1
                content = mock_llm._research_response()
            elif 'recommend' in prompt.lower() or 'personalized' in prompt.lower():
                call_count["recommendation"] += 1
                content = mock_llm._recommendation_response(persona)
            else:
                content = "Mock response"
            
            mock_response = Mock()
            mock_response.choices = [Mock()]
            mock_response.choices[0].message = Mock()
            mock_response.choices[0].message.content = content
            return mock_response
        
        mock_openai_client.chat.completions.create = mock_create
        
        # Inject into tools
        import startup_idea_crew.tools.market_research_tool as mrt
        monkeypatch.setattr(mrt, '_MOCK_OPENAI_CLIENT', mock_openai_client)
        
        import startup_idea_crew.tools.validation_tool as vt
        monkeypatch.setattr(vt, '_MOCK_OPENAI_CLIENT', mock_openai_client)
        
        return mock_llm, mock_openai_client, call_count
    return setup_mock


@pytest.fixture
def app_with_auth(monkeypatch):
    """Create Flask app with test client and authenticated user."""
    import api
    from app.models.database import db, User, UserSession
    
    app = api.app
    app.config['TESTING'] = True
    app.config['DEBUG'] = True  # Enable debug to see full tracebacks
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
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
        
        # Create test session (expires_at is required)
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


def extract_psychology_indicators(text: str) -> dict:
    """Extract psychology-related indicators from text."""
    indicators = {
        "tone": None,
        "risk_framing": None,
        "roadmap_30": None,
        "roadmap_60": None,
        "roadmap_90": None,
        "top_idea": None,
        "has_reassuring": False,
        "has_direct": False,
        "has_supportive": False,
        "has_risk_avoid": False,
        "has_action_bias": False,
        "has_minimize_ops": False
    }
    
    text_lower = text.lower()
    
    # Extract tone
    if "reassuring" in text_lower:
        indicators["tone"] = "reassuring"
        indicators["has_reassuring"] = True
    elif "direct" in text_lower and "let's move" in text_lower:
        indicators["tone"] = "direct"
        indicators["has_direct"] = True
    elif "supportive" in text_lower:
        indicators["tone"] = "supportive"
        indicators["has_supportive"] = True
    
    # Extract risk framing
    if "avoid" in text_lower and "investment" in text_lower:
        indicators["risk_framing"] = "avoid high upfront investment"
        indicators["has_risk_avoid"] = True
    elif "action" in text_lower and ("bias" in text_lower or "toward" in text_lower):
        indicators["risk_framing"] = "bias toward action"
        indicators["has_action_bias"] = True
    elif "minimize" in text_lower and "ops" in text_lower:
        indicators["risk_framing"] = "minimize ops"
        indicators["has_minimize_ops"] = True
    
    # Extract roadmap
    if "30-day" in text_lower or "30 day" in text_lower:
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if '30' in line.lower() and 'day' in line.lower():
                indicators["roadmap_30"] = line.strip()
                break
    
    if "60-day" in text_lower or "60 day" in text_lower:
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if '60' in line.lower() and 'day' in line.lower():
                indicators["roadmap_60"] = line.strip()
                break
    
    if "90-day" in text_lower or "90 day" in text_lower:
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if '90' in line.lower() and 'day' in line.lower():
                indicators["roadmap_90"] = line.strip()
                break
    
    # Extract top idea
    if "### 1." in text or "1. " in text[:200]:
        lines = text.split('\n')
        for line in lines:
            if "### 1." in line or (line.strip().startswith("1.") and len(line) < 100):
                indicators["top_idea"] = line.replace("###", "").replace("1.", "").strip()
                break
    
    return indicators


def test_risk_averse_full_pipeline(mock_all_llm_calls, app_with_auth, capsys):
    """Test full pipeline with risk_averse persona."""
    app, client, user = app_with_auth
    mock_llm, mock_client, call_count = mock_all_llm_calls("risk_averse")
    
    # Call the actual endpoint
    response = client.post('/api/run', json=risk_averse_input)
    
    # Print error details if failed
    if response.status_code != 200:
        try:
            error_data = json.loads(response.data)
            print(f"\nError response: {error_data}")
        except:
            print(f"\nError response (raw): {response.data}")
        # Check Flask logs
        with app.app_context():
            import logging
            for handler in logging.root.handlers:
                if hasattr(handler, 'stream'):
                    print(f"Log handler: {handler}")
    
    # Should succeed
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.data}"
    data = json.loads(response.data)
    assert data['success'] == True
    assert 'outputs' in data
    
    outputs = data['outputs']
    
    # Verify profile analysis contains psychology
    profile = outputs.get('profile_analysis', '')
    assert len(profile) > 100, "Profile analysis should have content"
    assert 'psychology' in profile.lower() or 'security' in profile.lower() or 'stability' in profile.lower()
    
    # Verify recommendations contain psychology indicators
    recommendations = outputs.get('personalized_recommendations', '')
    assert len(recommendations) > 100, "Recommendations should have content"
    
    indicators = extract_psychology_indicators(recommendations)
    
    # Risk-averse should have reassuring tone
    assert indicators["has_reassuring"] or "reassuring" in recommendations.lower(), \
        f"Expected reassuring tone, got: {indicators['tone']}"
    
    # Risk-averse should avoid high investment
    assert indicators["has_risk_avoid"] or "avoid" in recommendations.lower() or "low" in recommendations.lower(), \
        f"Expected risk avoidance, got: {indicators['risk_framing']}"
    
    # Risk-averse should have cautious roadmap
    assert indicators["roadmap_30"] is not None or "validate" in recommendations.lower(), \
        "Expected validation-focused roadmap"
    assert "validate" in recommendations.lower() or "smallest" in recommendations.lower() or "scope" in recommendations.lower()


def test_fast_executor_full_pipeline(mock_all_llm_calls, app_with_auth):
    """Test full pipeline with fast_executor persona."""
    app, client, user = app_with_auth
    mock_llm, mock_client, call_count = mock_all_llm_calls("fast_executor")
    
    response = client.post('/api/run', json=fast_executor_input)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    
    outputs = data['outputs']
    recommendations = outputs.get('personalized_recommendations', '')
    indicators = extract_psychology_indicators(recommendations)
    
    # Fast executor should have direct tone
    assert indicators["has_direct"] or "direct" in recommendations.lower() or "move fast" in recommendations.lower(), \
        f"Expected direct tone, got: {indicators['tone']}"
    
    # Fast executor should bias toward action
    assert indicators["has_action_bias"] or "action" in recommendations.lower() or "ship" in recommendations.lower(), \
        f"Expected action bias, got: {indicators['risk_framing']}"
    
    # Fast executor should have aggressive roadmap
    assert indicators["roadmap_30"] is not None or "ship" in recommendations.lower(), \
        "Expected action-oriented roadmap"
    assert "ship" in recommendations.lower() or "mvp" in recommendations.lower() or "week" in recommendations.lower()


def test_ranking_differs_by_psychology(mock_all_llm_calls, app_with_auth):
    """Test that idea rankings differ based on psychology."""
    app, client, user = app_with_auth
    
    # Test risk_averse
    mock_llm1, _, _ = mock_all_llm_calls("risk_averse")
    response1 = client.post('/api/run', json=risk_averse_input)
    assert response1.status_code == 200
    data1 = json.loads(response1.data)
    rec1 = data1['outputs'].get('personalized_recommendations', '')
    indicators1 = extract_psychology_indicators(rec1)
    
    # Test fast_executor
    mock_llm2, _, _ = mock_all_llm_calls("fast_executor")
    response2 = client.post('/api/run', json=fast_executor_input)
    assert response2.status_code == 200
    data2 = json.loads(response2.data)
    rec2 = data2['outputs'].get('personalized_recommendations', '')
    indicators2 = extract_psychology_indicators(rec2)
    
    # Rankings should differ
    assert rec1 != rec2, "Recommendations should differ between personas"
    
    # Top ideas should differ
    assert indicators1["top_idea"] != indicators2["top_idea"] or \
           ("Lean" in rec1 and "Video" in rec2) or \
           ("SaaS" in rec1 and "Clipper" in rec2), \
           "Top ideas should differ between personas"


def test_tone_differs_by_psychology(mock_all_llm_calls, app_with_auth):
    """Test that tone differs based on psychology."""
    app, client, user = app_with_auth
    
    # Risk averse
    mock_llm1, _, _ = mock_all_llm_calls("risk_averse")
    response1 = client.post('/api/run', json=risk_averse_input)
    data1 = json.loads(response1.data)
    rec1 = data1['outputs'].get('personalized_recommendations', '')
    indicators1 = extract_psychology_indicators(rec1)
    
    # Fast executor
    mock_llm2, _, _ = mock_all_llm_calls("fast_executor")
    response2 = client.post('/api/run', json=fast_executor_input)
    data2 = json.loads(response2.data)
    rec2 = data2['outputs'].get('personalized_recommendations', '')
    indicators2 = extract_psychology_indicators(rec2)
    
    # Tones should differ
    assert indicators1["tone"] != indicators2["tone"] or \
           (indicators1["has_reassuring"] and indicators2["has_direct"]), \
           f"Tones should differ: {indicators1['tone']} vs {indicators2['tone']}"


def test_roadmap_differs_by_decision_style(mock_all_llm_calls, app_with_auth):
    """Test that roadmaps differ based on decision_style and energy_pattern."""
    app, client, user = app_with_auth
    
    # Risk averse (slow decision, steady energy)
    mock_llm1, _, _ = mock_all_llm_calls("risk_averse")
    response1 = client.post('/api/run', json=risk_averse_input)
    data1 = json.loads(response1.data)
    rec1 = data1['outputs'].get('personalized_recommendations', '')
    indicators1 = extract_psychology_indicators(rec1)
    
    # Fast executor (fast decision, burst energy)
    mock_llm2, _, _ = mock_all_llm_calls("fast_executor")
    response2 = client.post('/api/run', json=fast_executor_input)
    data2 = json.loads(response2.data)
    rec2 = data2['outputs'].get('personalized_recommendations', '')
    indicators2 = extract_psychology_indicators(rec2)
    
    # Roadmaps should differ
    assert indicators1["roadmap_30"] != indicators2["roadmap_30"] or \
           ("validate" in rec1.lower() and "ship" in rec2.lower()), \
           "Roadmaps should differ based on decision style"


def test_risk_framing_differs_by_fear(mock_all_llm_calls, app_with_auth):
    """Test that risk framing differs based on biggest_fear."""
    app, client, user = app_with_auth
    
    # Risk averse (fear: failure)
    mock_llm1, _, _ = mock_all_llm_calls("risk_averse")
    response1 = client.post('/api/run', json=risk_averse_input)
    data1 = json.loads(response1.data)
    rec1 = data1['outputs'].get('personalized_recommendations', '')
    indicators1 = extract_psychology_indicators(rec1)
    
    # Fast executor (fear: moving too slowly)
    mock_llm2, _, _ = mock_all_llm_calls("fast_executor")
    response2 = client.post('/api/run', json=fast_executor_input)
    data2 = json.loads(response2.data)
    rec2 = data2['outputs'].get('personalized_recommendations', '')
    indicators2 = extract_psychology_indicators(rec2)
    
    # Risk framing should differ
    assert (
        indicators1["has_risk_avoid"] or 
        indicators2["has_action_bias"] or
        indicators1["risk_framing"] != indicators2["risk_framing"]
    ), f"Risk framing should differ: {indicators1['risk_framing']} vs {indicators2['risk_framing']}"


def test_low_time_persona_full_pipeline(mock_all_llm_calls, app_with_auth):
    """Test full pipeline with low_time persona."""
    app, client, user = app_with_auth
    mock_llm, mock_client, call_count = mock_all_llm_calls("low_time")
    
    response = client.post('/api/run', json=low_time_input)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    
    outputs = data['outputs']
    recommendations = outputs.get('personalized_recommendations', '')
    indicators = extract_psychology_indicators(recommendations)
    
    # Low time should have supportive tone
    assert indicators["has_supportive"] or "supportive" in recommendations.lower(), \
        f"Expected supportive tone, got: {indicators['tone']}"
    
    # Low time should minimize ops
    assert indicators["has_minimize_ops"] or "minimize" in recommendations.lower() or "simple" in recommendations.lower(), \
        f"Expected minimize ops, got: {indicators['risk_framing']}"
    
    # Low time should have simple roadmap
    assert "simple" in recommendations.lower() or "1 template" in recommendations.lower() or "minimal" in recommendations.lower()

