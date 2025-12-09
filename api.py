from __future__ import annotations

import json
import os
import sys
import time
import secrets
from datetime import datetime, timedelta

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
from flask_limiter.errors import RateLimitExceeded
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func
import uuid
import json
from app.models.database import db, User, UserSession, UserRun, UserValidation, Payment, SubscriptionCancellation, Admin, AdminResetToken, UserAction, UserNote
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


def _env_flag(name: str, default: bool = False) -> bool:
    """Convert common truthy strings in environment variables to booleans."""
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _default_debug_flag() -> bool:
    """Derive default debug flag from FLASK_ENV/DEBUG."""
    flask_env = os.environ.get("FLASK_ENV", "").lower()
    if flask_env == "production":
        return False
    if flask_env == "development":
        return True
    return _env_flag("DEBUG", default=True)


def _mask_token(token: str) -> str:
    """Return a masked representation of a token."""
    if not token:
        return ""
    token = token.strip()
    if len(token) <= 8:
        return "*" * len(token)
    return f"{token[:4]}...{token[-4:]}"


def _mask_authorization_header(header_value: str) -> str:
    """Mask sensitive parts of Authorization headers."""
    if not header_value:
        return ""
    parts = header_value.split(" ", 1)
    if len(parts) == 2:
        scheme, token = parts
        return f"{scheme} {_mask_token(token)}"
    return _mask_token(header_value)

# Structured logging setup
@app.before_request
def before_request():
    """Add request ID and user context for structured logging."""
    g.request_id = str(uuid.uuid4())[:8]
    g.user_id = None
    g.start_time = time.time()
    log_request_details = app.config.get("LOG_REQUEST_DETAILS", False)
    
    # Log request details using proper logging (dev-friendly in development, structured in production)
    try:
        log_data = {
            "request_id": g.request_id,
            "method": request.method,
            "path": request.path,
            "remote_addr": request.remote_addr,
            "user_agent": request.headers.get('User-Agent', 'N/A')[:200],
        }
        
        # Mask authorization header if present
        if request.headers.get('Authorization'):
            auth_header = request.headers.get('Authorization')
            log_data["authorization"] = _mask_authorization_header(auth_header)
        
        # Log JSON body in development mode only
        if log_request_details and request.is_json:
            try:
                data = request.get_json(silent=True)
                if data:
                    # Only log first 200 chars in dev mode
                    data_str = json.dumps(data, indent=2)
                    log_data["json_body"] = data_str[:200] + "..." if len(data_str) > 200 else data_str
            except:
                pass
        
        # Use structured logging
        app.logger.info(
            f"Request: {request.method} {request.path}",
            extra=log_data
        )
        
        # In development, also print to console for easier debugging
        if app.config.get("DEBUG", False):
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] {request.method} {request.path} (ID: {g.request_id})", flush=True)
    except Exception as e:
        app.logger.error(f"Failed to log request info: {e}", exc_info=True)
    
    # Try to get user from session for logging
    try:
        from app.utils import get_current_session
        session = get_current_session()
        if session and session.user:
            g.user_id = session.user.id
            app.logger.debug(f"User: {session.user.email} (ID: {g.user_id})", extra={"user_id": g.user_id})
    except Exception as e:
        app.logger.debug(f"Session check failed: {e}")
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
        
        # Log response using proper logging
        log_data = {
            "request_id": g.request_id,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        }
        
        # Log response data in development only
        if app.config.get("DEBUG", False) and hasattr(response, 'get_data'):
            try:
                data = response.get_data(as_text=True)
                if data and len(data) < 500:
                    log_data["response_preview"] = data[:200]
            except:
                pass
        
        if 200 <= response.status_code < 300:
            app.logger.info(f"Response: {response.status_code} - {duration_ms:.2f}ms", extra=log_data)
        elif response.status_code >= 400:
            app.logger.error(f"Response: {response.status_code} - {duration_ms:.2f}ms", extra=log_data)
        else:
            app.logger.warning(f"Response: {response.status_code} - {duration_ms:.2f}ms", extra=log_data)
        
        # In development, also print to console
        if app.config.get("DEBUG", False):
            status_icon = "[OK]" if 200 <= response.status_code < 300 else "[ERROR]" if response.status_code >= 400 else "[WARN]"
            print(f"{status_icon} {response.status_code} - {duration_ms:.2f}ms", flush=True)
        
        app.logger.debug(
            f"[{g.request_id}] Completed in {duration_ms:.2f}ms - Status: {response.status_code}"
        )
    
    return response

