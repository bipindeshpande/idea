"""
Response formatting utilities for consistent API responses.
"""
from flask import jsonify
from typing import Any, Optional, Dict


def success_response(data: Optional[Any] = None, message: Optional[str] = None, status_code: int = 200) -> tuple:
    """
    Create a standardized success response.
    
    Args:
        data: Response data (will be keyed as 'data' if provided)
        message: Optional success message
        status_code: HTTP status code (default: 200)
    
    Returns:
        Tuple of (jsonify response, status_code)
    """
    response: Dict[str, Any] = {"success": True}
    
    if data is not None:
        # If data is a dict with specific keys, merge them into response
        if isinstance(data, dict) and not any(key in data for key in ["success", "error"]):
            response.update(data)
        else:
            response["data"] = data
    
    if message:
        response["message"] = message
    
    return jsonify(response), status_code


def error_response(error: str, status_code: int = 400, additional_data: Optional[Dict[str, Any]] = None) -> tuple:
    """
    Create a standardized error response.
    
    Args:
        error: Error message
        status_code: HTTP status code (default: 400)
        additional_data: Optional additional data to include in response
    
    Returns:
        Tuple of (jsonify response, status_code)
    """
    response: Dict[str, Any] = {
        "success": False,
        "error": error
    }
    
    if additional_data:
        response.update(additional_data)
    
    return jsonify(response), status_code


def not_found_response(resource: str = "Resource") -> tuple:
    """
    Create a standardized 404 not found response.
    
    Args:
        resource: Name of the resource that wasn't found
    
    Returns:
        Tuple of (jsonify response, 404)
    """
    return error_response(f"{resource} not found", 404)


def unauthorized_response(message: str = "Not authenticated") -> tuple:
    """
    Create a standardized 401 unauthorized response.
    
    Args:
        message: Unauthorized message
    
    Returns:
        Tuple of (jsonify response, 401)
    """
    return error_response(message, 401)


def forbidden_response(message: str = "Unauthorized") -> tuple:
    """
    Create a standardized 403 forbidden response.
    
    Args:
        message: Forbidden message
    
    Returns:
        Tuple of (jsonify response, 403)
    """
    return error_response(message, 403)


def internal_error_response(error: str = "Internal server error") -> tuple:
    """
    Create a standardized 500 internal server error response.
    
    Args:
        error: Error message
    
    Returns:
        Tuple of (jsonify response, 500)
    """
    return error_response(error, 500)

