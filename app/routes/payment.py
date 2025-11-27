"""Payment and subscription routes blueprint."""
from flask import Blueprint, request, jsonify, current_app
from typing import Any, Dict
from datetime import datetime, timedelta
import os

from app.models.database import db, User, Payment, SubscriptionCancellation
from app.utils import get_current_session, require_auth
from app.services.email_service import email_service
from app.services.email_templates import (
    subscription_activated_email,
    payment_failed_email,
    get_base_template,
)

bp = Blueprint("payment", __name__)

# Note: Rate limits will be applied after blueprint registration in api.py


@bp.get("/api/subscription/status")
@require_auth
def get_subscription_status() -> Any:
    """Get current subscription status."""
    try:
        session = get_current_session()
        if not session:
            return jsonify({"success": False, "error": "Not authenticated"}), 401
        
        user = session.user
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        # Ensure subscription expiration is set if needed (this may commit to DB)
        try:
            is_active = user.is_subscription_active()
            # Refresh to get updated expiration if it was set
            db.session.refresh(user)
        except Exception as e:
            current_app.logger.exception("Error in is_subscription_active: %s", e)
            # Fallback: use read-only check
            subscription_type = user.subscription_type or "free"
            if subscription_type == "free":
                is_active = True
            elif user.subscription_expires_at:
                is_active = datetime.utcnow() < user.subscription_expires_at
            elif user.subscription_started_at and subscription_type in ["starter", "pro", "annual"]:
                # Calculate expiration from start date
                duration_days = {"starter": 30, "pro": 30, "annual": 365}.get(subscription_type, 30)
                calculated_expiry = user.subscription_started_at + timedelta(days=duration_days)
                is_active = datetime.utcnow() < calculated_expiry
            else:
                is_active = False
        
        days_remaining = user.days_remaining()
        
        # Get payment history
        payments = Payment.query.filter_by(user_id=user.id, status="completed").order_by(Payment.created_at.desc()).limit(10).all()
        payment_history = [{
            "id": p.id,
            "amount": p.amount,
            "subscription_type": p.subscription_type,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        } for p in payments]
        
        return jsonify({
            "success": True,
            "subscription": {
                "type": user.subscription_type or "free",
                "status": user.payment_status or "active",
                "is_active": is_active,
                "days_remaining": days_remaining,
                "expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
                "started_at": user.subscription_started_at.isoformat() if user.subscription_started_at else None,
            },
            "payment_history": payment_history,
        })
    except Exception as e:
        current_app.logger.exception("Error getting subscription status: %s", e)
        return jsonify({"success": False, "error": "Failed to load subscription status"}), 500


@bp.post("/api/subscription/cancel")
@require_auth
def cancel_subscription() -> Any:
    """Cancel user subscription (keeps access until expiration)."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    
    # Only allow cancellation of paid subscriptions
    subscription_type = user.subscription_type or "free"
    
    # Don't allow cancellation of free tier or free trial
    if subscription_type in ["free", "free_trial"]:
        return jsonify({"success": False, "error": "Free subscriptions cannot be cancelled"}), 400
    
    # Allow cancellation if subscription is active OR already cancelled (to prevent duplicate cancellations)
    # But only if subscription hasn't expired yet
    if user.payment_status == "cancelled":
        return jsonify({"success": False, "error": "Subscription is already cancelled"}), 400
    
    # Check if subscription is still valid (not expired)
    if not user.is_subscription_active():
        return jsonify({"success": False, "error": "Subscription has already expired"}), 400
    
    # Get cancellation reason from request
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    cancellation_reason = data.get("cancellation_reason", "").strip()
    cancellation_category = data.get("cancellation_category", "").strip()
    additional_comments = data.get("additional_comments", "").strip()
    
    if not cancellation_reason:
        return jsonify({"success": False, "error": "Cancellation reason is required"}), 400
    
    try:
        # Mark as cancelled but keep access until expiration
        user.payment_status = "cancelled"
        
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
                <p><strong>Date:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
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
        return jsonify({"success": False, "error": "Failed to cancel subscription"}), 500


@bp.post("/api/subscription/change-plan")
@require_auth
def change_subscription_plan() -> Any:
    """Change subscription plan (upgrade or downgrade)."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    new_subscription_type = data.get("subscription_type", "").strip()
    
    # Valid subscription types: starter, pro, annual
    if new_subscription_type not in ["starter", "pro", "annual"]:
        return jsonify({"success": False, "error": "Invalid subscription type"}), 400
    
    user = session.user
    
    # Can't change if on free trial
    if user.subscription_type == "free_trial":
        return jsonify({"success": False, "error": "Please subscribe first before changing plans"}), 400
    
    # Can't change to same plan
    if user.subscription_type == new_subscription_type:
        return jsonify({"success": False, "error": "You're already on this plan"}), 400
    
    try:
        # Calculate prorated amount or immediate switch
        # For simplicity, we'll extend current subscription with new duration
        duration_days_map = {
            "starter": 30,
            "pro": 30,
            "weekly": 7,
        }
        duration_days = duration_days_map[new_subscription_type]
        
        # If user has time remaining, extend from current expiration
        # Otherwise, start from now
        if user.subscription_expires_at and user.subscription_expires_at > datetime.utcnow():
            # Extend from current expiration
            user.subscription_expires_at = user.subscription_expires_at + timedelta(days=duration_days)
        else:
            # Start new period from now
            user.subscription_expires_at = datetime.utcnow() + timedelta(days=duration_days)
        
        user.subscription_type = new_subscription_type
        user.payment_status = "active"
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Subscription changed to {new_subscription_type} plan",
            "user": user.to_dict(),
        })
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Subscription change failed: %s", exc)
        return jsonify({"success": False, "error": "Failed to change subscription"}), 500


