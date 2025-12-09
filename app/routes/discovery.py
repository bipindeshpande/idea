"""Discovery routes blueprint - idea discovery endpoints."""
from flask import Blueprint, request, jsonify, current_app, Response, stream_with_context
from typing import Any, Dict, Iterator, Tuple
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
import json
import time

from openai import OpenAI

from app.models.database import db, User, UserSession, UserRun, utcnow
from app.utils import (
    PROFILE_FIELDS,
    get_current_session,
    require_auth,
    _validate_discovery_inputs,
)
from app.utils.validators import validate_text_field, sanitize_text
from app.utils.performance_metrics import (
    start_metrics_collection,
    finalize_metrics,
)
from app.services.unified_discovery_service import run_unified_discovery

bp = Blueprint("discovery", __name__)

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


@bp.post("/api/run")
@require_auth
@apply_rate_limit("5 per hour")
def run_crew() -> Any:
    """
    Run unified Discovery pipeline with pre-computed tools and single LLM call.
    
    Query params:
        stream: If 'true', returns Server-Sent Events stream (default: false)
    
    Returns:
        JSON response with outputs (or SSE stream if stream=true)
    """
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}

    # Define max lengths for each field based on validation matrix
    field_max_lengths = {
        "goal_type": 200,
        "time_commitment": 100,
        "budget_range": 200,
        "interest_area": 200,
        "sub_interest_area": 200,
        "work_style": 100,
        "skill_strength": 200,
        "experience_summary": 10000,
    }

    payload = {}
    for key in PROFILE_FIELDS:
        value = data.get(key)
        if value is not None:
            # Sanitize and validate each field
            value_str = str(value).strip()
            value_str = sanitize_text(value_str, max_length=field_max_lengths.get(key, 200))
            
            # Validate field length and content
            max_len = field_max_lengths.get(key, 200)
            is_valid, error_msg = validate_text_field(
                value_str,
                key.replace("_", " ").title(),
                required=False,
                max_length=max_len,
                allow_html=False
            )
            if not is_valid:
                return jsonify({
                    "success": False,
                    "error": error_msg,
                }), 400
            
            payload[key] = value_str
        else:
            payload[key] = ""

    # Set defaults for empty fields
    if not payload.get("goal_type"):
        payload["goal_type"] = "Extra Income"
    if not payload.get("time_commitment"):
        payload["time_commitment"] = "<5 hrs/week"
    if not payload.get("budget_range"):
        payload["budget_range"] = "Free / Sweat-equity only"
    if not payload.get("interest_area"):
        payload["interest_area"] = "AI / Automation"
    if not payload.get("sub_interest_area"):
        payload["sub_interest_area"] = "Chatbots"
    if not payload.get("work_style"):
        payload["work_style"] = "Solo"
    if not payload.get("skill_strength"):
        payload["skill_strength"] = "Analytical / Strategic"
    if not payload.get("experience_summary"):
        payload["experience_summary"] = "No detailed experience summary provided."

    try:
        session = get_current_session()
        user = session.user if session else None
        
        # Check usage limits for authenticated users
        if user:
            can_discover, error_message = user.can_perform_discovery()
            if not can_discover:
                return jsonify({
                    "success": False,
                    "error": error_message,
                    "usage_limit_reached": True,
                    "upgrade_required": True,
                }), 403
            
            # PART A: Pass founder_psychology into Discovery pipeline
            # Ensure the value is always a dict
            founder_psychology = {}
            if hasattr(user, 'founder_psychology') and user.founder_psychology:
                if isinstance(user.founder_psychology, dict):
                    founder_psychology = user.founder_psychology
                elif isinstance(user.founder_psychology, str):
                    # If stored as JSON string, parse it
                    import json as json_lib
                    try:
                        founder_psychology = json_lib.loads(user.founder_psychology)
                        if not isinstance(founder_psychology, dict):
                            founder_psychology = {}
                    except (json_lib.JSONDecodeError, TypeError):
                        founder_psychology = {}
            
            payload["founder_psychology"] = founder_psychology
        else:
            # Anonymous user - empty dict
            payload["founder_psychology"] = {}
        
        current_app.logger.info("Starting unified Discovery with inputs: %s", payload)
        
        # Initialize timing logger
        try:
            from app.utils.timing_logger import init_timing_logger
            init_timing_logger()  # Uses default docs/timing_logs.json
        except ImportError:
            pass
        
        # Start performance metrics collection
        discovery_start_time = time.time()
        run_id_for_metrics = f"{int(time.time())}_{user.id if user else 'anonymous'}"
        metrics = start_metrics_collection(run_id=run_id_for_metrics)
        
        # Validate inputs for weird/incompatible combinations
        validation_error = _validate_discovery_inputs(payload)
        if validation_error:
            return jsonify({
                "success": False,
                "error": validation_error,
                "error_type": "invalid_input",
            }), 400
        
        # Check if streaming is requested
        stream_requested = request.args.get('stream', 'false').lower() == 'true'
        
        # Check for cache bypass (debugging)
        cache_bypass = request.args.get('cache_bypass', 'false').lower() == 'true'
        
        # Run unified Discovery pipeline
        try:
            # If streaming requested, handle streaming path
            if stream_requested:
                return _stream_discovery_response_live(
                    run_unified_discovery(
                        profile_data=payload, 
                        use_cache=True, 
                        stream=True,
                        cache_bypass=cache_bypass
                    ),
                    payload, user, session, discovery_start_time
                )
            
            # Non-streaming path
            # run_unified_discovery returns a tuple (outputs, metadata) when stream=False
            outputs, metadata = run_unified_discovery(
                profile_data=payload,
                use_cache=True,
                stream=False,
                cache_bypass=cache_bypass,
            )
            
            # Ensure outputs is a dict with required keys
            if not isinstance(outputs, dict):
                current_app.logger.error(f"Outputs is not a dict: {type(outputs)}, value: {outputs}")
                outputs = {
                    "profile_analysis": "",
                    "startup_ideas_research": "",
                    "personalized_recommendations": "",
                }
            
            # Ensure all required keys exist
            required_keys = ["profile_analysis", "startup_ideas_research", "personalized_recommendations"]
            for key in required_keys:
                if key not in outputs:
                    outputs[key] = ""
            
        except ValueError as e:
            # Handle validation errors from _validate_profile_data
            elapsed = time.time() - discovery_start_time
            error_msg = str(e)
            current_app.logger.error(f"Discovery validation error after {elapsed:.2f} seconds: {error_msg}")
            return jsonify({
                "success": False,
                "error": f"Invalid input: {error_msg}",
                "error_type": "validation_error",
            }), 422
        except TimeoutError as e:
            elapsed = time.time() - discovery_start_time
            current_app.logger.error(f"Discovery timed out after {elapsed:.2f} seconds for user {user.id if user else 'anonymous'}")
            raise
        except Exception as e:
            elapsed = time.time() - discovery_start_time
            current_app.logger.error(f"Discovery failed after {elapsed:.2f} seconds: {e}", exc_info=True)
            # Return error response instead of raising to prevent 500
            return jsonify({
                "success": False,
                "error": f"We encountered an issue generating your recommendations. The analysis is taking longer than expected. Please try again with simpler inputs, or contact support if the issue persists.",
                "error_type": "internal_error",
                "error_details": str(e) if current_app.debug else None,
            }), 500
        
        # Check if we got valid results
        has_results = False
        results_summary = {}
        
        # Ensure outputs is a dict
        if not isinstance(outputs, dict):
            current_app.logger.error(f"Outputs is not a dict: {type(outputs)}, value: {outputs}")
            outputs = {
                "profile_analysis": "",
                "startup_ideas_research": "",
                "personalized_recommendations": "",
            }
        
        if outputs.get("profile_analysis"):
            profile_content = outputs["profile_analysis"].strip()
            if len(profile_content) > 100:  # Meaningful content
                has_results = True
                results_summary["profile_analysis"] = True
        
        if outputs.get("startup_ideas_research"):
            research_content = outputs["startup_ideas_research"].strip()
            if len(research_content) > 200:  # Meaningful content
                has_results = True
                results_summary["startup_ideas_research"] = True
        
        if outputs.get("personalized_recommendations"):
            rec_content = outputs["personalized_recommendations"].strip()
            if len(rec_content) > 200:  # Meaningful content
                has_results = True
                results_summary["personalized_recommendations"] = True
        
        # If no valid results, return error
        if not has_results:
            current_app.logger.warning(
                f"No valid results generated for user {user.id if user else 'anonymous'}. "
                f"Outputs summary: {results_summary}. "
                f"Outputs keys: {list(outputs.keys()) if isinstance(outputs, dict) else 'not a dict'}. "
                f"Outputs lengths: {[len(str(v)) for v in outputs.values()] if isinstance(outputs, dict) else 'N/A'}"
            )
            return jsonify({
                "success": False,
                "error": "We couldn't generate any valid recommendations based on your inputs. Please try adjusting your preferences, interests, or constraints and try again.",
                "error_type": "no_results",
                "suggestion": "Try providing more detailed information about your interests, skills, or goals. You can also adjust your time commitment, budget, or work style preferences.",
            }), 422  # 422 Unprocessable Entity - valid request but couldn't process
        
        # Finalize performance metrics
        total_duration = time.time() - discovery_start_time
        final_metrics = finalize_metrics(total_duration)
        
        # Generate and log performance report
        if final_metrics:
            report = final_metrics.generate_report()
            current_app.logger.info("Discovery Performance Report:\n%s", report)
        
        # Save to database if user is authenticated
        run_id = None
        if user:
            run_id = f"run_{int(time.time())}_{user.id}"
            user_run = UserRun(
                user_id=user.id,
                run_id=run_id,
                inputs=json.dumps(payload),
                reports=json.dumps(outputs),
            )
            db.session.add(user_run)
            # Increment usage counter
            user.increment_discovery_usage()
            # Refresh session activity after long operation completes
            if session:
                session.last_activity = utcnow()
            db.session.commit()

        response = {
            "success": True,
            "run_id": run_id,
            "inputs": payload,
            "outputs": outputs,
        }
        
        # Include performance metrics in response (for debugging/analysis)
        if metadata:
            response["performance_metrics"] = {
                "total_duration_seconds": round(metadata.get("total_time", total_duration), 2),
                "tool_precompute_time": round(metadata.get("tool_precompute_time", 0), 2),
                "llm_time": round(metadata.get("llm_time", 0), 2),
                "cache_hit": metadata.get("cache_hit", False),
            }
        
        return jsonify(response)
    except Exception as exc:  # pylint: disable=broad-except
        import traceback
        import re
        error_traceback = traceback.format_exc()
        current_app.logger.exception("Discovery run failed: %s", exc)
        current_app.logger.error("Full traceback:\n%s", error_traceback)
        
        # Sanitize error message to remove file paths and technical details
        error_message = str(exc)
        
        # Remove file paths (Windows and Unix style)
        error_message = re.sub(r'[A-Za-z]:\\[^\s]+|/[^\s]+\.(py|md|json|yaml|yml)', '[file path]', error_message)
        error_message = re.sub(r'C:\\Users\\[^\\]+\\[^\s]+|/tmp/[^\s]+|/var/[^\s]+', '[file path]', error_message)
        
        # Remove UUIDs and timestamps that might appear in file paths
        error_message = re.sub(r'[a-f0-9]{8,}_\d+_[^\s]+', '[temp file]', error_message)
        
        # Provide user-friendly error message
        user_error = "We encountered an issue generating your recommendations. "
        
        # Add specific guidance based on error type
        error_type = type(exc).__name__
        if "validation" in error_type.lower() or "validation" in error_message.lower():
            user_error += "Please check your inputs and try again."
        elif "timeout" in error_type.lower() or "timeout" in error_message.lower() or "time" in error_message.lower():
            user_error += "The analysis is taking longer than expected. Please try again with simpler inputs, or contact support if the issue persists."
        elif "openai" in error_message.lower() or "api" in error_message.lower():
            user_error += "We're experiencing issues with our AI service. Please try again in a few minutes."
        elif "database" in error_message.lower() or "db" in error_message.lower():
            user_error += "We're experiencing a temporary service issue. Please try again shortly."
        else:
            user_error += "Please try again, or contact support if the issue persists."
        
        return (
            jsonify(
                {
                    "success": False,
                    "error": user_error,
                    "error_type": error_type,
                }
            ),
            500,
        )


