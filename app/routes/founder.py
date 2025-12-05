"""Founder Connect routes blueprint - founder networking endpoints."""
from flask import Blueprint, request, current_app
from typing import Any, Dict, Optional
import json

from sqlalchemy import or_, and_
from sqlalchemy.orm import joinedload

from app.models.database import (
    db, User, UserRun, UserValidation, FounderProfile, IdeaListing, ConnectionRequest, ConnectionCreditLedger,
    ConnectionStatus, utcnow, normalize_datetime
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
    ErrorMessages,
)

bp = Blueprint("founder", __name__)

# Note: Rate limits will be applied after blueprint registration in api.py


def _get_or_create_founder_profile(user: User) -> FounderProfile:
    """Get existing founder profile or create a basic one."""
    profile = FounderProfile.query.filter_by(user_id=user.id).first()
    if not profile:
        profile = FounderProfile(
            user_id=user.id,
            is_active=True,
            is_public=True,
        )
        db.session.add(profile)
        db.session.commit()
    return profile


def _serialize_founder_profile(profile: FounderProfile, include_identity: bool = False) -> dict:
    """Serialize founder profile, optionally including identity information."""
    if include_identity:
        # Include full identity information (only for own profile or accepted connections)
        data = {
            "id": profile.id,
            "user_id": profile.user_id,
            "full_name": profile.full_name,
            "bio": profile.bio,
            "skills": safe_json_loads(profile.skills, default=[]),
            "experience_summary": profile.experience_summary,
            "location": profile.location,
            "linkedin_url": profile.linkedin_url,
            "website_url": profile.website_url,
            "email": profile.user.email if profile.user else None,
            "primary_skills": safe_json_loads(profile.primary_skills, default=[]),
            "industries_of_interest": safe_json_loads(profile.industries_of_interest, default=[]),
            "looking_for": profile.looking_for,
            "commitment_level": profile.commitment_level,
            "is_active": profile.is_active,
            "is_public": profile.is_public,
            "created_at": serialize_datetime(profile.created_at),
            "updated_at": serialize_datetime(profile.updated_at),
        }
    else:
        # Anonymized view for browsing - NO identity fields
        data = {
            "id": profile.id,  # Only profile ID, not user_id
            "primary_skills": safe_json_loads(profile.primary_skills, default=[]),
            "industries_of_interest": safe_json_loads(profile.industries_of_interest, default=[]),
            "looking_for": profile.looking_for,
            "commitment_level": profile.commitment_level,
            # DO NOT include: user_id, full_name, email, linkedin_url, website_url, location, bio, experience_summary
        }
    
    return data


def _serialize_idea_listing(listing: IdeaListing, include_full_details: bool = False) -> dict:
    """Serialize idea listing."""
    if include_full_details:
        # Full details for own listings
        data = {
            "id": listing.id,
            "founder_profile_id": listing.founder_profile_id,
            "source_type": listing.source_type,
            "source_id": listing.source_id,
            "title": listing.title,
            "industry": listing.industry,
            "stage": listing.stage,
            "skills_needed": safe_json_loads(listing.skills_needed, default=[]),
            "commitment_level": listing.commitment_level,
            "brief_description": listing.brief_description,
            "is_active": listing.is_active,
            "is_open_for_collaborators": listing.is_open_for_collaborators,
            "created_at": serialize_datetime(listing.created_at),
            "updated_at": serialize_datetime(listing.updated_at),
        }
    else:
        # Anonymized view for browsing - NO founder_profile_id or identity fields
        data = {
            "id": listing.id,
            "title": listing.title,
            "industry": listing.industry,
            "stage": listing.stage,
            "skills_needed": safe_json_loads(listing.skills_needed, default=[]),
            "commitment_level": listing.commitment_level,
            "brief_description": listing.brief_description,
            "created_at": serialize_datetime(listing.created_at),
            # Include anonymized founder info (no identity)
            "founder": {
                "primary_skills": safe_json_loads(listing.founder_profile.primary_skills, default=[]) if listing.founder_profile else [],
                "industries_of_interest": safe_json_loads(listing.founder_profile.industries_of_interest, default=[]) if listing.founder_profile else [],
                "looking_for": listing.founder_profile.looking_for if listing.founder_profile else None,
                "commitment_level": listing.founder_profile.commitment_level if listing.founder_profile else None,
            } if listing.founder_profile else None,
        }
        # DO NOT include: founder_profile_id, source_type, source_id (these could identify the user)
    
    return data


