"""
Integration tests for validation score extraction and editing flows.
These tests verify end-to-end functionality that unit tests might miss.
"""
import pytest
import json
import uuid
from datetime import datetime, timedelta
from app.models.database import (
    db, User, UserSession, UserValidation, ValidationStatus, utcnow
)


@pytest.fixture
def test_validation_with_scores(app, test_user):
    """Create a validation with properly extracted scores."""
    with app.app_context():
        # Create a validation with markdown that contains a score table
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
                "Competitive Landscape": "Excellent competitive position",
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
def test_validation_session(app, test_user, test_validation_with_scores):
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
def authenticated_validation_client(app, test_validation_session):
    """Create an authenticated test client with validation access."""
    with app.test_client() as client:
        client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {test_validation_session.session_token}'
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
        
        # Check that problem_solution_fit was extracted (should be 9 from score 4)
        assert scores.get("problem_solution_fit") == 9
        
        # Check that market_opportunity was extracted (should be 10 from score 5)
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
        from app.routes.validation import _extract_validation_data_from_markdown
        
        markdown = """## 🎯 Executive Summary
No table here.
"""
        
        result = _extract_validation_data_from_markdown(markdown)
        
        assert result is not None
        assert "scores" in result
        # Should have default scores (all same as overall_score)
        scores = result["scores"]
        # All should be set to overall_score (default 5)
        assert all(score == 5 for score in scores.values())


class TestValidationEditingFlow:
    """Test validation editing and retrieval flows."""
    
    def test_validation_can_be_found_by_validation_id(self, authenticated_validation_client, test_validation_with_scores):
        """Test that validation can be found by validation_id in activity endpoint."""
        response = authenticated_validation_client.get("/api/user/activity?include_all_statuses=true&per_page=100")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        
        validations = data.get("activity", {}).get("validations", [])
        assert len(validations) > 0
        
        # Find our validation
        found = None
        for v in validations:
            if v.get("validation_id") == test_validation_with_scores.validation_id:
                found = v
                break
        
        assert found is not None, "Validation should be found by validation_id"
        assert found.get("id") == test_validation_with_scores.id
        assert found.get("idea_explanation") == test_validation_with_scores.idea_explanation
    
    def test_validation_can_be_found_by_database_id(self, authenticated_validation_client, test_validation_with_scores):
        """Test that validation can be found by database id."""
        response = authenticated_validation_client.get("/api/user/activity?include_all_statuses=true&per_page=100")
        
        assert response.status_code == 200
        data = response.get_json()
        validations = data.get("activity", {}).get("validations", [])
        
        # Find by database id
        found = None
        for v in validations:
            if v.get("id") == test_validation_with_scores.id:
                found = v
                break
        
        assert found is not None, "Validation should be found by database id"
    
    def test_validation_scores_are_returned_correctly(self, authenticated_validation_client, test_validation_with_scores):
        """Test that validation scores are returned correctly in activity endpoint."""
        response = authenticated_validation_client.get("/api/user/activity?include_all_statuses=true")
        
        assert response.status_code == 200
        data = response.get_json()
        validations = data.get("activity", {}).get("validations", [])
        
        found = None
        for v in validations:
            if v.get("validation_id") == test_validation_with_scores.validation_id:
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