def _stream_discovery_response_live(
    chunk_iterator: Iterator[Tuple[str, Dict[str, Any]]],
    payload: Dict[str, Any],
    user: User,
    session: UserSession,
    start_time: float,
) -> Response:
    """
    Stream Discovery response as Server-Sent Events (SSE) with TRUE real-time streaming.
    
    Chunks are streamed immediately as they arrive from OpenAI, not buffered.
    
    Args:
        chunk_iterator: Iterator yielding (chunk, metadata) tuples from run_unified_discovery
        payload: Input payload
        user: User object
        session: User session
        start_time: Start timestamp
    
    Returns:
        Flask Response with SSE stream
    """
    def generate():
        """Generate SSE stream chunks from live iterator - TRUE streaming."""
        # Send initial metadata
        run_id = f"run_{int(time.time())}_{user.id}" if user else None
        yield f"data: {json.dumps({'event': 'start', 'run_id': run_id})}\n\n"
        
        # Track full response for post-processing
        full_response = ""
        metadata = {}
        outputs = None
        
        try:
            # Stream chunks immediately as they arrive (TRUE streaming)
            for chunk, chunk_metadata in chunk_iterator:
                # Check if this is the final metadata message
                if chunk is None and chunk_metadata.get("final"):
                    # Final message with outputs for post-processing
                    outputs = chunk_metadata.get("outputs")
                    metadata = chunk_metadata.get("metadata", {})
                    break
                
                # Handle special events
                if chunk == "__HEARTBEAT__":
                    yield f"data: {json.dumps({'event': 'heartbeat', 'metadata': chunk_metadata})}\n\n"
                    continue
                
                if isinstance(chunk, str) and chunk.startswith("__TOOL_COMPLETE__:"):
                    tool_name = chunk.split(":", 1)[1]
                    yield f"data: {json.dumps({'event': 'tool_complete', 'tool': tool_name})}\n\n"
                    continue
                
                # Regular chunk - accumulate and stream immediately
                if chunk:
                    full_response += chunk
                    metadata = chunk_metadata
                    
                    # Yield chunk immediately as SSE event (TRUE streaming, no buffering > 200ms)
                    yield f"data: {json.dumps({'event': 'delta', 'text': chunk})}\n\n"
        
        except Exception as e:
            # Log structured error
            error_info = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "timestamp": time.time(),
            }
            current_app.logger.error(
                f"Error during streaming: {json.dumps(error_info)}",
                exc_info=True
            )
            # Send SSE error event immediately
            yield f"data: {json.dumps({'event': 'error', 'error': str(e), 'error_type': type(e).__name__})}\n\n"
            return
        
        # Post-processing: Parse, save, and send completion
        # If outputs weren't provided in final message, parse from full_response
        if not outputs:
            from app.services.unified_discovery_service import parse_unified_response
            outputs = parse_unified_response(full_response)
        
        # Save to database
        if user and outputs:
            try:
                user_run = UserRun(
                    user_id=user.id,
                    run_id=run_id,
                    inputs=json.dumps(payload),
                    reports=json.dumps(outputs),
                )
                db.session.add(user_run)
                user.increment_discovery_usage()
                if session:
                    session.last_activity = utcnow()
                db.session.commit()
            except Exception as e:
                current_app.logger.warning(f"Failed to save run during streaming: {e}")
        
        # Send completion event
        total_time = time.time() - start_time
        yield f"data: {json.dumps({'event': 'done', 'total_time': round(total_time, 2), 'metadata': metadata})}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',  # Disable nginx buffering
        }
    )


