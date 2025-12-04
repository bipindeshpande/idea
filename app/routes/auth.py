"""Authentication routes blueprint."""
from flask import Blueprint, request, current_app
from typing import Any, Dict
from datetime import datetime, timedelta, timezone
import os
import traceback

from app.models.database import db, User, SubscriptionTier, PaymentStatus
from app.models.database import utcnow, normalize_datetime
from app.utils import create_user_session, get_current_session, require_auth
from app.utils.response_helpers import (
    success_response, error_response, not_found_response,
    unauthorized_response, internal_error_response
)
from app.utils.serialization import serialize_datetime
from app.constants import (
    DEFAULT_SUBSCRIPTION_TYPE, DEFAULT_PAYMENT_STATUS,
    MIN_PASSWORD_LENGTH, SUBSCRIPTION_DURATIONS,
    ErrorMessages,
)
from app.services.audit_service import log_login, log_password_reset
from app.services.email_service import email_service
from app.services.email_templates import (
    welcome_email,
    password_reset_email,
    password_changed_email,
    get_base_template,
)

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Note: Rate limits are applied in api.py after blueprint registration
# Import limiter lazily to avoid circular imports
_limiter = None

def get_limiter():
    """Get limiter instance lazily to avoid circular imports."""
    global _limiter
    if _limiter is None:
        try:
            from api import limiter
            _limiter = limiter
        except (ImportError, AttributeError, RuntimeError):
            _limiter = None
    return _limiter


