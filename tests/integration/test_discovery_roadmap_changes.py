import json
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tests.helpers.mock_llm import MockLLM


def test_roadmap_differs_based_on_energy_pattern():
    """Verify that roadmaps differ based on energy patterns (steady vs bursts)."""
    slow = MockLLM("risk_averse")
    fast = MockLLM("fast_executor")

    slow_output = json.loads(slow.generate("prompt"))
    fast_output = json.loads(fast.generate("prompt"))

    assert slow_output["roadmap"]["day_30"] != fast_output["roadmap"]["day_30"]


def test_roadmap_pacing_matches_time_commitment():
    """Verify that roadmap pacing aligns with time commitment constraints."""
    risk_averse = MockLLM("risk_averse")  # 5-10 hours
    fast_executor = MockLLM("fast_executor")  # 20 hours
    low_time = MockLLM("low_time")  # 1-3 hours

    risk_output = json.loads(risk_averse.generate("prompt"))
    fast_output = json.loads(fast_executor.generate("prompt"))
    low_output = json.loads(low_time.generate("prompt"))

    # Fast executor (20 hours) should have aggressive timeline
    assert "week" in fast_output["roadmap"]["day_30"].lower() or "ship" in fast_output["roadmap"]["day_30"].lower()
    
    # Low time (1-3 hours) should have minimal scope
    assert "1" in low_output["roadmap"]["day_30"] or "template" in low_output["roadmap"]["day_30"].lower()
    
    # Risk averse (5-10 hours) should have cautious approach
    assert "validate" in risk_output["roadmap"]["day_30"].lower() or "scope" in risk_output["roadmap"]["day_30"].lower()


def test_roadmap_all_timeframes_differ():
    """Verify that all roadmap timeframes (30/60/90) differ between personas."""
    risk_averse = MockLLM("risk_averse")
    fast_executor = MockLLM("fast_executor")
    low_time = MockLLM("low_time")

    risk_output = json.loads(risk_averse.generate("prompt"))
    fast_output = json.loads(fast_executor.generate("prompt"))
    low_output = json.loads(low_time.generate("prompt"))

    # Day 30 should differ
    assert risk_output["roadmap"]["day_30"] != fast_output["roadmap"]["day_30"]
    assert fast_output["roadmap"]["day_30"] != low_output["roadmap"]["day_30"]
    
    # Day 60 should differ
    assert risk_output["roadmap"]["day_60"] != fast_output["roadmap"]["day_60"]
    assert fast_output["roadmap"]["day_60"] != low_output["roadmap"]["day_60"]
    
    # Day 90 should differ
    assert risk_output["roadmap"]["day_90"] != fast_output["roadmap"]["day_90"]
    assert fast_output["roadmap"]["day_90"] != low_output["roadmap"]["day_90"]


def test_roadmap_pacing_reflects_decision_style():
    """Verify that roadmap pacing reflects decision style (slow vs fast)."""
    risk_averse = MockLLM("risk_averse")  # decision_style: slow
    fast_executor = MockLLM("fast_executor")  # decision_style: fast

    risk_output = json.loads(risk_averse.generate("prompt"))
    fast_output = json.loads(fast_executor.generate("prompt"))

    # Slow decision style should have cautious, validation-focused roadmap
    risk_day30 = risk_output["roadmap"]["day_30"].lower()
    assert "validate" in risk_day30 or "smallest" in risk_day30 or "scope" in risk_day30
    
    # Fast decision style should have action-oriented roadmap
    fast_day30 = fast_output["roadmap"]["day_30"].lower()
    assert "ship" in fast_day30 or "mvp" in fast_day30 or "week" in fast_day30


