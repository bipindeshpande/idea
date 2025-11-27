"""Validation routes blueprint - idea validation endpoints."""
from flask import Blueprint, request, jsonify, current_app
from typing import Any, Dict
from datetime import datetime
import os
import json
import re
import time

from openai import OpenAI
from app.models.database import db, User, UserSession, UserRun, UserValidation
from app.utils import get_current_session, require_auth
from app.services.email_service import email_service
from app.services.email_templates import validation_ready_email

bp = Blueprint("validation", __name__)

# Note: Rate limits will be applied after blueprint registration in api.py


@bp.post("/api/validate-idea")
@require_auth
def validate_idea() -> Any:
  """Validate a startup idea across 10 key parameters using OpenAI."""
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
  
  # Build explanation from category answers if idea_explanation is empty or very short
  if not idea_explanation or len(idea_explanation) < 10:
    explanation_parts = []
    for key, value in category_answers.items():
      if value:
        explanation_parts.append(f"{key.replace('_', ' ').title()}: {value}")
    if explanation_parts:
      idea_explanation = "\n".join(explanation_parts)
    elif not idea_explanation:
      idea_explanation = "No detailed explanation provided."
  
  # Final check - ensure we have something to validate
  if not idea_explanation or len(idea_explanation.strip()) < 5:
    return jsonify({"success": False, "error": "Please provide category answers or idea explanation"}), 400
  
  try:
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    # Get user's latest intake data from their most recent run
    user_intake = {}
    latest_run = UserRun.query.filter_by(user_id=user.id).order_by(UserRun.created_at.desc()).first()
    if latest_run and latest_run.inputs:
      try:
        if isinstance(latest_run.inputs, str):
          user_intake = json.loads(latest_run.inputs)
        else:
          user_intake = latest_run.inputs
      except (json.JSONDecodeError, TypeError):
        current_app.logger.warning(f"Failed to parse user intake data for user {user.id}")
        user_intake = {}
    
    # Build context from category answers and user intake
    context_parts = []
    
    # Add user intake data if available
    if user_intake:
      intake_fields = {
        "goal_type": "Goal Type",
        "time_commitment": "Time Commitment",
        "budget_range": "Budget Range",
        "interest_area": "Interest Area",
        "sub_interest_area": "Sub-Interest Area",
        "work_style": "Work Style",
        "skill_strength": "Skill Strength",
        "experience_summary": "Experience Summary"
      }
      for key, label in intake_fields.items():
        if user_intake.get(key):
          context_parts.append(f"{label}: {user_intake[key]}")
    
    # Add category answers
    for key, value in category_answers.items():
      context_parts.append(f"{key.replace('_', ' ').title()}: {value}")
    
    context = "\n".join(context_parts) if context_parts else "No additional context provided."
    
    validation_prompt = f"""You are a critical, experienced startup advisor with a track record of identifying fatal flaws in startup ideas. Your role is to be brutally honest and rigorous in your assessment. Most ideas fail—your job is to identify why THIS idea might fail before the founder wastes time and money.

CRITICAL EVALUATION FRAMEWORK:
- Be skeptical. Assume the idea will fail unless proven otherwise.
- Score conservatively. Only give high scores (8-10) if the idea demonstrates exceptional strength with clear evidence.
- Give medium scores (5-7) for ideas with potential but significant gaps or risks.
- Give low scores (0-4) for ideas with fundamental flaws, weak market signals, or execution risks.
- Average scores should typically fall between 4-7 unless the idea is truly exceptional.
- Consider the founder's profile (goal, time commitment, budget, skills) when assessing feasibility and fit.

Founder Profile & Context:
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
    
    # Validate that we got meaningful validation results
    if not validation_data or not isinstance(validation_data, dict):
      return jsonify({
        "success": False,
        "error": "We couldn't analyze your idea properly. Please provide more details about your idea and try again.",
        "error_type": "invalid_response",
      }), 422
    
    # Check if we have the essential validation data
    has_score = "overall_score" in validation_data or "score" in validation_data
    has_parameters = "parameters" in validation_data or "analysis" in validation_data
    has_recommendations = "recommendations" in validation_data or "details" in validation_data
    
    # Check if the content is meaningful (not just empty/default)
    content_meaningful = False
    if has_recommendations:
      recs = validation_data.get("recommendations", "") or validation_data.get("details", "")
      if isinstance(recs, str) and len(recs.strip()) > 50:
        content_meaningful = True
      elif isinstance(recs, dict) and len(str(recs)) > 50:
        content_meaningful = True
    
    if not has_score and not has_parameters and not content_meaningful:
      return jsonify({
        "success": False,
        "error": "We couldn't generate a complete validation for your idea. Please provide more specific details about your business idea, target market, and value proposition.",
        "error_type": "incomplete_validation",
        "suggestion": "Try including more details about: what problem you're solving, who your target customers are, how your solution works, and what makes it unique.",
      }), 422
    
    # Check if the idea explanation itself is too vague/nonsensical
    if len(idea_explanation.strip()) < 20:
      return jsonify({
        "success": False,
        "error": "Your idea description is too brief or unclear. Please provide a more detailed explanation of your business idea, including what problem it solves and how it works.",
        "error_type": "insufficient_detail",
        "suggestion": "Aim for at least 50-100 words describing your idea, target customers, and how it works.",
      }), 400
    
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
      # Refresh session activity after long operation completes
      if session:
        session.last_activity = datetime.utcnow()
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
        current_app.logger.warning(f"Failed to send validation ready email: {e}")
    
    return jsonify({
      "success": True,
      "validation_id": validation_id,
      "validation": validation_data,
    })
    
  except Exception as exc:
    current_app.logger.exception("Idea validation failed: %s", exc)
    return jsonify({
      "success": False,
      "error": str(exc),
    }), 500

