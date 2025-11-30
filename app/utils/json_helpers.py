"""
JSON parsing utilities to reduce boilerplate code.
"""
import json
from typing import Any, Optional
from flask import current_app


def safe_json_loads(json_str: Any, default: Optional[Any] = None, logger_context: str = "") -> Any:
    """
    Safely parse JSON string with comprehensive error handling.
    
    Args:
        json_str: JSON string to parse, or already parsed dict/list
        default: Default value to return on error (defaults to {})
        logger_context: Context string for logging (e.g., "run_id=123")
    
    Returns:
        Parsed JSON object, or default value on error
    """
    if json_str is None:
        return default if default is not None else {}
    
    # If already a dict/list, return as-is
    if isinstance(json_str, (dict, list)):
        return json_str
    
    # If not a string, return default
    if not isinstance(json_str, str):
        return default if default is not None else {}
    
    # Try to parse JSON string
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError) as e:
        if logger_context and current_app:
            current_app.logger.warning(f"Failed to parse JSON {logger_context}: {e}")
        return default if default is not None else {}


def safe_json_dumps(obj: Any, default: Optional[str] = None) -> Optional[str]:
    """
    Safely serialize object to JSON string.
    
    Args:
        obj: Object to serialize
        default: Default value to return on error
    
    Returns:
        JSON string, or default value on error
    """
    if obj is None:
        return default
    
    try:
        return json.dumps(obj)
    except (TypeError, ValueError) as e:
        if current_app:
            current_app.logger.warning(f"Failed to serialize JSON: {e}")
        return default

