"""User management routes blueprint."""
from flask import Blueprint, request, current_app, jsonify
from typing import Any, Dict
from datetime import datetime, timedelta, timezone
from urllib.parse import unquote
import json

from sqlalchemy.orm import joinedload
from sqlalchemy import text

from app.models.database import (
    db, User, UserSession, UserRun, UserValidation, UserAction, UserNote,
    SubscriptionTier, ValidationStatus, PaymentStatus, utcnow, normalize_datetime
)
from app.utils import get_current_session, require_auth
from app.utils.json_helpers import safe_json_loads, safe_json_dumps
from app.utils.response_helpers import (
    success_response, error_response, not_found_response,
    unauthorized_response, internal_error_response
)
from app.utils.serialization import serialize_datetime
from app.constants import (
    DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE,
    MAX_ACTION_TEXT_LENGTH, MAX_IDEA_ID_LENGTH, MAX_NOTE_CONTENT_LENGTH,
    SMART_RECOMMENDATIONS_LIMIT, RECOMMENDATIONS_VALIDATION_LIMIT,
    INTEREST_AREAS_LIMIT, SIMILAR_IDEAS_LIMIT, HIGH_SCORE_THRESHOLD,
    MIN_VALIDATIONS_FOR_INSIGHTS, MAX_COMPARISON_SESSIONS,
    INTEREST_AREA_KEYWORDS,
    ErrorMessages,
)
from app.services.email_service import email_service
from app.services.email_templates import (
    trial_ending_email,
    subscription_expiring_email,
)

bp = Blueprint("user", __name__)

# Note: Rate limits will be applied after blueprint registration in api.py


