from __future__ import annotations

import json
import os
import re
import sys
import time
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Optional

# Fix Unicode encoding issues on Windows
if sys.platform == "win32":
    # Set UTF-8 encoding for stdout/stderr
    if sys.stdout.encoding != "utf-8":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass  # Python < 3.7 or already configured
    if sys.stderr.encoding != "utf-8":
        try:
            sys.stderr.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass  # Python < 3.7 or already configured
    # Set environment variable for subprocesses
    os.environ["PYTHONIOENCODING"] = "utf-8"

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func

from startup_idea_crew.crew import StartupIdeaCrew
from app.models.database import db, User, UserSession, UserRun, UserValidation, Payment, SubscriptionCancellation, Admin, AdminResetToken
from app.services.email_service import email_service
from app.services.email_templates import (
    admin_password_reset_email,
    validation_ready_email,
    trial_ending_email,
    subscription_expiring_email,
    welcome_email,
    subscription_activated_email,
    password_reset_email,
    password_changed_email,
    payment_failed_email,
    get_base_template,
)

app = Flask(__name__)

# CORS Configuration - Restrict to your domain in production
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://ideabunch.com")
ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "https://www.ideabunch.com",
    "http://localhost:5173",  # Development only
    "http://127.0.0.1:5173",  # Development only
]

# Only allow localhost in development
if os.environ.get("FLASK_ENV") != "development":
    ALLOWED_ORIGINS = [origin for origin in ALLOWED_ORIGINS if not origin.startswith("http://localhost") and not origin.startswith("http://127.0.0.1")]

CORS(app, origins=ALLOWED_ORIGINS, supports_credentials=True)

# Rate Limiting Configuration
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",  # Use in-memory storage (for production, consider Redis)
)

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///startup_idea_advisor.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", secrets.token_hex(32))

db.init_app(app)

# Import utilities
from app.utils import (
    OUTPUT_DIR,
    PROFILE_FIELDS,
    read_output_file as _read_output_file,
    create_user_session,
    get_current_session,
    require_auth,
    check_admin_auth,
)

# Health check endpoint for monitoring
@app.get("/api/health")
def health_check():
    """Health check endpoint for monitoring services."""
    try:
        # Check database connection
        db.session.execute(db.text("SELECT 1"))
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 503


def _fix_profile_analysis_format(content: str) -> str:
  """Fix profile analysis format to match expected structure using dynamic detection."""
  import re
  
  if not content:
    return content
  
  lines = content.split('\n')
  fixed_lines = []
  found_first_heading = False
  
  # Expected section patterns (in order) - dynamically derived from task requirements
  section_patterns = [
    (r'(?:core\s+)?motivation|objective', 1, "Core Motivation"),
    (r'operating\s+constraint', 2, "Operating Constraints"),
    (r'opportunity', 3, "Opportunity Within"),
    (r'strength(?!.*gap)', 4, "Strengths You Can Leverage"),
    (r'skill\s+gap|gap.*fill', 5, "Skill Gaps to Fill"),
    (r'recommendation', 6, "Recommendations"),
    (r'clarification|assumption|follow[- ]?up|question', 7, "Clarifications Needed (for downstream agents)"),
  ]
  
  # Get first section name dynamically
  first_section_name = next((name for _, num, name in section_patterns if num == 1), "Core Motivation")
  first_section_heading = f"## 1. {first_section_name}"
  
  def detect_section(text: str) -> tuple[int, str] | None:
    """Dynamically detect which section this heading belongs to."""
    text_lower = text.lower()
    for pattern, num, name in section_patterns:
      if re.search(pattern, text_lower):
        return (num, name)
    return None
  
  def normalize_heading(line: str) -> str | None:
    """Convert various heading formats to standard markdown heading."""
    stripped = line.strip()
    
    # Skip empty lines
    if not stripped:
      return None
    
    # Skip document titles
    if re.match(r'^\*\*?Profile\s+Summary\s+Document\*\*?$', stripped, re.IGNORECASE):
      return None
    
    # Already a markdown heading
    if stripped.startswith('##'):
      return stripped
    
    # Extract text from bold headings (**Text**)
    match = re.match(r'^\*\*(.+?)\*\*$', stripped)
    if match:
      text = match.group(1).strip()
      if text:
        detected = detect_section(text)
        if detected:
          return f"## {detected[0]}. {detected[1]}"
        return f"## {text}"
      return None
    
    # Extract from numbered lists (1. Text or 1) Text)
    match = re.match(r'^(\d+)[.)]\s*(.+)$', stripped)
    if match:
      num = match.group(1)
      text = match.group(2).strip()
      if text:
        # Remove bold markers if present
        text = re.sub(r'\*\*', '', text)
        detected = detect_section(text)
        if detected:
          return f"## {detected[0]}. {detected[1]}"
        return f"## {num}. {text}"
      return None
    
    # Plain text that looks like a heading (all caps or title case, short)
    if len(stripped) < 60 and stripped:
      if stripped.isupper() or (len(stripped) > 0 and stripped[0].isupper() and ' ' in stripped):
        detected = detect_section(stripped)
        if detected:
          return f"## {detected[0]}. {detected[1]}"
        return f"## {stripped}"
    
    return None
  
  for line in lines:
    normalized = normalize_heading(line)
    
    if normalized is None:
      # Skip document title lines
      continue
    elif normalized.startswith('##'):
      # This is a heading
      if not found_first_heading:
        # Ensure we start with section 1
        if not normalized.startswith('## 1.'):
          fixed_lines.append(first_section_heading)
          fixed_lines.append("")
        found_first_heading = True
      fixed_lines.append(normalized)
      fixed_lines.append("")
    else:
      # Regular content line - convert third-person to second-person
      if line.strip() and not line.strip().startswith('#'):
        # Dynamic third-person to second-person conversion
        line = re.sub(r'\bthe\s+user\'?s\b', 'your', line, flags=re.IGNORECASE)
        line = re.sub(r'\bthe\s+user\b', 'you', line, flags=re.IGNORECASE)
        line = re.sub(r'\btheir\s+goal\b', 'your goal', line, flags=re.IGNORECASE)
        line = re.sub(r'\btheir\b', 'your', line, flags=re.IGNORECASE)
        line = re.sub(r'\bThey\b', 'You', line)
        line = re.sub(r'\bthey\b', 'you', line)
      
      if found_first_heading:
        fixed_lines.append(line)
  
  # If no headings found, prepend the first section
  if not found_first_heading:
    fixed_lines.insert(0, first_section_heading)
    fixed_lines.insert(1, "")
  
  return '\n'.join(fixed_lines)


# Helper functions imported from app.utils


@app.get("/health")
def health() -> Any:
  """Simple health check endpoint."""
  return jsonify({"status": "ok"})


@app.post("/api/run")
@require_auth
@limiter.limit("10 per hour")  # Max 10 AI runs per hour per IP (AI calls are expensive)
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
    
    app.logger.info("Starting crew run with inputs: %s", payload)
    crew = StartupIdeaCrew().crew()
    result = crew.kickoff(inputs=payload)

    outputs = {
      "profile_analysis": _read_output_file("profile_analysis.md"),
      "startup_ideas_research": _read_output_file("startup_ideas_research.md"),
      "personalized_recommendations": _read_output_file("personalized_recommendations.md"),
    }
    
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
    app.logger.exception("Crew run failed: %s", exc)
    return (
      jsonify(
        {
          "success": False,
          "error": str(exc),
        }
      ),
      500,
    )


