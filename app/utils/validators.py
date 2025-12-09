"""
Centralized input validation utilities for all endpoints.

All validation functions return tuple: (is_valid: bool, error_message: Optional[str])
"""

from typing import Optional, Tuple, List, Any
import re
from urllib.parse import urlparse

from app.constants import MIN_PASSWORD_LENGTH


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

def validate_password(password: str, min_length: Optional[int] = None) -> Tuple[bool, Optional[str]]:
    """
    Validate password strength.
    
    Args:
        password: Password string to validate
        min_length: Minimum password length (defaults to MIN_PASSWORD_LENGTH from constants)
    
    Returns: (is_valid, error_message)
    """
    if not password or not isinstance(password, str):
        return False, "Password is required"
    
    password = password.strip()
    
    # Use constant default if min_length not provided
    if min_length is None:
        min_length = MIN_PASSWORD_LENGTH
    
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
    
    Args:
        text: Text to sanitize
        max_length: Optional maximum length to truncate to
    
    Returns:
        Sanitized text string
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
    
    Args:
        text: Text to validate
        field_name: Name of the field for error messages
        required: Whether field is required
        min_length: Minimum length
        max_length: Maximum length
        allow_html: Whether to allow HTML (default: False)
    
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

def validate_url(url: str, allowed_protocols: Optional[List[str]] = None, must_match_domain: Optional[str] = None) -> Tuple[bool, Optional[str]]:
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
    
    Args:
        items: Array/list to validate
        field_name: Name of the field for error messages
        max_items: Maximum number of items allowed
        max_item_length: Maximum length per item
        required: Whether field is required
    
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
    
    Args:
        text: Text to check for junk patterns
        min_meaningful_length: Minimum length for meaningful content
    
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
    
    Args:
        text: Idea explanation text to validate
    
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
    
    # Junk data detection (only for longer text)
    if len(text.strip()) >= 50:
        is_junk, reason = detect_junk_data(text, min_meaningful_length=50)
        if is_junk:
            return False, reason
    
    return True, None


# ============================================================================
# Founder Psychology Validation
# ============================================================================

