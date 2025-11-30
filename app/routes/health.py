"""Health check routes."""
from flask import Blueprint, jsonify
from datetime import datetime
from app.models.database import db

bp = Blueprint("health", __name__)


@bp.get("/api/health")
def health_check():
    """Health check endpoint for monitoring services."""
    from flask import current_app
    try:
        # Check database connection
        db.session.execute(db.text("SELECT 1"))
        status = {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
        current_app.logger.info(f"Health check passed: {status}")
        current_app.logger.debug(f"Health check passed at {datetime.now().strftime('%H:%M:%S')}")
        return jsonify(status), 200
    except Exception as e:
        status = {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
        current_app.logger.error(f"Health check failed: {status}")
        current_app.logger.error(f"Health check FAILED: {e}", exc_info=True)
        return jsonify(status), 503


@bp.get("/health")
def health():
    """Simple health check endpoint."""
    return jsonify({"status": "ok"})

