"""
Tests for admin routes.
"""
import pytest
import os
from app.models.database import Admin


def test_admin_login_success(client, app, admin_user):
    """Test successful admin login."""
    with app.app_context():
        response = client.post("/api/admin/login", json={
            "password": "test-admin-password"
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True


def test_admin_login_failure(client, app, admin_user):
    """Test admin login with wrong password."""
    with app.app_context():
        response = client.post("/api/admin/login", json={
            "password": "wrong-password"
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert data["success"] is False


def test_admin_mfa_development_mode(client, app):
    """Test MFA in development mode."""
    # Ensure we're in development mode
    original_env = os.environ.get("FLASK_ENV")
    os.environ["FLASK_ENV"] = "development"
    
    try:
        with app.app_context():
            response = client.post("/api/admin/verify-mfa", json={
                "mfa_code": "1234"  # DEV_MFA_CODE from conftest
            })
            
            assert response.status_code == 200
            data = response.get_json()
            assert data["success"] is True
    finally:
        if original_env:
            os.environ["FLASK_ENV"] = original_env
        else:
            os.environ.pop("FLASK_ENV", None)


def test_admin_mfa_production_mode(client, app):
    """Test MFA in production mode requires TOTP."""
    # Set production mode
    original_env = os.environ.get("FLASK_ENV")
    os.environ["FLASK_ENV"] = "production"
    os.environ["ADMIN_MFA_SECRET"] = "JBSWY3DPEHPK3PXP"
    
    try:
        with app.app_context():
            # Try dev code - should fail in production
            response = client.post("/api/admin/verify-mfa", json={
                "mfa_code": "1234"
            })
            
            # Should fail or require proper TOTP
            assert response.status_code in [401, 500]
    finally:
        if original_env:
            os.environ["FLASK_ENV"] = original_env
        else:
            os.environ.pop("FLASK_ENV", None)
        os.environ.pop("ADMIN_MFA_SECRET", None)


def test_admin_stats_unauthorized(client):
    """Test admin stats without authentication."""
    response = client.get("/api/admin/stats")
    
    assert response.status_code == 403


def test_admin_users_unauthorized(client):
    """Test admin users endpoint without authentication."""
    response = client.get("/api/admin/users")
    
    assert response.status_code == 403

