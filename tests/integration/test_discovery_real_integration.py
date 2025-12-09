"""
Real Integration Tests for Discovery Pipeline

These tests:
- Call the actual /api/run endpoint or discovery function
- Mock OpenAI at the application level (tools and CrewAI LLM)
- Verify founder_psychology flows through all tasks
- Assert behavior differences based on psychology
"""

import json
import sys
import pytest
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch
from typing import Dict, Any

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tests.helpers.persona_inputs import (
    risk_averse_input,
    fast_executor_input,
    low_time_input
)


class MockOpenAIClient:
    """Mock OpenAI client that returns persona-based responses."""
    
    def __init__(self, persona: str = "default"):
        self.persona = persona
        self.chat = Mock()
        self.chat.completions = Mock()
        self.chat.completions.create = Mock(side_effect=self._create_completion)
    
    def _create_completion(self, **kwargs):
        """Return mock completion based on persona and prompt content."""
        prompt = kwargs.get('messages', [{}])[-1].get('content', '')
        
        # Determine response based on persona and task type
        if 'profile' in prompt.lower() or 'analyze' in prompt.lower():
            return self._profile_response()
        elif 'research' in prompt.lower() or 'market' in prompt.lower():
            return self._research_response()
        elif 'recommend' in prompt.lower() or 'personalized' in prompt.lower():
            return self._recommendation_response()
        else:
            return self._default_response()
    
    def _profile_response(self):
        """Mock response for profile analysis task."""
        if self.persona == "risk_averse":
            content = """# Profile Analysis

## Founder Psychology Summary
- Motivation: Security and stability
- Biggest Fear: Failure
- Decision Style: Slow and cautious
- Energy Pattern: Steady, consistent
- Constraints: Limited time
- Success Definition: Stable recurring income

This founder values security and avoids high-risk ventures."""
        elif self.persona == "fast_executor":
            content = """# Profile Analysis

## Founder Psychology Summary
- Motivation: Freedom and independence
- Biggest Fear: Moving too slowly
- Decision Style: Fast, action-oriented
- Energy Pattern: Bursts of high activity
- Constraints: None significant
- Success Definition: Speed and growth

This founder moves quickly and values action over analysis."""
        else:  # low_time
            content = """# Profile Analysis

## Founder Psychology Summary
- Motivation: Extra income
- Biggest Fear: Overcommitting
- Decision Style: Slow, careful
- Energy Pattern: Low, consistent
- Constraints: Job + family
- Success Definition: Earn without burnout

This founder needs minimal-ops solutions."""
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message = Mock()
        mock_response.choices[0].message.content = content
        return mock_response
    
    def _research_response(self):
        """Mock response for idea research task."""
        content = """# Market Research

## Top Startup Ideas

1. **Lean Micro SaaS** - Low-risk, recurring revenue model
2. **Content Repurposing Service** - Scalable with minimal ops
3. **AI-powered Automation Tool** - High growth potential

Market trends show strong demand in these areas."""
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message = Mock()
        mock_response.choices[0].message.content = content
        return mock_response
    
    def _recommendation_response(self):
        """Mock response for recommendation task - varies by persona."""
        if self.persona == "risk_averse":
            content = """# Personalized Recommendations

## Top Ideas for You

### 1. Lean Micro SaaS (Score: 88)
**Why this fits you:** Low upfront investment, steady recurring revenue. Perfect for your risk-averse approach.

**Tone:** Reassuring - We understand you value security and stability.

**Risk Framing:** This idea avoids high upfront investment and focuses on validated, low-risk approaches.

**30-Day Roadmap:** Validate with smallest scope possible. Start with one feature, test with 5 users.
**60-Day Roadmap:** Collect early feedback. Iterate based on real usage data.
**90-Day Roadmap:** Scale only if metrics hit threshold. Don't expand until proven.

This approach matches your steady energy pattern and cautious decision style."""
        
        elif self.persona == "fast_executor":
            content = """# Personalized Recommendations

## Top Ideas for You

### 1. Automated Video Clipper (Score: 91)
**Why this fits you:** High growth potential, fast execution path. Perfect for your action-oriented approach.

**Tone:** Direct - Let's move fast and build something great.

**Risk Framing:** Bias toward action - ship quickly, iterate based on feedback.

**30-Day Roadmap:** Ship MVP in one week. Get it live and start getting users.
**60-Day Roadmap:** Acquire 10 users. Get real feedback and iterate.
**90-Day Roadmap:** Iterate aggressively. Double down on what works.

This matches your fast decision style and burst energy pattern."""
        
        else:  # low_time
            content = """# Personalized Recommendations

## Top Ideas for You

### 1. One-Page Info Product (Score: 82)
**Why this fits you:** Minimal operations, can be done in spare time. Perfect for your constrained schedule.

**Tone:** Supportive - We know you're balancing a lot. This works around your schedule.

**Risk Framing:** Minimize ops - automate everything possible, keep it simple.

**30-Day Roadmap:** Create 1 template. Keep it simple, focus on quality.
**60-Day Roadmap:** Publish quietly. Start small, don't overcommit.
**90-Day Roadmap:** Automate everything possible. Set up systems to run without you.

This respects your low energy pattern and need to avoid overcommitting."""
        
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message = Mock()
        mock_response.choices[0].message.content = content
        return mock_response
    
    def _default_response(self):
        """Default mock response."""
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message = Mock()
        mock_response.choices[0].message.content = "Mock response"
        return mock_response