@bp.get("/api/user/usage")
@require_auth
def get_user_usage() -> Any:
    """Get current usage statistics for the authenticated user."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    usage_stats = user.get_usage_stats()
    
    return success_response({"usage": usage_stats})


@bp.get("/api/user/dashboard")
@require_auth
def get_user_dashboard() -> Any:
    """Get consolidated dashboard data (runs, validations, actions, notes) in a single call."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    
    try:
        # Get runs with pagination to avoid loading all records
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", DEFAULT_PAGE_SIZE, type=int)
        per_page = min(per_page, MAX_PAGE_SIZE)  # Cap at max to prevent excessive loads
        
        runs_query = UserRun.query.filter_by(user_id=user.id, is_deleted=False)
        runs = runs_query.order_by(UserRun.created_at.desc()).limit(per_page).offset((page - 1) * per_page).all()
        total_runs = runs_query.count()
        
        runs_data = []
        for r in runs:
            inputs_data = safe_json_loads(r.inputs, logger_context=f"for run {r.run_id} inputs")
            reports_data = safe_json_loads(r.reports, logger_context=f"for run {r.run_id} reports")
            
            runs_data.append({
                "id": r.id,
                "run_id": r.run_id,
                "inputs": inputs_data,
                "reports": reports_data,  # Include reports so frontend can count ideas
                "created_at": serialize_datetime(r.created_at),
            })
        
        # Get validations with pagination - exclude deleted ones and only show completed
        validations_query = UserValidation.query.filter_by(
            user_id=user.id,
            is_deleted=False,
            status=ValidationStatus.COMPLETED
        )
        validations = validations_query.order_by(UserValidation.created_at.desc()).limit(per_page).offset((page - 1) * per_page).all()
        total_validations = validations_query.count()
        
        validations_data = []
        for v in validations:
            validation_result = safe_json_loads(v.validation_result, logger_context=f"for validation {v.validation_id}")
            category_answers = safe_json_loads(v.category_answers, logger_context=f"for validation {v.validation_id} category_answers")
            
            validations_data.append({
                "id": v.id,
                "validation_id": v.validation_id,
                "overall_score": validation_result.get("overall_score") if validation_result else None,
                "idea_explanation": v.idea_explanation,
                "category_answers": category_answers,  # Include category_answers for editing
                "validation_result": validation_result,  # Include full validation result for display
                "created_at": serialize_datetime(v.created_at),
            })
        
        # Get actions - handle case where is_deleted/archived_at columns don't exist
        actions_data = []
        try:
            actions = UserAction.query.filter_by(user_id=user.id).order_by(UserAction.created_at.desc()).all()
            for action in actions:
                actions_data.append({
                    "id": action.id,
                    "idea_id": action.idea_id,
                    "action_text": action.action_text,
                    "status": action.status,
                    "due_date": serialize_datetime(action.due_date),
                    "completed_at": serialize_datetime(action.completed_at),
                    "created_at": serialize_datetime(action.created_at),
                    "updated_at": serialize_datetime(action.updated_at),
                })
        except Exception as e:
            # Handle case where database schema doesn't match model (missing is_deleted/archived_at columns)
            current_app.logger.warning(f"Failed to load user actions (schema mismatch?): {e}")
            # Rollback the aborted transaction before trying raw SQL
            try:
                db.session.rollback()
            except:
                pass
            # Try to load actions using raw SQL to avoid column issues
            try:
                result = db.session.execute(
                    text("""
                        SELECT id, user_id, idea_id, action_text, status, 
                               due_date, completed_at, created_at, updated_at
                        FROM user_actions 
                        WHERE user_id = :user_id 
                        ORDER BY created_at DESC
                    """),
                    {"user_id": user.id}
                )
                for row in result:
                    actions_data.append({
                        "id": row.id,
                        "idea_id": row.idea_id,
                        "action_text": row.action_text,
                        "status": row.status,
                        "due_date": serialize_datetime(row.due_date),
                        "completed_at": serialize_datetime(row.completed_at),
                        "created_at": serialize_datetime(row.created_at),
                        "updated_at": serialize_datetime(row.updated_at),
                    })
            except Exception as sql_error:
                current_app.logger.error(f"Failed to load actions with raw SQL: {sql_error}")
                actions_data = []  # Return empty list if all attempts fail
        
        # Get notes - handle case where archived_at column doesn't exist
        notes_data = []
        try:
            notes = UserNote.query.filter_by(user_id=user.id).order_by(UserNote.updated_at.desc()).all()
            for note in notes:
                tags = safe_json_loads(note.tags, default=[], logger_context=f"for note {note.id}")
                
                notes_data.append({
                    "id": note.id,
                    "idea_id": note.idea_id,
                    "content": note.content,
                    "tags": tags,
                    "created_at": serialize_datetime(note.created_at),
                    "updated_at": serialize_datetime(note.updated_at),
                })
        except Exception as e:
            # Handle case where database schema doesn't match model (missing archived_at column)
            current_app.logger.warning(f"Failed to load user notes (schema mismatch?): {e}")
            # Rollback the aborted transaction before trying raw SQL
            try:
                db.session.rollback()
            except:
                pass
            # Try to load notes using raw SQL to avoid column issues
            try:
                result = db.session.execute(
                    text("""
                        SELECT id, user_id, idea_id, content, tags, 
                               created_at, updated_at
                        FROM user_notes 
                        WHERE user_id = :user_id 
                        ORDER BY updated_at DESC
                    """),
                    {"user_id": user.id}
                )
                for row in result:
                    tags = safe_json_loads(row.tags, default=[], logger_context=f"for note {row.id}")
                    notes_data.append({
                        "id": row.id,
                        "idea_id": row.idea_id,
                        "content": row.content,
                        "tags": tags,
                        "created_at": serialize_datetime(row.created_at),
                        "updated_at": serialize_datetime(row.updated_at),
                    })
            except Exception as sql_error:
                current_app.logger.error(f"Failed to load notes with raw SQL: {sql_error}")
                notes_data = []  # Return empty list if all attempts fail
        
        return success_response({
            "activity": {
                "runs": runs_data,
                "validations": validations_data,
                "total_runs": total_runs,
                "total_validations": total_validations,
                "page": page,
                "per_page": per_page,
            },
            "actions": actions_data,
            "notes": notes_data,
        })
    except Exception as exc:
        current_app.logger.exception("Failed to get user dashboard: %s", exc)
        return internal_error_response(str(exc))


