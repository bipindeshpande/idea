import json
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tests.helpers.mock_llm import MockLLM
from tests.helpers.snapshot_utils import assert_snapshot_equal
from tests.helpers.persona_inputs import (
    risk_averse_input,
    fast_executor_input,
    low_time_input
)


def run_discovery_with_mock(persona):
    """
    Replace real LLM calls with MockLLM during this test.
    """
    mock = MockLLM(persona=persona)
    result = json.loads(mock._response_for_persona())
    return {
        "ideas": result["ideas"],
        "tone": result["tone"],
        "risk_style": result["risk_style"]
    }


def test_risk_averse_snapshot():
    new_output = run_discovery_with_mock("risk_averse")
    assert_snapshot_equal("persona_risk_averse", new_output)


def test_fast_executor_snapshot():
    new_output = run_discovery_with_mock("fast_executor")
    assert_snapshot_equal("persona_fast_executor", new_output)


def test_low_time_snapshot():
    new_output = run_discovery_with_mock("low_time")
    assert_snapshot_equal("persona_low_time", new_output)

