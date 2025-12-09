"""Public routes blueprint - no authentication required."""
from flask import Blueprint, request, jsonify, current_app
from typing import Any, Dict
import os
import re
import json
from datetime import datetime, timezone

from app.models.database import db, User, UserValidation, UserRun, utcnow
from app.services.email_service import email_service
from app.services.email_templates import get_base_template

bp = Blueprint("public", __name__)


@bp.post("/api/contact")
def contact_form() -> Any:
    """Handle contact form submissions."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    company = data.get("company", "").strip()
    topic = data.get("topic", "").strip()
    message = data.get("message", "").strip()
    
    if not name or not email or not message:
        return jsonify({"success": False, "error": "Name, email, and message are required"}), 400
    
    # Validate email format
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return jsonify({"success": False, "error": "Invalid email format"}), 400
    
    # Get admin email from environment (defaults to FROM_EMAIL if not set)
    admin_email = os.environ.get("ADMIN_EMAIL", os.environ.get("FROM_EMAIL", "noreply@ideabunch.com"))
    
    # Create email content
    company_text = f"<strong>Company:</strong> {company}<br>" if company else ""
    topic_text = f"<strong>Topic:</strong> {topic}<br>" if topic else ""
    
    html_content = f"""
    <h2 style="color: #333; margin-top: 0;">New Contact Form Submission</h2>
    <p><strong>Name:</strong> {name}</p>
    <p><strong>Email:</strong> <a href="mailto:{email}">{email}</a></p>
    {company_text}
    {topic_text}
    <p><strong>Message:</strong></p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 15px 0;">
        {message.replace(chr(10), '<br>')}
    </div>
    <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Reply to: <a href="mailto:{email}">{email}</a>
    </p>
    """
    
    text_content = f"""
New Contact Form Submission

Name: {name}
Email: {email}
{('Company: ' + company) if company else ''}
{('Topic: ' + topic) if topic else ''}

Message:
{message}

Reply to: {email}
"""
    
    try:
        # Send email to admin
        email_service.send_email(
            to_email=admin_email,
            subject=f"Contact Form: {topic or 'General Inquiry'} - {name}",
            html_content=html_content,
            text_content=text_content,
        )
        
        # Send confirmation email to user
        user_confirmation_html = f"""
        <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
        <p>Thank you for reaching out! We've received your message and will get back to you within one business day.</p>
        <p><strong>Your message:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 15px 0;">
            {message.replace(chr(10), '<br>')}
        </div>
        <p style="color: #666; font-size: 14px;">If you have any urgent questions, feel free to reply to this email.</p>
        """
        
        user_confirmation_text = f"""
Hi {name},

Thank you for reaching out! We've received your message and will get back to you within one business day.

Your message:
{message}