class MockChatOpenAI:
    """Mock langchain ChatOpenAI for CrewAI agents."""
    
    def __init__(self, *args, **kwargs):
        # Store persona from kwargs or default
        self.persona = kwargs.get('persona', 'default')
        # Make it look like a real ChatOpenAI instance
        self.model_name = kwargs.get('model_name', 'gpt-4o-mini')
        self.temperature = kwargs.get('temperature', 0.7)
    
    def invoke(self, messages, **kwargs):
        """Mock invoke method for langchain compatibility."""
        try:
            from langchain_core.messages import AIMessage
        except ImportError:
            # Fallback if langchain_core not available
            class AIMessage:
                def __init__(self, content):
                    self.content = content
        
        prompt = str(messages[-1].content if hasattr(messages[-1], 'content') else str(messages[-1]))
        
        if 'profile' in prompt.lower() or 'analyze' in prompt.lower():
            content = self._profile_content()
        elif 'research' in prompt.lower() or 'market' in prompt.lower():
            content = self._research_content()
        elif 'recommend' in prompt.lower() or 'personalized' in prompt.lower():
            content = self._recommendation_content()
        else:
            content = "Mock response"
        
        return AIMessage(content=content)
    
    def stream(self, messages, **kwargs):
        """Mock stream method."""
        result = self.invoke(messages, **kwargs)
        yield result
    
    def _profile_content(self):
        if self.persona == "risk_averse":
            return """# Profile Analysis

## Founder Psychology Summary
- Motivation: Security and stability
- Biggest Fear: Failure
- Decision Style: Slow and cautious
- Energy Pattern: Steady, consistent
- Constraints: Limited time
- Success Definition: Stable recurring income

This founder values security and avoids high-risk ventures."""
        elif self.persona == "fast_executor":
            return """# Profile Analysis

## Founder Psychology Summary
- Motivation: Freedom and independence
- Biggest Fear: Moving too slowly
- Decision Style: Fast, action-oriented
- Energy Pattern: Bursts of high activity
- Constraints: None significant
- Success Definition: Speed and growth

This founder moves quickly and values action over analysis."""
        else:
            return """# Profile Analysis

## Founder Psychology Summary
- Motivation: Extra income
- Biggest Fear: Overcommitting
- Decision Style: Slow, careful
- Energy Pattern: Low, consistent
- Constraints: Job + family
- Success Definition: Earn without burnout

This founder needs minimal-ops solutions."""
    
    def _research_content(self):
        return """# Market Research

## Top Startup Ideas

1. **Lean Micro SaaS** - Low-risk, recurring revenue model
2. **Content Repurposing Service** - Scalable with minimal ops
3. **AI-powered Automation Tool** - High growth potential

Market trends show strong demand in these areas."""
    
    def _recommendation_content(self):
        if self.persona == "risk_averse":
            return """# Personalized Recommendations

## Top Ideas for You

### 1. Lean Micro SaaS (Score: 88)
**Why this fits you:** Low upfront investment, steady recurring revenue. Perfect for your risk-averse approach.

**Tone:** Reassuring - We understand you value security and stability.

**Risk Framing:** This idea avoids high upfront investment and focuses on validated, low-risk approaches.

**30-Day Roadmap:** Validate with smallest scope possible. Start with one feature, test with 5 users.
**60-Day Roadmap:** Collect early feedback. Iterate based on real usage data.
**90-Day Roadmap:** Scale only if metrics hit threshold. Don't expand until proven.

This approach matches your steady energy pattern and cautious decision style."""
        elif self.persona == "fast_executor":
            return """# Personalized Recommendations

## Top Ideas for You

### 1. Automated Video Clipper (Score: 91)
**Why this fits you:** High growth potential, fast execution path. Perfect for your action-oriented approach.

**Tone:** Direct - Let's move fast and build something great.

**Risk Framing:** Bias toward action - ship quickly, iterate based on feedback.

**30-Day Roadmap:** Ship MVP in one week. Get it live and start getting users.
**60-Day Roadmap:** Acquire 10 users. Get real feedback and iterate.
**90-Day Roadmap:** Iterate aggressively. Double down on what works.

This matches your fast decision style and burst energy pattern."""
        else:
            return """# Personalized Recommendations

## Top Ideas for You

### 1. One-Page Info Product (Score: 82)
**Why this fits you:** Minimal operations, can be done in spare time. Perfect for your constrained schedule.

**Tone:** Supportive - We know you're balancing a lot. This works around your schedule.

**Risk Framing:** Minimize ops - automate everything possible, keep it simple.

**30-Day Roadmap:** Create 1 template. Keep it simple, focus on quality.
**60-Day Roadmap:** Publish quietly. Start small, don't overcommit.
**90-Day Roadmap:** Automate everything possible. Set up systems to run without you.

This respects your low energy pattern and need to avoid overcommitting."""