@bp.post("/api/enhance-report")
@require_auth
def enhance_report() -> Any:
    """Generate enhanced analysis (financial insights, risk radar, competitive analysis, etc.) in parallel."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    run_id = data.get("run_id")
    
    if not run_id:
        return jsonify({"success": False, "error": "run_id required"}), 400
    
    # Get the run data
    user_run = UserRun.query.filter_by(run_id=run_id, user_id=user.id).first()
    if not user_run:
        return jsonify({"success": False, "error": "Run not found"}), 404
    
    try:
        # Parse inputs and reports
        inputs = json.loads(user_run.inputs) if isinstance(user_run.inputs, str) else user_run.inputs
        reports = json.loads(user_run.reports) if isinstance(user_run.reports, str) else user_run.reports
        
        # Get top idea from recommendations
        recommendations = reports.get("personalized_recommendations", "")
        top_idea = ""
        if recommendations:
            # Extract first idea from recommendations
            import re
            match = re.search(r'1\.\s+\*\*([^*]+)\*\*', recommendations)
            if match:
                top_idea = match.group(1)
        
        # If no top idea found, use a default
        if not top_idea:
            top_idea = f"{inputs.get('goal_type', 'Startup idea')} in {inputs.get('interest_area', 'your interest area')}"
        
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        
        # Define enhancement functions
        def get_enhanced_financial():
            """Get enhanced financial insights with unit economics."""
            prompt = f"""Analyze this startup idea and provide detailed financial insights with unit economics.

