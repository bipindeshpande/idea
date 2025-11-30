"""
Tests for user routes.
"""
import pytest
from app.models.database import UserRun, UserValidation, UserAction, UserNote, db


def test_get_user_usage(authenticated_client, test_user):
    """Test getting user usage statistics."""
    response = authenticated_client.get("/api/user/usage")
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "usage" in data


def test_get_user_dashboard(authenticated_client, test_user):
    """Test getting user dashboard."""
    response = authenticated_client.get("/api/user/dashboard")
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "activity" in data
    assert "actions" in data
    assert "notes" in data


def test_get_user_dashboard_unauthenticated(client):
    """Test getting dashboard without authentication."""
    response = client.get("/api/user/dashboard")
    
    assert response.status_code == 401


def test_create_user_action(authenticated_client, test_user, app):
    """Test creating a user action."""
    with app.app_context():
        from app.models.database import db
        response = authenticated_client.post("/api/user/actions", json={
            "action_text": "Test action",
            "idea_id": "test-idea-123",
            "status": "pending"
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "action" in data
        assert data["action"]["action_text"] == "Test action"
        
        # Cleanup - delete the action
        from app.models.database import UserAction
        action = UserAction.query.filter_by(idea_id="test-idea-123", user_id=test_user.id).first()
        if action:
            db.session.delete(action)
            db.session.commit()


def test_get_user_actions(authenticated_client, test_user, app):
    """Test getting user actions."""
    with app.app_context():
        from app.models.database import db
        import uuid
        # Create an action first with unique idea_id
        unique_idea_id = f"test-idea-{uuid.uuid4().hex[:8]}"
        action = UserAction(
            user_id=test_user.id,
            idea_id=unique_idea_id,
            action_text="Test action",
            status="pending"
        )
        db.session.add(action)
        db.session.commit()
        
        # Get actions
        response = authenticated_client.get("/api/user/actions")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "actions" in data
        assert len(data["actions"]) > 0
        
        # Cleanup
        db.session.delete(action)
        db.session.commit()


def test_create_user_note(authenticated_client, test_user, app):
    """Test creating a user note."""
    with app.app_context():
        from app.models.database import db
        import uuid
        unique_idea_id = f"test-idea-{uuid.uuid4().hex[:8]}"
        response = authenticated_client.post("/api/user/notes", json={
            "content": "Test note content",
            "idea_id": unique_idea_id,
            "tags": ["test", "note"]
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "note" in data
        assert data["note"]["content"] == "Test note content"
        
        # Cleanup
        from app.models.database import UserNote
        note = UserNote.query.filter_by(idea_id=unique_idea_id, user_id=test_user.id).first()
        if note:
            db.session.delete(note)
            db.session.commit()


def test_get_user_notes(authenticated_client, test_user, app):
    """Test getting user notes."""
    with app.app_context():
        from app.models.database import db
        import uuid
        # Create a note first with unique idea_id
        unique_idea_id = f"test-idea-{uuid.uuid4().hex[:8]}"
        note = UserNote(
            user_id=test_user.id,
            idea_id=unique_idea_id,
            content="Test note",
        )
        db.session.add(note)
        db.session.commit()
        
        # Get notes
        response = authenticated_client.get("/api/user/notes")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "notes" in data
        
        # Cleanup
        db.session.delete(note)
        db.session.commit()

