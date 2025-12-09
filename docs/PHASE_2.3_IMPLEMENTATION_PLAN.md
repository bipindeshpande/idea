# 🔒 Phase 2.3 Implementation Plan - Founder Listings + Messaging Security Hardening

## Overview

**Scope:** Apply validation, sanitization, and rate limiting to founder profile, listing, messaging, and file upload endpoints.

**Endpoints to Secure:**
1. `POST /api/founder/profile` - Create/update founder profile (maps to existing endpoint)
2. `PUT /api/founder/profile` - Update founder profile (exists)
3. `POST /api/founder/add-pitch` - Add pitch to idea listing (needs to be created OR maps to existing brief_description)
4. `POST /api/founder/update-pitch` - Update pitch (needs to be created OR maps to existing brief_description)
5. `POST /api/founder/connect` - Send connection request with message (exists)
6. `GET /api/messages/thread/<id>` - Get message thread (may need to map to connection requests)
7. `POST /api/founder/upload-avatar` - Upload avatar image (needs to be created)

**Files to Modify:**
- `app/routes/founder.py` (primary)
- `app/routes/messages.py` (if exists, otherwise handle in founder.py)

**Dependencies:** None (uses existing validators and rate limiting infrastructure)

**Estimated Time:** 2-3 hours

---

## 📋 Current State Analysis

### Existing Endpoints

1. **`POST /api/founder/profile`** (Line 188)
   - ✅ Requires authentication
   - ❌ No rate limiting
   - ❌ No validation (just strips whitespace)
   - ❌ No sanitization before saving

2. **`PUT /api/founder/profile`** (Line 239)
   - ✅ Requires authentication
   - ✅ Delegates to `POST /api/founder/profile`
   - Same issues as POST

3. **`POST /api/founder/connect`** (Line 550)
   - ✅ Requires authentication
   - ❌ No rate limiting
   - ❌ No validation on message field
   - ❌ No sanitization

### Endpoints That May Need Creation

4. **`POST /api/founder/add-pitch`** - Not found
   - May map to `brief_description` in `POST /api/founder/ideas`
   - OR needs to be created as separate endpoint

5. **`POST /api/founder/update-pitch`** - Not found
   - May map to updating `brief_description` in `PUT /api/founder/ideas/<id>`
   - OR needs to be created as separate endpoint

6. **`GET /api/messages/thread/<id>`** - Not found
   - Connection requests have messages, but no thread endpoint exists
   - May need to map to connection request detail endpoint

7. **`POST /api/founder/upload-avatar`** - Not found
   - Needs to be created

---

## 📝 Exact Diffs - Existing Endpoints

### File: `app/routes/founder.py`

---

#### Change 1: Add rate limiting helper and imports

**Location:** After line 25 (after blueprint definition)

**Current:**
```python
bp = Blueprint("founder", __name__)

# Note: Rate limits will be applied after blueprint registration in api.py
```

**New:**
```python
bp = Blueprint("founder", __name__)

# Import limiter lazily to avoid circular imports
_limiter = None

def get_limiter():
    """Get limiter instance lazily to avoid circular imports."""
    global _limiter
    if _limiter is None:
        try:
            from api import limiter
            _limiter = limiter
        except (ImportError, AttributeError, RuntimeError):
            _limiter = None
    return _limiter


def apply_rate_limit(limit_string):
    """Helper to apply rate limit decorator if limiter is available."""
    def decorator(func):
        limiter = get_limiter()
        if limiter:
            return limiter.limit(limit_string)(func)
        return func
    return decorator
```

**Reason:** Add rate limiting infrastructure (same pattern as payment.py and auth.py)

---

#### Change 2: Add validator imports

**Location:** After line 18 (after other imports)

**Current:**
```python
from app.utils.response_helpers import (
    success_response, error_response, not_found_response,
    unauthorized_response, internal_error_response
)
```

**New:**
```python
from app.utils.response_helpers import (
    success_response, error_response, not_found_response,
    unauthorized_response, internal_error_response
)
from app.utils.validators import (
    validate_text_field, sanitize_text, validate_url, 
    validate_string_array, detect_junk_data
)
```

**Reason:** Import centralized validation functions

---

#### Change 3: Add rate limit and validation to `create_founder_profile()`

