"""
Tests for health check endpoints.
"""
import pytest


def test_health_check_success(client, app):
    """Test health check endpoint."""
    with app.app_context():
        response = client.get("/api/health")
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        assert "timestamp" in data


def test_health_check_simple(client):
    """Test simple health check endpoint."""
    response = client.get("/health")
    
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"

