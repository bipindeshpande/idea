"""Flask application factory."""
from flask import Flask
from flask_cors import CORS
from flask_compress import Compress
import os
import secrets

from app.models.database import db


def create_app():
    """Create and configure Flask application."""
    app = Flask(__name__)
    CORS(app)
    # Enable compression for all responses
    Compress(app)
    
    # Database configuration
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "sqlite:///startup_idea_advisor.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", secrets.token_hex(32))
    
    # Initialize database
    db.init_app(app)
    
    # Register blueprints (only health exists, rest are in api.py)
    try:
        from app.routes.health import bp as health_bp
        app.register_blueprint(health_bp)
    except ImportError:
        # Health blueprint doesn't exist, skip it
        pass
    
    # Initialize database tables
    with app.app_context():
        try:
            db.create_all()
            # Verify tool_cache table exists
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            if 'tool_cache' not in inspector.get_table_names():
                current_app.logger.warning(
                    "tool_cache table not found. Run migration: migrations/add_tool_cache_table.sql"
                )
        except Exception as e:
            current_app.logger.warning(f"Error creating database tables: {e}")
        
        # Cleanup old temp files on startup (important for high-concurrency scenarios)
        try:
            from app.utils.output_manager import cleanup_old_temp_files
            cleanup_old_temp_files(max_age_hours=1)  # Clean up files older than 1 hour
        except Exception:
            # Don't fail startup if cleanup fails
            pass
    
    return app