@bp.post("/register")
def register() -> Any:
    """Register a new user."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    
    if not email or not password:
        return error_response("Email and password are required", 400)
    
    if len(password) < MIN_PASSWORD_LENGTH:
        return error_response(ErrorMessages.PASSWORD_TOO_SHORT, 400)
    
    # Check if user exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return error_response("Email already registered", 400)
    
    # Create new user with 3-day free trial
    trial_duration = SUBSCRIPTION_DURATIONS.get(SubscriptionTier.FREE_TRIAL, 3)
    user = User(
        email=email,
        subscription_type=SubscriptionTier.FREE_TRIAL,
        subscription_started_at=utcnow(),
        subscription_expires_at=utcnow() + timedelta(days=trial_duration),
        payment_status=DEFAULT_PAYMENT_STATUS,
    )
    user.set_password(password)
    
    try:
        db.session.add(user)
        db.session.commit()
        
        # Create session
        session = create_user_session(user.id, request.remote_addr, request.headers.get("User-Agent"))
        
        # Log successful login
        try:
            log_login(user.id, success=True)
        except:
            pass  # Don't fail login if audit logging fails
        
        # Send welcome email
        try:
            html_content, text_content = welcome_email(user.email)
            email_service.send_email(
                to_email=user.email,
                subject="Welcome to Startup Idea Advisor! 🚀",
                html_content=html_content,
                text_content=text_content,
            )
        except Exception as e:
            current_app.logger.warning(f"Failed to send welcome email: {e}")
        
        # Send admin notification for new user
        try:
            admin_email = os.environ.get("ADMIN_EMAIL")
            if admin_email:
                admin_html = f"""
                <h2 style="color: #333; margin-top: 0;">New User Registration</h2>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Registered:</strong> {utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                <p><strong>Subscription:</strong> {user.subscription_type} (Free Trial)</p>
                <p><strong>Expires:</strong> {user.subscription_expires_at.strftime('%Y-%m-%d') if user.subscription_expires_at else 'N/A'}</p>
                """
                email_service.send_email(
                    to_email=admin_email,
                    subject=f"New User: {user.email}",
                    html_content=get_base_template(admin_html),
                    text_content=f"New user registered: {user.email}\nRegistered: {utcnow().isoformat()}",
                )
        except Exception as e:
            current_app.logger.warning(f"Failed to send admin notification: {e}")
        
        return success_response({
            "user": user.to_dict(),
            "session_token": session.session_token,
        })
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Registration failed: %s", exc)
        return internal_error_response("Registration failed")


@bp.post("/login")
def login() -> Any:
    """Login user."""
    try:
        # Ensure database session is available
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception as db_check:
            current_app.logger.exception("Database connection check failed: %s", db_check)
            return internal_error_response(ErrorMessages.DATABASE_CONNECTION_ERROR)
        data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
        email = data.get("email", "").strip().lower()
        password = data.get("password", "").strip()
        
        if not email or not password:
            return error_response("Email and password are required", 400)
        
        try:
            user = User.query.filter_by(email=email).first()
        except Exception as query_error:
            current_app.logger.exception("Database query error during login: %s", query_error)
            db.session.rollback()
            return internal_error_response(ErrorMessages.DATABASE_ERROR)
        
        if not user:
            return unauthorized_response("Invalid email or password")
        
        try:
            password_valid = user.check_password(password)
        except Exception as password_error:
            current_app.logger.exception("Password check error during login: %s", password_error)
            return internal_error_response("Authentication error. Please try again.")
        
        if not password_valid:
            # Log failed login attempt
            try:
                log_login(user.id if user else None, success=False)
            except:
                pass  # Don't fail login if audit logging fails
            return unauthorized_response("Invalid email or password")
        
        # Check if account is active (database column, not method)
        try:
            account_active = user.is_active if hasattr(user, 'is_active') else True
        except Exception as active_check_error:
            current_app.logger.warning(f"Error checking is_active: {active_check_error}")
            account_active = True  # Default to active if we can't check
        
        if not account_active:
            return error_response("Account is deactivated", 403)
        
        # Create user dict BEFORE creating session to avoid any transaction issues
        # Use read-only approach - no database modifications
        try:
            subscription_type = user.subscription_type or DEFAULT_SUBSCRIPTION_TYPE
            is_active = subscription_type == SubscriptionTier.FREE
            if user.subscription_expires_at:
                is_active = normalize_datetime(utcnow()) < normalize_datetime(user.subscription_expires_at)
            
            days_remaining = 0
            if user.subscription_expires_at:
                remaining = (normalize_datetime(user.subscription_expires_at) - normalize_datetime(utcnow())).days
                days_remaining = max(0, remaining)
            
            user_dict = {
                "id": user.id,
                "email": user.email,
                "subscription_type": subscription_type,
                "subscription_expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
                "payment_status": user.payment_status or DEFAULT_PAYMENT_STATUS,
                "is_active": is_active,
                "days_remaining": days_remaining,
            }
        except Exception as dict_error:
            current_app.logger.exception("Failed to create user dict: %s", dict_error)
            current_app.logger.error(f"User dict error traceback: {traceback.format_exc()}")
            # Fallback to minimal user info
            try:
                user_dict = {
                    "id": user.id,
                    "email": user.email,
                    "subscription_type": getattr(user, 'subscription_type', None) or DEFAULT_SUBSCRIPTION_TYPE,
                    "subscription_expires_at": user.subscription_expires_at.isoformat() if hasattr(user, 'subscription_expires_at') and user.subscription_expires_at else None,
                    "payment_status": getattr(user, 'payment_status', None) or DEFAULT_PAYMENT_STATUS,
                    "is_active": True,
                    "days_remaining": 0,
                }
            except Exception as fallback_error:
                current_app.logger.exception("Even fallback user dict failed: %s", fallback_error)
                # Absolute minimal fallback
                user_dict = {
                    "id": user.id,
                    "email": user.email,
                    "subscription_type": DEFAULT_SUBSCRIPTION_TYPE,
                    "subscription_expires_at": None,
                    "payment_status": DEFAULT_PAYMENT_STATUS,
                    "is_active": True,
                    "days_remaining": 0,
                }
        
        # Create session (this will commit the transaction)
        try:
            # Ensure database connection is still valid
            try:
                db.session.execute(db.text("SELECT 1"))
            except Exception as db_check:
                current_app.logger.exception("Database connection lost before session creation: %s", db_check)
                db.session.rollback()
                return internal_error_response(ErrorMessages.DATABASE_CONNECTION_ERROR)
            
            session = create_user_session(user.id, request.remote_addr, request.headers.get("User-Agent"))
        except Exception as session_error:
            current_app.logger.exception("Failed to create user session: user_id=%s, error=%s", user.id, session_error)
            current_app.logger.error(f"Session creation traceback: {traceback.format_exc()}")
            try:
                db.session.rollback()
            except:
                pass
            # Return a generic error message to avoid exposing internal details
            return internal_error_response("Failed to create session. Please try again.")
        
        # Ensure session_token exists before returning
        if not session or not hasattr(session, 'session_token') or not session.session_token:
            current_app.logger.error("Session created but session_token is missing: user_id=%s", user.id)
            try:
                db.session.rollback()
            except:
                pass
            return internal_error_response("Failed to create session token. Please try again.")
        
        # Log successful login (don't fail if this fails)
        try:
            log_login(user.id, success=True)
        except Exception as log_error:
            current_app.logger.warning(f"Failed to log login: {log_error}")
        
        # Don't include "success" in response_data - success_response adds it automatically
        response_data = {
            "user": user_dict,
            "session_token": session.session_token,
        }
        
        return success_response(response_data)
    except Exception as exc:
        current_app.logger.exception("Login failed: %s", exc)
        current_app.logger.error(f"Login error traceback: {traceback.format_exc()}")
        try:
            db.session.rollback()
        except:
            pass
        return internal_error_response("Login failed. Please try again.")


@bp.post("/logout")
@require_auth
def logout() -> Any:
    """Logout user."""
    session = get_current_session()
    if session:
        db.session.delete(session)
        db.session.commit()
    
    return success_response()


@bp.get("/me")
@require_auth
def get_current_user() -> Any:
    """Get current user info."""
    try:
        session = get_current_session()
        if not session:
            return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
        
        user = session.user
        if not user:
            return not_found_response("User")
        
        try:
            user_dict = user.to_dict()
        except Exception as dict_error:
            current_app.logger.exception("Failed to serialize user to dict: %s", dict_error)
            # Fallback to basic user info
            user_dict = {
                "id": user.id,
                "email": user.email,
                "subscription_type": getattr(user, 'subscription_type', None) or DEFAULT_SUBSCRIPTION_TYPE,
                "subscription_expires_at": serialize_datetime(user.subscription_expires_at) if hasattr(user, 'subscription_expires_at') and user.subscription_expires_at else None,
                "payment_status": getattr(user, 'payment_status', None) or DEFAULT_PAYMENT_STATUS,
                "is_active": getattr(user, 'is_active', True),
            }
        
        return success_response({"user": user_dict})
    except Exception as exc:
        current_app.logger.exception("Failed to get current user: %s", exc)
        return internal_error_response(ErrorMessages.INTERNAL_SERVER_ERROR)


@bp.post("/forgot-password")
def forgot_password() -> Any:
    """Request password reset."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip().lower()
    
    if not email:
        return error_response(ErrorMessages.EMAIL_REQUIRED, 400)
    
    user = User.query.filter_by(email=email).first()
    if not user:
        # Don't reveal if email exists
        return success_response(message="If email exists, reset link sent")
    
    token = user.generate_reset_token()
    db.session.commit()
    
    # Send email with reset link
    reset_link = f"{os.environ.get('FRONTEND_URL', 'https://ideabunch.com')}/reset-password?token={token}"
    
    try:
        html_content, text_content = password_reset_email(user.email, reset_link)
        email_service.send_email(
            to_email=user.email,
            subject="Reset Your Password - Idea Bunch",
            html_content=html_content,
            text_content=text_content,
        )
        current_app.logger.info(f"Password reset email sent to {email}")
        
        # Log password reset request
        try:
            log_password_reset(user.id)
        except:
            pass  # Don't fail if audit logging fails
    except Exception as e:
        current_app.logger.warning(f"Failed to send password reset email to {email}: {e}")
        # Still return success to avoid revealing if email exists
    
    return success_response({
        "reset_link": reset_link if os.environ.get("DEBUG") else None,
    }, message="If email exists, reset link sent")


@bp.post("/reset-password")
def reset_password() -> Any:
    """Reset password with token."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    token = data.get("token", "").strip()
    new_password = data.get("password", "").strip()
    
    if not token or not new_password:
        return error_response("Token and password are required", 400)
    
    if len(new_password) < MIN_PASSWORD_LENGTH:
        return error_response(ErrorMessages.PASSWORD_TOO_SHORT, 400)
    
    user = User.query.filter(User.reset_token.isnot(None)).first()
    if not user or not user.verify_reset_token(token):
        return error_response(ErrorMessages.INVALID_OR_EXPIRED_TOKEN, 400)
    
    user.set_password(new_password)
    user.clear_reset_token()
    db.session.commit()
    
    # Send confirmation email
    try:
        html_content, text_content = password_changed_email(user.email)
        email_service.send_email(
            to_email=user.email,
            subject="Password Changed - Idea Bunch",
            html_content=html_content,
            text_content=text_content,
        )
    except Exception as e:
        current_app.logger.warning(f"Failed to send password changed email to {user.email}: {e}")
    
    return success_response(message="Password reset successful")


@bp.post("/change-password")
@require_auth
def change_password() -> Any:
    """Change password (requires current password)."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    current_password = data.get("current_password", "").strip()
    new_password = data.get("new_password", "").strip()
    
    if not current_password or not new_password:
        return error_response("Current and new passwords are required", 400)
    
    if len(new_password) < MIN_PASSWORD_LENGTH:
        return error_response(ErrorMessages.PASSWORD_TOO_SHORT, 400)
    
    user = session.user
    if not user.check_password(current_password):
        return error_response("Current password is incorrect", 400)
    
    user.set_password(new_password)
    db.session.commit()
    
    # Send confirmation email
    try:
        html_content, text_content = password_changed_email(user.email)
        email_service.send_email(
            to_email=user.email,
            subject="Password Changed - Idea Bunch",
            html_content=html_content,
            text_content=text_content,
        )
    except Exception as e:
        current_app.logger.warning(f"Failed to send password changed email to {user.email}: {e}")
    
    return success_response(message="Password changed successfully")

