# 🔒 Phase 2.2 Implementation Plan - Subscription & Payment Endpoint Hardening

## Overview

**Scope:** Apply validation + rate limiting to subscription and payment endpoints.

**Endpoints:**
1. `POST /api/payment/create-intent` - Already secured (no changes)
2. `POST /api/payment/confirm` - Already secured (no changes)
3. `POST /api/subscription/change-plan` - Add rate limiting + enhance validation
4. `POST /api/subscription/cancel` - Add rate limiting + comprehensive validation
5. `GET /api/subscription/status` - Add rate limiting (read-only)

**Files to Modify:** 1 file only
- `app/routes/payment.py`

**Dependencies:** None (uses existing validators and rate limiting infrastructure)

**Estimated Time:** 30-45 minutes

---

## 📋 Current State Analysis

### Already Secured (No Changes Needed)

#### 1. `POST /api/payment/create-intent`
- ✅ Rate limit: `5 per hour` (line 454)
- ✅ Validation: `validate_text_field()` for subscription_type (lines 465-473)
- ✅ Whitelist validation: Subscription type enum check (lines 476-478)

#### 2. `POST /api/payment/confirm`
- ✅ Rate limit: `5 per hour` (line 535)
- ✅ Validation: `validate_text_field()` for payment_intent_id (lines 547-555)
- ✅ Validation: `validate_text_field()` for subscription_type (lines 558-566)
- ✅ Whitelist validation: Subscription type enum check (line 605)

### Needs Security Hardening

#### 3. `POST /api/subscription/change-plan`
- ❌ No rate limiting
- ⚠️ Basic validation exists (whitelist check), but could enhance with format validation first

#### 4. `POST /api/subscription/cancel`
- ❌ No rate limiting
- ⚠️ Basic validation (required check only), needs comprehensive validation

#### 5. `GET /api/subscription/status`
- ❌ No rate limiting
- ✅ No validation needed (read-only endpoint)

---

## 📝 Exact Diffs

### File: `app/routes/payment.py`

---

#### Change 1: Add rate limit to `get_subscription_status()`

**Location:** Line 70-72

**Current:**
```python
@bp.get("/api/subscription/status")
@require_auth
def get_subscription_status() -> Any:
```

**New:**
```python
@bp.get("/api/subscription/status")
@require_auth
@apply_rate_limit("30 per hour")
def get_subscription_status() -> Any:
```