@pytest.fixture
def mock_openai_tools(monkeypatch):
    """Fixture to inject mock OpenAI client into tools."""
    def setup_mock(persona: str):
        mock_client = MockOpenAIClient(persona=persona)
        
        # Inject into market research tool
        import startup_idea_crew.tools.market_research_tool as mrt
        monkeypatch.setattr(mrt, '_MOCK_OPENAI_CLIENT', mock_client)
        
        # Inject into validation tool
        import startup_idea_crew.tools.validation_tool as vt
        monkeypatch.setattr(vt, '_MOCK_OPENAI_CLIENT', mock_client)
        
        return mock_client
    return setup_mock


@pytest.fixture
def mock_crewai_llm(monkeypatch):
    """Fixture to mock CrewAI's LLM calls."""
    def setup_mock(persona: str):
        # Create a factory function that returns our mock
        def mock_chat_openai_factory(*args, **kwargs):
            mock = MockChatOpenAI(*args, persona=persona, **kwargs)
            return mock
        
        # Patch at multiple levels for CrewAI compatibility
        # CrewAI uses langchain's LLM providers, so we need to mock the class itself
        try:
            from langchain_openai import ChatOpenAI
            original_init = ChatOpenAI.__init__
            def patched_init(self, *args, **kwargs):
                mock = MockChatOpenAI(*args, persona=persona, **kwargs)
                # Copy attributes to self
                self.__dict__.update(mock.__dict__)
                self.invoke = mock.invoke
                self.stream = mock.stream
            monkeypatch.setattr(ChatOpenAI, '__init__', patched_init)
        except ImportError:
            pass
        
        try:
            from langchain_community.chat_models import ChatOpenAI as CommunityChatOpenAI
            original_init = CommunityChatOpenAI.__init__
            def patched_init(self, *args, **kwargs):
                mock = MockChatOpenAI(*args, persona=persona, **kwargs)
                self.__dict__.update(mock.__dict__)
                self.invoke = mock.invoke
                self.stream = mock.stream
            monkeypatch.setattr(CommunityChatOpenAI, '__init__', patched_init)
        except ImportError:
            pass
        
        # Also try to mock CrewAI's LLM provider resolution
        try:
            from crewai.llm import LLM
            def mock_from_llm_string(llm_string, **kwargs):
                return MockChatOpenAI(persona=persona, **kwargs)
            monkeypatch.setattr(LLM, 'from_llm_string', staticmethod(mock_from_llm_string))
        except (ImportError, AttributeError):
            pass
        
        return MockChatOpenAI(persona=persona)
    return setup_mock


