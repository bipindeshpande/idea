"""Shared utility functions for routes."""
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from flask import request, jsonify

from app.models.database import db, UserSession

OUTPUT_DIR = Path("output")

PROFILE_FIELDS = [
    "goal_type",
    "time_commitment",
    "budget_range",
    "interest_area",
    "sub_interest_area",
    "work_style",
    "skill_strength",
    "experience_summary",
]


def read_output_file(filename: str) -> str | None:
    """Read output file from OUTPUT_DIR."""
    filepath = OUTPUT_DIR / filename
    if filepath.exists():
        try:
            content = filepath.read_text(encoding="utf-8")
            return content
        except OSError:
            return None
    return None


def create_user_session(user_id: int, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> UserSession:
    """Create a new user session."""
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=7)  # 7 days
    
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.session.add(session)
    db.session.commit()
    return session


def get_current_session() -> Optional[UserSession]:
    """Get current user session from token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.replace("Bearer ", "").strip()
    session = UserSession.query.filter_by(session_token=token).first()
    
    if not session or not session.is_valid():
        return None
    
    # Check for inactivity timeout (30 minutes)
    INACTIVITY_TIMEOUT_MINUTES = 30
    if session.last_activity:
        time_since_activity = datetime.utcnow() - session.last_activity
        if time_since_activity > timedelta(minutes=INACTIVITY_TIMEOUT_MINUTES):
            # Session expired due to inactivity
            db.session.delete(session)
            db.session.commit()
            return None
    
    # Update last activity timestamp
    session.last_activity = datetime.utcnow()
    session.refresh()
    db.session.commit()
    return session


def require_auth(f):
    """Decorator to require authentication."""
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session = get_current_session()
        if not session:
            return jsonify({"success": False, "error": "Authentication required"}), 401
        
        if not session.user.is_subscription_active():
            return jsonify({
                "success": False,
                "error": "Subscription expired",
                "subscription": session.user.to_dict(),
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function


def check_admin_auth() -> bool:
    """Check if request has valid admin authentication."""
    from app.models.database import Admin
    import os
    
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return False
    
    token = auth_header.replace("Bearer ", "")
    
    # Check against database first
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    if admin_email:
        admin = Admin.query.filter_by(email=admin_email).first()
        if admin and admin.check_password(token):
            return True
    
    # Fallback to environment variable for backward compatibility
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin2024")
    return token == ADMIN_PASSWORD

