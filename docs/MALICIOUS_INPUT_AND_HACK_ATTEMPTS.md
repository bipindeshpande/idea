# 🛡️ Handling Malicious Input & Hack Attempts - Security Guide

## Overview

This guide addresses how to protect your application against:
- Users submitting garbage/junk data
- Hack attempts (SQL injection, XSS, CSRF, etc.)
- Abuse and spam
- Resource exhaustion attacks

**Key Principle:** Vercel and Railway handle infrastructure security (SSL, DDoS, firewall), but **you're responsible for application-level security** (input validation, sanitization, abuse prevention).

---

## 🔐 What Vercel & Railway Handle Automatically

### ✅ **Vercel (Frontend Hosting)**

**Automatically Handles:**
- ✅ **SSL/HTTPS** - All traffic encrypted automatically
- ✅ **DDoS Protection** - Basic protection via Cloudflare (included)
- ✅ **Firewall** - Network-level protection
- ✅ **Bot Protection** - Basic bot detection
- ✅ **CDN Security** - Edge security headers
- ✅ **Automatic Security Updates** - Infrastructure patched automatically

**What Vercel Does NOT Handle:**
- ❌ Input validation in your React forms
- ❌ XSS protection in your frontend code (you must sanitize user input)
- ❌ Client-side data validation (you must validate)
- ❌ Preventing malicious API calls from the browser

---

### ✅ **Railway (Backend Hosting)**

**Automatically Handles:**
- ✅ **SSL/HTTPS** - All API traffic encrypted
- ✅ **DDoS Protection** - Basic protection included
- ✅ **Firewall** - Network-level filtering
- ✅ **Server Security** - OS and infrastructure patched automatically
- ✅ **Database Security** - PostgreSQL security features enabled

**What Railway Does NOT Handle:**
- ❌ SQL injection prevention in your code (you must use parameterized queries)
- ❌ Input validation (you must validate all user input)
- ❌ Rate limiting logic (you must implement)
- ❌ Authentication/authorization (you must implement)
- ❌ Business logic security (you must secure your endpoints)

---

## ⚠️ What YOU Must Handle

### **1. Input Validation & Sanitization** 🚨 CRITICAL

**Current Status:** ⚠️ **Partial** - You have some validation, but need comprehensive coverage

#### **The Problem:**
Users can submit:
- Extremely long strings (DoS attacks)
- Malicious scripts (XSS attacks)
- SQL injection attempts
- Special characters that break your database
- Empty/null data that breaks your logic
- Unicode exploits (zero-width characters, emoji spam)

#### **What You Should Implement:**

##### **A. Server-Side Validation (Backend - Flask)**

**✅ Current Implementation:**
- You're using SQLAlchemy (protects against SQL injection)
- Some basic validation exists

**⚠️ Recommended Additions:**

```python
# Example: Comprehensive input validation utility
import re
from typing import Optional, Any
from flask import jsonify

def validate_email(email: str) -> tuple[bool, Optional[str]]:
    """Validate email format and length."""
    if not email or not isinstance(email, str):
        return False, "Email is required"
    
    email = email.strip().lower()
    
    # Length check (prevent DoS)
    if len(email) > 254:  # RFC 5321 limit
        return False, "Email is too long"
    
    # Basic format check
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False, "Invalid email format"
    
    # Prevent dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&', '\x00']
    if any(char in email for char in dangerous_chars):
        return False, "Email contains invalid characters"
    
    return True, None

def sanitize_text(text: str, max_length: int = 10000) -> str:
    """Sanitize user input text to prevent XSS and DoS."""
    if not text:
        return ""
    
    # Limit length to prevent DoS
    if len(text) > max_length:
        text = text[:max_length]
    
    # Remove null bytes (prevent null byte injection)
    text = text.replace('\x00', '')
    
    # Remove zero-width characters (used in spoofing)
    text = re.sub(r'[\u200B-\u200D\uFEFF]', '', text)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    return text.strip()

def validate_idea_explanation(text: str) -> tuple[bool, Optional[str]]:
    """Validate idea explanation field."""
    if not text or not isinstance(text, str):
        return False, "Idea explanation is required"
    
    text = text.strip()
    
    # Minimum length check
    if len(text) < 10:
        return False, "Idea explanation must be at least 10 characters"
    
    # Maximum length check (prevent DoS)
    if len(text) > 50000:  # Reasonable limit
        return False, "Idea explanation is too long (max 50,000 characters)"
    
    # Check for garbage/junk patterns
    # Pattern 1: Repeated characters (e.g., "aaaaaaa" or "12341234")
    if re.search(r'(.)\1{50,}', text):  # Same char repeated 50+ times
        return False, "Idea contains suspicious patterns"
    
    # Pattern 2: Mostly non-alphabetic characters
    alpha_ratio = len(re.findall(r'[a-zA-Z]', text)) / max(len(text), 1)
    if alpha_ratio < 0.3 and len(text) > 100:  # Less than 30% letters
        return False, "Idea explanation must contain meaningful text"
    
    # Pattern 3: Suspicious script-like patterns
    suspicious_patterns = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'eval\s*\(',
        r'expression\s*\(',
    ]
    for pattern in suspicious_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return False, "Idea contains potentially malicious content"
    
    return True, None
```

