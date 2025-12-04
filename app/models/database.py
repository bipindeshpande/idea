"""
Database models and setup for user authentication and subscriptions.
"""
from datetime import datetime, timedelta, timezone
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Index, Enum as SQLEnum
import secrets

db = SQLAlchemy()

# Helper function to get UTC now (replaces deprecated datetime.utcnow())
def utcnow():
    """Get current UTC datetime. Replaces deprecated datetime.utcnow()."""
    return datetime.now(timezone.utc)

# Helper function to normalize datetime to timezone-aware (UTC)
def normalize_datetime(dt):
    """Normalize a datetime to timezone-aware UTC. Handles both naive and aware datetimes."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Naive datetime - assume it's UTC and make it aware
        return dt.replace(tzinfo=timezone.utc)
    else:
        # Already aware - convert to UTC
        return dt.astimezone(timezone.utc)


class User(db.Model):
    """User model for authentication and subscription management."""
    __tablename__ = "users"
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    # Subscription fields
    subscription_type = db.Column(db.String(50), default="free", index=True)  # free, starter, pro, annual (monthly migrated to pro)
    subscription_started_at = db.Column(db.DateTime, default=utcnow)
    subscription_expires_at = db.Column(db.DateTime, index=True)
    payment_status = db.Column(db.String(50), default="trial", index=True)  # trial, active, expired, cancelled
    
    # Usage tracking fields
    free_validations_used = db.Column(db.Integer, default=0)  # Lifetime free validations used
    free_discoveries_used = db.Column(db.Integer, default=0)  # Lifetime free discoveries used
    monthly_validations_used = db.Column(db.Integer, default=0)  # Current month validations (for Starter/Pro)
    monthly_discoveries_used = db.Column(db.Integer, default=0)  # Current month discoveries (for Starter/Pro)
    usage_reset_date = db.Column(db.Date)  # Date when monthly usage resets
    
    # Password reset
    reset_token = db.Column(db.String(255), nullable=True)
    reset_token_expires_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships - use selectinload for better performance than lazy loading
    sessions = db.relationship("UserSession", backref="user", lazy="selectin", cascade="all, delete-orphan")
    runs = db.relationship("UserRun", backref="user", lazy="selectin", cascade="all, delete-orphan")
    validations = db.relationship("UserValidation", backref="user", lazy="selectin", cascade="all, delete-orphan")
    
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
        self.reset_token_expires_at = utcnow() + timedelta(hours=1)
        return token
    
    def verify_reset_token(self, token: str) -> bool:
        """Verify password reset token."""
        if not self.reset_token or not self.reset_token_expires_at:
            return False
        if normalize_datetime(utcnow()) > normalize_datetime(self.reset_token_expires_at):
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
                    self.subscription_expires_at = utcnow() + timedelta(days=365*10)  # 10 years
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
                        self.subscription_expires_at = utcnow() + timedelta(days=duration_days)
                        self.subscription_started_at = utcnow()
                    
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
            return normalize_datetime(utcnow()) < normalize_datetime(self.subscription_expires_at)
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
                    return normalize_datetime(utcnow()) < normalize_datetime(self.subscription_expires_at)
                except:
                    pass
            return False
    
    def days_remaining(self) -> int:
        """Get days remaining in subscription."""
        if not self.subscription_expires_at:
            return 0
        remaining = (normalize_datetime(self.subscription_expires_at) - normalize_datetime(utcnow())).days
        return max(0, remaining)
    
    def activate_subscription(self, subscription_type: str, duration_days: int):
        """Activate subscription."""
        self.subscription_type = subscription_type
        self.payment_status = "active"
        self.subscription_started_at = utcnow()
        self.subscription_expires_at = utcnow() + timedelta(days=duration_days)
        
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
                    is_active = normalize_datetime(utcnow()) < normalize_datetime(self.subscription_expires_at)
                elif self.subscription_started_at:
                    # No expiration set but has start date - calculate expiration
                    duration_days = {
                        "starter": 30,
                        "pro": 30,
                        "annual": 365,
                    }.get(subscription_type, 30)
                    calculated_expiry = self.subscription_started_at + timedelta(days=duration_days)
                    is_active = normalize_datetime(utcnow()) < normalize_datetime(calculated_expiry)
                else:
                    # No expiration and no start date - assume inactive
                    is_active = False
            else:
                # Unknown subscription type - check expiration if exists
                if self.subscription_expires_at:
                    is_active = normalize_datetime(utcnow()) < normalize_datetime(self.subscription_expires_at)
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
                remaining = (normalize_datetime(self.subscription_expires_at) - normalize_datetime(utcnow())).days
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
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    session_token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utcnow, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    last_activity = db.Column(db.DateTime, default=utcnow)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_session_user_created', 'user_id', 'created_at'),
        Index('idx_session_user_expires', 'user_id', 'expires_at'),
        Index('idx_session_token', 'session_token'),  # Already has unique index, but explicit for clarity
        Index('idx_session_expires', 'expires_at'),  # For cleanup queries
    )
    
    def is_valid(self) -> bool:
        """Check if session is still valid (not expired and not inactive)."""
        if not self.expires_at:
            return False
        
        # Normalize both datetimes to timezone-aware for comparison
        now = utcnow()
        expires = normalize_datetime(self.expires_at)
        if now >= expires:
            return False
        
        # Check for inactivity timeout (15 minutes - increased for long operations like validation)
        if self.last_activity:
            last_activity = normalize_datetime(self.last_activity)
            time_since_activity = now - last_activity
            if time_since_activity > timedelta(minutes=15):
                return False
        
        return True
    
    def refresh(self, duration_hours: int = 24 * 7):  # 7 days default
        """Refresh session expiration."""
        self.expires_at = utcnow() + timedelta(hours=duration_hours)
        self.last_activity = utcnow()


class UserRun(db.Model):
    """User's idea discovery runs."""
    __tablename__ = "user_runs"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    run_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    inputs = db.Column(db.Text)  # JSON string
    reports = db.Column(db.Text)  # JSON string
    status = db.Column(db.String(50), default="pending", index=True)  # pending, processing, completed, failed
    created_at = db.Column(db.DateTime, default=utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    archived_at = db.Column(db.DateTime, nullable=True)
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_run_user_created', 'user_id', 'created_at'),
        Index('idx_run_user_status', 'user_id', 'status'),
        Index('idx_run_user_deleted', 'user_id', 'is_deleted'),  # For filtering deleted runs
        Index('idx_run_id', 'run_id'),  # Already unique, but explicit for clarity
    )


