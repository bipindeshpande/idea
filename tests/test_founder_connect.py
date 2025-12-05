"""
Tests for Founder Connect feature.
"""
import pytest
import uuid
import json
from datetime import datetime, timedelta
from app.models.database import (
    db, User, UserSession, UserRun, UserValidation,
    FounderProfile, IdeaListing, ConnectionRequest, ConnectionCreditLedger
)


@pytest.fixture
def test_user_2(app):
    """Create a second test user for connection tests."""
    with app.app_context():
        unique_email = f"test2_{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            email=unique_email,
            subscription_type="free",
            payment_status="active",
        )
        user.set_password("test-password")
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        yield user
        try:
            user_to_delete = User.query.filter_by(id=user.id).first()
            if user_to_delete:
                db.session.delete(user_to_delete)
                db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def test_user_session_2(app, test_user_2):
    """Create a session for the second test user."""
    with app.app_context():
        import secrets
        session_token = f"test2_{uuid.uuid4().hex}_{secrets.token_urlsafe(16)}"
        expires_at = datetime.utcnow() + timedelta(days=7)
        session = UserSession(
            user_id=test_user_2.id,
            session_token=session_token,
            ip_address="127.0.0.1",
            expires_at=expires_at,
        )
        db.session.add(session)
        db.session.commit()
        db.session.refresh(session)
        yield session
        try:
            session_to_delete = UserSession.query.filter_by(id=session.id).first()
            if session_to_delete:
                db.session.delete(session_to_delete)
                db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def authenticated_client_2(app, test_user_session_2):
    """Create an authenticated test client for user 2."""
    # Create a new client instance to avoid overwriting authenticated_client's auth header
    client = app.test_client()
    client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {test_user_session_2.session_token}'
    return client


@pytest.fixture
def starter_user(app):
    """Create a user with starter subscription."""
    with app.app_context():
        unique_email = f"starter_{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            email=unique_email,
            subscription_type="starter",
            payment_status="active",
        )
        user.set_password("test-password")
        user.subscription_started_at = datetime.utcnow()
        user.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
        user.usage_reset_date = (datetime.utcnow() + timedelta(days=1)).date()
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        yield user
        try:
            user_to_delete = User.query.filter_by(id=user.id).first()
            if user_to_delete:
                db.session.delete(user_to_delete)
                db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def starter_user_session(app, starter_user):
    """Create a session for starter user."""
    with app.app_context():
        import secrets
        session_token = f"starter_{uuid.uuid4().hex}_{secrets.token_urlsafe(16)}"
        expires_at = datetime.utcnow() + timedelta(days=7)
        session = UserSession(
            user_id=starter_user.id,
            session_token=session_token,
            ip_address="127.0.0.1",
            expires_at=expires_at,
        )
        db.session.add(session)
        db.session.commit()
        db.session.refresh(session)
        yield session
        try:
            session_to_delete = UserSession.query.filter_by(id=session.id).first()
            if session_to_delete:
                db.session.delete(session_to_delete)
                db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def authenticated_starter_client(app, starter_user_session):
    """Create an authenticated test client for starter user."""
    # Create a new client instance to avoid overwriting other clients' auth headers
    client = app.test_client()
    client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {starter_user_session.session_token}'
    return client


@pytest.fixture
def test_user_run(app, test_user):
    """Create a test UserRun (advisor/discovery run)."""
    with app.app_context():
        run_id = f"run_{uuid.uuid4().hex[:12]}"
        run = UserRun(
            user_id=test_user.id,
            run_id=run_id,
            inputs=json.dumps({"idea": "Test idea"}),
            reports=json.dumps({"results": []}),
            status="completed",
            is_deleted=False,
        )
        db.session.add(run)
        db.session.commit()
        db.session.refresh(run)
        yield run
        try:
            run_to_delete = UserRun.query.filter_by(id=run.id).first()
            if run_to_delete:
                db.session.delete(run_to_delete)
                db.session.commit()
        except Exception:
            db.session.rollback()


@pytest.fixture
def test_user_validation(app, test_user):
    """Create a test UserValidation."""
    with app.app_context():
        validation_id = f"val_{uuid.uuid4().hex[:12]}"
        validation = UserValidation(
            user_id=test_user.id,
            validation_id=validation_id,
            category_answers=json.dumps({"category": "test"}),
            idea_explanation="Test idea explanation",
            validation_result=json.dumps({"score": 8}),
            status="completed",
            is_deleted=False,
        )
        db.session.add(validation)
        db.session.commit()
        db.session.refresh(validation)
        yield validation
        try:
            val_to_delete = UserValidation.query.filter_by(id=validation.id).first()
            if val_to_delete:
                db.session.delete(val_to_delete)
                db.session.commit()
        except Exception:
            db.session.rollback()


# ============================================================================
# 1. FOUNDER PROFILE TESTS
# ============================================================================

