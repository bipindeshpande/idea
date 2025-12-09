"""
Integration tests for Founder Connect feature flows.
Run with: pytest tests/integration/test_founder_connect_flows.py -v
"""
import pytest
import json
import uuid
from datetime import datetime, timedelta
from app.models.database import (
    db, User, UserSession, UserRun, UserValidation,
    FounderProfile, IdeaListing, ConnectionRequest, ConnectionCreditLedger,
    ValidationStatus, ConnectionStatus, utcnow
)


class TestListingCreationFromAdvisorRun:
    """Integration tests for creating listings from advisor/discovery runs."""
    
    def test_create_listing_from_run_id_string(self, app, test_user, authenticated_client):
        """Test creating listing using run_id string (timestamp-based)."""
        with app.app_context():
            # Create run with timestamp-based run_id
            run_id = "1764902847207"  # Example timestamp
            user_run = UserRun(
                user_id=test_user.id,
                run_id=run_id,
                inputs=json.dumps({
                    "goal_type": "extra_income",
                    "industry": "SaaS",
                    "stage": "idea",
                }),
                reports=json.dumps({
                    "personalized_recommendations": "Test recommendations"
                }),
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
                # Create listing using run_id string
                response = authenticated_client.post("/api/founder/ideas", json={
                    "title": "Chatbot Lead Generation Tool",
                    "source_type": "advisor",
                    "source_id": run_id,  # Use run_id string, not database id
                    "industry": "SaaS",
                    "stage": "idea",
                    "skills_needed": ["Marketing", "Sales"],
                })
                
                assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.get_json()}"
                data = response.get_json()
                assert data["success"] is True
                assert data["listing"]["source_type"] == "advisor"
                assert data["listing"]["source_id"] == user_run.id  # Should use database id internally
                assert data["listing"]["title"] == "Chatbot Lead Generation Tool"
                
            finally:
                # Cleanup
                listing = IdeaListing.query.filter_by(founder_profile_id=profile.id).first()
                if listing:
                    db.session.delete(listing)
                db.session.delete(profile)
                db.session.delete(user_run)
                db.session.commit()
    
    def test_create_listing_prevents_duplicates(self, app, test_user, authenticated_client):
        """Test that creating duplicate listings is prevented."""
        with app.app_context():
            # Create run
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
                # Create first listing
                response1 = authenticated_client.post("/api/founder/ideas", json={
                    "title": "Test Idea",
                    "source_type": "advisor",
                    "source_id": run_id,
                    "industry": "SaaS",
                    "stage": "idea",
                })
                assert response1.status_code == 200
                
                # Try to create duplicate listing
                response2 = authenticated_client.post("/api/founder/ideas", json={
                    "title": "Test Idea 2",
                    "source_type": "advisor",
                    "source_id": run_id,  # Same source
                    "industry": "SaaS",
                    "stage": "idea",
                })
                
                assert response2.status_code == 400
                data = response2.get_json()
                assert "already exists" in data.get("error", "").lower()
                
            finally:
                # Cleanup
                listings = IdeaListing.query.filter_by(founder_profile_id=profile.id).all()
                for listing in listings:
                    db.session.delete(listing)
                db.session.delete(profile)
                db.session.delete(user_run)
                db.session.commit()


class TestValidationListingCreation:
    """Integration tests for creating listings from validations."""
    
    def test_create_listing_from_validation_id_string(self, app, test_user, authenticated_client):
        """Test creating listing using validation_id string."""
        with app.app_context():
            # Create validation
            validation_id = f"val_{uuid.uuid4().hex[:12]}"
            validation = UserValidation(
                user_id=test_user.id,
                validation_id=validation_id,
                idea_explanation="Test idea for listing",
                category_answers=json.dumps({
                    "industry": "SaaS",
                    "stage": "idea",
                }),
                validation_result=json.dumps({
                    "overall_score": 7.5,
                    "scores": {"market_opportunity": 8},
                }),
                status=ValidationStatus.COMPLETED,
                is_deleted=False,
            )
            db.session.add(validation)
            db.session.commit()
            db.session.refresh(validation)
            
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
                # Create listing using validation_id string
                response = authenticated_client.post("/api/founder/ideas", json={
                    "title": "Validated Idea",
                    "source_type": "validation",
                    "source_id": validation_id,  # Use validation_id string
                    "industry": "SaaS",
                    "stage": "idea",
                })
                
                assert response.status_code == 200
                data = response.get_json()
                assert data["success"] is True
                assert data["listing"]["source_type"] == "validation"
                assert data["listing"]["source_id"] == validation.id  # Should use database id
                
            finally:
                # Cleanup
                listing = IdeaListing.query.filter_by(founder_profile_id=profile.id).first()
                if listing:
                    db.session.delete(listing)
                db.session.delete(profile)
                db.session.delete(validation)
                db.session.commit()