def _serialize_connection_request(request_obj: ConnectionRequest, viewer_profile_id: int) -> dict:
    """Serialize connection request, including identity if accepted and viewer is involved."""
    data = {
        "id": request_obj.id,
        "sender_id": request_obj.sender_id,
        "recipient_id": request_obj.recipient_id,
        "idea_listing_id": request_obj.idea_listing_id,
        "message": request_obj.message,
        "status": request_obj.status,
        "created_at": serialize_datetime(request_obj.created_at),
        "updated_at": serialize_datetime(request_obj.updated_at),
        "responded_at": serialize_datetime(request_obj.responded_at),
    }
    
    # Include identity if request is accepted and viewer is sender or recipient
    if request_obj.status == ConnectionStatus.ACCEPTED and viewer_profile_id in [request_obj.sender_id, request_obj.recipient_id]:
        if request_obj.sender_profile:
            data["sender"] = _serialize_founder_profile(request_obj.sender_profile, include_identity=True)
        if request_obj.recipient_profile:
            data["recipient"] = _serialize_founder_profile(request_obj.recipient_profile, include_identity=True)
    else:
        # Anonymized view
        if request_obj.sender_profile:
            data["sender"] = _serialize_founder_profile(request_obj.sender_profile, include_identity=False)
        if request_obj.recipient_profile:
            data["recipient"] = _serialize_founder_profile(request_obj.recipient_profile, include_identity=False)
    
    return data


@bp.get("/api/founder/profile")
@require_auth
def get_founder_profile() -> Any:
    """Get current user's founder profile."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    profile = FounderProfile.query.filter_by(user_id=user.id).first()
    
    if not profile:
        return not_found_response("Founder profile")
    
    return success_response({
        "profile": _serialize_founder_profile(profile, include_identity=True)
    })


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
    if "skills" in data:
        profile.skills = json.dumps(data.get("skills", [])) if data.get("skills") else None
    if "experience_summary" in data:
        profile.experience_summary = data.get("experience_summary", "").strip() or None
    if "location" in data:
        profile.location = data.get("location", "").strip() or None
    if "linkedin_url" in data:
        profile.linkedin_url = data.get("linkedin_url", "").strip() or None
    if "website_url" in data:
        profile.website_url = data.get("website_url", "").strip() or None
    if "primary_skills" in data:
        profile.primary_skills = json.dumps(data.get("primary_skills", [])) if data.get("primary_skills") else None
    if "industries_of_interest" in data:
        profile.industries_of_interest = json.dumps(data.get("industries_of_interest", [])) if data.get("industries_of_interest") else None
    if "looking_for" in data:
        profile.looking_for = data.get("looking_for", "").strip() or None
    if "commitment_level" in data:
        profile.commitment_level = data.get("commitment_level", "").strip() or None
    if "is_public" in data:
        profile.is_public = bool(data.get("is_public", True))
    
    profile.updated_at = utcnow()
    db.session.commit()
    
    return success_response({
        "profile": _serialize_founder_profile(profile, include_identity=True)
    })


@bp.put("/api/founder/profile")
@require_auth
def update_founder_profile() -> Any:
    """Update founder profile (same as POST, kept for RESTful consistency)."""
    return create_founder_profile()


@bp.get("/api/founder/ideas")
@require_auth
def get_my_idea_listings() -> Any:
    """Get current user's idea listings."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    profile = FounderProfile.query.filter_by(user_id=user.id).first()
    
    if not profile:
        return success_response({"listings": []})
    
    listings = IdeaListing.query.filter_by(founder_profile_id=profile.id).order_by(IdeaListing.created_at.desc()).all()
    
    return success_response({
        "listings": [_serialize_idea_listing(listing, include_full_details=True) for listing in listings]
    })