@app.post("/api/validate-idea")
@require_auth
@limiter.limit("20 per hour")  # Max 20 validations per hour per IP (AI calls are expensive)
def validate_idea() -> Any:
  """Validate a startup idea across 10 key parameters using OpenAI."""
  from openai import OpenAI
  
  # Check usage limits
  session = get_current_session()
  if not session:
    return jsonify({"success": False, "error": "Not authenticated"}), 401
  
  user = session.user
  can_validate, error_message = user.can_perform_validation()
  if not can_validate:
    return jsonify({
      "success": False,
      "error": error_message,
      "usage_limit_reached": True,
      "upgrade_required": True,
    }), 403
  
  data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
  category_answers = data.get("category_answers", {})
  idea_explanation = data.get("idea_explanation", "").strip()
  
  if not idea_explanation:
    return jsonify({"success": False, "error": "Idea explanation is required"}), 400
  
  try:
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    # Build context from category answers
    context_parts = []
    for key, value in category_answers.items():
      context_parts.append(f"{key.replace('_', ' ').title()}: {value}")
    context = "\n".join(context_parts)
    
    validation_prompt = f"""You are a critical, experienced startup advisor with a track record of identifying fatal flaws in startup ideas. Your role is to be brutally honest and rigorous in your assessment. Most ideas fail—your job is to identify why THIS idea might fail before the founder wastes time and money.

CRITICAL EVALUATION FRAMEWORK:
- Be skeptical. Assume the idea will fail unless proven otherwise.
- Score conservatively. Only give high scores (8-10) if the idea demonstrates exceptional strength with clear evidence.
- Give medium scores (5-7) for ideas with potential but significant gaps or risks.
- Give low scores (0-4) for ideas with fundamental flaws, weak market signals, or execution risks.
- Average scores should typically fall between 4-7 unless the idea is truly exceptional.

Context:
{context}

Idea Explanation:
{idea_explanation}

EVALUATION CRITERIA (be strict):

1. **Market Opportunity (0-10)**: 
   - 8-10: Large, growing market with clear demand signals, underserved segments, or emerging trends
   - 5-7: Moderate market size, some competition, unclear demand signals
   - 0-4: Saturated market, declining trends, or no clear market need

2. **Problem-Solution Fit (0-10)**:
   - 8-10: Solves a burning, urgent problem with a clear, superior solution
   - 5-7: Addresses a problem but solution may not be clearly differentiated
   - 0-4: Problem is unclear, not urgent, or solution doesn't fit

3. **Competitive Landscape (0-10)**:
   - 8-10: Clear differentiation, weak or fragmented competition, defensible moat
   - 5-7: Some differentiation but strong competitors exist
   - 0-4: Highly competitive with established players, no clear advantage

4. **Target Audience Clarity (0-10)**:
   - 8-10: Well-defined, accessible audience with clear pain points and buying power
   - 5-7: Audience exists but may be hard to reach or has unclear needs
   - 0-4: Vague audience definition, unclear who would pay, or audience too small

5. **Business Model Viability (0-10)**:
   - 8-10: Clear, proven revenue model with realistic unit economics and path to profitability
   - 5-7: Revenue model exists but unit economics unclear or challenging
   - 0-4: Unclear how to make money, poor unit economics, or unsustainable model

6. **Technical Feasibility (0-10)**:
   - 8-10: Technically straightforward, can be built with available resources/skills
   - 5-7: Some technical challenges but manageable
   - 0-4: Significant technical barriers, requires expertise/resources not available

7. **Financial Sustainability (0-10)**:
   - 8-10: Low capital requirements, clear path to profitability, sustainable burn rate
   - 5-7: Moderate capital needs, profitability timeline uncertain
   - 0-4: High capital requirements, unclear path to profitability, or unsustainable burn

8. **Scalability Potential (0-10)**:
   - 8-10: Highly scalable without proportional cost increases, network effects, or viral growth potential
   - 5-7: Some scalability but may hit constraints
   - 0-4: Limited scalability, high marginal costs, or requires linear resource growth

9. **Risk Assessment (0-10)**:
   - 8-10: Low risk, manageable challenges, clear mitigation strategies
   - 5-7: Moderate risks that can be addressed
   - 0-4: High risk, multiple critical failure points, or unmitigatable risks

10. **Go-to-Market Strategy (0-10)**:
    - 8-10: Clear, cost-effective acquisition channels, proven demand, or existing distribution
    - 5-7: Some channels identified but untested or expensive
    - 0-4: Unclear how to reach customers, expensive acquisition, or no distribution strategy

Provide a detailed validation in the following JSON format:
{{
  "overall_score": <number 0-10, be conservative>,
  "scores": {{
    "market_opportunity": <number 0-10, be strict>,
    "problem_solution_fit": <number 0-10, be strict>,
    "competitive_landscape": <number 0-10, be strict>,
    "target_audience_clarity": <number 0-10, be strict>,
    "business_model_viability": <number 0-10, be strict>,
    "technical_feasibility": <number 0-10, be strict>,
    "financial_sustainability": <number 0-10, be strict>,
    "scalability_potential": <number 0-10, be strict>,
    "risk_assessment": <number 0-10, be strict>,
    "go_to_market_strategy": <number 0-10, be strict>
  }},
  "details": {{
    "Market Opportunity": "<critical assessment: Is the market real? Is it growing? What are the demand signals? Be specific about market size, growth rate, and why this timing matters.>",
    "Problem-Solution Fit": "<critical assessment: Is the problem urgent and painful enough? Does the solution actually solve it better than alternatives? What evidence exists that people want this?>",
    "Competitive Landscape": "<critical assessment: Who are the real competitors? What are their strengths? Why would customers switch? What's the defensible advantage? Be specific about competitive threats.>",
    "Target Audience Clarity": "<critical assessment: Who exactly is the customer? Can you reach them? Do they have budget? What proof exists they want this? Be specific about customer segments and accessibility.>",
    "Business Model Viability": "<critical assessment: How exactly does this make money? What are the unit economics? What's the path to profitability? What are the revenue risks? Be specific about pricing, margins, and economics.>",
    "Technical Feasibility": "<critical assessment: Can this actually be built? What are the technical challenges? What skills/resources are needed? What are the blockers? Be specific about technical requirements and risks.>",
    "Financial Sustainability": "<critical assessment: How much capital is needed? What's the burn rate? When does it become profitable? What are the financial risks? Be specific about funding needs and sustainability.>",
    "Scalability Potential": "<critical assessment: How does this scale? What are the constraints? What are the marginal costs? Can it grow without proportional resource increases? Be specific about scaling challenges.>",
    "Risk Assessment": "<critical assessment: What are the biggest risks? What could kill this idea? What are the failure modes? What can't be mitigated? Be specific about critical risks.>",
    "Go-to-Market Strategy": "<critical assessment: How do you actually get customers? What are the acquisition channels? What's the cost? What proof exists this works? Be specific about distribution and acquisition challenges.>"
  }},
  "recommendations": "<detailed markdown-formatted recommendations. Be critical and direct. Focus on:
  - Critical flaws that must be addressed
  - Specific risks that could kill the idea
  - What evidence is missing
  - What assumptions need validation
  - What would need to change for this to succeed
  - Specific, actionable steps to improve each weak area
  - Concrete examples of what success looks like
  - Resources, frameworks, or tools that could help
  - Honest assessment of whether this idea is worth pursuing
  Be constructive but don't sugarcoat. If the idea has fundamental issues, say so clearly.>",
  "next_steps": "<Provide 3-5 specific, actionable next steps in markdown format. Each step should be:
  - Specific and concrete (not vague like 'research market')
  - Include resources, links, or templates when possible
  - Have a clear timeline (e.g., 'This week', 'Within 30 days')
  - Be immediately actionable
  Format as a numbered list with clear action items. Examples:
  1. **Contact 10 potential customers this week**: Use this email template [provide template] and reach out to [specific audience] on LinkedIn groups: [list 3-5 relevant groups]
  2. **Validate problem-solution fit within 14 days**: Create a simple landing page using [tool suggestion] and run $50 in Google Ads targeting [specific keywords] to measure interest
  3. **Research top 3 competitors**: Analyze [Company A], [Company B], and [Company C]. Document their pricing, strengths, and weaknesses. Use this comparison template [link]
  Make each step specific to the user's idea and industry.>"
}}

REMEMBER:
- Most ideas score 4-6. Only exceptional ideas score 8+.
- Be specific in your details—vague feedback is useless.
- Focus on what could go wrong, not just what's good.
- If you see red flags, call them out clearly.
- Better to be harsh now than let someone waste years on a bad idea."""
    
    response = client.chat.completions.create(
      model="gpt-4o-mini",
      messages=[
        {"role": "system", "content": "You are a critical, experienced startup advisor. Your job is to identify fatal flaws and be brutally honest. Most ideas fail—help founders avoid wasting time on bad ideas by being rigorous and specific in your assessment. Score conservatively and focus on risks and weaknesses."},
        {"role": "user", "content": validation_prompt}
      ],
      temperature=0.5,
      max_tokens=2500,
    )
    
    content = response.choices[0].message.content.strip()
    
    # Try to parse JSON from the response
    
    # Extract JSON from markdown code blocks if present
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
    if json_match:
      content = json_match.group(1)
    else:
      # Try to find JSON object directly
      json_match = re.search(r'\{.*\}', content, re.DOTALL)
      if json_match:
        content = json_match.group(0)
    
    try:
      validation_data = json.loads(content)
    except json.JSONDecodeError:
      # Fallback: create structured response from text (conservative scores)
      validation_data = {
        "overall_score": 5,
        "scores": {
          "market_opportunity": 5,
          "problem_solution_fit": 5,
          "competitive_landscape": 5,
          "target_audience_clarity": 5,
          "business_model_viability": 5,
          "technical_feasibility": 5,
          "financial_sustainability": 5,
          "scalability_potential": 5,
          "risk_assessment": 5,
          "go_to_market_strategy": 5,
        },
        "details": {},
        "recommendations": content,
        "next_steps": "1. **Review the detailed analysis above** to understand your idea's strengths and weaknesses.\n2. **Address critical flaws** identified in the recommendations section.\n3. **Validate key assumptions** by talking to potential customers.\n4. **Refine your idea** based on feedback and re-validate.",
      }
    
    validation_id = f"val_{int(time.time())}"
    
    # Save to database if user is authenticated
    session = get_current_session()
    if session:
      user = session.user
      user_validation = UserValidation(
        user_id=user.id,
        validation_id=validation_id,
        category_answers=json.dumps(category_answers),
        idea_explanation=idea_explanation,
        validation_result=json.dumps(validation_data),
      )
      db.session.add(user_validation)
      # Increment usage counter
      user.increment_validation_usage()
      db.session.commit()
      
      # Send validation ready email
      try:
        overall_score = validation_data.get("overall_score", None)
        html_content, text_content = validation_ready_email(
          user_name=user.email,
          validation_id=validation_id,
          validation_score=overall_score,
        )
        email_service.send_email(
          to_email=user.email,
          subject="Your Idea Validation is Ready! 📊",
          html_content=html_content,
          text_content=text_content,
        )
      except Exception as e:
        app.logger.warning(f"Failed to send validation ready email: {e}")
    
    return jsonify({
      "success": True,
      "validation_id": validation_id,
      "validation": validation_data,
    })
    
  except Exception as exc:
    app.logger.exception("Idea validation failed: %s", exc)
    return jsonify({
      "success": False,
      "error": str(exc),
    }), 500


