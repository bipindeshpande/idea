"""Admin routes blueprint - admin dashboard and management endpoints."""
from flask import Blueprint, request, Response, current_app
from typing import Any, Dict
from datetime import datetime, timedelta
from pathlib import Path
import os
import json
import secrets
import csv
from io import StringIO

from sqlalchemy import func, extract
from sqlalchemy.orm import joinedload

from app.models.database import (
    db, User, UserSession, UserRun, UserValidation, Payment,
    SubscriptionCancellation, Admin, AdminResetToken, SystemSettings,
    SubscriptionTier, PaymentStatus
)
from app.utils import check_admin_auth
from app.utils.json_helpers import safe_json_dumps
from app.utils.response_helpers import (
    success_response, error_response, forbidden_response,
    internal_error_response
)
from app.utils.serialization import serialize_datetime
from app.constants import (
    ADMIN_USER_DETAIL_LIMIT, ADMIN_PAYMENTS_LIMIT, ADMIN_SESSIONS_LIMIT,
    DEFAULT_SUBSCRIPTION_TYPE, DEFAULT_PAYMENT_STATUS,
    MIN_PASSWORD_LENGTH, DEV_MFA_CODE,
    ErrorMessages,
)
from app.services.email_service import email_service
from app.services.email_templates import (
    admin_password_reset_email,
    get_base_template,
)

bp = Blueprint("admin", __name__)

# Note: Rate limits will be applied after blueprint registration in api.py


@bp.post("/api/admin/save-validation-questions")
def save_validation_questions() -> Any:
    """Save validation questions configuration (admin only)."""
    if not check_admin_auth():
        return forbidden_response(ErrorMessages.UNAUTHORIZED)
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    questions = data.get("questions", {})
    
    try:
        # Save to a JSON file (you can later update the JS file manually or automate it)
        config_dir = Path("frontend/src/config")
        config_dir.mkdir(parents=True, exist_ok=True)
        output_file = config_dir / "validationQuestions.json"
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        
        return success_response(message="Validation questions saved")
    except Exception as exc:
        current_app.logger.exception("Failed to save validation questions: %s", exc)
        return internal_error_response(str(exc))


@bp.post("/api/admin/save-intake-fields")
def save_intake_fields() -> Any:
    """Save intake form fields configuration (admin only)."""
    if not check_admin_auth():
        return forbidden_response(ErrorMessages.UNAUTHORIZED)
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    fields = data.get("fields", [])
    
    try:
        # Save to a JSON file
        config_dir = Path("frontend/src/config")
        config_dir.mkdir(parents=True, exist_ok=True)
        output_file = config_dir / "intakeScreen.json"
        
        config_data = {
            "screen_id": data.get("screen_id", "idea_finder_input"),
            "screen_title": data.get("screen_title", "Tell Us About You"),
            "description": data.get("description", ""),
            "fields": fields,
            "output_object": "basicProfile.json",
        }
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False)
        
        current_app.logger.info(f"Intake fields saved to {output_file}")
        return success_response(message="Intake fields saved")
    except Exception as exc:
        current_app.logger.exception("Failed to save intake fields: %s", exc)
        return internal_error_response(str(exc))


@bp.get("/api/admin/stats")
def get_admin_stats() -> Any:
    """Get admin statistics (admin only)."""
    if not check_admin_auth():
        return forbidden_response(ErrorMessages.UNAUTHORIZED)
    
    try:
        # Get stats from database
        total_users = User.query.count()
        total_runs = UserRun.query.count()
        total_validations = UserValidation.query.count()
        total_payments = Payment.query.filter_by(status=PaymentStatus.COMPLETED).count()
        total_revenue = db.session.query(func.sum(Payment.amount)).filter_by(status=PaymentStatus.COMPLETED).scalar() or 0
        
        # Subscription stats
        active_subscriptions = User.query.filter(
            User.payment_status == PaymentStatus.ACTIVE,
            User.subscription_expires_at > datetime.utcnow()
        ).count()
        free_trial_users = User.query.filter_by(subscription_type=SubscriptionTier.FREE_TRIAL).count()
        weekly_subscribers = User.query.filter_by(subscription_type="weekly").count()  # Legacy
        starter_subscribers = User.query.filter_by(subscription_type=SubscriptionTier.STARTER).count()
        pro_subscribers = User.query.filter_by(subscription_type=SubscriptionTier.PRO).count()
        # Backward compatibility: monthly subscribers (migrated to pro)
        monthly_subscribers = User.query.filter_by(subscription_type="monthly").count()  # Legacy
        
        stats = {
            "total_users": total_users,
            "total_runs": total_runs,
            "total_validations": total_validations,
            "total_payments": total_payments,
            "total_revenue": float(total_revenue),
            "active_subscriptions": active_subscriptions,
            "free_trial_users": free_trial_users,
            "weekly_subscribers": weekly_subscribers,
            "starter_subscribers": starter_subscribers,
            "pro_subscribers": pro_subscribers,
            "monthly_subscribers": monthly_subscribers,  # Backward compatibility (migrated to pro)
        }
        
        return success_response({"stats": stats})
    except Exception as exc:
        current_app.logger.exception("Failed to get admin stats: %s", exc)
        return internal_error_response(str(exc))


