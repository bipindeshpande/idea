# 🔒 Phase 2.1 Implementation Plan - Medium-Risk Auth Endpoints

## Overview

**Scope:** Apply validation + rate limiting to 3 medium-risk authentication endpoints only.

**Endpoints:**
1. `POST /api/auth/forgot-password`
2. `POST /api/auth/reset-password`
3. `POST /api/auth/change-password`

**Files to Modify:** 1 file only
- `app/routes/auth.py`

**Dependencies:** None (uses existing validators and rate limiting infrastructure)

**Estimated Time:** 30-45 minutes

---

## 📋 Changes Summary

### 1. `POST /api/auth/forgot-password`
- **Add:** Rate limit decorator `@apply_rate_limit("3 per hour")`
- **Add:** Email validation using `validate_email()` from validators
- **Keep:** Existing email enumeration protection (same response for existing/non-existing emails)

### 2. `POST /api/auth/reset-password`
- **Add:** Rate limit decorator `@apply_rate_limit("3 per hour")`
- **Add:** Token validation using `validate_text_field()` (max 255 chars)
- **Replace:** Manual password length check with `validate_password()` from validators

### 3. `POST /api/auth/change-password`
- **Add:** Rate limit decorator `@apply_rate_limit("5 per hour")`
- **Replace:** Manual password length check with `validate_password()` from validators
- **Keep:** Existing current password verification

---

## 📝 Exact Diffs

### File: `app/routes/auth.py`

#### Change 1: Add `validate_text_field` to imports

**Location:** Line 16 (imports section)

**Current:**
```python
from app.utils.validators import validate_email, validate_password
```

**New:**
```python
from app.utils.validators import validate_email, validate_password, validate_text_field
```

**Reason:** Need `validate_text_field` for token validation in reset-password endpoint.

---

#### Change 2: Add rate limit and validation to `forgot_password()`

**Location:** Lines 374-415

**Current:**
```python
@bp.post("/forgot-password")
def forgot_password() -> Any:
    """Request password reset."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip().lower()
    
    if not email:
        return error_response(ErrorMessages.EMAIL_REQUIRED, 400)
```

**New:**
```python
@bp.post("/forgot-password")
@apply_rate_limit("3 per hour")
def forgot_password() -> Any:
    """Request password reset."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip().lower()
    
    # Validate email format
    is_valid, error_msg = validate_email(email)
    if not is_valid:
        return error_response(error_msg, 400)
```

**Reason:** 
- Add rate limiting (3 per hour per IP) to prevent email enumeration spam
- Use centralized email validation for consistency and security

---

#### Change 3: Add rate limit and validation to `reset_password()`

**Location:** Lines 418-451

**Current:**
```python
@bp.post("/reset-password")
def reset_password() -> Any:
    """Reset password with token."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    token = data.get("token", "").strip()
    new_password = data.get("password", "").strip()
    
    if not token or not new_password:
        return error_response("Token and password are required", 400)
    
    if len(new_password) < MIN_PASSWORD_LENGTH:
        return error_response(ErrorMessages.PASSWORD_TOO_SHORT, 400)
```

**New:**
```python
@bp.post("/reset-password")
@apply_rate_limit("3 per hour")
def reset_password() -> Any:
    """Reset password with token."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    token = data.get("token", "").strip()
    new_password = data.get("password", "").strip()
    
    # Validate token format
    if not token:
        return error_response("Token is required", 400)
    
    is_valid, error_msg = validate_text_field(token, "Token", required=True, max_length=255)
    if not is_valid:
        return error_response(error_msg, 400)
    
    # Validate password
    if not new_password:
        return error_response("Password is required", 400)
    
    is_valid, error_msg = validate_password(new_password)
    if not is_valid:
        return error_response(error_msg, 400)
```

**Reason:**
- Add rate limiting (3 per hour per IP) to prevent token brute force
- Validate token format (max length, no dangerous characters)
- Use centralized password validation for consistency

---

#### Change 4: Add rate limit and validation to `change_password()`

**Location:** Lines 454-491

**Current:**
```python
@bp.post("/change-password")
@require_auth
def change_password() -> Any:
    """Change password (requires current password)."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    current_password = data.get("current_password", "").strip()
    new_password = data.get("new_password", "").strip()
    
    if not current_password or not new_password:
        return error_response("Current and new passwords are required", 400)
    
    if len(new_password) < MIN_PASSWORD_LENGTH:
        return error_response(ErrorMessages.PASSWORD_TOO_SHORT, 400)
```

**New:**
```python
@bp.post("/change-password")
@require_auth
@apply_rate_limit("5 per hour")
def change_password() -> Any:
    """Change password (requires current password)."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    current_password = data.get("current_password", "").strip()
    new_password = data.get("new_password", "").strip()
    
    if not current_password or not new_password:
        return error_response("Current and new passwords are required", 400)
    
    # Validate new password
    is_valid, error_msg = validate_password(new_password)
    if not is_valid:
        return error_response(error_msg, 400)
```

**Reason:**
- Add rate limiting (5 per hour) to prevent abuse (authenticated, so less strict than public endpoints)
- Use centralized password validation for consistency

---

## ✅ Validation Details

### `forgot_password()` Validation
- **Email:** Uses `validate_email()` which checks:
  - Required field
  - Max length (254 chars)
  - Valid email format (regex)
  - No dangerous characters (`<`, `>`, `"`, `'`, `&`, null bytes)