@bp.post("/api/founder/ideas")
@require_auth
def create_idea_listing() -> Any:
    """Create a new idea listing."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    # Ensure user has a founder profile
    profile = _get_or_create_founder_profile(user)
    
    # Validate required fields
    title = data.get("title", "").strip()
    source_type = data.get("source_type", "").strip()
    source_id = data.get("source_id")
    
    if not title:
        return error_response("title is required", 400)
    if not source_type or source_type not in ["validation", "advisor"]:
        return error_response("source_type must be 'validation' or 'advisor'", 400)
    if not source_id:
        return error_response("source_id is required", 400)
    
    # Verify source exists and belongs to user
    # source_id can be either database id (integer) or validation_id/run_id (string)
    resolved_source_id = None
    if source_type == "validation":
        validation = None
        # Try as database id first (integer)
        try:
            source_id_int = int(source_id)
            validation = UserValidation.query.filter_by(id=source_id_int, user_id=user.id, is_deleted=False).first()
        except (ValueError, TypeError):
            pass
        
        # If not found by id, try as validation_id string
        if not validation:
            validation = UserValidation.query.filter_by(validation_id=str(source_id), user_id=user.id, is_deleted=False).first()
        
        if not validation:
            return error_response("Validation not found or access denied", 404)
        # Use database id for the listing
        resolved_source_id = validation.id
    elif source_type == "advisor":
        run = None
        # Try as database id first (integer)
        try:
            source_id_int = int(source_id)
            run = UserRun.query.filter_by(id=source_id_int, user_id=user.id, is_deleted=False).first()
        except (ValueError, TypeError):
            pass
        
        # If not found by id, try as run_id string
        if not run:
            run = UserRun.query.filter_by(run_id=str(source_id), user_id=user.id, is_deleted=False).first()
        
        if not run:
            return error_response("Run not found or access denied", 404)
        # Use database id for the listing
        resolved_source_id = run.id
    else:
        return error_response("Invalid source_type", 400)
    
    # Check if listing already exists for this source (using the resolved database id)
    existing = IdeaListing.query.filter_by(
        founder_profile_id=profile.id,
        source_type=source_type,
        source_id=resolved_source_id  # Use resolved database id
    ).first()
    
    if existing:
        return error_response("Listing already exists for this source", 400)
    
    # Create listing
    listing = IdeaListing(
        founder_profile_id=profile.id,
        source_type=source_type,
        source_id=resolved_source_id,  # Use resolved database id
        title=title,
        industry=data.get("industry", "").strip() or None,
        stage=data.get("stage", "").strip() or None,
        skills_needed=json.dumps(data.get("skills_needed", [])) if data.get("skills_needed") else None,
        commitment_level=data.get("commitment_level", "").strip() or None,
        brief_description=data.get("brief_description", "").strip() or None,
        is_active=True,
        is_open_for_collaborators=True,
    )
    
    db.session.add(listing)
    db.session.commit()
    
    return success_response({
        "listing": _serialize_idea_listing(listing, include_full_details=True)
    })


@bp.get("/api/founder/ideas/browse")
@require_auth
def browse_idea_listings() -> Any:
    """Browse all active idea listings (anonymized)."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    # Get current user's profile to exclude their own listings
    user = session.user
    user_profile = FounderProfile.query.filter_by(user_id=user.id).first()
    user_profile_id = user_profile.id if user_profile else None
    
    # Pagination
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", DEFAULT_PAGE_SIZE, type=int), MAX_PAGE_SIZE)
    
    # Filters
    industry = request.args.get("industry")
    stage = request.args.get("stage")
    skills_needed = request.args.get("skills_needed")  # Comma-separated
    
    # Build query - only show active, non-deleted listings
    query = IdeaListing.query.filter(
        IdeaListing.is_active == True,
        IdeaListing.is_open_for_collaborators == True
    ).join(FounderProfile).filter(
        FounderProfile.is_active == True,
        FounderProfile.is_public == True
    )
    
    # Exclude user's own listings
    if user_profile_id:
        query = query.filter(IdeaListing.founder_profile_id != user_profile_id)
    
    # Apply filters
    if industry:
        query = query.filter(IdeaListing.industry == industry)
    if stage:
        query = query.filter(IdeaListing.stage == stage)
    
    # Order by newest first
    query = query.order_by(IdeaListing.created_at.desc())
    
    # Paginate
    total = query.count()
    listings = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return success_response({
        "listings": [_serialize_idea_listing(listing, include_full_details=False) for listing in listings],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page,
        }
    })