If you have any urgent questions, feel free to reply to this email.
"""
        
        email_service.send_email(
            to_email=email,
            subject="We've received your message - Idea Bunch",
            html_content=get_base_template(user_confirmation_html),
            text_content=user_confirmation_text,
        )
        
        current_app.logger.info(f"Contact form submission from {email} sent to {admin_email}")
        
        return jsonify({
            "success": True,
            "message": "Thank you for your message! We'll get back to you soon.",
        })
    except Exception as exc:
        current_app.logger.exception("Contact form submission failed: %s", exc)
        return jsonify({"success": False, "error": "Failed to send message"}), 500


@bp.get("/api/public/usage-stats")
def get_public_usage_stats() -> Any:
    """Get anonymized usage statistics for social proof."""
    try:
        # Check database connection first
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception as db_check:
            current_app.logger.exception("Database connection check failed in usage-stats: %s", db_check)
            # Return default stats on database error
            return jsonify({
                "success": True,
                "stats": {
                    "total_users": 0,
                    "validations_this_month": 0,
                    "discoveries_this_month": 0,
                    "total_validations": 0,
                    "total_discoveries": 0,
                    "average_score": 0,
                },
            })
        
        # Count total users (active users who have actually used the service)
        # Only count users who have completed at least one validation or discovery
        try:
            from sqlalchemy import or_
            # Get distinct user IDs who have completed validations or runs
            users_with_validations = db.session.query(UserValidation.user_id).filter(
                UserValidation.is_deleted == False,
                UserValidation.status == "completed"
            ).distinct()
            
            users_with_runs = db.session.query(UserRun.user_id).filter(
                UserRun.is_deleted == False,
                UserRun.status == "completed"
            ).distinct()
            
            # Count active users who appear in either list
            total_users = User.query.filter(
                User.is_active == True,
                or_(
                    User.id.in_(users_with_validations),
                    User.id.in_(users_with_runs)
                )
            ).count()
        except Exception as e:
            current_app.logger.warning(f"Failed to count users: {e}")
            # Fallback to simple count if the query fails
            try:
                total_users = User.query.filter_by(is_active=True).count()
            except:
                total_users = 0
        
        # Count total validations (this month) - use index on created_at
        # Only count completed validations that are not deleted
        this_month_start = utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        try:
            validations_this_month = UserValidation.query.filter(
                UserValidation.created_at >= this_month_start,
                UserValidation.is_deleted == False,
                UserValidation.status == "completed"
            ).count()
        except Exception as e:
            current_app.logger.warning(f"Failed to count validations this month: {e}")
            validations_this_month = 0
        
        # Count total discoveries (this month) - use index on created_at
        # Only count completed discoveries that are not deleted
        try:
            discoveries_this_month = UserRun.query.filter(
                UserRun.created_at >= this_month_start,
                UserRun.is_deleted == False,
                UserRun.status == "completed"
            ).count()
        except Exception as e:
            current_app.logger.warning(f"Failed to count discoveries this month: {e}")
            discoveries_this_month = 0
        
        # Count total validations (all time) - exclude deleted and only count completed
        try:
            total_validations = UserValidation.query.filter(
                UserValidation.is_deleted == False,
                UserValidation.status == "completed"
            ).count()
        except Exception as e:
            current_app.logger.warning(f"Failed to count total validations: {e}")
            total_validations = 0
        
        # Count total discoveries (all time) - exclude deleted and only count completed
        try:
            total_discoveries = UserRun.query.filter(
                UserRun.is_deleted == False,
                UserRun.status == "completed"
            ).count()
        except Exception as e:
            current_app.logger.warning(f"Failed to count total discoveries: {e}")
            total_discoveries = 0
        
        # Calculate average validation score (from last 100 validations) - exclude deleted and only count completed
        total_score = 0
        score_count = 0
        try:
            recent_validations = UserValidation.query.filter(
                UserValidation.is_deleted == False,
                UserValidation.status == "completed"
            ).order_by(
                UserValidation.created_at.desc()
            ).limit(100).all()
            
            for validation in recent_validations:
                if validation.validation_result:
                    try:
                        result = json.loads(validation.validation_result)
                        overall_score = result.get("overall_score")
                        if overall_score is not None:
                            total_score += float(overall_score)
                            score_count += 1
                    except:
                        pass
        except Exception as e:
            current_app.logger.warning(f"Failed to calculate average score: {e}")
        
        avg_score = round(total_score / score_count, 1) if score_count > 0 else 0
        
        return jsonify({
            "success": True,
            "stats": {
                "total_users": total_users,
                "validations_this_month": validations_this_month,
                "discoveries_this_month": discoveries_this_month,
                "total_validations": total_validations,
                "total_discoveries": total_discoveries,
                "average_score": avg_score,
            },
        })
    except Exception as exc:
        current_app.logger.exception("Failed to get usage stats: %s", exc)
        # Return default stats on error (so page still loads)
        return jsonify({
            "success": True,
            "stats": {
                "total_users": 0,
                "validations_this_month": 0,
                "discoveries_this_month": 0,
                "total_validations": 0,
                "total_discoveries": 0,
                "average_score": 0,
            },
        })