@bp.get("/api/admin/users")
def get_admin_users() -> Any:
    """Get all users (admin only)."""
    if not check_admin_auth():
        return forbidden_response(ErrorMessages.UNAUTHORIZED)
    
    try:
        users = User.query.order_by(User.created_at.desc()).all()
        users_data = [user.to_dict() for user in users]
        return success_response({"users": users_data})
    except Exception as exc:
        current_app.logger.exception("Failed to get users: %s", exc)
        return internal_error_response(str(exc))


@bp.get("/api/admin/payments")
def get_admin_payments() -> Any:
    """Get all payments (admin only)."""
    if not check_admin_auth():
        return forbidden_response(ErrorMessages.UNAUTHORIZED)
    
    try:
        # Use eager loading to prevent N+1 queries when accessing p.user.email
        payments = Payment.query.options(
            joinedload(Payment.user)
        ).order_by(Payment.created_at.desc()).limit(100).all()
        payments_data = [{
            "id": p.id,
            "user_id": p.user_id,
            "user_email": p.user.email if p.user else "N/A",
            "amount": p.amount,
            "currency": p.currency,
            "subscription_type": p.subscription_type,
            "status": p.status,
            "stripe_payment_intent_id": p.stripe_payment_intent_id,
            "created_at": serialize_datetime(p.created_at),
            "completed_at": serialize_datetime(p.completed_at),
        } for p in payments]
        return success_response({"payments": payments_data})
    except Exception as exc:
        current_app.logger.exception("Failed to get payments: %s", exc)
        return internal_error_response(str(exc))


@bp.get("/api/admin/settings")
def get_admin_settings() -> Any:
    """Get system settings (admin only)."""
    if not check_admin_auth():
        return forbidden_response(ErrorMessages.UNAUTHORIZED)
    
    try:
        debug_mode = SystemSettings.get_setting("debug_mode", "false")
        return success_response({
            "settings": {
                "debug_mode": debug_mode.lower() == "true"
            }
        })
    except Exception as exc:
        current_app.logger.exception("Failed to get settings: %s", exc)
        return internal_error_response(str(exc))


@bp.post("/api/admin/settings")
def update_admin_settings() -> Any:
    """Update system settings (admin only)."""
    if not check_admin_auth():
        return forbidden_response(ErrorMessages.UNAUTHORIZED)
    
    try:
        data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
        debug_mode = data.get("debug_mode")
        
        admin_email = os.environ.get("ADMIN_EMAIL", "admin")
        
        if debug_mode is not None:
            SystemSettings.set_setting(
                "debug_mode",
                "true" if debug_mode else "false",
                "Debug mode toggle - controls Flask debug mode",
                updated_by=admin_email
            )
        
        return success_response(message="Settings updated")
    except Exception as exc:
        current_app.logger.exception("Failed to update settings: %s", exc)
        return internal_error_response(str(exc))


