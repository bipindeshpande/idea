"""Payment and subscription routes blueprint."""
from flask import Blueprint, request, current_app
from typing import Any, Dict
from datetime import datetime, timedelta, timezone
import os
import secrets

from app.models.database import (
    db, User, Payment, SubscriptionCancellation, StripeEvent,
    SubscriptionTier, PaymentStatus, utcnow, normalize_datetime
)
from app.utils import get_current_session, require_auth
from app.utils.json_helpers import safe_json_loads, safe_json_dumps
from app.utils.validators import validate_text_field
from app.utils.response_helpers import (
    success_response, error_response, not_found_response,
    unauthorized_response, internal_error_response
)
from app.utils.serialization import serialize_datetime
from app.constants import (
    SUBSCRIPTION_DURATIONS, SUBSCRIPTION_PRICES,
    DEFAULT_SUBSCRIPTION_TYPE, DEFAULT_PAYMENT_STATUS,
    USER_PAYMENT_HISTORY_LIMIT,
    ErrorMessages,
)
from app.services.email_service import email_service
from app.services.email_templates import (
    subscription_activated_email,
    payment_failed_email,
    get_base_template,
)

bp = Blueprint("payment", __name__)

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


def apply_rate_limit(limit_string):
    """Helper to apply rate limit decorator if limiter is available."""
    def decorator(func):
        limiter = get_limiter()
        if limiter:
            return limiter.limit(limit_string)(func)
        return func
    return decorator

def is_development_mode() -> bool:
    """Check if we're in development mode."""
    flask_env = os.environ.get("FLASK_ENV", "").lower()
    debug = os.environ.get("DEBUG", "false").lower()
    
    # Also check if running on localhost (development indicator)
    is_localhost = request.host.startswith("localhost") or request.host.startswith("127.0.0.1")
    
    return flask_env == "development" or debug == "true" or is_localhost


@bp.get("/api/subscription/status")
@require_auth
@apply_rate_limit("30 per hour")
def get_subscription_status() -> Any:
    """Get current subscription status."""
    try:
        session = get_current_session()
        if not session:
            return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
        
        user = session.user
        if not user:
            return not_found_response("User")
        
        # Ensure subscription expiration is set if needed (this may commit to DB)
        try:
            is_active = user.is_subscription_active()
            # Refresh to get updated expiration if it was set
            db.session.refresh(user)
        except Exception as e:
            current_app.logger.exception("Error in is_subscription_active: %s", e)
            # Fallback: use read-only check
            subscription_type = user.subscription_type or DEFAULT_SUBSCRIPTION_TYPE
            if subscription_type == SubscriptionTier.FREE:
                is_active = True
            elif user.subscription_expires_at:
                is_active = normalize_datetime(utcnow()) < normalize_datetime(user.subscription_expires_at)
            elif user.subscription_started_at and subscription_type in [SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ANNUAL]:
                # Calculate expiration from start date
                duration_days = SUBSCRIPTION_DURATIONS.get(subscription_type, 30)
                calculated_expiry = user.subscription_started_at + timedelta(days=duration_days)
                is_active = normalize_datetime(utcnow()) < normalize_datetime(calculated_expiry)
            else:
                is_active = False
        
        days_remaining = user.days_remaining()
        
        # Get payment history
        payments = Payment.query.filter_by(
            user_id=user.id, 
            status=PaymentStatus.COMPLETED
        ).order_by(Payment.created_at.desc()).limit(USER_PAYMENT_HISTORY_LIMIT).all()
        payment_history = [{
            "id": p.id,
            "amount": p.amount,
            "subscription_type": p.subscription_type,
            "created_at": serialize_datetime(p.created_at),
        } for p in payments]
        
        return success_response({
            "subscription": {
                "type": user.subscription_type or DEFAULT_SUBSCRIPTION_TYPE,
                "status": user.payment_status or DEFAULT_PAYMENT_STATUS,
                "is_active": is_active,
                "days_remaining": days_remaining,
                "expires_at": serialize_datetime(user.subscription_expires_at),
                "started_at": serialize_datetime(user.subscription_started_at),
            },
            "payment_history": payment_history,
        })
    except Exception as e:
        current_app.logger.exception("Error getting subscription status: %s", e)
        return internal_error_response("Failed to load subscription status")