Idea: {top_idea}
User Budget: {inputs.get('budget_range', 'Not specified')}
User Time: {inputs.get('time_commitment', 'Not specified')}
User Skills: {inputs.get('skill_strength', 'Not specified')}

Provide:
- Specific startup costs (not ranges)
- Revenue projections (months 1-6)
- Unit economics: CAC, LTV, LTV:CAC ratio, payback period
- Break-even timeline
- Cash flow projections (first 6 months)
- Funding requirements

Format as structured JSON."""
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a startup financial advisor. Provide specific numbers, not ranges."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )
            return {"type": "financial", "content": response.choices[0].message.content, "tokens": response.usage.total_tokens}
        
        def get_enhanced_risk_radar():
            """Get enhanced risk radar with specific risks."""
            prompt = f"""Analyze this startup idea and provide specific risk radar.

Idea: {top_idea}
User Budget: {inputs.get('budget_range', 'Not specified')}
User Time: {inputs.get('time_commitment', 'Not specified')}
User Skills: {inputs.get('skill_strength', 'Not specified')}
Work Style: {inputs.get('work_style', 'Not specified')}

Provide 5-7 SPECIFIC risks (not generic like "market saturation" unless you explain HOW it impacts THIS idea):
- Risk name
- Severity (Low/Medium/High)
- Specific explanation tied to THIS idea and user constraints
- Concrete mitigation steps with specific tools/platforms