@bp.get("/api/admin/user/<int:user_id>")
def get_admin_user_detail(user_id: int) -> Any:
    """Get detailed user information (admin only)."""
    if not check_admin_auth():
        return forbidden_response(ErrorMessages.UNAUTHORIZED)
    
    try:
        # Use get_or_404 with eager loading if needed
        user = User.query.get_or_404(user_id)
        
        # Batch load related data - these queries are already optimized with limits
        runs = UserRun.query.filter_by(user_id=user_id, is_deleted=False).order_by(UserRun.created_at.desc()).limit(ADMIN_USER_DETAIL_LIMIT).all()
        validations = UserValidation.query.filter_by(user_id=user_id, is_deleted=False).order_by(UserValidation.created_at.desc()).limit(ADMIN_USER_DETAIL_LIMIT).all()
        payments = Payment.query.filter_by(user_id=user_id).order_by(Payment.created_at.desc()).limit(ADMIN_PAYMENTS_LIMIT).all()
        sessions = UserSession.query.filter_by(user_id=user_id).order_by(UserSession.created_at.desc()).limit(ADMIN_SESSIONS_LIMIT).all()
        
        return success_response({
            "user": user.to_dict(),
            "runs": [{
                "id": r.id,
                "run_id": r.run_id,
                "created_at": serialize_datetime(r.created_at),
            } for r in runs],
            "validations": [{
                "id": v.id,
                "validation_id": v.validation_id,
                "created_at": serialize_datetime(v.created_at),
            } for v in validations],
            "payments": [{
                "id": p.id,
                "amount": p.amount,
                "currency": p.currency,
                "subscription_type": p.subscription_type,
                "status": p.status,
                "created_at": serialize_datetime(p.created_at),
            } for p in payments],
            "sessions": [{
                "id": s.id,
                "created_at": serialize_datetime(s.created_at),
                "expires_at": serialize_datetime(s.expires_at),
                "ip_address": s.ip_address,
            } for s in sessions],
        })
    except Exception as exc:
        current_app.logger.exception("Failed to get user detail: %s", exc)
        return internal_error_response(str(exc))


@bp.post("/api/admin/user/<int:user_id>/subscription")
def update_user_subscription(user_id: int) -> Any:
    """Update user subscription (admin only)."""
    if not check_admin_auth():
        return forbidden_response(ErrorMessages.UNAUTHORIZED)
    
    try:
        user = User.query.get_or_404(user_id)
        data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
        
        subscription_type = data.get("subscription_type", "").strip()
        duration_days = data.get("duration_days", 0)
        
        if subscription_type and duration_days > 0:
            user.activate_subscription(subscription_type, duration_days)
            db.session.commit()
            return success_response({"user": user.to_dict()}, message="Subscription updated")
        else:
            return error_response("Invalid subscription data", 400)
    except Exception as exc:
        current_app.logger.exception("Failed to update subscription: %s", exc)
        return internal_error_response(str(exc))


