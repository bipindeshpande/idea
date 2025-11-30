# Hardcoded Values and Boilerplate Code Analysis

This document identifies all hardcoded values, magic strings, and boilerplate code patterns that should be refactored into constants, configuration, or reusable utilities.

## 1. Hardcoded Subscription Types

### Locations Found:
- `app/routes/payment.py`: Multiple occurrences of `"free"`, `"starter"`, `"pro"`, `"annual"`, `"weekly"`, `"free_trial"`
- `app/routes/user.py`: `["starter", "pro", "weekly"]`
- `app/routes/admin.py`: `"starter"`, `"pro"`, `"free_trial"`, `"monthly"`
- `app/routes/auth.py`: `"free"`, `"trial"`

### Issue:
Even though `SubscriptionTier` enum exists in `app/models/database.py`, it's not being used consistently throughout the codebase.

### Recommendation:
- Use `SubscriptionTier.FREE`, `SubscriptionTier.STARTER`, etc. everywhere
- Create a constants module: `app/constants.py`

## 2. Hardcoded Status Values

### Locations Found:
- Payment status: `"pending"`, `"completed"`, `"failed"`, `"refunded"`, `"active"`, `"expired"`, `"cancelled"`
- Run status: `"pending"`, `"processing"`, `"completed"`, `"failed"`
- Validation status: `"pending"`, `"completed"`, `"failed"`
- Action status: `"pending"`, `"in_progress"`, `"completed"`, `"blocked"`

### Issue:
`PaymentStatus`, `RunStatus`, `ValidationStatus`, and `ActionStatus` enums exist but aren't used.

### Recommendation:
- Import and use enums from `app/models/database.py`
- Replace all string literals with enum values

## 3. Hardcoded Numbers (Magic Numbers)

### Subscription Durations:
```python
# Found in app/routes/payment.py (multiple places)
{"starter": 30, "pro": 30, "annual": 365}
```

### Subscription Prices (cents):
```python
# Found in app/routes/payment.py
"starter": 900,   # $9.00/month
"pro": 1500,      # $15.00/month
"annual": 12000,  # $120.00/year
```

### Pagination Limits:
```python
# Found in app/routes/user.py
per_page = request.args.get("per_page", 50, type=int)
per_page = min(per_page, 100)  # Cap at 100
```

### Query Limits:
```python
# Found in multiple files
.limit(10)   # Admin user detail
.limit(50)   # Smart recommendations, admin payments
.limit(100)  # Public stats, admin reports
```

### Field Length Limits:
```python
# Found in app/routes/user.py
if len(action_text) > 1000:  # Action text limit
if len(idea_id) > 255:        # Idea ID limit
if len(content) > 10000:      # Note content limit
if len(password) < 8:         # Password minimum length
```

### Score Thresholds:
```python
# Found in app/routes/user.py
if v["score"] >= 7.5:  # High scoring threshold
validations[:10]       # Last 10 validations
validations[:5]        # Top 5 interest areas
```

### Recommendation:
Create `app/constants.py` with:
```python
# Subscription durations (days)
SUBSCRIPTION_DURATIONS = {
    SubscriptionTier.STARTER: 30,
    SubscriptionTier.PRO: 30,
    SubscriptionTier.ANNUAL: 365,
}

# Subscription prices (cents)
SUBSCRIPTION_PRICES = {
    SubscriptionTier.STARTER: 900,
    SubscriptionTier.PRO: 1500,
    SubscriptionTier.ANNUAL: 12000,
}

# Pagination
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100

# Query limits
ADMIN_USER_DETAIL_LIMIT = 10
SMART_RECOMMENDATIONS_LIMIT = 50
ADMIN_PAYMENTS_LIMIT = 100

# Field limits
MAX_ACTION_TEXT_LENGTH = 1000
MAX_IDEA_ID_LENGTH = 255
MAX_NOTE_CONTENT_LENGTH = 10000
MIN_PASSWORD_LENGTH = 8

# Score thresholds
HIGH_SCORE_THRESHOLD = 7.5
RECOMMENDATIONS_VALIDATION_LIMIT = 10
INTEREST_AREAS_LIMIT = 5
```

## 4. Boilerplate Error Handling

### Pattern Found:
```python
try:
    # ... code ...
except Exception as exc:
    current_app.logger.exception("Failed to ...: %s", exc)
    return jsonify({"success": False, "error": str(exc)}), 500
```

**Found in**: Almost every route handler (50+ occurrences)