Format as JSON array."""
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a startup risk advisor. Provide specific risks tied to the idea, not generic ones."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )
            return {"type": "risk_radar", "content": response.choices[0].message.content, "tokens": response.usage.total_tokens}
        
        def get_competitive_analysis():
            """Get deep competitive analysis."""
            prompt = f"""Provide deep competitive analysis for: {top_idea}

Include:
- Direct competitor comparison
- Competitive positioning strategy
- Differentiation opportunities
- Market gaps competitors miss
- Pricing comparison

Format as structured analysis."""
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a competitive intelligence analyst."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1200
            )
            return {"type": "competitive", "content": response.choices[0].message.content, "tokens": response.usage.total_tokens}
        
        def get_market_intelligence():
            """Get market intelligence and entry strategy."""
            prompt = f"""Provide market intelligence and entry strategy for: {top_idea}

Include:
- Market entry timing analysis
- Growth projections
- Market trends affecting the idea
- Target market prioritization
- Entry strategy recommendations

Format as structured analysis."""
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a market strategist."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1200
            )
            return {"type": "market", "content": response.choices[0].message.content, "tokens": response.usage.total_tokens}
        
        def get_success_metrics():
            """Get success metrics and KPIs."""
            prompt = f"""Define success metrics and KPIs for: {top_idea}

