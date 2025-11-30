"""
Model serialization utilities to reduce boilerplate code.
"""
from datetime import datetime
from typing import Any, Optional, Dict, List
from flask import current_app


def serialize_datetime(dt: Optional[datetime]) -> Optional[str]:
    """
    Safely serialize datetime to ISO format string.
    
    Args:
        dt: Datetime object or None
    
    Returns:
        ISO format string or None
    """
    if dt is None:
        return None
    try:
        return dt.isoformat()
    except Exception as e:
        if current_app:
            current_app.logger.warning(f"Failed to serialize datetime: {e}")
        return None


def serialize_model(model: Any, fields: List[str]) -> Dict[str, Any]:
    """
    Serialize a model to dictionary with specified fields.
    
    Args:
        model: SQLAlchemy model instance
        fields: List of field names to include
    
    Returns:
        Dictionary with serialized fields
    """
    result = {}
    for field in fields:
        value = getattr(model, field, None)
        # Handle datetime fields
        if isinstance(value, datetime):
            result[field] = serialize_datetime(value)
        else:
            result[field] = value
    return result


def serialize_list(models: List[Any], serializer_func) -> List[Dict[str, Any]]:
    """
    Serialize a list of models using a serializer function.
    
    Args:
        models: List of model instances
        serializer_func: Function to serialize each model
    
    Returns:
        List of serialized dictionaries
    """
    return [serializer_func(model) for model in models]

