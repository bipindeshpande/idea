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

from flask import Flask, jsonify, request, send_from_directory, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func
import uuid

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

# Structured logging setup
@app.before_request
def before_request():
    """Add request ID and user context for structured logging."""
    g.request_id = str(uuid.uuid4())[:8]
    g.user_id = None
    g.start_time = time.time()
    
    # CRITICAL: Print detailed request info to terminal (flush immediately for visibility)
    # This ensures we see EVERY request, even if logging fails
    try:
        print("\n" + "="*80, flush=True)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] REQUEST: {request.method} {request.path}", flush=True)
        print(f"   Request ID: {g.request_id}", flush=True)
        print(f"   Remote Address: {request.remote_addr}", flush=True)
        print(f"   User Agent: {request.headers.get('User-Agent', 'N/A')[:80]}", flush=True)
        if request.headers.get('Authorization'):
            auth_header = request.headers.get('Authorization')
            print(f"   Authorization: {auth_header[:50]}..." if len(auth_header) > 50 else f"   Authorization: {auth_header}", flush=True)
        if request.is_json:
            try:
                import json
                data = request.get_json(silent=True)
                if data:
                    data_str = json.dumps(data, indent=2)
                    print(f"   JSON Body: {data_str[:200]}..." if len(data_str) > 200 else f"   JSON Body: {data_str}", flush=True)
            except:
                pass
        print("="*80, flush=True)
    except Exception as e:
        # If printing fails, at least try to log via logger
        app.logger.error(f"Failed to print request info: {e}")
    
    # Try to get user from session for logging
    try:
        from app.utils import get_current_session
        session = get_current_session()
        if session and session.user:
            g.user_id = session.user.id
            print(f"   User: {session.user.email} (ID: {g.user_id})", flush=True)
    except Exception as e:
        print(f"   Session check failed: {e}", flush=True)
        pass  # Don't fail if session check fails
    
    # Log request start (also logged to logger)
    app.logger.debug(
        f"[{g.request_id}] User {g.user_id or 'anonymous'} - {request.method} {request.path}"
    )

@app.after_request
def after_request(response):
    """Add security headers and log request completion."""
    # Content Security Policy
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' https://js.stripe.com 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://api.stripe.com https://*.stripe.com; "
        "frame-src https://js.stripe.com https://hooks.stripe.com; "
        "font-src 'self' data:;"
    )
    
    # Other security headers
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Log request completion with duration
    if hasattr(g, 'request_id') and hasattr(g, 'start_time'):
        duration_ms = (time.time() - g.start_time) * 1000
        status_emoji = "✅" if 200 <= response.status_code < 300 else "❌" if response.status_code >= 400 else "⚠️"
        status_color = "green" if 200 <= response.status_code < 300 else "red" if response.status_code >= 400 else "yellow"
        
        status_icon = "[OK]" if 200 <= response.status_code < 300 else "[ERROR]" if response.status_code >= 400 else "[WARN]"
        print(f"{status_icon} RESPONSE: {response.status_code} - {duration_ms:.2f}ms", flush=True)
        if hasattr(response, 'get_data'):
            try:
                data = response.get_data(as_text=True)
                if data and len(data) < 500:
                    print(f"   Response: {data[:200]}...", flush=True)
            except:
                pass
        print("="*80 + "\n", flush=True)
        
        app.logger.debug(
            f"[{g.request_id}] Completed in {duration_ms:.2f}ms - Status: {response.status_code}"
        )
    
    return response

# Global error handler for unhandled exceptions
@app.errorhandler(Exception)
def handle_exception(e):
    """Handle all unhandled exceptions."""
    import traceback
    request_id = getattr(g, 'request_id', 'unknown')
    user_id = getattr(g, 'user_id', 'anonymous')
    
    # Print detailed error to terminal with full stack trace
    error_type = type(e).__name__
    error_msg = str(e)
    full_traceback = traceback.format_exc()
    
    print("\n" + "="*80, flush=True)
    print(f"ERROR: UNHANDLED EXCEPTION", flush=True)
    print("="*80, flush=True)
    print(f"Request ID: {request_id}", flush=True)
    print(f"User: {user_id}", flush=True)
    print(f"Error Type: {error_type}", flush=True)
    print(f"Error Message: {error_msg}", flush=True)
    print("-"*80, flush=True)
    print("FULL STACK TRACEBACK:", flush=True)
    print(full_traceback, flush=True)
    print("="*80 + "\n", flush=True)
    
    # Log to logger with exception info (includes traceback)
    app.logger.exception(
        f"[{request_id}] User {user_id} - Unhandled exception: {error_type}: {error_msg}"
    )
    app.logger.error(f"[{request_id}] Full traceback:\n{full_traceback}")
    
    # Rollback any database transaction
    try:
        db.session.rollback()
        app.logger.debug(f"[{request_id}] Database session rolled back")
    except Exception as rollback_error:
        app.logger.error(f"[{request_id}] Failed to rollback database: {rollback_error}")
    
    # Return error response
    return jsonify({
        "success": False,
        "error": f"Internal server error: {error_msg}",
        "error_type": error_type,
        "request_id": request_id
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
    try:
        # Test database connection first
        db.session.execute(db.text("SELECT 1"))
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
    except Exception as db_error:
        db_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "unknown")
        if "postgresql" in db_uri.lower() or "postgres" in db_uri.lower():
            app.logger.error(
                f"Failed to connect to PostgreSQL database: {db_error}\n"
                f"Database URI: {db_uri}\n"
                "Please ensure PostgreSQL is running, or set DATABASE_URL to use SQLite:\n"
                "  DATABASE_URL=sqlite:///startup_idea_advisor.db"
            )
            print("\n" + "="*60)
            print("ERROR: Cannot connect to PostgreSQL database!")
            print("="*60)
            print(f"Database URI: {db_uri}")
            print(f"Error: {db_error}")
            print("\nSolutions:")
            print("1. Start PostgreSQL server")
            print("2. Or use SQLite by setting in .env file:")
            print("   DATABASE_URL=sqlite:///startup_idea_advisor.db")
            print("="*60 + "\n")
            # Don't exit - let the app start but database operations will fail
        else:
            app.logger.error(f"Database initialization error: {db_error}")
            raise


# Configure comprehensive logging - always enabled, not just in __main__
import logging
import sys

# TEST: Print immediately to verify stdout is working
print("\n" + "="*80, flush=True)
print("🔵 LOGGING CONFIGURATION INITIALIZED", flush=True)
print("="*80, flush=True)

# Configure comprehensive logging for development/debugging
# Set root logger to DEBUG to catch everything
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)  # Print to console/terminal
    ],
    force=True  # Override any existing configuration
)

