"""
Database models and setup for user authentication and subscriptions.
"""
from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

db = SQLAlchemy()


class User(db.Model):
    """User model for authentication and subscription management."""
    __tablename__ = "users"
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Subscription fields
    subscription_type = db.Column(db.String(50), default="free")  # free, starter, pro, annual (monthly migrated to pro)
    subscription_started_at = db.Column(db.DateTime, default=datetime.utcnow)
    subscription_expires_at = db.Column(db.DateTime)
    payment_status = db.Column(db.String(50), default="trial")  # trial, active, expired, cancelled
    
    # Usage tracking fields
    free_validations_used = db.Column(db.Integer, default=0)  # Lifetime free validations used
    free_discoveries_used = db.Column(db.Integer, default=0)  # Lifetime free discoveries used
    monthly_validations_used = db.Column(db.Integer, default=0)  # Current month validations (for Starter/Pro)
    monthly_discoveries_used = db.Column(db.Integer, default=0)  # Current month discoveries (for Starter/Pro)
    usage_reset_date = db.Column(db.Date)  # Date when monthly usage resets
    
    # Password reset
    reset_token = db.Column(db.String(255), nullable=True)
    reset_token_expires_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    sessions = db.relationship("UserSession", backref="user", lazy=True, cascade="all, delete-orphan")
    runs = db.relationship("UserRun", backref="user", lazy=True, cascade="all, delete-orphan")
    validations = db.relationship("UserValidation", backref="user", lazy=True, cascade="all, delete-orphan")
    
    def set_password(self, password: str):
        """Hash and set password."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        """Check if password matches."""
        return check_password_hash(self.password_hash, password)
    
    def generate_reset_token(self) -> str:
        """Generate password reset token."""
        token = secrets.token_urlsafe(32)
        self.reset_token = token
        self.reset_token_expires_at = datetime.utcnow() + timedelta(hours=1)
        return token
    
    def verify_reset_token(self, token: str) -> bool:
        """Verify password reset token."""
        if not self.reset_token or not self.reset_token_expires_at:
            return False
        if datetime.utcnow() > self.reset_token_expires_at:
            return False
        return secrets.compare_digest(self.reset_token, token)
    
    def clear_reset_token(self):
        """Clear password reset token."""
        self.reset_token = None
        self.reset_token_expires_at = None
    
    def is_subscription_active(self) -> bool:
        """Check if user has active subscription.
        
        A subscription is active if subscription_expires_at is in the future,
        regardless of payment_status. This ensures users have access until
        their subscription actually expires, even if payment_status is not "active"
        (e.g., cancelled subscriptions that haven't expired yet).
        
        Free tier users should always have access (no expiration).
        """
        try:
            # Free tier users always have access
            subscription_type = self.subscription_type or "free"
            if subscription_type == "free":
                # If expiration is not set for free tier, set it far in the future
                if not self.subscription_expires_at:
                    self.subscription_expires_at = datetime.utcnow() + timedelta(days=365*10)  # 10 years
                    self.payment_status = "active"
                    try:
                        db.session.commit()
                    except Exception:
                        db.session.rollback()
                return True
            
            if not self.subscription_expires_at:
                # For free trials, set expiration if not set
                if subscription_type == "free_trial" and self.subscription_started_at:
                    self.subscription_expires_at = self.subscription_started_at + timedelta(days=3)
                    try:
                        db.session.commit()
                    except Exception as e:
                        db.session.rollback()
                        import logging
                        logging.error(f"Failed to set free_trial expiration: {e}")
                elif subscription_type in ["starter", "pro", "annual"]:
                    # For paid subscriptions without expiration, check if they have recent payments
                    # If subscription_started_at exists, extend from there
                    if self.subscription_started_at:
                        # Default duration based on subscription type
                        duration_days = {
                            "starter": 30,
                            "pro": 30,
                            "annual": 365,
                        }.get(subscription_type, 30)
                        self.subscription_expires_at = self.subscription_started_at + timedelta(days=duration_days)
                    else:
                        # No start date either - set expiration from now with default duration
                        duration_days = {
                            "starter": 30,
                            "pro": 30,
                            "annual": 365,
                        }.get(subscription_type, 30)
                        self.subscription_expires_at = datetime.utcnow() + timedelta(days=duration_days)
                        self.subscription_started_at = datetime.utcnow()
                    
                    try:
                        db.session.commit()
                        # Refresh the object to ensure we have the updated expiration
                        db.session.refresh(self)
                    except Exception as e:
                        db.session.rollback()
                        import logging
                        logging.error(f"Failed to set paid subscription expiration: {e}")
                else:
                    # Unknown subscription type without expiration - treat as inactive
                    return False
            
            # Subscription is active if expiration date is in the future
            if not self.subscription_expires_at:
                # If we still don't have an expiration date after trying to set it, return False
                return False
            return datetime.utcnow() < self.subscription_expires_at
        except Exception as e:
            # Log error but don't crash - default to False for safety
            import logging
            logging.error(f"Error checking subscription status for user {self.id}: {e}")
            # If it's a free user, they should still have access even if there's an error
            subscription_type = self.subscription_type or "free"
            if subscription_type == "free":
                return True
            # For paid subscriptions, if there's an error, check if expiration exists and is in future
            if self.subscription_expires_at:
                try:
                    return datetime.utcnow() < self.subscription_expires_at
                except:
                    pass
            return False
    
    def days_remaining(self) -> int:
        """Get days remaining in subscription."""
        if not self.subscription_expires_at:
            return 0
        remaining = (self.subscription_expires_at - datetime.utcnow()).days
        return max(0, remaining)
    
    def activate_subscription(self, subscription_type: str, duration_days: int):
        """Activate subscription."""
        self.subscription_type = subscription_type
        self.payment_status = "active"
        self.subscription_started_at = datetime.utcnow()
        self.subscription_expires_at = datetime.utcnow() + timedelta(days=duration_days)
        
        # Set usage reset date for monthly plans (starter, pro, annual)
        if subscription_type in ["starter", "pro", "annual"]:
            from datetime import date
            # Set reset date to first of next month
            today = date.today()
            if today.month == 12:
                self.usage_reset_date = date(today.year + 1, 1, 1)
            else:
                self.usage_reset_date = date(today.year, today.month + 1, 1)
            # Reset monthly counters
            self.monthly_validations_used = 0
            self.monthly_discoveries_used = 0
    
    def check_and_reset_monthly_usage(self):
        """Check if monthly usage needs to be reset and reset if needed."""
        if self.subscription_type in ["starter", "pro", "annual"] and self.usage_reset_date:
            from datetime import date
            if date.today() >= self.usage_reset_date:
                # Reset monthly counters
                self.monthly_validations_used = 0
                self.monthly_discoveries_used = 0
                # Set next reset date
                today = date.today()
                if today.month == 12:
                    self.usage_reset_date = date(today.year + 1, 1, 1)
                else:
                    self.usage_reset_date = date(today.year, today.month + 1, 1)
                db.session.commit()
    
    def can_perform_validation(self) -> tuple[bool, str]:
        """Check if user can perform a validation. Returns (can_perform, error_message)."""
        subscription_type = self.subscription_type or "free"
        
        # Handle backward compatibility for subscription types
        if subscription_type == "free_trial":
            subscription_type = "free"
        elif subscription_type == "monthly":
            subscription_type = "pro"  # Monthly migrated to pro (unlimited)
        
        # Check and reset monthly usage if needed
        self.check_and_reset_monthly_usage()
        
        # Usage limits by subscription type
        if subscription_type in ["pro", "annual"]:
            return True, ""  # Unlimited
        
        if subscription_type == "free":
            if self.free_validations_used >= 2:
                return False, "You've used all 2 free validations. Upgrade to continue."
            return True, ""
        
        if subscription_type == "starter":
            if self.monthly_validations_used >= 20:
                return False, "You've reached your monthly limit of 20 validations. Upgrade to Pro for unlimited access."
            return True, ""
        
        return False, "Invalid subscription type."
    
    def can_perform_discovery(self) -> tuple[bool, str]:
        """Check if user can perform a discovery. Returns (can_perform, error_message)."""
        subscription_type = self.subscription_type or "free"
        
        # Handle backward compatibility for subscription types
        if subscription_type == "free_trial":
            subscription_type = "free"
        elif subscription_type == "monthly":
            subscription_type = "pro"  # Monthly migrated to pro (unlimited)
        
        # Check and reset monthly usage if needed
        self.check_and_reset_monthly_usage()
        
        # Usage limits by subscription type
        if subscription_type in ["pro", "annual"]:
            return True, ""  # Unlimited
        
        if subscription_type == "free":
            if self.free_discoveries_used >= 4:
                return False, "You've used all 4 free discoveries. Upgrade to continue."
            return True, ""
        
        if subscription_type == "starter":
            if self.monthly_discoveries_used >= 10:
                return False, "You've reached your monthly limit of 10 discoveries. Upgrade to Pro for unlimited access."
            return True, ""
        
        return False, "Invalid subscription type."
    
    def increment_validation_usage(self):
        """Increment validation usage counter."""
        subscription_type = self.subscription_type or "free"
        
        # Handle legacy subscription types
        if subscription_type == "free_trial":
            subscription_type = "free"
        elif subscription_type == "monthly":
            subscription_type = "pro"
        
        if subscription_type == "free":
            self.free_validations_used += 1
        elif subscription_type == "starter":
            self.monthly_validations_used += 1
        # pro and weekly are unlimited, no increment needed
        
        db.session.commit()
    
    def increment_discovery_usage(self):
        """Increment discovery usage counter."""
        subscription_type = self.subscription_type or "free"
        
        # Handle legacy subscription types
        if subscription_type == "free_trial":
            subscription_type = "free"
        elif subscription_type == "monthly":
            subscription_type = "pro"
        
        if subscription_type == "free":
            self.free_discoveries_used += 1
        elif subscription_type == "starter":
            self.monthly_discoveries_used += 1
        # pro and weekly are unlimited, no increment needed
        
        db.session.commit()
    
    def get_usage_stats(self) -> dict:
        """Get current usage statistics."""
        subscription_type = self.subscription_type or "free"
        
        # Handle legacy subscription types
        if subscription_type == "free_trial":
            subscription_type = "free"
        elif subscription_type == "monthly":
            subscription_type = "pro"
        
        self.check_and_reset_monthly_usage()
        
        if subscription_type == "free":
            return {
                "subscription_type": "free",
                "validations": {
                    "used": self.free_validations_used,
                    "limit": 2,
                    "remaining": max(0, 2 - self.free_validations_used),
                },
                "discoveries": {
                    "used": self.free_discoveries_used,
                    "limit": 4,
                    "remaining": max(0, 4 - self.free_discoveries_used),
                },
            }
        elif subscription_type == "starter":
            return {
                "subscription_type": "starter",
                "validations": {
                    "used": self.monthly_validations_used,
                    "limit": 20,
                    "remaining": max(0, 20 - self.monthly_validations_used),
                },
                "discoveries": {
                    "used": self.monthly_discoveries_used,
                    "limit": 10,
                    "remaining": max(0, 10 - self.monthly_discoveries_used),
                },
                "reset_date": self.usage_reset_date.isoformat() if self.usage_reset_date else None,
            }
        elif subscription_type in ["pro", "annual"]:
            return {
                "subscription_type": subscription_type,
                "validations": {
                    "used": None,
                    "limit": None,
                    "remaining": None,
                },
                "discoveries": {
                    "used": None,
                    "limit": None,
                    "remaining": None,
                },
            }
        
        return {}
    
    def to_dict(self):
        """Convert user to dictionary. Read-only - does not modify database."""
        # Read-only check - don't call is_subscription_active() as it may modify DB
        # Instead, do a simple check without committing
        subscription_type = self.subscription_type or "free"
        is_active = False
        
        try:
            if subscription_type == "free":
                is_active = True
            elif subscription_type in ["starter", "pro", "annual"]:
                # For paid subscriptions, check expiration
                if self.subscription_expires_at:
                    # Check if expiration is in the future (read-only)
                    is_active = datetime.utcnow() < self.subscription_expires_at
                elif self.subscription_started_at:
                    # No expiration set but has start date - calculate expiration
                    duration_days = {
                        "starter": 30,
                        "pro": 30,
                        "annual": 365,
                    }.get(subscription_type, 30)
                    calculated_expiry = self.subscription_started_at + timedelta(days=duration_days)
                    is_active = datetime.utcnow() < calculated_expiry
                else:
                    # No expiration and no start date - assume inactive
                    is_active = False
            else:
                # Unknown subscription type - check expiration if exists
                if self.subscription_expires_at:
                    is_active = datetime.utcnow() < self.subscription_expires_at
                else:
                    is_active = False
        except Exception as e:
            import logging
            logging.error(f"Error checking subscription status in to_dict: {e}")
            # Default to active for free users, inactive for paid
            is_active = subscription_type == "free"
        
        try:
            days_remaining = 0
            if self.subscription_expires_at:
                remaining = (self.subscription_expires_at - datetime.utcnow()).days
                days_remaining = max(0, remaining)
        except Exception as e:
            import logging
            logging.error(f"Error calculating days remaining in to_dict: {e}")
            days_remaining = 0
        
        return {
            "id": self.id,
            "email": self.email,
            "subscription_type": self.subscription_type,
            "subscription_expires_at": self.subscription_expires_at.isoformat() if self.subscription_expires_at else None,
            "payment_status": self.payment_status,
            "is_active": is_active,
            "days_remaining": days_remaining,
        }


class UserSession(db.Model):
    """User session tracking."""
    __tablename__ = "user_sessions"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    session_token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    
    def is_valid(self) -> bool:
        """Check if session is still valid (not expired and not inactive)."""
        if datetime.utcnow() >= self.expires_at:
            return False
        
        # Check for inactivity timeout (5 minutes)
        if self.last_activity:
            time_since_activity = datetime.utcnow() - self.last_activity
            if time_since_activity > timedelta(minutes=5):
                return False
        
        return True
    
    def refresh(self, duration_hours: int = 24 * 7):  # 7 days default
        """Refresh session expiration."""
        self.expires_at = datetime.utcnow() + timedelta(hours=duration_hours)
        self.last_activity = datetime.utcnow()


class UserRun(db.Model):
    """User's idea discovery runs."""
    __tablename__ = "user_runs"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    run_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    inputs = db.Column(db.Text)  # JSON string
    reports = db.Column(db.Text)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserValidation(db.Model):
    """User's idea validations."""
    __tablename__ = "user_validations"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    validation_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    category_answers = db.Column(db.Text)  # JSON string
    idea_explanation = db.Column(db.Text)
    validation_result = db.Column(db.Text)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserAction(db.Model):
    """User's action items for tracking progress on recommendations."""
    __tablename__ = "user_actions"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    idea_id = db.Column(db.String(255), nullable=False, index=True)  # Can be run_id or validation_id
    action_text = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default="pending")  # pending, in_progress, completed, blocked
    due_date = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship("User", backref="actions")


