from __future__ import annotations

import json
import os
import re
import time
from pathlib import Path
from typing import Any, Dict

from flask import Flask, jsonify, request

from startup_idea_crew.crew import StartupIdeaCrew

app = Flask(__name__)

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


@app.get("/health")
def health() -> Any:
  """Simple health check endpoint."""
  return jsonify({"status": "ok"})


@app.post("/run")
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
    app.logger.info("Starting crew run with inputs: %s", payload)
    crew = StartupIdeaCrew().crew()
    result = crew.kickoff(inputs=payload)

    response = {
      "success": True,
      "inputs": payload,
      "outputs": {
        "profile_analysis": _read_output_file("profile_analysis.md"),
        "startup_ideas_research": _read_output_file("startup_ideas_research.md"),
        "personalized_recommendations": _read_output_file("personalized_recommendations.md"),
      },
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


@app.post("/validate-idea")
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
    # Count saved runs
    runs_file = Path("frontend") / "src" / "context" / "ReportsContext.jsx"
    # This is a simplified version - in production, you'd query a database
    stats = {
      "total_runs": 0,  # Would come from database
      "total_validations": 0,  # Would come from database
      "recent_activity": [],
    }
    
    return jsonify({"success": True, "stats": stats})
  except Exception as exc:
    app.logger.exception("Failed to get admin stats: %s", exc)
    return jsonify({"success": False, "error": str(exc)}), 500


if __name__ == "__main__":
  port = int(os.environ.get("PORT", 8000))
  app.run(host="0.0.0.0", port=port, debug=True)