@bp.post("/api/admin/login")
def admin_login() -> Any:
    """Verify admin password."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    password = data.get("password", "").strip()
    
    if not password:
        return error_response("Password is required", 400)
    
    # Get admin email from environment
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    
    # Check if we're in production
    flask_env = os.environ.get("FLASK_ENV", "").lower()
    is_production = flask_env == "production"
    
    if not admin_email:
        if is_production:
            current_app.logger.error("ADMIN_EMAIL not configured in production")
            return error_response("Admin authentication not configured", 500)
        # Development: Allow fallback to environment variable
        admin_password = os.environ.get("ADMIN_PASSWORD")
        if not admin_password:
            current_app.logger.warning("ADMIN_PASSWORD not set in development - admin login may fail")
            return error_response("Incorrect password", 401)
        if password == admin_password:
            return success_response()
        return error_response("Incorrect password", 401)
    
    # Check against database (preferred method)
    admin = Admin.query.filter_by(email=admin_email).first()
    if admin and admin.check_password(password):
        return success_response()
    
    # Fallback to environment variable only in development
    if not is_production:
        admin_password = os.environ.get("ADMIN_PASSWORD")
        if admin_password and password == admin_password:
            current_app.logger.warning("Using ADMIN_PASSWORD from environment (development only)")
            return success_response()
    
    return error_response("Incorrect password", 401)


@bp.get("/api/admin/mfa-setup")
def admin_mfa_setup() -> Any:
    """Get MFA setup information (secret and QR code data)."""
    if not check_admin_auth():
        return forbidden_response(ErrorMessages.UNAUTHORIZED)
    
    # Get admin email from environment
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    
    # Get MFA secret from admin record or environment
    mfa_secret = None
    if admin_email:
        admin = Admin.query.filter_by(email=admin_email).first()
        if admin and admin.mfa_secret:
            mfa_secret = admin.mfa_secret
    
    # Fallback to environment variable or default
    if not mfa_secret:
        mfa_secret = os.environ.get("ADMIN_MFA_SECRET", "JBSWY3DPEHPK3PXP")
    
    # Generate QR code URI for authenticator apps
    try:
        import pyotp
        totp_uri = pyotp.totp.TOTP(mfa_secret).provisioning_uri(
            name=admin_email or "Admin",
            issuer_name="Startup Idea Advisor"
        )
        return success_response({
            "secret": mfa_secret,
            "qr_uri": totp_uri,
            "manual_entry_key": mfa_secret,
        })
    except ImportError:
        # If pyotp is not installed, return secret only
        return success_response({
            "secret": mfa_secret,
            "manual_entry_key": mfa_secret,
            "warning": "pyotp not installed. Install with: pip install pyotp for QR code generation"
        })


@bp.post("/api/admin/verify-mfa")
def admin_verify_mfa() -> Any:
    """Verify MFA code for admin."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    mfa_code = data.get("mfa_code", "").strip()
    
    if not mfa_code:
        return error_response(ErrorMessages.MFA_CODE_REQUIRED, 400)
    
    # Check if we're in development mode
    flask_env = os.environ.get("FLASK_ENV", "").lower()
    is_production = flask_env == "production"
    
    # Development mode: Allow dev MFA code for easier testing
    if not is_production:
        dev_mfa_code = os.environ.get("DEV_MFA_CODE", DEV_MFA_CODE)
        if mfa_code == dev_mfa_code:
            current_app.logger.warning("Using development MFA code - this should not be used in production")
            return success_response(message="MFA code verified")
    
    # Production mode: TOTP validation (required in production)
    # Get admin email from environment
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    
    # Get MFA secret from admin record or environment
    mfa_secret = None
    if admin_email:
        admin = Admin.query.filter_by(email=admin_email).first()
        if admin and admin.mfa_secret:
            mfa_secret = admin.mfa_secret
    
    # Fallback to environment variable
    if not mfa_secret:
        mfa_secret = os.environ.get("ADMIN_MFA_SECRET")
        if not mfa_secret and is_production:
            current_app.logger.error("ADMIN_MFA_SECRET not configured in production")
            return internal_error_response(ErrorMessages.MFA_VERIFICATION_NOT_CONFIGURED)
        # Use default only in development
        if not mfa_secret:
            mfa_secret = os.environ.get("ADMIN_MFA_SECRET", "JBSWY3DPEHPK3PXP")
    
    # Verify TOTP code
    try:
        import pyotp
        totp = pyotp.TOTP(mfa_secret)
        # Allow current and adjacent time windows for clock skew tolerance
        is_valid = totp.verify(mfa_code, valid_window=1)
        
        if is_valid:
            return success_response(message="MFA code verified")
        else:
            return error_response("Invalid MFA code. Please check the code from your authenticator app.", 401)
    except ImportError:
        if is_production:
            current_app.logger.error("pyotp not installed. Cannot verify TOTP codes in production.")
            return internal_error_response(ErrorMessages.MFA_VERIFICATION_NOT_CONFIGURED)
        # In development, fall back to dev code if pyotp not installed
        dev_mfa_code = os.environ.get("DEV_MFA_CODE", DEV_MFA_CODE)
        if mfa_code == dev_mfa_code:
            current_app.logger.warning("pyotp not installed, using development MFA code")
            return success_response(message="MFA code verified")
        return error_response(ErrorMessages.INVALID_MFA_CODE, 401)
    except Exception as e:
        current_app.logger.error(f"MFA verification error: {e}")
        return internal_error_response(ErrorMessages.MFA_VERIFICATION_FAILED)


