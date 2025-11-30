"""
Tests for authentication routes.
"""
import pytest
from app.models.database import User, UserSession
from datetime import datetime, timedelta


def test_register_user(client, app):
    """Test user registration."""
    with app.app_context():
        response = client.post("/api/auth/register", json={
            "email": "newuser@example.com",
            "password": "testpassword123"
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert "user" in data
        assert "session_token" in data
        assert data["user"]["email"] == "newuser@example.com"
        
        # Verify user was created
        user = User.query.filter_by(email="newuser@example.com").first()
        assert user is not None
        assert user.check_password("testpassword123")


def test_register_duplicate_email(client, app, test_user):
    """Test registration with duplicate email."""
    with app.app_context():
        response = client.post("/api/auth/register", json={
            "email": test_user.email,
            "password": "testpassword123"
        })
        
        assert response.status_code == 400
        data = response.get_json()
        assert "already registered" in data.get("error", "").lower()


def test_register_short_password(client, app):
    """Test registration with short password."""
    response = client.post("/api/auth/register", json={
        "email": "user@example.com",
        "password": "short"
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert "password" in data.get("error", "").lower()


def test_login_success(client, app, test_user):
    """Test successful login."""
    with app.app_context():
        response = client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "test-password"
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        # Response structure: {"success": True, "data": {"user": {...}, "session_token": "..."}}
        assert "data" in data
        assert "user" in data["data"]
        assert "session_token" in data["data"]
        assert data["data"]["user"]["email"] == test_user.email


def test_login_invalid_credentials(client, app, test_user):
    """Test login with invalid credentials."""
    with app.app_context():
        response = client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "wrong-password"
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert data["success"] is False


def test_login_nonexistent_user(client, app):
    """Test login with non-existent user."""
    response = client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "password123"
    })
    
    assert response.status_code == 401


def test_get_current_user(authenticated_client, test_user):
    """Test getting current user info."""
    response = authenticated_client.get("/api/auth/me")
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["user"]["email"] == test_user.email


def test_get_current_user_unauthenticated(client):
    """Test getting current user without authentication."""
    response = client.get("/api/auth/me")
    
    assert response.status_code == 401


def test_logout(authenticated_client):
    """Test logout."""
    response = authenticated_client.post("/api/auth/logout")
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True


def test_forgot_password(client, app, test_user):
    """Test password reset request."""
    with app.app_context():
        from app.models.database import db, User
        response = client.post("/api/auth/forgot-password", json={
            "email": test_user.email
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        
        # Verify reset token was generated - query fresh from database
        user = User.query.filter_by(email=test_user.email).first()
        assert user is not None
        assert user.reset_token is not None


def test_reset_password(client, app, test_user):
    """Test password reset with token."""
    with app.app_context():
        from app.models.database import db, User
        # Generate reset token - ensure user is in session
        user = User.query.filter_by(email=test_user.email).first()
        token = user.generate_reset_token()
        db.session.add(user)  # Ensure user is tracked
        db.session.commit()
        
        # Verify token was saved - query fresh
        user = User.query.filter_by(email=test_user.email).first()
        assert user.reset_token is not None
        assert user.reset_token == token
        
        # Reset password
        response = client.post("/api/auth/reset-password", json={
            "token": token,
            "password": "newpassword123"
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        
        # Verify password was changed - query fresh from database
        user = User.query.filter_by(email=test_user.email).first()
        assert user.check_password("newpassword123")
        assert user.reset_token is None  # Token should be cleared

