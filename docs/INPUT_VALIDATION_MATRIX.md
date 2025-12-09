# 📋 Input Validation Matrix - Complete Endpoint Inventory

This document catalogs **ALL endpoints that accept user input** with proposed validation schemas. **NO code changes yet** - this is the planning phase.

---

## Authentication Routes (`app/routes/auth.py`)

### `POST /api/auth/register`
**Risk Level:** 🔴 **HIGH** - Public endpoint, spam target

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `email` | ✅ Yes | string | 254 chars | Valid email format, lowercase, must pass regex: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$` | No HTML tags (`<`, `>`), no null bytes, no control chars |
| `password` | ✅ Yes | string | 128 chars | Min 8 chars, must contain letters and numbers | No script tags, no null bytes, no control chars |

**Additional Validation:**
- Email must be unique (checked in database)
- Password strength: minimum 8 characters (enforced via `MIN_PASSWORD_LENGTH`)
- Email must be normalized: `.strip().lower()`

---

### `POST /api/auth/login`
**Risk Level:** 🔴 **HIGH** - Brute force target

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `email` | ✅ Yes | string | 254 chars | Valid email format, lowercase | No HTML tags, no null bytes, no control chars |
| `password` | ✅ Yes | string | 128 chars | No format validation (hashed) | No null bytes, no control chars |

**Additional Validation:**
- Rate limiting: **5 attempts per minute** (prevents brute force)

---

### `POST /api/auth/forgot-password`
**Risk Level:** 🟡 **MEDIUM** - Email enumeration risk

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `email` | ✅ Yes | string | 254 chars | Valid email format, lowercase | No HTML tags, no null bytes |

**Additional Validation:**
- Rate limiting: **3 attempts per hour** (prevents email enumeration spam)
- Always return success (don't reveal if email exists)

---

### `POST /api/auth/reset-password`
**Risk Level:** 🟡 **MEDIUM** - Token abuse risk

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `token` | ✅ Yes | string | 255 chars | Alphanumeric + URL-safe chars | No HTML tags, no null bytes |
| `password` | ✅ Yes | string | 128 chars | Min 8 chars, must contain letters and numbers | No script tags, no null bytes |

**Additional Validation:**
- Token must be valid and not expired (checked in database)
- Rate limiting: **3 attempts per hour** per IP

---

### `POST /api/auth/change-password`
**Risk Level:** 🟡 **MEDIUM** - Requires authentication

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `current_password` | ✅ Yes | string | 128 chars | No format validation (hashed) | No null bytes |
| `new_password` | ✅ Yes | string | 128 chars | Min 8 chars, must contain letters and numbers | No script tags, no null bytes |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Current password must match (checked via `user.check_password()`)

---

## Validation Routes (`app/routes/validation.py`)

### `POST /api/validate-idea`
**Risk Level:** 🔴 **HIGH** - AI API abuse, expensive operation

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `idea_explanation` | ⚠️ Conditional | string | 50,000 chars | Min 10 chars (meaningful), must contain 40%+ alphabetic characters | `<script>`, `javascript:`, event handlers (`onclick`, etc.), repeated chars (50+ same char), keyboard mashing patterns, null bytes |
| `category_answers` | ❌ Optional | object | N/A | JSON object with fields below | N/A |
| `category_answers.industry` | ❌ Optional | string | 200 chars | Free text, but validate against known industries if dropdown | No HTML tags, no script injection |
| `category_answers.geography` | ❌ Optional | string | 200 chars | Free text (e.g., "Global", "US", "India") | No HTML tags |
| `category_answers.stage` | ❌ Optional | string | 100 chars | Must be one of known stages | No HTML tags |
| `category_answers.commitment` | ❌ Optional | string | 100 chars | Free text | No HTML tags |
| `category_answers.problem_category` | ❌ Optional | string | 200 chars | Free text | No HTML tags |
| `category_answers.solution_type` | ❌ Optional | string | 200 chars | Free text | No HTML tags |
| `category_answers.user_type` | ❌ Optional | string | 200 chars | Free text | No HTML tags |
| `category_answers.revenue_model` | ❌ Optional | string | 200 chars | Free text | No HTML tags |
| `category_answers.unique_moat` | ❌ Optional | string | 1,000 chars | Free text | No HTML tags, no script injection |
| `category_answers.initial_budget` | ❌ Optional | string | 100 chars | Free text (e.g., "$20K", "Not specified") | No HTML tags |
| `category_answers.constraints` | ❌ Optional | array | 50 items, 200 chars each | Array of strings | No HTML tags in items |
| `category_answers.competitors` | ❌ Optional | string | 2,000 chars | Free text | No HTML tags, no script injection |
| `category_answers.business_archetype` | ❌ Optional | string | 200 chars | Free text | No HTML tags |
| `category_answers.delivery_channel` | ❌ Optional | string | 200 chars | Free text | No HTML tags |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Rate limiting: **10 validations per hour** (expensive AI operation)
- Junk data detection: Check for repeated characters, keyboard mashing, low entropy
- Minimum content quality: At least 50 meaningful characters or category_answers must be populated

---

### `PUT /api/validate-idea/<validation_id>`
**Risk Level:** 🔴 **HIGH** - Same as POST (re-validation)

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `idea_explanation` | ⚠️ Conditional | string | 50,000 chars | Same as POST | Same as POST |
| `category_answers` | ❌ Optional | object | N/A | Same as POST | Same as POST |

**Additional Validation:**
- Same as POST endpoint
- Validation must belong to user (authorization check)
- Counts as new validation (usage limits apply)

---

## Discovery Routes (`app/routes/discovery.py`)

### `POST /api/run`
**Risk Level:** 🔴 **HIGH** - AI API abuse, expensive operation

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `goal_type` | ❌ Optional | string | 200 chars | Free text, defaults to "Extra Income" | No HTML tags, no script injection |
| `time_commitment` | ❌ Optional | string | 100 chars | Free text, defaults to "<5 hrs/week" | No HTML tags |
| `budget_range` | ❌ Optional | string | 200 chars | Free text, defaults to "Free / Sweat-equity only" | No HTML tags |
| `interest_area` | ❌ Optional | string | 200 chars | Free text, defaults to "AI / Automation" | No HTML tags |
| `sub_interest_area` | ❌ Optional | string | 200 chars | Free text, defaults to "Chatbots" | No HTML tags |
| `work_style` | ❌ Optional | string | 100 chars | Free text, defaults to "Solo" | No HTML tags |
| `skill_strength` | ❌ Optional | string | 200 chars | Free text, defaults to "Analytical / Strategic" | No HTML tags |
| `experience_summary` | ❌ Optional | string | 10,000 chars | Free text, defaults to "No detailed experience summary provided." | No `<script>`, no `javascript:`, no event handlers, no null bytes |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Rate limiting: **5 runs per hour** (expensive AI operation)
- All fields have defaults, so technically all optional, but user should provide at least some meaningful input
- Input validation via `_validate_discovery_inputs()` (checks for incompatible combinations)

---

### `POST /api/enhance-report`
**Risk Level:** 🟡 **MEDIUM** - AI API abuse, but less expensive

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `run_id` | ✅ Yes | string | 255 chars | Alphanumeric + underscore + hyphen | No HTML tags, no null bytes |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Rate limiting: **10 enhancements per hour**
- Run must belong to user (authorization check)
- Run must exist and not be deleted

---

## Founder Connect Routes (`app/routes/founder.py`)

### `POST /api/founder/profile`
**Risk Level:** 🟡 **MEDIUM** - User-generated content

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `full_name` | ❌ Optional | string | 200 chars | Free text, human names | No HTML tags, no `<script>`, no null bytes |
| `bio` | ❌ Optional | string | 2,000 chars | Free text, biography | No `<script>`, no `javascript:`, no event handlers, no null bytes |
| `skills` | ❌ Optional | array | 50 items, 100 chars each | Array of skill strings | No HTML tags in items, no script injection |
| `experience_summary` | ❌ Optional | string | 5,000 chars | Free text | No `<script>`, no `javascript:`, no event handlers |
| `location` | ❌ Optional | string | 200 chars | Free text (city, country, etc.) | No HTML tags, no script injection |
| `linkedin_url` | ❌ Optional | string | 500 chars | Valid URL format, must start with `https://linkedin.com/` or `https://www.linkedin.com/` | No `javascript:`, no HTML tags, no script injection |
| `website_url` | ❌ Optional | string | 500 chars | Valid URL format, must start with `http://` or `https://` | No `javascript:`, no HTML tags, no script injection |
| `primary_skills` | ❌ Optional | array | 20 items, 100 chars each | Array of skill strings | No HTML tags in items |
| `industries_of_interest` | ❌ Optional | array | 20 items, 200 chars each | Array of industry strings | No HTML tags in items |
| `looking_for` | ❌ Optional | string | 1,000 chars | Free text | No `<script>`, no `javascript:`, no event handlers |
| `commitment_level` | ❌ Optional | string | 100 chars | Must match known commitment levels (e.g., "Part-time", "Full-time") | No HTML tags |
| `is_public` | ❌ Optional | boolean | N/A | Must be boolean (true/false) | N/A |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Rate limiting: **20 profile updates per hour**
- URL validation: LinkedIn URLs must be valid LinkedIn URLs, website URLs must be valid URLs

