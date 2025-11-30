"""
Tests for database models.
"""
import pytest
from datetime import datetime, timedelta
from app.models.database import User, SubscriptionTier, PaymentStatus


def test_user_password_hashing(app, test_user):
    """Test user password hashing."""
    with app.app_context():
        assert test_user.check_password("test-password")
        assert not test_user.check_password("wrong-password")


def test_user_subscription_active(app, paid_user):
    """Test subscription active check."""
    with app.app_context():
        assert paid_user.is_subscription_active() is True


def test_user_subscription_expired(app):
    """Test expired subscription."""
    with app.app_context():
        user = User(
            email="expired@example.com",
            subscription_type="pro",
            payment_status="active",
        )
        user.set_password("password")
        user.subscription_expires_at = datetime.utcnow() - timedelta(days=1)
        from app.models.database import db
        db.session.add(user)
        db.session.commit()
        
        assert user.is_subscription_active() is False
        
        db.session.delete(user)
        db.session.commit()


def test_user_days_remaining(app, paid_user):
    """Test days remaining calculation."""
    with app.app_context():
        days = paid_user.days_remaining()
        assert days > 0
        assert days <= 30


def test_user_activate_subscription(app, test_user):
    """Test subscription activation."""
    with app.app_context():
        test_user.activate_subscription("pro", 30)
        from app.models.database import db
        db.session.commit()
        
        assert test_user.subscription_type == "pro"
        assert test_user.payment_status == "active"
        assert test_user.subscription_expires_at is not None
        assert test_user.is_subscription_active() is True


def test_user_reset_token_generation(app, test_user):
    """Test password reset token generation."""
    with app.app_context():
        token = test_user.generate_reset_token()
        from app.models.database import db
        db.session.commit()
        
        assert token is not None
        assert test_user.reset_token == token
        assert test_user.reset_token_expires_at is not None
        
        # Verify token
        assert test_user.verify_reset_token(token) is True
        assert test_user.verify_reset_token("wrong-token") is False