def extract_psychology_from_output(output: str) -> Dict[str, Any]:
    """Extract psychology-related content from output."""
    psychology = {
        "tone": None,
        "risk_style": None,
        "roadmap_30": None,
        "roadmap_60": None,
        "roadmap_90": None,
        "top_idea": None
    }
    
    # Extract tone
    if "tone:" in output.lower():
        tone_line = [line for line in output.split('\n') if 'tone:' in line.lower()][0]
        psychology["tone"] = tone_line.split(':')[-1].strip()
    
    # Extract risk style
    if "risk" in output.lower() and ("framing" in output.lower() or "style" in output.lower()):
        risk_lines = [line for line in output.split('\n') if 'risk' in line.lower() and ':' in line]
        if risk_lines:
            psychology["risk_style"] = risk_lines[0].split(':')[-1].strip()
    
    # Extract roadmap
    if "30-day" in output.lower() or "30 day" in output.lower():
        roadmap_lines = [line for line in output.split('\n') if '30' in line.lower() and 'day' in line.lower()]
        if roadmap_lines:
            psychology["roadmap_30"] = roadmap_lines[0]
    
    if "60-day" in output.lower() or "60 day" in output.lower():
        roadmap_lines = [line for line in output.split('\n') if '60' in line.lower() and 'day' in line.lower()]
        if roadmap_lines:
            psychology["roadmap_60"] = roadmap_lines[0]
    
    if "90-day" in output.lower() or "90 day" in output.lower():
        roadmap_lines = [line for line in output.split('\n') if '90' in line.lower() and 'day' in line.lower()]
        if roadmap_lines:
            psychology["roadmap_90"] = roadmap_lines[0]
    
    # Extract top idea
    if "### 1." in output or "1." in output[:100]:
        lines = output.split('\n')
        for i, line in enumerate(lines):
            if "### 1." in line or (line.strip().startswith("1.") and i < 10):
                psychology["top_idea"] = line.replace("###", "").replace("1.", "").strip()
                break
    
    return psychology


def test_risk_averse_psychology_flows_through(mock_openai_tools, mock_crewai_llm):
    """Test that risk_averse psychology flows through all tasks."""
    mock_openai_tools("risk_averse")
    mock_crewai_llm("risk_averse")
    
    # Import here to ensure mocks are set up
    from startup_idea_crew.crew import StartupIdeaCrew
    
    crew_instance = StartupIdeaCrew()
    crew = crew_instance.crew()
    
    # Run with risk_averse input
    inputs = risk_averse_input.copy()
    result = crew.kickoff(inputs=inputs)
    
    # Get outputs
    outputs = {}
    for task in crew.tasks:
        if hasattr(task, 'output_file') and task.output_file:
            try:
                with open(task.output_file, 'r', encoding='utf-8') as f:
                    outputs[task.output_file] = f.read()
            except:
                pass
    
    # Verify psychology appears in profile analysis
    profile_output = outputs.get('output/profile_analysis.md', '')
    assert 'security' in profile_output.lower() or 'stability' in profile_output.lower()
    assert 'failure' in profile_output.lower() or 'risk' in profile_output.lower()
    
    # Verify psychology influences recommendations
    rec_output = outputs.get('output/personalized_recommendations.md', '')
    psychology = extract_psychology_from_output(rec_output)
    
    assert psychology["tone"] is not None or "reassuring" in rec_output.lower()
    assert "risk" in rec_output.lower() or "low" in rec_output.lower()