Provide KPIs for each phase:
- Days 0-30: Specific metrics
- Days 30-60: Specific metrics
- Days 60-90: Specific metrics

Include tracking methods and success criteria.

Format as structured JSON."""
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a startup metrics advisor."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            return {"type": "success_metrics", "content": response.choices[0].message.content, "tokens": response.usage.total_tokens}
        
        def get_tool_stack():
            """Get tool stack recommendations."""
            prompt = f"""Recommend specific tool stack for: {top_idea}

User Budget: {inputs.get('budget_range', 'Not specified')}
User Skills: {inputs.get('skill_strength', 'Not specified')}

Provide:
- Development tools
- Marketing tools
- Analytics tools
- Payment/transaction tools
- Cost estimates

Format as structured list."""
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a startup tools advisor."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=800
            )
            return {"type": "tool_stack", "content": response.choices[0].message.content, "tokens": response.usage.total_tokens}
        
        def get_validation_plan():
            """Get comprehensive validation plan."""
            prompt = f"""Create comprehensive validation plan for: {top_idea}

Include:
- Validation prioritization (what to test first)
- Test sequencing
- Minimum viable validation criteria
- Pivot signals
- Validation tools and methods

Format as structured plan."""
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a startup validation advisor."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            return {"type": "validation_plan", "content": response.choices[0].message.content, "tokens": response.usage.total_tokens}
        
        # Execute all enhancements in parallel
        current_app.logger.info("Starting parallel enhancement generation for run_id: %s", run_id)
        start_time = time.time()
        
        enhancements = {}
        total_tokens = 0
        
        with ThreadPoolExecutor(max_workers=7) as executor:
            futures = {
                executor.submit(get_enhanced_financial): "financial",
                executor.submit(get_enhanced_risk_radar): "risk_radar",
                executor.submit(get_competitive_analysis): "competitive",
                executor.submit(get_market_intelligence): "market",
                executor.submit(get_success_metrics): "success_metrics",
                executor.submit(get_tool_stack): "tool_stack",
                executor.submit(get_validation_plan): "validation_plan",
            }
            
            for future in as_completed(futures):
                section_name = futures[future]
                try:
                    result = future.result()
                    enhancements[section_name] = result["content"]
                    total_tokens += result["tokens"]
                    current_app.logger.info("Completed enhancement: %s (%d tokens)", section_name, result["tokens"])
                except Exception as exc:
                    current_app.logger.exception("Failed to generate %s: %s", section_name, exc)
                    enhancements[section_name] = None
        
        elapsed_time = time.time() - start_time
        current_app.logger.info("Enhancement generation completed in %.2f seconds, total tokens: %d", elapsed_time, total_tokens)
        
        return jsonify({
            "success": True,
            "run_id": run_id,
            "enhancements": enhancements,
            "metadata": {
                "generation_time": elapsed_time,
                "total_tokens": total_tokens,
            }
        })
        
    except Exception as exc:
        current_app.logger.exception("Failed to enhance report: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500