# Handle rate limit exceeded errors
@app.errorhandler(RateLimitExceeded)
def handle_rate_limit_exceeded(e):
    """Handle rate limit exceeded errors."""
    request_id = getattr(g, 'request_id', 'unknown')
    app.logger.warning(f"[{request_id}] Rate limit exceeded: {str(e)}")
    response = jsonify({
        "success": False,
        "error": "Rate limit exceeded. Please try again later.",
        "error_code": "RATE_LIMIT_EXCEEDED",
        "request_id": request_id
    })
    response.status_code = 429
    return response

# Handle 404 Not Found errors - must be before general Exception handler
from werkzeug.exceptions import NotFound
@app.errorhandler(NotFound)
def handle_not_found(e):
    """Handle 404 Not Found errors."""
    request_id = getattr(g, 'request_id', 'unknown')
    app.logger.debug(f"[{request_id}] 404 Not Found: {request.path}")
    response = jsonify({
        "success": False,
        "error": "Endpoint not found",
        "error_code": "NOT_FOUND",
        "request_id": request_id
    })
    response.status_code = 404
    return response

# Global error handler for unhandled exceptions (but not 404s)
@app.errorhandler(Exception)
def handle_exception(e):
    """Handle all unhandled exceptions."""
    import traceback
    request_id = getattr(g, 'request_id', 'unknown')
    user_id = getattr(g, 'user_id', 'anonymous')
    
    # Log error with full context
    error_type = type(e).__name__
    error_msg = str(e)
    full_traceback = traceback.format_exc()
    
    # Structured error logging
    error_data = {
        "request_id": request_id,
        "user_id": user_id,
        "error_type": error_type,
        "error_message": error_msg,
        "path": request.path if request else None,
        "method": request.method if request else None,
    }
    
    app.logger.error(
        f"Unhandled exception: {error_type}: {error_msg}",
        extra=error_data,
        exc_info=True
    )
    
    # In development, also print to console for visibility
    if app.config.get("DEBUG", False):
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
    
    # Return sanitized error response
    return jsonify({
        "success": False,
        "error": "Internal server error. Please try again later.",
        "error_code": "INTERNAL_SERVER_ERROR",
        "request_id": request_id
    }), 500

# CORS Configuration - Restrict to your domain in production
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://ideabunch.com")
FLASK_ENV = os.environ.get("FLASK_ENV", "").lower()
is_production = FLASK_ENV == "production"

# Explicitly set allowed origins based on environment
if is_production:
    # Production: Only allow production domains
    ALLOWED_ORIGINS = [
        FRONTEND_URL,
        "https://www.ideabunch.com",
    ]
    # Remove any localhost origins if they somehow got in
    ALLOWED_ORIGINS = [origin for origin in ALLOWED_ORIGINS 
                      if not origin.startswith("http://localhost") 
                      and not origin.startswith("http://127.0.0.1")]
else:
    # Development: Allow localhost and production domains
    ALLOWED_ORIGINS = [
        FRONTEND_URL,
        "https://www.ideabunch.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",  # Common React dev port
        "http://127.0.0.1:3000",
    ]

CORS(app, origins=ALLOWED_ORIGINS, supports_credentials=True)

# Rate Limiting Configuration
# Use Redis in production, memory in development
FLASK_ENV = os.environ.get("FLASK_ENV", "").lower()
is_production = FLASK_ENV == "production"

# Try to use Redis if available, fall back to memory
rate_limit_storage = "memory://"
if is_production:
    redis_url = os.environ.get("REDIS_URL")
    if redis_url:
        rate_limit_storage = redis_url
        app.logger.info("Using Redis for rate limiting")
    else:
        app.logger.warning("REDIS_URL not set in production - using in-memory rate limiting (not recommended for multiple instances)")