class UserNote(db.Model):
    """User's notes and journal entries for ideas."""
    __tablename__ = "user_notes"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    idea_id = db.Column(db.String(255), nullable=False, index=True)  # Can be run_id or validation_id
    content = db.Column(db.Text, nullable=False)
    tags = db.Column(db.Text)  # JSON string array of tags
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship("User", backref="notes")


class Admin(db.Model):
    """Admin user model."""
    __tablename__ = "admins"
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    mfa_secret = db.Column(db.String(255), nullable=True)  # TOTP secret
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_password(self, password: str):
        """Set admin password."""
        self.password_hash = generate_password_hash(password)
        self.updated_at = datetime.utcnow()
    
    def check_password(self, password: str) -> bool:
        """Check admin password."""
        return check_password_hash(self.password_hash, password)
    
    @staticmethod
    def get_or_create_admin(email: str, default_password: str = None) -> "Admin":
        """Get or create admin user."""
        admin = Admin.query.filter_by(email=email).first()
        if not admin:
            admin = Admin(email=email)
            if default_password:
                admin.set_password(default_password)
            else:
                # Generate random password if none provided
                admin.set_password(secrets.token_urlsafe(32))
            db.session.add(admin)
            db.session.commit()
        return admin


class AdminResetToken(db.Model):
    """Admin password reset token model."""
    __tablename__ = "admin_reset_tokens"
    
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def is_valid(self) -> bool:
        """Check if token is still valid."""
        return not self.used and datetime.utcnow() < self.expires_at


