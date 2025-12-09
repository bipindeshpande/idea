import json
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tests.helpers.mock_llm import MockLLM
from tests.helpers.persona_inputs import risk_averse_input, fast_executor_input


def test_ranking_differs_between_personas():
    """Verify that different personas produce different idea rankings."""
    mock1 = MockLLM("risk_averse")
    mock2 = MockLLM("fast_executor")

    out1 = mock1.generate("prompt")
    out2 = mock2.generate("prompt")

    assert out1 != out2
    assert "Lean Micro SaaS" in out1
    assert "Automated Video Clipper" in out2


def test_top_idea_differs_by_persona():
    """Verify that the top-ranked idea differs based on persona."""
    risk_averse = MockLLM("risk_averse")
    fast_executor = MockLLM("fast_executor")
    low_time = MockLLM("low_time")

    risk_output = json.loads(risk_averse.generate("prompt"))
    fast_output = json.loads(fast_executor.generate("prompt"))
    low_output = json.loads(low_time.generate("prompt"))

    # Top ideas should be different for each persona
    risk_top = risk_output["ideas"][0]["title"]
    fast_top = fast_output["ideas"][0]["title"]
    low_top = low_output["ideas"][0]["title"]

    assert risk_top != fast_top
    assert fast_top != low_top
    assert risk_top != low_top


def test_idea_scores_reflect_persona_preferences():
    """Verify that idea scores reflect persona-specific preferences."""
    risk_averse = MockLLM("risk_averse")
    fast_executor = MockLLM("fast_executor")
    low_time = MockLLM("low_time")

    risk_output = json.loads(risk_averse.generate("prompt"))
    fast_output = json.loads(fast_executor.generate("prompt"))
    low_output = json.loads(low_time.generate("prompt"))

    # Risk-averse should prioritize low-risk ideas (lower scores but safer)
    risk_scores = [idea["score"] for idea in risk_output["ideas"]]
    
    # Fast executor should prioritize high-potential ideas (higher scores)
    fast_scores = [idea["score"] for idea in fast_output["ideas"]]
    
    # Low time should prioritize simple ideas (moderate scores)
    low_scores = [idea["score"] for idea in low_output["ideas"]]

    # Verify all personas have valid scores
    assert all(70 <= score <= 100 for score in risk_scores)
    assert all(70 <= score <= 100 for score in fast_scores)
    assert all(70 <= score <= 100 for score in low_scores)
    
    # Fast executor should have highest top score (bias toward high-potential)
    assert max(fast_scores) >= max(risk_scores)
    assert max(fast_scores) >= max(low_scores)


def test_ranking_matches_interest_area():
    """Verify that idea rankings align with persona interest areas."""
    risk_averse = MockLLM("risk_averse")  # AI Tools / Automation
    fast_executor = MockLLM("fast_executor")  # Creator Tools / Video Editing
    low_time = MockLLM("low_time")  # Digital Products / Templates

    risk_output = json.loads(risk_averse.generate("prompt"))
    fast_output = json.loads(fast_executor.generate("prompt"))
    low_output = json.loads(low_time.generate("prompt"))

    # Risk-averse ideas should relate to AI/Automation
    risk_titles = " ".join([idea["title"] for idea in risk_output["ideas"]])
    assert "AI" in risk_titles or "SaaS" in risk_titles
    
    # Fast executor ideas should relate to Creator/Video tools
    fast_titles = " ".join([idea["title"] for idea in fast_output["ideas"]])
    assert "Video" in fast_titles or "Newsletter" in fast_titles
    
    # Low time ideas should relate to Digital Products/Templates
    low_titles = " ".join([idea["title"] for idea in low_output["ideas"]])
    assert "Template" in low_titles or "Product" in low_titles or "Resume" in low_titles

