"""Health check routes."""
from flask import Blueprint, jsonify
from datetime import datetime
from app.models.database import db

bp = Blueprint("health", __name__)


@bp.get("/api/health")
def health_check():
    """Health check endpoint for monitoring services."""
    try:
        # Check database connection
        db.session.execute(db.text("SELECT 1"))
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 503


@bp.get("/health")
def health():
    """Simple health check endpoint."""
    return jsonify({"status": "ok"})

