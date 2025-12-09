# 🔒 Phase 2 Security Plan - Medium Risk Endpoints & Enhancements

## Overview

This document outlines Phase 2 security improvements for medium-risk endpoints and additional security hardening. **NO IMPLEMENTATION YET** - this is the planning phase for review and approval.

**Phase 1 Status:** ✅ **COMPLETE**
- Centralized validation module created (`app/utils/validators.py`)
- Validation and rate limiting applied to HIGH RISK endpoints
- All changes implemented and tested

---

## 🎯 Phase 2 Objectives

1. Apply validation and rate limiting to **MEDIUM RISK endpoints**
2. Enhance security headers (additional hardening)
3. Implement CSRF protection for write operations
4. Add monitoring and alerting for security events

---

## 📋 Medium-Risk Endpoints Inventory

### **Authentication Routes** (`app/routes/auth.py`)

#### 1. `POST /api/auth/forgot-password`
**Risk Level:** 🟡 **MEDIUM**
- **Current Status:** Basic validation exists
- **Risk:** Email enumeration, spam/abuse

**Recommended Validations:**
- ✅ Email format validation (use `validate_email()`)
- ✅ Rate limiting: **3 per hour per IP**
- ⚠️ Length limit: Email max 254 chars (already handled by validator)
- ⚠️ Sanitization: Strip whitespace, lowercase (already done)

**Rate Limit:** `3 per hour per IP` (prevents email enumeration spam)