class SystemSettings(db.Model):
    """System-wide settings."""
    __tablename__ = "system_settings"
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(255), unique=True, nullable=False, index=True)
    value = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.String(255), nullable=True)  # Admin email who updated
    
    @staticmethod
    def get_setting(key: str, default: str = None) -> str:
        """Get a system setting value."""
        setting = SystemSettings.query.filter_by(key=key).first()
        if setting:
            return setting.value
        # Create default if doesn't exist
        if default is not None:
            SystemSettings.set_setting(key, default, f"Default value for {key}")
            return default
        return None
    
    @staticmethod
    def set_setting(key: str, value: str, description: str = None, updated_by: str = None):
        """Set a system setting value."""
        setting = SystemSettings.query.filter_by(key=key).first()
        if setting:
            setting.value = value
            if description:
                setting.description = description
            if updated_by:
                setting.updated_by = updated_by
            setting.updated_at = datetime.utcnow()
        else:
            setting = SystemSettings(
                key=key,
                value=value,
                description=description,
                updated_by=updated_by
            )
            db.session.add(setting)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise


class Payment(db.Model):
    """Payment records."""
    __tablename__ = "payments"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default="USD")
    subscription_type = db.Column(db.String(50), nullable=False)  # weekly, monthly
    payment_method = db.Column(db.String(50), default="stripe")
    stripe_payment_intent_id = db.Column(db.String(255), nullable=True, unique=True)
    status = db.Column(db.String(50), default="pending")  # pending, completed, failed, refunded
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)


class SubscriptionCancellation(db.Model):
    """Subscription cancellation records with reasons."""
    __tablename__ = "subscription_cancellations"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    subscription_type = db.Column(db.String(50), nullable=False)  # weekly, monthly
    cancellation_reason = db.Column(db.Text, nullable=True)  # User-provided reason
    cancellation_category = db.Column(db.String(100), nullable=True)  # Optional: categorize reasons
    cancelled_at = db.Column(db.DateTime, default=datetime.utcnow)
    subscription_expires_at = db.Column(db.DateTime, nullable=True)  # When access actually expires
    
    # Relationship
    user = db.relationship("User", backref="cancellations")