# Admin authentication imported from app.utils


@app.post("/api/admin/save-validation-questions")
@limiter.limit("10 per hour")  # Max 10 config updates per hour per IP
def save_validation_questions() -> Any:
  """Save validation questions configuration (admin only)."""
  if not check_admin_auth():
    return jsonify({"success": False, "error": "Unauthorized"}), 401
  
  data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
  questions = data.get("questions", {})
  
  try:
    # Save to a JSON file (you can later update the JS file manually or automate it)
    config_dir = Path("frontend/src/config")
    config_dir.mkdir(parents=True, exist_ok=True)
    output_file = config_dir / "validationQuestions.json"
    
    with open(output_file, "w", encoding="utf-8") as f:
      json.dump(questions, f, indent=2, ensure_ascii=False)
    
    return jsonify({"success": True, "message": "Validation questions saved"})
  except Exception as exc:
    app.logger.exception("Failed to save validation questions: %s", exc)
    return jsonify({"success": False, "error": str(exc)}), 500


@app.post("/api/admin/save-intake-fields")
@limiter.limit("10 per hour")  # Max 10 config updates per hour per IP
def save_intake_fields() -> Any:
  """Save intake form fields configuration (admin only)."""
  if not check_admin_auth():
    return jsonify({"success": False, "error": "Unauthorized"}), 401
  
  data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
  fields = data.get("fields", [])
  
  try:
    # Save to a JSON file
    config_dir = Path("frontend/src/config")
    config_dir.mkdir(parents=True, exist_ok=True)
    output_file = config_dir / "intakeScreen.json"
    
    config_data = {
      "screen_id": data.get("screen_id", "idea_finder_input"),
      "screen_title": data.get("screen_title", "Tell Us About You"),
      "description": data.get("description", ""),
      "fields": fields,
      "output_object": "basicProfile.json",
    }
    
    with open(output_file, "w", encoding="utf-8") as f:
      json.dump(config_data, f, indent=2, ensure_ascii=False)
    
    app.logger.info(f"Intake fields saved to {output_file}")
    return jsonify({"success": True, "message": "Intake fields saved"})
  except Exception as exc:
    app.logger.exception("Failed to save intake fields: %s", exc)
    return jsonify({"success": False, "error": str(exc)}), 500


@app.get("/api/admin/stats")
@limiter.limit("30 per hour")  # Max 30 admin API calls per hour per IP
def get_admin_stats() -> Any:
  """Get admin statistics (admin only)."""
  if not check_admin_auth():
    return jsonify({"success": False, "error": "Unauthorized"}), 401
  
  try:
    # Get stats from database
    total_users = User.query.count()
    total_runs = UserRun.query.count()
    total_validations = UserValidation.query.count()
    total_payments = Payment.query.filter_by(status="completed").count()
    total_revenue = db.session.query(func.sum(Payment.amount)).filter_by(status="completed").scalar() or 0
    
    # Subscription stats
    active_subscriptions = User.query.filter(
      User.payment_status == "active",
      User.subscription_expires_at > datetime.utcnow()
    ).count()
    free_trial_users = User.query.filter_by(subscription_type="free_trial").count()
    weekly_subscribers = User.query.filter_by(subscription_type="weekly").count()
    starter_subscribers = User.query.filter_by(subscription_type="starter").count()
    pro_subscribers = User.query.filter_by(subscription_type="pro").count()
    # Legacy monthly subscribers (for backward compatibility)
    monthly_subscribers = User.query.filter_by(subscription_type="monthly").count()
    
    stats = {
      "total_users": total_users,
      "total_runs": total_runs,
      "total_validations": total_validations,
      "total_payments": total_payments,
      "total_revenue": float(total_revenue),
      "active_subscriptions": active_subscriptions,
      "free_trial_users": free_trial_users,
      "weekly_subscribers": weekly_subscribers,
      "starter_subscribers": starter_subscribers,
      "pro_subscribers": pro_subscribers,
      "monthly_subscribers": monthly_subscribers,  # Legacy, for backward compatibility
    }
    
    return jsonify({"success": True, "stats": stats})
  except Exception as exc:
    app.logger.exception("Failed to get admin stats: %s", exc)
    return jsonify({"success": False, "error": str(exc)}), 500


