from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

from flask import Flask, jsonify, request

from startup_idea_crew.crew import StartupIdeaCrew

app = Flask(__name__)

OUTPUT_DIR = Path("output")

PROFILE_FIELDS = [
  "goals",
  "time_commitment",
  "interests",
  "professional_background",
  "skills",
  "budget_range",
  "risk_tolerance",
  "preferred_model",
  "resources",
  "learning_goals",
]


def _read_output_file(filename: str) -> str | None:
  filepath = OUTPUT_DIR / filename
  if filepath.exists():
    try:
      return filepath.read_text(encoding="utf-8")
    except OSError:
      return None
  return None


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

  if not payload["goals"]:
    payload["goals"] = "Build a successful startup that aligns with my interests"
  if not payload["time_commitment"]:
    payload["time_commitment"] = "10-15 hours per week"
  if not payload["interests"]:
    payload["interests"] = "Technology and innovation"

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