@bp.post("/api/payment/create-intent")
@require_auth
def create_payment_intent() -> Any:
    """Create Stripe payment intent."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    subscription_type = data.get("subscription_type", "").strip()
    
    # Valid subscription types: starter, pro, annual
    if subscription_type not in ["starter", "pro", "annual"]:
        return jsonify({"success": False, "error": "Invalid subscription type"}), 400
    
    user = session.user
    
    # Amounts in cents
    amounts = {
        "starter": 900,   # $9.00/month
        "pro": 1500,      # $15.00/month
        "annual": 12000,  # $120.00/year (save $60)
    }
    
    duration_days = {
        "starter": 30,    # 30 days
        "pro": 30,        # 30 days
        "annual": 365,    # 365 days
    }
    
    try:
        import stripe
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        
        if not stripe.api_key:
            return jsonify({"success": False, "error": "Stripe not configured"}), 500
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=amounts[subscription_type],
            currency="usd",
            metadata={
                "user_id": str(user.id),
                "subscription_type": subscription_type,
                "duration_days": str(duration_days[subscription_type]),
            },
        )
        
        return jsonify({
            "success": True,
            "client_secret": intent.client_secret,
            "amount": amounts[subscription_type] / 100,
            "subscription_type": subscription_type,
        })
    except ImportError:
        return jsonify({"success": False, "error": "Stripe not installed"}), 500
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
def confirm_payment() -> Any:
    """Confirm payment and activate subscription."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    payment_intent_id = data.get("payment_intent_id", "").strip()
    subscription_type = data.get("subscription_type", "").strip()
    
    if not payment_intent_id or not subscription_type:
        return jsonify({"success": False, "error": "Payment intent ID and subscription type required"}), 400
    
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
        
        # Duration mapping for all subscription types
        duration_days_map = {
            "starter": 30,
            "pro": 30,
            "weekly": 7,
        }
        
        if subscription_type not in duration_days_map:
            return jsonify({"success": False, "error": "Invalid subscription type"}), 400
        
        duration_days = duration_days_map[subscription_type]
        
        # Activate subscription
        user.activate_subscription(subscription_type, duration_days)
        
        # Record payment
        payment = Payment(
            user_id=user.id,
            amount=intent.amount / 100,
            subscription_type=subscription_type,
            stripe_payment_intent_id=payment_intent_id,
            status="completed",
            completed_at=datetime.utcnow(),
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
        
        return jsonify({
            "success": True,
            "user": user.to_dict(),
            "message": "Subscription activated",
        })
    except ImportError:
        return jsonify({"success": False, "error": "Stripe not installed"}), 500
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Payment confirmation failed: %s", exc)
        return jsonify({"success": False, "error": "Payment confirmation failed"}), 500


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
        
        current_app.logger.info(f"Stripe webhook received: {event['type']}")
        
        # Handle different event types
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            payment_intent_id = payment_intent['id']
            
            # Find the payment in database
            payment = Payment.query.filter_by(stripe_payment_intent_id=payment_intent_id).first()
            
            if payment and payment.status != 'completed':
                # Update payment status
                payment.status = 'completed'
                payment.completed_at = datetime.utcnow()
                
                # Activate user subscription if not already active
                user = payment.user
                if user.payment_status != 'active':
                    subscription_type = payment.subscription_type
                    duration_days_map = {
                        "starter": 30,
                        "pro": 30,
                        "weekly": 7,
                    }
                    duration_days = duration_days_map.get(subscription_type, 30)
                    user.activate_subscription(subscription_type, duration_days)
                    
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