---

### `POST /api/founder/ideas`
**Risk Level:** 🟡 **MEDIUM** - User-generated content

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `title` | ✅ Yes | string | 500 chars | Free text, must not be empty | No HTML tags, no `<script>`, no null bytes |
| `source_type` | ✅ Yes | string | 50 chars | Must be "validation" or "advisor" | No HTML tags |
| `source_id` | ✅ Yes | string/int | 255 chars | Alphanumeric or integer | No HTML tags, no null bytes |
| `industry` | ❌ Optional | string | 200 chars | Free text | No HTML tags |
| `stage` | ❌ Optional | string | 100 chars | Free text | No HTML tags |
| `skills_needed` | ❌ Optional | array | 20 items, 100 chars each | Array of skill strings | No HTML tags in items |
| `commitment_level` | ❌ Optional | string | 100 chars | Free text | No HTML tags |
| `brief_description` | ❌ Optional | string | 2,000 chars | Free text | No `<script>`, no `javascript:`, no event handlers |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Rate limiting: **10 listing creations per hour**
- Source validation: `source_id` must reference a validation or run that belongs to the user
- Authorization: Listing must reference user's own validation/run

---

### `PUT /api/founder/ideas/<listing_id>`
**Risk Level:** 🟡 **MEDIUM** - User-generated content

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `is_active` | ❌ Optional | boolean | N/A | Must be boolean | N/A |
| `title` | ❌ Optional | string | 500 chars | Free text | No HTML tags, no `<script>` |
| `brief_description` | ❌ Optional | string | 2,000 chars | Free text | No `<script>`, no `javascript:` |
| `industry` | ❌ Optional | string | 200 chars | Free text | No HTML tags |
| `stage` | ❌ Optional | string | 100 chars | Free text | No HTML tags |
| `skills_needed` | ❌ Optional | array | 20 items, 100 chars each | Array of skill strings | No HTML tags in items |
| `commitment_level` | ❌ Optional | string | 100 chars | Free text | No HTML tags |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Listing must belong to user (authorization check)
- Rate limiting: **20 updates per hour**

