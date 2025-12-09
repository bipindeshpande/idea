"""Founder Psychology routes blueprint - psychology assessment endpoints."""
from flask import Blueprint, request, current_app, jsonify
from typing import Any, Dict, Optional
import json

from app.models.database import db, User
from app.utils import get_current_session, require_auth
from app.utils.response_helpers import (
    success_response, error_response, internal_error_response
)
from app.utils.validators import validate_founder_psychology

bp = Blueprint("founder_psychology", __name__)


@bp.route("/psychology", methods=["GET"])
@require_auth
def get_founder_psychology():
    """
    GET /api/founder/psychology
    Returns user's founder psychology data or empty dict.
    """
    user = get_current_session().user
    
    # Get psychology data (defaults to {} if not set)
    psychology_data = user.founder_psychology if user.founder_psychology else {}
    
    # Ensure it's a dict (handle JSONB/Text serialization)
    if not isinstance(psychology_data, dict):
        try:
            if isinstance(psychology_data, str):
                psychology_data = json.loads(psychology_data)
            else:
                psychology_data = {}
        except (json.JSONDecodeError, TypeError):
            psychology_data = {}
    
    # Return with explicit structure to ensure consistent response
    # Use jsonify directly to avoid response helper merging the dict
    return jsonify({
        "success": True,
        "data": psychology_data
    }), 200


@bp.route("/psychology", methods=["POST"])
@require_auth
def create_founder_psychology():
    """
    POST /api/founder/psychology
    Create or replace user's founder psychology data.
    Validates all dropdown selections and "Other" fields.
    """
    user = get_current_session().user
    
    # Get request data
    data = request.get_json()
    if not data:
        return error_response("Request body must be JSON", status_code=400)
    
    # Validate psychology data
    is_valid, error_msg, sanitized_data = validate_founder_psychology(data)
    if not is_valid:
        return error_response(error_msg or "Invalid founder psychology data", status_code=400)
    
    # Update user's psychology data
    try:
        # Merge with existing data (for partial updates)
        existing = user.founder_psychology if user.founder_psychology else {}
        if not isinstance(existing, dict):
            try:
                if isinstance(existing, str):
                    existing = json.loads(existing)
                else:
                    existing = {}
            except (json.JSONDecodeError, TypeError):
                existing = {}
        
        # Merge sanitized data into existing
        existing.update(sanitized_data)
        user.founder_psychology = existing
        
        db.session.commit()
        
        return success_response({
            "message": "Founder psychology saved successfully",
            "psychology": existing
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saving founder psychology: {e}", exc_info=True)
        return internal_error_response("Failed to save founder psychology")


@bp.route("/psychology", methods=["PUT"])
@require_auth
def update_founder_psychology():
    """
    PUT /api/founder/psychology
    Partial update of user's founder psychology data.
    Same validation rules as POST.
    """
    user = get_current_session().user
    
    # Get request data
    data = request.get_json()
    if not data:
        return error_response("Request body must be JSON", status_code=400)
    
    # Validate psychology data (validates only provided fields)
    is_valid, error_msg, sanitized_data = validate_founder_psychology(data)
    if not is_valid:
        return error_response(error_msg or "Invalid founder psychology data", status_code=400)
    
    # Update user's psychology data (partial update)
    try:
        # Get existing data
        existing = user.founder_psychology if user.founder_psychology else {}
        if not isinstance(existing, dict):
            try:
                if isinstance(existing, str):
                    existing = json.loads(existing)
                else:
                    existing = {}
            except (json.JSONDecodeError, TypeError):
                existing = {}
        
        # Merge sanitized data into existing (partial update)
        existing.update(sanitized_data)
        user.founder_psychology = existing
        
        db.session.commit()
        
        return success_response({
            "message": "Founder psychology updated successfully",
            "psychology": existing
        })
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating founder psychology: {e}", exc_info=True)
        return internal_error_response("Failed to update founder psychology")


