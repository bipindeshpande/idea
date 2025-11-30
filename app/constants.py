"""
Application-wide constants to replace hardcoded values throughout the codebase.
"""
from app.models.database import SubscriptionTier, PaymentStatus, RunStatus, ValidationStatus, ActionStatus

# ============================================================================
# Subscription Constants
# ============================================================================

# Subscription durations in days
SUBSCRIPTION_DURATIONS = {
    SubscriptionTier.STARTER: 30,
    SubscriptionTier.PRO: 30,
    SubscriptionTier.ANNUAL: 365,
    SubscriptionTier.FREE_TRIAL: 3,
    # Legacy support
    "weekly": 7,
    "monthly": 30,
}

# Subscription prices in cents
SUBSCRIPTION_PRICES = {
    SubscriptionTier.STARTER: 900,   # $9.00/month
    SubscriptionTier.PRO: 1500,       # $15.00/month
    SubscriptionTier.ANNUAL: 12000,   # $120.00/year
    # Legacy support
    "weekly": 500,   # $5.00/week
    "monthly": 1500, # $15.00/month
}

# Default subscription values
DEFAULT_SUBSCRIPTION_TYPE = SubscriptionTier.FREE
DEFAULT_PAYMENT_STATUS = "trial"  # PaymentStatus uses string values, not enum attributes

# ============================================================================
# Pagination Constants
# ============================================================================

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100

# ============================================================================
# Query Limits
# ============================================================================

ADMIN_USER_DETAIL_LIMIT = 10
ADMIN_PAYMENTS_LIMIT = 100
ADMIN_SESSIONS_LIMIT = 10
SMART_RECOMMENDATIONS_LIMIT = 50
PUBLIC_STATS_VALIDATION_LIMIT = 100
USER_PAYMENT_HISTORY_LIMIT = 10

# ============================================================================
# Field Length Limits
# ============================================================================

MAX_ACTION_TEXT_LENGTH = 1000
MAX_IDEA_ID_LENGTH = 255
MAX_NOTE_CONTENT_LENGTH = 10000
MIN_PASSWORD_LENGTH = 8
MIN_IDEA_EXPLANATION_LENGTH = 10

# ============================================================================
# Score Thresholds
# ============================================================================

HIGH_SCORE_THRESHOLD = 7.5
LOW_SCORE_CAP = 2
MIN_VALIDATIONS_FOR_INSIGHTS = 2
RECOMMENDATIONS_VALIDATION_LIMIT = 10
INTEREST_AREAS_LIMIT = 5
SIMILAR_IDEAS_LIMIT = 3

# ============================================================================
# Comparison Limits
# ============================================================================

MAX_COMPARISON_SESSIONS = 5

# ============================================================================
# Interest Area Keywords
# ============================================================================

INTEREST_AREA_KEYWORDS = {
    "AI/ML": ["ai", "artificial intelligence", "machine learning", "ml", "neural", "deep learning"],
    "SaaS": ["saas", "software", "platform", "application", "app"],
    "E-commerce": ["ecommerce", "e-commerce", "online store", "retail", "marketplace"],
    "Fintech": ["fintech", "finance", "payment", "banking", "financial", "crypto", "blockchain"],
}

# ============================================================================
# Error Messages
# ============================================================================

class ErrorMessages:
    """Standard error messages used throughout the application."""
    NOT_AUTHENTICATED = "Not authenticated"
    AUTHENTICATION_REQUIRED = "Authentication required"
    UNAUTHORIZED = "Unauthorized"
    NOT_FOUND = "Resource not found"
    RUN_NOT_FOUND = "Run not found"
    ACTION_NOT_FOUND = "Action not found"
    NOTE_NOT_FOUND = "Note not found"
    VALIDATION_NOT_FOUND = "Validation not found"
    USER_NOT_FOUND = "User not found"
    
    # Database errors
    DATABASE_CONNECTION_ERROR = "Database connection error"
    DATABASE_QUERY_ERROR = "Database query error"
    DATABASE_ERROR = "Database error. Please try again."
    
    # Validation errors
    INVALID_EMAIL = "Invalid email format"
    PASSWORD_TOO_SHORT = f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
    INVALID_DATE_FORMAT = "Invalid date format"
    INVALID_SUBSCRIPTION_DATA = "Invalid subscription data"
    INVALID_MFA_CODE = "Invalid MFA code"
    INVALID_OR_EXPIRED_TOKEN = "Invalid or expired reset token"
    
    # Field validation
    ACTION_TEXT_TOO_LONG = f"action_text must be {MAX_ACTION_TEXT_LENGTH} characters or less"
    IDEA_ID_TOO_LONG = f"idea_id must be {MAX_IDEA_ID_LENGTH} characters or less"
    CONTENT_TOO_LONG = f"content must be {MAX_NOTE_CONTENT_LENGTH} characters or less"
    
    # Required fields
    EMAIL_REQUIRED = "Email is required"
    PASSWORD_REQUIRED = "Password is required"
    TOKEN_REQUIRED = "Token is required"
    CONTENT_REQUIRED = "Content is required"
    ACTION_TEXT_REQUIRED = "action_text and idea_id are required"
    CONTENT_AND_IDEA_ID_REQUIRED = "content and idea_id are required"
    
    # Business logic
    MAX_COMPARISON_SESSIONS_EXCEEDED = f"Maximum {MAX_COMPARISON_SESSIONS} sessions can be compared at once"
    AT_LEAST_ONE_SESSION_REQUIRED = "At least one run_id or validation_id is required"
    MIN_VALIDATIONS_FOR_INSIGHTS = f"Complete at least {MIN_VALIDATIONS_FOR_INSIGHTS} validations to get personalized insights"
    
    # Admin
    ADMIN_EMAIL_NOT_CONFIGURED = "Admin email not configured"
    MFA_CODE_REQUIRED = "MFA code is required"
    MFA_VERIFICATION_NOT_CONFIGURED = "MFA verification not configured"
    MFA_VERIFICATION_FAILED = "MFA verification failed"
    
    # General
    INTERNAL_SERVER_ERROR = "Internal server error"
    FAILED_TO_SEND_MESSAGE = "Failed to send message"
    SUBSCRIPTION_EXPIRED = "Subscription expired"

# ============================================================================
# Status Values (for backward compatibility)
# ============================================================================

# These are kept for easy reference, but enums should be used instead
STATUS_PENDING = "pending"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"
STATUS_ACTIVE = "active"
STATUS_EXPIRED = "expired"
STATUS_CANCELLED = "cancelled"
STATUS_REFUNDED = "refunded"
STATUS_IN_PROGRESS = "in_progress"
STATUS_BLOCKED = "blocked"

# ============================================================================
# Session Constants
# ============================================================================

SESSION_DURATION_DAYS = 7
INACTIVITY_TIMEOUT_MINUTES = 15

# ============================================================================
# Development/Testing Constants
# ============================================================================

# Hardcoded MFA code for development (should be in environment variable)
DEV_MFA_CODE = "2538"  # Should be moved to environment variable