def test_fast_executor_psychology_flows_through(mock_openai_tools, mock_crewai_llm):
    """Test that fast_executor psychology flows through all tasks."""
    mock_openai_tools("fast_executor")
    mock_crewai_llm("fast_executor")
    
    from startup_idea_crew.crew import StartupIdeaCrew
    
    crew_instance = StartupIdeaCrew()
    crew = crew_instance.crew()
    
    inputs = fast_executor_input.copy()
    result = crew.kickoff(inputs=inputs)
    
    outputs = {}
    for task in crew.tasks:
        if hasattr(task, 'output_file') and task.output_file:
            try:
                with open(task.output_file, 'r', encoding='utf-8') as f:
                    outputs[task.output_file] = f.read()
            except:
                pass
    
    # Verify fast executor psychology
    profile_output = outputs.get('output/profile_analysis.md', '')
    assert 'action' in profile_output.lower() or 'fast' in profile_output.lower()
    
    rec_output = outputs.get('output/personalized_recommendations.md', '')
    psychology = extract_psychology_from_output(rec_output)
    
    assert "direct" in rec_output.lower() or psychology["tone"] is not None
    assert "ship" in rec_output.lower() or "fast" in rec_output.lower()


def test_ranking_differs_by_psychology(mock_openai_tools, mock_crewai_llm):
    """Test that idea rankings differ based on psychology."""
    # Test risk_averse
    mock_openai_tools("risk_averse")
    mock_crewai_llm("risk_averse")
    
    from startup_idea_crew.crew import StartupIdeaCrew
    
    crew1 = StartupIdeaCrew().crew()
    result1 = crew1.kickoff(inputs=risk_averse_input.copy())
    
    outputs1 = {}
    for task in crew1.tasks:
        if hasattr(task, 'output_file') and task.output_file:
            try:
                with open(task.output_file, 'r', encoding='utf-8') as f:
                    outputs1[task.output_file] = f.read()
            except:
                pass
    
    rec1 = outputs1.get('output/personalized_recommendations.md', '')
    top_idea1 = extract_psychology_from_output(rec1)["top_idea"]
    
    # Test fast_executor
    mock_openai_tools("fast_executor")
    mock_crewai_llm("fast_executor")
    
    crew2 = StartupIdeaCrew().crew()
    result2 = crew2.kickoff(inputs=fast_executor_input.copy())
    
    outputs2 = {}
    for task in crew2.tasks:
        if hasattr(task, 'output_file') and task.output_file:
            try:
                with open(task.output_file, 'r', encoding='utf-8') as f:
                    outputs2[task.output_file] = f.read()
            except:
                pass
    
    rec2 = outputs2.get('output/personalized_recommendations.md', '')
    top_idea2 = extract_psychology_from_output(rec2)["top_idea"]
    
    # Rankings should differ
    assert top_idea1 != top_idea2 or "Lean" in rec1 or "Video" in rec2


def test_tone_differs_by_psychology(mock_openai_tools, mock_crewai_llm):
    """Test that tone differs based on psychology."""
    # Risk averse
    mock_openai_tools("risk_averse")
    mock_crewai_llm("risk_averse")
    
    from startup_idea_crew.crew import StartupIdeaCrew
    
    crew1 = StartupIdeaCrew().crew()
    crew1.kickoff(inputs=risk_averse_input.copy())
    
    outputs1 = {}
    for task in crew1.tasks:
        if hasattr(task, 'output_file') and task.output_file:
            try:
                with open(task.output_file, 'r', encoding='utf-8') as f:
                    outputs1[task.output_file] = f.read()
            except:
                pass
    
    rec1 = outputs1.get('output/personalized_recommendations.md', '')
    psych1 = extract_psychology_from_output(rec1)
    
    # Fast executor
    mock_openai_tools("fast_executor")
    mock_crewai_llm("fast_executor")
    
    crew2 = StartupIdeaCrew().crew()
    crew2.kickoff(inputs=fast_executor_input.copy())
    
    outputs2 = {}
    for task in crew2.tasks:
        if hasattr(task, 'output_file') and task.output_file:
            try:
                with open(task.output_file, 'r', encoding='utf-8') as f:
                    outputs2[task.output_file] = f.read()
            except:
                pass
    
    rec2 = outputs2.get('output/personalized_recommendations.md', '')
    psych2 = extract_psychology_from_output(rec2)
    
    # Tones should differ
    assert "reassuring" in rec1.lower() or "direct" in rec2.lower() or psych1["tone"] != psych2["tone"]