class TestConnectionWorkflow:
    """Integration tests for connection request workflow."""
    
    def test_complete_connection_workflow(self, app, test_user, test_user_2, authenticated_client, authenticated_client_2):
        """Test complete connection workflow: send, accept, reveal identity."""
        with app.app_context():
            # Create profiles
            profile1 = FounderProfile(
                user_id=test_user.id,
                is_public=True,
                is_active=True,
            )
            profile2 = FounderProfile(
                user_id=test_user_2.id,
                is_public=True,
                is_active=True,
            )
            db.session.add_all([profile1, profile2])
            db.session.commit()
            db.session.refresh(profile1)
            db.session.refresh(profile2)
            
            # Create listing for profile2
            listing = IdeaListing(
                founder_profile_id=profile2.id,
                title="Test Idea",
                source_type="advisor",
                source_id=1,
                industry="SaaS",
                stage="idea",
                is_active=True,
            )
            db.session.add(listing)
            db.session.commit()
            db.session.refresh(listing)
            
            connection_id = None
            try:
                # Step 1: Send connection request
                response1 = authenticated_client.post("/api/founder/connect", json={
                    "recipient_profile_id": profile2.id,
                    "idea_listing_id": listing.id,
                    "message": "Interested in collaborating",
                })
                assert response1.status_code == 200, f"Expected 200, got {response1.status_code}. Response: {response1.get_json()}"
                data1 = response1.get_json()
                assert data1["success"] is True
                connection_id = data1["connection_request"]["id"]
                assert data1["connection_request"]["status"] == ConnectionStatus.PENDING
                
                # Step 2: Recipient views incoming requests (should be anonymized)
                response2 = authenticated_client_2.get("/api/founder/connections")
                assert response2.status_code == 200
                data2 = response2.get_json()
                incoming = data2["received"]
                assert len(incoming) == 1
                assert incoming[0]["id"] == connection_id
                # Should not reveal identity
                sender = incoming[0].get("sender", {})
                assert "full_name" not in sender or sender.get("full_name") is None
                
                # Step 3: Accept connection
                response3 = authenticated_client_2.put(f"/api/founder/connections/{connection_id}/respond", json={
                    "action": "accept",
                })
                assert response3.status_code == 200
                data3 = response3.get_json()
                assert data3["success"] is True
                assert data3["connection_request"]["status"] == ConnectionStatus.ACCEPTED
                
                # Step 4: Get connection detail (should reveal identity)
                response4 = authenticated_client.get(f"/api/founder/connections/{connection_id}/detail")
                assert response4.status_code == 200, f"Expected 200, got {response4.status_code}. Response: {response4.get_json()}"
                data4 = response4.get_json()
                assert data4["success"] is True
                # Should reveal recipient identity
                assert "connection_request" in data4
                connection_data = data4["connection_request"]
                assert "recipient" in connection_data
                recipient = connection_data["recipient"]
                assert "full_name" in recipient or recipient.get("full_name") is not None
                
            finally:
                # Cleanup - delete in correct order to avoid foreign key constraints
                # Delete connection first, then related records, then profiles
                try:
                    if connection_id:
                        connection = ConnectionRequest.query.filter_by(id=connection_id).first()
                        if connection:
                            db.session.delete(connection)
                            db.session.commit()
                except Exception:
                    db.session.rollback()
                
                try:
                    credit_entry = ConnectionCreditLedger.query.filter_by(
                        user_id=test_user.id
                    ).first()
                    if credit_entry:
                        db.session.delete(credit_entry)
                    if listing:
                        db.session.delete(listing)
                    if profile1:
                        db.session.delete(profile1)
                    if profile2:
                        db.session.delete(profile2)
                    db.session.commit()
                except Exception:
                    db.session.rollback()


class TestCreditSystemIntegration:
    """Integration tests for credit system."""
    
    def test_credit_tracking_and_reset(self, app, test_user, test_user_2, authenticated_client, authenticated_client_2):
        """Test that credits are tracked and reset correctly."""
        with app.app_context():
            # Re-query user to get fresh instance
            user = User.query.get(test_user.id)
            # Set usage_reset_date to future to prevent auto-reset
            user.usage_reset_date = datetime.utcnow().date() + timedelta(days=1)
            user.monthly_connections_used = 0
            db.session.commit()
            db.session.refresh(user)
            
            # Create profiles
            profile1 = FounderProfile(user_id=test_user.id, is_public=True, is_active=True)
            profile2 = FounderProfile(user_id=test_user_2.id, is_public=True, is_active=True)
            db.session.add_all([profile1, profile2])
            db.session.commit()
            db.session.refresh(profile1)
            db.session.refresh(profile2)
            
            # Create listing
            listing = IdeaListing(
                founder_profile_id=profile2.id,
                title="Test",
                source_type="advisor",
                source_id=1,
                is_active=True,
            )
            db.session.add(listing)
            db.session.commit()
            db.session.refresh(listing)
            
            try:
                # Send first connection (should succeed for free user)
                response1 = authenticated_client.post("/api/founder/connect", json={
                    "recipient_profile_id": profile2.id,
                    "idea_listing_id": listing.id,
                })
                assert response1.status_code == 200, f"Expected 200, got {response1.status_code}. Response: {response1.get_json()}"
                
                # Check usage - re-query user within session context
                user_refreshed = User.query.get(test_user.id)
                assert user_refreshed.monthly_connections_used == 1
                
                # Check usage endpoint
                response2 = authenticated_client.get("/api/user/usage")
                assert response2.status_code == 200
                data2 = response2.get_json()
                usage = data2["usage"]
                assert "connections" in usage
                assert usage["connections"]["used"] == 1
                assert usage["connections"]["limit"] == 3  # Free tier
                assert usage["connections"]["remaining"] == 2
                
            finally:
                # Cleanup
                connection = ConnectionRequest.query.filter_by(sender_id=profile1.id).first()
                if connection:
                    db.session.delete(connection)
                credit_entry = ConnectionCreditLedger.query.filter_by(user_id=test_user.id).first()
                if credit_entry:
                    db.session.delete(credit_entry)
                db.session.delete(listing)
                db.session.delete(profile1)
                db.session.delete(profile2)
                # Reset usage
                user_refreshed = User.query.get(test_user.id)
                if user_refreshed:
                    user_refreshed.monthly_connections_used = 0
                db.session.commit()