**Location:** Lines 188-236

**Current:**
```python
@bp.post("/api/founder/profile")
@require_auth
def create_founder_profile() -> Any:
    """Create or update founder profile."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    # Get or create profile
    profile = FounderProfile.query.filter_by(user_id=user.id).first()
    if not profile:
        profile = FounderProfile(user_id=user.id)
        db.session.add(profile)
    
    # Update fields
    if "full_name" in data:
        profile.full_name = data.get("full_name", "").strip() or None
    if "bio" in data:
        profile.bio = data.get("bio", "").strip() or None
    # ... (other fields)
```

**New:**
```python
@bp.post("/api/founder/profile")
@require_auth
@apply_rate_limit("10 per hour")
def create_founder_profile() -> Any:
    """Create or update founder profile."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    # Get or create profile
    profile = FounderProfile.query.filter_by(user_id=user.id).first()
    if not profile:
        profile = FounderProfile(user_id=user.id)
        db.session.add(profile)
    
    # Validate and sanitize fields
    if "full_name" in data:
        full_name = data.get("full_name", "").strip() or None
        if full_name:
            is_valid, error_msg = validate_text_field(full_name, "Full name", max_length=200, allow_html=False)
            if not is_valid:
                return error_response(error_msg, 400)
            profile.full_name = sanitize_text(full_name)
        else:
            profile.full_name = None
    
    if "bio" in data:
        bio = data.get("bio", "").strip() or None
        if bio:
            is_valid, error_msg = validate_text_field(bio, "Bio", max_length=500, allow_html=False)
            if not is_valid:
                return error_response(error_msg, 400)
            # Check for junk data if bio is long enough
            if len(bio) >= 50:
                is_junk, reason = detect_junk_data(bio, min_meaningful_length=50)
                if is_junk:
                    return error_response(f"Bio {reason.lower()}", 400)
            profile.bio = sanitize_text(bio)
        else:
            profile.bio = None
    
    # ... (continue for other fields - see detailed validation section)
```

**Reason:** Add rate limiting and comprehensive validation/sanitization

---

#### Change 4: Add rate limit and validation to `send_connection_request()`

**Location:** Lines 550-646

**Current:**
```python
@bp.post("/api/founder/connect")
@require_auth
def send_connection_request() -> Any:
    # ... (validation logic)
    connection_request = ConnectionRequest(
        sender_id=sender_profile.id,
        recipient_id=recipient_profile_id,
        idea_listing_id=idea_listing_id,
        message=data.get("message", "").strip() or None,
        status=ConnectionStatus.PENDING,
    )
```

**New:**
```python
@bp.post("/api/founder/connect")
@require_auth
@apply_rate_limit("20 per hour")
def send_connection_request() -> Any:
    # ... (existing validation logic)
    
    # Validate and sanitize message
    message = data.get("message", "").strip() or None
    if message:
        is_valid, error_msg = validate_text_field(
            message, 
            "Message", 
            max_length=2000, 
            allow_html=False
        )
        if not is_valid:
            return error_response(error_msg, 400)
        # Check for junk data
        if len(message) >= 50:
            is_junk, reason = detect_junk_data(message, min_meaningful_length=50)
            if is_junk:
                return error_response(f"Message {reason.lower()}", 400)
        message = sanitize_text(message)
    
    connection_request = ConnectionRequest(
        sender_id=sender_profile.id,
        recipient_id=recipient_profile_id,
        idea_listing_id=idea_listing_id,
        message=message,
        status=ConnectionStatus.PENDING,
    )
```

**Reason:** Add rate limiting and message validation/sanitization

---

## 📝 Detailed Validation Requirements

### 1. `POST /api/founder/profile` - Field-by-Field Validation

