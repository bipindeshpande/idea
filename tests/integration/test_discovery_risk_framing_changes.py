import json
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tests.helpers.mock_llm import MockLLM


def test_risk_style_differs_between_personas():
    """Verify that different personas produce different risk framing."""
    risk_averse = MockLLM("risk_averse")
    fast_executor = MockLLM("fast_executor")
    low_time = MockLLM("low_time")

    risk_output = json.loads(risk_averse.generate("prompt"))
    fast_output = json.loads(fast_executor.generate("prompt"))
    low_output = json.loads(low_time.generate("prompt"))

    # All personas should have different risk styles
    assert risk_output["risk_style"] == "avoid high upfront investment"
    assert fast_output["risk_style"] == "bias toward action"
    assert low_output["risk_style"] == "minimize ops"
    
    # Verify risk styles are distinct
    assert risk_output["risk_style"] != fast_output["risk_style"]
    assert fast_output["risk_style"] != low_output["risk_style"]
    assert risk_output["risk_style"] != low_output["risk_style"]


def test_risk_style_matches_persona_fears():
    """Verify that risk framing aligns with founder's biggest fear."""
    risk_averse = MockLLM("risk_averse")
    fast_executor = MockLLM("fast_executor")
    low_time = MockLLM("low_time")

    risk_output = json.loads(risk_averse.generate("prompt"))
    fast_output = json.loads(fast_executor.generate("prompt"))
    low_output = json.loads(low_time.generate("prompt"))

    # Risk-averse (fear: failure) should avoid high upfront investment
    assert "avoid" in risk_output["risk_style"].lower() or "high upfront" in risk_output["risk_style"].lower()
    
    # Fast executor (fear: moving too slowly) should bias toward action
    assert "action" in fast_output["risk_style"].lower() or "bias" in fast_output["risk_style"].lower()
    
    # Low time (fear: overcommitting) should minimize operations
    assert "minimize" in low_output["risk_style"].lower() or "ops" in low_output["risk_style"].lower()