@bp.post("/api/subscription/cancel")
@require_auth
@apply_rate_limit("5 per hour")
def cancel_subscription() -> Any:
    """Cancel user subscription (keeps access until expiration)."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    
    # Only allow cancellation of paid subscriptions
    subscription_type = user.subscription_type or DEFAULT_SUBSCRIPTION_TYPE
    
    # Don't allow cancellation of free tier or free trial
    if subscription_type in [SubscriptionTier.FREE, SubscriptionTier.FREE_TRIAL]:
        return error_response("Free subscriptions cannot be cancelled", 400)
    
    # Allow cancellation if subscription is active OR already cancelled (to prevent duplicate cancellations)
    # But only if subscription hasn't expired yet
    if user.payment_status == PaymentStatus.REFUNDED:  # Using REFUNDED as cancelled status
        return error_response("Subscription is already cancelled", 400)
    
    # Check if subscription is still valid (not expired)
    if not user.is_subscription_active():
        return error_response("Subscription has already expired", 400)
    
    # Get cancellation reason from request
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    cancellation_reason = data.get("cancellation_reason", "").strip()
    cancellation_category = data.get("cancellation_category", "").strip()
    additional_comments = data.get("additional_comments", "").strip()
    
    # Validate cancellation_reason (required, max 500 chars)
    is_valid, error_msg = validate_text_field(
        cancellation_reason,
        "Cancellation reason",
        required=True,
        max_length=500,
        allow_html=False
    )
    if not is_valid:
        return error_response(error_msg, 400)
    
    # Validate cancellation_category (optional, max 100 chars)
    if cancellation_category:
        is_valid, error_msg = validate_text_field(
            cancellation_category,
            "Cancellation category",
            required=False,
            max_length=100,
            allow_html=False
        )
        if not is_valid:
            return error_response(error_msg, 400)
    
    # Validate additional_comments (optional, max 1000 chars)
    if additional_comments:
        is_valid, error_msg = validate_text_field(
            additional_comments,
            "Additional comments",
            required=False,
            max_length=1000,
            allow_html=False
        )
        if not is_valid:
            return error_response(error_msg, 400)
    
    try:
        # Mark as cancelled but keep access until expiration
        user.payment_status = PaymentStatus.REFUNDED  # Using REFUNDED as cancelled status
        
        # Save cancellation reason to database
        cancellation = SubscriptionCancellation(
            user_id=user.id,
            subscription_type=user.subscription_type,
            cancellation_reason=cancellation_reason,
            cancellation_category=cancellation_category if cancellation_category else None,
            subscription_expires_at=user.subscription_expires_at,
        )
        db.session.add(cancellation)
        db.session.commit()
        
        # Send admin notification for cancellation
        try:
            admin_email = os.environ.get("ADMIN_EMAIL")
            if admin_email:
                admin_html = f"""
                <h2 style="color: #333; margin-top: 0;">⚠️ Subscription Cancelled</h2>
                <p><strong>User:</strong> {user.email}</p>
                <p><strong>Plan:</strong> {user.subscription_type.title()}</p>
                <p><strong>Reason:</strong> {cancellation_reason}</p>
                {f'<p><strong>Category:</strong> {cancellation_category}</p>' if cancellation_category else ''}
                {f'<p><strong>Additional Comments:</strong> {additional_comments}</p>' if additional_comments else ''}
                <p><strong>Access Until:</strong> {user.subscription_expires_at.strftime('%Y-%m-%d') if user.subscription_expires_at else 'N/A'}</p>
                <p><strong>Date:</strong> {utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                """
                email_service.send_email(
                    to_email=admin_email,
                    subject=f"Subscription Cancelled: {user.email}",
                    html_content=get_base_template(admin_html),
                    text_content=f"Subscription cancelled: {user.email}\nReason: {cancellation_reason}\nPlan: {user.subscription_type}",
                )
        except Exception as e:
            current_app.logger.warning(f"Failed to send admin cancellation notification: {e}")
        
        # Send cancellation confirmation email
        try:
            name = user.email.split("@")[0] if "@" in user.email else user.email
            days_remaining = user.days_remaining()
            
            content = f"""
            <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
            <p>Your subscription has been cancelled successfully.</p>
            <p><strong>Important:</strong> You'll continue to have access to all features until {user.subscription_expires_at.strftime('%B %d, %Y') if user.subscription_expires_at else 'your subscription expires'} ({days_remaining} days remaining).</p>
            <p>After that date, you'll need to resubscribe to continue using the platform.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://ideabunch.com/pricing" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    Resubscribe Anytime
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">We're sorry to see you go. If you have feedback, please reply to this email.</p>
            """
            
            text_content = f"""
Hi {name},

Your subscription has been cancelled successfully.

You'll continue to have access until {user.subscription_expires_at.strftime('%B %d, %Y') if user.subscription_expires_at else 'your subscription expires'} ({days_remaining} days remaining).

After that date, you'll need to resubscribe to continue.

Resubscribe: https://ideabunch.com/pricing
"""
            
            html_content = get_base_template(content)
            email_service.send_email(
                to_email=user.email,
                subject="Subscription Cancelled",
                html_content=html_content,
                text_content=text_content,
            )
        except Exception as e:
            current_app.logger.warning(f"Failed to send cancellation email: {e}")
        
        return jsonify({
            "success": True,
            "message": "Subscription cancelled. You'll have access until expiration.",
            "user": user.to_dict(),
        })
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Subscription cancellation failed: %s", exc)
        return internal_error_response("Failed to cancel subscription")


@bp.post("/api/subscription/change-plan")
@require_auth
@apply_rate_limit("5 per hour")
def change_subscription_plan() -> Any:
    """Change subscription plan (upgrade or downgrade)."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    new_subscription_type = data.get("subscription_type", "").strip()
    
    # Validate subscription_type format first
    is_valid, error_msg = validate_text_field(
        new_subscription_type,
        "Subscription type",
        required=True,
        max_length=50,
        allow_html=False
    )
    if not is_valid:
        return error_response(error_msg, 400)
    
    # Valid subscription types: starter, pro, annual
    valid_types = [SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ANNUAL]
    if new_subscription_type not in valid_types:
        return error_response("Invalid subscription type", 400)
    
    user = session.user
    
    # Can't change if on free trial
    if user.subscription_type == SubscriptionTier.FREE_TRIAL:
        return error_response("Please subscribe first before changing plans", 400)
    
    # Can't change to same plan
    if user.subscription_type == new_subscription_type:
        return error_response("You're already on this plan", 400)
    
    try:
        # Calculate prorated amount or immediate switch
        # For simplicity, we'll extend current subscription with new duration
        duration_days = SUBSCRIPTION_DURATIONS.get(new_subscription_type, 30)
        
        # If user has time remaining, extend from current expiration
        # Otherwise, start from now
        if user.subscription_expires_at and normalize_datetime(user.subscription_expires_at) > normalize_datetime(utcnow()):
            # Extend from current expiration
            user.subscription_expires_at = user.subscription_expires_at + timedelta(days=duration_days)
        else:
            # Start new period from now
            user.subscription_expires_at = utcnow() + timedelta(days=duration_days)
        
        user.subscription_type = new_subscription_type
        user.payment_status = PaymentStatus.ACTIVE
        db.session.commit()
        
        return success_response({
            "user": user.to_dict(),
        }, message=f"Subscription changed to {new_subscription_type} plan")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Subscription change failed: %s", exc)
        return internal_error_response("Failed to change subscription")


@bp.post("/api/subscription/activate-dev")
@require_auth
def activate_subscription_dev() -> Any:
    """Activate subscription in development mode without payment (DEVELOPMENT ONLY)."""
    print("\n" + "="*60)
    print("ACTIVATE-DEV ENDPOINT CALLED")
    print("="*60)
    
    try:
        print("Checking development mode...")
        is_dev = is_development_mode()
        print(f"Development mode check result: {is_dev}")
        
        if not is_dev:
            error_msg = "This endpoint is only available in development mode"
            print(f"ERROR: {error_msg}")
            return jsonify({
                "success": False,
                "error": error_msg,
                "debug_info": {
                    "flask_env": os.environ.get("FLASK_ENV", "not set"),
                    "debug": os.environ.get("DEBUG", "not set"),
                    "host": request.host if hasattr(request, 'host') else "unknown"
                }
            }), 403
        
        print("Getting current session...")
        session = get_current_session()
        if not session:
            print("ERROR: Not authenticated")
            return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
        print(f"Session found for user_id: {session.user.id}")
    except Exception as e:
        print(f"EXCEPTION in check phase: {type(e).__name__}: {e}")
        import traceback
        print(traceback.format_exc())
        current_app.logger.exception("Error in activate_subscription_dev check: %s", e)
        return internal_error_response(f"Server error during initialization: {str(e)}")
    
    print("Parsing request data...")
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    subscription_type = data.get("subscription_type", "").strip()
    print(f"Subscription type requested: {subscription_type}")
    
    # Valid subscription types: starter, pro, annual
    valid_types = [SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ANNUAL]
    if subscription_type not in valid_types:
        error_msg = f"Invalid subscription type: {subscription_type}. Must be: starter, pro, or annual"
        print(f"ERROR: {error_msg}")
        return error_response(error_msg, 400)
    
    user = session.user
    print(f"User: {user.email} (id: {user.id})")
    
    # Get amounts and durations from constants
    amount_cents = SUBSCRIPTION_PRICES.get(subscription_type, 0)
    duration_days = SUBSCRIPTION_DURATIONS.get(subscription_type, 30)
    
    try:
        # Activate subscription directly without payment
        print(f"Activating subscription: {subscription_type} for {duration_days} days...")
        try:
            user.activate_subscription(subscription_type, duration_days)
            print("✓ Subscription activated successfully")
        except Exception as e:
            print(f"EXCEPTION activating subscription: {type(e).__name__}: {e}")
            import traceback
            print(traceback.format_exc())
            current_app.logger.exception("Error activating subscription: %s", e)
            raise
        
        # Record a development payment entry for tracking
        print("Creating payment record...")
        try:
            payment = Payment(
                user_id=user.id,
                amount=amount_cents / 100,
                subscription_type=subscription_type,
                stripe_payment_intent_id=f"dev_{secrets.token_urlsafe(16)}",
                status=PaymentStatus.COMPLETED,
                completed_at=utcnow(),
            )
            db.session.add(payment)
            db.session.commit()
            print("✓ Payment record created")
        except Exception as e:
            print(f"WARNING: Error creating payment record: {type(e).__name__}: {e}")
            import traceback
            print(traceback.format_exc())
            current_app.logger.exception("Error creating payment record: %s", e)
            db.session.rollback()
            # Don't fail the whole request if payment record fails - subscription is already activated
        
        # Send subscription activated email (optional in dev, but good for testing)
        try:
            html_content, text_content = subscription_activated_email(
                user_name=user.email,
                subscription_type=subscription_type,
            )
            email_service.send_email(
                to_email=user.email,
                subject="🎉 Your Subscription is Active! (Dev Mode)",
                html_content=html_content,
                text_content=text_content,
            )
        except Exception as e:
            current_app.logger.warning(f"Failed to send subscription activated email: {e}")
            # Don't fail the whole request if email fails
        
        current_app.logger.info(f"Dev subscription activated: user_id={user.id}, type={subscription_type}")
        
        # Refresh user to get latest data
        db.session.refresh(user)
        
        return jsonify({
            "success": True,
            "message": f"Subscription activated in development mode: {subscription_type}",
            "user": user.to_dict(),
            "dev_mode": True,
        })
    except Exception as exc:
        print(f"\n{'='*60}")
        print(f"EXCEPTION CAUGHT: {type(exc).__name__}")
        print(f"Error message: {exc}")
        print(f"{'='*60}")
        import traceback
        print("FULL TRACEBACK:")
        print(traceback.format_exc())
        print(f"{'='*60}\n")
        
        db.session.rollback()
        current_app.logger.exception("Dev subscription activation failed: %s", exc)
        error_msg = str(exc)
        return jsonify({
            "success": False,
            "error": f"Failed to activate subscription: {error_msg}",
            "error_type": type(exc).__name__
        }), 500


@bp.post("/api/payment/create-intent")
@require_auth
@apply_rate_limit("5 per hour")
def create_payment_intent() -> Any:
    """Create Stripe payment intent."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    subscription_type = data.get("subscription_type", "").strip()
    
    # Validate subscription_type format and length
    is_valid, error_msg = validate_text_field(
        subscription_type,
        "Subscription type",
        required=True,
        max_length=50,
        allow_html=False
    )
    if not is_valid:
        return error_response(error_msg, 400)
    
    # Valid subscription types: starter, pro, annual
    valid_types = [SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ANNUAL]
    if subscription_type not in valid_types:
        return error_response("Invalid subscription type", 400)
    
    user = session.user
    
    # Get amounts and durations from constants
    amount_cents = SUBSCRIPTION_PRICES.get(subscription_type, 0)
    duration_days = SUBSCRIPTION_DURATIONS.get(subscription_type, 30)
    
    try:
        import stripe
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        
        if not stripe.api_key:
            return internal_error_response("Stripe not configured")
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            metadata={
                "user_id": str(user.id),
                "subscription_type": subscription_type,
                "duration_days": str(duration_days),
            },
        )
        
        return success_response({
            "client_secret": intent.client_secret,
            "amount": amount_cents / 100,
            "subscription_type": subscription_type,
        })
    except ImportError:
        return internal_error_response("Stripe not installed")
    except Exception as exc:
        current_app.logger.exception("Payment intent creation failed: %s", exc)
        # Send payment failure email if user is authenticated
        try:
            if user:
                html_content, text_content = payment_failed_email(
                    user_name=user.email,
                    subscription_type=subscription_type,
                    error_message="Payment intent creation failed",
                )
                email_service.send_email(
                    to_email=user.email,
                    subject="Payment Failed - Idea Bunch",
                    html_content=html_content,
                    text_content=text_content,
                )
        except Exception as email_err:
            current_app.logger.warning(f"Failed to send payment failure email: {email_err}")
        
        return jsonify({"success": False, "error": "Payment processing failed"}), 500


@bp.post("/api/payment/confirm")
@require_auth
@apply_rate_limit("5 per hour")
def confirm_payment() -> Any:
    """Confirm payment and activate subscription."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    payment_intent_id = data.get("payment_intent_id", "").strip()
    subscription_type = data.get("subscription_type", "").strip()
    
    # Validate payment_intent_id
    is_valid, error_msg = validate_text_field(
        payment_intent_id,
        "Payment intent ID",
        required=True,
        max_length=255,
        allow_html=False
    )
    if not is_valid:
        return error_response(error_msg, 400)
    
    # Validate subscription_type
    is_valid, error_msg = validate_text_field(
        subscription_type,
        "Subscription type",
        required=True,
        max_length=50,
        allow_html=False
    )
    if not is_valid:
        return error_response(error_msg, 400)
    
    user = session.user
    
    try:
        import stripe
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        
        # Verify payment intent
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status != "succeeded":
            # Send payment failure email
            error_message = f"Payment status: {intent.status}"
            try:
                html_content, text_content = payment_failed_email(
                    user_name=user.email,
                    subscription_type=subscription_type,
                    error_message=error_message,
                )
                email_service.send_email(
                    to_email=user.email,
                    subject="Payment Failed - Idea Bunch",
                    html_content=html_content,
                    text_content=text_content,
                )
            except Exception as e:
                current_app.logger.warning(f"Failed to send payment failure email to {user.email}: {e}")
            
            return jsonify({"success": False, "error": "Payment not completed"}), 400
        
        # Check if already processed
        existing_payment = Payment.query.filter_by(stripe_payment_intent_id=payment_intent_id).first()
        if existing_payment:
            return jsonify({"success": False, "error": "Payment already processed"}), 400
        
        # Get duration from constants
        duration_days = SUBSCRIPTION_DURATIONS.get(subscription_type, 30)
        
        if subscription_type not in [SubscriptionTier.STARTER, SubscriptionTier.PRO, "weekly"]:  # weekly is legacy
            return error_response("Invalid subscription type", 400)
        
        # Activate subscription
        user.activate_subscription(subscription_type, duration_days)
        
        # Record payment
        payment = Payment(
            user_id=user.id,
            amount=intent.amount / 100,
            subscription_type=subscription_type,
            stripe_payment_intent_id=payment_intent_id,
            status="completed",
            completed_at=utcnow(),
        )
        db.session.add(payment)
        db.session.commit()
        
        # Send subscription activated email
        try:
            html_content, text_content = subscription_activated_email(
                user_name=user.email,
                subscription_type=subscription_type,
            )
            email_service.send_email(
                to_email=user.email,
                subject="🎉 Your Subscription is Active!",
                html_content=html_content,
                text_content=text_content,
            )
        except Exception as e:
            current_app.logger.warning(f"Failed to send subscription activated email: {e}")
        
        return success_response({
            "user": user.to_dict(),
        }, message="Subscription activated")
    except ImportError:
        return internal_error_response("Stripe not installed")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Payment confirmation failed: %s", exc)
        return internal_error_response("Payment confirmation failed")


@bp.post("/api/webhooks/stripe")
def stripe_webhook() -> Any:
    """Handle Stripe webhook events with signature verification."""
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
    
    if not webhook_secret:
        current_app.logger.error("STRIPE_WEBHOOK_SECRET not configured")
        return jsonify({"error": "Webhook secret not configured"}), 500
    
    if not sig_header:
        current_app.logger.warning("Stripe webhook called without signature")
        return jsonify({"error": "Missing signature"}), 400
    
    try:
        import stripe
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        
        event_id = event.get('id')
        event_type = event.get('type')
        
        current_app.logger.info(f"Stripe webhook received: {event_type} (ID: {event_id})")
        
        # Check for idempotency - prevent duplicate processing
        if event_id:
            existing_event = StripeEvent.query.filter_by(stripe_event_id=event_id).first()
            if existing_event:
                current_app.logger.info(f"Stripe event {event_id} already processed at {existing_event.processed_at}")
                return jsonify({
                    "success": True,
                    "message": "Event already processed",
                    "processed_at": existing_event.processed_at.isoformat()
                }), 200
        
        # Handle different event types
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            payment_intent_id = payment_intent['id']
            
            # Find the payment in database
            payment = Payment.query.filter_by(stripe_payment_intent_id=payment_intent_id).first()
            
            if payment and payment.status != 'completed':
                # Update payment status
                payment.status = 'completed'
                payment.completed_at = utcnow()
                
                # Activate user subscription if not already active
                user = payment.user
                if user.payment_status != 'active':
                    subscription_type = payment.subscription_type
                    duration_days = SUBSCRIPTION_DURATIONS.get(subscription_type, 30)
                    old_subscription_type = user.subscription_type or DEFAULT_SUBSCRIPTION_TYPE
                    user.activate_subscription(subscription_type, duration_days)
                    
                    # Log subscription change and payment
                    try:
                        log_subscription_change(user.id, old_subscription_type, subscription_type)
                        log_payment(user.id, payment.id, float(payment.amount))
                    except:
                        pass  # Don't fail if audit logging fails
                    
                    # Send activation email
                    try:
                        html_content, text_content = subscription_activated_email(
                            user_name=user.email,
                            subscription_type=subscription_type,
                        )
                        email_service.send_email(
                            to_email=user.email,
                            subject="🎉 Your Subscription is Active!",
                            html_content=html_content,
                            text_content=text_content,
                        )
                    except Exception as e:
                        current_app.logger.warning(f"Failed to send subscription activated email: {e}")
                
                db.session.commit()
                current_app.logger.info(f"Payment {payment_intent_id} confirmed via webhook")
        
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            payment_intent_id = payment_intent['id']
            
            # Find the payment in database
            payment = Payment.query.filter_by(stripe_payment_intent_id=payment_intent_id).first()
            
            if payment:
                payment.status = 'failed'
                db.session.commit()
                
                # Send failure email
                try:
                    user = payment.user
                    html_content, text_content = payment_failed_email(
                        user_name=user.email,
                        subscription_type=payment.subscription_type,
                        error_message="Payment failed",
                    )
                    email_service.send_email(
                        to_email=user.email,
                        subject="Payment Failed - Idea Bunch",
                        html_content=html_content,
                        text_content=text_content,
                    )
                except Exception as e:
                    current_app.logger.warning(f"Failed to send payment failure email: {e}")
                
                current_app.logger.info(f"Payment {payment_intent_id} failed via webhook")
        
        # Record event for idempotency (only if we successfully processed it)
        if event_id:
            try:
                stripe_event = StripeEvent(
                    stripe_event_id=event_id,
                    event_type=event_type,
                    details=json.dumps(event.get('data', {}))
                )
                db.session.add(stripe_event)
                db.session.commit()
            except Exception as e:
                current_app.logger.warning(f"Failed to record Stripe event for idempotency: {e}")
                # Don't fail the webhook if we can't record the event
        
        return jsonify({"success": True}), 200
        
    except ValueError as e:
        # Invalid payload
        current_app.logger.error(f"Invalid webhook payload: {e}")
        return jsonify({"error": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        current_app.logger.error(f"Invalid webhook signature: {e}")
        return jsonify({"error": "Invalid signature"}), 400
    except ImportError:
        current_app.logger.error("Stripe not installed")
        return jsonify({"error": "Stripe not installed"}), 500
    except Exception as e:
        current_app.logger.exception(f"Webhook processing failed: {e}")
        return jsonify({"error": "Webhook processing failed"}), 500