@bp.post("/api/admin/forgot-password")
def admin_forgot_password() -> Any:
    """Request admin password reset."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip().lower()
    
    if not email:
        return error_response(ErrorMessages.EMAIL_REQUIRED, 400)
    
    # Get admin email from environment
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    
    if not admin_email:
        return internal_error_response(ErrorMessages.ADMIN_EMAIL_NOT_CONFIGURED)
    
    # Verify email matches admin email
    if email != admin_email:
        # Don't reveal if email exists
        return success_response(message="If email exists, reset link sent")
    
    # Generate reset token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    
    # Delete any existing unused tokens for this email
    AdminResetToken.query.filter_by(email=email, used=False).delete()
    
    # Create new reset token
    reset_token = AdminResetToken(
        token=token,
        email=email,
        expires_at=expires_at,
    )
    db.session.add(reset_token)
    db.session.commit()
    
    # Send email with reset link
    reset_link = f"{os.environ.get('FRONTEND_URL', 'https://ideabunch.com')}/admin/reset-password?token={token}"
    
    try:
        html_content, text_content = admin_password_reset_email(email, reset_link)
        email_service.send_email(
            to_email=email,
            subject="Admin Password Reset - Startup Idea Advisor",
            html_content=html_content,
            text_content=text_content,
        )
        current_app.logger.info(f"Admin password reset email sent to {email}")
    except Exception as e:
        current_app.logger.warning(f"Failed to send admin password reset email to {email}: {e}")
        # Still return success to avoid revealing if email exists
    
    return success_response({
        "reset_link": reset_link if os.environ.get("DEBUG") else None,
    }, message="If email exists, reset link sent")


@bp.post("/api/admin/reset-password")
def admin_reset_password() -> Any:
    """Reset admin password with token."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    token = data.get("token", "").strip()
    new_password = data.get("password", "").strip()
    
    if not token or not new_password:
        return error_response("Token and password are required", 400)
    
    if len(new_password) < MIN_PASSWORD_LENGTH:
        return error_response(ErrorMessages.PASSWORD_TOO_SHORT, 400)
    
    # Find reset token
    reset_token = AdminResetToken.query.filter_by(token=token).first()
    
    if not reset_token or not reset_token.is_valid():
        return error_response(ErrorMessages.INVALID_OR_EXPIRED_TOKEN, 400)
    
    # Mark token as used
    reset_token.used = True
    
    # Get or create admin user
    admin = Admin.get_or_create_admin(reset_token.email)
    
    # Update admin password
    admin.set_password(new_password)
    db.session.commit()
    
    current_app.logger.info(f"Admin password reset successful for {reset_token.email}")
    
    return success_response(message="Password reset successfully. You can now login with your new password.")


@bp.delete("/api/admin/data/clear-validations-runs")
def clear_validations_and_runs() -> Any:
    """Delete all validations, runs, and user sessions (admin only)."""
    if not check_admin_auth():
        return forbidden_response(ErrorMessages.UNAUTHORIZED)
    
    try:
        # Get counts before deletion for logging
        runs_count = UserRun.query.count()
        validations_count = UserValidation.query.count()
        sessions_count = UserSession.query.count()
        
        # Delete all runs
        UserRun.query.delete()
        
        # Delete all validations
        UserValidation.query.delete()
        
        # Delete all user sessions
        UserSession.query.delete()
        
        # Commit the deletions
        db.session.commit()
        
        current_app.logger.info(f"Admin cleared all data: {runs_count} runs, {validations_count} validations, and {sessions_count} sessions deleted")
        
        return success_response({
            "deleted": {
                "runs": runs_count,
                "validations": validations_count,
                "sessions": sessions_count
            }
        }, message=f"Successfully deleted {runs_count} runs, {validations_count} validations, and {sessions_count} sessions")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to clear validations and runs: %s", exc)
        return internal_error_response(str(exc))


