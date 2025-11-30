"""Audit logging service for security and compliance."""
from datetime import datetime
from typing import Optional, Dict, Any
from flask import request, g, current_app

from app.models.database import db, AuditLog, User, Admin


def log_action(
    action: str,
    user_id: Optional[int] = None,
    admin_id: Optional[int] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    """
    Log an audit event.
    
    Args:
        action: Action name (e.g., 'login', 'password_reset', 'subscription_change')
        user_id: User ID if action is by a user
        admin_id: Admin ID if action is by an admin
        resource_type: Type of resource affected (e.g., 'user', 'payment', 'run')
        resource_id: ID of resource affected
        details: Additional details as dict (will be JSON encoded)
        ip_address: IP address (defaults to request.remote_addr)
        user_agent: User agent (defaults to request.headers.get('User-Agent'))
    
    Returns:
        Created AuditLog instance
    """
    # Get IP and user agent from request if not provided
    if ip_address is None:
        ip_address = getattr(request, 'remote_addr', None)
    if user_agent is None:
        user_agent = getattr(request, 'headers', {}).get('User-Agent', None)
    
    # Get user/admin from g if not provided
    if user_id is None and hasattr(g, 'user_id'):
        user_id = g.user_id
    if admin_id is None and hasattr(g, 'admin_id'):
        admin_id = g.admin_id
    
    # Encode details as JSON string
    details_json = None
    if details:
        import json
        try:
            details_json = json.dumps(details)
        except (TypeError, ValueError):
            details_json = str(details)
    
    audit_log = AuditLog(
        user_id=user_id,
        admin_id=admin_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details_json,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    
    try:
        db.session.add(audit_log)
        db.session.commit()
        
        # Log to application logger as well
        request_id = getattr(g, 'request_id', 'unknown')
        current_app.logger.info(
            f"[{request_id}] Audit: {action} - User: {user_id}, Admin: {admin_id}, "
            f"Resource: {resource_type}/{resource_id}"
        )
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to create audit log: {e}")
        # Don't raise - audit logging failure shouldn't break the app
    
    return audit_log


def log_user_action(action: str, user_id: int, **kwargs) -> AuditLog:
    """Convenience method to log user actions."""
    return log_action(action=action, user_id=user_id, **kwargs)


def log_admin_action(action: str, admin_id: int, **kwargs) -> AuditLog:
    """Convenience method to log admin actions."""
    return log_action(action=action, admin_id=admin_id, **kwargs)


def log_login(user_id: int, success: bool = True, **kwargs) -> AuditLog:
    """Log login attempt."""
    action = "login_success" if success else "login_failed"
    return log_user_action(action, user_id, details={"success": success}, **kwargs)


def log_password_reset(user_id: int, **kwargs) -> AuditLog:
    """Log password reset."""
    return log_user_action("password_reset", user_id, **kwargs)


def log_subscription_change(user_id: int, old_type: str, new_type: str, **kwargs) -> AuditLog:
    """Log subscription change."""
    return log_user_action(
        "subscription_change",
        user_id,
        resource_type="user",
        resource_id=user_id,
        details={"old_type": old_type, "new_type": new_type},
        **kwargs
    )


def log_payment(user_id: int, payment_id: int, amount: float, **kwargs) -> AuditLog:
    """Log payment event."""
    return log_user_action(
        "payment",
        user_id,
        resource_type="payment",
        resource_id=payment_id,
        details={"amount": amount},
        **kwargs
    )



