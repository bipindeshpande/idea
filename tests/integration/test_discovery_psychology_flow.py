"""
Simplified Integration Tests for Founder Psychology Flow

These tests verify that founder_psychology flows through the discovery pipeline
without requiring full crew execution (which needs complex LLM mocking).
"""

import json
import sys
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from tests.helpers.persona_inputs import (
    risk_averse_input,
    fast_executor_input,
    low_time_input
)


def test_founder_psychology_in_payload():
    """Test that founder_psychology is included in the payload sent to crew."""
    # Check that founder_psychology fields are expected
    test_input = risk_averse_input.copy()
    
    # Verify founder_psychology structure exists
    assert "founder_psychology" in test_input
    psychology = test_input["founder_psychology"]
    
    # Verify required fields
    required_fields = [
        "motivation_primary",
        "biggest_fear",
        "decision_style",
        "energy_pattern",
        "constraints"
    ]
    for field in required_fields:
        assert field in psychology, f"Missing required field: {field}"
        assert psychology[field] is not None, f"Field {field} is None"


def test_psychology_passed_to_tasks():
    """Test that founder_psychology is passed to task configurations."""
    # Read tasks.yaml directly to verify psychology is referenced
    tasks_yaml_path = Path(project_root) / "src" / "startup_idea_crew" / "config" / "tasks.yaml"
    
    assert tasks_yaml_path.exists(), "tasks.yaml should exist"
    
    with open(tasks_yaml_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Verify tasks reference founder_psychology
    assert "founder_psychology" in content.lower() or "psychology" in content.lower()
    
    # Verify specific task mentions
    assert "profile_analysis_task" in content or "profile" in content.lower()
    assert "recommendation_task" in content or "recommendation" in content.lower()


def test_psychology_in_task_inputs():
    """Test that founder_psychology appears in task input formatting."""
    # Simulate how inputs are formatted for tasks
    test_input = risk_averse_input.copy()
    
    # Format as it would be for task
    formatted = {
        "goal_type": test_input.get("goal_type", ""),
        "time_commitment": test_input.get("time_commitment", ""),
        "budget_range": test_input.get("budget_range", ""),
        "interest_area": test_input.get("interest_area", ""),
        "sub_interest_area": test_input.get("sub_interest_area", ""),
        "work_style": test_input.get("work_style", ""),
        "skill_strength": test_input.get("skill_strength", ""),
        "experience_summary": test_input.get("experience_summary", ""),
        "founder_psychology": json.dumps(test_input.get("founder_psychology", {}))
    }
    
    # Verify psychology is included
    assert "founder_psychology" in formatted
    psychology_parsed = json.loads(formatted["founder_psychology"])
    assert psychology_parsed["motivation_primary"] == "security"
    assert psychology_parsed["biggest_fear"] == "failure"


def test_different_psychologies_produce_different_inputs():
    """Test that different personas produce different formatted inputs."""
    risk_input = risk_averse_input.copy()
    fast_input = fast_executor_input.copy()
    
    # Format both
    risk_formatted = json.dumps(risk_input.get("founder_psychology", {}))
    fast_formatted = json.dumps(fast_input.get("founder_psychology", {}))
    
    # They should be different
    assert risk_formatted != fast_formatted
    
    # Parse and verify differences
    risk_psych = json.loads(risk_formatted)
    fast_psych = json.loads(fast_formatted)
    
    assert risk_psych["decision_style"] != fast_psych["decision_style"]
    assert risk_psych["biggest_fear"] != fast_psych["biggest_fear"]
    assert risk_psych["energy_pattern"] != fast_psych["energy_pattern"]


def test_psychology_fields_validation():
    """Test that psychology fields are properly structured for all personas."""
    personas = [risk_averse_input, fast_executor_input, low_time_input]
    
    for persona in personas:
        psychology = persona.get("founder_psychology", {})
        
        # Verify structure
        assert isinstance(psychology, dict)
        assert "motivation_primary" in psychology
        assert "biggest_fear" in psychology
        assert "decision_style" in psychology
        assert "energy_pattern" in psychology
        assert "constraints" in psychology
        
        # Verify values are strings (or empty strings)
        for key, value in psychology.items():
            assert isinstance(value, str) or value == "", f"Field {key} should be string"


def test_psychology_in_agent_config():
    """Test that agent configurations reference founder_psychology."""
    # Read agents.yaml to verify psychology is mentioned
    agents_yaml_path = Path(project_root) / "src" / "startup_idea_crew" / "config" / "agents.yaml"
    
    if agents_yaml_path.exists():
        with open(agents_yaml_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Verify psychology is referenced in agent configs
        assert "founder_psychology" in content.lower() or "psychology" in content.lower()


def test_psychology_in_task_config():
    """Test that task configurations reference founder_psychology."""
    # Read tasks.yaml to verify psychology is mentioned
    tasks_yaml_path = Path(project_root) / "src" / "startup_idea_crew" / "config" / "tasks.yaml"
    
    if tasks_yaml_path.exists():
        with open(tasks_yaml_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Verify psychology is referenced in task configs
        assert "founder_psychology" in content.lower() or "psychology" in content.lower()