class UserValidation(db.Model):
    """User's idea validations."""
    __tablename__ = "user_validations"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    validation_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    category_answers = db.Column(db.Text)  # JSON string
    idea_explanation = db.Column(db.Text)
    validation_result = db.Column(db.Text)  # JSON string
    status = db.Column(db.String(50), default="completed", index=True)  # pending, completed, failed
    created_at = db.Column(db.DateTime, default=utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    archived_at = db.Column(db.DateTime, nullable=True)
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_validation_user_created', 'user_id', 'created_at'),
        Index('idx_validation_user_status', 'user_id', 'status', 'is_deleted'),  # For filtering by status and deleted
        Index('idx_validation_id', 'validation_id'),  # Already unique, but explicit for clarity
    )


class UserAction(db.Model):
    """User's action items for tracking progress on recommendations."""
    __tablename__ = "user_actions"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    idea_id = db.Column(db.String(255), nullable=False, index=True)  # Can be run_id or validation_id
    action_text = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(50), default="pending", index=True)  # pending, in_progress, completed, blocked
    
    # Composite index for common queries
    __table_args__ = (
        Index('idx_action_user_idea', 'user_id', 'idea_id'),
        Index('idx_action_user_status', 'user_id', 'status'),
    )
    due_date = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    is_deleted = db.Column(db.Boolean, default=False, index=True)
    archived_at = db.Column(db.DateTime, nullable=True)
    
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
    created_at = db.Column(db.DateTime, default=utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow, index=True)
    # Note: is_deleted column removed - not present in database table
    archived_at = db.Column(db.DateTime, nullable=True)
    
    # Composite index for common queries
    __table_args__ = (
        Index('idx_note_user_idea', 'user_id', 'idea_id'),
        Index('idx_note_user_updated', 'user_id', 'updated_at'),
    )
    
    # Relationships
    user = db.relationship("User", backref="notes")


