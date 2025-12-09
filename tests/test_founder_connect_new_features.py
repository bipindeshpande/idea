"""Tests for new Founder Connect features: PUT listing, DELETE connection, filters."""
import pytest
import uuid
import secrets
import json
from datetime import date, timedelta, datetime
from app.models.database import (
    db, User, UserSession, UserRun, UserValidation,
    FounderProfile, IdeaListing, ConnectionRequest, ConnectionStatus
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
    client = app.test_client()
    client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {test_user_session_2.session_token}'
    return client


@pytest.fixture
def test_user_validation(app, test_user):
    """Create a test validation for the user."""
    with app.app_context():
        validation = UserValidation(
            user_id=test_user.id,
            validation_id=f"val_{uuid.uuid4().hex[:8]}",
            category_answers=json.dumps({"industry": "SaaS"}),
            validation_result=json.dumps({"overall_score": 8.5}),
            status="completed"
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


def test_update_listing_toggle_active(authenticated_client, test_user):
    """Test updating listing to toggle is_active status."""
    # Create profile and listing
    profile = FounderProfile(user_id=test_user.id, is_public=True, is_active=True)
    db.session.add(profile)
    db.session.commit()
    
    listing = IdeaListing(
        founder_profile_id=profile.id,
        source_type="validation",
        source_id=1,
        title="Test Idea",
        industry="SaaS",
        stage="idea",
        is_active=True
    )
    db.session.add(listing)
    db.session.commit()
    
    listing_id = listing.id
    
    # Toggle to inactive
    response = authenticated_client.put(
        f"/api/founder/ideas/{listing_id}",
        json={"is_active": False}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["listing"]["is_active"] is False
    
    # Toggle back to active
    response = authenticated_client.put(
        f"/api/founder/ideas/{listing_id}",
        json={"is_active": True}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["listing"]["is_active"] is True


def test_update_listing_other_fields(authenticated_client, test_user):
    """Test updating listing title and description."""
    profile = FounderProfile(user_id=test_user.id, is_public=True, is_active=True)
    db.session.add(profile)
    db.session.commit()
    
    listing = IdeaListing(
        founder_profile_id=profile.id,
        source_type="validation",
        source_id=1,
        title="Original Title",
        brief_description="Original description",
        is_active=True
    )
    db.session.add(listing)
    db.session.commit()
    
    # Update title and description
    response = authenticated_client.put(
        f"/api/founder/ideas/{listing.id}",
        json={
            "title": "Updated Title",
            "brief_description": "Updated description"
        }
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["listing"]["title"] == "Updated Title"
    assert data["listing"]["brief_description"] == "Updated description"


def test_delete_connection_request(authenticated_client, authenticated_client_2, test_user, test_user_2):
    """Test withdrawing a pending connection request."""
    # Create profiles
    profile1 = FounderProfile(user_id=test_user.id, is_public=True, is_active=True)
    profile2 = FounderProfile(user_id=test_user_2.id, is_public=True, is_active=True)
    db.session.add_all([profile1, profile2])
    db.session.commit()
    
    # Send connection request
    request_obj = ConnectionRequest(
        sender_id=profile1.id,
        recipient_id=profile2.id,
        status=ConnectionStatus.PENDING
    )
    db.session.add(request_obj)
    db.session.commit()
    request_id = request_obj.id
    
    # Withdraw the request (sender can withdraw)
    response = authenticated_client.delete(f"/api/founder/connections/{request_id}")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    
    # Verify request is deleted
    deleted = ConnectionRequest.query.get(request_id)
    assert deleted is None


def test_delete_connection_request_not_sender(authenticated_client, authenticated_client_2, test_user, test_user_2):
    """Test that recipient cannot delete a connection request."""
    profile1 = FounderProfile(user_id=test_user.id, is_public=True, is_active=True)
    profile2 = FounderProfile(user_id=test_user_2.id, is_public=True, is_active=True)
    db.session.add_all([profile1, profile2])
    db.session.commit()
    
    request_obj = ConnectionRequest(
        sender_id=profile1.id,
        recipient_id=profile2.id,
        status=ConnectionStatus.PENDING
    )
    db.session.add(request_obj)
    db.session.commit()
    
    # Recipient tries to delete (should fail)
    response = authenticated_client_2.delete(f"/api/founder/connections/{request_obj.id}")
    assert response.status_code == 404  # Not found because recipient is not sender


def test_browse_ideas_with_filters(authenticated_client, authenticated_client_2, test_user, test_user_2):
    """Test browsing ideas with filters."""
    profile1 = FounderProfile(user_id=test_user.id, is_public=True, is_active=True)
    profile2 = FounderProfile(user_id=test_user_2.id, is_public=True, is_active=True)
    db.session.add_all([profile1, profile2])
    db.session.commit()
    
    # Create listings with different attributes
    listing1 = IdeaListing(
        founder_profile_id=profile2.id,
        source_type="validation",
        source_id=1,
        title="SaaS Idea",
        industry="SaaS",
        stage="idea",
        commitment_level="full-time",
        is_active=True
    )
    listing2 = IdeaListing(
        founder_profile_id=profile2.id,
        source_type="validation",
        source_id=2,
        title="E-commerce Idea",
        industry="E-commerce",
        stage="mvp",
        commitment_level="part-time",
        is_active=True
    )
    db.session.add_all([listing1, listing2])
    db.session.commit()
    
    # Filter by industry (should match both since we're using ilike)
    response = authenticated_client.get("/api/founder/ideas/browse?industry=SaaS")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    # Should find at least the SaaS listing
    assert len(data["listings"]) >= 1
    assert any(l["industry"] == "SaaS" for l in data["listings"])
    
    # Filter by stage
    response = authenticated_client.get("/api/founder/ideas/browse?stage=mvp")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert len(data["listings"]) == 1
    assert data["listings"][0]["stage"] == "mvp"
    
    # Filter by commitment level
    response = authenticated_client.get("/api/founder/ideas/browse?commitment_level=full-time")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert len(data["listings"]) == 1
    assert data["listings"][0]["commitment_level"] == "full-time"


def test_browse_people_with_filters(authenticated_client, authenticated_client_2, test_user, test_user_2):
    """Test browsing people with filters."""
    profile1 = FounderProfile(
        user_id=test_user.id,
        is_public=True,
        is_active=True,
        primary_skills='["Python", "React"]',
        commitment_level="full-time",
        location="San Francisco, CA"
    )
    profile2 = FounderProfile(
        user_id=test_user_2.id,
        is_public=True,
        is_active=True,
        primary_skills='["JavaScript", "Node.js"]',
        commitment_level="part-time",
        location="New York, NY"
    )
    db.session.add_all([profile1, profile2])
    db.session.commit()
    
    # Filter by commitment level
    response = authenticated_client.get("/api/founder/people/browse?commitment_level=full-time")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    # Should find profile1 (full-time)
    
    # Filter by location
    response = authenticated_client.get("/api/founder/people/browse?location=San Francisco")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    # Should find profile1 (San Francisco)


def test_listing_includes_validation_score(authenticated_client, test_user, test_user_validation):
    """Test that listing includes validation_score when source is a validation."""
    profile = FounderProfile(user_id=test_user.id, is_public=True, is_active=True)
    db.session.add(profile)
    db.session.commit()
    
    # Create listing from validation
    listing = IdeaListing(
        founder_profile_id=profile.id,
        source_type="validation",
        source_id=test_user_validation.id,
        title="Test Idea",
        is_active=True
    )
    db.session.add(listing)
    db.session.commit()
    
    # Get listing
    response = authenticated_client.get("/api/founder/ideas")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert len(data["listings"]) == 1
    # validation_score should be included if available
    assert "validation_score" in data["listings"][0]