def validate_founder_psychology(data: dict) -> Tuple[bool, Optional[str], Optional[dict]]:
    """
    Validate founder psychology data structure and values.
    
    Validates:
    - All dropdown selections are valid enums
    - "Other" selections require matching "..._other" field (optional text, max 200 chars)
    - Required fields are present (archetype is required)
    
    Args:
        data: Dictionary with founder psychology fields
    
    Returns: (is_valid, error_message, sanitized_data)
    """
    if not isinstance(data, dict):
        return False, "Founder psychology data must be a dictionary", None
    
    # Define valid enum values - Updated to match new schema
    VALID_MOTIVATION = [
        "Financial Freedom", "Creative Expression", "Personal Identity / Meaning",
        "Helping People / Impact", "Proving Myself", "Building a Long-Term Asset", "Other"
    ]
    VALID_FEAR = [
        "Fear of Failure", "Fear of Wasting Time", "Fear of Financial Loss",
        "Fear of Choosing Wrong", "Fear of Judgment / Criticism", "Imposter Syndrome",
        "Analysis Paralysis", "Other"
    ]
    VALID_DECISION_STYLE = [
        "Fast / Intuitive", "Slow / Analytical", "Mixed"
    ]
    VALID_ENERGY_PATTERN = [
        "Short Bursts", "Steady Daily Energy", "Long Deep-Focus Sessions", "Variable"
    ]
    VALID_CONSISTENCY_PATTERN = [
        "Strong Start, Weak Finish", "Slow Start, Strong Finish", "Consistent but Slow",
        "Need External Accountability", "Highly Variable"
    ]
    VALID_RISK_APPROACH = [
        "Conservative", "Balanced", "High-Risk / Experimentation", "Risky Early, Cautious Later"
    ]
    VALID_SUCCESS_DEFINITION = [
        "Financial Stability / Wealth", "Work-Life Balance / Stability", "Impact / Helping Others",
        "Creative Fulfillment", "Personal Growth", "Recognition / Achievement",
        "Building Something Lasting", "Other"
    ]
    VALID_ARCHETYPE = [
        "Visionary", "Builder", "Operator", "Integrator", "Rebel", "Caregiver"
    ]
    
    sanitized = {}
    
    # Validate motivation
    if "motivation" in data:
        motivation = data.get("motivation", "").strip()
        if motivation not in VALID_MOTIVATION:
            return False, f"Invalid motivation value. Must be one of: {', '.join(VALID_MOTIVATION)}", None
        sanitized["motivation"] = motivation
        
        # Handle "Other" case - text field is optional
        if motivation == "Other":
            motivation_other = data.get("motivation_other", "").strip() if data.get("motivation_other") else ""
            if motivation_other:
                if len(motivation_other) > 200:
                    return False, "motivation_other must be 200 characters or less", None
                sanitized["motivation_other"] = sanitize_text(motivation_other, max_length=200)
            else:
                sanitized["motivation_other"] = None
        else:
            # If not "Other", ensure motivation_other is null
            sanitized["motivation_other"] = None
    
    # Validate fear (renamed from biggest_fear, support both for backward compatibility)
    fear_value = data.get("fear") or data.get("biggest_fear")
    if fear_value:
        fear = str(fear_value).strip()
        if fear not in VALID_FEAR:
            return False, f"Invalid fear value. Must be one of: {', '.join(VALID_FEAR)}", None
        sanitized["fear"] = fear
        
        # Handle "Other" case
        if fear == "Other":
            fear_other = (data.get("fear_other") or data.get("biggest_fear_other") or "").strip()
            if fear_other:
                if len(fear_other) > 200:
                    return False, "fear_other must be 200 characters or less", None
                sanitized["fear_other"] = sanitize_text(fear_other, max_length=200)
            else:
                sanitized["fear_other"] = None
        else:
            sanitized["fear_other"] = None
    
    # Validate decision_style (no "Other")
    if "decision_style" in data:
        decision_style = data.get("decision_style", "").strip()
        if decision_style not in VALID_DECISION_STYLE:
            return False, f"Invalid decision_style. Must be one of: {', '.join(VALID_DECISION_STYLE)}", None
        sanitized["decision_style"] = decision_style
    
    # Validate energy_pattern (no "Other")
    if "energy_pattern" in data:
        energy_pattern = data.get("energy_pattern", "").strip()
        if energy_pattern not in VALID_ENERGY_PATTERN:
            return False, f"Invalid energy_pattern. Must be one of: {', '.join(VALID_ENERGY_PATTERN)}", None
        sanitized["energy_pattern"] = energy_pattern
    
    # Validate consistency_pattern (new field, no "Other")
    if "consistency_pattern" in data:
        consistency_pattern = data.get("consistency_pattern", "").strip()
        if consistency_pattern not in VALID_CONSISTENCY_PATTERN:
            return False, f"Invalid consistency_pattern. Must be one of: {', '.join(VALID_CONSISTENCY_PATTERN)}", None
        sanitized["consistency_pattern"] = consistency_pattern
    
    # Validate risk_approach (new field, no "Other")
    if "risk_approach" in data:
        risk_approach = data.get("risk_approach", "").strip()
        if risk_approach not in VALID_RISK_APPROACH:
            return False, f"Invalid risk_approach. Must be one of: {', '.join(VALID_RISK_APPROACH)}", None
        sanitized["risk_approach"] = risk_approach
    
    # Validate success_definition
    if "success_definition" in data:
        success_definition = data.get("success_definition", "").strip()
        if success_definition not in VALID_SUCCESS_DEFINITION:
            return False, f"Invalid success_definition value. Must be one of: {', '.join(VALID_SUCCESS_DEFINITION)}", None
        sanitized["success_definition"] = success_definition
        
        # Handle "Other" case - support both success_other and success_definition_other for backward compatibility
        if success_definition == "Other":
            success_other = (data.get("success_other") or data.get("success_definition_other") or "").strip()
            if success_other:
                if len(success_other) > 200:
                    return False, "success_other must be 200 characters or less", None
                sanitized["success_other"] = sanitize_text(success_other, max_length=200)
            else:
                sanitized["success_other"] = None
        else:
            sanitized["success_other"] = None
    
    # Validate archetype (required when provided)
    if "archetype" in data:
        archetype = data.get("archetype", "").strip()
        if archetype not in VALID_ARCHETYPE:
            return False, f"Invalid archetype. Must be one of: {', '.join(VALID_ARCHETYPE)}", None
        sanitized["archetype"] = archetype
    
    return True, None, sanitized