"""
Integration tests for Validation feature flows.
Run with: pytest tests/integration/test_validation_flows.py -v
"""
import pytest
import json
import uuid
from datetime import datetime, timedelta
from app.models.database import (
    db, User, UserSession, UserValidation, ValidationStatus, utcnow
)


@pytest.fixture
def validation_with_scores(app, test_user):
    """Create a validation with properly extracted scores."""
    with app.app_context():
        markdown_content = """## 🎯 Executive Summary & Overall Verdict

This is a great idea with strong potential.

| Pillar | Score | Reasoning |
|--------|-------|-----------|
| Problem-Solution Fit | 4 | Strong problem-solution fit |
| Market Viability & Scope | 3 | Moderate market opportunity |
| Competitive Moat | 5 | Excellent competitive position |
| Financial Viability | 4 | Good financial prospects |
| Feasibility & Risk | 3 | Moderate feasibility |

## 🔎 Deep Dive Analysis

### 1. Core Problem & User Urgency
**Verdict:** Strong problem identified.

### 2. Business Model Stress Test
**Red Flag:** None identified.

### 3. Competitive Landscape
**Key Insight:** Strong competitive position.

## 🛑 Critical Assumptions & Next Steps

### 1. Riskiest Assumption
The main risk is market adoption.

### 2. Actionable Next Steps
1. Validate with customers
2. Build MVP
3. Launch beta
"""
        
        validation_result = {
            "overall_score": 7.5,
            "scores": {
                "problem_solution_fit": 9,
                "market_opportunity": 7,
                "competitive_landscape": 10,
                "financial_sustainability": 9,
                "risk_assessment": 7,
                "target_audience_clarity": 9,
                "business_model_viability": 9,
                "technical_feasibility": 7,
                "scalability_potential": 9,
                "go_to_market_strategy": 10,
            },
            "details": {
                "Problem-Solution Fit": "Strong problem-solution fit",
                "Market Opportunity": "Moderate market opportunity",
            },
            "recommendations": "This is a great idea",
            "next_steps": ["Validate with customers", "Build MVP"],
        }
        
        validation = UserValidation(
            user_id=test_user.id,
            validation_id=f"val_{uuid.uuid4().hex[:12]}",
            idea_explanation="Test idea for integration testing",
            category_answers=json.dumps({
                "industry": "SaaS",
                "stage": "idea",
                "geography": "US",
            }),
            validation_result=json.dumps(validation_result),
            status=ValidationStatus.COMPLETED,
            is_deleted=False,
        )
        db.session.add(validation)
        db.session.commit()
        db.session.refresh(validation)
        yield validation
        try:
            db.session.delete(validation)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def validation_session(app, test_user, validation_with_scores):
    """Create a session for the test user with validation."""
    with app.app_context():
        import secrets
        session_token = f"test_{uuid.uuid4().hex}_{secrets.token_urlsafe(16)}"
        expires_at = datetime.utcnow() + timedelta(days=7)
        session = UserSession(
            user_id=test_user.id,
            session_token=session_token,
            ip_address="127.0.0.1",
            expires_at=expires_at,
        )
        db.session.add(session)
        db.session.commit()
        yield session
        try:
            db.session.delete(session)
            db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def authenticated_validation_client(app, validation_session):
    """Create an authenticated test client with validation access."""
    with app.test_client() as client:
        client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {validation_session.session_token}'
        yield client


class TestValidationScoreExtraction:
    """Test validation score extraction from markdown."""
    
    def test_score_extraction_from_markdown_table(self, app):
        """Test that scores are properly extracted from markdown table."""
        from app.routes.validation import _parse_markdown_validation
        
        markdown = """## 🎯 Executive Summary

| Pillar | Score | Reasoning |
|--------|-------|-----------|
| Problem-Solution Fit | 4 | Strong fit |
| Market Viability & Scope | 5 | Excellent market |
| Competitive Moat | 3 | Moderate position |
| Financial Viability | 4 | Good prospects |
| Feasibility & Risk | 2 | Some concerns |

## 🔎 Deep Dive Analysis
Content here.

## 🛑 Critical Assumptions & Next Steps
Steps here.
"""
        
        result = _parse_markdown_validation(markdown)
        
        assert result is not None
        assert "scores" in result
        scores = result["scores"]
        
        # Check that scores are different (not all the same)
        score_values = list(scores.values())
        assert len(set(score_values)) > 1, "All scores should not be the same"
        
        # Check that problem_solution_fit was extracted (score 4 maps to 8: 4 * 2)
        assert scores.get("problem_solution_fit") == 8
        
        # Check that market_opportunity was extracted (score 5 maps to 10: 5 * 2)
        assert scores.get("market_opportunity") == 10
        
        # Check that all 10 parameters have scores
        expected_params = [
            "market_opportunity",
            "problem_solution_fit",
            "competitive_landscape",
            "target_audience_clarity",
            "business_model_viability",
            "technical_feasibility",
            "financial_sustainability",
            "scalability_potential",
            "risk_assessment",
            "go_to_market_strategy",
        ]
        for param in expected_params:
            assert param in scores, f"Missing score for {param}"
            assert isinstance(scores[param], (int, float)), f"Score for {param} should be numeric"
            assert 0 <= scores[param] <= 10, f"Score for {param} should be between 0-10"
    
    def test_score_extraction_handles_missing_table(self, app):
        """Test that score extraction handles missing table gracefully."""
        from app.routes.validation import _parse_markdown_validation
        
        markdown = """## 🎯 Executive Summary
No table here.
"""
        
        result = _parse_markdown_validation(markdown)
        
        assert result is not None
        assert "scores" in result
        # Should have default scores
        scores = result["scores"]
        # All should be set to overall_score (default 5)
        assert all(score == 5 for score in scores.values())