@bp.get("/api/user/activity")
@require_auth
def get_user_activity() -> Any:
    """Get current user's activity (runs, validations)."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    
    try:
        # Get runs with pagination to avoid loading all records
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", DEFAULT_PAGE_SIZE, type=int)
        per_page = min(per_page, MAX_PAGE_SIZE)  # Cap at max to prevent excessive loads
        
        runs_query = UserRun.query.filter_by(user_id=user.id, is_deleted=False)
        runs = runs_query.order_by(UserRun.created_at.desc()).limit(per_page).offset((page - 1) * per_page).all()
        total_runs = runs_query.count()
        
        runs_data = []
        for r in runs:
            inputs_data = safe_json_loads(r.inputs, logger_context=f"for run {r.run_id} inputs")
            reports_data = safe_json_loads(r.reports, logger_context=f"for run {r.run_id} reports")
            
            runs_data.append({
                "id": r.id,
                "run_id": r.run_id,
                "inputs": inputs_data,
                "reports": reports_data,  # Include reports so frontend can count ideas
                "created_at": serialize_datetime(r.created_at),
            })
        
        # Get validations with pagination - exclude deleted ones
        # For edit mode, include all statuses; otherwise only show completed
        include_all_statuses = request.args.get("include_all_statuses", "false").lower() == "true"
        validations_query = UserValidation.query.filter_by(
            user_id=user.id,
            is_deleted=False
        )
        if not include_all_statuses:
            validations_query = validations_query.filter_by(status=ValidationStatus.COMPLETED)
        validations = validations_query.order_by(UserValidation.created_at.desc()).limit(per_page).offset((page - 1) * per_page).all()
        total_validations = validations_query.count()
        
        validations_data = []
        for v in validations:
            validation_result = safe_json_loads(v.validation_result, logger_context=f"for validation {v.validation_id}")
            category_answers = safe_json_loads(v.category_answers, logger_context=f"for validation {v.validation_id} category_answers")
            
            validations_data.append({
                "id": v.id,
                "validation_id": v.validation_id,
                "overall_score": validation_result.get("overall_score") if validation_result else None,
                "idea_explanation": v.idea_explanation,
                "category_answers": category_answers,  # Include category_answers for editing
                "validation_result": validation_result,  # Include full validation result for display
                "created_at": serialize_datetime(v.created_at),
            })
        
        return success_response({
            "runs": runs_data,
            "validations": validations_data,
            "total_runs": total_runs,
            "total_validations": total_validations,
            "page": page,
            "per_page": per_page,
        })
    except Exception as exc:
        current_app.logger.exception("Failed to get user activity: %s", exc)
        return internal_error_response(str(exc))


@bp.get("/api/user/run/<path:run_id>")
@require_auth
def get_user_run(run_id: str) -> Any:
    """Get a specific user's run data including inputs and reports."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    
    try:
        # URL decode the run_id in case it was encoded
        run_id = unquote(run_id)
        
        # Normalize run_id (remove 'run_' prefix if present)
        # Handle both "run_123" and "123" formats
        normalized_run_id = run_id
        if run_id.startswith("run_"):
            normalized_run_id = run_id[4:]  # Remove "run_" prefix (4 characters)
        
        # Check database connection first
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception as db_error:
            current_app.logger.exception("Database connection error in get_user_run: %s", db_error)
            return internal_error_response(ErrorMessages.DATABASE_CONNECTION_ERROR)
        
        # Try to find the run with normalized ID first
        try:
            user_run = UserRun.query.filter_by(user_id=user.id, run_id=normalized_run_id).first()
        except Exception as query_error:
            current_app.logger.exception("Database query error (normalized) in get_user_run: run_id=%s, error=%s", normalized_run_id, query_error)
            db.session.rollback()
            # Try with original run_id as fallback
            try:
                user_run = UserRun.query.filter_by(user_id=user.id, run_id=run_id).first()
            except Exception as query_error2:
                current_app.logger.exception("Database query error (original) in get_user_run: run_id=%s, error=%s", run_id, query_error2)
                db.session.rollback()
                return internal_error_response(ErrorMessages.DATABASE_QUERY_ERROR)
        
        # If not found, try with original run_id (in case it's stored with prefix)
        if not user_run:
            try:
                user_run = UserRun.query.filter_by(user_id=user.id, run_id=run_id).first()
            except Exception as query_error:
                current_app.logger.exception("Database query error (fallback) in get_user_run: run_id=%s, error=%s", run_id, query_error)
                db.session.rollback()
                return internal_error_response(ErrorMessages.DATABASE_QUERY_ERROR)
        
        if not user_run:
            current_app.logger.warning(f"Run not found: user_id={user.id}, run_id={run_id}, normalized={normalized_run_id}")
            return not_found_response("Run")
        
        # Parse inputs and reports from JSON strings (optimized with better error handling)
        inputs = {}
        reports = {}
        
        inputs = safe_json_loads(user_run.inputs, logger_context=f"for run {run_id} inputs")
        reports = safe_json_loads(user_run.reports, logger_context=f"for run {run_id} reports")
        
        # Handle datetime serialization safely
        created_at = None
        updated_at = None
        try:
            if user_run.created_at:
                created_at = user_run.created_at.isoformat()
            if user_run.updated_at:
                updated_at = user_run.updated_at.isoformat()
        except Exception as e:
            current_app.logger.warning(f"Failed to serialize datetime for run {run_id}: {e}")
        
        return jsonify({
            "success": True,
            "run": {
                "id": user_run.id,
                "run_id": user_run.run_id,
                "inputs": inputs,
                "reports": reports,
                "created_at": created_at,
                "updated_at": updated_at,
            },
        })
    except Exception as exc:
        current_app.logger.exception("Failed to get user run: run_id=%s, user_id=%s, error=%s", run_id, user.id if user else None, exc)
        return jsonify({"success": False, "error": "Internal server error"}), 500


