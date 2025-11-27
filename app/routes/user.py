"""User management routes blueprint."""
from flask import Blueprint, request, jsonify, current_app
from typing import Any, Dict
from datetime import datetime, timedelta
from urllib.parse import unquote
import json

from app.models.database import db, User, UserSession, UserRun, UserValidation, UserAction, UserNote
from app.utils import get_current_session, require_auth
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
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    usage_stats = user.get_usage_stats()
    
    return jsonify({
        "success": True,
        "usage": usage_stats,
    })


@bp.get("/api/user/activity")
@require_auth
def get_user_activity() -> Any:
    """Get current user's activity (runs, validations)."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    
    try:
        # Get all runs (no limit for analytics)
        runs = UserRun.query.filter_by(user_id=user.id).order_by(UserRun.created_at.desc()).all()
        runs_data = []
        for r in runs:
            inputs_data = {}
            try:
                inputs_data = json.loads(r.inputs) if r.inputs else {}
            except (json.JSONDecodeError, TypeError) as e:
                current_app.logger.warning(f"Failed to parse inputs for run {r.run_id}: {e}")
                inputs_data = {}
            
            # Include reports data for idea counting
            reports_data = {}
            try:
                reports_data = json.loads(r.reports) if r.reports else {}
            except (json.JSONDecodeError, TypeError) as e:
                current_app.logger.warning(f"Failed to parse reports for run {r.run_id}: {e}")
                reports_data = {}
            
            runs_data.append({
                "id": r.id,
                "run_id": r.run_id,
                "inputs": inputs_data,
                "reports": reports_data,  # Include reports so frontend can count ideas
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })
        
        # Get all validations (no limit for analytics)
        validations = UserValidation.query.filter_by(user_id=user.id).order_by(UserValidation.created_at.desc()).all()
        validations_data = []
        for v in validations:
            validation_result = {}
            try:
                validation_result = json.loads(v.validation_result) if v.validation_result else {}
            except:
                pass
            
            validations_data.append({
                "id": v.id,
                "validation_id": v.validation_id,
                "overall_score": validation_result.get("overall_score"),
                "idea_explanation": v.idea_explanation,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            })
        
        return jsonify({
            "success": True,
            "activity": {
                "runs": runs_data,
                "validations": validations_data,
                "total_runs": len(runs_data),
                "total_validations": len(validations_data),
            },
        })
    except Exception as exc:
        current_app.logger.exception("Failed to get user activity: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.get("/api/user/run/<path:run_id>")
@require_auth
def get_user_run(run_id: str) -> Any:
    """Get a specific user's run data including inputs and reports."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
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
            return jsonify({"success": False, "error": "Database connection error"}), 500
        
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
                return jsonify({"success": False, "error": "Database query error"}), 500
        
        # If not found, try with original run_id (in case it's stored with prefix)
        if not user_run:
            try:
                user_run = UserRun.query.filter_by(user_id=user.id, run_id=run_id).first()
            except Exception as query_error:
                current_app.logger.exception("Database query error (fallback) in get_user_run: run_id=%s, error=%s", run_id, query_error)
                db.session.rollback()
                return jsonify({"success": False, "error": "Database query error"}), 500
        
        if not user_run:
            current_app.logger.warning(f"Run not found: user_id={user.id}, run_id={run_id}, normalized={normalized_run_id}")
            return jsonify({"success": False, "error": "Run not found"}), 404
        
        # Parse inputs and reports from JSON strings (optimized with better error handling)
        inputs = {}
        reports = {}
        
        if user_run.inputs:
            try:
                if isinstance(user_run.inputs, str):
                    inputs = json.loads(user_run.inputs)
                else:
                    inputs = user_run.inputs
            except (json.JSONDecodeError, TypeError) as e:
                current_app.logger.warning(f"Failed to parse inputs for run {run_id}: {e}")
                inputs = {}
        
        if user_run.reports:
            try:
                if isinstance(user_run.reports, str):
                    reports = json.loads(user_run.reports)
                else:
                    reports = user_run.reports
            except (json.JSONDecodeError, TypeError) as e:
                current_app.logger.warning(f"Failed to parse reports for run {run_id}: {e}")
                reports = {}
        
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
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    
    try:
        # Find the run and verify it belongs to the user
        user_run = UserRun.query.filter_by(user_id=user.id, run_id=run_id).first()
        if not user_run:
            return jsonify({"success": False, "error": "Run not found"}), 404
        
        # Delete the run
        db.session.delete(user_run)
        db.session.commit()
        
        return jsonify({"success": True, "message": "Run deleted successfully"})
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to delete user run: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.get("/api/user/actions")
@require_auth
def get_user_actions() -> Any:
    """Get all action items for the current user."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    idea_id = request.args.get("idea_id")  # Optional filter by idea
    
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
                "due_date": action.due_date.isoformat() if action.due_date else None,
                "completed_at": action.completed_at.isoformat() if action.completed_at else None,
                "created_at": action.created_at.isoformat() if action.created_at else None,
                "updated_at": action.updated_at.isoformat() if action.updated_at else None,
            })
        
        return jsonify({"success": True, "actions": actions_data})
    except Exception as exc:
        current_app.logger.exception("Failed to get user actions: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.post("/api/user/actions")
@require_auth
def create_user_action() -> Any:
    """Create a new action item."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    action_text = data.get("action_text", "").strip()
    idea_id = data.get("idea_id", "").strip()
    status = data.get("status", "pending")
    due_date_str = data.get("due_date")
    
    if not action_text or not idea_id:
        return jsonify({"success": False, "error": "action_text and idea_id are required"}), 400
    
    # Validate input lengths
    if len(action_text) > 1000:
        return jsonify({"success": False, "error": "action_text must be 1000 characters or less"}), 400
    
    if len(idea_id) > 255:
        return jsonify({"success": False, "error": "idea_id must be 255 characters or less"}), 400
    
    # Validate status
    allowed_statuses = ["pending", "in_progress", "completed", "blocked"]
    if status not in allowed_statuses:
        return jsonify({"success": False, "error": f"status must be one of: {', '.join(allowed_statuses)}"}), 400
    
    try:
        due_date = None
        if due_date_str:
            try:
                # Handle both Z and +00:00 timezone formats
                date_str = due_date_str.replace("Z", "+00:00")
                due_date = datetime.fromisoformat(date_str)
            except (ValueError, AttributeError) as e:
                current_app.logger.warning(f"Invalid date format: {due_date_str}, error: {e}")
                return jsonify({"success": False, "error": f"Invalid date format: {due_date_str}"}), 400
        
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
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.put("/api/user/actions/<int:action_id>")
@require_auth
def update_user_action(action_id: int) -> Any:
    """Update an action item."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    try:
        action = UserAction.query.filter_by(id=action_id, user_id=user.id).first()
        if not action:
            return jsonify({"success": False, "error": "Action not found"}), 404
        
        if "action_text" in data:
            action_text = data["action_text"].strip()
            if len(action_text) > 1000:
                return jsonify({"success": False, "error": "action_text must be 1000 characters or less"}), 400
            action.action_text = action_text
        if "status" in data:
            allowed_statuses = ["pending", "in_progress", "completed", "blocked"]
            if data["status"] not in allowed_statuses:
                return jsonify({"success": False, "error": f"status must be one of: {', '.join(allowed_statuses)}"}), 400
            action.status = data["status"]
            if data["status"] == "completed" and not action.completed_at:
                action.completed_at = datetime.utcnow()
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
                    return jsonify({"success": False, "error": f"Invalid date format: {due_date_str}"}), 400
            else:
                action.due_date = None
        
        action.updated_at = datetime.utcnow()
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
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.delete("/api/user/actions/<int:action_id>")
@require_auth
def delete_user_action(action_id: int) -> Any:
    """Delete an action item."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    
    try:
        action = UserAction.query.filter_by(id=action_id, user_id=user.id).first()
        if not action:
            return jsonify({"success": False, "error": "Action not found"}), 404
        
        db.session.delete(action)
        db.session.commit()
        
        return jsonify({"success": True})
    except Exception as exc:
        db.session.rollback()
        current_app.logger.exception("Failed to delete action: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.get("/api/user/notes")
@require_auth
def get_user_notes() -> Any:
    """Get all notes for the current user."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    idea_id = request.args.get("idea_id")  # Optional filter by idea
    
    try:
        query = UserNote.query.filter_by(user_id=user.id)
        if idea_id:
            query = query.filter_by(idea_id=idea_id)
        
        notes = query.order_by(UserNote.updated_at.desc()).all()
        notes_data = []
        for note in notes:
            tags = []
            try:
                tags = json.loads(note.tags) if note.tags else []
            except:
                pass
            
            notes_data.append({
                "id": note.id,
                "idea_id": note.idea_id,
                "content": note.content,
                "tags": tags,
                "created_at": note.created_at.isoformat() if note.created_at else None,
                "updated_at": note.updated_at.isoformat() if note.updated_at else None,
            })
        
        return jsonify({"success": True, "notes": notes_data})
    except Exception as exc:
        current_app.logger.exception("Failed to get user notes: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.post("/api/user/notes")
@require_auth
def create_user_note() -> Any:
    """Create a new note."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    content = data.get("content", "").strip()
    idea_id = data.get("idea_id", "").strip()
    tags = data.get("tags", [])
    
    if not content or not idea_id:
        return jsonify({"success": False, "error": "content and idea_id are required"}), 400
    
    # Validate input lengths
    if len(content) > 10000:
        return jsonify({"success": False, "error": "content must be 10000 characters or less"}), 400
    
    if len(idea_id) > 255:
        return jsonify({"success": False, "error": "idea_id must be 255 characters or less"}), 400
    
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
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.put("/api/user/notes/<int:note_id>")
@require_auth
def update_user_note(note_id: int) -> Any:
    """Update a note."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
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
        
        note.updated_at = datetime.utcnow()
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
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.delete("/api/user/notes/<int:note_id>")
@require_auth
def delete_user_note(note_id: int) -> Any:
    """Delete a note."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
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
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.post("/api/user/compare-sessions")
@require_auth
def compare_sessions() -> Any:
    """Compare multiple sessions (runs or validations) side-by-side."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
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
        
        # Fetch runs
        for run_id in run_ids:
            run = UserRun.query.filter_by(user_id=user.id, run_id=run_id).first()
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
        
        # Fetch validations
        for validation_id in validation_ids:
            validation = UserValidation.query.filter_by(user_id=user.id, validation_id=validation_id).first()
            if validation:
                category_answers = {}
                validation_result = {}
                try:
                    category_answers = json.loads(validation.category_answers) if validation.category_answers else {}
                    validation_result = json.loads(validation.validation_result) if validation.validation_result else {}
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
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.get("/api/user/smart-recommendations")
@require_auth
def get_smart_recommendations() -> Any:
    """Get smart recommendations based on user's validation history."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    
    try:
        # Get all validations
        validations = UserValidation.query.filter_by(user_id=user.id).order_by(UserValidation.created_at.desc()).all()
        
        if len(validations) < 2:
            return jsonify({
                "success": True,
                "insights": {
                    "message": "Complete at least 2 validations to get personalized insights",
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
                validation_result = json.loads(validation.validation_result) if validation.validation_result else {}
                scores = validation_result.get("scores", {})
                
                # Track category scores
                for category, score in scores.items():
                    if category not in category_scores:
                        category_scores[category] = []
                    category_scores[category].append(score)
                
                # Track interest areas from idea explanation
                if validation.idea_explanation:
                    # Simple keyword extraction (can be improved)
                    idea_lower = validation.idea_explanation.lower()
                    if "ai" in idea_lower or "artificial intelligence" in idea_lower:
                        interest_areas.append("AI/ML")
                    elif "saas" in idea_lower or "software" in idea_lower:
                        interest_areas.append("SaaS")
                    elif "ecommerce" in idea_lower or "e-commerce" in idea_lower:
                        interest_areas.append("E-commerce")
                    elif "fintech" in idea_lower or "finance" in idea_lower:
                        interest_areas.append("Fintech")
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
            for validation in validations[:10]:  # Last 10 validations
                try:
                    validation_result = json.loads(validation.validation_result) if validation.validation_result else {}
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
            high_scoring = [v for v in validation_scores if v["score"] >= 7.5]
            if high_scoring:
                similar_ideas = high_scoring[:3]
        
        return jsonify({
            "success": True,
            "insights": {
                "patterns": patterns,
                "similar_ideas": similar_ideas,
                "total_validations": len(validations),
                "interest_areas": list(set(interest_areas))[:5] if interest_areas else [],
                "message": None,  # No message when we have insights
            },
        })
    except Exception as exc:
        current_app.logger.exception("Failed to get smart recommendations: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@bp.post("/api/emails/check-expiring")
def check_expiring_subscriptions() -> Any:
    """Check and send emails for expiring trials/subscriptions (can be called by cron job)."""
    try:
        now = datetime.utcnow()
        emails_sent = 0
        
        # Check trial users expiring in 1 day
        trial_expiring = User.query.filter(
            User.subscription_type == "free_trial",
            User.subscription_expires_at <= now + timedelta(days=1),
            User.subscription_expires_at > now,
        ).all()
        
        for user in trial_expiring:
            days_remaining = (user.subscription_expires_at - now).days
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
        
        # Check paid subscriptions expiring in 3 days
        paid_expiring = User.query.filter(
            User.subscription_type.in_(["starter", "pro", "weekly"]),
            User.payment_status == "active",
            User.subscription_expires_at <= now + timedelta(days=3),
            User.subscription_expires_at > now,
        ).all()
        
        for user in paid_expiring:
            days_remaining = (user.subscription_expires_at - now).days
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
        
        return jsonify({
            "success": True,
            "emails_sent": emails_sent,
            "message": f"Checked expiring subscriptions, sent {emails_sent} emails",
        })
    except Exception as exc:
        current_app.logger.exception("Failed to check expiring subscriptions: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500

