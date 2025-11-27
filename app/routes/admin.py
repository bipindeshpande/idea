"""Admin routes blueprint - admin dashboard and management endpoints."""
from flask import Blueprint, request, jsonify, Response, current_app
from typing import Any, Dict
from datetime import datetime, timedelta
from pathlib import Path
import os
import json
import secrets
import csv
from io import StringIO

from sqlalchemy import func, extract

from app.models.database import (
    db, User, UserSession, UserRun, UserValidation, Payment,
    SubscriptionCancellation, Admin, AdminResetToken, SystemSettings
)
from app.utils import check_admin_auth
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
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    questions = data.get("questions", {})
    
    try:
        # Save to a JSON file (you can later update the JS file manually or automate it)
        config_dir = Path("frontend/src/config")
        config_dir.mkdir(parents=True, exist_ok=True)
        output_file = config_dir / "validationQuestions.json"
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        
        return jsonify({"success": True, "message": "Validation questions saved"})
    except Exception as exc:
        current_app.logger.exception("Failed to save validation questions: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.post("/api/admin/save-intake-fields")
def save_intake_fields() -> Any:
    """Save intake form fields configuration (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
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
        return jsonify({"success": True, "message": "Intake fields saved"})
    except Exception as exc:
        current_app.logger.exception("Failed to save intake fields: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.get("/api/admin/stats")
def get_admin_stats() -> Any:
    """Get admin statistics (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    try:
        # Get stats from database
        total_users = User.query.count()
        total_runs = UserRun.query.count()
        total_validations = UserValidation.query.count()
        total_payments = Payment.query.filter_by(status="completed").count()
        total_revenue = db.session.query(func.sum(Payment.amount)).filter_by(status="completed").scalar() or 0
        
        # Subscription stats
        active_subscriptions = User.query.filter(
            User.payment_status == "active",
            User.subscription_expires_at > datetime.utcnow()
        ).count()
        free_trial_users = User.query.filter_by(subscription_type="free_trial").count()
        weekly_subscribers = User.query.filter_by(subscription_type="weekly").count()
        starter_subscribers = User.query.filter_by(subscription_type="starter").count()
        pro_subscribers = User.query.filter_by(subscription_type="pro").count()
        # Backward compatibility: monthly subscribers (migrated to pro)
        monthly_subscribers = User.query.filter_by(subscription_type="monthly").count()
        
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
        
        return jsonify({"success": True, "stats": stats})
    except Exception as exc:
        current_app.logger.exception("Failed to get admin stats: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.get("/api/admin/users")
def get_admin_users() -> Any:
    """Get all users (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    try:
        users = User.query.order_by(User.created_at.desc()).all()
        users_data = [user.to_dict() for user in users]
        return jsonify({"success": True, "users": users_data})
    except Exception as exc:
        current_app.logger.exception("Failed to get users: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.get("/api/admin/payments")
def get_admin_payments() -> Any:
    """Get all payments (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    try:
        payments = Payment.query.order_by(Payment.created_at.desc()).limit(100).all()
        payments_data = [{
            "id": p.id,
            "user_id": p.user_id,
            "user_email": p.user.email,
            "amount": p.amount,
            "currency": p.currency,
            "subscription_type": p.subscription_type,
            "status": p.status,
            "stripe_payment_intent_id": p.stripe_payment_intent_id,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        } for p in payments]
        return jsonify({"success": True, "payments": payments_data})
    except Exception as exc:
        current_app.logger.exception("Failed to get payments: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.get("/api/admin/settings")
def get_admin_settings() -> Any:
    """Get system settings (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    try:
        debug_mode = SystemSettings.get_setting("debug_mode", "false")
        return jsonify({
            "success": True,
            "settings": {
                "debug_mode": debug_mode.lower() == "true"
            }
        })
    except Exception as exc:
        current_app.logger.exception("Failed to get settings: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.post("/api/admin/settings")
def update_admin_settings() -> Any:
    """Update system settings (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
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
        
        return jsonify({"success": True, "message": "Settings updated"})
    except Exception as exc:
        current_app.logger.exception("Failed to update settings: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.get("/api/admin/user/<int:user_id>")
def get_admin_user_detail(user_id: int) -> Any:
    """Get detailed user information (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    try:
        user = User.query.get_or_404(user_id)
        runs = UserRun.query.filter_by(user_id=user_id).order_by(UserRun.created_at.desc()).limit(10).all()
        validations = UserValidation.query.filter_by(user_id=user_id).order_by(UserValidation.created_at.desc()).limit(10).all()
        payments = Payment.query.filter_by(user_id=user_id).order_by(Payment.created_at.desc()).all()
        sessions = UserSession.query.filter_by(user_id=user_id).order_by(UserSession.created_at.desc()).limit(10).all()
        
        return jsonify({
            "success": True,
            "user": user.to_dict(),
            "runs": [{
                "id": r.id,
                "run_id": r.run_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            } for r in runs],
            "validations": [{
                "id": v.id,
                "validation_id": v.validation_id,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            } for v in validations],
            "payments": [{
                "id": p.id,
                "amount": p.amount,
                "currency": p.currency,
                "subscription_type": p.subscription_type,
                "status": p.status,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            } for p in payments],
            "sessions": [{
                "id": s.id,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                "ip_address": s.ip_address,
            } for s in sessions],
        })
    except Exception as exc:
        current_app.logger.exception("Failed to get user detail: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.post("/api/admin/user/<int:user_id>/subscription")
def update_user_subscription(user_id: int) -> Any:
    """Update user subscription (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    try:
        user = User.query.get_or_404(user_id)
        data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
        
        subscription_type = data.get("subscription_type", "").strip()
        duration_days = data.get("duration_days", 0)
        
        if subscription_type and duration_days > 0:
            user.activate_subscription(subscription_type, duration_days)
            db.session.commit()
            return jsonify({"success": True, "message": "Subscription updated", "user": user.to_dict()})
        else:
            return jsonify({"success": False, "error": "Invalid subscription data"}), 400
    except Exception as exc:
        current_app.logger.exception("Failed to update subscription: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.post("/api/admin/login")
def admin_login() -> Any:
    """Verify admin password."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    password = data.get("password", "").strip()
    
    if not password:
        return jsonify({"success": False, "error": "Password is required"}), 400
    
    # Get admin email from environment
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    
    if not admin_email:
        # Fallback to environment variable check
        ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin2024")
        if password == ADMIN_PASSWORD:
            return jsonify({"success": True})
        return jsonify({"success": False, "error": "Incorrect password"}), 401
    
    # Check against database
    admin = Admin.query.filter_by(email=admin_email).first()
    if admin and admin.check_password(password):
        return jsonify({"success": True})
    
    # Fallback to environment variable
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin2024")
    if password == ADMIN_PASSWORD:
        return jsonify({"success": True})
    
    return jsonify({"success": False, "error": "Incorrect password"}), 401


@bp.get("/api/admin/mfa-setup")
def admin_mfa_setup() -> Any:
    """Get MFA setup information (secret and QR code data)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
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
        return jsonify({
            "success": True,
            "secret": mfa_secret,
            "qr_uri": totp_uri,
            "manual_entry_key": mfa_secret,
        })
    except ImportError:
        # If pyotp is not installed, return secret only
        return jsonify({
            "success": True,
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
        return jsonify({"success": False, "error": "MFA code is required"}), 400
    
    # Development mode: Hardcoded MFA code
    # Note: For production, implement proper TOTP validation (see commented code below)
    HARDCODED_MFA_CODE = "2538"
    
    if mfa_code == HARDCODED_MFA_CODE:
        return jsonify({"success": True, "message": "MFA code verified"})
    
    # Production mode: TOTP validation (commented out for now)
    # Uncomment this section when ready for production:
    """
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
    
    # Verify TOTP code
    try:
        import pyotp
        totp = pyotp.TOTP(mfa_secret)
        # Allow current and adjacent time windows for clock skew tolerance
        is_valid = totp.verify(mfa_code, valid_window=1)
        
        if is_valid:
            return jsonify({"success": True, "message": "MFA code verified"})
        else:
            return jsonify({"success": False, "error": "Invalid MFA code. Please check the code from your authenticator app."}), 401
    except ImportError:
        current_app.logger.error("pyotp not installed. Cannot verify TOTP codes.")
        return jsonify({"success": False, "error": "MFA verification not configured"}), 500
    except Exception as e:
        current_app.logger.error(f"MFA verification error: {e}")
        return jsonify({"success": False, "error": "MFA verification failed"}), 500
    """
    
    return jsonify({"success": False, "error": "Invalid MFA code"}), 401


@bp.post("/api/admin/forgot-password")
def admin_forgot_password() -> Any:
    """Request admin password reset."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip().lower()
    
    if not email:
        return jsonify({"success": False, "error": "Email is required"}), 400
    
    # Get admin email from environment
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    
    if not admin_email:
        return jsonify({"success": False, "error": "Admin email not configured"}), 500
    
    # Verify email matches admin email
    if email != admin_email:
        # Don't reveal if email exists
        return jsonify({"success": True, "message": "If email exists, reset link sent"})
    
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
    
    return jsonify({
        "success": True,
        "message": "If email exists, reset link sent",
        # Only include reset_link in DEBUG mode for development
        "reset_link": reset_link if os.environ.get("DEBUG") else None,
    })


@bp.post("/api/admin/reset-password")
def admin_reset_password() -> Any:
    """Reset admin password with token."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    token = data.get("token", "").strip()
    new_password = data.get("password", "").strip()
    
    if not token or not new_password:
        return jsonify({"success": False, "error": "Token and password are required"}), 400
    
    if len(new_password) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters"}), 400
    
    # Find reset token
    reset_token = AdminResetToken.query.filter_by(token=token).first()
    
    if not reset_token or not reset_token.is_valid():
        return jsonify({"success": False, "error": "Invalid or expired reset token"}), 400
    
    # Mark token as used
    reset_token.used = True
    
    # Get or create admin user
    admin = Admin.get_or_create_admin(reset_token.email)
    
    # Update admin password
    admin.set_password(new_password)
    db.session.commit()
    
    current_app.logger.info(f"Admin password reset successful for {reset_token.email}")
    
    return jsonify({
        "success": True,
        "message": "Password reset successfully. You can now login with your new password."
    })


@bp.delete("/api/admin/data/clear-validations-runs")
def clear_validations_and_runs() -> Any:
    """Delete all validations, runs, and user sessions (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
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
        
        return jsonify({
            "success": True,
            "message": f"Successfully deleted {runs_count} runs, {validations_count} validations, and {sessions_count} sessions",
            "deleted": {
                "runs": runs_count,
                "validations": validations_count,
                "sessions": sessions_count
            }
        })
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to clear validations and runs: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.get("/api/admin/reports/export")
def export_report() -> Any:
    """Export reports as CSV (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
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
                    user.subscription_type or "free",
                    user.payment_status or "inactive",
                    user.days_remaining(),
                    user.created_at.isoformat() if user.created_at else "",
                    user.subscription_started_at.isoformat() if user.subscription_started_at else "",
                    user.subscription_expires_at.isoformat() if user.subscription_expires_at else "",
                ])
        
        elif report_type == "payments":
            writer.writerow(["ID", "User Email", "Amount", "Currency", "Subscription Type", "Status", "Stripe Payment Intent ID", "Created At", "Completed At"])
            payments = Payment.query.order_by(Payment.created_at.desc()).all()
            for payment in payments:
                writer.writerow([
                    payment.id,
                    payment.user.email if payment.user else "N/A",
                    payment.amount,
                    payment.currency,
                    payment.subscription_type,
                    payment.status,
                    payment.stripe_payment_intent_id or "",
                    payment.created_at.isoformat() if payment.created_at else "",
                    payment.completed_at.isoformat() if payment.completed_at else "",
                ])
        
        elif report_type == "activity":
            writer.writerow(["Type", "ID", "User Email", "Run/Validation ID", "Created At"])
            runs = UserRun.query.order_by(UserRun.created_at.desc()).all()
            for run in runs:
                writer.writerow([
                    "Run",
                    run.id,
                    run.user.email if run.user else "N/A",
                    run.run_id,
                    run.created_at.isoformat() if run.created_at else "",
                ])
            validations = UserValidation.query.order_by(UserValidation.created_at.desc()).all()
            for validation in validations:
                writer.writerow([
                    "Validation",
                    validation.id,
                    validation.user.email if validation.user else "N/A",
                    validation.validation_id,
                    validation.created_at.isoformat() if validation.created_at else "",
                ])
        
        elif report_type == "subscriptions":
            writer.writerow(["User Email", "Subscription Type", "Status", "Started At", "Expires At", "Days Remaining", "Monthly Validations Used", "Monthly Discoveries Used"])
            users = User.query.filter(User.subscription_type.in_(["starter", "pro", "weekly"])).all()
            for user in users:
                writer.writerow([
                    user.email,
                    user.subscription_type,
                    "active" if user.is_subscription_active() else "expired",
                    user.subscription_started_at.isoformat() if user.subscription_started_at else "",
                    user.subscription_expires_at.isoformat() if user.subscription_expires_at else "",
                    user.days_remaining(),
                    user.monthly_validations_used,
                    user.monthly_discoveries_used,
                ])
        
        elif report_type == "revenue":
            writer.writerow(["Period", "Total Revenue", "Payment Count", "Average Payment", "Subscription Type Breakdown"])
            # Group by month
            payments = Payment.query.filter_by(status="completed").all()
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
                    user.subscription_type or "free",
                    user.payment_status or "inactive",
                    user.days_remaining(),
                    user.created_at.isoformat() if user.created_at else "",
                ])
            writer.writerow([])
            # Payments
            writer.writerow(["PAYMENTS", ""])
            writer.writerow(["ID", "User Email", "Amount", "Currency", "Subscription Type", "Status", "Created At"])
            payments = Payment.query.order_by(Payment.created_at.desc()).all()
            for payment in payments:
                writer.writerow([
                    payment.id,
                    payment.user.email if payment.user else "N/A",
                    payment.amount,
                    payment.currency,
                    payment.subscription_type,
                    payment.status,
                    payment.created_at.isoformat() if payment.created_at else "",
                ])
        
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
        )
    except Exception as exc:
        current_app.logger.exception("Failed to export report: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500