@bp.delete("/api/user/run/<run_id>")
@require_auth
def delete_user_run(run_id: str) -> Any:
    """Delete a user's run from the database."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    
    try:
        # Find the run and verify it belongs to the user
        user_run = UserRun.query.filter_by(user_id=user.id, run_id=run_id).first()
        if not user_run:
            return not_found_response("Run")
        
        # Delete the run
        db.session.delete(user_run)
        db.session.commit()
        
        return success_response(message="Run deleted successfully")
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to delete user run: %s", exc)
        return internal_error_response(str(exc))


@bp.get("/api/user/actions")
@require_auth
def get_user_actions() -> Any:
    """Get all action items for the current user."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    idea_id = request.args.get("idea_id")  # Optional filter by idea
    
    try:
        try:
            query = UserAction.query.filter_by(user_id=user.id)
            if idea_id:
                query = query.filter_by(idea_id=idea_id)
            
            actions = query.order_by(UserAction.created_at.desc()).all()
            actions_data = []
            for action in actions:
                actions_data.append({
                    "id": action.id,
                    "idea_id": action.idea_id,
                    "action_text": action.action_text,
                    "status": action.status,
                    "due_date": serialize_datetime(action.due_date),
                    "completed_at": serialize_datetime(action.completed_at),
                    "created_at": serialize_datetime(action.created_at),
                    "updated_at": serialize_datetime(action.updated_at),
                })
        except Exception as schema_error:
            # Handle schema mismatch - use raw SQL
            current_app.logger.warning(f"Schema mismatch loading actions, using raw SQL: {schema_error}")
            # Rollback the aborted transaction before trying raw SQL
            try:
                db.session.rollback()
            except:
                pass
            sql_query = "SELECT id, user_id, idea_id, action_text, status, due_date, completed_at, created_at, updated_at FROM user_actions WHERE user_id = :user_id"
            params = {"user_id": user.id}
            if idea_id:
                sql_query += " AND idea_id = :idea_id"
                params["idea_id"] = idea_id
            sql_query += " ORDER BY created_at DESC"
            
            result = db.session.execute(text(sql_query), params)
            actions_data = []
            for row in result:
                actions_data.append({
                    "id": row.id,
                    "idea_id": row.idea_id,
                    "action_text": row.action_text,
                    "status": row.status,
                    "due_date": serialize_datetime(row.due_date),
                    "completed_at": serialize_datetime(row.completed_at),
                    "created_at": serialize_datetime(row.created_at),
                    "updated_at": serialize_datetime(row.updated_at),
                })
        
        return success_response({"actions": actions_data})
    except Exception as exc:
        current_app.logger.exception("Failed to get user actions: %s", exc)
        return internal_error_response(str(exc))


