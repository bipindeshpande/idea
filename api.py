from __future__ import annotations

import json
import os
import re
import sys
import time
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Optional
from functools import lru_cache

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Fix Unicode encoding issues on Windows
if sys.platform == "win32":
    # Set UTF-8 encoding for stdout/stderr
    if sys.stdout.encoding != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass  # Python < 3.7 or already configured
    if sys.stderr.encoding != "utf-8":
        try:
            sys.stderr.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass  # Python < 3.7 or already configured
    # Set environment variable for subprocesses
    os.environ["PYTHONIOENCODING"] = "utf-8"

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func

from startup_idea_crew.crew import StartupIdeaCrew
from app.models.database import db, User, UserSession, UserRun, UserValidation, Payment, SubscriptionCancellation, Admin, AdminResetToken, UserAction, UserNote, SystemSettings
from app.services.email_service import email_service
from app.services.email_templates import (
    admin_password_reset_email,
    validation_ready_email,
    trial_ending_email,
    subscription_expiring_email,
    subscription_reminder_email,
    subscription_final_reminder_email,
    welcome_email,
    subscription_activated_email,
    password_reset_email,
    password_changed_email,
    payment_failed_email,
    get_base_template,
)

app = Flask(__name__)

# Global error handler for unhandled exceptions
@app.errorhandler(Exception)
def handle_exception(e):
    """Handle all unhandled exceptions."""
    app.logger.exception("Unhandled exception: %s", e)
    import traceback
    app.logger.error(f"Traceback: {traceback.format_exc()}")
    try:
        db.session.rollback()
    except:
        pass
    return jsonify({
        "success": False,
        "error": f"Internal server error: {str(e)}"
    }), 500

# CORS Configuration - Restrict to your domain in production
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://ideabunch.com")
ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "https://www.ideabunch.com",
    "http://localhost:5173",  # Development only
    "http://127.0.0.1:5173",  # Development only
]

# Only allow localhost in development
# Default to allowing localhost if FLASK_ENV is not explicitly set to production
FLASK_ENV = os.environ.get("FLASK_ENV", "").lower()
if FLASK_ENV == "production":
    ALLOWED_ORIGINS = [origin for origin in ALLOWED_ORIGINS if not origin.startswith("http://localhost") and not origin.startswith("http://127.0.0.1")]
# In development or if FLASK_ENV not set, allow localhost

CORS(app, origins=ALLOWED_ORIGINS, supports_credentials=True)

# Rate Limiting Configuration
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",  # Use in-memory storage (for production, consider Redis)
)

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///startup_idea_advisor.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", secrets.token_hex(32))

db.init_app(app)

# Import utilities
from app.utils import (
    PROFILE_FIELDS,
    read_output_file as _read_output_file,
    create_user_session,
    get_current_session,
    require_auth,
    check_admin_auth,
    _validate_discovery_inputs,
)

# All route definitions have been moved to blueprints in app/routes/
# Old route definitions removed - see app/routes/ for all routes

# Register all route blueprints
from app.routes import register_blueprints
register_blueprints(app)

# Initialize database tables
with app.app_context():
    db.create_all()
    
    # Initialize admin user if ADMIN_EMAIL is set
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    if admin_email:
        default_password = os.environ.get("ADMIN_PASSWORD", "admin2024")
        admin = Admin.get_or_create_admin(admin_email, default_password)
        
        # Set MFA secret if not already set
        mfa_secret = os.environ.get("ADMIN_MFA_SECRET", "JBSWY3DPEHPK3PXP")
        if not admin.mfa_secret:
            admin.mfa_secret = mfa_secret
            db.session.commit()
        
        app.logger.info(f"Admin user initialized: {admin_email}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    # Check system settings for debug mode, fallback to environment variable
    try:
        debug_setting = SystemSettings.get_setting("debug_mode", None)
        if debug_setting is not None:
            debug_mode = debug_setting.lower() == "true"
        else:
            # Fallback to environment variable
            debug_mode = os.environ.get("FLASK_ENV") == "development" or os.environ.get("DEBUG", "false").lower() == "true"
    except Exception:
        # If database not initialized, use environment variable
        debug_mode = os.environ.get("FLASK_ENV") == "development" or os.environ.get("DEBUG", "false").lower() == "true"
    
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