### Recommendation:
Create error handler decorator or utility:
```python
# app/utils/error_handling.py
from functools import wraps
from flask import jsonify, current_app

def handle_errors(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as exc:
            current_app.logger.exception(f"Error in {func.__name__}: {exc}")
            return jsonify({"success": False, "error": str(exc)}), 500
    return wrapper
```

## 5. Boilerplate Authentication Checks

### Pattern Found:
```python
session = get_current_session()
if not session:
    return jsonify({"success": False, "error": "Not authenticated"}), 401

user = session.user
```

**Found in**: Every authenticated route (30+ occurrences)

### Status:
Already handled by `@require_auth` decorator, but some routes duplicate the check.

### Recommendation:
- Remove duplicate checks (decorator already handles it)
- Ensure all routes use `@require_auth` consistently

## 6. Boilerplate JSON Parsing

### Pattern Found:
```python
try:
    inputs_data = json.loads(r.inputs) if r.inputs else {}
except (json.JSONDecodeError, TypeError) as e:
    current_app.logger.warning(f"Failed to parse inputs for run {r.run_id}: {e}")
    inputs_data = {}
```

**Found in**: Multiple places for parsing:
- `r.inputs` / `r.reports` (UserRun)
- `v.validation_result` / `v.category_answers` (UserValidation)
- `note.tags` (UserNote)

### Recommendation:
Create utility function:
```python
# app/utils/json_helpers.py
def safe_json_loads(json_str, default=None):
    """Safely parse JSON string with error handling."""
    if not json_str:
        return default or {}
    try:
        if isinstance(json_str, str):
            return json.loads(json_str)
        return json_str
    except (json.JSONDecodeError, TypeError) as e:
        current_app.logger.warning(f"Failed to parse JSON: {e}")
        return default or {}
```

## 7. Boilerplate Response Formatting

### Pattern Found:
```python
return jsonify({
    "success": True,
    "data": {...}
})
```

**Found in**: Every successful response (100+ occurrences)

### Recommendation:
Create response helpers:
```python
# app/utils/response_helpers.py
def success_response(data=None, message=None, status_code=200):
    response = {"success": True}
    if data is not None:
        response["data"] = data
    if message:
        response["message"] = message
    return jsonify(response), status_code

def error_response(error, status_code=400):
    return jsonify({"success": False, "error": error}), status_code
```

## 8. Hardcoded Error Messages

### Common Messages:
- `"Not authenticated"` (10+ occurrences)
- `"Not found"` / `"Run not found"` / `"Action not found"` (15+ occurrences)
- `"Database connection error"` / `"Database query error"` (5+ occurrences)
- `"Unauthorized"` (admin routes, 10+ occurrences)
- `"Invalid email format"` (2+ occurrences)
- `"Password must be at least 8 characters"` (3+ occurrences)

### Recommendation:
Create error message constants:
```python
# app/constants.py
class ErrorMessages:
    NOT_AUTHENTICATED = "Not authenticated"
    NOT_FOUND = "Resource not found"
    UNAUTHORIZED = "Unauthorized"
    INVALID_EMAIL = "Invalid email format"
    PASSWORD_TOO_SHORT = f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
    DATABASE_ERROR = "Database error. Please try again."
```

## 9. Hardcoded MFA Code

### Location:
```python
# app/routes/admin.py:382
HARDCODED_MFA_CODE = "2538"
```

### Issue:
Hardcoded MFA code for development - should be in environment variable or config.

### Recommendation:
```python
HARDCODED_MFA_CODE = os.environ.get("DEV_MFA_CODE", None)  # Only in dev mode
```

## 10. Hardcoded Subscription Type Defaults

### Pattern Found:
```python
subscription_type = user.subscription_type or "free"
payment_status = user.payment_status or "active"
```

**Found in**: Multiple files (10+ occurrences)

### Recommendation:
Use constants:
```python
DEFAULT_SUBSCRIPTION_TYPE = SubscriptionTier.FREE
DEFAULT_PAYMENT_STATUS = PaymentStatus.TRIAL
```

## 11. Boilerplate Date/Time Formatting

### Pattern Found:
```python
created_at.isoformat() if created_at else None
```

**Found in**: Every serialization function (50+ occurrences)

### Recommendation:
Create serialization helper:
```python
# app/utils/serialization.py
def serialize_datetime(dt):
    """Safely serialize datetime to ISO format."""
    return dt.isoformat() if dt else None

def serialize_model(model, fields):
    """Serialize model to dict with specified fields."""
    return {field: getattr(model, field, None) for field in fields}
```