| Field | Required | Max Length | Validation | Sanitize |
|-------|----------|------------|------------|----------|
| `full_name` | No | 200 chars | `validate_text_field()` | Yes |
| `bio` | No | 500 chars | `validate_text_field()` + junk detection | Yes |
| `skills` | No | Array (max 50 items, 100 chars each) | `validate_string_array()` | Yes (each item) |
| `experience_summary` | No | 2000 chars | `validate_text_field()` + junk detection | Yes |
| `location` | No | 200 chars | `validate_text_field()` | Yes |
| `linkedin_url` | No | 500 chars | `validate_url()` (domain: linkedin.com) | Yes |
| `website_url` | No | 500 chars | `validate_url()` | Yes |
| `primary_skills` | No | Array (max 20 items, 100 chars each) | `validate_string_array()` | Yes (each item) |
| `industries_of_interest` | No | Array (max 20 items, 200 chars each) | `validate_string_array()` | Yes (each item) |
| `looking_for` | No | 1000 chars | `validate_text_field()` | Yes |
| `commitment_level` | No | 50 chars | `validate_text_field()` | Yes |

**Rate Limit:** `10 per hour`

---

### 2. `POST /api/founder/connect` - Message Validation

| Field | Required | Max Length | Validation | Sanitize |
|-------|----------|------------|------------|----------|
| `message` | No | 2000 chars | `validate_text_field()` + junk detection | Yes |
| `recipient_profile_id` | Conditional | N/A | Integer validation | N/A |
| `idea_listing_id` | Conditional | N/A | Integer validation | N/A |

**Rate Limit:** `20 per hour`

**Note:** Either `recipient_profile_id` OR `idea_listing_id` required (already validated)

---

### 3. Pitch Endpoints (If Created or Mapping to Existing)

**Option A: Map to Existing `brief_description` in Idea Listing**

If pitches map to `brief_description` in idea listings:
- Validate in `POST /api/founder/ideas` (create listing)
- Validate in `PUT /api/founder/ideas/<id>` (update listing)
- Field: `brief_description`
- Max length: 1500 chars (as specified)
- Validation: `validate_text_field()` + junk detection
- Rate limit: Already exists or add `10 per hour`

**Option B: Create Separate Pitch Endpoints**

If separate pitch endpoints need to be created:

```
POST /api/founder/add-pitch
- listing_id (required)
- pitch (required, max 1500 chars)
- Rate limit: 10 per hour

POST /api/founder/update-pitch
- listing_id (required)
- pitch (required, max 1500 chars)
- Rate limit: 10 per hour
```

**Validation for Pitch:**
- Required: Yes
- Max length: 1500 chars
- Validation: `validate_text_field()` + junk detection
- Sanitize: Yes

---

### 4. `GET /api/messages/thread/<id>` (If Created)

**Current State:** No separate messages thread endpoint exists. Connection requests have messages but no thread view.

**Options:**
1. **Map to existing connection detail endpoint:** `GET /api/founder/connections/<id>/detail`
   - Already exists (line 723)
   - Add rate limiting: `60 per hour`
   - Add light validation on thread_id parameter (integer validation)

2. **Create new messages thread endpoint:**
   - If messages are separate from connection requests
   - Validate thread_id (integer, exists, user has access)
   - Rate limit: `60 per hour`

**For this plan, we'll:**
- Add rate limiting to existing `get_connection_detail()` endpoint
- Add thread_id validation (already exists as connection_id, just ensure integer)

---

### 5. `POST /api/founder/upload-avatar` (Needs Creation)

**If endpoint needs to be created, validation requirements:**

**File Validation:**
- Allowed extensions: `.jpg`, `.jpeg`, `.png`
- Max file size: 2 MB (2,097,152 bytes)
- MIME type validation:
  - `image/jpeg` (for .jpg, .jpeg)
  - `image/png` (for .png)
- Filename sanitization:
  - Remove path components (prevent path traversal)
  - Allow only alphanumeric, dash, underscore
  - Max filename length: 255 chars
  - Generate safe filename (e.g., UUID + extension)

**Rate Limit:** `10 per hour`

**Implementation Notes:**
- Use Flask's `request.files` to get uploaded file
- Validate file size before processing
- Validate MIME type using `file.content_type` or `magic` library
- Save to secure location (not user-uploaded directory directly)
- Store file path/URL in database (add `avatar_url` field to FounderProfile if needed)

---

## 🚦 Rate Limiting Details

### Rate Limits to Apply

1. **`POST /api/founder/profile`:** `10 per hour`
   - State-changing operation
   - Prevents abuse of profile updates

2. **`PUT /api/founder/profile`:** `10 per hour` (same as POST, since it delegates)