**Implementation Strategy:**
1. Create validation utilities in `app/utils/validation.py`
2. Apply validation to ALL user input endpoints
3. Return clear error messages (don't expose internal structure)

**Files to Update:**
- `app/routes/validation.py` - Validate idea submissions
- `app/routes/auth.py` - Validate email/password
- `app/routes/founder.py` - Validate profile data
- `app/routes/user.py` - Validate user actions

---

##### **B. Frontend Validation (React)**

**✅ Current Implementation:**
- React automatically escapes HTML (prevents most XSS)
- Some form validation exists

**⚠️ Recommended Additions:**

```javascript
// utils/validation.js
export const validateIdeaExplanation = (text) => {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Idea explanation is required' };
  }
  
  const trimmed = text.trim();
  
  // Length checks
  if (trimmed.length < 10) {
    return { valid: false, error: 'Idea must be at least 10 characters' };
  }
  
  if (trimmed.length > 50000) {
    return { valid: false, error: 'Idea is too long (max 50,000 characters)' };
  }
  
  // Check for suspicious patterns
  if (/(.)\1{50,}/.test(trimmed)) {
    return { valid: false, error: 'Idea contains suspicious patterns' };
  }
  
  return { valid: true };
};

// Sanitize before sending to API
export const sanitizeInput = (text, maxLength = 10000) => {
  if (!text) return '';
  
  // Limit length
  let sanitized = text.slice(0, maxLength);
  
  // Remove dangerous HTML tags (if allowing HTML)
  // For plain text, React already escapes, but be extra safe
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  return sanitized.trim();
};
```

---

### **2. Rate Limiting** 🚨 CRITICAL

**Current Status:** ✅ **Implemented** - You have Flask-Limiter set up

**✅ What You Have:**
- Flask-Limiter installed and configured
- Default limits: 200/day, 50/hour
- Redis support (optional, falls back to memory)

**⚠️ Recommended Improvements:**

```python
# In api.py or route files - Apply specific limits to sensitive endpoints

from api import limiter

# Stricter limits for authentication
@bp.post("/api/auth/login")
@limiter.limit("5 per minute")  # Prevent brute force
def login():
    ...

@bp.post("/api/auth/register")
@limiter.limit("3 per hour")  # Prevent spam registrations
def register():
    ...

# Limits for expensive operations
@bp.post("/api/validate-idea")
@require_auth
@limiter.limit("10 per hour")  # Prevent abuse of AI validation
def validate_idea():
    ...

# Limits for payment endpoints
@bp.post("/api/payment/create-intent")
@require_auth
@limiter.limit("5 per hour")  # Prevent payment spam
def create_payment_intent():
    ...

# Admin endpoints - very strict
@bp.post("/api/admin/login")
@limiter.limit("3 per minute")
def admin_login():
    ...
```

**Priority Endpoints for Rate Limiting:**
1. ✅ Login (`/api/auth/login`) - 5 per minute
2. ✅ Registration (`/api/auth/register`) - 3 per hour
3. ✅ Password reset (`/api/auth/forgot-password`) - 3 per hour
4. ✅ Idea validation (`/api/validate-idea`) - 10 per hour (uses AI, expensive)
5. ✅ Payment creation (`/api/payment/*`) - 5 per hour
6. ✅ Admin endpoints (`/api/admin/*`) - 3 per minute
7. ✅ Contact form (`/api/contact`) - 3 per hour

**Production Recommendation:**
- Use Redis for rate limiting (not in-memory)
- Set `REDIS_URL` environment variable
- This ensures rate limiting works across multiple server instances

---

### **3. SQL Injection Prevention** ✅ GOOD

**Current Status:** ✅ **Well Protected**

**Why You're Safe:**
- Using SQLAlchemy ORM (parameterized queries automatically)
- Never using raw SQL with user input
- Database connection via Railway is secure

**What to Avoid:**
```python
# ❌ NEVER DO THIS:
query = f"SELECT * FROM users WHERE email = '{user_email}'"  # VULNERABLE!

# ✅ ALWAYS DO THIS (which you're already doing):
user = User.query.filter_by(email=email).first()  # SAFE
```

**✅ You're already following best practices here!**

---

### **4. XSS (Cross-Site Scripting) Prevention** ⚠️ NEEDS ATTENTION

**Current Status:** ⚠️ **Partially Protected**

**Frontend Protection:**
- ✅ React automatically escapes HTML in JSX
- ✅ Using React means most XSS is prevented automatically

**⚠️ Still Need to Handle:**

##### **A. User-Generated Content Display:**

```javascript
// ❌ DANGEROUS - Don't do this:
<div dangerouslySetInnerHTML={{ __html: userBio }} />

// ✅ SAFE - React escapes automatically:
<div>{userBio}</div>

// ✅ SAFE - If you need HTML, sanitize first:
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(userBio, { 
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: []
  }) 
}} />
```

##### **B. API Responses:**

```python
# In your Flask routes - sanitize before storing
from markupsafe import escape

def sanitize_for_storage(text: str) -> str:
    """Sanitize text before storing in database."""
    if not text:
        return ""
    
    # Remove script tags and dangerous attributes
    text = escape(text)  # HTML-escape special characters
    
    # Remove any remaining script-like patterns
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    
    return text.strip()
```

**Recommended Actions:**
1. ✅ Review all places where user input is displayed
2. ✅ Never use `dangerouslySetInnerHTML` without sanitization
3. ✅ Consider adding `DOMPurify` for rich text content
4. ✅ Validate/sanitize on both frontend AND backend

---

### **5. CSRF (Cross-Site Request Forgery) Protection** ⚠️ REVIEW NEEDED

**Current Status:** ⚠️ **Check Required**

**Your Setup:**
- Using Bearer tokens for authentication (good!)
- Tokens in Authorization header (not cookies) - this helps

**What to Verify:**
1. ✅ API uses Bearer tokens (you're doing this)
2. ⚠️ Ensure tokens are not stored in localStorage (check frontend)
3. ✅ CORS is properly configured (you have this)

**If Using Cookies:**
```python
# If you switch to cookies, add CSRF protection:
from flask_wtf.csrf import CSRFProtect

csrf = CSRFProtect(app)
```

**Current Recommendation:**
- Your Bearer token approach is good
- Ensure tokens are stored securely (not in localStorage if possible)
- Consider using httpOnly cookies for tokens (more secure)

---

### **6. Garbage/Junk Data Prevention** 🚨 IMPORTANT

**The Problem:**
Users might submit:
- Random characters ("asdfghjkl")
- Repeated text ("aaaaaaa")
- Nonsensical content
- Empty or minimal content
- Spam patterns

**✅ Current Implementation:**
You already have some detection in `app/routes/validation.py`:
- `_is_idea_vague_or_nonsensical()` function
- Minimum length checks

**⚠️ Recommended Enhancements:**

```python
def detect_junk_data(text: str, min_meaningful_length: int = 50) -> tuple[bool, Optional[str]]:
    """
    Detect if input is garbage/junk data.
    Returns: (is_junk, reason)
    """
    if not text or len(text.strip()) < min_meaningful_length:
        return True, "Content is too short"
    
    text = text.strip()
    
    # Pattern 1: Repeated characters (e.g., "aaaaaaa")
    if re.search(r'(.)\1{20,}', text):
        return True, "Content contains excessive repetition"
    
    # Pattern 2: Random keyboard mashing (e.g., "asdfghjkl")
    keyboard_patterns = [
        r'[qwertyuiop]{10,}',  # Top row
        r'[asdfghjkl]{10,}',   # Middle row
        r'[zxcvbnm]{10,}',     # Bottom row
        r'[1234567890]{10,}',  # Numbers
    ]
    for pattern in keyboard_patterns:
        if re.search(pattern, text.lower()):
            return True, "Content appears to be random input"
    
    # Pattern 3: Mostly non-alphabetic (e.g., "!@#$%^&*()")
    alpha_count = len(re.findall(r'[a-zA-Z]', text))
    if alpha_count / len(text) < 0.4:  # Less than 40% letters
        return True, "Content must contain meaningful text"
    
    # Pattern 4: Same word repeated many times
    words = text.split()
    if len(words) > 10:
        word_counts = {}
        for word in words:
            word_counts[word.lower()] = word_counts.get(word.lower(), 0) + 1
        max_repeat = max(word_counts.values())
        if max_repeat > len(words) * 0.5:  # One word is 50%+ of content
            return True, "Content is too repetitive"
    
    # Pattern 5: Entropy check (low entropy = repetitive/random)
    # Skip if too complex, but good to have
    
    return False, None

# Apply to validation endpoint
@bp.post("/api/validate-idea")
@require_auth
def validate_idea():
    idea_explanation = data.get("idea_explanation", "").strip()
    
    # Check for junk data
    is_junk, reason = detect_junk_data(idea_explanation, min_meaningful_length=50)
    if is_junk:
        return jsonify({
            "success": False,
            "error": reason or "Please provide a meaningful business idea description",
        }), 400
    
    # Continue with validation...
```

---

### **7. File Upload Security** (If Applicable)

**Current Status:** ⚠️ **Check if you accept file uploads**

**If You Accept File Uploads:**

```python
import os
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}  # Whitelist only safe types
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def validate_file_upload(file) -> tuple[bool, Optional[str]]:
    """Validate uploaded file."""
    if not file:
        return False, "No file provided"
    
    # Check file size
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    
    if size > MAX_FILE_SIZE:
        return False, f"File too large (max {MAX_FILE_SIZE / 1024 / 1024}MB)"
    
    # Check extension
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
    
    # Check MIME type (don't trust extension)
    mime_type = file.content_type
    allowed_mimes = {
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
    }
    
    if mime_type not in allowed_mimes:
        return False, "Invalid file type"
    
    return True, None
```

**Recommendation:**
- If you don't accept files, document this
- If you do, implement strict validation
- Consider storing files in S3/Cloud Storage (not on server)

---

### **8. Database Input Limits** ✅ GOOD

**Current Status:** ✅ **SQLAlchemy handles type constraints**

**Recommended:**
- Set explicit max lengths on all text fields
- Use appropriate data types (don't use TEXT for everything)

**Example:**
```python
class UserValidation(db.Model):
    idea_explanation = db.Column(db.Text)  # ⚠️ No limit
    
    # ✅ Better:
    idea_explanation = db.Column(db.String(50000))  # Explicit limit
```

---

### **9. Error Message Security** ⚠️ REVIEW NEEDED

**Current Status:** ✅ **Generally Good**

**✅ Good Practices You're Following:**
- Generic error messages (don't reveal internal structure)
- No stack traces in production responses

**⚠️ Things to Check:**

```python
# ❌ BAD - Reveals internal structure:
return jsonify({"error": f"Database error: {str(db_error)}"}), 500

# ✅ GOOD - Generic message:
return jsonify({"error": "An error occurred. Please try again later."}), 500

# ✅ GOOD - Log details server-side:
current_app.logger.error(f"Database error: {db_error}")
return jsonify({"error": "An error occurred. Please try again later."}), 500
```

**Recommendation:**
- Review all error responses
- Ensure sensitive info (database structure, file paths, API keys) never exposed
- Log details server-side, return generic messages to clients

---

### **10. Monitoring & Alerting** ⚠️ RECOMMENDED

**What to Monitor:**

1. **Failed Login Attempts:**
   ```python
   # You already log this, but consider alerting:
   if failed_attempts > 5:
       send_alert(f"Multiple failed logins for {email}")
   ```

2. **Rate Limit Violations:**
   ```python
   # Flask-Limiter logs this, monitor the logs
   # Set up alerts for excessive rate limit hits
   ```

3. **Suspicious Input Patterns:**
   ```python
   # Log when junk data is detected
   current_app.logger.warning(f"Suspicious input detected from {request.remote_addr}")
   ```

4. **Unusual API Usage:**
   - Monitor for spikes in validation requests
   - Monitor for unusual payment attempts
   - Set up alerts for anomalies

**Recommended Tools:**
- **Sentry** (already mentioned in your code) - Error tracking
- **LogRocket** or **FullStory** - User session replay (see what malicious users are doing)
- **Vercel Analytics** - Track unusual patterns
- **Railway Logs** - Monitor backend logs

---

## 🎯 Implementation Priority

### **Phase 1: Critical (Do First)** 🔴
1. ✅ Rate limiting on auth endpoints (you have this, just verify limits)
2. ⚠️ Input validation on all user input endpoints
3. ⚠️ Length limits on all text fields (prevent DoS)
4. ⚠️ Junk data detection (enhance existing)

### **Phase 2: Important (Do Soon)** 🟡
1. ⚠️ XSS sanitization for user-generated content
2. ⚠️ Error message sanitization review
3. ⚠️ Monitoring and alerting setup
4. ⚠️ Redis for rate limiting (if not already done)

### **Phase 3: Nice to Have** 🟢
1. ⚠️ Advanced bot detection
2. ⚠️ CAPTCHA for sensitive endpoints (optional)
3. ⚠️ Honeypot fields (hidden fields to catch bots)
4. ⚠️ IP reputation checking (advanced)

---

## 📋 Quick Checklist

### **Input Validation:**
- [ ] Validate email format and length
- [ ] Validate idea explanations (length, content quality)
- [ ] Validate all text fields (max length)
- [ ] Sanitize user input before storing
- [ ] Check for junk/garbage patterns

### **Rate Limiting:**
- [ ] Login endpoint: 5/minute
- [ ] Register endpoint: 3/hour
- [ ] Password reset: 3/hour
- [ ] Idea validation: 10/hour
- [ ] Payment endpoints: 5/hour
- [ ] Admin endpoints: 3/minute

### **Security Headers:**
- [ ] CORS properly configured (you have this)
- [ ] Security headers set (you have this in api.py)
- [ ] Content Security Policy (you have this)

### **Monitoring:**
- [ ] Failed login attempts logged
- [ ] Rate limit violations monitored
- [ ] Suspicious input patterns logged
- [ ] Error tracking set up (Sentry)

---

## 🔍 What Vercel/Railway Handle vs. What You Handle

### **Vercel Handles:**
- ✅ SSL/HTTPS (automatic)
- ✅ DDoS protection (basic)
- ✅ CDN security
- ✅ Bot protection (basic)
- ✅ Security headers (some)

### **Railway Handles:**
- ✅ SSL/HTTPS (automatic)
- ✅ DDoS protection (basic)
- ✅ Server security updates
- ✅ Database security (PostgreSQL)
- ✅ Network firewall

### **YOU Must Handle:**
- ⚠️ Input validation & sanitization
- ⚠️ Business logic security
- ⚠️ Authentication/authorization
- ⚠️ Rate limiting (infrastructure provided, logic is yours)
- ⚠️ XSS prevention in user content
- ⚠️ Junk data detection
- ⚠️ Abuse prevention

---

## 💡 Best Practices Summary

1. **Validate Everything:** Never trust user input
2. **Sanitize Before Storing:** Clean data before database
3. **Length Limits:** Prevent DoS via huge inputs
4. **Rate Limit Aggressively:** Especially auth and expensive operations
5. **Log Suspicious Activity:** Monitor for patterns
6. **Fail Securely:** Don't expose internal details in errors
7. **Keep Dependencies Updated:** Run `pip audit` and `npm audit` regularly
8. **Use Parameterized Queries:** (You're already doing this ✅)
9. **HTTPS Everywhere:** (Vercel/Railway handle this ✅)
10. **Principle of Least Privilege:** Only give users minimum access needed

---

## 🚨 Common Attack Patterns to Watch For

### **1. SQL Injection:**
- ✅ You're protected (SQLAlchemy)
- ❌ Never use f-strings with SQL queries

### **2. XSS (Cross-Site Scripting):**
- ✅ React protects most cases
- ⚠️ Sanitize any HTML content you display
- ⚠️ Never use `dangerouslySetInnerHTML` unsanitized

### **3. CSRF (Cross-Site Request Forgery):**
- ✅ Bearer tokens help protect
- ✅ CORS configured properly

### **4. Brute Force Attacks:**
- ✅ Rate limiting protects
- ✅ Monitor failed logins

### **5. DoS (Denial of Service):**
- ✅ Rate limiting helps
- ⚠️ Set length limits on all inputs
- ⚠️ Limit expensive operations (AI validation)

### **6. Data Poisoning:**
- ⚠️ Validate all inputs
- ⚠️ Detect junk/garbage data
- ⚠️ Sanitize before storing

---

## 📚 Additional Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Flask Security Best Practices:** https://flask.palletsprojects.com/en/2.3.x/security/
- **React Security:** https://react.dev/learn/escape-hatches
- **SQLAlchemy Security:** https://docs.sqlalchemy.org/en/20/faq/

---

## 🎯 Bottom Line

**Vercel and Railway provide infrastructure security (SSL, DDoS, firewall).**

**You must provide application security:**
- Input validation ✅ (implement comprehensively)
- Rate limiting ✅ (already have, verify limits)
- XSS prevention ✅ (mostly covered, add sanitization)
- Junk data detection ⚠️ (enhance existing)
- Abuse prevention ⚠️ (monitoring + limits)

**Priority:** Focus on input validation and rate limiting first - these prevent 80% of attacks.

---

## 🔧 Centralized Validation Design (Planning Phase)

### Overview

Create a reusable validation layer in `app/utils/validators.py` that provides consistent validation functions for all endpoints. This ensures:
- Consistent validation rules across the app
- Easier maintenance and updates
- Consistent error messages
- Type-safe validation functions

---

### Proposed Structure: `app/utils/validators.py`

```python
"""
Centralized input validation utilities for all endpoints.

All validation functions return tuple: (is_valid: bool, error_message: Optional[str])
"""

from typing import Optional, Tuple, List, Any
import re
from urllib.parse import urlparse


# ============================================================================
# Email Validation
# ============================================================================

def validate_email(email: str) -> Tuple[bool, Optional[str]]:
    """
    Validate email address format and length.
    
    Returns: (is_valid, error_message)
    """
    if not email or not isinstance(email, str):
        return False, "Email is required"
    
    email = email.strip().lower()
    
    # Length check (RFC 5321 limit)
    if len(email) > 254:
        return False, "Email address is too long (max 254 characters)"
    
    # Format validation
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False, "Invalid email format"
    
    # Security: Block dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&', '\x00']
    if any(char in email for char in dangerous_chars):
        return False, "Email contains invalid characters"
    
    return True, None


# ============================================================================
# Password Validation
# ============================================================================

def validate_password(password: str, min_length: int = 8) -> Tuple[bool, Optional[str]]:
    """
    Validate password strength.
    
    Returns: (is_valid, error_message)
    """
    if not password or not isinstance(password, str):
        return False, "Password is required"
    
    password = password.strip()
    
    # Length check
    if len(password) < min_length:
        return False, f"Password must be at least {min_length} characters"
    
    if len(password) > 128:
        return False, "Password is too long (max 128 characters)"
    
    # Security: Block dangerous characters
    if '\x00' in password:
        return False, "Password contains invalid characters"
    
    return True, None


# ============================================================================
# Text Field Validation & Sanitization
# ============================================================================

def sanitize_text(text: str, max_length: Optional[int] = None) -> str:
    """
    Sanitize text input to prevent XSS and DoS.
    
    - Removes null bytes
    - Removes zero-width characters (spoofing)
    - Normalizes whitespace
    - Truncates to max_length if provided
    """
    if not text:
        return ""
    
    # Remove null bytes (prevent null byte injection)
    text = text.replace('\x00', '')
    
    # Remove zero-width characters (used in spoofing)
    text = re.sub(r'[\u200B-\u200D\uFEFF]', '', text)
    
    # Normalize whitespace (collapse multiple spaces)
    text = ' '.join(text.split())
    
    # Truncate if max_length provided
    if max_length and len(text) > max_length:
        text = text[:max_length]
    
    return text.strip()


def validate_text_field(
    text: str,
    field_name: str,
    required: bool = False,
    min_length: Optional[int] = None,
    max_length: Optional[int] = None,
    allow_html: bool = False
) -> Tuple[bool, Optional[str]]:
    """
    Validate a text field with comprehensive checks.
    
    Returns: (is_valid, error_message)
    """
    if not text:
        if required:
            return False, f"{field_name} is required"
        return True, None
    
    if not isinstance(text, str):
        return False, f"{field_name} must be a string"
    
    text = text.strip()
    
    # Length checks
    if min_length and len(text) < min_length:
        return False, f"{field_name} must be at least {min_length} characters"
    
    if max_length and len(text) > max_length:
        return False, f"{field_name} is too long (max {max_length} characters)"
    
    # Security: Block dangerous patterns
    dangerous_patterns = [
        (r'<script[^>]*>.*?</script>', "Script tags are not allowed"),
        (r'javascript:', "JavaScript protocol is not allowed"),
        (r'on\w+\s*=', "Event handlers are not allowed"),
    ]
    
    if not allow_html:
        for pattern, message in dangerous_patterns:
            if re.search(pattern, text, re.IGNORECASE | re.DOTALL):
                return False, f"{field_name} contains prohibited content: {message}"
    
    # Block null bytes
    if '\x00' in text:
        return False, f"{field_name} contains invalid characters"
    
    return True, None


# ============================================================================
# URL Validation
# ============================================================================

def validate_url(url: str, allowed_protocols: List[str] = None, must_match_domain: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """
    Validate URL format and security.
    
    Args:
        url: URL string to validate
        allowed_protocols: List of allowed protocols (default: ['http', 'https'])
        must_match_domain: If provided, URL must be from this domain (e.g., 'linkedin.com')
    
    Returns: (is_valid, error_message)
    """
    if not url or not isinstance(url, str):
        return False, "URL is required"
    
    url = url.strip()
    
    # Length check
    if len(url) > 500:
        return False, "URL is too long (max 500 characters)"
    
    # Block dangerous characters
    if '\x00' in url:
        return False, "URL contains invalid characters"
    
    # Block dangerous protocols
    dangerous_protocols = ['javascript:', 'data:', 'vbscript:']
    for proto in dangerous_protocols:
        if url.lower().startswith(proto):
            return False, f"URL protocol '{proto}' is not allowed"
    
    # Parse and validate URL
    try:
        parsed = urlparse(url)
    except Exception:
        return False, "Invalid URL format"
    
    # Protocol validation
    if allowed_protocols is None:
        allowed_protocols = ['http', 'https']
    
    if parsed.scheme not in allowed_protocols:
        return False, f"URL must use one of: {', '.join(allowed_protocols)}"
    
    # Domain validation (for LinkedIn, website URLs, etc.)
    if must_match_domain:
        domain = parsed.netloc.lower()
        if must_match_domain.lower() not in domain:
            return False, f"URL must be from {must_match_domain} domain"
    
    return True, None


# ============================================================================
# Array/List Validation
# ============================================================================

def validate_string_array(
    items: Any,
    field_name: str,
    max_items: Optional[int] = None,
    max_item_length: Optional[int] = None,
    required: bool = False
) -> Tuple[bool, Optional[str], Optional[List[str]]]:
    """
    Validate an array of strings.
    
    Returns: (is_valid, error_message, sanitized_list)
    """
    if not items:
        if required:
            return False, f"{field_name} is required", None
        return True, None, []
    
    if not isinstance(items, (list, tuple)):
        return False, f"{field_name} must be an array", None
    
    # Max items check
    if max_items and len(items) > max_items:
        return False, f"{field_name} must have at most {max_items} items", None
    
    # Validate each item
    sanitized = []
    for idx, item in enumerate(items):
        if not isinstance(item, str):
            return False, f"{field_name}[{idx}] must be a string", None
        
        item = item.strip()
        
        # Item length check
        if max_item_length and len(item) > max_item_length:
            return False, f"{field_name}[{idx}] is too long (max {max_item_length} characters)", None
        
        # Security: Block dangerous patterns in items
        if '<script' in item.lower() or 'javascript:' in item.lower():
            return False, f"{field_name}[{idx}] contains prohibited content", None
        
        if item:  # Only add non-empty items
            sanitized.append(item)
    
    return True, None, sanitized


# ============================================================================
# Junk/Garbage Data Detection
# ============================================================================

def detect_junk_data(text: str, min_meaningful_length: int = 50) -> Tuple[bool, Optional[str]]:
    """
    Detect if input is garbage/junk data.
    
    Returns: (is_junk, reason_if_junk)
    """
    if not text or len(text.strip()) < min_meaningful_length:
        return True, "Content is too short"
    
    text = text.strip()
    
    # Pattern 1: Repeated characters (e.g., "aaaaaaa")
    if re.search(r'(.)\1{20,}', text):
        return True, "Content contains excessive repetition"
    
    # Pattern 2: Keyboard mashing patterns
    keyboard_patterns = [
        r'[qwertyuiop]{10,}',  # Top row
        r'[asdfghjkl]{10,}',   # Middle row
        r'[zxcvbnm]{10,}',     # Bottom row
        r'[1234567890]{10,}',  # Numbers
    ]
    for pattern in keyboard_patterns:
        if re.search(pattern, text.lower()):
            return True, "Content appears to be random input"
    
    # Pattern 3: Mostly non-alphabetic
    alpha_count = len(re.findall(r'[a-zA-Z]', text))
    if len(text) > 100 and alpha_count / len(text) < 0.4:  # Less than 40% letters
        return True, "Content must contain meaningful text (at least 40% letters)"
    
    # Pattern 4: Same word repeated many times
    words = text.split()
    if len(words) > 10:
        word_counts = {}
        for word in words:
            word_counts[word.lower()] = word_counts.get(word.lower(), 0) + 1
        max_repeat = max(word_counts.values())
        if max_repeat > len(words) * 0.5:  # One word is 50%+ of content
            return True, "Content is too repetitive"
    
    return False, None


# ============================================================================
# Idea Explanation Validation (Special Case)
# ============================================================================

def validate_idea_explanation(text: str) -> Tuple[bool, Optional[str]]:
    """
    Validate idea explanation with junk detection and content quality checks.
    
    Returns: (is_valid, error_message)
    """
    # Basic text field validation
    is_valid, error = validate_text_field(
        text,
        field_name="Idea explanation",
        required=True,
        min_length=10,
        max_length=50000,
        allow_html=False
    )
    if not is_valid:
        return False, error
    
    # Junk data detection
    is_junk, reason = detect_junk_data(text, min_meaningful_length=50)
    if is_junk:
        return False, reason
    
    return True, None


# ============================================================================
# Usage in Endpoints (Example)
# ============================================================================

"""
Example usage in an endpoint:

from app.utils.validators import validate_email, validate_password, validate_text_field, sanitize_text

@bp.post("/api/auth/register")
def register():
    data = request.get_json(force=True, silent=True) or {}
    
    # Validate email
    is_valid, error = validate_email(data.get("email", ""))
    if not is_valid:
        return error_response(error, 400)
    
    email = data.get("email", "").strip().lower()
    
    # Validate password
    is_valid, error = validate_password(data.get("password", ""), min_length=8)
    if not is_valid:
        return error_response(error, 400)
    
    password = data.get("password", "").strip()
    
    # Continue with registration...
"""
```

---

### Error Response Format

All validation errors should use the existing `error_response()` helper from `app/utils/response_helpers.py`:

```python
from app.utils.response_helpers import error_response

# In endpoint:
is_valid, error_msg = validate_email(email)
if not is_valid:
    return error_response(error_msg, 400)
```

This ensures consistent error format:
```json
{
  "success": false,
  "error": "Email is required"
}
```

---

### How Each Endpoint Would Call These Helpers

**Pattern for all endpoints:**

1. Extract data from request
2. Validate each field using helper functions
3. Sanitize text fields
4. Return error if validation fails
5. Continue with business logic

**Example: Registration Endpoint**

```python
@bp.post("/api/auth/register")
def register():
    data = request.get_json(force=True, silent=True) or {}
    
    # Validate email
    email = data.get("email", "").strip().lower()
    is_valid, error = validate_email(email)
    if not is_valid:
        return error_response(error, 400)
    
    # Validate password
    password = data.get("password", "").strip()
    is_valid, error = validate_password(password, min_length=8)
    if not is_valid:
        return error_response(error, 400)
    
    # Continue with registration...
```

**Example: Founder Profile Creation**

```python
@bp.post("/api/founder/profile")
@require_auth
def create_founder_profile():
    data = request.get_json(force=True, silent=True) or {}
    
    # Validate full_name (optional)
    if "full_name" in data:
        full_name = sanitize_text(data.get("full_name", ""), max_length=200)
        is_valid, error = validate_text_field(full_name, "Full name", max_length=200)
        if not is_valid:
            return error_response(error, 400)
    
    # Validate bio (optional)
    if "bio" in data:
        bio = sanitize_text(data.get("bio", ""), max_length=2000)
        is_valid, error = validate_text_field(bio, "Bio", max_length=2000)
        if not is_valid:
            return error_response(error, 400)
    
    # Validate LinkedIn URL (optional)
    if "linkedin_url" in data:
        linkedin_url = data.get("linkedin_url", "").strip()
        is_valid, error = validate_url(linkedin_url, must_match_domain="linkedin.com")
        if not is_valid:
            return error_response(error, 400)
    
    # Validate skills array (optional)
    if "skills" in data:
        is_valid, error, sanitized_skills = validate_string_array(
            data.get("skills"),
            "Skills",
            max_items=50,
            max_item_length=100
        )
        if not is_valid:
            return error_response(error, 400)
        # Use sanitized_skills...
    
    # Continue with profile creation...
```

---

## 🚦 Rate Limiting Plan (Planning Phase)

### Current Status

✅ Flask-Limiter is installed and configured in `api.py`
✅ Default limits: 200/day, 50/hour (applies to all endpoints)
⚠️ Using in-memory storage (should use Redis in production)

---

### Proposed Rate Limits by Endpoint

#### **Authentication Endpoints** (HIGH PRIORITY)

| Endpoint | Rate Limit | Reason |
|----------|------------|--------|
| `POST /api/auth/login` | **5 per minute** | Prevent brute force attacks |
| `POST /api/auth/register` | **3 per hour** | Prevent spam registrations |
| `POST /api/auth/forgot-password` | **3 per hour per IP** | Prevent email enumeration, spam |
| `POST /api/auth/reset-password` | **3 per hour per IP** | Prevent token abuse |
| `POST /api/auth/change-password` | **5 per hour** | Authenticated, less risky |

#### **Idea Validation & Discovery** (HIGH PRIORITY - Expensive Operations)

| Endpoint | Rate Limit | Reason |
|----------|------------|--------|
| `POST /api/validate-idea` | **10 per hour** | Expensive AI API call, prevent abuse |
| `PUT /api/validate-idea/<id>` | **10 per hour** | Same as create (re-validation counts as new) |
| `POST /api/run` | **5 per hour** | Very expensive AI operation (crew execution) |
| `POST /api/enhance-report` | **10 per hour** | Expensive AI operation (parallel enhancements) |

#### **Founder Connect** (MEDIUM PRIORITY)

| Endpoint | Rate Limit | Reason |
|----------|------------|--------|
| `POST /api/founder/profile` | **20 per hour** | Profile updates, user-generated content |
| `POST /api/founder/ideas` | **10 per hour** | Idea listing creation, user-generated content |
| `PUT /api/founder/ideas/<id>` | **20 per hour** | Listing updates |
| `POST /api/founder/connect` | **20 per hour** | Connection requests (also subject to credit limits) |
| `PUT /api/founder/connections/<id>/respond` | **50 per hour** | Accept/decline requests (limited actions) |
| `GET /api/founder/ideas/browse` | **100 per hour** | Read-heavy, but should have limits |
| `GET /api/founder/people/browse` | **100 per hour** | Read-heavy, but should have limits |

#### **User Actions & Notes** (LOW PRIORITY - Personal Data)

| Endpoint | Rate Limit | Reason |
|----------|------------|--------|
| `POST /api/user/actions` | **50 per hour** | Personal action items, low risk |
| `PUT /api/user/actions/<id>` | **50 per hour** | Action updates |
| `POST /api/user/notes` | **50 per hour** | Personal notes, low risk |
| `PUT /api/user/notes/<id>` | **50 per hour** | Note updates |

#### **Payment Endpoints** (HIGH PRIORITY - Financial)

| Endpoint | Rate Limit | Reason |
|----------|------------|--------|
| `POST /api/payment/create-intent` | **5 per hour** | Financial transaction, prevent spam |
| `POST /api/payment/confirm` | **5 per hour** | Financial transaction, prevent spam |
| `POST /api/subscription/cancel` | **5 per hour** | Business logic, prevent abuse |
| `POST /api/subscription/change-plan` | **5 per hour** | Business logic, prevent abuse |

#### **Public Endpoints** (MEDIUM PRIORITY)

| Endpoint | Rate Limit | Reason |
|----------|------------|--------|
| `POST /api/contact` | **3 per hour per IP** | Public endpoint, spam target |

#### **Admin Endpoints** (VERY HIGH PRIORITY)

| Endpoint | Rate Limit | Reason |
|----------|------------|--------|
| `POST /api/admin/login` | **3 per minute** | Admin access, critical security |
| All other admin endpoints | **30 per hour** | Administrative operations |

---

### Implementation Plan

#### **Phase 1: Apply Rate Limits to High-Risk Endpoints**

```python
# In api.py or route files
from api import limiter

@bp.post("/api/auth/login")
@limiter.limit("5 per minute")
def login():
    ...

@bp.post("/api/auth/register")
@limiter.limit("3 per hour")
def register():
    ...

@bp.post("/api/validate-idea")
@require_auth
@limiter.limit("10 per hour")
def validate_idea():
    ...
```

#### **Phase 2: Switch to Redis for Production**

**Current Configuration (api.py):**
```python
# Uses in-memory storage by default
rate_limit_storage = "memory://"
if is_production:
    redis_url = os.environ.get("REDIS_URL")
    if redis_url:
        rate_limit_storage = redis_url
```

**Recommendation:**
- ✅ Already configured to use Redis if `REDIS_URL` is set
- ⚠️ Ensure `REDIS_URL` is set in production environment variables
- ⚠️ Set up Redis instance on Railway (or external Redis service)

**Steps to Enable Redis:**
1. Add Redis service to Railway project (or use external Redis like Upstash)
2. Set `REDIS_URL` environment variable (Railway provides this automatically)
3. Restart application - Flask-Limiter will automatically use Redis
4. Verify in logs: Should see "Using Redis for rate limiting"

---

### Rate Limit Error Response Format

Flask-Limiter automatically returns `429 Too Many Requests` with:
```json
{
  "error": "429 Too Many Requests: ..."
}
```

To customize the error message, use a custom error handler:

```python
@limiter.request_filter
def ip_whitelist():
    # Optional: Whitelist certain IPs (e.g., your own IP for testing)
    pass

@app.errorhandler(429)
def ratelimit_handler(e):
    return error_response(
        "Too many requests. Please slow down and try again later.",
        429
    )
```

---

### Testing Rate Limits

**In Development:**
- Use `flask-limiter`'s test mode or temporarily lower limits
- Monitor rate limit headers: `X-RateLimit-*` headers are added automatically

**In Production:**
- Monitor rate limit violations in logs
- Set up alerts for excessive rate limit hits
- Use Redis to share rate limits across multiple server instances

---

## ✅ Approval Required Before Implementation

This document contains:
1. ✅ **Complete input validation matrix** (`INPUT_VALIDATION_MATRIX.md`)
2. ✅ **Centralized validation design** (this section)
3. ✅ **Rate limiting plan** (this section)

**Next Steps (After Approval):**
1. Implement centralized validation helpers in `app/utils/validators.py`
2. Wire validation into high-risk endpoints first (auth, validation, discovery)
3. Apply rate limits to all endpoints according to plan
4. Set up Redis for production rate limiting
5. Test thoroughly before deploying

**Estimated Implementation Time:**
- Validation helpers: 2-3 hours
- Wiring into endpoints: 4-6 hours
- Rate limiting: 1-2 hours
- Testing: 2-3 hours
- **Total: ~10-14 hours**