**Additional Security:**
- Always return same success message (don't reveal if email exists) ✅ Already implemented
- Log failed attempts for monitoring

---

#### 2. `POST /api/auth/reset-password`
**Risk Level:** 🟡 **MEDIUM**
- **Current Status:** Basic validation exists
- **Risk:** Token abuse, brute force on tokens

**Recommended Validations:**
- ✅ Token format validation (alphanumeric + URL-safe, max 255 chars)
- ✅ Password validation (use `validate_password()`)
- ✅ Token expiration check (already in place via database)
- ⚠️ Rate limiting: **3 per hour per IP**

**Rate Limit:** `3 per hour per IP`

**Additional Security:**
- Token must match database record (already implemented) ✅
- Token expiration enforced (already implemented) ✅

---

#### 3. `POST /api/auth/change-password`
**Risk Level:** 🟡 **MEDIUM**
- **Current Status:** Basic validation exists
- **Risk:** Account takeover if authenticated session compromised

**Recommended Validations:**
- ✅ Current password validation (must match)
- ✅ New password validation (use `validate_password()`)
- ⚠️ Rate limiting: **5 per hour** (authenticated, less risky)

**Rate Limit:** `5 per hour`

**Additional Security:**
- Requires authentication ✅
- Current password must match ✅

---

### **Discovery Routes** (`app/routes/discovery.py`)

#### 4. `POST /api/enhance-report`
**Risk Level:** 🟡 **MEDIUM**
- **Current Status:** No validation, no rate limiting
- **Risk:** AI API abuse (less expensive than `/api/run`, but still costly)

**Recommended Validations:**
- ✅ Run ID format validation (alphanumeric + underscore + hyphen, max 255 chars)
- ✅ Run must belong to user (authorization check - already exists)
- ✅ Run must exist and not be deleted (already checked)
- ⚠️ Rate limiting: **10 enhancements per hour**

**Rate Limit:** `10 per hour`

**Additional Security:**
- Requires authentication ✅
- Authorization check (run belongs to user) ✅

---

### **Founder Connect Routes** (`app/routes/founder.py`)

#### 5. `POST /api/founder/profile`
**Risk Level:** 🟡 **MEDIUM**
- **Current Status:** No centralized validation
- **Risk:** User-generated content (XSS, spam, malicious URLs)

**Recommended Validations:**
- ✅ `full_name`: Max 200 chars, no HTML/script tags
- ✅ `bio`: Max 2,000 chars, no script tags
- ✅ `skills`: Array validation (max 50 items, 100 chars each)
- ✅ `experience_summary`: Max 5,000 chars, no script tags
- ✅ `location`: Max 200 chars, no HTML tags
- ✅ `linkedin_url`: URL validation with domain check (`linkedin.com`)
- ✅ `website_url`: URL validation (must be valid HTTP/HTTPS URL)
- ✅ `primary_skills`: Array validation (max 20 items, 100 chars each)
- ✅ `industries_of_interest`: Array validation (max 20 items, 200 chars each)
- ✅ `looking_for`: Max 1,000 chars, no script tags
- ✅ `commitment_level`: Whitelist validation (must match known values)
- ✅ `is_public`: Boolean validation
- ⚠️ Rate limiting: **20 profile updates per hour**

**Rate Limit:** `20 per hour`

**Additional Security:**
- Requires authentication ✅
- Sanitize all text fields before storing

---

#### 6. `POST /api/founder/ideas`
**Risk Level:** 🟡 **MEDIUM**
- **Current Status:** Basic validation exists
- **Risk:** User-generated content, spam listings

**Recommended Validations:**
- ✅ `title`: Required, max 500 chars, no HTML/script tags
- ✅ `source_type`: Must be "validation" or "advisor" (already validated)
- ✅ `source_id`: Format validation (alphanumeric or integer, max 255 chars)
- ✅ `industry`: Max 200 chars, optional
- ✅ `stage`: Max 100 chars, optional
- ✅ `skills_needed`: Array validation (max 20 items, 100 chars each)
- ✅ `commitment_level`: Max 100 chars, optional
- ✅ `brief_description`: Max 2,000 chars, no script tags
- ✅ Source authorization (must belong to user - already checked)
- ⚠️ Rate limiting: **10 listing creations per hour**

**Rate Limit:** `10 per hour`

**Additional Security:**
- Requires authentication ✅
- Authorization check (source belongs to user) ✅
- Prevent duplicate listings (already checked) ✅

---

#### 7. `PUT /api/founder/ideas/<listing_id>`
**Risk Level:** 🟡 **MEDIUM**
- **Current Status:** Basic validation exists
- **Risk:** User-generated content updates

**Recommended Validations:**
- ✅ `title`: Max 500 chars, no HTML/script tags (if provided)
- ✅ `brief_description`: Max 2,000 chars, no script tags (if provided)
- ✅ `industry`: Max 200 chars (if provided)
- ✅ `stage`: Max 100 chars (if provided)
- ✅ `skills_needed`: Array validation (max 20 items, 100 chars each) (if provided)
- ✅ `commitment_level`: Max 100 chars (if provided)
- ✅ `is_active`: Boolean validation (if provided)
- ✅ Authorization check (listing belongs to user - already checked)
- ⚠️ Rate limiting: **20 updates per hour**

**Rate Limit:** `20 per hour`

**Additional Security:**
- Requires authentication ✅
- Authorization check (listing belongs to user) ✅

---

#### 8. `POST /api/founder/connect`
**Risk Level:** 🟡 **MEDIUM**
- **Current Status:** No centralized validation
- **Risk:** Spam/abuse, malicious connection messages

**Recommended Validations:**
- ✅ `recipient_profile_id`: Integer validation, must be valid profile ID (if provided)
- ✅ `idea_listing_id`: Integer validation, must be valid listing ID (if provided)
- ✅ `message`: Max 1,000 chars, no script tags (optional)
- ✅ Either `recipient_profile_id` OR `idea_listing_id` required (mutual exclusivity check)
- ✅ Cannot send to self (already checked)
- ✅ Credit check (already implemented)
- ✅ No duplicate pending requests (already checked)
- ⚠️ Rate limiting: **20 connection requests per hour**

**Rate Limit:** `20 per hour` (in addition to credit limits)

**Additional Security:**
- Requires authentication ✅
- Credit limits enforced ✅

---

### **Payment/Subscription Routes** (`app/routes/payment.py`)

#### 9. `POST /api/subscription/cancel`
**Risk Level:** 🟡 **MEDIUM**
- **Current Status:** Basic validation exists
- **Risk:** Business logic abuse, spam cancellations

**Recommended Validations:**
- ✅ `cancellation_reason`: Required, max 500 chars, no HTML/script tags
- ✅ `cancellation_category`: Optional, max 100 chars, no HTML tags
- ✅ `additional_comments`: Optional, max 1,000 chars, no script tags
- ✅ Authorization: User must have active paid subscription (already checked)
- ✅ Authorization: Cannot cancel free tier (already checked)
- ✅ Idempotency: Prevent duplicate cancellations (already checked)
- ⚠️ Rate limiting: **5 cancellations per hour**

**Rate Limit:** `5 per hour` (should be rare, but prevent abuse)

**Additional Security:**
- Requires authentication ✅
- Business logic validation (subscription type check) ✅

---

#### 10. `POST /api/subscription/change-plan`
**Risk Level:** 🟡 **MEDIUM**
- **Current Status:** Basic validation exists
- **Risk:** Business logic abuse, subscription manipulation

**Recommended Validations:**
- ✅ `subscription_type`: Required, must be one of valid types (already validated)
- ✅ Format validation: Max 50 chars, no HTML tags
- ✅ Authorization: Cannot change if on free trial (already checked)
- ✅ Business logic: Cannot change to same plan (already checked)
- ⚠️ Rate limiting: **5 plan changes per hour**

**Rate Limit:** `5 per hour`

**Additional Security:**
- Requires authentication ✅
- Business logic validation ✅

---

### **Public Routes** (`app/routes/public.py`)

#### 11. `POST /api/contact`
**Risk Level:** 🟡 **MEDIUM**
- **Current Status:** Basic validation exists
- **Risk:** Spam target (public endpoint), email injection

**Recommended Validations:**
- ✅ `name`: Required, max 200 chars, no HTML/script tags
- ✅ `email`: Required, email format validation (use `validate_email()`)
- ✅ `company`: Optional, max 200 chars, no HTML tags
- ✅ `topic`: Optional, max 200 chars, no HTML tags
- ✅ `message`: Required, max 5,000 chars, no script tags
- ✅ Content quality: Message must be at least 10 chars (meaningful)
- ⚠️ Rate limiting: **3 submissions per hour per IP** (public endpoint)

**Rate Limit:** `3 per hour per IP`

**Additional Security:**
- Public endpoint (no authentication required)
- Consider adding honeypot field (Phase 3)
- Consider CAPTCHA for production (Phase 3)

---

## 🛡️ Header Hardening Improvements

### **Current Security Headers** (in `api.py`)

You already have these headers configured:
```python
- Content-Security-Policy ✅
- X-Content-Type-Options: nosniff ✅
- X-Frame-Options: DENY ✅
- X-XSS-Protection: 1; mode=block ✅
- Referrer-Policy: strict-origin-when-cross-origin ✅
```

### **Recommended Additional Headers**

#### 1. **Permissions-Policy (Feature Policy)**
**Purpose:** Control which browser features can be used

**Recommendation:**
```python
response.headers['Permissions-Policy'] = (
    "geolocation=(), "
    "microphone=(), "
    "camera=(), "
    "payment=(), "
    "usb=()"
)
```

**Rationale:** Disable unnecessary browser features to reduce attack surface

---

#### 2. **Strict-Transport-Security (HSTS)**
**Purpose:** Force HTTPS connections

**Recommendation:**
```python
# Only in production (HTTPS required)
if is_production:
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
```

**Rationale:** Prevents downgrade attacks, enforces HTTPS
**Note:** Railway/Vercel may handle this automatically, but explicit is better

---

#### 3. **X-Permitted-Cross-Domain-Policies**
**Purpose:** Control Flash/PDF cross-domain policies

**Recommendation:**
```python
response.headers['X-Permitted-Cross-Domain-Policies'] = 'none'
```

**Rationale:** Disable Flash/PDF cross-domain access (defense in depth)

---

#### 4. **Cross-Origin-Embedder-Policy (COEP)**
**Purpose:** Control cross-origin resource embedding

**Recommendation:** ⚠️ **OPTIONAL** - Only if you don't need third-party embeds
```python
# Only add if you don't need third-party iframes/resources
# response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
```

**Status:** Skip for now - may break Stripe embeds

---

#### 5. **Cross-Origin-Resource-Policy (CORP)**
**Purpose:** Control who can load your resources

**Recommendation:** ⚠️ **OPTIONAL**
```python
# Only add if you want to prevent cross-origin resource loading
# response.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
```

**Status:** Skip for now - may break CDN/assets

---

#### 6. **Cross-Origin-Opener-Policy (COOP)**
**Purpose:** Isolate browsing context

**Recommendation:** ⚠️ **OPTIONAL**
```python
# Only add if you don't need cross-origin window access
# response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
```

**Status:** Skip for now - may break OAuth flows if needed later

---

### **Enhanced Content Security Policy**

**Current CSP:**
```
default-src 'self'; 
script-src 'self' https://js.stripe.com 'unsafe-inline'; 
style-src 'self' 'unsafe-inline'; 
img-src 'self' data: https:; 
connect-src 'self' https://api.stripe.com https://*.stripe.com; 
frame-src https://js.stripe.com https://hooks.stripe.com; 
font-src 'self' data:;
```

**Recommended Improvements:**

1. **Remove `unsafe-inline` from script-src** (if possible):
   - Use nonces or hashes for inline scripts
   - This is more secure but requires frontend changes
   - **Status:** Phase 3 (requires frontend refactoring)

2. **Add `base-uri 'self'`**:
   ```python
   "base-uri 'self';"
   ```
   - Prevents base tag injection attacks

3. **Add `form-action 'self'`**:
   ```python
   "form-action 'self';"
   ```
   - Prevents form submissions to malicious sites

4. **Add `frame-ancestors 'none'`** (already covered by X-Frame-Options, but CSP is preferred):
   ```python
   "frame-ancestors 'none';"
   ```
   - Prevents clickjacking (replaces X-Frame-Options in modern browsers)

**Recommended Enhanced CSP:**
```python
response.headers['Content-Security-Policy'] = (
    "default-src 'self'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'; "
    "script-src 'self' https://js.stripe.com 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: https:; "
    "connect-src 'self' https://api.stripe.com https://*.stripe.com; "
    "frame-src https://js.stripe.com https://hooks.stripe.com; "
    "font-src 'self' data:;"
)
```

**Note:** Keep `unsafe-inline` for now (Phase 3 improvement)

---

## 🔐 CSRF Protection Strategy

### **Current Status**

**Authentication Method:**
- ✅ Using Bearer tokens in Authorization header (good!)
- ✅ Tokens stored in database (UserSession model)
- ✅ No cookies for authentication (reduces CSRF risk)

**Why Bearer Tokens Help:**
- CSRF attacks typically rely on cookies being sent automatically
- Bearer tokens must be explicitly set in JavaScript (not sent automatically)
- This significantly reduces CSRF risk

---

### **CSRF Risk Assessment**

**Low CSRF Risk:**
- ✅ Endpoints using Bearer token authentication (most endpoints)
- ✅ GET requests (read-only)
- ✅ Public endpoints that don't modify state

**Medium CSRF Risk:**
- ⚠️ Public endpoints that modify state (`POST /api/contact`)
- ⚠️ If you ever switch to cookie-based authentication

**High CSRF Risk:**
- ❌ None currently (Bearer tokens protect against CSRF)

---

### **Recommended CSRF Protection Strategy**

#### **Option 1: Token-Based CSRF Protection (Recommended)**

**For Write Operations Only:**
- Implement CSRF tokens for state-changing operations
- Only needed for endpoints that modify data

**Implementation Plan:**

1. **Generate CSRF Token on Login/Session Creation:**
   ```python
   # In UserSession model or create_user_session()
   csrf_token = secrets.token_urlsafe(32)
   session.csrf_token = csrf_token
   ```

2. **Return CSRF Token in Login/Register Response:**
   ```python
   # In auth routes
   return success_response({
       "user": user_dict,
       "session_token": session.session_token,
       "csrf_token": session.csrf_token,  # Add this
   })
   ```

3. **Require CSRF Token for Write Operations:**
   - Add middleware or decorator `@require_csrf` for POST/PUT/DELETE endpoints
   - Check `X-CSRF-Token` header matches session token

4. **Frontend Integration:**
   - Store CSRF token from login response
   - Include in `X-CSRF-Token` header for all write requests

**Protected Endpoints (Write Operations):**
- `POST /api/auth/register` (public, but creates account)
- `POST /api/auth/login` (public, but creates session)
- `POST /api/founder/profile` (creates/updates profile)
- `POST /api/founder/ideas` (creates listing)
- `PUT /api/founder/ideas/<id>` (updates listing)
- `POST /api/founder/connect` (creates connection request)
- `POST /api/subscription/cancel` (changes subscription)
- `POST /api/subscription/change-plan` (changes subscription)
- `POST /api/payment/*` (financial operations)
- `POST /api/user/actions` (creates action)
- `PUT /api/user/actions/<id>` (updates action)
- `POST /api/user/notes` (creates note)
- `PUT /api/user/notes/<id>` (updates note)
- `POST /api/contact` (public, creates message)

**NOT Protected (Read Operations):**
- All GET endpoints
- Endpoints that only read data

---

#### **Option 2: SameSite Cookie Attribute (If Using Cookies)**

**Current Status:** Not applicable (you use Bearer tokens)

**If you switch to cookies in the future:**
```python
response.set_cookie(
    'session_token',
    value=token,
    httponly=True,
    secure=True,  # HTTPS only
    samesite='Strict'  # CSRF protection
)
```

**Status:** Not needed now (Bearer tokens)

---

#### **Option 3: Double-Submit Cookie Pattern**

**How it works:**
- Set CSRF token in cookie AND require it in header
- Browser automatically sends cookie, but attacker can't read it
- Request must include same token in header

**Status:** Not needed (Bearer tokens are better)

---

### **Recommended Implementation Approach**

**Phase 2.1: CSRF Protection for Public Write Endpoints**
1. Add CSRF token generation to session creation
2. Return CSRF token in login/register responses
3. Protect public write endpoints:
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `POST /api/contact`

**Phase 2.2: CSRF Protection for Authenticated Write Endpoints**
1. Require CSRF token in header for all POST/PUT/DELETE
2. Validate token matches session token
3. Protect all authenticated write endpoints

**Rationale:**
- Bearer tokens already provide some CSRF protection
- Adding explicit CSRF tokens provides defense in depth
- Especially important for public endpoints

---

## 📊 Implementation Priority

### **Phase 2.1: Medium-Risk Authentication Endpoints** (Week 1)
1. ✅ `POST /api/auth/forgot-password` - Validation + rate limiting
2. ✅ `POST /api/auth/reset-password` - Validation + rate limiting
3. ✅ `POST /api/auth/change-password` - Validation + rate limiting

**Estimated Time:** 2-3 hours

---

### **Phase 2.2: Medium-Risk User Content Endpoints** (Week 1-2)
1. ✅ `POST /api/founder/profile` - Comprehensive validation + rate limiting
2. ✅ `POST /api/founder/ideas` - Enhanced validation + rate limiting
3. ✅ `PUT /api/founder/ideas/<id>` - Enhanced validation + rate limiting
4. ✅ `POST /api/founder/connect` - Validation + rate limiting

**Estimated Time:** 4-5 hours

---

### **Phase 2.3: Medium-Risk Business Logic Endpoints** (Week 2)
1. ✅ `POST /api/subscription/cancel` - Validation + rate limiting
2. ✅ `POST /api/subscription/change-plan` - Validation + rate limiting
3. ✅ `POST /api/enhance-report` - Validation + rate limiting
4. ✅ `POST /api/contact` - Enhanced validation + rate limiting

**Estimated Time:** 3-4 hours

---

### **Phase 2.4: Header Hardening** (Week 2)
1. ✅ Add Permissions-Policy header
2. ✅ Add Strict-Transport-Security header (production only)
3. ✅ Add X-Permitted-Cross-Domain-Policies header
4. ✅ Enhance Content-Security-Policy (base-uri, form-action, frame-ancestors)

**Estimated Time:** 1-2 hours

---

### **Phase 2.5: CSRF Protection** (Week 3)
1. ✅ Add CSRF token generation to UserSession model
2. ✅ Return CSRF token in login/register responses
3. ✅ Create `@require_csrf` decorator
4. ✅ Apply to public write endpoints first
5. ✅ Apply to authenticated write endpoints

**Estimated Time:** 4-6 hours

---

## 📝 Validation Recommendations by Endpoint

### **Detailed Validation Plans**

#### **1. POST /api/auth/forgot-password**
```python
# Validation needed:
- validate_email(email)  # Use centralized validator
- Rate limit: 3 per hour per IP

# Already implemented:
- Same response for existing/non-existing emails ✅
- Token generation ✅
```

#### **2. POST /api/auth/reset-password**
```python
# Validation needed:
- validate_text_field(token, "Token", required=True, max_length=255)
- validate_password(new_password)  # Use centralized validator
- Rate limit: 3 per hour per IP

# Already implemented:
- Token verification ✅
- Token expiration check ✅
```

#### **3. POST /api/auth/change-password**
```python
# Validation needed:
- validate_password(new_password)  # Use centralized validator
- Current password check (already exists) ✅
- Rate limit: 5 per hour

# Already implemented:
- Authentication required ✅
- Current password verification ✅
```

#### **4. POST /api/enhance-report**
```python
# Validation needed:
- validate_text_field(run_id, "Run ID", required=True, max_length=255)
- Rate limit: 10 per hour

# Already implemented:
- Authentication required ✅
- Authorization check (run belongs to user) ✅
```

#### **5. POST /api/founder/profile**
```python
# Validation needed for each field:
- full_name: validate_text_field(max_length=200)
- bio: validate_text_field(max_length=2000)
- skills: validate_string_array(max_items=50, max_item_length=100)
- experience_summary: validate_text_field(max_length=5000)
- location: validate_text_field(max_length=200)
- linkedin_url: validate_url(must_match_domain="linkedin.com")
- website_url: validate_url()
- primary_skills: validate_string_array(max_items=20, max_item_length=100)
- industries_of_interest: validate_string_array(max_items=20, max_item_length=200)
- looking_for: validate_text_field(max_length=1000)
- commitment_level: Whitelist validation (enum check)
- is_public: Boolean validation
- Rate limit: 20 per hour
```

#### **6. POST /api/founder/ideas**
```python
# Validation needed:
- title: validate_text_field(required=True, max_length=500)
- source_type: Enum validation ("validation" or "advisor")
- source_id: validate_text_field(max_length=255) + authorization check
- industry: validate_text_field(max_length=200, optional=True)
- stage: validate_text_field(max_length=100, optional=True)
- skills_needed: validate_string_array(max_items=20, max_item_length=100)
- commitment_level: validate_text_field(max_length=100, optional=True)
- brief_description: validate_text_field(max_length=2000, optional=True)
- Rate limit: 10 per hour

# Already implemented:
- Source authorization check ✅
```

#### **7. PUT /api/founder/ideas/<listing_id>**
```python
# Validation needed (all optional):
- title: validate_text_field(max_length=500, optional=True)
- brief_description: validate_text_field(max_length=2000, optional=True)
- industry: validate_text_field(max_length=200, optional=True)
- stage: validate_text_field(max_length=100, optional=True)
- skills_needed: validate_string_array(max_items=20, max_item_length=100, optional=True)
- commitment_level: validate_text_field(max_length=100, optional=True)
- is_active: Boolean validation (optional)
- Rate limit: 20 per hour

# Already implemented:
- Authorization check (listing belongs to user) ✅
```

#### **8. POST /api/founder/connect**
```python
# Validation needed:
- recipient_profile_id: Integer validation (if provided)
- idea_listing_id: Integer validation (if provided)
- message: validate_text_field(max_length=1000, optional=True)
- Either recipient_profile_id OR idea_listing_id required (mutual exclusivity)
- Rate limit: 20 per hour

# Already implemented:
- Cannot send to self ✅
- Credit check ✅
- Duplicate prevention ✅
```

#### **9. POST /api/subscription/cancel**
```python
# Validation needed:
- cancellation_reason: validate_text_field(required=True, max_length=500)
- cancellation_category: validate_text_field(max_length=100, optional=True)
- additional_comments: validate_text_field(max_length=1000, optional=True)
- Rate limit: 5 per hour

# Already implemented:
- Subscription type check ✅
- Idempotency check ✅
```

#### **10. POST /api/subscription/change-plan**
```python
# Validation needed:
- subscription_type: validate_text_field(required=True, max_length=50)
- Enum validation (must be valid subscription type)
- Rate limit: 5 per hour

# Already implemented:
- Business logic validation ✅
```

#### **11. POST /api/contact**
```python
# Validation needed:
- name: validate_text_field(required=True, max_length=200)
- email: validate_email()  # Use centralized validator
- company: validate_text_field(max_length=200, optional=True)
- topic: validate_text_field(max_length=200, optional=True)
- message: validate_text_field(required=True, min_length=10, max_length=5000)
- Rate limit: 3 per hour per IP

# Already implemented:
- Email format check (basic) ✅
```

---

## 🔍 Additional Security Improvements

### **1. Input Sanitization Before Storage**

**Recommendation:** Sanitize all user-generated content before storing in database

**Fields to Sanitize:**
- All text fields in founder profiles
- Idea descriptions
- Connection messages
- User notes
- Action text

**Implementation:**
- Use `sanitize_text()` from validators before database save
- Remove null bytes, zero-width characters
- Normalize whitespace

---

### **2. Enhanced Junk Data Detection**

**Current Status:** Basic detection exists in `validate_idea_explanation()`

**Recommendations:**
- Apply junk detection to all user-generated text fields
- Profile bios
- Connection messages
- Founder profile descriptions

**Patterns to Detect:**
- Repeated characters (already implemented)
- Keyboard mashing (already implemented)
- Low entropy text (already implemented)
- Excessive emoji spam (enhancement)

---

### **3. URL Validation Enhancements**

**Current Status:** Basic URL validation exists

**Recommendations:**
- Enhanced domain validation for LinkedIn URLs
- Prevent URL shorteners (bit.ly, tinyurl.com, etc.) in critical fields
- Validate URL resolves (optional, Phase 3)

---

### **4. Array Validation Enhancements**

**Current Status:** Basic array validation exists

**Recommendations:**
- Enforce uniqueness in arrays (no duplicate skills, industries)
- Validate against whitelist for certain fields (e.g., commitment_level)
- Limit total array size (prevent DoS via large arrays)

---

### **5. Rate Limiting Enhancements**

**Current Status:** Flask-Limiter configured, using in-memory (dev) or Redis (prod)

**Recommendations:**
1. **Verify Redis Setup in Production:**
   - Ensure `REDIS_URL` environment variable is set
   - Verify Redis connection works
   - Test rate limits persist across server restarts

2. **Per-User Rate Limiting** (Optional, Phase 3):
   - Limit by user ID instead of IP for authenticated endpoints
   - More accurate for users behind shared IPs

3. **Dynamic Rate Limiting** (Optional, Phase 3):
   - Stricter limits for suspicious behavior
   - Relaxed limits for trusted users

---

## 📈 Monitoring & Alerting

### **Security Events to Monitor**

1. **Rate Limit Violations:**
   - Log all 429 responses
   - Alert on sustained violations (10+ in 5 minutes)
   - Track IP addresses with excessive violations

2. **Failed Authentication Attempts:**
   - Already logged via `log_login()`
   - Alert on brute force patterns (5+ failed logins in 5 minutes from same IP)

3. **Validation Failures:**
   - Log all validation errors
   - Alert on suspicious patterns (script tags, SQL injection attempts)

4. **Suspicious Input Patterns:**
   - Junk data detection triggers
   - Unusually long input attempts
   - Multiple validation failures from same IP

5. **Payment Failures:**
   - Already logged
   - Alert on payment fraud patterns

### **Recommended Monitoring Tools**

**Free/Included Options:**
- Railway logs (already available)
- Sentry (error tracking, already configured)
- Application logs (structured logging already in place)

**Optional Paid Tools:**
- LogRocket (session replay) - See what attackers are doing
- Cloudflare Security (advanced DDoS/WAF) - If using Cloudflare

---

## ✅ Implementation Checklist

### **Validation & Rate Limiting (Medium-Risk Endpoints)**

- [ ] `POST /api/auth/forgot-password` - Validation + rate limit
- [ ] `POST /api/auth/reset-password` - Validation + rate limit
- [ ] `POST /api/auth/change-password` - Validation + rate limit
- [ ] `POST /api/enhance-report` - Validation + rate limit
- [ ] `POST /api/founder/profile` - Comprehensive validation + rate limit
- [ ] `POST /api/founder/ideas` - Enhanced validation + rate limit
- [ ] `PUT /api/founder/ideas/<id>` - Enhanced validation + rate limit
- [ ] `POST /api/founder/connect` - Validation + rate limit
- [ ] `POST /api/subscription/cancel` - Validation + rate limit
- [ ] `POST /api/subscription/change-plan` - Validation + rate limit
- [ ] `POST /api/contact` - Enhanced validation + rate limit

### **Header Hardening**

- [ ] Add Permissions-Policy header
- [ ] Add Strict-Transport-Security header (production only)
- [ ] Add X-Permitted-Cross-Domain-Policies header
- [ ] Enhance Content-Security-Policy (base-uri, form-action, frame-ancestors)

### **CSRF Protection**

- [ ] Add CSRF token field to UserSession model
- [ ] Generate CSRF token on session creation
- [ ] Return CSRF token in login/register responses
- [ ] Create `@require_csrf` decorator
- [ ] Apply to public write endpoints
- [ ] Apply to authenticated write endpoints
- [ ] Frontend integration (include CSRF token in requests)

### **Monitoring & Alerting**

- [ ] Set up alerts for rate limit violations
- [ ] Set up alerts for brute force attempts
- [ ] Set up alerts for suspicious input patterns
- [ ] Review and enhance logging for security events

---

## 🎯 Success Criteria

**Phase 2 will be considered complete when:**

1. ✅ All medium-risk endpoints have centralized validation
2. ✅ All medium-risk endpoints have appropriate rate limits
3. ✅ Security headers are enhanced with additional protections
4. ✅ CSRF protection is implemented for write operations
5. ✅ Monitoring and alerting for security events is configured
6. ✅ All changes are tested and documented

---

## 📚 References

- **Input Validation Matrix:** `docs/INPUT_VALIDATION_MATRIX.md`
- **Security Guide:** `docs/MALICIOUS_INPUT_AND_HACK_ATTEMPTS.md`
- **OWASP CSRF Prevention:** https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- **OWASP Security Headers:** https://owasp.org/www-project-secure-headers/

---

## ⚠️ Notes & Considerations

### **Breaking Changes:**
- CSRF protection will require frontend changes (add CSRF token to headers)
- Enhanced validation may reject previously accepted inputs (edge cases)

### **Performance Impact:**
- Minimal - validation is fast
- Rate limiting uses Redis (already configured)
- CSRF token generation is lightweight

### **Backward Compatibility:**
- All validation should be backward compatible (rejects invalid, accepts valid)
- CSRF protection can be optional initially (warn but don't fail)

### **Testing Requirements:**
- Test all validation rules with edge cases
- Test rate limiting with multiple requests
- Test CSRF protection with and without tokens
- Test header hardening doesn't break frontend

---

**Status:** 📋 **PLANNING PHASE - AWAITING APPROVAL**

No code changes have been made. This is a planning document for review before implementation begins.
