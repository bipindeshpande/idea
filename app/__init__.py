"""Flask application factory."""
from flask import Flask
from flask_cors import CORS
import os
import secrets

from app.models.database import db


def create_app():
    """Create and configure Flask application."""
    app = Flask(__name__)
    CORS(app)
    
    # Database configuration
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "sqlite:///startup_idea_advisor.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", secrets.token_hex(32))
    
    # Initialize database
    db.init_app(app)
    
    # Register blueprints
    from app.routes import auth, subscription, payment, admin, discovery, validation, user, health
    
    app.register_blueprint(health.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(subscription.bp)
    app.register_blueprint(payment.bp)
    app.register_blueprint(admin.bp)
    app.register_blueprint(discovery.bp)
    app.register_blueprint(validation.bp)
    app.register_blueprint(user.bp)
    
    # Initialize database tables
    with app.app_context():
        db.create_all()
    
    return app