# Enable Flask's logger with DEBUG level
app.logger.setLevel(logging.DEBUG)
app.logger.addHandler(logging.StreamHandler(sys.stdout))
app.logger.propagate = True  # Allow logs to propagate to root logger

# Enable werkzeug (Flask's WSGI server) logging
werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.setLevel(logging.DEBUG)
werkzeug_logger.addHandler(logging.StreamHandler(sys.stdout))

# Enable SQLAlchemy logging to see database queries and errors
sqlalchemy_logger = logging.getLogger('sqlalchemy.engine')
sqlalchemy_logger.setLevel(logging.INFO)  # INFO shows SQL queries
sqlalchemy_logger.addHandler(logging.StreamHandler(sys.stdout))

# Enable SQLAlchemy error logging
sqlalchemy_error_logger = logging.getLogger('sqlalchemy')
sqlalchemy_error_logger.setLevel(logging.ERROR)
sqlalchemy_error_logger.addHandler(logging.StreamHandler(sys.stdout))

# Enable other common loggers
for logger_name in ['app', 'app.routes', 'app.models', 'app.utils']:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.DEBUG)
    logger.addHandler(logging.StreamHandler(sys.stdout))
    logger.propagate = True

if __name__ == "__main__":
    
    port = int(os.environ.get("PORT", 8000))
    # Check system settings for debug mode, fallback to environment variable
    try:
        debug_setting = SystemSettings.get_setting("debug_mode", None)
        if debug_setting is not None:
            debug_mode = debug_setting.lower() == "true"
        else:
            # Fallback to environment variable, default to True for development
            debug_mode = os.environ.get("FLASK_ENV") == "development" or os.environ.get("DEBUG", "true").lower() == "true"
    except Exception:
        # If database not initialized, use environment variable, default to True for development
        debug_mode = os.environ.get("FLASK_ENV") == "development" or os.environ.get("DEBUG", "true").lower() == "true"
    
    # Print startup message immediately with flush
    print("\n" + "="*80, flush=True)
    print("🚀 STARTING FLASK SERVER", flush=True)
    print("="*80, flush=True)
    print(f"Port: {port}", flush=True)
    print(f"Debug mode: {debug_mode}", flush=True)
    print(f"Auto-reload: {debug_mode}", flush=True)
    print("Logging: ENABLED (all logs to console)", flush=True)
    print("="*80 + "\n", flush=True)
    
    # Test logging works
    app.logger.info("🔵 Server starting - logging test")
    app.logger.debug("🔵 Debug logging enabled")
    print("✅ Logging configuration verified - ready to receive requests\n", flush=True)
    
    # Print a test message every 30 seconds to verify server is running
    import threading
    def heartbeat():
        import time
        while True:
            time.sleep(30)  # Every 30 seconds
            print(f"[HEARTBEAT] Server is alive at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", flush=True)
    
    heartbeat_thread = threading.Thread(target=heartbeat, daemon=True)
    heartbeat_thread.start()
    print("✅ Heartbeat thread started - you should see a message every 30 seconds\n", flush=True)
    
    # Explicitly enable reloader for auto-reload on code changes
    # use_reloader=True means Flask will watch for file changes and auto-restart
    # This only works when running directly (not in production WSGI servers)
    app.run(
        host="0.0.0.0", 
        port=port, 
        debug=debug_mode,
        use_reloader=debug_mode,  # Auto-reload on file changes in debug mode
        use_debugger=debug_mode   # Enable debugger in debug mode
    )
