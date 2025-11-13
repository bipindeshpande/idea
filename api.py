from __future__ import annotations

import os
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


if __name__ == "__main__":
  port = int(os.environ.get("PORT", 8000))
  app.run(host="0.0.0.0", port=port, debug=True)