class TestValidationEditingFlow:
    """Test validation editing and retrieval flows."""
    
    def test_validation_can_be_found_by_validation_id(self, authenticated_validation_client, validation_with_scores):
        """Test that validation can be found by validation_id in activity endpoint."""
        response = authenticated_validation_client.get("/api/user/activity?include_all_statuses=true&per_page=100")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        
        # The endpoint returns validations directly, not nested under "activity"
        validations = data.get("validations", [])
        assert len(validations) > 0
        
        # Find our validation
        found = None
        for v in validations:
            if v.get("validation_id") == validation_with_scores.validation_id:
                found = v
                break
        
        assert found is not None, "Validation should be found by validation_id"
        assert found.get("id") == validation_with_scores.id
        assert found.get("idea_explanation") == validation_with_scores.idea_explanation
    
    def test_validation_can_be_found_by_database_id(self, authenticated_validation_client, validation_with_scores):
        """Test that validation can be found by database id."""
        response = authenticated_validation_client.get("/api/user/activity?include_all_statuses=true&per_page=100")
        
        assert response.status_code == 200
        data = response.get_json()
        # The endpoint returns validations directly, not nested under "activity"
        validations = data.get("validations", [])
        
        # Find by database id
        found = None
        for v in validations:
            if v.get("id") == validation_with_scores.id:
                found = v
                break
        
        assert found is not None, "Validation should be found by database id"
    
    def test_validation_scores_are_returned_correctly(self, authenticated_validation_client, validation_with_scores):
        """Test that validation scores are returned correctly in activity endpoint."""
        response = authenticated_validation_client.get("/api/user/activity?include_all_statuses=true")
        
        assert response.status_code == 200
        data = response.get_json()
        # The endpoint returns validations directly, not nested under "activity"
        validations = data.get("validations", [])
        
        found = None
        for v in validations:
            if v.get("validation_id") == validation_with_scores.validation_id:
                found = v
                break
        
        assert found is not None
        validation_result = found.get("validation_result", {})
        assert "scores" in validation_result
        
        scores = validation_result["scores"]
        # Verify scores are different (not all 5.0)
        score_values = list(scores.values())
        assert len(set(score_values)) > 1, "Scores should not all be the same"
        
        # Verify all 10 parameters have scores
        expected_params = [
            "market_opportunity",
            "problem_solution_fit",
            "competitive_landscape",
            "target_audience_clarity",
            "business_model_viability",
            "technical_feasibility",
            "financial_sustainability",
            "scalability_potential",
            "risk_assessment",
            "go_to_market_strategy",
        ]
        for param in expected_params:
            assert param in scores, f"Missing score for {param}"


class TestValidationScoreMapping:
    """Test that validation scores are properly mapped to all 10 parameters."""
    
    def test_all_parameters_get_scores(self, app):
        """Test that all 10 validation parameters receive scores."""
        from app.routes.validation import _parse_markdown_validation
        
        markdown = """## 🎯 Executive Summary

| Pillar | Score | Reasoning |
|--------|-------|-----------|
| Problem-Solution Fit | 4 | Strong |
| Market Viability & Scope | 5 | Excellent |
| Competitive Moat | 3 | Moderate |
| Financial Viability | 4 | Good |
| Feasibility & Risk | 2 | Concerns |

## 🔎 Deep Dive Analysis
Content.

## 🛑 Critical Assumptions & Next Steps
Steps.
"""
        
        result = _parse_markdown_validation(markdown)
        
        assert result is not None
        scores = result["scores"]
        
        # All 10 parameters must have scores
        required_params = [
            "market_opportunity",
            "problem_solution_fit",
            "competitive_landscape",
            "target_audience_clarity",
            "business_model_viability",
            "technical_feasibility",
            "financial_sustainability",
            "scalability_potential",
            "risk_assessment",
            "go_to_market_strategy",
        ]
        
        for param in required_params:
            assert param in scores, f"Missing score for parameter: {param}"
            assert isinstance(scores[param], (int, float)), f"Score for {param} must be numeric"
            assert 0 <= scores[param] <= 10, f"Score for {param} must be 0-10, got {scores[param]}"
        
        # Verify scores are not all the same
        score_values = [scores[p] for p in required_params]
        unique_scores = set(score_values)
        assert len(unique_scores) > 1, f"All scores are the same: {score_values}"