@bp.get("/api/admin/reports/export")
def export_report() -> Any:
    """Export reports as CSV (admin only)."""
    if not check_admin_auth():
        return forbidden_response(ErrorMessages.UNAUTHORIZED)
    
    report_type = request.args.get("type", "full")
    
    try:
        output = StringIO()
        writer = csv.writer(output)
        
        if report_type == "users":
            writer.writerow(["ID", "Email", "Subscription Type", "Payment Status", "Days Remaining", "Created At", "Subscription Started", "Subscription Expires"])
            users = User.query.all()
            for user in users:
                writer.writerow([
                    user.id,
                    user.email,
                    user.subscription_type or DEFAULT_SUBSCRIPTION_TYPE,
                    user.payment_status or "inactive",
                    user.days_remaining(),
                    serialize_datetime(user.created_at) or "",
                    serialize_datetime(user.subscription_started_at) or "",
                    serialize_datetime(user.subscription_expires_at) or "",
                ])
        
        elif report_type == "payments":
            writer.writerow(["ID", "User Email", "Amount", "Currency", "Subscription Type", "Status", "Stripe Payment Intent ID", "Created At", "Completed At"])
            # Use eager loading to prevent N+1 queries
            payments = Payment.query.options(
                joinedload(Payment.user)
            ).order_by(Payment.created_at.desc()).all()
            for payment in payments:
                writer.writerow([
                    payment.id,
                    payment.user.email if payment.user else "N/A",
                    payment.amount,
                    payment.currency,
                    payment.subscription_type,
                    payment.status,
                    payment.stripe_payment_intent_id or "",
                    serialize_datetime(payment.created_at) or "",
                    serialize_datetime(payment.completed_at) or "",
                ])
        
        elif report_type == "activity":
            writer.writerow(["Type", "ID", "User Email", "Run/Validation ID", "Created At"])
            # Use eager loading to prevent N+1 queries
            runs = UserRun.query.options(
                joinedload(UserRun.user)
            ).filter_by(is_deleted=False).order_by(UserRun.created_at.desc()).all()
            for run in runs:
                writer.writerow([
                    "Run",
                    run.id,
                    run.user.email if run.user else "N/A",
                    run.run_id,
                    serialize_datetime(run.created_at) or "",
                ])
            validations = UserValidation.query.options(
                joinedload(UserValidation.user)
            ).filter_by(is_deleted=False).order_by(UserValidation.created_at.desc()).all()
            for validation in validations:
                writer.writerow([
                    "Validation",
                    validation.id,
                    validation.user.email if validation.user else "N/A",
                    validation.validation_id,
                    serialize_datetime(validation.created_at) or "",
                ])
        
        elif report_type == "subscriptions":
            writer.writerow(["User Email", "Subscription Type", "Status", "Started At", "Expires At", "Days Remaining", "Monthly Validations Used", "Monthly Discoveries Used"])
            # Filter deleted users and use index on subscription_type
            users = User.query.filter(
                User.subscription_type.in_(["starter", "pro", "weekly"]),
                User.is_active == True
            ).all()
            for user in users:
                writer.writerow([
                    user.email,
                    user.subscription_type,
                    PaymentStatus.ACTIVE if user.is_subscription_active() else PaymentStatus.FAILED,  # Using FAILED as expired
                    serialize_datetime(user.subscription_started_at) or "",
                    serialize_datetime(user.subscription_expires_at) or "",
                    user.days_remaining(),
                    user.monthly_validations_used,
                    user.monthly_discoveries_used,
                ])
        
        elif report_type == "revenue":
            writer.writerow(["Period", "Total Revenue", "Payment Count", "Average Payment", "Subscription Type Breakdown"])
            # Group by month - use eager loading and filter efficiently
            payments = Payment.query.filter_by(status="completed").order_by(Payment.created_at.desc()).all()
            revenue_by_month = {}
            for payment in payments:
                if payment.created_at:
                    month_key = payment.created_at.strftime("%Y-%m")
                    if month_key not in revenue_by_month:
                        revenue_by_month[month_key] = {"revenue": 0, "count": 0, "types": {}}
                    revenue_by_month[month_key]["revenue"] += payment.amount
                    revenue_by_month[month_key]["count"] += 1
                    sub_type = payment.subscription_type or "unknown"
                    revenue_by_month[month_key]["types"][sub_type] = revenue_by_month[month_key]["types"].get(sub_type, 0) + payment.amount
            
            for month, data in sorted(revenue_by_month.items()):
                avg = data["revenue"] / data["count"] if data["count"] > 0 else 0
                types_str = ", ".join([f"{k}: ${v:.2f}" for k, v in data["types"].items()])
                writer.writerow([
                    month,
                    f"${data['revenue']:.2f}",
                    data["count"],
                    f"${avg:.2f}",
                    types_str,
                ])
        
        else:  # full report
            writer.writerow(["Report Type", "Data"])
            # Users
            writer.writerow(["USERS", ""])
            writer.writerow(["ID", "Email", "Subscription Type", "Payment Status", "Days Remaining", "Created At"])
            users = User.query.all()
            for user in users:
                writer.writerow([
                    user.id,
                    user.email,
                    user.subscription_type or DEFAULT_SUBSCRIPTION_TYPE,
                    user.payment_status or "inactive",
                    user.days_remaining(),
                    serialize_datetime(user.created_at) or "",
                ])
            writer.writerow([])
            # Payments
            writer.writerow(["PAYMENTS", ""])
            writer.writerow(["ID", "User Email", "Amount", "Currency", "Subscription Type", "Status", "Created At"])
            # Use eager loading to prevent N+1 queries
            payments = Payment.query.options(
                joinedload(Payment.user)
            ).order_by(Payment.created_at.desc()).all()
            for payment in payments:
                writer.writerow([
                    payment.id,
                    payment.user.email if payment.user else "N/A",
                    payment.amount,
                    payment.currency,
                    payment.subscription_type,
                    payment.status,
                    serialize_datetime(payment.created_at) or "",
                ])
        
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
        )
    except Exception as exc:
        current_app.logger.exception("Failed to export report: %s", exc)
        return internal_error_response(str(exc))