def test_create_founder_profile(authenticated_client, test_user, app):
    """Test creating a founder profile."""
    with app.app_context():
        response = authenticated_client.post("/api/founder/profile", json={
            "full_name": "John Doe",
            "bio": "Test bio",
            "location": "San Francisco, CA",
            "primary_skills": ["Python", "React"],
            "industries_of_interest": ["SaaS", "AI"],
            "looking_for": "Technical co-founder",
            "commitment_level": "full-time",
            "is_public": True,
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "profile" in data
        assert data["profile"]["full_name"] == "John Doe"
        assert data["profile"]["bio"] == "Test bio"
        assert data["profile"]["user_id"] == test_user.id
        
        # Verify profile was created in database
        profile = FounderProfile.query.filter_by(user_id=test_user.id).first()
        assert profile is not None
        assert profile.full_name == "John Doe"


def test_get_founder_profile(authenticated_client, test_user, app):
    """Test retrieving founder profile."""
    with app.app_context():
        # Create profile first
        profile = FounderProfile(
            user_id=test_user.id,
            full_name="Jane Doe",
            bio="Test bio",
            is_public=True,
            is_active=True,
        )
        db.session.add(profile)
        db.session.commit()
        
        # Get profile
        response = authenticated_client.get("/api/founder/profile")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "profile" in data
        assert data["profile"]["full_name"] == "Jane Doe"
        assert data["profile"]["email"] == test_user.email  # Identity included for own profile
        
        # Cleanup
        db.session.delete(profile)
        db.session.commit()


def test_update_founder_profile(authenticated_client, test_user, app):
    """Test updating founder profile without creating duplicates."""
    with app.app_context():
        # Create initial profile
        profile = FounderProfile(
            user_id=test_user.id,
            full_name="Original Name",
            bio="Original bio",
            is_public=True,
            is_active=True,
        )
        db.session.add(profile)
        db.session.commit()
        profile_id = profile.id
        
        # Update profile
        response = authenticated_client.post("/api/founder/profile", json={
            "full_name": "Updated Name",
            "bio": "Updated bio",
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["profile"]["full_name"] == "Updated Name"
        assert data["profile"]["bio"] == "Updated bio"
        
        # Verify only one profile exists (no duplicate)
        profiles = FounderProfile.query.filter_by(user_id=test_user.id).all()
        assert len(profiles) == 1
        assert profiles[0].id == profile_id
        
        # Cleanup
        db.session.delete(profiles[0])
        db.session.commit()


def test_founder_profile_unauthenticated(client):
    """Test that unauthenticated requests are rejected."""
    response = client.get("/api/founder/profile")
    assert response.status_code == 401
    
    response = client.post("/api/founder/profile", json={"full_name": "Test"})
    assert response.status_code == 401


def test_browse_people_no_identity_fields(authenticated_client, test_user, test_user_2, app):
    """Test that /api/founder/people/browse does NOT return identity fields."""
    with app.app_context():
        # Create profile for user 2
        profile = FounderProfile(
            user_id=test_user_2.id,
            full_name="Hidden Name",
            linkedin_url="https://linkedin.com/hidden",
            website_url="https://hidden.com",
            location="Hidden Location",
            bio="Hidden bio",
            is_public=True,
            is_active=True,
        )
        db.session.add(profile)
        db.session.commit()
        
        # Browse profiles
        response = authenticated_client.get("/api/founder/people/browse")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "profiles" in data
        assert len(data["profiles"]) > 0
        
        # Check that identity fields are NOT present
        for profile_data in data["profiles"]:
            assert "full_name" not in profile_data
            assert "email" not in profile_data
            assert "linkedin_url" not in profile_data
            assert "website_url" not in profile_data
            assert "location" not in profile_data
            assert "bio" not in profile_data
            assert "user_id" not in profile_data
            # Should have anonymized fields
            assert "id" in profile_data  # Only profile ID, not user_id
        
        # Cleanup
        db.session.delete(profile)
        db.session.commit()


# ============================================================================
# 2. IDEA LISTING TESTS
# ============================================================================

def test_create_idea_listing_from_validation(authenticated_client, test_user, test_user_validation, app):
    """Test creating an IdeaListing linked to a validation."""
    with app.app_context():
        # Create founder profile first
        profile = FounderProfile(
            user_id=test_user.id,
            is_public=True,
            is_active=True,
        )
        db.session.add(profile)
        db.session.commit()
        
        # Create listing
        response = authenticated_client.post("/api/founder/ideas", json={
            "title": "Test Idea",
            "source_type": "validation",
            "source_id": test_user_validation.id,
            "industry": "SaaS",
            "stage": "idea",
            "brief_description": "A test idea",
            "skills_needed": ["Python", "React"],
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "listing" in data
        assert data["listing"]["title"] == "Test Idea"
        assert data["listing"]["source_type"] == "validation"
        assert data["listing"]["source_id"] == test_user_validation.id
        
        # Verify listing was created
        listing = IdeaListing.query.filter_by(founder_profile_id=profile.id).first()
        assert listing is not None
        assert listing.title == "Test Idea"
        
        # Cleanup
        db.session.delete(listing)
        db.session.delete(profile)
        db.session.commit()


def test_create_idea_listing_from_advisor(authenticated_client, test_user, test_user_run, app):
    """Test creating an IdeaListing linked to an advisor run."""
    with app.app_context():
        # Create founder profile first
        profile = FounderProfile(
            user_id=test_user.id,
            is_public=True,
            is_active=True,
        )
        db.session.add(profile)
        db.session.commit()
        
        # Create listing
        response = authenticated_client.post("/api/founder/ideas", json={
            "title": "Test Idea from Advisor",
            "source_type": "advisor",
            "source_id": test_user_run.id,
            "industry": "AI",
            "stage": "mvp",
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["listing"]["source_type"] == "advisor"
        assert data["listing"]["source_id"] == test_user_run.id
        
        # Cleanup
        listing = IdeaListing.query.filter_by(founder_profile_id=profile.id).first()
        if listing:
            db.session.delete(listing)
        db.session.delete(profile)
        db.session.commit()


def test_create_listing_other_user_source_rejected(authenticated_client_2, test_user, test_user_2, test_user_validation, app):
    """Test that creating a listing using another user's source is rejected."""
    with app.app_context():
        # Create founder profile for test_user_2 (not test_user)
        profile = FounderProfile(
            user_id=test_user_2.id,
            is_public=True,
            is_active=True,
        )
        db.session.add(profile)
        db.session.commit()
        
        # Try to create listing with test_user's validation (should fail)
        # authenticated_client_2 is for test_user_2, but validation belongs to test_user
        response = authenticated_client_2.post("/api/founder/ideas", json={
            "title": "Test Idea",
            "source_type": "validation",
            "source_id": test_user_validation.id,  # Belongs to test_user, not test_user_2
        })
        
        assert response.status_code == 404  # Not found or access denied
        data = response.get_json()
        assert "not found" in data.get("error", "").lower() or "access denied" in data.get("error", "").lower()
        
        # Cleanup
        db.session.delete(profile)
        db.session.commit()


def test_get_my_idea_listings(authenticated_client, test_user, app):
    """Test that /api/founder/ideas returns only current user's listings."""
    with app.app_context():
        # Create profile
        profile = FounderProfile(
            user_id=test_user.id,
            is_public=True,
            is_active=True,
        )
        db.session.add(profile)
        db.session.commit()
        
        # Create a validation for listing
        validation = UserValidation(
            user_id=test_user.id,
            validation_id=f"val_{uuid.uuid4().hex[:12]}",
            status="completed",
            is_deleted=False,
        )
        db.session.add(validation)
        db.session.commit()
        
        # Create listing
        listing = IdeaListing(
            founder_profile_id=profile.id,
            source_type="validation",
            source_id=validation.id,
            title="My Listing",
            is_active=True,
            is_open_for_collaborators=True,
        )
        db.session.add(listing)
        db.session.commit()
        
        # Get listings
        response = authenticated_client.get("/api/founder/ideas")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "listings" in data
        assert len(data["listings"]) == 1
        assert data["listings"][0]["title"] == "My Listing"
        
        # Cleanup
        db.session.delete(listing)
        db.session.delete(validation)
        db.session.delete(profile)
        db.session.commit()


def test_browse_ideas_no_identity(authenticated_client, test_user, test_user_2, app):
    """Test that /api/founder/ideas/browse does not return owner identity."""
    with app.app_context():
        # Create profile for user 2
        profile2 = FounderProfile(
            user_id=test_user_2.id,
            full_name="Hidden Owner",
            is_public=True,
            is_active=True,
        )
        db.session.add(profile2)
        db.session.commit()
        
        # Create validation for user 2
        validation = UserValidation(
            user_id=test_user_2.id,
            validation_id=f"val_{uuid.uuid4().hex[:12]}",
            status="completed",
            is_deleted=False,
        )
        db.session.add(validation)
        db.session.commit()
        
        # Create listing for user 2
        listing = IdeaListing(
            founder_profile_id=profile2.id,
            source_type="validation",
            source_id=validation.id,
            title="Public Listing",
            is_active=True,
            is_open_for_collaborators=True,
        )
        db.session.add(listing)
        db.session.commit()
        
        # Browse ideas (as test_user)
        response = authenticated_client.get("/api/founder/ideas/browse")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "listings" in data
        assert len(data["listings"]) > 0
        
        # Check that identity fields are NOT present
        for listing_data in data["listings"]:
            assert "founder_profile_id" not in listing_data
            assert "source_type" not in listing_data  # Could identify user
            assert "source_id" not in listing_data  # Could identify user
            # Should have anonymized founder info if present
            if "founder" in listing_data:
                founder_info = listing_data["founder"]
                assert "full_name" not in founder_info
                assert "email" not in founder_info
                assert "user_id" not in founder_info
        
        # Cleanup
        db.session.delete(listing)
        db.session.delete(validation)
        db.session.delete(profile2)
        db.session.commit()


def test_browse_ideas_excludes_inactive(authenticated_client, test_user, test_user_2, app):
    """Test that /api/founder/ideas/browse excludes inactive/deleted listings."""
    with app.app_context():
        # Create profile for user 2
        profile2 = FounderProfile(
            user_id=test_user_2.id,
            is_public=True,
            is_active=True,
        )
        db.session.add(profile2)
        db.session.commit()
        
        # Create validation
        validation = UserValidation(
            user_id=test_user_2.id,
            validation_id=f"val_{uuid.uuid4().hex[:12]}",
            status="completed",
            is_deleted=False,
        )
        db.session.add(validation)
        db.session.commit()
        
        # Create active listing
        active_listing = IdeaListing(
            founder_profile_id=profile2.id,
            source_type="validation",
            source_id=validation.id,
            title="Active Listing",
            is_active=True,
            is_open_for_collaborators=True,
        )
        db.session.add(active_listing)
        
        # Create inactive listing
        inactive_listing = IdeaListing(
            founder_profile_id=profile2.id,
            source_type="validation",
            source_id=validation.id,
            title="Inactive Listing",
            is_active=False,
            is_open_for_collaborators=True,
        )
        db.session.add(inactive_listing)
        db.session.commit()
        
        # Browse ideas
        response = authenticated_client.get("/api/founder/ideas/browse")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "listings" in data
        
        # Should only see active listing
        listing_titles = [l["title"] for l in data["listings"]]
        assert "Active Listing" in listing_titles
        assert "Inactive Listing" not in listing_titles
        
        # Cleanup
        db.session.delete(active_listing)
        db.session.delete(inactive_listing)
        db.session.delete(validation)
        db.session.delete(profile2)
        db.session.commit()


# ============================================================================
# 3. CONNECTION REQUEST TESTS
# ============================================================================

def test_send_connection_request(authenticated_client, test_user, authenticated_client_2, test_user_2, app):
    """Test sending a connection request."""
    with app.app_context():
        # Clean up any existing profiles first (from previous tests)
        FounderProfile.query.filter_by(user_id=test_user.id).delete()
        FounderProfile.query.filter_by(user_id=test_user_2.id).delete()
        db.session.commit()
        
        # Verify users are different
        assert test_user.id != test_user_2.id, f"Users must be different: test_user.id={test_user.id}, test_user_2.id={test_user_2.id}"
        
        # Verify no profiles exist yet
        assert FounderProfile.query.filter_by(user_id=test_user.id).first() is None
        assert FounderProfile.query.filter_by(user_id=test_user_2.id).first() is None
        
        # Create recipient profile for test_user_2 - explicitly set user_id
        profile2 = FounderProfile(
            user_id=test_user_2.id,  # Explicitly set to test_user_2
            is_public=True,
            is_active=True,
        )
        db.session.add(profile2)
        db.session.flush()  # Flush to get ID without committing
        profile2_id = profile2.id
        db.session.commit()
        
        # Verify profile2 was created correctly with correct user_id
        profile2_check = FounderProfile.query.get(profile2_id)
        assert profile2_check is not None
        assert profile2_check.user_id == test_user_2.id, f"Profile2 user_id should be {test_user_2.id}, got {profile2_check.user_id}"
        
        # Verify no profile exists for test_user yet
        test_user_profile = FounderProfile.query.filter_by(user_id=test_user.id).first()
        assert test_user_profile is None, f"test_user should not have a profile yet, but found profile id={test_user_profile.id if test_user_profile else None}"
        
        # Set reset date to prevent auto-reset and ensure subscription type
        from datetime import date, timedelta
        user_obj = User.query.get(test_user.id)
        if not user_obj.subscription_type:
            user_obj.subscription_type = "free"
        user_obj.usage_reset_date = (date.today() + timedelta(days=1))
        user_obj.monthly_connections_used = 0  # Start fresh
        initial_usage = user_obj.monthly_connections_used
        db.session.commit()
        
        # Verify profile2 exists and is for test_user_2
        profile2_refreshed = FounderProfile.query.get(profile2.id)
        assert profile2_refreshed is not None
        assert profile2_refreshed.user_id == test_user_2.id
        
        # Verify test_user and test_user_2 are different
        assert test_user.id != test_user_2.id, f"test_user.id ({test_user.id}) should not equal test_user_2.id ({test_user_2.id})"
        
        # Check if sender profile already exists (shouldn't, but if it does, it must be different from profile2)
        existing_sender_profile = FounderProfile.query.filter_by(user_id=test_user.id).first()
        if existing_sender_profile:
            assert existing_sender_profile.id != profile2.id, f"Existing sender profile (id={existing_sender_profile.id}) should not equal recipient profile (id={profile2.id})"
        
        # Verify which user the authenticated_client is using
        # Check the session token
        from app.models.database import UserSession
        auth_header = authenticated_client.environ_base.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '').strip()
            session = UserSession.query.filter_by(session_token=token).first()
            if session:
                assert session.user_id == test_user.id, f"authenticated_client should use test_user (id={test_user.id}), but session has user_id={session.user_id}"
        else:
            # If no auth header, that's also a problem
            assert False, f"authenticated_client has no authorization header"
        
        # Double-check: ensure profile2_id is definitely for test_user_2
        final_check = FounderProfile.query.get(profile2_id)
        assert final_check.user_id == test_user_2.id, f"Final check failed: profile {profile2_id} has user_id={final_check.user_id}, expected {test_user_2.id}"
        
        # Send connection request (endpoint will create sender profile if needed)
        # The endpoint should:
        # 1. Get/create sender profile for test_user (from authenticated_client session)
        # 2. Get recipient profile by profile2_id (which is for test_user_2)
        # 3. Check if sender_profile.id != recipient_profile_id
        response = authenticated_client.post("/api/founder/connect", json={
            "recipient_profile_id": profile2_id,  # Use the flushed ID
            "message": "Let's connect!",
        })
        
        if response.status_code != 200:
            resp_data = response.get_json()
            # Debug: check what profiles exist after the request
            all_profiles = FounderProfile.query.all()
            print(f"\n=== DEBUG INFO ===")
            print(f"All profiles after request: {[(p.id, p.user_id) for p in all_profiles]}")
            sender_profile_after = FounderProfile.query.filter_by(user_id=test_user.id).first()
            if sender_profile_after:
                print(f"Sender profile (test_user): id={sender_profile_after.id}, user_id={sender_profile_after.user_id}")
            recipient_profile_after = FounderProfile.query.get(profile2_id)
            if recipient_profile_after:
                print(f"Recipient profile (test_user_2): id={recipient_profile_after.id}, user_id={recipient_profile_after.user_id}")
            print(f"test_user.id={test_user.id}, test_user_2.id={test_user_2.id}")
            print(f"Requested recipient_profile_id={profile2_id}")
            print(f"Response: {resp_data}")
            print(f"==================\n")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.get_json()}"
        data = response.get_json()
        assert data["success"] is True
        assert "connection_request" in data
        assert data["connection_request"]["status"] == "pending"
        assert data["connection_request"]["message"] == "Let's connect!"
        
        # Verify usage incremented - re-query to get fresh instance
        user_refreshed = User.query.get(test_user.id)
        assert user_refreshed.monthly_connections_used == initial_usage + 1
        
        # Get sender profile (created by endpoint)
        sender_profile = FounderProfile.query.filter_by(user_id=user_refreshed.id).first()
        assert sender_profile is not None
        
        # Verify request was created
        request = ConnectionRequest.query.filter_by(
            sender_id=sender_profile.id,
            recipient_id=profile2.id
        ).first()
        assert request is not None
        assert request.status == "pending"
        
        # Cleanup - delete ledger entries first
        ConnectionCreditLedger.query.filter_by(connection_request_id=request.id).delete()
        db.session.delete(request)
        db.session.delete(sender_profile)
        db.session.delete(profile2)
        db.session.commit()


def test_send_connection_request_self_rejected(authenticated_client, test_user, app):
    """Test that self-connection is rejected."""
    with app.app_context():
        # Create profile
        profile = FounderProfile(
            user_id=test_user.id,
            is_public=True,
            is_active=True,
        )
        db.session.add(profile)
        db.session.commit()
        
        # Try to send request to self
        response = authenticated_client.post("/api/founder/connect", json={
            "recipient_profile_id": profile.id,
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert "yourself" in data.get("error", "").lower()
        
        # Cleanup
        db.session.delete(profile)
        db.session.commit()


def test_send_duplicate_connection_request_rejected(authenticated_client, test_user, authenticated_client_2, test_user_2, app):
    """Test that duplicate pending requests are rejected."""
    with app.app_context():
        # Create recipient profile (sender profile will be created by endpoint)
        profile2 = FounderProfile(
            user_id=test_user_2.id,
            is_public=True,
            is_active=True,
        )
        db.session.add(profile2)
        db.session.commit()
        
        # Set reset date
        from datetime import date, timedelta
        test_user.usage_reset_date = (date.today() + timedelta(days=1))
        db.session.commit()
        
        # Send first request
        response1 = authenticated_client.post("/api/founder/connect", json={
            "recipient_profile_id": profile2.id,
        })
        assert response1.status_code == 200
        
        # Try to send duplicate
        response2 = authenticated_client.post("/api/founder/connect", json={
            "recipient_profile_id": profile2.id,
        })
        assert response2.status_code == 400
        data = response2.get_json()
        assert "already exists" in data.get("error", "").lower() or "pending" in data.get("error", "").lower()
        
        # Cleanup
        sender_profile = FounderProfile.query.filter_by(user_id=test_user.id).first()
        if sender_profile:
            request = ConnectionRequest.query.filter_by(
                sender_id=sender_profile.id,
                recipient_id=profile2.id
            ).first()
            if request:
                ConnectionCreditLedger.query.filter_by(connection_request_id=request.id).delete()
                db.session.delete(request)
            db.session.delete(sender_profile)
        db.session.delete(profile2)
        db.session.commit()


def test_connection_credit_limit_free(authenticated_client, test_user, authenticated_client_2, test_user_2, app):
    """Test that free users are limited to 3 connection requests."""
    with app.app_context():
        # Ensure user is free tier and set reset date
        user_obj = User.query.get(test_user.id)
        user_obj.subscription_type = "free"
        user_obj.monthly_connections_used = 0
        from datetime import date, timedelta
        user_obj.usage_reset_date = (date.today() + timedelta(days=1))
        db.session.commit()
        
        # Send 3 requests (should succeed)
        for i in range(3):
            # Create a new user for each request to avoid duplicate issues
            unique_email = f"test_limit_{uuid.uuid4().hex[:8]}@example.com"
            limit_user = User(
                email=unique_email,
                subscription_type="free",
                payment_status="active",
            )
            limit_user.set_password("test")
            db.session.add(limit_user)
            db.session.commit()
            
            limit_profile = FounderProfile(
                user_id=limit_user.id,
                is_public=True,
                is_active=True,
            )
            db.session.add(limit_profile)
            db.session.commit()
            
            response = authenticated_client.post("/api/founder/connect", json={
                "recipient_profile_id": limit_profile.id,
            })
            assert response.status_code == 200, f"Request {i+1} should succeed"
            
            # Cleanup this request - get sender profile first
            sender_profile = FounderProfile.query.filter_by(user_id=test_user.id).first()
            if sender_profile:
                request = ConnectionRequest.query.filter_by(
                    sender_id=sender_profile.id,
                    recipient_id=limit_profile.id
                ).first()
                if request:
                    ConnectionCreditLedger.query.filter_by(connection_request_id=request.id).delete()
                    db.session.delete(request)
            db.session.delete(limit_profile)
            db.session.delete(limit_user)
            db.session.commit()
        
        # Get updated usage - re-query to get fresh instance
        user_refreshed = User.query.get(test_user.id)
        assert user_refreshed.monthly_connections_used == 3
        
        # 4th request should be blocked
        unique_email = f"test_limit_4_{uuid.uuid4().hex[:8]}@example.com"
        limit_user = User(
            email=unique_email,
            subscription_type="free",
            payment_status="active",
        )
        limit_user.set_password("test")
        db.session.add(limit_user)
        db.session.commit()
        
        limit_profile = FounderProfile(
            user_id=limit_user.id,
            is_public=True,
            is_active=True,
        )
        db.session.add(limit_profile)
        db.session.commit()
        
        response = authenticated_client.post("/api/founder/connect", json={
            "recipient_profile_id": limit_profile.id,
        })
        assert response.status_code == 403
        data = response.get_json()
        assert "3 free" in data.get("error", "") or "limit" in data.get("error", "").lower()
        
        # Cleanup
        db.session.delete(limit_profile)
        db.session.delete(limit_user)
        sender_profile = FounderProfile.query.filter_by(user_id=test_user.id).first()
        if sender_profile:
            db.session.delete(sender_profile)
        db.session.commit()


def test_connection_credit_limit_starter(authenticated_starter_client, starter_user, authenticated_client_2, test_user_2, app):
    """Test that starter users can send up to 15 requests."""
    with app.app_context():
        # Create recipient profile
        profile2 = FounderProfile(
            user_id=test_user_2.id,
            is_public=True,
            is_active=True,
        )
        db.session.add(profile2)
        db.session.commit()
        
        # Set usage to 14 (one below limit) and reset date
        from datetime import date, timedelta
        starter_user_obj = User.query.get(starter_user.id)
        starter_user_obj.monthly_connections_used = 14
        starter_user_obj.usage_reset_date = (date.today() + timedelta(days=1))
        db.session.commit()
        
        # 15th request should succeed
        response = authenticated_starter_client.post("/api/founder/connect", json={
            "recipient_profile_id": profile2.id,
        })
        assert response.status_code == 200
        
        # Set usage to 15 (at limit)
        starter_user_obj = User.query.get(starter_user.id)
        starter_user_obj.monthly_connections_used = 15
        db.session.commit()
        
        # 16th request should be blocked
        unique_email = f"test_starter_limit_{uuid.uuid4().hex[:8]}@example.com"
        limit_user = User(
            email=unique_email,
            subscription_type="free",
            payment_status="active",
        )
        limit_user.set_password("test")
        db.session.add(limit_user)
        db.session.commit()
        
        limit_profile = FounderProfile(
            user_id=limit_user.id,
            is_public=True,
            is_active=True,
        )
        db.session.add(limit_profile)
        db.session.commit()
        
        response = authenticated_starter_client.post("/api/founder/connect", json={
            "recipient_profile_id": limit_profile.id,
        })
        assert response.status_code == 403
        data = response.get_json()
        assert "15" in data.get("error", "") or "limit" in data.get("error", "").lower()
        
        # Cleanup
        sender_profile = FounderProfile.query.filter_by(user_id=starter_user.id).first()
        if sender_profile:
            request = ConnectionRequest.query.filter_by(
                sender_id=sender_profile.id,
                recipient_id=profile2.id
            ).first()
            if request:
                ConnectionCreditLedger.query.filter_by(connection_request_id=request.id).delete()
                db.session.delete(request)
            db.session.delete(sender_profile)
        db.session.delete(limit_profile)
        db.session.delete(limit_user)
        db.session.delete(profile2)
        db.session.commit()


def test_connection_credit_limit_pro_unlimited(client, app, paid_user, authenticated_client_2, test_user_2):
    """Test that pro users are not blocked by limits."""
    with app.app_context():
        # Create session for paid user
        import secrets
        from datetime import timedelta
        session_token = f"pro_{uuid.uuid4().hex}_{secrets.token_urlsafe(16)}"
        expires_at = datetime.utcnow() + timedelta(days=7)
        session = UserSession(
            user_id=paid_user.id,
            session_token=session_token,
            ip_address="127.0.0.1",
            expires_at=expires_at,
        )
        db.session.add(session)
        db.session.commit()
        
        # Create authenticated client for paid user (use app.test_client() to avoid conflicts)
        pro_client = app.test_client()
        pro_client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {session_token}'
        
        # Set high usage (should still work) and reset date
        paid_user_obj = User.query.get(paid_user.id)
        paid_user_obj.subscription_type = "pro"
        paid_user_obj.monthly_connections_used = 100
        from datetime import date, timedelta
        paid_user_obj.usage_reset_date = (date.today() + timedelta(days=1))
        db.session.commit()
        
        # Create recipient profile (sender profile will be created by endpoint)
        profile2 = FounderProfile(
            user_id=test_user_2.id,
            is_public=True,
            is_active=True,
        )
        db.session.add(profile2)
        db.session.commit()
        
        # Request should succeed despite high usage
        response = pro_client.post("/api/founder/connect", json={
            "recipient_profile_id": profile2.id,
        })
        assert response.status_code == 200
        
        # Cleanup
        sender_profile = FounderProfile.query.filter_by(user_id=paid_user.id).first()
        if sender_profile:
            request = ConnectionRequest.query.filter_by(
                sender_id=sender_profile.id,
                recipient_id=profile2.id
            ).first()
            if request:
                ConnectionCreditLedger.query.filter_by(connection_request_id=request.id).delete()
                db.session.delete(request)
            db.session.delete(sender_profile)
        db.session.delete(session)
        db.session.delete(profile2)
        db.session.commit()


def test_accept_connection_request(authenticated_client, test_user, authenticated_client_2, test_user_2, app):
    """Test accepting a connection request."""
    with app.app_context():
        # Create profiles
        profile1 = FounderProfile(
            user_id=test_user.id,
            full_name="Sender Name",
            is_public=True,
            is_active=True,
        )
        profile2 = FounderProfile(
            user_id=test_user_2.id,
            full_name="Recipient Name",
            is_public=True,
            is_active=True,
        )
        db.session.add(profile1)
        db.session.add(profile2)
        db.session.commit()
        
        # Create connection request
        request = ConnectionRequest(
            sender_id=profile1.id,
            recipient_id=profile2.id,
            status="pending",
            message="Let's connect",
        )
        db.session.add(request)
        db.session.commit()
        
        # Accept request (as recipient)
        response = authenticated_client_2.put(f"/api/founder/connections/{request.id}/respond", json={
            "action": "accept",
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["connection_request"]["status"] == "accepted"
        assert data["connection_request"]["responded_at"] is not None
        
        # Verify in database
        db.session.refresh(request)
        assert request.status == "accepted"
        assert request.responded_at is not None
        
        # Cleanup
        db.session.delete(request)
        db.session.delete(profile1)
        db.session.delete(profile2)
        db.session.commit()


def test_decline_connection_request(authenticated_client, test_user, authenticated_client_2, test_user_2, app):
    """Test declining a connection request."""
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
        db.session.add(profile1)
        db.session.add(profile2)
        db.session.commit()
        
        # Create connection request
        request = ConnectionRequest(
            sender_id=profile1.id,
            recipient_id=profile2.id,
            status="pending",
        )
        db.session.add(request)
        db.session.commit()
        
        # Decline request
        response = authenticated_client_2.put(f"/api/founder/connections/{request.id}/respond", json={
            "action": "decline",
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["connection_request"]["status"] == "declined"
        assert data["connection_request"]["responded_at"] is not None
        
        # Verify in database
        db.session.refresh(request)
        assert request.status == "declined"
        assert request.responded_at is not None
        
        # Cleanup
        db.session.delete(request)
        db.session.delete(profile1)
        db.session.delete(profile2)
        db.session.commit()


def test_only_recipient_can_respond(authenticated_client, test_user, authenticated_client_2, test_user_2, app):
    """Test that only recipient can accept/decline."""
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
        db.session.add(profile1)
        db.session.add(profile2)
        db.session.commit()
        
        # Create connection request
        request = ConnectionRequest(
            sender_id=profile1.id,
            recipient_id=profile2.id,
            status="pending",
        )
        db.session.add(request)
        db.session.commit()
        
        # Sender tries to accept (should fail - endpoint checks recipient_id=profile.id)
        # The sender's profile is profile1, but request has recipient_id=profile2.id
        # So the endpoint won't find it and should return 404
        response = authenticated_client.put(f"/api/founder/connections/{request.id}/respond", json={
            "action": "accept",
        })
        assert response.status_code == 404, "Sender should not be able to respond to their own sent request"
        
        # Cleanup
        db.session.delete(request)
        db.session.delete(profile1)
        db.session.delete(profile2)
        db.session.commit()


def test_identity_reveal_after_acceptance(authenticated_client, test_user, authenticated_client_2, test_user_2, app):
    """Test that identity is revealed after acceptance."""
    with app.app_context():
        # Create profiles with identity
        profile1 = FounderProfile(
            user_id=test_user.id,
            full_name="Sender Name",
            linkedin_url="https://linkedin.com/sender",
            is_public=True,
            is_active=True,
        )
        profile2 = FounderProfile(
            user_id=test_user_2.id,
            full_name="Recipient Name",
            linkedin_url="https://linkedin.com/recipient",
            is_public=True,
            is_active=True,
        )
        db.session.add(profile1)
        db.session.add(profile2)
        db.session.commit()
        
        # Create and accept connection request
        request = ConnectionRequest(
            sender_id=profile1.id,
            recipient_id=profile2.id,
            status="pending",
        )
        db.session.add(request)
        db.session.commit()
        
        # Accept as recipient
        authenticated_client_2.put(f"/api/founder/connections/{request.id}/respond", json={
            "action": "accept",
        })
        
        # Get detail as sender - should see recipient identity
        response = authenticated_client.get(f"/api/founder/connections/{request.id}/detail")
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "connection_request" in data
        assert "recipient" in data["connection_request"]
        assert data["connection_request"]["recipient"]["full_name"] == "Recipient Name"
        assert data["connection_request"]["recipient"]["email"] == test_user_2.email
        
        # Get detail as recipient - should see sender identity
        response = authenticated_client_2.get(f"/api/founder/connections/{request.id}/detail")
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "sender" in data["connection_request"]
        assert data["connection_request"]["sender"]["full_name"] == "Sender Name"
        assert data["connection_request"]["sender"]["email"] == test_user.email
        
        # Cleanup
        db.session.delete(request)
        db.session.delete(profile1)
        db.session.delete(profile2)
        db.session.commit()


def test_identity_not_revealed_before_acceptance(authenticated_client, test_user, authenticated_client_2, test_user_2, app):
    """Test that identity is NOT revealed before acceptance."""
    with app.app_context():
        # Create profiles with identity
        profile1 = FounderProfile(
            user_id=test_user.id,
            full_name="Sender Name",
            is_public=True,
            is_active=True,
        )
        profile2 = FounderProfile(
            user_id=test_user_2.id,
            full_name="Recipient Name",
            is_public=True,
            is_active=True,
        )
        db.session.add(profile1)
        db.session.add(profile2)
        db.session.commit()
        
        # Create pending connection request
        request = ConnectionRequest(
            sender_id=profile1.id,
            recipient_id=profile2.id,
            status="pending",
        )
        db.session.add(request)
        db.session.commit()
        
        # Get detail as sender - should NOT see recipient identity
        response = authenticated_client.get(f"/api/founder/connections/{request.id}/detail")
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        if "recipient" in data["connection_request"]:
            recipient = data["connection_request"]["recipient"]
            assert "full_name" not in recipient or recipient.get("full_name") is None
            assert "email" not in recipient or recipient.get("email") is None
        
        # Cleanup
        db.session.delete(request)
        db.session.delete(profile1)
        db.session.delete(profile2)
        db.session.commit()


def test_third_user_cannot_access_connection_detail(client, test_user, authenticated_client_2, test_user_2, app):
    """Test that a third user cannot access connection details."""
    with app.app_context():
        # Create third user
        unique_email = f"third_{uuid.uuid4().hex[:8]}@example.com"
        third_user = User(
            email=unique_email,
            subscription_type="free",
            payment_status="active",
        )
        third_user.set_password("test")
        db.session.add(third_user)
        db.session.commit()
        
        import secrets
        third_session_token = f"third_{uuid.uuid4().hex}_{secrets.token_urlsafe(16)}"
        third_session = UserSession(
            user_id=third_user.id,
            session_token=third_session_token,
            ip_address="127.0.0.1",
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        db.session.add(third_session)
        db.session.commit()
        
        # Use the client fixture and set auth header
        third_client = client
        third_client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {third_session_token}'
        
        # Create profiles and connection request
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
        db.session.add(profile1)
        db.session.add(profile2)
        db.session.commit()
        
        request = ConnectionRequest(
            sender_id=profile1.id,
            recipient_id=profile2.id,
            status="accepted",
        )
        db.session.add(request)
        db.session.commit()
        
        # Third user tries to access - should fail
        response = third_client.get(f"/api/founder/connections/{request.id}/detail")
        assert response.status_code == 404  # Not found (not involved)
        
        # Cleanup
        db.session.delete(request)
        db.session.delete(third_session)
        db.session.delete(third_user)
        db.session.delete(profile1)
        db.session.delete(profile2)
        db.session.commit()


# ============================================================================
# 4. USAGE TESTS
# ============================================================================

def test_usage_includes_connections(authenticated_client, test_user, app):
    """Test that /api/user/usage includes connections block."""
    with app.app_context():
        # Set some usage and ensure reset date is in the future
        user_obj = User.query.get(test_user.id)
        user_obj.monthly_connections_used = 2
        from datetime import date, timedelta
        user_obj.usage_reset_date = (date.today() + timedelta(days=1))
        db.session.commit()
        
        response = authenticated_client.get("/api/user/usage")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "usage" in data
        assert "connections" in data["usage"]
        
        connections = data["usage"]["connections"]
        assert "used" in connections
        assert "limit" in connections
        assert "remaining" in connections
        assert connections["used"] == 2
        assert connections["limit"] == 3  # Free tier
        assert connections["remaining"] == 1


def test_usage_updates_on_send_request(authenticated_client, test_user, authenticated_client_2, test_user_2, app):
    """Test that usage updates when sending requests."""
    with app.app_context():
        # Reset usage and ensure reset date is in the future
        user_obj = User.query.get(test_user.id)
        user_obj.monthly_connections_used = 0
        from datetime import date, timedelta
        user_obj.usage_reset_date = (date.today() + timedelta(days=1))
        db.session.commit()
        
        # Create recipient profile (sender profile will be created by endpoint)
        profile2 = FounderProfile(
            user_id=test_user_2.id,
            is_public=True,
            is_active=True,
        )
        db.session.add(profile2)
        db.session.commit()
        
        # Check initial usage
        response = authenticated_client.get("/api/user/usage")
        initial_usage = response.get_json()["usage"]["connections"]["used"]
        
        # Send request
        authenticated_client.post("/api/founder/connect", json={
            "recipient_profile_id": profile2.id,
        })
        
        # Check updated usage
        response = authenticated_client.get("/api/user/usage")
        updated_usage = response.get_json()["usage"]["connections"]["used"]
        assert updated_usage == initial_usage + 1
        
        # Cleanup - get sender profile created by endpoint
        sender_profile = FounderProfile.query.filter_by(user_id=test_user.id).first()
        if sender_profile:
            request = ConnectionRequest.query.filter_by(
                sender_id=sender_profile.id,
                recipient_id=profile2.id
            ).first()
            if request:
                ConnectionCreditLedger.query.filter_by(connection_request_id=request.id).delete()
                db.session.delete(request)
            db.session.delete(sender_profile)
        db.session.delete(profile2)
        db.session.commit()


# ============================================================================
# 5. SECURITY & OWNERSHIP TESTS
# ============================================================================

def test_unauthenticated_founder_endpoints_rejected(client):
    """Test that unauthenticated calls to /api/founder/* endpoints fail."""
    endpoints = [
        ("GET", "/api/founder/profile"),
        ("POST", "/api/founder/profile"),
        ("GET", "/api/founder/ideas"),
        ("POST", "/api/founder/ideas"),
        ("GET", "/api/founder/ideas/browse"),
        ("GET", "/api/founder/people/browse"),
        ("POST", "/api/founder/connect"),
        ("GET", "/api/founder/connections"),
    ]
    
    for method, endpoint in endpoints:
        if method == "GET":
            response = client.get(endpoint)
        elif method == "POST":
            response = client.post(endpoint, json={})
        else:
            response = client.put(endpoint, json={})
        
        assert response.status_code == 401, f"{method} {endpoint} should require auth"


def test_cannot_access_other_user_profile(authenticated_client, test_user, test_user_2, app):
    """Test that users cannot read another user's profile."""
    with app.app_context():
        # Create profile for user 2
        profile = FounderProfile(
            user_id=test_user_2.id,
            full_name="Other User",
            is_public=True,
            is_active=True,
        )
        db.session.add(profile)
        db.session.commit()
        
        # Try to get profile (as test_user, not test_user_2)
        # The endpoint only returns current user's profile, so this should return 404
        response = authenticated_client.get("/api/founder/profile")
        # If test_user has no profile, should be 404
        # If test_user has a profile, should return their own, not user_2's
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.get_json()
            # Should not be user_2's profile
            assert data["profile"]["user_id"] != test_user_2.id
        
        # Cleanup
        db.session.delete(profile)
        db.session.commit()


def test_cannot_create_listing_other_user_source(authenticated_client, test_user, test_user_2, app):
    """Test that users cannot create listings for other users' sources."""
    with app.app_context():
        # Create validation for user 2
        validation = UserValidation(
            user_id=test_user_2.id,
            validation_id=f"val_{uuid.uuid4().hex[:12]}",
            status="completed",
            is_deleted=False,
        )
        db.session.add(validation)
        db.session.commit()
        
        # Create profile for test_user
        profile = FounderProfile(
            user_id=test_user.id,  # Note: test_user from fixture, not test_user_2
            is_public=True,
            is_active=True,
        )
        db.session.add(profile)
        db.session.commit()
        
        # Try to create listing with user_2's validation (should fail)
        response = authenticated_client.post("/api/founder/ideas", json={
            "title": "Test",
            "source_type": "validation",
            "source_id": validation.id,
        })
        
        assert response.status_code == 404  # Not found or access denied
        
        # Cleanup
        db.session.delete(profile)
        db.session.delete(validation)
        db.session.commit()


def test_cannot_access_other_user_connection_requests(authenticated_client, test_user, authenticated_client_2, test_user_2, app):
    """Test that users cannot access other users' connection requests."""
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
        db.session.add(profile1)
        db.session.add(profile2)
        db.session.commit()
        
        # Create connection request from test_user to test_user_2
        request = ConnectionRequest(
            sender_id=profile1.id,
            recipient_id=profile2.id,
            status="pending",
        )
        db.session.add(request)
        db.session.commit()
        
        # test_user should see this in their connections (as sender)
        response = authenticated_client.get("/api/founder/connections")
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        # Should see the request they sent
        assert len(data.get("sent", [])) > 0
        assert data["sent"][0]["id"] == request.id
        
        # test_user_2 should see this in their received
        response = authenticated_client_2.get("/api/founder/connections")
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        # Should see the request they received
        assert len(data.get("received", [])) > 0
        assert data["received"][0]["id"] == request.id
        
        # Cleanup
        db.session.delete(request)
        db.session.delete(profile1)
        db.session.delete(profile2)
        db.session.commit()