@bp.post("/api/user/actions")
@require_auth
def create_user_action() -> Any:
    """Create a new action item."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    action_text = data.get("action_text", "").strip()
    idea_id = data.get("idea_id", "").strip()
    status = data.get("status", "pending")
    due_date_str = data.get("due_date")
    
    if not action_text or not idea_id:
        return error_response(ErrorMessages.ACTION_TEXT_REQUIRED, 400)
    
    # Validate input lengths
    if len(action_text) > MAX_ACTION_TEXT_LENGTH:
        return error_response(ErrorMessages.ACTION_TEXT_TOO_LONG, 400)
    
    if len(idea_id) > MAX_IDEA_ID_LENGTH:
        return error_response(ErrorMessages.IDEA_ID_TOO_LONG, 400)
    
    # Validate status
    allowed_statuses = ["pending", "in_progress", "completed", "blocked"]
    if status not in allowed_statuses:
        return error_response(f"status must be one of: {', '.join(allowed_statuses)}", 400)
    
    try:
        due_date = None
        if due_date_str:
            try:
                # Handle both Z and +00:00 timezone formats
                date_str = due_date_str.replace("Z", "+00:00")
                due_date = datetime.fromisoformat(date_str)
            except (ValueError, AttributeError) as e:
                current_app.logger.warning(f"Invalid date format: {due_date_str}, error: {e}")
                return error_response(ErrorMessages.INVALID_DATE_FORMAT, 400)
        
        action = UserAction(
            user_id=user.id,
            idea_id=idea_id,
            action_text=action_text,
            status=status,
            due_date=due_date,
        )
        db.session.add(action)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "action": {
                "id": action.id,
                "idea_id": action.idea_id,
                "action_text": action.action_text,
                "status": action.status,
                "due_date": action.due_date.isoformat() if action.due_date else None,
                "created_at": action.created_at.isoformat() if action.created_at else None,
            },
        })
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to create action: %s", exc)
        return internal_error_response(str(exc))


@bp.put("/api/user/actions/<int:action_id>")
@require_auth
def update_user_action(action_id: int) -> Any:
    """Update an action item."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    try:
        # Try ORM query first, fall back to raw SQL if schema mismatch
        use_raw_sql = False
        try:
            action = UserAction.query.filter_by(id=action_id, user_id=user.id).first()
        except Exception as schema_error:
            # Schema mismatch - use raw SQL for all operations
            use_raw_sql = True
            current_app.logger.warning(f"Schema mismatch, using raw SQL for action update: {schema_error}")
            # Rollback the aborted transaction before trying raw SQL
            try:
                db.session.rollback()
            except:
                pass
            result = db.session.execute(
                text("SELECT id FROM user_actions WHERE id = :id AND user_id = :user_id"),
                {"id": action_id, "user_id": user.id}
            )
            if not result.first():
                return not_found_response("Action")
        
        if use_raw_sql:
            # Use raw SQL for updates
            updates = []
            params = {"id": action_id, "user_id": user.id}
            
            if "action_text" in data:
                action_text = data["action_text"].strip()
                if len(action_text) > 1000:
                    return error_response(ErrorMessages.ACTION_TEXT_TOO_LONG, 400)
                updates.append("action_text = :action_text")
                params["action_text"] = action_text
            
            if "status" in data:
                allowed_statuses = ["pending", "in_progress", "completed", "blocked"]
                if data["status"] not in allowed_statuses:
                    return error_response(f"status must be one of: {', '.join(allowed_statuses)}", 400)
                updates.append("status = :status")
                params["status"] = data["status"]
                if data["status"] == "completed":
                    updates.append("completed_at = :completed_at")
                    params["completed_at"] = utcnow()
                else:
                    updates.append("completed_at = NULL")
            
            if "due_date" in data:
                due_date = data.get("due_date")
                if due_date:
                    try:
                        due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
                        updates.append("due_date = :due_date")
                        params["due_date"] = due_date
                    except:
                        return error_response("Invalid due_date format", 400)
                else:
                    updates.append("due_date = NULL")
            
            if updates:
                updates.append("updated_at = :updated_at")
                params["updated_at"] = utcnow()
                db.session.execute(
                    text(f"UPDATE user_actions SET {', '.join(updates)} WHERE id = :id AND user_id = :user_id"),
                    params
                )
                db.session.commit()
            
            # Return updated action
            result = db.session.execute(
                text("SELECT id, user_id, idea_id, action_text, status, due_date, completed_at, created_at, updated_at FROM user_actions WHERE id = :id AND user_id = :user_id"),
                {"id": action_id, "user_id": user.id}
            )
            row = result.first()
            return success_response({
                "action": {
                    "id": row.id,
                    "idea_id": row.idea_id,
                    "action_text": row.action_text,
                    "status": row.status,
                    "due_date": serialize_datetime(row.due_date),
                    "completed_at": serialize_datetime(row.completed_at),
                    "created_at": serialize_datetime(row.created_at),
                    "updated_at": serialize_datetime(row.updated_at),
                }
            })
        
        # Normal ORM path
        if not action:
            return not_found_response("Action")
        
        if "action_text" in data:
            action_text = data["action_text"].strip()
            if len(action_text) > 1000:
                return error_response(ErrorMessages.ACTION_TEXT_TOO_LONG, 400)
            action.action_text = action_text
        if "status" in data:
            allowed_statuses = ["pending", "in_progress", "completed", "blocked"]
            if data["status"] not in allowed_statuses:
                return error_response(f"status must be one of: {', '.join(allowed_statuses)}", 400)
            action.status = data["status"]
            if data["status"] == "completed" and not action.completed_at:
                action.completed_at = utcnow()
            elif data["status"] != "completed":
                action.completed_at = None
        if "due_date" in data:
            due_date_str = data["due_date"]
            if due_date_str:
                try:
                    # Handle both Z and +00:00 timezone formats
                    date_str = due_date_str.replace("Z", "+00:00")
                    action.due_date = datetime.fromisoformat(date_str)
                except (ValueError, AttributeError) as e:
                    current_app.logger.warning(f"Invalid date format: {due_date_str}, error: {e}")
                    return error_response(ErrorMessages.INVALID_DATE_FORMAT, 400)
            else:
                action.due_date = None
        
        action.updated_at = utcnow()
        db.session.commit()
        
        return jsonify({
            "success": True,
            "action": {
                "id": action.id,
                "idea_id": action.idea_id,
                "action_text": action.action_text,
                "status": action.status,
                "due_date": action.due_date.isoformat() if action.due_date else None,
                "completed_at": action.completed_at.isoformat() if action.completed_at else None,
                "updated_at": action.updated_at.isoformat() if action.updated_at else None,
            },
        })
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to update action: %s", exc)
        return internal_error_response(str(exc))


