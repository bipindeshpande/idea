# Boilerplate and Hardcoded Values Refactoring Plan

## Quick Reference: Most Common Issues

### 1. Subscription Type Strings (50+ occurrences)
**Problem**: Using `"free"`, `"starter"`, `"pro"`, `"annual"` as strings instead of enum
**Files**: `payment.py`, `user.py`, `admin.py`, `auth.py`
**Fix**: Use `SubscriptionTier.FREE`, `SubscriptionTier.STARTER`, etc.

### 2. Status Strings (30+ occurrences)
**Problem**: Using `"active"`, `"pending"`, `"completed"` as strings
**Files**: All route files
**Fix**: Use `PaymentStatus.ACTIVE`, `RunStatus.COMPLETED`, etc.

### 3. Magic Numbers (100+ occurrences)
**Problem**: Hardcoded `30`, `365`, `50`, `100`, `1000`, `10000`, `255`, `8`
**Files**: All route files
**Fix**: Create `app/constants.py` with named constants

### 4. JSON Parsing Boilerplate (40+ occurrences)
**Problem**: Repeated try/except blocks for `json.loads()`
**Files**: `user.py`, `validation.py`, `discovery.py`
**Fix**: Create `safe_json_loads()` utility

### 5. Error Response Boilerplate (100+ occurrences)
**Problem**: Repeated `jsonify({"success": False, "error": ...})`
**Files**: All route files
**Fix**: Create `error_response()` helper

### 6. Authentication Check Boilerplate (30+ occurrences)
**Problem**: Some routes duplicate `@require_auth` check
**Files**: `user.py`, `admin.py`
**Fix**: Remove duplicate checks (decorator handles it)

## Detailed Findings

### Hardcoded Subscription Durations
```python
# Found in: app/routes/payment.py (lines 61, 249, 343, 455, 559, 670)
{"starter": 30, "pro": 30, "annual": 365}
```

### Hardcoded Subscription Prices
```python
# Found in: app/routes/payment.py (lines 337-339, 449-451)
"starter": 900,   # $9.00/month
"pro": 1500,      # $15.00/month
"annual": 12000,  # $120.00/year
```

### Hardcoded Pagination Values
```python
# Found in: app/routes/user.py (lines 52-53, 187-188)
per_page = request.args.get("per_page", 50, type=int)
per_page = min(per_page, 100)  # Cap at 100
```

### Hardcoded Query Limits
```python
# Found in multiple files:
.limit(10)   # app/routes/admin.py:234-237, app/routes/payment.py:70
.limit(50)   # app/routes/user.py:860, app/routes/admin.py:236
.limit(100)  # app/routes/admin.py:159, app/routes/public.py:192
```

### Hardcoded Field Length Limits
```python
# Found in: app/routes/user.py
if len(action_text) > 1000:      # Line 461, 528
if len(idea_id) > 255:            # Line 464, 661
if len(content) > 10000:           # Line 658, 708
if len(password) < 8:             # app/routes/auth.py:47, admin.py:496
```

### Hardcoded Score Thresholds
```python
# Found in: app/routes/user.py
if v["score"] >= 7.5:             # Line 937
validations[:10]                   # Line 923
validations[:5]                    # Line 947
len(validations) < 2               # Line 862
```

### Hardcoded MFA Code
```python
# Found in: app/routes/admin.py:382
HARDCODED_MFA_CODE = "2538"
```

### Hardcoded Comparison Limit
```python
# Found in: app/routes/user.py:782
if len(run_ids) + len(validation_ids) > 5:
```

### Hardcoded Interest Area Keywords
```python
# Found in: app/routes/user.py:894-901
if "ai" in idea_lower or "artificial intelligence" in idea_lower:
    interest_areas.append("AI/ML")
elif "saas" in idea_lower or "software" in idea_lower:
    interest_areas.append("SaaS")
# ... etc
```

### Hardcoded Validation Thresholds
```python
# Found in: app/routes/validation.py
len(idea_explanation) < 10        # Minimum idea length
score >= 7.5                      # High score threshold
score <= 2                         # Low score cap
```

## Recommended File Structure

```
app/
├── constants.py          # NEW: All constants
├── utils/
│   ├── __init__.py
│   ├── json_helpers.py   # NEW: JSON parsing utilities
│   ├── response_helpers.py  # NEW: Response formatting
│   ├── serialization.py     # NEW: Model serialization
│   └── query_helpers.py     # NEW: Query builders
└── utils.py             # EXISTING: Keep existing utilities
```

## Implementation Priority

### Phase 1: Constants (High Impact, Low Risk)
1. Create `app/constants.py` with all magic numbers and strings
2. Update imports in route files
3. Replace hardcoded values with constants

### Phase 2: Utilities (Medium Impact, Low Risk)
1. Create `safe_json_loads()` utility
2. Create `success_response()` and `error_response()` helpers
3. Create `serialize_datetime()` helper
4. Gradually refactor routes to use utilities

### Phase 3: Enums (High Impact, Medium Risk)
1. Ensure all routes use `SubscriptionTier`, `PaymentStatus`, etc.
2. Replace string literals with enum values
3. Add type hints using enums

### Phase 4: Query Helpers (Low Impact, Low Risk)
1. Create query builder utilities
2. Refactor common query patterns

## Example Refactoring

### Before:
```python
# app/routes/user.py
if len(action_text) > 1000:
    return jsonify({"success": False, "error": "action_text must be 1000 characters or less"}), 400

subscription_type = user.subscription_type or "free"
if subscription_type == "free":
    # ...
```

### After:
```python
# app/routes/user.py
from app.constants import MAX_ACTION_TEXT_LENGTH, DEFAULT_SUBSCRIPTION_TYPE
from app.models.database import SubscriptionTier
from app.utils.response_helpers import error_response

if len(action_text) > MAX_ACTION_TEXT_LENGTH:
    return error_response(f"action_text must be {MAX_ACTION_TEXT_LENGTH} characters or less", 400)

subscription_type = user.subscription_type or DEFAULT_SUBSCRIPTION_TYPE
if subscription_type == SubscriptionTier.FREE:
    # ...
```

## Testing Strategy

1. **Unit Tests**: Test all new utility functions
2. **Integration Tests**: Verify routes still work after refactoring
3. **Regression Tests**: Ensure no functionality is broken
4. **Type Checking**: Use mypy to verify enum usage

## Migration Notes

- Refactor incrementally (one file at a time)
- Keep old code commented during transition
- Test thoroughly after each refactoring
- Update documentation as you go

