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
        db.create_all()
    
    return app