---

### `POST /api/founder/connect`
**Risk Level:** 🟡 **MEDIUM** - Spam/abuse risk, uses credits

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `recipient_profile_id` | ⚠️ Conditional | integer | N/A | Must be valid profile ID | N/A |
| `idea_listing_id` | ⚠️ Conditional | integer | N/A | Must be valid listing ID | N/A |
| `message` | ❌ Optional | string | 1,000 chars | Free text message | No `<script>`, no `javascript:`, no event handlers, no null bytes |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Rate limiting: **20 connection requests per hour** (but also subject to credit limits)
- Either `recipient_profile_id` OR `idea_listing_id` required (not both)
- Cannot send to self
- Credit check: User must have available connection credits
- No duplicate pending requests to same recipient

---

### `PUT /api/founder/connections/<connection_id>/respond`
**Risk Level:** 🟢 **LOW** - Requires authentication, limited actions

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `action` | ✅ Yes | string | 20 chars | Must be "accept" or "decline" | No HTML tags, no null bytes |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Connection request must belong to user (as recipient)
- Connection request must be in "pending" status
- Rate limiting: **50 responses per hour**

---

## User Routes (`app/routes/user.py`)

### `POST /api/user/actions`
**Risk Level:** 🟢 **LOW** - Authenticated, personal data

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `action_text` | ✅ Yes | string | 1,000 chars | Free text | No HTML tags, no `<script>`, no null bytes |
| `idea_id` | ✅ Yes | string | 255 chars | Alphanumeric + underscore + hyphen | No HTML tags, no null bytes |
| `status` | ❌ Optional | string | 50 chars | Must be one of: "pending", "in_progress", "completed", "blocked" | No HTML tags |
| `due_date` | ❌ Optional | string | N/A | ISO 8601 datetime format (with timezone) | No invalid date formats |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Rate limiting: **50 actions per hour**

---