@bp.delete("/api/user/actions/<int:action_id>")
@require_auth
def delete_user_action(action_id: int) -> Any:
    """Delete an action item."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    
    try:
        try:
            action = UserAction.query.filter_by(id=action_id, user_id=user.id).first()
            if action:
                db.session.delete(action)
                db.session.commit()
        except Exception as schema_error:
            # Handle schema mismatch - use raw SQL
            current_app.logger.warning(f"Schema mismatch deleting action, using raw SQL: {schema_error}")
            # Rollback the aborted transaction before trying raw SQL
            try:
                db.session.rollback()
            except:
                pass
            result = db.session.execute(
                text("SELECT id FROM user_actions WHERE id = :id AND user_id = :user_id"),
                {"id": action_id, "user_id": user.id}
            )
            if not result.first():
                return not_found_response("Action")
            db.session.execute(
                text("DELETE FROM user_actions WHERE id = :id AND user_id = :user_id"),
                {"id": action_id, "user_id": user.id}
            )
            db.session.commit()
        
        return jsonify({"success": True})
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to delete action: %s", exc)
        return internal_error_response(str(exc))


@bp.get("/api/user/notes")
@require_auth
def get_user_notes() -> Any:
    """Get all notes for the current user."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    idea_id = request.args.get("idea_id")  # Optional filter by idea
    
    try:
        query = UserNote.query.filter_by(user_id=user.id)
        if idea_id:
            query = query.filter_by(idea_id=idea_id)
        
        notes = query.order_by(UserNote.updated_at.desc()).all()
        notes_data = []
        for note in notes:
            tags = safe_json_loads(note.tags, default=[], logger_context=f"for note {note.id}")
            
            notes_data.append({
                "id": note.id,
                "idea_id": note.idea_id,
                "content": note.content,
                "tags": tags,
                "created_at": serialize_datetime(note.created_at),
                "updated_at": serialize_datetime(note.updated_at),
            })
        
        return jsonify({"success": True, "notes": notes_data})
    except Exception as exc:
        current_app.logger.exception("Failed to get user notes: %s", exc)
        return internal_error_response(str(exc))


@bp.post("/api/user/notes")
@require_auth
def create_user_note() -> Any:
    """Create a new note."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    content = data.get("content", "").strip()
    idea_id = data.get("idea_id", "").strip()
    tags = data.get("tags", [])
    
    if not content or not idea_id:
        return jsonify({"success": False, "error": "content and idea_id are required"}), 400
    
    # Validate input lengths
    if len(content) > MAX_NOTE_CONTENT_LENGTH:
        return error_response(ErrorMessages.CONTENT_TOO_LONG, 400)
    
    if len(idea_id) > MAX_IDEA_ID_LENGTH:
        return error_response(ErrorMessages.IDEA_ID_TOO_LONG, 400)
    
    try:
        note = UserNote(
            user_id=user.id,
            idea_id=idea_id,
            content=content,
            tags=json.dumps(tags) if tags else None,
        )
        db.session.add(note)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "note": {
                "id": note.id,
                "idea_id": note.idea_id,
                "content": note.content,
                "tags": tags,
                "created_at": note.created_at.isoformat() if note.created_at else None,
            },
        })
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to create note: %s", exc)
        return internal_error_response(str(exc))


@bp.put("/api/user/notes/<int:note_id>")
@require_auth
def update_user_note(note_id: int) -> Any:
    """Update a note."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    try:
        note = UserNote.query.filter_by(id=note_id, user_id=user.id).first()
        if not note:
            return jsonify({"success": False, "error": "Note not found"}), 404
        
        if "content" in data:
            content = data["content"].strip()
            if len(content) > 10000:
                return jsonify({"success": False, "error": "content must be 10000 characters or less"}), 400
            note.content = content
        if "tags" in data:
            note.tags = json.dumps(data["tags"]) if data["tags"] else None
        
        note.updated_at = utcnow()
        db.session.commit()
        
        tags = []
        try:
            tags = json.loads(note.tags) if note.tags else []
        except:
            pass
        
        return jsonify({
            "success": True,
            "note": {
                "id": note.id,
                "idea_id": note.idea_id,
                "content": note.content,
                "tags": tags,
                "updated_at": note.updated_at.isoformat() if note.updated_at else None,
            },
        })
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to update note: %s", exc)
        return internal_error_response(str(exc))