3. **`POST /api/founder/connect`:** `20 per hour`
   - Messaging/connection feature
   - Slightly more lenient for legitimate networking

4. **`POST /api/founder/add-pitch`:** `10 per hour` (if created)
   - State-changing operation

5. **`POST /api/founder/update-pitch`:** `10 per hour` (if created)
   - State-changing operation

6. **`GET /api/founder/connections/<id>/detail`:** `60 per hour`
   - Read-only endpoint (more lenient)
   - Maps to message thread retrieval

7. **`POST /api/founder/upload-avatar`:** `10 per hour` (if created)
   - File upload operation (prevent DoS)

---

## 🔍 Validation Implementation Details

### Field Validation Examples

#### Full Name Validation
```python
if "full_name" in data:
    full_name = data.get("full_name", "").strip() or None
    if full_name:
        is_valid, error_msg = validate_text_field(
            full_name, 
            "Full name", 
            required=False, 
            max_length=200, 
            allow_html=False
        )
        if not is_valid:
            return error_response(error_msg, 400)
        profile.full_name = sanitize_text(full_name)
    else:
        profile.full_name = None
```

#### Bio Validation (with Junk Detection)
```python
if "bio" in data:
    bio = data.get("bio", "").strip() or None
    if bio:
        is_valid, error_msg = validate_text_field(
            bio, 
            "Bio", 
            required=False, 
            max_length=500, 
            allow_html=False
        )
        if not is_valid:
            return error_response(error_msg, 400)
        # Check for junk data if bio is long enough
        if len(bio) >= 50:
            is_junk, reason = detect_junk_data(bio, min_meaningful_length=50)
            if is_junk:
                return error_response(f"Bio {reason.lower()}", 400)
        profile.bio = sanitize_text(bio)
    else:
        profile.bio = None
```

#### LinkedIn URL Validation
```python
if "linkedin_url" in data:
    linkedin_url = data.get("linkedin_url", "").strip() or None
    if linkedin_url:
        is_valid, error_msg = validate_url(
            linkedin_url, 
            allowed_protocols=["http", "https"],
            must_match_domain="linkedin.com"
        )
        if not is_valid:
            return error_response(error_msg, 400)
        profile.linkedin_url = sanitize_text(linkedin_url)
    else:
        profile.linkedin_url = None
```

#### Skills Array Validation
```python
if "skills" in data:
    skills = data.get("skills", [])
    if skills:
        is_valid, error_msg = validate_string_array(
            skills,
            "Skills",
            max_elements=50,
            max_element_length=100,
            required=False
        )
        if not is_valid:
            return error_response(error_msg, 400)
        # Sanitize each skill
        sanitized_skills = [sanitize_text(skill) for skill in skills]
        profile.skills = json.dumps(sanitized_skills)
    else:
        profile.skills = None
```

---

## 📁 File Upload Validation (Avatar)

### Validation Function (To Add to validators.py)

**Note:** The user said "no model or DB schema changes", so avatar upload endpoint can be created but may need to store URL in existing field or skip database storage for now.

**File Validation Requirements:**

1. **Check file exists:**
   ```python
   if 'avatar' not in request.files:
       return error_response("No file uploaded", 400)
   
   file = request.files['avatar']
   if file.filename == '':
       return error_response("No file selected", 400)
   ```

2. **Validate file extension:**
   ```python
   ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
   filename = file.filename
   if not filename or '.' not in filename:
       return error_response("Invalid file format", 400)
   
   extension = filename.rsplit('.', 1)[1].lower()
   if extension not in ALLOWED_EXTENSIONS:
       return error_response("Only JPG, JPEG, and PNG files are allowed", 400)
   ```

3. **Validate file size:**
   ```python
   MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB
   
   # Read file to check size
   file.seek(0, os.SEEK_END)
   file_size = file.tell()
   file.seek(0)  # Reset to beginning
   
   if file_size > MAX_FILE_SIZE:
       return error_response("File size exceeds 2 MB limit", 400)
   ```

4. **Validate MIME type:**
   ```python
   ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png']
   
   mime_type = file.content_type
   if mime_type not in ALLOWED_MIME_TYPES:
       return error_response("Invalid file type. Only JPEG and PNG images are allowed", 400)
   ```