else:
    # Development: Try Redis if available, but don't require it
    redis_url = os.environ.get("REDIS_URL")
    if redis_url:
        try:
            import redis
            # Test connection
            r = redis.from_url(redis_url)
            r.ping()
            rate_limit_storage = redis_url
            app.logger.info("Using Redis for rate limiting (development)")
        except Exception as e:
            app.logger.info(f"Redis not available in development, using memory: {e}")
            rate_limit_storage = "memory://"

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=rate_limit_storage,
)

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///startup_idea_advisor.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", secrets.token_hex(32))
app.config["DEBUG"] = _env_flag("FLASK_DEBUG", default=_default_debug_flag())
app.config["LOG_REQUEST_DETAILS"] = _env_flag(
    "LOG_REQUEST_DETAILS",
    default=app.config["DEBUG"],
)

# Database connection pooling (for PostgreSQL)
if "postgresql" in app.config["SQLALCHEMY_DATABASE_URI"].lower() or "postgres" in app.config["SQLALCHEMY_DATABASE_URI"].lower():
    # Connection pool settings for production
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_size": int(os.environ.get("DB_POOL_SIZE", "10")),
        "max_overflow": int(os.environ.get("DB_MAX_OVERFLOW", "20")),
        "pool_pre_ping": True,  # Verify connections before using
        "pool_recycle": int(os.environ.get("DB_POOL_RECYCLE", "3600")),  # Recycle connections after 1 hour
        "connect_args": {
            "connect_timeout": 10,  # 10 second connection timeout
        },
        # Disable automatic table reflection to prevent repeated catalog queries
        "echo": False,  # Set to True only for debugging SQL queries
    }

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

# Configure comprehensive logging BEFORE database initialization
# This ensures errors during DB init can be logged properly
import logging

# TEST: Print immediately to verify stdout is working
print("\n" + "="*80, flush=True)
print("🔵 CONFIGURING LOGGING", flush=True)
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

# Enable SQLAlchemy logging - but suppress schema inspection queries
# Only show WARNING and above to reduce noise, but keep errors visible
sqlalchemy_logger = logging.getLogger('sqlalchemy.engine')
sqlalchemy_logger.setLevel(logging.WARNING)  # Changed from INFO to WARNING to reduce schema inspection noise

# Enable SQLAlchemy error logging
sqlalchemy_error_logger = logging.getLogger('sqlalchemy')
sqlalchemy_error_logger.setLevel(logging.ERROR)
sqlalchemy_error_logger.addHandler(logging.StreamHandler(sys.stdout))

# Suppress DEBUG logs from third-party libraries to keep logs clean for performance monitoring
third_party_loggers = [
    'LiteLLM',
    'litellm',
    'httpcore',
    'httpx',
    'urllib3',
    'openai',
]
for logger_name in third_party_loggers:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.WARNING)  # Only show warnings and errors

# Suppress werkzeug DEBUG logs (but keep INFO for useful request logs)
werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.setLevel(logging.INFO)  # Keep INFO for request logs, suppress DEBUG

# Enable other common loggers
for logger_name in ['app', 'app.routes', 'app.models', 'app.utils']:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.DEBUG)
    logger.addHandler(logging.StreamHandler(sys.stdout))
    logger.propagate = True

print("✅ Logging configuration complete", flush=True)

# Register all route blueprints
print("📦 Registering route blueprints...", flush=True)
try:
    from app.routes import register_blueprints
    register_blueprints(app)
    print("✅ Route blueprints registered", flush=True)
except Exception as e:
    print(f"❌ ERROR: Failed to register blueprints: {e}", flush=True)
    import traceback
    traceback.print_exc()
    raise