class Admin(db.Model):
    """Admin user model."""
    __tablename__ = "admins"
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    mfa_secret = db.Column(db.String(255), nullable=True)  # TOTP secret
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    
    def set_password(self, password: str):
        """Set admin password."""
        self.password_hash = generate_password_hash(password)
        self.updated_at = utcnow()
    
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
    created_at = db.Column(db.DateTime, default=utcnow)
    
    def is_valid(self) -> bool:
        """Check if token is still valid."""
        return not self.used and normalize_datetime(utcnow()) < normalize_datetime(self.expires_at)


class SystemSettings(db.Model):
    """System-wide settings."""
    __tablename__ = "system_settings"
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(255), unique=True, nullable=False, index=True)
    value = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
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
            setting.updated_at = utcnow()
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
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default="USD")
    subscription_type = db.Column(db.String(50), nullable=False)  # weekly, monthly
    payment_method = db.Column(db.String(50), default="stripe")
    stripe_payment_intent_id = db.Column(db.String(255), nullable=True, unique=True)
    status = db.Column(db.String(50), default="pending", index=True)  # pending, completed, failed, refunded
    created_at = db.Column(db.DateTime, default=utcnow, index=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_payment_user_created', 'user_id', 'created_at'),
        Index('idx_payment_user_status', 'user_id', 'status'),
        Index('idx_payment_status_created', 'status', 'created_at'),  # For admin reports
        Index('idx_payment_stripe_id', 'stripe_payment_intent_id'),  # Already unique, but explicit for clarity
    )


class SubscriptionCancellation(db.Model):
    """Subscription cancellation records with reasons."""
    __tablename__ = "subscription_cancellations"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    subscription_type = db.Column(db.String(50), nullable=False)  # weekly, monthly
    cancellation_reason = db.Column(db.Text, nullable=True)  # User-provided reason
    cancellation_category = db.Column(db.String(100), nullable=True)  # Optional: categorize reasons
    cancelled_at = db.Column(db.DateTime, default=utcnow)
    subscription_expires_at = db.Column(db.DateTime, nullable=True)  # When access actually expires
    
    # Relationship
    user = db.relationship("User", backref="cancellations")


# Enums for better data integrity
class SubscriptionTier(str):
    """Subscription tier enum."""
    FREE = "free"
    FREE_TRIAL = "free_trial"
    STARTER = "starter"
    PRO = "pro"
    ANNUAL = "annual"


class PaymentStatus(str):
    """Payment status enum."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class RunStatus(str):
    """Run status enum."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ValidationStatus(str):
    """Validation status enum."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class ActionStatus(str):
    """Action status enum."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"


class StripeEvent(db.Model):
    """Stripe webhook events for idempotency."""
    __tablename__ = "stripe_events"
    
    id = db.Column(db.Integer, primary_key=True)
    stripe_event_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    event_type = db.Column(db.String(100), nullable=False, index=True)
    processed_at = db.Column(db.DateTime, default=utcnow, index=True)
    details = db.Column(db.Text)  # JSON string of event data
    
    def __repr__(self):
        return f"<StripeEvent {self.stripe_event_id} {self.event_type}>"


class AuditLog(db.Model):
    """Audit log for security and compliance."""
    __tablename__ = "audit_logs"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    admin_id = db.Column(db.Integer, db.ForeignKey("admins.id"), nullable=True, index=True)
    action = db.Column(db.String(100), nullable=False, index=True)  # login, password_reset, subscription_change, etc.
    resource_type = db.Column(db.String(50), nullable=True)  # user, payment, run, validation, etc.
    resource_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True)  # JSON string with additional context
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow, index=True)
    
    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_audit_user_action', 'user_id', 'action', 'created_at'),
        Index('idx_audit_admin_action', 'admin_id', 'action', 'created_at'),
        Index('idx_audit_resource', 'resource_type', 'resource_id', 'created_at'),
        Index('idx_audit_created', 'created_at'),  # For time-based queries
    )