@app.get("/api/admin/users")
@limiter.limit("30 per hour")  # Max 30 admin API calls per hour per IP
def get_admin_users() -> Any:
    """Get all users (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    try:
        users = User.query.order_by(User.created_at.desc()).all()
        users_data = [user.to_dict() for user in users]
        return jsonify({"success": True, "users": users_data})
    except Exception as exc:
        app.logger.exception("Failed to get users: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@app.get("/api/admin/payments")
@limiter.limit("30 per hour")  # Max 30 admin API calls per hour per IP
def get_admin_payments() -> Any:
    """Get all payments (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    try:
        payments = Payment.query.order_by(Payment.created_at.desc()).limit(100).all()
        payments_data = [{
            "id": p.id,
            "user_id": p.user_id,
            "user_email": p.user.email,
            "amount": p.amount,
            "currency": p.currency,
            "subscription_type": p.subscription_type,
            "status": p.status,
            "stripe_payment_intent_id": p.stripe_payment_intent_id,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        } for p in payments]
        return jsonify({"success": True, "payments": payments_data})
    except Exception as exc:
        app.logger.exception("Failed to get payments: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@app.get("/api/admin/user/<int:user_id>")
@limiter.limit("30 per hour")  # Max 30 admin API calls per hour per IP
def get_admin_user_detail(user_id: int) -> Any:
    """Get detailed user information (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    try:
        user = User.query.get_or_404(user_id)
        runs = UserRun.query.filter_by(user_id=user_id).order_by(UserRun.created_at.desc()).limit(10).all()
        validations = UserValidation.query.filter_by(user_id=user_id).order_by(UserValidation.created_at.desc()).limit(10).all()
        payments = Payment.query.filter_by(user_id=user_id).order_by(Payment.created_at.desc()).all()
        sessions = UserSession.query.filter_by(user_id=user_id).order_by(UserSession.created_at.desc()).limit(10).all()
        
        return jsonify({
            "success": True,
            "user": user.to_dict(),
            "runs": [{
                "id": r.id,
                "run_id": r.run_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            } for r in runs],
            "validations": [{
                "id": v.id,
                "validation_id": v.validation_id,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            } for v in validations],
            "payments": [{
                "id": p.id,
                "amount": p.amount,
                "currency": p.currency,
                "subscription_type": p.subscription_type,
                "status": p.status,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            } for p in payments],
            "sessions": [{
                "id": s.id,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                "ip_address": s.ip_address,
            } for s in sessions],
        })
    except Exception as exc:
        app.logger.exception("Failed to get user detail: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@app.post("/api/admin/user/<int:user_id>/subscription")
@limiter.limit("10 per hour")  # Max 10 subscription updates per hour per IP
def update_user_subscription(user_id: int) -> Any:
    """Update user subscription (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    try:
        user = User.query.get_or_404(user_id)
        data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
        
        subscription_type = data.get("subscription_type", "").strip()
        duration_days = data.get("duration_days", 0)
        
        if subscription_type and duration_days > 0:
            user.activate_subscription(subscription_type, duration_days)
            db.session.commit()
            return jsonify({"success": True, "message": "Subscription updated", "user": user.to_dict()})
        else:
            return jsonify({"success": False, "error": "Invalid subscription data"}), 400
    except Exception as exc:
        app.logger.exception("Failed to update subscription: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@app.post("/api/admin/login")
@limiter.limit("10 per hour")  # Max 10 login attempts per hour per IP
def admin_login() -> Any:
    """Verify admin password."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    password = data.get("password", "").strip()
    
    if not password:
        return jsonify({"success": False, "error": "Password is required"}), 400
    
    # Get admin email from environment
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    
    if not admin_email:
        # Fallback to environment variable check
        ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin2024")
        if password == ADMIN_PASSWORD:
            return jsonify({"success": True})
        return jsonify({"success": False, "error": "Incorrect password"}), 401
    
    # Check against database
    admin = Admin.query.filter_by(email=admin_email).first()
    if admin and admin.check_password(password):
        return jsonify({"success": True})
    
    # Fallback to environment variable
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin2024")
    if password == ADMIN_PASSWORD:
        return jsonify({"success": True})
    
    return jsonify({"success": False, "error": "Incorrect password"}), 401


@app.get("/api/admin/mfa-setup")
@limiter.limit("5 per hour")  # Max 5 setup requests per hour per IP
def admin_mfa_setup() -> Any:
    """Get MFA setup information (secret and QR code data)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    # Get admin email from environment
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    
    # Get MFA secret from admin record or environment
    mfa_secret = None
    if admin_email:
        admin = Admin.query.filter_by(email=admin_email).first()
        if admin and admin.mfa_secret:
            mfa_secret = admin.mfa_secret
    
    # Fallback to environment variable or default
    if not mfa_secret:
        mfa_secret = os.environ.get("ADMIN_MFA_SECRET", "JBSWY3DPEHPK3PXP")
    
    # Generate QR code URI for authenticator apps
    try:
        import pyotp
        totp_uri = pyotp.totp.TOTP(mfa_secret).provisioning_uri(
            name=admin_email or "Admin",
            issuer_name="Startup Idea Advisor"
        )
        return jsonify({
            "success": True,
            "secret": mfa_secret,
            "qr_uri": totp_uri,
            "manual_entry_key": mfa_secret,
        })
    except ImportError:
        # If pyotp is not installed, return secret only
        return jsonify({
            "success": True,
            "secret": mfa_secret,
            "manual_entry_key": mfa_secret,
            "warning": "pyotp not installed. Install with: pip install pyotp for QR code generation"
        })


@app.post("/api/admin/verify-mfa")
@limiter.limit("20 per hour")  # Max 20 MFA verifications per hour per IP
def admin_verify_mfa() -> Any:
    """Verify MFA code for admin."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    mfa_code = data.get("mfa_code", "").strip()
    
    if not mfa_code:
        return jsonify({"success": False, "error": "MFA code is required"}), 400
    
    # Development mode: Hardcoded MFA code
    # TODO: Replace with proper TOTP validation for production
    HARDCODED_MFA_CODE = "2538"
    
    if mfa_code == HARDCODED_MFA_CODE:
        return jsonify({"success": True, "message": "MFA code verified"})
    
    # Production mode: TOTP validation (commented out for now)
    # Uncomment this section when ready for production:
    """
    # Get admin email from environment
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    
    # Get MFA secret from admin record or environment
    mfa_secret = None
    if admin_email:
        admin = Admin.query.filter_by(email=admin_email).first()
        if admin and admin.mfa_secret:
            mfa_secret = admin.mfa_secret
    
    # Fallback to environment variable or default
    if not mfa_secret:
        mfa_secret = os.environ.get("ADMIN_MFA_SECRET", "JBSWY3DPEHPK3PXP")
    
    # Verify TOTP code
    try:
        import pyotp
        totp = pyotp.TOTP(mfa_secret)
        # Allow current and adjacent time windows for clock skew tolerance
        is_valid = totp.verify(mfa_code, valid_window=1)
        
        if is_valid:
            return jsonify({"success": True, "message": "MFA code verified"})
        else:
            return jsonify({"success": False, "error": "Invalid MFA code. Please check the code from your authenticator app."}), 401
    except ImportError:
        app.logger.error("pyotp not installed. Cannot verify TOTP codes.")
        return jsonify({"success": False, "error": "MFA verification not configured"}), 500
    except Exception as e:
        app.logger.error(f"MFA verification error: {e}")
        return jsonify({"success": False, "error": "MFA verification failed"}), 500
    """
    
    return jsonify({"success": False, "error": "Invalid MFA code"}), 401


@app.post("/api/admin/forgot-password")
@limiter.limit("3 per hour")  # Max 3 password reset requests per hour per IP
def admin_forgot_password() -> Any:
    """Request admin password reset."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip().lower()
    
    if not email:
        return jsonify({"success": False, "error": "Email is required"}), 400
    
    # Get admin email from environment
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    
    if not admin_email:
        return jsonify({"success": False, "error": "Admin email not configured"}), 500
    
    # Verify email matches admin email
    if email != admin_email:
        # Don't reveal if email exists
        return jsonify({"success": True, "message": "If email exists, reset link sent"})
    
    # Generate reset token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    
    # Delete any existing unused tokens for this email
    AdminResetToken.query.filter_by(email=email, used=False).delete()
    
    # Create new reset token
    reset_token = AdminResetToken(
        token=token,
        email=email,
        expires_at=expires_at,
    )
    db.session.add(reset_token)
    db.session.commit()
    
    # Send email with reset link
    reset_link = f"{os.environ.get('FRONTEND_URL', 'https://ideabunch.com')}/admin/reset-password?token={token}"
    
    try:
        html_content, text_content = admin_password_reset_email(email, reset_link)
        email_service.send_email(
            to_email=email,
            subject="Admin Password Reset - Startup Idea Advisor",
            html_content=html_content,
            text_content=text_content,
        )
        app.logger.info(f"Admin password reset email sent to {email}")
    except Exception as e:
        app.logger.warning(f"Failed to send admin password reset email to {email}: {e}")
        # Still return success to avoid revealing if email exists
    
    return jsonify({
        "success": True,
        "message": "If email exists, reset link sent",
        # Only include reset_link in DEBUG mode for development
        "reset_link": reset_link if os.environ.get("DEBUG") else None,
    })


@app.post("/api/admin/reset-password")
@limiter.limit("5 per hour")  # Max 5 password resets per hour per IP
def admin_reset_password() -> Any:
    """Reset admin password with token."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    token = data.get("token", "").strip()
    new_password = data.get("password", "").strip()
    
    if not token or not new_password:
        return jsonify({"success": False, "error": "Token and password are required"}), 400
    
    if len(new_password) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters"}), 400
    
    # Find reset token
    reset_token = AdminResetToken.query.filter_by(token=token).first()
    
    if not reset_token or not reset_token.is_valid():
        return jsonify({"success": False, "error": "Invalid or expired reset token"}), 400
    
    # Mark token as used
    reset_token.used = True
    
    # Get or create admin user
    admin = Admin.get_or_create_admin(reset_token.email)
    
    # Update admin password
    admin.set_password(new_password)
    db.session.commit()
    
    app.logger.info(f"Admin password reset successful for {reset_token.email}")
    
    return jsonify({
        "success": True,
        "message": "Password reset successfully. You can now login with your new password."
    })


@app.get("/api/admin/reports/export")
@limiter.limit("10 per hour")  # Max 10 report exports per hour per IP
def export_report() -> Any:
    """Export reports as CSV (admin only)."""
    if not check_admin_auth():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    
    from flask import Response
    import csv
    from io import StringIO
    
    report_type = request.args.get("type", "full")
    
    try:
        output = StringIO()
        writer = csv.writer(output)
        
        if report_type == "users":
            writer.writerow(["ID", "Email", "Subscription Type", "Payment Status", "Days Remaining", "Created At", "Subscription Started", "Subscription Expires"])
            users = User.query.all()
            for user in users:
                writer.writerow([
                    user.id,
                    user.email,
                    user.subscription_type or "free",
                    user.payment_status or "inactive",
                    user.days_remaining(),
                    user.created_at.isoformat() if user.created_at else "",
                    user.subscription_started_at.isoformat() if user.subscription_started_at else "",
                    user.subscription_expires_at.isoformat() if user.subscription_expires_at else "",
                ])
        
        elif report_type == "payments":
            writer.writerow(["ID", "User Email", "Amount", "Currency", "Subscription Type", "Status", "Stripe Payment Intent ID", "Created At", "Completed At"])
            payments = Payment.query.order_by(Payment.created_at.desc()).all()
            for payment in payments:
                writer.writerow([
                    payment.id,
                    payment.user.email if payment.user else "N/A",
                    payment.amount,
                    payment.currency,
                    payment.subscription_type,
                    payment.status,
                    payment.stripe_payment_intent_id or "",
                    payment.created_at.isoformat() if payment.created_at else "",
                    payment.completed_at.isoformat() if payment.completed_at else "",
                ])
        
        elif report_type == "activity":
            writer.writerow(["Type", "ID", "User Email", "Run/Validation ID", "Created At"])
            runs = UserRun.query.order_by(UserRun.created_at.desc()).all()
            for run in runs:
                writer.writerow([
                    "Run",
                    run.id,
                    run.user.email if run.user else "N/A",
                    run.run_id,
                    run.created_at.isoformat() if run.created_at else "",
                ])
            validations = UserValidation.query.order_by(UserValidation.created_at.desc()).all()
            for validation in validations:
                writer.writerow([
                    "Validation",
                    validation.id,
                    validation.user.email if validation.user else "N/A",
                    validation.validation_id,
                    validation.created_at.isoformat() if validation.created_at else "",
                ])
        
        elif report_type == "subscriptions":
            writer.writerow(["User Email", "Subscription Type", "Status", "Started At", "Expires At", "Days Remaining", "Monthly Validations Used", "Monthly Discoveries Used"])
            users = User.query.filter(User.subscription_type.in_(["starter", "pro", "weekly"])).all()
            for user in users:
                writer.writerow([
                    user.email,
                    user.subscription_type,
                    "active" if user.is_subscription_active() else "expired",
                    user.subscription_started_at.isoformat() if user.subscription_started_at else "",
                    user.subscription_expires_at.isoformat() if user.subscription_expires_at else "",
                    user.days_remaining(),
                    user.monthly_validations_used,
                    user.monthly_discoveries_used,
                ])
        
        elif report_type == "revenue":
            writer.writerow(["Period", "Total Revenue", "Payment Count", "Average Payment", "Subscription Type Breakdown"])
            # Group by month
            from sqlalchemy import func, extract
            payments = Payment.query.filter_by(status="completed").all()
            revenue_by_month = {}
            for payment in payments:
                if payment.created_at:
                    month_key = payment.created_at.strftime("%Y-%m")
                    if month_key not in revenue_by_month:
                        revenue_by_month[month_key] = {"revenue": 0, "count": 0, "types": {}}
                    revenue_by_month[month_key]["revenue"] += payment.amount
                    revenue_by_month[month_key]["count"] += 1
                    sub_type = payment.subscription_type or "unknown"
                    revenue_by_month[month_key]["types"][sub_type] = revenue_by_month[month_key]["types"].get(sub_type, 0) + payment.amount
            
            for month, data in sorted(revenue_by_month.items()):
                avg = data["revenue"] / data["count"] if data["count"] > 0 else 0
                types_str = ", ".join([f"{k}: ${v:.2f}" for k, v in data["types"].items()])
                writer.writerow([
                    month,
                    f"${data['revenue']:.2f}",
                    data["count"],
                    f"${avg:.2f}",
                    types_str,
                ])
        
        else:  # full report
            writer.writerow(["Report Type", "Data"])
            # Users
            writer.writerow(["USERS", ""])
            writer.writerow(["ID", "Email", "Subscription Type", "Payment Status", "Days Remaining", "Created At"])
            users = User.query.all()
            for user in users:
                writer.writerow([
                    user.id,
                    user.email,
                    user.subscription_type or "free",
                    user.payment_status or "inactive",
                    user.days_remaining(),
                    user.created_at.isoformat() if user.created_at else "",
                ])
            writer.writerow([])
            # Payments
            writer.writerow(["PAYMENTS", ""])
            writer.writerow(["ID", "User Email", "Amount", "Currency", "Subscription Type", "Status", "Created At"])
            payments = Payment.query.order_by(Payment.created_at.desc()).all()
            for payment in payments:
                writer.writerow([
                    payment.id,
                    payment.user.email if payment.user else "N/A",
                    payment.amount,
                    payment.currency,
                    payment.subscription_type,
                    payment.status,
                    payment.created_at.isoformat() if payment.created_at else "",
                ])
        
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
        )
    except Exception as exc:
        app.logger.exception("Failed to export report: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


# Initialize database tables
with app.app_context():
    db.create_all()
    
    # Initialize admin user if ADMIN_EMAIL is set
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    if admin_email:
        default_password = os.environ.get("ADMIN_PASSWORD", "admin2024")
        admin = Admin.get_or_create_admin(admin_email, default_password)
        
        # Set MFA secret if not already set
        mfa_secret = os.environ.get("ADMIN_MFA_SECRET", "JBSWY3DPEHPK3PXP")
        if not admin.mfa_secret:
            admin.mfa_secret = mfa_secret
            db.session.commit()
        
        app.logger.info(f"Admin user initialized: {admin_email}")


# Authentication & User Management Endpoints
@app.post("/api/auth/register")
@limiter.limit("3 per hour")  # Max 3 registrations per hour per IP
def register() -> Any:
    """Register a new user."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    
    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required"}), 400
    
    if len(password) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters"}), 400
    
    # Check if user exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"success": False, "error": "Email already registered"}), 400
    
    # Create new user with 3-day free trial
    user = User(
        email=email,
        subscription_type="free_trial",
        subscription_started_at=datetime.utcnow(),
        subscription_expires_at=datetime.utcnow() + timedelta(days=3),
        payment_status="trial",
    )
    user.set_password(password)
    
    try:
        db.session.add(user)
        db.session.commit()
        
        # Create session
        session = create_user_session(user.id, request.remote_addr, request.headers.get("User-Agent"))
        
        # Send welcome email
        try:
            html_content, text_content = welcome_email(user.email)
            email_service.send_email(
                to_email=user.email,
                subject="Welcome to Startup Idea Advisor! 🚀",
                html_content=html_content,
                text_content=text_content,
            )
        except Exception as e:
            app.logger.warning(f"Failed to send welcome email: {e}")
        
        # Send admin notification for new user
        try:
            admin_email = os.environ.get("ADMIN_EMAIL")
            if admin_email:
                admin_html = f"""
                <h2 style="color: #333; margin-top: 0;">New User Registration</h2>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Registered:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                <p><strong>Subscription:</strong> {user.subscription_type} (Free Trial)</p>
                <p><strong>Expires:</strong> {user.subscription_expires_at.strftime('%Y-%m-%d') if user.subscription_expires_at else 'N/A'}</p>
                """
                email_service.send_email(
                    to_email=admin_email,
                    subject=f"New User: {user.email}",
                    html_content=get_base_template(admin_html),
                    text_content=f"New user registered: {user.email}\nRegistered: {datetime.utcnow().isoformat()}",
                )
        except Exception as e:
            app.logger.warning(f"Failed to send admin notification: {e}")
        
        return jsonify({
            "success": True,
            "user": user.to_dict(),
            "session_token": session.session_token,
        })
    except Exception as exc:
        db.session.rollback()
        app.logger.exception("Registration failed: %s", exc)
        return jsonify({"success": False, "error": "Registration failed"}), 500


@app.post("/api/auth/login")
@limiter.limit("5 per minute")  # Max 5 login attempts per minute per IP
def login() -> Any:
    """Login user."""
    try:
        data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
        email = data.get("email", "").strip().lower()
        password = data.get("password", "").strip()
        
        if not email or not password:
            return jsonify({"success": False, "error": "Email and password are required"}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({"success": False, "error": "Invalid email or password"}), 401
        
        if not user.is_active:
            return jsonify({"success": False, "error": "Account is deactivated"}), 403
        
        # Create session
        try:
            session = create_user_session(user.id, request.remote_addr, request.headers.get("User-Agent"))
        except Exception as session_error:
            app.logger.exception("Failed to create user session: %s", session_error)
            db.session.rollback()
            return jsonify({"success": False, "error": "Failed to create session. Please try again."}), 500
        
        return jsonify({
            "success": True,
            "user": user.to_dict(),
            "session_token": session.session_token,
        })
    except Exception as exc:
        app.logger.exception("Login failed: %s", exc)
        db.session.rollback()
        return jsonify({"success": False, "error": "Login failed. Please try again."}), 500


@app.post("/api/auth/logout")
@limiter.limit("20 per hour")  # Max 20 logouts per hour per IP
def logout() -> Any:
    """Logout user."""
    session = get_current_session()
    if session:
        db.session.delete(session)
        db.session.commit()
    
    return jsonify({"success": True})


@app.get("/api/auth/me")
@limiter.limit("60 per hour")  # Max 60 requests per hour per IP (frequent but harmless)
def get_current_user() -> Any:
    """Get current user info."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    return jsonify({
        "success": True,
        "user": user.to_dict(),
    })


@app.post("/api/auth/forgot-password")
@limiter.limit("3 per hour")  # Max 3 password reset requests per hour per IP
def forgot_password() -> Any:
    """Request password reset."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    email = data.get("email", "").strip().lower()
    
    if not email:
        return jsonify({"success": False, "error": "Email is required"}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        # Don't reveal if email exists
        return jsonify({"success": True, "message": "If email exists, reset link sent"})
    
    token = user.generate_reset_token()
    db.session.commit()
    
    # Send email with reset link
    reset_link = f"{os.environ.get('FRONTEND_URL', 'https://ideabunch.com')}/reset-password?token={token}"
    
    try:
        html_content, text_content = password_reset_email(user.email, reset_link)
        email_service.send_email(
            to_email=user.email,
            subject="Reset Your Password - Idea Bunch",
            html_content=html_content,
            text_content=text_content,
        )
        app.logger.info(f"Password reset email sent to {email}")
    except Exception as e:
        app.logger.warning(f"Failed to send password reset email to {email}: {e}")
        # Still return success to avoid revealing if email exists
    
    return jsonify({
        "success": True,
        "message": "If email exists, reset link sent",
        # Only include reset_link in DEBUG mode for development
        "reset_link": reset_link if os.environ.get("DEBUG") else None,
    })


@app.post("/api/auth/reset-password")
@limiter.limit("5 per hour")  # Max 5 password resets per hour per IP
def reset_password() -> Any:
    """Reset password with token."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    token = data.get("token", "").strip()
    new_password = data.get("password", "").strip()
    
    if not token or not new_password:
        return jsonify({"success": False, "error": "Token and password are required"}), 400
    
    if len(new_password) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters"}), 400
    
    user = User.query.filter(User.reset_token.isnot(None)).first()
    if not user or not user.verify_reset_token(token):
        return jsonify({"success": False, "error": "Invalid or expired reset token"}), 400
    
    user.set_password(new_password)
    user.clear_reset_token()
    db.session.commit()
    
    # Send confirmation email
    try:
        html_content, text_content = password_changed_email(user.email)
        email_service.send_email(
            to_email=user.email,
            subject="Password Changed - Idea Bunch",
            html_content=html_content,
            text_content=text_content,
        )
    except Exception as e:
        app.logger.warning(f"Failed to send password changed email to {user.email}: {e}")
    
    return jsonify({"success": True, "message": "Password reset successful"})


@app.post("/api/auth/change-password")
@limiter.limit("5 per hour")  # Max 5 password changes per hour per IP
def change_password() -> Any:
    """Change password (requires current password)."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    current_password = data.get("current_password", "").strip()
    new_password = data.get("new_password", "").strip()
    
    if not current_password or not new_password:
        return jsonify({"success": False, "error": "Current and new passwords are required"}), 400
    
    if len(new_password) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters"}), 400
    
    user = session.user
    if not user.check_password(current_password):
        return jsonify({"success": False, "error": "Current password is incorrect"}), 400
    
    user.set_password(new_password)
    db.session.commit()
    
    # Send confirmation email
    try:
        html_content, text_content = password_changed_email(user.email)
        email_service.send_email(
            to_email=user.email,
            subject="Password Changed - Idea Bunch",
            html_content=html_content,
            text_content=text_content,
        )
    except Exception as e:
        app.logger.warning(f"Failed to send password changed email to {user.email}: {e}")
    
    return jsonify({"success": True, "message": "Password changed successfully"})


# Subscription & Payment Endpoints
@app.get("/api/subscription/status")
@limiter.limit("30 per hour")  # Max 30 status checks per hour per IP
def get_subscription_status() -> Any:
    """Get current subscription status."""
    try:
        session = get_current_session()
        if not session:
            return jsonify({"success": False, "error": "Not authenticated"}), 401
        
        user = session.user
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
        
        is_active = user.is_subscription_active()
        days_remaining = user.days_remaining()
        
        # Get payment history
        payments = Payment.query.filter_by(user_id=user.id, status="completed").order_by(Payment.created_at.desc()).limit(10).all()
        payment_history = [{
            "id": p.id,
            "amount": p.amount,
            "subscription_type": p.subscription_type,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        } for p in payments]
        
        return jsonify({
            "success": True,
            "subscription": {
                "type": user.subscription_type or "free",
                "status": user.payment_status or "active",
                "is_active": is_active,
                "days_remaining": days_remaining,
                "expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
                "started_at": user.subscription_started_at.isoformat() if user.subscription_started_at else None,
            },
            "payment_history": payment_history,
        })
    except Exception as e:
        app.logger.exception("Error getting subscription status: %s", e)
        return jsonify({"success": False, "error": "Failed to load subscription status"}), 500


@app.post("/api/subscription/cancel")
@limiter.limit("5 per hour")  # Max 5 subscription cancellations per hour per IP
def cancel_subscription() -> Any:
    """Cancel user subscription (keeps access until expiration)."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    
    # Only allow cancellation of paid subscriptions
    if user.subscription_type == "free_trial":
        return jsonify({"success": False, "error": "Cannot cancel free trial"}), 400
    
    if user.payment_status != "active":
        return jsonify({"success": False, "error": "Subscription is not active"}), 400
    
    # Get cancellation reason from request
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    cancellation_reason = data.get("cancellation_reason", "").strip()
    cancellation_category = data.get("cancellation_category", "").strip()
    additional_comments = data.get("additional_comments", "").strip()
    
    if not cancellation_reason:
        return jsonify({"success": False, "error": "Cancellation reason is required"}), 400
    
    try:
        # Mark as cancelled but keep access until expiration
        user.payment_status = "cancelled"
        
        # Save cancellation reason to database
        cancellation = SubscriptionCancellation(
            user_id=user.id,
            subscription_type=user.subscription_type,
            cancellation_reason=cancellation_reason,
            cancellation_category=cancellation_category if cancellation_category else None,
            subscription_expires_at=user.subscription_expires_at,
        )
        db.session.add(cancellation)
        db.session.commit()
        
        # Send admin notification for cancellation
        try:
            admin_email = os.environ.get("ADMIN_EMAIL")
            if admin_email:
                admin_html = f"""
                <h2 style="color: #333; margin-top: 0;">⚠️ Subscription Cancelled</h2>
                <p><strong>User:</strong> {user.email}</p>
                <p><strong>Plan:</strong> {user.subscription_type.title()}</p>
                <p><strong>Reason:</strong> {cancellation_reason}</p>
                {f'<p><strong>Category:</strong> {cancellation_category}</p>' if cancellation_category else ''}
                {f'<p><strong>Additional Comments:</strong> {additional_comments}</p>' if additional_comments else ''}
                <p><strong>Access Until:</strong> {user.subscription_expires_at.strftime('%Y-%m-%d') if user.subscription_expires_at else 'N/A'}</p>
                <p><strong>Date:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                """
                email_service.send_email(
                    to_email=admin_email,
                    subject=f"Subscription Cancelled: {user.email}",
                    html_content=get_base_template(admin_html),
                    text_content=f"Subscription cancelled: {user.email}\nReason: {cancellation_reason}\nPlan: {user.subscription_type}",
                )
        except Exception as e:
            app.logger.warning(f"Failed to send admin cancellation notification: {e}")
        
        # Send cancellation confirmation email
        try:
            from app.services.email_templates import get_base_template
            name = user.email.split("@")[0] if "@" in user.email else user.email
            days_remaining = user.days_remaining()
            
            content = f"""
            <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
            <p>Your subscription has been cancelled successfully.</p>
            <p><strong>Important:</strong> You'll continue to have access to all features until {user.subscription_expires_at.strftime('%B %d, %Y') if user.subscription_expires_at else 'your subscription expires'} ({days_remaining} days remaining).</p>
            <p>After that date, you'll need to resubscribe to continue using the platform.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://ideabunch.com/pricing" 
                   style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    Resubscribe Anytime
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">We're sorry to see you go. If you have feedback, please reply to this email.</p>
            """
            
            text_content = f"""
Hi {name},

Your subscription has been cancelled successfully.

You'll continue to have access until {user.subscription_expires_at.strftime('%B %d, %Y') if user.subscription_expires_at else 'your subscription expires'} ({days_remaining} days remaining).

After that date, you'll need to resubscribe to continue.

Resubscribe: https://ideabunch.com/pricing
"""
            
            html_content = get_base_template(content)
            email_service.send_email(
                to_email=user.email,
                subject="Subscription Cancelled",
                html_content=html_content,
                text_content=text_content,
            )
        except Exception as e:
            app.logger.warning(f"Failed to send cancellation email: {e}")
        
        return jsonify({
            "success": True,
            "message": "Subscription cancelled. You'll have access until expiration.",
            "user": user.to_dict(),
        })
    except Exception as exc:
        db.session.rollback()
        app.logger.exception("Subscription cancellation failed: %s", exc)
        return jsonify({"success": False, "error": "Failed to cancel subscription"}), 500


@app.post("/api/subscription/change-plan")
@limiter.limit("5 per hour")  # Max 5 plan changes per hour per IP
def change_subscription_plan() -> Any:
    """Change subscription plan (upgrade or downgrade)."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    new_subscription_type = data.get("subscription_type", "").strip()
    
    # Valid subscription types: starter, pro, weekly
    if new_subscription_type not in ["starter", "pro", "weekly"]:
        return jsonify({"success": False, "error": "Invalid subscription type"}), 400
    
    user = session.user
    
    # Can't change if on free trial
    if user.subscription_type == "free_trial":
        return jsonify({"success": False, "error": "Please subscribe first before changing plans"}), 400
    
    # Can't change to same plan
    if user.subscription_type == new_subscription_type:
        return jsonify({"success": False, "error": "You're already on this plan"}), 400
    
    try:
        # Calculate prorated amount or immediate switch
        # For simplicity, we'll extend current subscription with new duration
        duration_days_map = {
            "starter": 30,
            "pro": 30,
            "weekly": 7,
        }
        duration_days = duration_days_map[new_subscription_type]
        
        # If user has time remaining, extend from current expiration
        # Otherwise, start from now
        if user.subscription_expires_at and user.subscription_expires_at > datetime.utcnow():
            # Extend from current expiration
            user.subscription_expires_at = user.subscription_expires_at + timedelta(days=duration_days)
        else:
            # Start new period from now
            user.subscription_expires_at = datetime.utcnow() + timedelta(days=duration_days)
        
        user.subscription_type = new_subscription_type
        user.payment_status = "active"
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Subscription changed to {new_subscription_type} plan",
            "user": user.to_dict(),
        })
    except Exception as exc:
        db.session.rollback()
        app.logger.exception("Subscription change failed: %s", exc)
        return jsonify({"success": False, "error": "Failed to change subscription"}), 500


@app.get("/api/user/usage")
@require_auth
@limiter.limit("30 per hour")
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


@app.get("/api/user/activity")
@limiter.limit("30 per hour")  # Max 30 activity checks per hour per IP
def get_user_activity() -> Any:
    """Get current user's activity (runs, validations)."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    
    try:
        # Get recent runs
        runs = UserRun.query.filter_by(user_id=user.id).order_by(UserRun.created_at.desc()).limit(10).all()
        runs_data = []
        for r in runs:
            inputs_data = {}
            try:
                inputs_data = json.loads(r.inputs) if r.inputs else {}
            except:
                pass
            
            runs_data.append({
                "id": r.id,
                "run_id": r.run_id,
                "inputs": inputs_data,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })
        
        # Get recent validations
        validations = UserValidation.query.filter_by(user_id=user.id).order_by(UserValidation.created_at.desc()).limit(10).all()
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
        app.logger.exception("Failed to get user activity: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@app.get("/api/user/run/<run_id>")
@require_auth
@limiter.limit("200 per hour")  # Max 200 run fetches per hour per IP (increased to prevent 429 errors)
def get_user_run(run_id: str) -> Any:
    """Get a specific user's run data including inputs and reports."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    
    try:
        # Find the run and verify it belongs to the user
        user_run = UserRun.query.filter_by(user_id=user.id, run_id=run_id).first()
        if not user_run:
            return jsonify({"success": False, "error": "Run not found"}), 404
        
        # Parse inputs and reports from JSON strings
        inputs = {}
        reports = {}
        try:
            inputs = json.loads(user_run.inputs) if user_run.inputs else {}
        except:
            pass
        try:
            reports = json.loads(user_run.reports) if user_run.reports else {}
        except:
            pass
        
        return jsonify({
            "success": True,
            "run": {
                "id": user_run.id,
                "run_id": user_run.run_id,
                "inputs": inputs,
                "reports": reports,
                "created_at": user_run.created_at.isoformat() if user_run.created_at else None,
                "updated_at": user_run.updated_at.isoformat() if user_run.updated_at else None,
            },
        })
    except Exception as exc:
        app.logger.exception("Failed to get user run: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@app.delete("/api/user/run/<run_id>")
@require_auth
@limiter.limit("20 per hour")  # Max 20 deletions per hour per IP
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
        app.logger.exception("Failed to delete user run: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


@app.post("/api/payment/create-intent")
@limiter.limit("10 per hour")  # Max 10 payment intent creations per hour per IP
def create_payment_intent() -> Any:
    """Create Stripe payment intent."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    subscription_type = data.get("subscription_type", "").strip()
    
    # Valid subscription types: starter, pro, weekly
    if subscription_type not in ["starter", "pro", "weekly"]:
        return jsonify({"success": False, "error": "Invalid subscription type"}), 400
    
    user = session.user
    
    # Amounts in cents
    amounts = {
        "starter": 700,   # $7.00/month
        "pro": 1500,      # $15.00/month
        "weekly": 500,    # $5.00/week
    }
    
    duration_days = {
        "starter": 30,    # 30 days
        "pro": 30,        # 30 days
        "weekly": 7,      # 7 days
    }
    
    try:
        import stripe
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        
        if not stripe.api_key:
            return jsonify({"success": False, "error": "Stripe not configured"}), 500
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=amounts[subscription_type],
            currency="usd",
            metadata={
                "user_id": str(user.id),
                "subscription_type": subscription_type,
                "duration_days": str(duration_days[subscription_type]),
            },
        )
        
        return jsonify({
            "success": True,
            "client_secret": intent.client_secret,
            "amount": amounts[subscription_type] / 100,
            "subscription_type": subscription_type,
        })
    except ImportError:
        return jsonify({"success": False, "error": "Stripe not installed"}), 500
    except Exception as exc:
        app.logger.exception("Payment intent creation failed: %s", exc)
        # Send payment failure email if user is authenticated
        try:
            if user:
                html_content, text_content = payment_failed_email(
                    user_name=user.email,
                    subscription_type=subscription_type,
                    error_message="Payment intent creation failed",
                )
                email_service.send_email(
                    to_email=user.email,
                    subject="Payment Failed - Idea Bunch",
                    html_content=html_content,
                    text_content=text_content,
                )
        except Exception as email_err:
            app.logger.warning(f"Failed to send payment failure email: {email_err}")
        
        return jsonify({"success": False, "error": "Payment processing failed"}), 500


@app.post("/api/payment/confirm")
@limiter.limit("10 per hour")  # Max 10 payment confirmations per hour per IP
def confirm_payment() -> Any:
    """Confirm payment and activate subscription."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    payment_intent_id = data.get("payment_intent_id", "").strip()
    subscription_type = data.get("subscription_type", "").strip()
    
    if not payment_intent_id or not subscription_type:
        return jsonify({"success": False, "error": "Payment intent ID and subscription type required"}), 400
    
    user = session.user
    
    try:
        import stripe
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        
        # Verify payment intent
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status != "succeeded":
            # Send payment failure email
            error_message = f"Payment status: {intent.status}"
            try:
                html_content, text_content = payment_failed_email(
                    user_name=user.email,
                    subscription_type=subscription_type,
                    error_message=error_message,
                )
                email_service.send_email(
                    to_email=user.email,
                    subject="Payment Failed - Idea Bunch",
                    html_content=html_content,
                    text_content=text_content,
                )
            except Exception as e:
                app.logger.warning(f"Failed to send payment failure email to {user.email}: {e}")
            
            return jsonify({"success": False, "error": "Payment not completed"}), 400
        
        # Check if already processed
        existing_payment = Payment.query.filter_by(stripe_payment_intent_id=payment_intent_id).first()
        if existing_payment:
            return jsonify({"success": False, "error": "Payment already processed"}), 400
        
        # Duration mapping for all subscription types
        duration_days_map = {
            "starter": 30,
            "pro": 30,
            "weekly": 7,
        }
        
        if subscription_type not in duration_days_map:
            return jsonify({"success": False, "error": "Invalid subscription type"}), 400
        
        duration_days = duration_days_map[subscription_type]
        
        # Activate subscription
        user.activate_subscription(subscription_type, duration_days)
        
        # Record payment
        payment = Payment(
            user_id=user.id,
            amount=intent.amount / 100,
            subscription_type=subscription_type,
            stripe_payment_intent_id=payment_intent_id,
            status="completed",
            completed_at=datetime.utcnow(),
        )
        db.session.add(payment)
        db.session.commit()
        
        # Send subscription activated email
        try:
            html_content, text_content = subscription_activated_email(
                user_name=user.email,
                subscription_type=subscription_type,
            )
            email_service.send_email(
                to_email=user.email,
                subject="🎉 Your Subscription is Active!",
                html_content=html_content,
                text_content=text_content,
            )
        except Exception as e:
            app.logger.warning(f"Failed to send subscription activated email: {e}")
        
        return jsonify({
            "success": True,
            "user": user.to_dict(),
            "message": "Subscription activated",
        })
    except ImportError:
        return jsonify({"success": False, "error": "Stripe not installed"}), 500
    except Exception as exc:
        db.session.rollback()
        app.logger.exception("Payment confirmation failed: %s", exc)
        return jsonify({"success": False, "error": "Payment confirmation failed"}), 500


# Stripe Webhook Endpoint
@app.post("/api/webhooks/stripe")
@limiter.limit("100 per hour")  # Webhooks can be frequent, but still limit
def stripe_webhook() -> Any:
    """Handle Stripe webhook events with signature verification."""
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
    
    if not webhook_secret:
        app.logger.error("STRIPE_WEBHOOK_SECRET not configured")
        return jsonify({"error": "Webhook secret not configured"}), 500
    
    if not sig_header:
        app.logger.warning("Stripe webhook called without signature")
        return jsonify({"error": "Missing signature"}), 400
    
    try:
        import stripe
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        
        app.logger.info(f"Stripe webhook received: {event['type']}")
        
        # Handle different event types
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            payment_intent_id = payment_intent['id']
            
            # Find the payment in database
            payment = Payment.query.filter_by(stripe_payment_intent_id=payment_intent_id).first()
            
            if payment and payment.status != 'completed':
                # Update payment status
                payment.status = 'completed'
                payment.completed_at = datetime.utcnow()
                
                # Activate user subscription if not already active
                user = payment.user
                if user.payment_status != 'active':
                    subscription_type = payment.subscription_type
                    duration_days_map = {
                        "starter": 30,
                        "pro": 30,
                        "weekly": 7,
                    }
                    duration_days = duration_days_map.get(subscription_type, 30)
                    user.activate_subscription(subscription_type, duration_days)
                    
                    # Send activation email
                    try:
                        html_content, text_content = subscription_activated_email(
                            user_name=user.email,
                            subscription_type=subscription_type,
                        )
                        email_service.send_email(
                            to_email=user.email,
                            subject="🎉 Your Subscription is Active!",
                            html_content=html_content,
                            text_content=text_content,
                        )
                    except Exception as e:
                        app.logger.warning(f"Failed to send subscription activated email: {e}")
                
                db.session.commit()
                app.logger.info(f"Payment {payment_intent_id} confirmed via webhook")
        
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            payment_intent_id = payment_intent['id']
            
            # Find the payment in database
            payment = Payment.query.filter_by(stripe_payment_intent_id=payment_intent_id).first()
            
            if payment:
                payment.status = 'failed'
                db.session.commit()
                
                # Send failure email
                try:
                    user = payment.user
                    html_content, text_content = payment_failed_email(
                        user_name=user.email,
                        subscription_type=payment.subscription_type,
                        error_message="Payment failed",
                    )
                    email_service.send_email(
                        to_email=user.email,
                        subject="Payment Failed - Idea Bunch",
                        html_content=html_content,
                        text_content=text_content,
                    )
                except Exception as e:
                    app.logger.warning(f"Failed to send payment failure email: {e}")
                
                app.logger.info(f"Payment {payment_intent_id} failed via webhook")
        
        return jsonify({"success": True}), 200
        
    except ValueError as e:
        # Invalid payload
        app.logger.error(f"Invalid webhook payload: {e}")
        return jsonify({"error": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        app.logger.error(f"Invalid webhook signature: {e}")
        return jsonify({"error": "Invalid signature"}), 400
    except ImportError:
        app.logger.error("Stripe not installed")
        return jsonify({"error": "Stripe not installed"}), 500
    except Exception as e:
        app.logger.exception(f"Webhook processing failed: {e}")
        return jsonify({"error": "Webhook processing failed"}), 500


# Email notification endpoints
@app.post("/api/emails/check-expiring")
@limiter.limit("10 per day")  # Max 10 cron job calls per day per IP (prevents abuse)
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
                    app.logger.warning(f"Failed to send trial ending email to {user.email}: {e}")
        
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
                    app.logger.warning(f"Failed to send subscription expiring email to {user.email}: {e}")
        
        return jsonify({
            "success": True,
            "emails_sent": emails_sent,
            "message": f"Checked expiring subscriptions, sent {emails_sent} emails",
        })
    except Exception as exc:
        app.logger.exception("Failed to check expiring subscriptions: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500


# Contact form endpoint
@app.post("/api/contact")
@limiter.limit("5 per hour")  # Max 5 contact form submissions per hour per IP (prevents spam)
def contact_form() -> Any:
    """Handle contact form submissions."""
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    company = data.get("company", "").strip()
    topic = data.get("topic", "").strip()
    message = data.get("message", "").strip()
    
    if not name or not email or not message:
        return jsonify({"success": False, "error": "Name, email, and message are required"}), 400
    
    # Validate email format
    import re
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return jsonify({"success": False, "error": "Invalid email format"}), 400
    
    # Get admin email from environment (defaults to FROM_EMAIL if not set)
    admin_email = os.environ.get("ADMIN_EMAIL", os.environ.get("FROM_EMAIL", "noreply@ideabunch.com"))
    
    # Create email content
    company_text = f"<strong>Company:</strong> {company}<br>" if company else ""
    topic_text = f"<strong>Topic:</strong> {topic}<br>" if topic else ""
    
    html_content = f"""
    <h2 style="color: #333; margin-top: 0;">New Contact Form Submission</h2>
    <p><strong>Name:</strong> {name}</p>
    <p><strong>Email:</strong> <a href="mailto:{email}">{email}</a></p>
    {company_text}
    {topic_text}
    <p><strong>Message:</strong></p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 15px 0;">
        {message.replace(chr(10), '<br>')}
    </div>
    <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Reply to: <a href="mailto:{email}">{email}</a>
    </p>
    """
    
    text_content = f"""
New Contact Form Submission

Name: {name}
Email: {email}
{('Company: ' + company) if company else ''}
{('Topic: ' + topic) if topic else ''}

Message:
{message}

Reply to: {email}
"""
    
    try:
        # Send email to admin
        email_service.send_email(
            to_email=admin_email,
            subject=f"Contact Form: {topic or 'General Inquiry'} - {name}",
            html_content=html_content,
            text_content=text_content,
        )
        
        # Send confirmation email to user
        user_confirmation_html = f"""
        <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
        <p>Thank you for reaching out! We've received your message and will get back to you within one business day.</p>
        <p><strong>Your message:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 15px 0;">
            {message.replace(chr(10), '<br>')}
        </div>
        <p style="color: #666; font-size: 14px;">If you have any urgent questions, feel free to reply to this email.</p>
        """
        
        user_confirmation_text = f"""
Hi {name},

Thank you for reaching out! We've received your message and will get back to you within one business day.

Your message:
{message}

If you have any urgent questions, feel free to reply to this email.
"""
        
        email_service.send_email(
            to_email=email,
            subject="We've received your message - Idea Bunch",
            html_content=get_base_template(user_confirmation_html),
            text_content=user_confirmation_text,
        )
        
        app.logger.info(f"Contact form submission from {email} sent to {admin_email}")
        
        return jsonify({
            "success": True,
            "message": "Thank you for your message! We'll get back to you soon.",
        })
    except Exception as exc:
        app.logger.exception("Failed to send contact form email: %s", exc)
        return jsonify({
            "success": False,
            "error": "Failed to send message. Please try again or email us directly.",
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