@bp.get("/api/founder/people/browse")
@require_auth
def browse_founder_profiles() -> Any:
    """Browse all active founder profiles (anonymized)."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    # Get current user's profile to exclude themselves
    user = session.user
    user_profile = FounderProfile.query.filter_by(user_id=user.id).first()
    user_profile_id = user_profile.id if user_profile else None
    
    # Pagination
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", DEFAULT_PAGE_SIZE, type=int), MAX_PAGE_SIZE)
    
    # Filters
    industry = request.args.get("industry")
    looking_for = request.args.get("looking_for")
    
    # Build query - only show active, public profiles
    query = FounderProfile.query.filter(
        FounderProfile.is_active == True,
        FounderProfile.is_public == True
    )
    
    # Exclude current user
    if user_profile_id:
        query = query.filter(FounderProfile.id != user_profile_id)
    
    # Apply filters (if needed - can be extended)
    # For now, just basic filtering
    
    # Order by newest first
    query = query.order_by(FounderProfile.created_at.desc())
    
    # Paginate
    total = query.count()
    profiles = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return success_response({
        "profiles": [_serialize_founder_profile(profile, include_identity=False) for profile in profiles],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page,
        }
    })


@bp.post("/api/founder/connect")
@require_auth
def send_connection_request() -> Any:
    """Send a connection request to another founder."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    # Get sender's profile
    sender_profile = _get_or_create_founder_profile(user)
    
    # Validate recipient - can be provided directly or via idea_listing_id
    recipient_profile_id = data.get("recipient_profile_id")
    idea_listing_id = data.get("idea_listing_id")
    
    # If idea_listing_id is provided, get recipient from listing
    if idea_listing_id:
        listing = IdeaListing.query.filter_by(
            id=idea_listing_id,
            is_active=True,
            is_open_for_collaborators=True
        ).first()
        if not listing:
            return error_response("Idea listing not found or not available for connections", 404)
        recipient_profile = listing.founder_profile
        if not recipient_profile or not recipient_profile.is_active:
            return error_response("Founder profile for this listing is not available", 404)
        recipient_profile_id = recipient_profile.id
    elif recipient_profile_id:
        # Direct recipient profile ID provided
        recipient_profile = FounderProfile.query.filter_by(id=recipient_profile_id, is_active=True).first()
        if not recipient_profile:
            return not_found_response("Recipient profile")
    else:
        return error_response("Either recipient_profile_id or idea_listing_id is required", 400)
    
    # Prevent self-connections
    if recipient_profile_id == sender_profile.id:
        return error_response("Cannot send connection request to yourself", 400)
    
    # Check if a pending request already exists (prevent duplicates)
    existing = ConnectionRequest.query.filter(
        and_(
            ConnectionRequest.sender_id == sender_profile.id,
            ConnectionRequest.recipient_id == recipient_profile_id,
            ConnectionRequest.status == ConnectionStatus.PENDING
        )
    ).first()
    
    if existing:
        return error_response("A pending connection request already exists between you and this founder", 400)
    
    # Check credit limits
    can_send, error_message = user.can_send_connection_request()
    if not can_send:
        return error_response(error_message, 403)
    
    # Create connection request
    connection_request = ConnectionRequest(
        sender_id=sender_profile.id,
        recipient_id=recipient_profile_id,
        idea_listing_id=idea_listing_id,
        message=data.get("message", "").strip() or None,
        status=ConnectionStatus.PENDING,
    )
    
    db.session.add(connection_request)
    
    # Capture credits before incrementing (for audit ledger)
    credits_before = user.monthly_connections_used
    
    # Increment usage (credits consumed on send, not on accept/decline)
    user.increment_connection_usage()
    
    # Optional: Record in credit ledger (audit only)
    try:
        ledger_entry = ConnectionCreditLedger(
            user_id=user.id,
            connection_request_id=connection_request.id,
            action="sent_request",
            credits_before=credits_before,
            credits_after=user.monthly_connections_used,
            subscription_type=user.subscription_type or "free",
        )
        db.session.add(ledger_entry)
    except Exception as e:
        current_app.logger.warning(f"Failed to create credit ledger entry: {e}")
        # Don't fail the request if ledger fails
    
    db.session.commit()
    
    return success_response({
        "connection_request": _serialize_connection_request(connection_request, sender_profile.id)
    })