# Initialize database tables
print("💾 Initializing database...", flush=True)
with app.app_context():
    try:
        # Test database connection first
        db.session.execute(db.text("SELECT 1"))
        print("✅ Database connection test successful", flush=True)
        
        # Ensure all models are bound to metadata to prevent repeated table existence checks
        # This prevents SQLAlchemy from querying pg_catalog repeatedly
        # Import all models to ensure they're registered with SQLAlchemy
        from app.models.database import (
            User, UserSession, UserRun, UserValidation, UserAction, 
            UserNote, Payment, SubscriptionCancellation, Admin, 
            AdminResetToken, SystemSettings, ToolCacheEntry, 
            FounderProfile, IdeaListing, ConnectionRequest, 
            ConnectionCreditLedger, StripeEvent, AuditLog
        )
        # Force metadata binding by accessing table definitions
        # This ensures SQLAlchemy knows about all tables without querying the catalog
        # Accessing __table__ on each model ensures the table metadata is fully bound
        models = [User, UserSession, UserRun, UserValidation, UserAction, 
                  UserNote, Payment, SubscriptionCancellation, Admin, 
                  AdminResetToken, SystemSettings, ToolCacheEntry, 
                  FounderProfile, IdeaListing, ConnectionRequest, 
                  ConnectionCreditLedger, StripeEvent, AuditLog]
        for model in models:
            try:
                _ = model.__table__
            except Exception:
                # Model might not have __table__ yet, that's okay
                pass
        
        db.create_all()
        print("✅ Database tables created/verified", flush=True)
        
        # Initialize admin user if ADMIN_EMAIL is set
        admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
        if admin_email:
            admin_password = os.environ.get("ADMIN_PASSWORD")
            if not admin_password:
                if is_production:
                    raise ValueError("ADMIN_PASSWORD environment variable is required in production")
                else:
                    # Development: Use default but warn
                    admin_password = "admin2024"
                    app.logger.warning("ADMIN_PASSWORD not set - using default password (NOT FOR PRODUCTION)")
            admin = Admin.get_or_create_admin(admin_email, admin_password)
            
            # Set MFA secret if not already set
            mfa_secret = os.environ.get("ADMIN_MFA_SECRET", "JBSWY3DPEHPK3PXP")
            if not admin.mfa_secret:
                admin.mfa_secret = mfa_secret
                db.session.commit()
            
            app.logger.info(f"Admin user initialized: {admin_email}")
            print(f"✅ Admin user initialized: {admin_email}", flush=True)
        else:
            print("ℹ️  No ADMIN_EMAIL set, skipping admin initialization", flush=True)
    except Exception as db_error:
        db_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "unknown")
        error_msg = str(db_error)
        print("\n" + "="*60, flush=True)
        print("❌ DATABASE INITIALIZATION ERROR", flush=True)
        print("="*60, flush=True)
        print(f"Database URI: {db_uri}", flush=True)
        print(f"Error: {error_msg}", flush=True)
        print("="*60 + "\n", flush=True)
        
        if "postgresql" in db_uri.lower() or "postgres" in db_uri.lower():
            print("ERROR: Cannot connect to PostgreSQL database!", flush=True)
            print("\nSolutions:", flush=True)
            print("1. Start PostgreSQL server", flush=True)
            print("2. Or use SQLite by setting in .env file:", flush=True)
            print("   DATABASE_URL=sqlite:///startup_idea_advisor.db", flush=True)
            print("\n", flush=True)
            # Don't exit - let the app start but database operations will fail
        else:
            app.logger.error(f"Database initialization error: {db_error}")
            import traceback
            traceback.print_exc()
            # For non-PostgreSQL errors, still allow app to start if possible
            print("⚠️  Database error occurred but continuing startup...", flush=True)

print("="*80 + "\n", flush=True)

# Initialize error tracking (optional, won't fail if not configured)
try:
    from app.utils.error_tracking import init_error_tracking
    sentry_client = init_error_tracking(app)
    if sentry_client:
        print("✅ Error tracking (Sentry) initialized", flush=True)
except Exception as e:
    app.logger.warning(f"Error tracking initialization failed: {e}")

if __name__ == "__main__":
    
    port = int(os.environ.get("PORT", 8000))
    # Honor Flask debug configuration strictly via environment/application config
    debug_mode = app.config.get("DEBUG", False)
    
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
