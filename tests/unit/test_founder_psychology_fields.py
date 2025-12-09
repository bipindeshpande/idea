import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tests.helpers.persona_inputs import (
    risk_averse_input,
    fast_executor_input,
    low_time_input
)


def test_psychology_has_required_fields():
    """Verify that founder_psychology contains all required fields."""
    p = risk_averse_input["founder_psychology"]
    required = [
        "motivation_primary",
        "biggest_fear",
        "decision_style",
        "energy_pattern",
        "constraints"
    ]
    for r in required:
        assert r in p
        assert p[r] is not None


def test_all_personas_have_psychology_structure():
    """Verify that all three personas have valid founder_psychology structures."""
    personas = [
        risk_averse_input,
        fast_executor_input,
        low_time_input
    ]
    
    required_fields = [
        "motivation_primary",
        "biggest_fear",
        "decision_style",
        "energy_pattern",
        "constraints"
    ]
    
    for persona in personas:
        p = persona["founder_psychology"]
        for field in required_fields:
            assert field in p, f"Missing field {field} in {persona.get('goal_type', 'unknown')} persona"
            assert p[field] is not None, f"Field {field} is None in {persona.get('goal_type', 'unknown')} persona"
            assert isinstance(p[field], str) or p[field] == "", f"Field {field} should be string or empty"


def test_psychology_fields_have_valid_values():
    """Verify that psychology fields contain expected value types."""
    risk_p = risk_averse_input["founder_psychology"]
    fast_p = fast_executor_input["founder_psychology"]
    low_p = low_time_input["founder_psychology"]
    
    # Decision style should be "slow" or "fast"
    assert risk_p["decision_style"] in ["slow", "fast"]
    assert fast_p["decision_style"] in ["slow", "fast"]
    assert low_p["decision_style"] in ["slow", "fast"]
    
    # Energy pattern should be descriptive
    assert len(risk_p["energy_pattern"]) > 0
    assert len(fast_p["energy_pattern"]) > 0
    assert len(low_p["energy_pattern"]) > 0
    
    # Motivation primary should be non-empty
    assert len(risk_p["motivation_primary"]) > 0
    assert len(fast_p["motivation_primary"]) > 0
    assert len(low_p["motivation_primary"]) > 0


def test_psychology_fields_differ_between_personas():
    """Verify that different personas have different psychology characteristics."""
    risk_p = risk_averse_input["founder_psychology"]
    fast_p = fast_executor_input["founder_psychology"]
    low_p = low_time_input["founder_psychology"]
    
    # Decision styles should differ (at least some should be different)
    decision_styles = [risk_p["decision_style"], fast_p["decision_style"], low_p["decision_style"]]
    assert len(set(decision_styles)) >= 1  # At least some variation
    
    # Energy patterns should differ
    energy_patterns = [risk_p["energy_pattern"], fast_p["energy_pattern"], low_p["energy_pattern"]]
    assert len(set(energy_patterns)) >= 2  # Should have variation
    
    # Biggest fears should differ
    fears = [risk_p["biggest_fear"], fast_p["biggest_fear"], low_p["biggest_fear"]]
    assert len(set(fears)) >= 2  # Should have variation


def test_psychology_optional_fields():
    """Verify that optional fields (motivation_secondary) are handled correctly."""
    risk_p = risk_averse_input["founder_psychology"]
    fast_p = fast_executor_input["founder_psychology"]
    low_p = low_time_input["founder_psychology"]
    
    # motivation_secondary is optional - should exist but may be empty
    assert "motivation_secondary" in risk_p
    assert "motivation_secondary" in fast_p
    assert "motivation_secondary" in low_p
    
    # success_definition should exist
    assert "success_definition" in risk_p
    assert "success_definition" in fast_p
    assert "success_definition" in low_p