@bp.delete("/api/user/notes/<int:note_id>")
@require_auth
def delete_user_note(note_id: int) -> Any:
    """Delete a note."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    
    try:
        note = UserNote.query.filter_by(id=note_id, user_id=user.id).first()
        if not note:
            return jsonify({"success": False, "error": "Note not found"}), 404
        
        db.session.delete(note)
        db.session.commit()
        
        return jsonify({"success": True})
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to delete note: %s", exc)
        return internal_error_response(str(exc))


@bp.post("/api/user/compare-sessions")
@require_auth
def compare_sessions() -> Any:
    """Compare multiple sessions (runs or validations) side-by-side."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    run_ids = data.get("run_ids", [])
    validation_ids = data.get("validation_ids", [])
    
    if not run_ids and not validation_ids:
        return jsonify({"success": False, "error": "At least one run_id or validation_id is required"}), 400
    
    if len(run_ids) + len(validation_ids) > 5:
        return jsonify({"success": False, "error": "Maximum 5 sessions can be compared at once"}), 400
    
    try:
        comparison_data = {
            "runs": [],
            "validations": [],
        }
        
        # Fetch runs in batch to avoid N+1 queries
        runs_dict = {r.run_id: r for r in UserRun.query.filter_by(
            user_id=user.id
        ).filter(UserRun.run_id.in_(run_ids)).all()}
        
        for run_id in run_ids:
            run = runs_dict.get(run_id)
            if run:
                inputs = {}
                reports = {}
                try:
                    inputs = json.loads(run.inputs) if run.inputs else {}
                    reports = json.loads(run.reports) if run.reports else {}
                except:
                    pass
                
                comparison_data["runs"].append({
                    "run_id": run.run_id,
                    "inputs": inputs,
                    "reports": reports,
                    "created_at": run.created_at.isoformat() if run.created_at else None,
                })
        
        # Fetch validations in batch to avoid N+1 queries
        validations_dict = {v.validation_id: v for v in UserValidation.query.filter_by(
            user_id=user.id,
            is_deleted=False
        ).filter(UserValidation.validation_id.in_(validation_ids)).all()}
        
        for validation_id in validation_ids:
            validation = validations_dict.get(validation_id)
            if validation:
                category_answers = {}
                validation_result = {}
                try:
                    category_answers = json.loads(validation.category_answers) if validation.category_answers else {}
                    validation_result = safe_json_loads(validation.validation_result, logger_context=f"for validation {validation.validation_id}")
                except:
                    pass
                
                comparison_data["validations"].append({
                    "validation_id": validation.validation_id,
                    "category_answers": category_answers,
                    "idea_explanation": validation.idea_explanation,
                    "validation_result": validation_result,
                    "created_at": validation.created_at.isoformat() if validation.created_at else None,
                })
        
        return jsonify({"success": True, "comparison": comparison_data})
    except Exception as exc:
        current_app.logger.exception("Failed to compare sessions: %s", exc)
        return internal_error_response(str(exc))