### `PUT /api/user/actions/<action_id>`
**Risk Level:** 🟢 **LOW** - Authenticated, personal data

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `action_text` | ❌ Optional | string | 1,000 chars | Free text | No HTML tags, no `<script>` |
| `status` | ❌ Optional | string | 50 chars | Must be one of: "pending", "in_progress", "completed", "blocked" | No HTML tags |
| `due_date` | ❌ Optional | string | N/A | ISO 8601 datetime format (with timezone) | No invalid date formats |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Action must belong to user (authorization check)
- Rate limiting: **50 updates per hour**

---

### `POST /api/user/notes`
**Risk Level:** 🟢 **LOW** - Authenticated, personal data

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `content` | ✅ Yes | string | 10,000 chars | Free text | No `<script>`, no `javascript:`, no event handlers, no null bytes |
| `idea_id` | ✅ Yes | string | 255 chars | Alphanumeric + underscore + hyphen | No HTML tags, no null bytes |
| `tags` | ❌ Optional | array | 20 items, 50 chars each | Array of tag strings | No HTML tags in items |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Rate limiting: **50 notes per hour**

---

### `PUT /api/user/notes/<note_id>`
**Risk Level:** 🟢 **LOW** - Authenticated, personal data

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `content` | ❌ Optional | string | 10,000 chars | Free text | No `<script>`, no `javascript:` |
| `tags` | ❌ Optional | array | 20 items, 50 chars each | Array of tag strings | No HTML tags in items |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Note must belong to user (authorization check)
- Rate limiting: **50 updates per hour**

---

## Payment Routes (`app/routes/payment.py`)

### `POST /api/subscription/cancel`
**Risk Level:** 🟡 **MEDIUM** - Business logic, requires validation

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `cancellation_reason` | ✅ Yes | string | 500 chars | Free text | No HTML tags, no `<script>`, no null bytes |
| `cancellation_category` | ❌ Optional | string | 100 chars | Free text (e.g., "pricing", "features") | No HTML tags |
| `additional_comments` | ❌ Optional | string | 1,000 chars | Free text | No `<script>`, no `javascript:` |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- User must have active paid subscription (not free tier)
- Rate limiting: **5 cancellations per hour** (should be rare, but prevent abuse)

---

### `POST /api/subscription/change-plan`
**Risk Level:** 🟡 **MEDIUM** - Business logic, financial impact

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `subscription_type` | ✅ Yes | string | 50 chars | Must be one of: "starter", "pro", "annual" | No HTML tags, no null bytes |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Must not be on free trial (must subscribe first)
- Cannot change to same plan
- Rate limiting: **5 plan changes per hour**

---

### `POST /api/payment/create-intent`
**Risk Level:** 🔴 **HIGH** - Financial transaction

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `subscription_type` | ✅ Yes | string | 50 chars | Must be one of: "starter", "pro", "annual" | No HTML tags, no null bytes |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Rate limiting: **5 payment intents per hour** (prevents spam)
- Stripe handles actual payment validation

---

### `POST /api/payment/confirm`
**Risk Level:** 🔴 **HIGH** - Financial transaction

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `payment_intent_id` | ✅ Yes | string | 255 chars | Stripe payment intent ID format | No HTML tags, no null bytes |
| `subscription_type` | ✅ Yes | string | 50 chars | Must be one of: "starter", "pro", "annual" | No HTML tags, no null bytes |

**Additional Validation:**
- Requires authentication (`@require_auth`)
- Rate limiting: **5 confirmations per hour**
- Payment intent must be valid and succeeded (verified via Stripe)
- Idempotency: Payment cannot be processed twice

---

## Public Routes (`app/routes/public.py`)

### `POST /api/contact`
**Risk Level:** 🟡 **MEDIUM** - Public endpoint, spam target

| Field | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-------|----------|------|------------|-------------------|------------------|
| `name` | ✅ Yes | string | 200 chars | Free text, human names | No HTML tags, no `<script>`, no null bytes |
| `email` | ✅ Yes | string | 254 chars | Valid email format | No HTML tags, no null bytes |
| `company` | ❌ Optional | string | 200 chars | Free text | No HTML tags |
| `topic` | ❌ Optional | string | 200 chars | Free text | No HTML tags |
| `message` | ✅ Yes | string | 5,000 chars | Free text | No `<script>`, no `javascript:`, no event handlers, no null bytes |

**Additional Validation:**
- **No authentication required** (public endpoint)
- Rate limiting: **3 submissions per hour per IP** (prevents spam)
- Email validation: Must match valid email regex
- Message must have meaningful content (min 10 chars)

---

## Query Parameters (GET requests)

### Pagination Parameters
**Used in:** Multiple GET endpoints (browse listings, browse profiles, dashboard, etc.)

