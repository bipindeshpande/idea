"""Discovery routes blueprint - idea discovery endpoints."""
from flask import Blueprint, request, jsonify, current_app
from typing import Any, Dict
from datetime import datetime, timezone
import os
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from openai import OpenAI
from startup_idea_crew.crew import StartupIdeaCrew
from app.models.database import db, User, UserSession, UserRun, utcnow
from app.utils import (
    PROFILE_FIELDS,
    read_output_file as _read_output_file,
    get_current_session,
    require_auth,
    _validate_discovery_inputs,
)
from app.utils.output_manager import archive_existing_outputs, cleanup_old_temp_files

bp = Blueprint("discovery", __name__)

# Note: Rate limits will be applied after blueprint registration in api.py


@bp.post("/api/run")
@require_auth
def run_crew() -> Any:
    """Run the Startup Idea Crew with provided inputs."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}

    payload = {
        key: str(data.get(key, "")).strip() if data.get(key) is not None else ""
        for key in PROFILE_FIELDS
    }

    if not payload["goal_type"]:
        payload["goal_type"] = "Extra Income"
    if not payload["time_commitment"]:
        payload["time_commitment"] = "<5 hrs/week"
    if not payload["budget_range"]:
        payload["budget_range"] = "Free / Sweat-equity only"
    if not payload["interest_area"]:
        payload["interest_area"] = "AI / Automation"
    if not payload["sub_interest_area"]:
        payload["sub_interest_area"] = "Chatbots"
    if not payload["work_style"]:
        payload["work_style"] = "Solo"
    if not payload["skill_strength"]:
        payload["skill_strength"] = "Analytical / Strategic"
    if not payload["experience_summary"]:
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
        
        current_app.logger.info("Starting crew run with inputs: %s", payload)
        
        # Validate inputs for weird/incompatible combinations
        validation_error = _validate_discovery_inputs(payload)
        if validation_error:
            return jsonify({
                "success": False,
                "error": validation_error,
                "error_type": "invalid_input",
            }), 400
        
        # Use Python's tempfile module for robust file handling with 1000+ concurrent users
        import uuid
        import tempfile
        from pathlib import Path
        
        # Generate unique run ID
        run_file_id = f"{uuid.uuid4().hex[:12]}_{int(time.time())}"
        
        # Use system temp directory (better for high concurrency) with unique prefix
        temp_output_dir = Path(tempfile.gettempdir()) / "idea_crew_outputs"
        temp_output_dir.mkdir(parents=True, exist_ok=True, mode=0o700)  # Secure permissions
        
        # Create unique temp files using tempfile (OS-managed, auto-cleanup on system restart)
        temp_files = {}
        output_file_map = {}
        
        try:
            # Map each output to a unique temp file
            file_mappings = {
                'output/profile_analysis.md': 'profile_analysis.md',
                'output/startup_ideas_research.md': 'startup_ideas_research.md',
                'output/personalized_recommendations.md': 'personalized_recommendations.md',
            }
            
            for original_path, filename in file_mappings.items():
                # Create unique temp file with prefix
                temp_file_path = temp_output_dir / f"{run_file_id}_{filename}"
                output_file_map[original_path] = str(temp_file_path)
                temp_files[filename] = temp_file_path
            
            # Create crew and override output_file in tasks
            from startup_idea_crew.crew import StartupIdeaCrew
            crew_instance = StartupIdeaCrew()
            crew = crew_instance.crew()
            
            # Override output_file in tasks to use unique temp files
            for task in crew.tasks:
                if hasattr(task, 'output_file') and task.output_file:
                    if task.output_file in output_file_map:
                        task.output_file = output_file_map[task.output_file]
            
            result = crew.kickoff(inputs=payload)

            # Read from temp files with retry logic for high concurrency scenarios
            outputs = {}
            max_retries = 3
            for filename, temp_file_path in temp_files.items():
                content = None
                for attempt in range(max_retries):
                    try:
                        if temp_file_path.exists():
                            content = temp_file_path.read_text(encoding='utf-8')
                            break
                        else:
                            # File might not be ready yet (task just finished)
                            time.sleep(0.1 * (attempt + 1))  # Progressive backoff
                    except (OSError, IOError) as e:
                        if attempt < max_retries - 1:
                            time.sleep(0.1 * (attempt + 1))
                        else:
                            current_app.logger.warning(f"Failed to read {filename} after {max_retries} attempts: {e}")
                
                # Map to expected output keys
                if filename == 'profile_analysis.md':
                    outputs["profile_analysis"] = content or ""
                elif filename == 'startup_ideas_research.md':
                    outputs["startup_ideas_research"] = content or ""
                elif filename == 'personalized_recommendations.md':
                    outputs["personalized_recommendations"] = content or ""
            
        finally:
            # Always cleanup temp files, even on errors (prevents disk space issues)
            cleanup_files = list(temp_files.values())
            for temp_file_path in cleanup_files:
                try:
                    if temp_file_path.exists():
                        temp_file_path.unlink()
                except Exception as e:
                    # Log but don't fail - background cleanup will handle it
                    current_app.logger.debug(f"Cleanup deferred for {temp_file_path.name}: {e}")
            
            # Periodic cleanup of old orphaned files (runs every 100 requests to avoid overhead)
            # For 1000 concurrent users, this ensures orphaned files are cleaned regularly
            import random
            if random.random() < 0.01:  # 1% chance = ~every 100 requests
                try:
                    cleanup_old_temp_files(max_age_hours=1)
                except Exception:
                    pass  # Don't fail request if cleanup fails
        
        # Check if we got valid results
        has_results = False
        results_summary = {}
        
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
            current_app.logger.warning(f"No valid results generated for user {user.id if user else 'anonymous'}. Outputs: {results_summary}")
            return jsonify({
                "success": False,
                "error": "We couldn't generate any valid recommendations based on your inputs. Please try adjusting your preferences, interests, or constraints and try again.",
                "error_type": "no_results",
                "suggestion": "Try providing more detailed information about your interests, skills, or goals. You can also adjust your time commitment, budget, or work style preferences.",
            }), 422  # 422 Unprocessable Entity - valid request but couldn't process
        
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
            "raw_result": str(result),
        }
        return jsonify(response)
    except Exception as exc:  # pylint: disable=broad-except
        current_app.logger.exception("Crew run failed: %s", exc)
        return (
            jsonify(
                {
                    "success": False,
                    "error": str(exc),
                }
            ),
            500,
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