@bp.get("/api/founder/connections")
@require_auth
def get_my_connections() -> Any:
    """Get all connection requests for current user (sent and received)."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    profile = FounderProfile.query.filter_by(user_id=user.id).first()
    
    if not profile:
        return success_response({
            "sent": [],
            "received": [],
        })
    
    # Get sent requests
    sent_requests = ConnectionRequest.query.filter_by(sender_id=profile.id).order_by(ConnectionRequest.created_at.desc()).all()
    
    # Get received requests
    received_requests = ConnectionRequest.query.filter_by(recipient_id=profile.id).order_by(ConnectionRequest.created_at.desc()).all()
    
    return success_response({
        "sent": [_serialize_connection_request(req, profile.id) for req in sent_requests],
        "received": [_serialize_connection_request(req, profile.id) for req in received_requests],
    })


@bp.put("/api/founder/connections/<int:connection_id>/respond")
@require_auth
def respond_to_connection_request(connection_id: int) -> Any:
    """Accept or decline a connection request."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    action = data.get("action", "").strip().lower()  # "accept" or "decline"
    
    if action not in ["accept", "decline"]:
        return error_response("action must be 'accept' or 'decline'", 400)
    
    # Get user's profile
    profile = FounderProfile.query.filter_by(user_id=user.id).first()
    if not profile:
        return not_found_response("Founder profile")
    
    # Get connection request
    connection_request = ConnectionRequest.query.filter_by(id=connection_id, recipient_id=profile.id).first()
    if not connection_request:
        return not_found_response("Connection request")
    
    if connection_request.status != ConnectionStatus.PENDING:
        return error_response("Connection request has already been responded to", 400)
    
    # Update status
    if action == "accept":
        connection_request.status = ConnectionStatus.ACCEPTED
    else:
        connection_request.status = ConnectionStatus.DECLINED
    
    connection_request.responded_at = utcnow()
    connection_request.updated_at = utcnow()
    
    db.session.commit()
    
    return success_response({
        "connection_request": _serialize_connection_request(connection_request, profile.id)
    })


@bp.get("/api/founder/connections/<int:connection_id>/detail")
@require_auth
def get_connection_detail(connection_id: int) -> Any:
    """Get detailed information about a specific connection request."""
    session = get_current_session()
    if not session:
        return unauthorized_response(ErrorMessages.NOT_AUTHENTICATED)
    
    user = session.user
    profile = FounderProfile.query.filter_by(user_id=user.id).first()
    
    if not profile:
        return not_found_response("Founder profile")
    
    # Get connection request (user must be sender or recipient)
    connection_request = ConnectionRequest.query.filter(
        ConnectionRequest.id == connection_id,
        or_(
            ConnectionRequest.sender_id == profile.id,
            ConnectionRequest.recipient_id == profile.id
        )
    ).first()
    
    if not connection_request:
        return not_found_response("Connection request")
    
    # Only reveal identity if status is accepted AND user is involved
    # The _serialize_connection_request function already handles this, but we double-check here
    if connection_request.status != ConnectionStatus.ACCEPTED:
        # For pending/declined, ensure no identity is included
        serialized = _serialize_connection_request(connection_request, profile.id)
        # Remove any identity fields that might have leaked
        if "sender" in serialized and "email" in serialized.get("sender", {}):
            serialized["sender"] = _serialize_founder_profile(connection_request.sender_profile, include_identity=False)
        if "recipient" in serialized and "email" in serialized.get("recipient", {}):
            serialized["recipient"] = _serialize_founder_profile(connection_request.recipient_profile, include_identity=False)
    else:
        # Status is accepted - identity reveal is allowed
        serialized = _serialize_connection_request(connection_request, profile.id)
    
    return success_response({
        "connection_request": serialized
    })

