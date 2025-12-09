"""
Integration tests for Discovery/Advisor feature flows.
Run with: pytest tests/integration/test_discovery_flows.py -v
"""
import pytest
import json
import uuid
from datetime import datetime
from app.models.database import (
    db, User, UserSession, UserRun
)


class TestDiscoveryRunWorkflow:
    """Integration tests for discovery run creation and retrieval."""
    
    def test_create_and_retrieve_run(self, app, test_user, authenticated_client):
        """Test creating a discovery run and retrieving it."""
        with app.app_context():
            # Create a run
            run_id = f"run_{uuid.uuid4().hex[:12]}"
            user_run = UserRun(
                user_id=test_user.id,
                run_id=run_id,
                inputs=json.dumps({
                    "goal_type": "extra_income",
                    "time_commitment": "part-time",
                    "budget_range": "low",
                    "interest_area": "SaaS",
                }),
                reports=json.dumps({
                    "personalized_recommendations": "## Top 3 Ideas\n\n### 1. Idea One\nContent",
                    "profile_analysis": "Profile analysis content",
                }),
                is_deleted=False,
            )
            db.session.add(user_run)
            db.session.commit()
            db.session.refresh(user_run)
            
            try:
                # Retrieve run by run_id
                response = authenticated_client.get(f"/api/user/run/{run_id}")
                assert response.status_code == 200
                data = response.get_json()
                assert data["success"] is True
                assert data["run"]["run_id"] == run_id
                assert "inputs" in data["run"]
                assert "reports" in data["run"]
                
            finally:
                db.session.delete(user_run)
                db.session.commit()
    
    def test_run_appears_in_activity(self, app, test_user, authenticated_client):
        """Test that runs appear in activity endpoint."""
        with app.app_context():
            run_id = f"run_{uuid.uuid4().hex[:12]}"
            user_run = UserRun(
                user_id=test_user.id,
                run_id=run_id,
                inputs=json.dumps({"goal_type": "extra_income"}),
                reports=json.dumps({"personalized_recommendations": "Test"}),
                is_deleted=False,
            )
            db.session.add(user_run)
            db.session.commit()
            
            try:
                response = authenticated_client.get("/api/user/activity")
                assert response.status_code == 200
                data = response.get_json()
                # Activity endpoint returns runs directly, not nested
                runs = data.get("runs", [])
                
                # Should find our run
                found = any(r.get("run_id") == run_id for r in runs)
                assert found, "Run should appear in activity"
                
            finally:
                db.session.delete(user_run)
                db.session.commit()
    
    def test_run_can_be_used_for_listing(self, app, test_user, authenticated_client):
        """Test that a run can be used to create a listing."""
        from app.models.database import FounderProfile, IdeaListing
        
        with app.app_context():
            run_id = f"run_{uuid.uuid4().hex[:12]}"
            user_run = UserRun(
                user_id=test_user.id,
                run_id=run_id,
                inputs=json.dumps({"goal_type": "extra_income", "industry": "SaaS"}),
                reports=json.dumps({"personalized_recommendations": "Test"}),
                is_deleted=False,
            )
            db.session.add(user_run)
            db.session.commit()
            db.session.refresh(user_run)
            
            # Create profile
            profile = FounderProfile(
                user_id=test_user.id,
                is_public=True,
                is_active=True,
            )
            db.session.add(profile)
            db.session.commit()
            db.session.refresh(profile)
            
            try:
                # Create listing using run_id
                response = authenticated_client.post("/api/founder/ideas", json={
                    "title": "Discovery Idea",
                    "source_type": "advisor",
                    "source_id": run_id,  # Use run_id string
                    "industry": "SaaS",
                    "stage": "idea",
                })
                
                assert response.status_code == 200
                data = response.get_json()
                assert data["success"] is True
                assert data["listing"]["source_id"] == user_run.id
                
            finally:
                listing = IdeaListing.query.filter_by(founder_profile_id=profile.id).first()
                if listing:
                    db.session.delete(listing)
                db.session.delete(profile)
                db.session.delete(user_run)
                db.session.commit()