| Parameter | Required | Type | Max Value | Format/Validation | Blocked Patterns |
|-----------|----------|------|-----------|-------------------|------------------|
| `page` | ❌ Optional | integer | 10,000 | Must be positive integer, default: 1 | No negative numbers |
| `per_page` | ❌ Optional | integer | 100 | Must be positive integer, max: 100, default: 20 | No negative numbers, capped at MAX_PAGE_SIZE |

### Filter Parameters (Founder Connect Browse)
**Used in:** `/api/founder/ideas/browse`, `/api/founder/people/browse`

| Parameter | Required | Type | Max Length | Format/Validation | Blocked Patterns |
|-----------|----------|------|------------|-------------------|------------------|
| `industry` | ❌ Optional | string | 200 chars | Free text | No HTML tags, no script injection |
| `stage` | ❌ Optional | string | 100 chars | Free text | No HTML tags |
| `skills_needed` | ❌ Optional | string | 500 chars | Comma-separated or single value | No HTML tags, no script injection |
| `commitment_level` | ❌ Optional | string | 100 chars | Free text | No HTML tags |
| `location` | ❌ Optional | string | 200 chars | Free text | No HTML tags, no script injection |
| `skills` | ❌ Optional | string | 500 chars | Comma-separated or single value | No HTML tags |
| `industries` | ❌ Optional | string | 500 chars | Comma-separated or single value | No HTML tags |

**Additional Validation:**
- All filter parameters are optional
- Comma-separated values should be split and each item validated individually
- Rate limiting: **100 browse requests per hour** (read-heavy, but should have limits)

---

## Common Patterns & Blocked Characters

### HTML/Script Injection Patterns (BLOCKED):
- `<script>...</script>` tags
- `javascript:` protocol
- Event handlers: `onclick=`, `onerror=`, `onload=`, etc.
- CSS injection: `expression()`, `<style>`
- HTML entities used maliciously: `&lt;`, `&#60;`, etc.

### Null Byte Injection (BLOCKED):
- `\x00` (null byte) - can break string processing

### Control Characters (BLOCKED):
- ASCII control characters (0x00-0x1F) except whitespace (tab, newline in appropriate contexts)

### Dangerous URL Patterns (BLOCKED in URL fields):
- `javascript:` protocol
- `data:` protocol (in most contexts)
- Relative URLs that could be exploited

### Garbage/Junk Data Patterns (DETECTED):
- Same character repeated 50+ times: `aaaaaaaa...`
- Keyboard mashing: `asdfghjkl`, `qwertyuiop`
- Low entropy text (< 40% alphabetic characters for long text)
- Single word repeated many times
- Excessive emoji (> 50% emoji in text)

---

## Summary by Risk Level

### 🔴 **HIGH RISK** (Implement First):
1. `POST /api/auth/register` - Spam prevention
2. `POST /api/auth/login` - Brute force prevention
3. `POST /api/validate-idea` - AI API abuse, expensive
4. `POST /api/run` - AI API abuse, expensive
5. `POST /api/payment/create-intent` - Financial
6. `POST /api/payment/confirm` - Financial

### 🟡 **MEDIUM RISK** (Implement Second):
1. `POST /api/auth/forgot-password` - Email enumeration
2. `POST /api/auth/reset-password` - Token abuse
3. `POST /api/auth/change-password` - Account security
4. `POST /api/enhance-report` - AI API abuse (less expensive)
5. `POST /api/founder/profile` - User-generated content
6. `POST /api/founder/ideas` - User-generated content
7. `POST /api/founder/connect` - Spam/abuse risk
8. `POST /api/subscription/cancel` - Business logic
9. `POST /api/subscription/change-plan` - Business logic
10. `POST /api/contact` - Spam target (public)

### 🟢 **LOW RISK** (Implement Third):
1. `PUT /api/founder/ideas/<listing_id>` - Authenticated updates
2. `PUT /api/founder/connections/<connection_id>/respond` - Limited actions
3. `POST /api/user/actions` - Personal data
4. `PUT /api/user/actions/<action_id>` - Personal data
5. `POST /api/user/notes` - Personal data
6. `PUT /api/user/notes/<note_id>` - Personal data

---

## Next Steps

After reviewing this matrix, proceed to:
1. **Centralized Validation Design** (see `MALICIOUS_INPUT_AND_HACK_ATTEMPTS.md` section)
2. **Rate Limiting Plan** (see `MALICIOUS_INPUT_AND_HACK_ATTEMPTS.md` section)
3. **Implementation** (only after approval)
