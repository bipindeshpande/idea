from __future__ import annotations

import json
import os
import re
import time
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Optional

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func

from startup_idea_crew.crew import StartupIdeaCrew
from database import db, User, UserSession, UserRun, UserValidation, Payment
from email_service import email_service
from email_templates import (
    validation_ready_email,
    trial_ending_email,
    subscription_expiring_email,
    welcome_email,
    subscription_activated_email,
)

app = Flask(__name__)
CORS(app)

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///startup_idea_advisor.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", secrets.token_hex(32))

db.init_app(app)

OUTPUT_DIR = Path("output")

PROFILE_FIELDS = [
  "goal_type",
  "time_commitment",
  "budget_range",
  "interest_area",
  "sub_interest_area",
  "work_style",
  "skill_strength",
  "experience_summary",
]


def _read_output_file(filename: str) -> str | None:
  filepath = OUTPUT_DIR / filename
  if filepath.exists():
    try:
      content = filepath.read_text(encoding="utf-8")
      # Post-processing disabled - let frontend parser handle the format
      # if filename == "profile_analysis.md":
      #   content = _fix_profile_analysis_format(content)
      return content
    except OSError:
      return None
  return None


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


# Helper functions (must be defined before routes that use them)
def create_user_session(user_id: int, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> UserSession:
    """Create a new user session."""
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=7)  # 7 days
    
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.session.add(session)
    db.session.commit()
    return session


def get_current_session() -> Optional[UserSession]:
    """Get current user session from token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.replace("Bearer ", "").strip()
    session = UserSession.query.filter_by(session_token=token).first()
    
    if not session or not session.is_valid():
        return None
    
    session.refresh()
    db.session.commit()
    return session


def require_auth(f):
    """Decorator to require authentication."""
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session = get_current_session()
        if not session:
            return jsonify({"success": False, "error": "Authentication required"}), 401
        
        if not session.user.is_subscription_active():
            return jsonify({
                "success": False,
                "error": "Subscription expired",
                "subscription": session.user.to_dict(),
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function


@app.get("/health")
def health() -> Any:
  """Simple health check endpoint."""
  return jsonify({"status": "ok"})


@app.post("/api/run")
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
def validate_idea() -> Any:
  """Validate a startup idea across 10 key parameters using OpenAI."""
  from openai import OpenAI
  
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
  - Honest assessment of whether this idea is worth pursuing
  Be constructive but don't sugarcoat. If the idea has fundamental issues, say so clearly.>"
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


# Admin endpoints
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin2024")


def check_admin_auth():
  """Check if request has valid admin authentication."""
  auth_header = request.headers.get("Authorization", "")
  if auth_header.startswith("Bearer "):
    token = auth_header.replace("Bearer ", "")
    return token == ADMIN_PASSWORD
  return False


@app.post("/admin/save-validation-questions")
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


@app.post("/admin/save-intake-fields")
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
    }
    
    with open(output_file, "w", encoding="utf-8") as f:
      json.dump(config_data, f, indent=2, ensure_ascii=False)
    
    return jsonify({"success": True, "message": "Intake fields saved"})
  except Exception as exc:
    app.logger.exception("Failed to save intake fields: %s", exc)
    return jsonify({"success": False, "error": str(exc)}), 500


@app.get("/admin/stats")
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
      "monthly_subscribers": monthly_subscribers,
    }
    
    return jsonify({"success": True, "stats": stats})
  except Exception as exc:
    app.logger.exception("Failed to get admin stats: %s", exc)
    return jsonify({"success": False, "error": str(exc)}), 500


@app.get("/api/admin/users")
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


# Initialize database tables
with app.app_context():
    db.create_all()


# Authentication & User Management Endpoints
@app.post("/api/auth/register")
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
def login() -> Any:
    """Login user."""
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
    session = create_user_session(user.id, request.remote_addr, request.headers.get("User-Agent"))
    
    return jsonify({
        "success": True,
        "user": user.to_dict(),
        "session_token": session.session_token,
    })


@app.post("/api/auth/logout")
def logout() -> Any:
    """Logout user."""
    session = get_current_session()
    if session:
        db.session.delete(session)
        db.session.commit()
    
    return jsonify({"success": True})


@app.get("/api/auth/me")
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
    
    # In production, send email with reset link
    # For now, return token (in production, send via email)
    reset_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/reset-password?token={token}"
    
    app.logger.info(f"Password reset for {email}: {reset_link}")
    
    return jsonify({
        "success": True,
        "message": "If email exists, reset link sent",
        # Remove in production - only for development
        "reset_link": reset_link if os.environ.get("DEBUG") else None,
    })


@app.post("/api/auth/reset-password")
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
    
    return jsonify({"success": True, "message": "Password reset successful"})


@app.post("/api/auth/change-password")
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
    
    return jsonify({"success": True, "message": "Password changed successfully"})


# Subscription & Payment Endpoints
@app.get("/api/subscription/status")
def get_subscription_status() -> Any:
    """Get current subscription status."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    is_active = user.is_subscription_active()
    days_remaining = user.days_remaining()
    
    return jsonify({
        "success": True,
        "subscription": {
            "type": user.subscription_type,
            "status": user.payment_status,
            "is_active": is_active,
            "days_remaining": days_remaining,
            "expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
        },
    })


@app.get("/api/user/activity")
def get_user_activity() -> Any:
    """Get current user's activity (runs, validations)."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    user = session.user
    
    try:
        # Get recent runs
        runs = UserRun.query.filter_by(user_id=user.id).order_by(UserRun.created_at.desc()).limit(10).all()
        runs_data = [{
            "id": r.id,
            "run_id": r.run_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in runs]
        
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


@app.post("/api/payment/create-intent")
def create_payment_intent() -> Any:
    """Create Stripe payment intent."""
    session = get_current_session()
    if not session:
        return jsonify({"success": False, "error": "Not authenticated"}), 401
    
    data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
    subscription_type = data.get("subscription_type", "").strip()  # weekly or monthly
    
    if subscription_type not in ["weekly", "monthly"]:
        return jsonify({"success": False, "error": "Invalid subscription type"}), 400
    
    user = session.user
    
    # Amounts in cents
    amounts = {
        "weekly": 500,  # $5.00
        "monthly": 1500,  # $15.00
    }
    
    duration_days = {
        "weekly": 7,
        "monthly": 30,
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
        return jsonify({"success": False, "error": "Payment processing failed"}), 500


@app.post("/api/payment/confirm")
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
            return jsonify({"success": False, "error": "Payment not completed"}), 400
        
        # Check if already processed
        existing_payment = Payment.query.filter_by(stripe_payment_intent_id=payment_intent_id).first()
        if existing_payment:
            return jsonify({"success": False, "error": "Payment already processed"}), 400
        
        duration_days = {"weekly": 7, "monthly": 30}[subscription_type]
        
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


# Email notification endpoints
@app.post("/api/emails/check-expiring")
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
            User.subscription_type.in_(["weekly", "monthly"]),
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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