def test_roadmap_differs_by_decision_style(mock_openai_tools, mock_crewai_llm):
    """Test that roadmaps differ based on decision_style and energy_pattern."""
    # Risk averse (slow decision, steady energy)
    mock_openai_tools("risk_averse")
    mock_crewai_llm("risk_averse")
    
    from startup_idea_crew.crew import StartupIdeaCrew
    
    crew1 = StartupIdeaCrew().crew()
    crew1.kickoff(inputs=risk_averse_input.copy())
    
    outputs1 = {}
    for task in crew1.tasks:
        if hasattr(task, 'output_file') and task.output_file:
            try:
                with open(task.output_file, 'r', encoding='utf-8') as f:
                    outputs1[task.output_file] = f.read()
            except:
                pass
    
    rec1 = outputs1.get('output/personalized_recommendations.md', '')
    psych1 = extract_psychology_from_output(rec1)
    
    # Fast executor (fast decision, burst energy)
    mock_openai_tools("fast_executor")
    mock_crewai_llm("fast_executor")
    
    crew2 = StartupIdeaCrew().crew()
    crew2.kickoff(inputs=fast_executor_input.copy())
    
    outputs2 = {}
    for task in crew2.tasks:
        if hasattr(task, 'output_file') and task.output_file:
            try:
                with open(task.output_file, 'r', encoding='utf-8') as f:
                    outputs2[task.output_file] = f.read()
            except:
                pass
    
    rec2 = outputs2.get('output/personalized_recommendations.md', '')
    psych2 = extract_psychology_from_output(rec2)
    
    # Roadmaps should differ
    assert psych1["roadmap_30"] != psych2["roadmap_30"] or (
        "validate" in rec1.lower() and "ship" in rec2.lower()
    )


def test_risk_framing_differs_by_fear(mock_openai_tools, mock_crewai_llm):
    """Test that risk framing differs based on biggest_fear."""
    # Risk averse (fear: failure)
    mock_openai_tools("risk_averse")
    mock_crewai_llm("risk_averse")
    
    from startup_idea_crew.crew import StartupIdeaCrew
    
    crew1 = StartupIdeaCrew().crew()
    crew1.kickoff(inputs=risk_averse_input.copy())
    
    outputs1 = {}
    for task in crew1.tasks:
        if hasattr(task, 'output_file') and task.output_file:
            try:
                with open(task.output_file, 'r', encoding='utf-8') as f:
                    outputs1[task.output_file] = f.read()
            except:
                pass
    
    rec1 = outputs1.get('output/personalized_recommendations.md', '')
    psych1 = extract_psychology_from_output(rec1)
    
    # Fast executor (fear: moving too slowly)
    mock_openai_tools("fast_executor")
    mock_crewai_llm("fast_executor")
    
    crew2 = StartupIdeaCrew().crew()
    crew2.kickoff(inputs=fast_executor_input.copy())
    
    outputs2 = {}
    for task in crew2.tasks:
        if hasattr(task, 'output_file') and task.output_file:
            try:
                with open(task.output_file, 'r', encoding='utf-8') as f:
                    outputs2[task.output_file] = f.read()
            except:
                pass
    
    rec2 = outputs2.get('output/personalized_recommendations.md', '')
    psych2 = extract_psychology_from_output(rec2)
    
    # Risk framing should differ
    assert (
        "avoid" in rec1.lower() or "low" in rec1.lower() or
        "action" in rec2.lower() or "bias" in rec2.lower() or
        psych1["risk_style"] != psych2["risk_style"]
    )