class TestRunLookupForListings:
    """Test run lookup when creating listings from advisor runs."""
    
    def test_run_lookup_by_run_id_string(self, app, test_user, authenticated_client):
        """Test that run can be found by run_id string when creating listing."""
        from app.models.database import UserRun, FounderProfile, IdeaListing
        
        with app.app_context():
            # Create a run with a timestamp-based run_id
            run_id_string = f"1764902847207"  # Example timestamp-based ID
            user_run = UserRun(
                user_id=test_user.id,
                run_id=run_id_string,
                inputs=json.dumps({"goal_type": "extra_income"}),
                reports=json.dumps({"personalized_recommendations": "Test recommendations"}),
                is_deleted=False,
            )
            db.session.add(user_run)
            db.session.commit()
            db.session.refresh(user_run)
            
            # Create founder profile
            profile = FounderProfile(
                user_id=test_user.id,
                is_public=True,
                is_active=True,
            )
            db.session.add(profile)
            db.session.commit()
            db.session.refresh(profile)
            
            try:
                # Try to create listing using run_id string (not database id)
                response = authenticated_client.post("/api/founder/ideas", json={
                    "title": "Test Idea from Run",
                    "source_type": "advisor",
                    "source_id": run_id_string,  # Use run_id string, not database id
                    "industry": "SaaS",
                    "stage": "idea",
                })
                
                assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.get_json()}"
                data = response.get_json()
                assert data["success"] is True
                assert data["listing"]["source_type"] == "advisor"
                # Should use database id internally
                assert data["listing"]["source_id"] == user_run.id
                
            finally:
                # Cleanup
                listing = IdeaListing.query.filter_by(founder_profile_id=profile.id).first()
                if listing:
                    db.session.delete(listing)
                db.session.delete(profile)
                db.session.delete(user_run)
                db.session.commit()
    
    def test_run_lookup_by_database_id(self, app, test_user, authenticated_client):
        """Test that run can be found by database id when creating listing."""
        from app.models.database import UserRun, FounderProfile, IdeaListing
        
        with app.app_context():
            # Create a run
            user_run = UserRun(
                user_id=test_user.id,
                run_id=f"run_{uuid.uuid4().hex[:12]}",
                inputs=json.dumps({"goal_type": "extra_income"}),
                reports=json.dumps({"personalized_recommendations": "Test"}),
                is_deleted=False,
            )
            db.session.add(user_run)
            db.session.commit()
            db.session.refresh(user_run)
            
            # Create founder profile
            profile = FounderProfile(
                user_id=test_user.id,
                is_public=True,
                is_active=True,
            )
            db.session.add(profile)
            db.session.commit()
            db.session.refresh(profile)
            
            try:
                # Try to create listing using database id
                response = authenticated_client.post("/api/founder/ideas", json={
                    "title": "Test Idea",
                    "source_type": "advisor",
                    "source_id": str(user_run.id),  # Use database id as string
                    "industry": "SaaS",
                    "stage": "idea",
                })
                
                assert response.status_code == 200
                data = response.get_json()
                assert data["success"] is True
                assert data["listing"]["source_id"] == user_run.id
                
            finally:
                # Cleanup
                listing = IdeaListing.query.filter_by(founder_profile_id=profile.id).first()
                if listing:
                    db.session.delete(listing)
                db.session.delete(profile)
                db.session.delete(user_run)
                db.session.commit()
    
    def test_run_lookup_fails_for_other_user_run(self, app, test_user, test_user_2, authenticated_client_2):
        """Test that run lookup fails if run belongs to another user."""
        from app.models.database import UserRun, FounderProfile
        
        with app.app_context():
            # Create a run for test_user (not test_user_2)
            user_run = UserRun(
                user_id=test_user.id,  # Belongs to test_user
                run_id=f"run_{uuid.uuid4().hex[:12]}",
                inputs=json.dumps({"goal_type": "extra_income"}),
                reports=json.dumps({"personalized_recommendations": "Test"}),
                is_deleted=False,
            )
            db.session.add(user_run)
            db.session.commit()
            db.session.refresh(user_run)
            
            # Create founder profile for test_user_2
            profile = FounderProfile(
                user_id=test_user_2.id,
                is_public=True,
                is_active=True,
            )
            db.session.add(profile)
            db.session.commit()
            
            try:
                # Try to create listing using test_user's run (should fail)
                # authenticated_client_2 is for test_user_2
                response = authenticated_client_2.post("/api/founder/ideas", json={
                    "title": "Test Idea",
                    "source_type": "advisor",
                    "source_id": user_run.run_id,  # Run belongs to test_user, not test_user_2
                    "industry": "SaaS",
                    "stage": "idea",
                })
                
                assert response.status_code == 404, "Should fail with 404 for other user's run"
                data = response.get_json()
                assert "not found" in data.get("error", "").lower() or "access denied" in data.get("error", "").lower()
                
            finally:
                # Cleanup
                db.session.delete(profile)
                db.session.delete(user_run)
                db.session.commit()


class TestValidationScoreMapping:
    """Test that validation scores are properly mapped to all 10 parameters."""
    
    def test_all_parameters_get_scores(self, app):
        """Test that all 10 validation parameters receive scores."""
        from app.routes.validation import _extract_validation_data_from_markdown
        
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
        
        result = _extract_validation_data_from_markdown(markdown)
        
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
    
    def test_score_derivation_logic(self, app):
        """Test that derived scores use appropriate fallback logic."""
        from app.routes.validation import _extract_validation_data_from_markdown
        
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
        
        result = _extract_validation_data_from_markdown(markdown)
        scores = result["scores"]
        
        # target_audience_clarity should derive from market_opportunity or problem_solution_fit
        assert scores["target_audience_clarity"] in [scores["market_opportunity"], scores["problem_solution_fit"]]
        
        # business_model_viability should derive from financial_sustainability or market_opportunity
        assert scores["business_model_viability"] in [scores["financial_sustainability"], scores["market_opportunity"]]
        
        # technical_feasibility should derive from risk_assessment or problem_solution_fit
        assert scores["technical_feasibility"] in [scores["risk_assessment"], scores["problem_solution_fit"]]
        
        # scalability_potential should derive from market_opportunity or financial_sustainability
        assert scores["scalability_potential"] in [scores["market_opportunity"], scores["financial_sustainability"]]
        
        # go_to_market_strategy should derive from competitive_landscape or market_opportunity
        assert scores["go_to_market_strategy"] in [scores["competitive_landscape"], scores["market_opportunity"]]


class TestValidationEditingIntegration:
    """Integration tests for validation editing workflow."""
    
    def test_validation_editing_workflow(self, app, test_user, test_validation_with_scores):
        """Test complete validation editing workflow."""
        from app.models.database import UserSession
        import secrets
        
        with app.app_context():
            # Create session
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
            
            try:
                # Test 1: Validation should appear in activity endpoint
                with app.test_client() as client:
                    client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {session_token}'
                    
                    response = client.get("/api/user/activity?include_all_statuses=true&per_page=100")
                    assert response.status_code == 200
                    data = response.get_json()
                    validations = data.get("activity", {}).get("validations", [])
                    
                    # Should find validation by validation_id
                    found_by_validation_id = any(
                        v.get("validation_id") == test_validation_with_scores.validation_id
                        for v in validations
                    )
                    assert found_by_validation_id, "Validation should be found by validation_id"
                    
                    # Should find validation by database id
                    found_by_id = any(
                        v.get("id") == test_validation_with_scores.id
                        for v in validations
                    )
                    assert found_by_id, "Validation should be found by database id"
                    
                    # Validation should have category_answers for editing
                    validation_data = next(
                        (v for v in validations if v.get("validation_id") == test_validation_with_scores.validation_id),
                        None
                    )
                    assert validation_data is not None
                    assert "category_answers" in validation_data
                    assert validation_data["category_answers"]["industry"] == "SaaS"
                    
            finally:
                db.session.delete(session)
                db.session.commit()