5. **Sanitize filename:**
   ```python
   import uuid
   import re
   
   # Generate safe filename
   safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '', filename)
   if not safe_filename:
       safe_filename = "avatar"
   
   # Generate unique filename to prevent conflicts
   unique_filename = f"{uuid.uuid4().hex[:8]}_{safe_filename}"
   ```

**Complete Avatar Upload Endpoint (To Create):**

```python
@bp.post("/api/founder/upload-avatar")
@require_auth
@apply_rate_limit("10 per hour")
def upload_avatar() -> Any:
    """Upload founder profile avatar."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    profile = FounderProfile.query.filter_by(user_id=user.id).first()
    
    if not profile:
        return not_found_response("Founder profile")
    
    # Validate file exists
    if 'avatar' not in request.files:
        return error_response("No file uploaded", 400)
    
    file = request.files['avatar']
    if file.filename == '':
        return error_response("No file selected", 400)
    
    # Validate file extension
    ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
    filename = file.filename
    if not filename or '.' not in filename:
        return error_response("Invalid file format", 400)
    
    extension = filename.rsplit('.', 1)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        return error_response("Only JPG, JPEG, and PNG files are allowed", 400)
    
    # Validate file size
    MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        return error_response("File size exceeds 2 MB limit", 400)
    
    # Validate MIME type
    ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png']
    mime_type = file.content_type
    if mime_type not in ALLOWED_MIME_TYPES:
        return error_response("Invalid file type. Only JPEG and PNG images are allowed", 400)
    
    # Sanitize and generate filename
    import uuid
    import re
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '', filename)
    if not safe_filename:
        safe_filename = "avatar"
    unique_filename = f"{uuid.uuid4().hex[:8]}_{safe_filename}"
    
    # TODO: Save file to storage (S3, local storage, etc.)
    # For now, return success (actual file saving depends on storage solution)
    # profile.avatar_url = f"/uploads/avatars/{unique_filename}"
    # db.session.commit()
    
    return success_response({
        "filename": unique_filename,
        "message": "Avatar uploaded successfully (file storage not yet implemented)"
    })
```

---

## ✅ Testing Checklist

### Manual Testing

- [ ] **POST /api/founder/profile:**
  - [ ] Valid profile data → Success (rate limit: 10/hour)
  - [ ] Bio too long (>500 chars) → 400 error
  - [ ] Bio with script tags → 400 error
  - [ ] Bio with junk data → 400 error
  - [ ] LinkedIn URL invalid domain → 400 error
  - [ ] Skills array too large (>50 items) → 400 error
  - [ ] 11th request in 1 hour → 429 rate limit error

- [ ] **POST /api/founder/connect:**
  - [ ] Valid message → Success (rate limit: 20/hour)
  - [ ] Message too long (>2000 chars) → 400 error
  - [ ] Message with script tags → 400 error
  - [ ] Message with junk data → 400 error
  - [ ] 21st request in 1 hour → 429 rate limit error

- [ ] **GET /api/founder/connections/<id>/detail:**
  - [ ] Valid thread_id → Success (rate limit: 60/hour)
  - [ ] Invalid thread_id → 404 error
  - [ ] 61st request in 1 hour → 429 rate limit error

- [ ] **POST /api/founder/upload-avatar (if created):**
  - [ ] Valid JPG file (<2MB) → Success
  - [ ] Valid PNG file (<2MB) → Success
  - [ ] File too large (>2MB) → 400 error
  - [ ] Invalid file type (GIF, PDF, etc.) → 400 error
  - [ ] No file uploaded → 400 error
  - [ ] 11th request in 1 hour → 429 rate limit error

### Edge Cases

- [ ] Empty strings after strip (should become None for optional fields)
- [ ] Whitespace-only strings (should be rejected or become None)
- [ ] Null bytes in text fields (should be rejected)
- [ ] Very long arrays (should be rejected)
- [ ] Malformed JSON in array fields (should be handled gracefully)
- [ ] Path traversal in filename (should be sanitized)

---

## 📊 Impact Analysis

### Breaking Changes
- **Minimal** - Validation rules are stricter, but valid inputs will still pass
- **File upload endpoint** - New endpoint, no breaking changes

### Performance Impact
- **Minimal** - Validation is fast
- **File uploads** - Size and type validation happens before processing
- Rate limiting uses existing Flask-Limiter infrastructure

