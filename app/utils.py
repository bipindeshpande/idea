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
    max_retries = 3  # Retry up to 3 times if token collision occurs
    retry_count = 0
    
    while retry_count < max_retries:
        try:
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
        except Exception as e:
            db.session.rollback()
            import logging
            import traceback
            
            # Check if it's a unique constraint violation (token collision)
            error_str = str(e).lower()
            if ("unique" in error_str or "duplicate" in error_str) and "session_token" in error_str:
                retry_count += 1
                if retry_count >= max_retries:
                    logging.error(f"Failed to create user session after {max_retries} retries due to token collisions: user_id={user_id}")
                    raise Exception("Failed to create session: token collision after retries")
                # Continue to retry with a new token
                continue
            
            # For other errors, log and re-raise immediately
            logging.error(f"Failed to create user session for user_id {user_id}: {e}")
            logging.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    # Should never reach here, but just in case
    raise Exception("Failed to create user session after maximum retries")


def get_current_session() -> Optional[UserSession]:
    """Get current user session from token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.replace("Bearer ", "").strip()
    session = UserSession.query.filter_by(session_token=token).first()
    
    if not session or not session.is_valid():
        return None
    
    # Check for inactivity timeout (15 minutes - increased for long operations like validation)
    INACTIVITY_TIMEOUT_MINUTES = 15
    if session.last_activity:
        time_since_activity = datetime.utcnow() - session.last_activity
        if time_since_activity > timedelta(minutes=INACTIVITY_TIMEOUT_MINUTES):
            # Session expired due to inactivity
            db.session.delete(session)
            db.session.commit()
            return None
    
    # Update last activity timestamp
    session.last_activity = datetime.utcnow()
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


def _validate_discovery_inputs(payload: dict) -> Optional[str]:
    """Validate discovery inputs for weird/incompatible combinations."""
    # Check for completely empty or nonsensical combinations
    has_minimal_info = False
    
    # Check if user provided at least some meaningful information
    meaningful_fields = [
        payload.get("goal_type", "").strip(),
        payload.get("interest_area", "").strip(),
        payload.get("experience_summary", "").strip(),
    ]
    
    # Check if we have at least 2 fields with meaningful content (not defaults)
    default_values = {
        "goal_type": "Extra Income",
        "time_commitment": "<5 hrs/week",
        "budget_range": "Free / Sweat-equity only",
        "interest_area": "AI / Automation",
        "sub_interest_area": "Chatbots",
        "work_style": "Solo",
        "skill_strength": "Analytical / Strategic",
    }
    
    non_default_count = 0
    for key, value in payload.items():
        if key in default_values:
            if value and value.strip() and value.strip() != default_values[key]:
                non_default_count += 1
        elif value and len(value.strip()) > 10:  # Meaningful content
            non_default_count += 1
    
    # Need at least 2 non-default or meaningful fields
    if non_default_count < 2:
        return "Please provide more specific information about your goals, interests, or experience. The combination of inputs provided doesn't contain enough detail to generate meaningful recommendations."
    
    # Check for contradictory combinations
    goal_type = payload.get("goal_type", "").strip().lower()
    time_commitment = payload.get("time_commitment", "").strip().lower()
    budget_range = payload.get("budget_range", "").strip().lower()
    
    # Check for impossible time/budget combinations
    if "full-time" in goal_type or "primary business" in goal_type:
        if "<5 hrs" in time_commitment or "5-10 hrs" in time_commitment:
            return "Your goal indicates a full-time commitment, but your time availability is limited. Please adjust either your goal or time commitment for more realistic recommendations."
    
    if "free" in budget_range or "sweat-equity" in budget_range.lower():
        if "$50,000" in budget_range or "$100,000" in budget_range:
            # Contradictory - user says free but also mentions large budget
            return "Your budget preferences seem contradictory. Please clarify your available budget for starting a business."
    
    # Check if experience summary is too vague
    experience = payload.get("experience_summary", "").strip()
    if experience and len(experience) < 20:
        # Very short experience - might not be meaningful
        if non_default_count < 3:
            return "Please provide more details about your background, skills, or experience. More information helps us generate better recommendations tailored to you."
    
    return None  # All validations passed


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

