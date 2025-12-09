import json
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tests.helpers.mock_llm import MockLLM


def test_tone_differs_between_personas():
    """Verify that different personas produce different tones in recommendations."""
    risk_averse = MockLLM("risk_averse")
    fast_executor = MockLLM("fast_executor")
    low_time = MockLLM("low_time")

    risk_output = json.loads(risk_averse.generate("prompt"))
    fast_output = json.loads(fast_executor.generate("prompt"))
    low_output = json.loads(low_time.generate("prompt"))

    # All personas should have different tones
    assert risk_output["tone"] == "reassuring"
    assert fast_output["tone"] == "direct"
    assert low_output["tone"] == "supportive"
    
    # Verify tones are distinct
    assert risk_output["tone"] != fast_output["tone"]
    assert fast_output["tone"] != low_output["tone"]
    assert risk_output["tone"] != low_output["tone"]


def test_tone_matches_persona_psychology():
    """Verify that tone aligns with founder psychology characteristics."""
    risk_averse = MockLLM("risk_averse")
    fast_executor = MockLLM("fast_executor")

    risk_output = json.loads(risk_averse.generate("prompt"))
    fast_output = json.loads(fast_executor.generate("prompt"))

    # Risk-averse should have reassuring tone (matches security/stability motivation)
    assert risk_output["tone"] == "reassuring"
    
    # Fast executor should have direct tone (matches speed/action bias)
    assert fast_output["tone"] == "direct"