### Security Improvements
- ✅ Prevents XSS attacks (script tags blocked, sanitization)
- ✅ Prevents injection attacks (null bytes, dangerous patterns)
- ✅ Prevents junk data pollution
- ✅ Prevents DoS via file uploads (size limits)
- ✅ Prevents path traversal (filename sanitization)
- ✅ Rate limiting prevents abuse

---

## 🎯 Success Criteria

Phase 2.3 is complete when:

1. ✅ Rate limiting added to all specified endpoints
2. ✅ All text fields validated with centralized validators
3. ✅ All text fields sanitized before saving
4. ✅ Junk data detection applied to longer text fields
5. ✅ URL validation for LinkedIn and website URLs
6. ✅ Array validation for skills and industries
7. ✅ File upload validation (if endpoint created)
8. ✅ All validation errors return consistent messages
9. ✅ No breaking changes (existing valid inputs still work)

---

## 📝 Implementation Steps

### Step 1: Add Rate Limiting Infrastructure
1. Add `get_limiter()` helper function
2. Add `apply_rate_limit()` decorator helper
3. Import necessary modules

### Step 2: Add Validation Imports
1. Import validation functions from `app.utils.validators`

### Step 3: Secure Existing Endpoints
1. Add rate limit to `POST /api/founder/profile`
2. Add rate limit to `PUT /api/founder/profile` (delegates, but add for consistency)
3. Add validation to all profile fields in `create_founder_profile()`
4. Add sanitization before saving to database
5. Add rate limit to `POST /api/founder/connect`
6. Add validation and sanitization to message field

### Step 4: Secure Connection Detail Endpoint
1. Add rate limit to `GET /api/founder/connections/<id>/detail`

### Step 5: Handle Pitch Endpoints
1. **Option A:** Add validation to existing `brief_description` in idea listing endpoints
2. **Option B:** Create new pitch endpoints with validation

### Step 6: Create Avatar Upload Endpoint (If Needed)
1. Create endpoint function
2. Add file validation (extension, size, MIME type)
3. Add filename sanitization
4. Add rate limiting
5. Implement file storage (or placeholder)

---

## ⚠️ Notes & Decisions Needed

### 1. Pitch Endpoints
**Question:** Do pitch endpoints exist separately, or do they map to `brief_description` in idea listings?

**Recommendation:** 
- If pitches are the same as `brief_description`, validate that field in existing endpoints
- If pitches are separate, create new endpoints (requires more work)

**Action:** Clarify with user before implementation

---

### 2. Messages Thread Endpoint
**Question:** Do messages exist separately from connection requests, or are they the same?

**Recommendation:**
- Connection requests already have messages
- Use existing `GET /api/founder/connections/<id>/detail` endpoint
- Add rate limiting to it
- Map user's "messages/thread" requirement to this endpoint

**Action:** Map to existing endpoint, add rate limiting

---

### 3. Avatar Upload Storage
**Question:** Where should avatar files be stored?

**Options:**
- Local filesystem (simple, but not scalable)
- Cloud storage (S3, Cloudinary, etc.) - recommended
- Database (not recommended for files)

**Recommendation:** Create endpoint with validation, but file storage implementation depends on infrastructure

**Action:** Implement validation and rate limiting, add TODO for file storage

---

### 4. Tagline Field
**User mentioned:** "tagline: 100 chars"

**Current State:** No `tagline` field in FounderProfile model

**Options:**
- Add tagline validation if field exists elsewhere
- Skip if field doesn't exist
- Note that user may want to add this field later

**Action:** Skip for now, note in plan

---

## 🔗 Related Files (Reference Only)

- `app/utils/validators.py` - Contains all validation functions
- `api.py` - Contains Flask-Limiter configuration
- `app/models/database.py` - Contains FounderProfile, IdeaListing, ConnectionRequest models
- `app/routes/payment.py` - Reference for rate limiting pattern

---

**Status:** 📋 **PLANNING PHASE - READY FOR REVIEW**

No code changes have been made. This plan requires clarification on:
1. Pitch endpoints (separate or map to existing?)
2. Messages thread (separate or map to connection requests?)
3. Avatar storage location

After clarification, this plan is ready for implementation.