**Reason:** Add rate limiting to prevent abuse of read-only endpoint (less strict since it's read-only).

---

#### Change 2: Add rate limit and enhance validation to `cancel_subscription()`

**Location:** Lines 134-167

**Current:**
```python
@bp.post("/api/subscription/cancel")
@require_auth
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
    
    if not cancellation_reason:
        return error_response("Cancellation reason is required", 400)
```

**New:**
```python
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
```

**Reason:**
- Add rate limiting (5 per hour) to prevent abuse
- Comprehensive validation for all cancellation fields using centralized validators
- Prevents XSS attacks and ensures data quality

---

#### Change 3: Add rate limit and enhance validation to `change_subscription_plan()`

**Location:** Lines 259-273

**Current:**
```python
@bp.post("/api/subscription/change-plan")
@require_auth
def change_subscription_plan() -> Any:
    """Change subscription plan (upgrade or downgrade)."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    new_subscription_type = data.get("subscription_type", "").strip()
    
    # Valid subscription types: starter, pro, annual
    valid_types = [SubscriptionTier.STARTER, SubscriptionTier.PRO, SubscriptionTier.ANNUAL]
    if new_subscription_type not in valid_types:
        return error_response("Invalid subscription type", 400)
```

**New:**
```python
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
```

**Reason:**
- Add rate limiting (5 per hour) to prevent abuse
- Add format validation before whitelist check for better error messages and security

---

## ✅ Validation Details

### `cancel_subscription()` Validation

1. **cancellation_reason** (required):
   - Uses `validate_text_field()` with:
     - Required: `True`
     - Max length: 500 characters
     - No HTML allowed (prevents XSS)
     - Blocks script tags, javascript: protocol, event handlers

2. **cancellation_category** (optional):
   - Uses `validate_text_field()` with:
     - Required: `False`
     - Max length: 100 characters
     - No HTML allowed
     - Only validates if provided (not empty)

3. **additional_comments** (optional):
   - Uses `validate_text_field()` with:
     - Required: `False`
     - Max length: 1000 characters
     - No HTML allowed
     - Only validates if provided (not empty)

### `change_subscription_plan()` Validation

1. **subscription_type** (required):
   - Uses `validate_text_field()` for format validation:
     - Required: `True`
     - Max length: 50 characters
     - No HTML allowed
   - Then validates against whitelist (existing check):
     - Must be one of: `SubscriptionTier.STARTER`, `SubscriptionTier.PRO`, `SubscriptionTier.ANNUAL`

### `get_subscription_status()` Validation

- **No input validation needed** (read-only GET endpoint with no query parameters)

---

## 🚦 Rate Limiting Details

### Rate Limits Applied

1. **`get_subscription_status()`:** `30 per hour` per user
   - Read-only endpoint (less strict)
   - Prevents excessive API calls
   - Authenticated endpoint (uses user session)

2. **`cancel_subscription()`:** `5 per hour` per user
   - State-changing operation
   - Prevents abuse/spam cancellations
   - Authenticated endpoint

3. **`change_subscription_plan()`:** `5 per hour` per user
   - State-changing operation
   - Prevents subscription manipulation abuse
   - Authenticated endpoint

### Rate Limiting Implementation

Uses existing `@apply_rate_limit()` decorator which:
- Uses Flask-Limiter (already configured)
- Falls back gracefully if limiter unavailable
- Uses user session for authenticated endpoints (change-plan, cancel, status)

---

## 🔍 Testing Checklist

### Manual Testing

- [ ] **get_subscription_status:**
  - [ ] Valid request → Success (rate limit: 30/hour)
  - [ ] 31st request in 1 hour → 429 rate limit error
  - [ ] Requires authentication → 401 if not authenticated

- [ ] **cancel_subscription:**
  - [ ] Valid cancellation with all fields → Success (rate limit: 5/hour)
  - [ ] Missing cancellation_reason → 400 error
  - [ ] cancellation_reason too long (>500 chars) → 400 error
  - [ ] cancellation_reason with script tags → 400 error
  - [ ] cancellation_category too long (>100 chars) → 400 error
  - [ ] additional_comments too long (>1000 chars) → 400 error
  - [ ] 6th request in 1 hour → 429 rate limit error
  - [ ] Cancelling free tier → 400 error (already implemented)
  - [ ] Cancelling already cancelled subscription → 400 error (already implemented)

- [ ] **change_subscription_plan:**
  - [ ] Valid subscription type → Success (rate limit: 5/hour)
  - [ ] Missing subscription_type → 400 error
  - [ ] subscription_type too long (>50 chars) → 400 error
  - [ ] Invalid subscription type → 400 error
  - [ ] subscription_type with script tags → 400 error
  - [ ] 6th request in 1 hour → 429 rate limit error
  - [ ] Changing to same plan → 400 error (already implemented)
  - [ ] Changing from free trial → 400 error (already implemented)

### Edge Cases

- [ ] Empty cancellation_reason (should be rejected)
- [ ] Whitespace-only cancellation_reason (should be rejected after strip)
- [ ] cancellation_reason with null bytes (should be rejected)
- [ ] Optional fields (cancellation_category, additional_comments) with empty strings (should pass)
- [ ] Optional fields with whitespace-only (should pass after strip)
- [ ] subscription_type with special characters (should be rejected by whitelist)

---

## 📊 Impact Analysis

### Breaking Changes
- **None** - All validation rules are stricter than current checks, so valid inputs will still pass

### Performance Impact
- **Minimal** - Validation is fast (regex checks, length checks)
- Rate limiting uses existing Flask-Limiter infrastructure

### Security Improvements
- ✅ Prevents subscription manipulation abuse (rate limiting)
- ✅ Prevents cancellation spam (rate limiting)
- ✅ Comprehensive input validation (prevents XSS, injection)
- ✅ Consistent validation across all subscription endpoints
- ✅ Blocks dangerous characters/patterns in inputs

---

## 🎯 Success Criteria

Phase 2.2 is complete when:

1. ✅ `get_subscription_status()` has rate limiting (30/hour)
2. ✅ `cancel_subscription()` has rate limiting (5/hour) and comprehensive validation
3. ✅ `change_subscription_plan()` has rate limiting (5/hour) and enhanced validation
4. ✅ All validation errors return consistent error messages
5. ✅ Rate limiting works correctly (429 responses when exceeded)
6. ✅ No breaking changes (existing valid inputs still work)
7. ✅ Code follows existing patterns (uses `@apply_rate_limit`, existing validators)

---

## 📝 Implementation Steps

1. **Open** `app/routes/payment.py`
2. **Add** `@apply_rate_limit("30 per hour")` decorator to `get_subscription_status()` (line 71)
3. **Add** `@apply_rate_limit("5 per hour")` decorator to `cancel_subscription()` (line 135)
4. **Add** validation for `cancellation_reason` in `cancel_subscription()` using `validate_text_field()` (after line 167)
5. **Add** validation for `cancellation_category` in `cancel_subscription()` (conditional, after cancellation_reason validation)
6. **Add** validation for `additional_comments` in `cancel_subscription()` (conditional, after cancellation_category validation)
7. **Remove** old simple `if not cancellation_reason` check (line 166-167) - replaced by validator
8. **Add** `@apply_rate_limit("5 per hour")` decorator to `change_subscription_plan()` (line 260)
9. **Add** format validation for `subscription_type` in `change_subscription_plan()` using `validate_text_field()` (before whitelist check, after line 268)
10. **Test** all 3 endpoints with valid and invalid inputs
11. **Test** rate limiting by making multiple requests

---

## ⚠️ Notes

- **No new dependencies** - Uses existing `app/utils/validators.py` and `@apply_rate_limit` helper
- **No refactoring** - Only adds validation and rate limiting, doesn't change business logic
- **Consistent patterns** - Follows same approach as Phase 1 and Phase 2.1
- **Backward compatible** - All existing valid inputs will continue to work
- **Payment endpoints unchanged** - `create-intent` and `confirm` already have proper validation and rate limiting

---

## 🔗 Related Files (Reference Only - No Changes)

- `app/utils/validators.py` - Contains `validate_text_field()` function
- `api.py` - Contains Flask-Limiter configuration
- `app/routes/payment.py` - Contains `@apply_rate_limit()` helper function
- `app/models/database.py` - Contains `SubscriptionTier` enum definition
- `app/constants.py` - Contains subscription-related constants

---

## 📋 Validation Requirements Summary

### Endpoint: `POST /api/subscription/cancel`

| Field | Required | Max Length | Validation Function | Notes |
|-------|----------|------------|---------------------|-------|
| `cancellation_reason` | ✅ Yes | 500 chars | `validate_text_field()` | Required, no HTML |
| `cancellation_category` | ❌ No | 100 chars | `validate_text_field()` | Optional, no HTML |
| `additional_comments` | ❌ No | 1000 chars | `validate_text_field()` | Optional, no HTML |

### Endpoint: `POST /api/subscription/change-plan`

| Field | Required | Max Length | Validation Function | Notes |
|-------|----------|------------|---------------------|-------|
| `subscription_type` | ✅ Yes | 50 chars | `validate_text_field()` + whitelist | Required, must be STARTER/PRO/ANNUAL |

### Endpoint: `GET /api/subscription/status`

| Field | Required | Max Length | Validation Function | Notes |
|-------|----------|------------|---------------------|-------|
| None | N/A | N/A | N/A | Read-only endpoint, no input |

---

## 🚦 Rate Limit Summary

| Endpoint | Rate Limit | Type | Rationale |
|----------|------------|------|-----------|
| `GET /api/subscription/status` | 30 per hour | Read | Read-only, less strict |
| `POST /api/subscription/cancel` | 5 per hour | Write | Prevents cancellation spam |
| `POST /api/subscription/change-plan` | 5 per hour | Write | Prevents subscription manipulation |
| `POST /api/payment/create-intent` | 5 per hour | Write | Already implemented ✅ |
| `POST /api/payment/confirm` | 5 per hour | Write | Already implemented ✅ |

---

**Status:** 📋 **PLANNING PHASE - READY FOR IMPLEMENTATION**

No code changes have been made. This plan is ready for review and approval before implementation.