@bp.get("/api/user/smart-recommendations")
@require_auth
def get_smart_recommendations() -> Any:
    """Get smart recommendations based on user's validation history."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    
    try:
        # Get validations with limit to avoid loading all records
        # Only need recent validations for pattern analysis
        validations = UserValidation.query.filter_by(
            user_id=user.id,
            is_deleted=False
        ).order_by(UserValidation.created_at.desc()).limit(SMART_RECOMMENDATIONS_LIMIT).all()
        
        if len(validations) < MIN_VALIDATIONS_FOR_INSIGHTS:
            return success_response({
                "insights": {
                    "message": ErrorMessages.MIN_VALIDATIONS_FOR_INSIGHTS,
                    "patterns": [],
                    "similar_ideas": [],
                    "total_validations": len(validations),
                    "interest_areas": [],
                },
            })
        
        # Analyze patterns
        patterns = []
        category_scores = {}
        interest_areas = []
        
        for validation in validations:
            try:
                validation_result = safe_json_loads(validation.validation_result, logger_context=f"for validation {validation.validation_id}")
                scores = validation_result.get("scores", {})
                
                # Track category scores
                for category, score in scores.items():
                    if category not in category_scores:
                        category_scores[category] = []
                    category_scores[category].append(score)
                
                # Track interest areas from idea explanation
                if validation.idea_explanation:
                    idea_lower = validation.idea_explanation.lower()
                    # Use INTEREST_AREA_KEYWORDS constant for keyword matching
                    for area_name, keywords in INTEREST_AREA_KEYWORDS.items():
                        if any(keyword in idea_lower for keyword in keywords):
                            interest_areas.append(area_name)
                            break  # Only match first area to avoid duplicates
            except:
                continue
        
        # Generate insights
        if category_scores:
            # Find strongest category
            avg_scores = {cat: sum(scores) / len(scores) for cat, scores in category_scores.items() if scores}
            if avg_scores:
                strongest = max(avg_scores.items(), key=lambda x: x[1])
                patterns.append({
                    "type": "strongest_category",
                    "category": strongest[0],
                    "average_score": round(strongest[1], 1),
                    "message": f"You tend to score highest in {strongest[0].replace('_', ' ').title()} (avg: {round(strongest[1], 1)}/10)",
                })
        
        # Find similar ideas (based on validation scores similarity)
        similar_ideas = []
        if len(validations) >= 2:
            # Simple similarity: ideas with similar overall scores
            validation_scores = []
            for validation in validations[:RECOMMENDATIONS_VALIDATION_LIMIT]:  # Last N validations
                try:
                    validation_result = safe_json_loads(validation.validation_result, logger_context=f"for validation {validation.validation_id}")
                    overall_score = validation_result.get("overall_score", 0)
                    if overall_score > 0:
                        validation_scores.append({
                            "validation_id": validation.validation_id,
                            "score": overall_score,
                            "idea_explanation": validation.idea_explanation[:100] if validation.idea_explanation else "",
                        })
                except:
                    continue
            
            # Group by score ranges
            high_scoring = [v for v in validation_scores if v["score"] >= HIGH_SCORE_THRESHOLD]
            if high_scoring:
                similar_ideas = high_scoring[:SIMILAR_IDEAS_LIMIT]
        
        return success_response({
            "insights": {
                "patterns": patterns,
                "similar_ideas": similar_ideas,
                "total_validations": len(validations),
                "interest_areas": list(set(interest_areas))[:INTEREST_AREAS_LIMIT] if interest_areas else [],
                "message": None,  # No message when we have insights
            },
        })
    except Exception as exc:
        current_app.logger.exception("Failed to get smart recommendations: %s", exc)
        return internal_error_response(str(exc))


@bp.post("/api/emails/check-expiring")
def check_expiring_subscriptions() -> Any:
    """Check and send emails for expiring trials/subscriptions (can be called by cron job)."""
    try:
        now = utcnow()
        emails_sent = 0
        
        # Check trial users expiring in 1 day - use index on subscription_type and subscription_expires_at
        trial_expiring = User.query.filter(
            User.subscription_type == SubscriptionTier.FREE_TRIAL,
            User.subscription_expires_at <= now + timedelta(days=1),
            User.subscription_expires_at > now,
            User.is_active == True
        ).all()
        
        for user in trial_expiring:
            days_remaining = (normalize_datetime(user.subscription_expires_at) - normalize_datetime(now)).days
            if days_remaining <= 1:
                try:
                    html_content, text_content = trial_ending_email(
                        user_name=user.email,
                        days_remaining=days_remaining,
                    )
                    email_service.send_email(
                        to_email=user.email,
                        subject=f"Your Free Trial Ends in {days_remaining} Day{'s' if days_remaining != 1 else ''}",
                        html_content=html_content,
                        text_content=text_content,
                    )
                    emails_sent += 1
                except Exception as e:
                    current_app.logger.warning(f"Failed to send trial ending email to {user.email}: {e}")
        
        # Check paid subscriptions expiring in 3 days - use index on subscription_type and subscription_expires_at
        paid_expiring = User.query.filter(
            User.subscription_type.in_([SubscriptionTier.STARTER, SubscriptionTier.PRO, "weekly"]),  # weekly is legacy
            User.payment_status == PaymentStatus.ACTIVE,
            User.subscription_expires_at <= now + timedelta(days=3),
            User.subscription_expires_at > now,
            User.is_active == True
        ).all()
        
        for user in paid_expiring:
            days_remaining = (normalize_datetime(user.subscription_expires_at) - normalize_datetime(now)).days
            if days_remaining <= 3:
                try:
                    html_content, text_content = subscription_expiring_email(
                        user_name=user.email,
                        subscription_type=user.subscription_type,
                        days_remaining=days_remaining,
                    )
                    email_service.send_email(
                        to_email=user.email,
                        subject=f"Your Subscription Expires in {days_remaining} Day{'s' if days_remaining != 1 else ''}",
                        html_content=html_content,
                        text_content=text_content,
                    )
                    emails_sent += 1
                except Exception as e:
                    current_app.logger.warning(f"Failed to send subscription expiring email to {user.email}: {e}")
        
        return success_response({
            "emails_sent": emails_sent,
            "message": f"Checked expiring subscriptions, sent {emails_sent} emails",
        })
    except Exception as exc:
        current_app.logger.exception("Failed to check expiring subscriptions: %s", exc)
        return internal_error_response(str(exc))