## 12. Hardcoded Interest Area Keywords

### Location:
```python
# app/routes/user.py:894-901
if "ai" in idea_lower or "artificial intelligence" in idea_lower:
    interest_areas.append("AI/ML")
elif "saas" in idea_lower or "software" in idea_lower:
    interest_areas.append("SaaS")
# ... etc
```

### Recommendation:
Move to configuration:
```python
# app/constants.py
INTEREST_AREA_KEYWORDS = {
    "AI/ML": ["ai", "artificial intelligence", "machine learning", "ml"],
    "SaaS": ["saas", "software", "platform"],
    "E-commerce": ["ecommerce", "e-commerce", "online store"],
    "Fintech": ["fintech", "finance", "payment", "banking"],
}
```

## 13. Hardcoded Validation Thresholds

### Locations:
- `app/routes/user.py`: `len(validations) < 2` (minimum for insights)
- `app/routes/validation.py`: `len(idea_explanation) < 10` (minimum idea length)
- Score thresholds: `7.5` (high score), `2` (low score cap)

### Recommendation:
```python
# app/constants.py
MIN_VALIDATIONS_FOR_INSIGHTS = 2
MIN_IDEA_EXPLANATION_LENGTH = 10
HIGH_SCORE_THRESHOLD = 7.5
LOW_SCORE_CAP = 2
```

## 14. Hardcoded Email Subjects and Templates

### Locations:
- `app/routes/auth.py`: `"Welcome to Startup Idea Advisor! 🚀"`
- `app/routes/payment.py`: Various email subjects
- `app/services/email_templates.py`: Template strings

### Status:
Mostly in `email_templates.py` (good), but some hardcoded in routes.

### Recommendation:
- Move all email subjects to `email_templates.py`
- Use constants for common phrases

## 15. Boilerplate Query Patterns

### Pattern Found:
```python
Model.query.filter_by(user_id=user.id).order_by(Model.created_at.desc()).all()
```

**Found in**: Multiple places with slight variations

### Recommendation:
Create query builder helpers:
```python
# app/utils/query_helpers.py
def get_user_records(model, user_id, limit=None, order_by=None, filters=None):
    """Get records for a user with common filters."""
    query = model.query.filter_by(user_id=user_id)
    if filters:
        query = query.filter_by(**filters)
    if order_by:
        query = query.order_by(order_by)
    if limit:
        query = query.limit(limit)
    return query.all()
```

## 16. Hardcoded Comparison Limits

### Location:
```python
# app/routes/user.py:782
if len(run_ids) + len(validation_ids) > 5:
    return jsonify({"success": False, "error": "Maximum 5 sessions can be compared at once"}), 400
```

### Recommendation:
```python
MAX_COMPARISON_SESSIONS = 5
```

## Summary of Recommendations

### High Priority (Immediate Impact):
1. **Create `app/constants.py`** with all magic numbers and strings
2. **Use existing enums** (`SubscriptionTier`, `PaymentStatus`, etc.) consistently
3. **Create JSON parsing utility** to reduce boilerplate
4. **Create response helpers** for consistent API responses
5. **Create error message constants**

### Medium Priority (Code Quality):
6. **Create error handling decorator**
7. **Create serialization helpers**
8. **Create query builder helpers**
9. **Move hardcoded MFA code to config**

### Low Priority (Nice to Have):
10. **Create interest area keyword configuration**
11. **Standardize email template usage**
12. **Remove duplicate authentication checks**

## Files to Create/Modify

### New Files:
- `app/constants.py` - All constants and configuration
- `app/utils/json_helpers.py` - JSON parsing utilities
- `app/utils/response_helpers.py` - Response formatting
- `app/utils/serialization.py` - Model serialization
- `app/utils/query_helpers.py` - Query building helpers
- `app/utils/error_handling.py` - Error handling decorators

### Files to Refactor:
- `app/routes/user.py` - Replace hardcoded values with constants
- `app/routes/admin.py` - Replace hardcoded values with constants
- `app/routes/payment.py` - Replace hardcoded values with constants
- `app/routes/auth.py` - Replace hardcoded values with constants
- `app/routes/validation.py` - Replace hardcoded values with constants

## Estimated Impact

- **Lines of code reduction**: ~500-800 lines (through utility functions)
- **Maintainability**: Significantly improved (single source of truth)
- **Type safety**: Better (using enums)
- **Consistency**: Improved (standardized patterns)
- **Testing**: Easier (mockable utilities)