### `reset_password()` Validation
- **Token:** Uses `validate_text_field()` which checks:
  - Required field
  - Max length (255 chars)
  - No null bytes
  - No dangerous patterns
- **Password:** Uses `validate_password()` which checks:
  - Required field
  - Min length (8 chars, from MIN_PASSWORD_LENGTH constant)
  - Max length (128 chars)
  - No null bytes

### `change_password()` Validation
- **New Password:** Uses `validate_password()` which checks:
  - Required field
  - Min length (8 chars)
  - Max length (128 chars)
  - No null bytes
- **Current Password:** Kept as-is (manual check against database)

---

## 🚦 Rate Limiting Details

### Rate Limits Applied

1. **`forgot_password()`:** `3 per hour` per IP
   - Prevents email enumeration spam
   - Public endpoint (no auth required)

2. **`reset-password()`:** `3 per hour` per IP
   - Prevents token brute force attempts
   - Public endpoint (no auth required)

3. **`change-password()`:** `5 per hour` per user
   - Prevents abuse of authenticated endpoint
   - Less strict than public endpoints (user is authenticated)

### Rate Limiting Implementation

Uses existing `@apply_rate_limit()` decorator which:
- Uses Flask-Limiter (already configured)
- Falls back gracefully if limiter unavailable
- Uses IP address for public endpoints (forgot/reset)
- Uses user session for authenticated endpoints (change-password)

---

## 🔍 Testing Checklist

### Manual Testing

- [ ] **forgot-password:**
  - [ ] Valid email → Success (rate limit: 3/hour)
  - [ ] Invalid email format → 400 error
  - [ ] Empty email → 400 error
  - [ ] Email with dangerous chars → 400 error
  - [ ] 4th request in 1 hour → 429 rate limit error

- [ ] **reset-password:**
  - [ ] Valid token + password → Success (rate limit: 3/hour)
  - [ ] Invalid token format → 400 error
  - [ ] Token too long (>255 chars) → 400 error
  - [ ] Password too short → 400 error
  - [ ] Password too long (>128 chars) → 400 error
  - [ ] 4th request in 1 hour → 429 rate limit error

- [ ] **change-password:**
  - [ ] Valid current + new password → Success (rate limit: 5/hour)
  - [ ] Invalid current password → 400 error
  - [ ] New password too short → 400 error
  - [ ] New password too long → 400 error
  - [ ] 6th request in 1 hour → 429 rate limit error

### Edge Cases

- [ ] Email with leading/trailing whitespace (should be stripped)
- [ ] Token with null bytes (should be rejected)
- [ ] Password with null bytes (should be rejected)
- [ ] Very long email (>254 chars) → 400 error
- [ ] Very long token (>255 chars) → 400 error

---

## 📊 Impact Analysis

### Breaking Changes
- **None** - All validation rules are stricter than current checks, so valid inputs will still pass

### Performance Impact
- **Minimal** - Validation is fast (regex checks, length checks)
- Rate limiting uses existing Flask-Limiter infrastructure

### Security Improvements
- ✅ Prevents email enumeration spam (rate limiting)
- ✅ Prevents token brute force (rate limiting + validation)
- ✅ Prevents password abuse (rate limiting + validation)
- ✅ Consistent validation across all auth endpoints
- ✅ Blocks dangerous characters/patterns in inputs

---

## 🎯 Success Criteria

Phase 2.1 is complete when:

1. ✅ All 3 endpoints have rate limiting decorators
2. ✅ All 3 endpoints use centralized validators
3. ✅ All validation errors return consistent error messages
4. ✅ Rate limiting works correctly (429 responses when exceeded)
5. ✅ No breaking changes (existing valid inputs still work)
6. ✅ Code follows existing patterns (uses `@apply_rate_limit`, existing validators)

---

## 📝 Implementation Steps

1. **Open** `app/routes/auth.py`
2. **Add** `validate_text_field` to imports (line 16)
3. **Add** `@apply_rate_limit("3 per hour")` decorator to `forgot_password()` (line 374)
4. **Replace** email validation in `forgot_password()` with `validate_email()` (line 380)
5. **Add** `@apply_rate_limit("3 per hour")` decorator to `reset_password()` (line 418)
6. **Add** token validation in `reset_password()` using `validate_text_field()` (after line 423)
7. **Replace** password validation in `reset_password()` with `validate_password()` (replace line 428-429)
8. **Add** `@apply_rate_limit("5 per hour")` decorator to `change_password()` (line 454)
9. **Replace** password validation in `change_password()` with `validate_password()` (replace line 469-470)
10. **Test** all 3 endpoints with valid and invalid inputs
11. **Test** rate limiting by making multiple requests

---

## ⚠️ Notes

- **No new dependencies** - Uses existing `app/utils/validators.py` and `@apply_rate_limit` helper
- **No refactoring** - Only adds validation and rate limiting, doesn't change business logic
- **Consistent patterns** - Follows same approach as Phase 1 (register/login endpoints)
- **Backward compatible** - All existing valid inputs will continue to work

---

## 🔗 Related Files (Reference Only - No Changes)

- `app/utils/validators.py` - Contains `validate_email()`, `validate_password()`, `validate_text_field()`
- `api.py` - Contains Flask-Limiter configuration
- `app/routes/auth.py` - Contains `@apply_rate_limit()` helper function

---

**Status:** 📋 **PLANNING PHASE - READY FOR IMPLEMENTATION**

No code changes have been made. This plan is ready for review and approval before implementation.
