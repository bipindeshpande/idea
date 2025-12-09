"""
Validation Tools for Startup Idea Crew
Tools to validate startup ideas and check feasibility - AI-powered for personalized insights
"""

from crewai.tools import tool
from openai import OpenAI
import os
import time
from typing import Optional, Dict, Any
import re

# Import cache utility (will work if Flask context is available)
try:
    from app.utils.tool_cache import ToolCache
    CACHE_AVAILABLE = True
except ImportError:
    CACHE_AVAILABLE = False
    ToolCache = None

# Import metrics for tracking
try:
    from app.utils.performance_metrics import record_tool_call
    METRICS_AVAILABLE = True
except ImportError:
    METRICS_AVAILABLE = False
    record_tool_call = None


# Injectable mock client for testing (set via monkeypatch)
_MOCK_OPENAI_CLIENT = None

def _get_openai_client() -> OpenAI:
    """Get OpenAI client with API key from environment or injected mock."""
    # Allow injection of mock client for testing
    if _MOCK_OPENAI_CLIENT is not None:
        return _MOCK_OPENAI_CLIENT
    
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    return OpenAI(api_key=api_key)


@tool("Idea Validation Tool")
def validate_startup_idea(
    idea: str, 
    target_market: str = "", 
    business_model: str = "",
    user_profile: Optional[Dict[str, Any]] = None
) -> str:
    """
    Validate a startup idea using AI to assess feasibility factors specific to THIS idea.
    
    Args:
        idea: Description of the startup idea (required)
        target_market: Target customer market (optional)
        business_model: Proposed business model e.g., SaaS, marketplace, e-commerce (optional)
        user_profile: Dictionary with user profile data (optional)
    
    Returns:
        Personalized validation report with feasibility scores and recommendations
    """
    # Ensure idea is a string
    if isinstance(idea, dict):
        idea = str(idea)
    idea = str(idea).strip()
    
    if not idea:
        return "Error: Startup idea is required for validation."
    
    # Handle optional parameters
    if not target_market or (isinstance(target_market, str) and target_market.strip() == ""):
        target_market = "To be determined based on idea analysis"
    else:
        target_market = str(target_market).strip()
    
    if not business_model or (isinstance(business_model, str) and business_model.strip() == ""):
        business_model = "To be determined based on idea analysis"
    else:
        business_model = str(business_model).strip()
    
    # Build user profile context
    profile_context = ""
    if user_profile and isinstance(user_profile, dict):
        profile_parts = []
        if user_profile.get("goal_type"):
            profile_parts.append(f"Goal: {user_profile.get('goal_type')}")
        if user_profile.get("time_commitment"):
            profile_parts.append(f"Time Commitment: {user_profile.get('time_commitment')}")
        if user_profile.get("budget_range"):
            profile_parts.append(f"Budget: {user_profile.get('budget_range')}")
        if user_profile.get("skill_strength"):
            profile_parts.append(f"Skills: {user_profile.get('skill_strength')}")
        if user_profile.get("work_style"):
            profile_parts.append(f"Work Style: {user_profile.get('work_style')}")
        
        if profile_parts:
            profile_context = "\n".join(profile_parts)
    
    # Create AI prompt for personalized validation
    prompt = f"""Validate THIS specific startup idea. Provide real assessment scores, not generic templates.

Startup Idea: {idea}
Target Market: {target_market}
Business Model: {business_model}

Founder Profile:
{profile_context if profile_context else "No specific founder constraints provided"}

IMPORTANT: Analyze THIS exact idea and provide:
- REAL scores (0-10) based on actual assessment, not always 7-8
- SPECIFIC strengths tied to this idea
- SPECIFIC concerns relevant to this idea
- Actionable recommendations tailored to this idea

Your response MUST follow this EXACT format:

STARTUP IDEA VALIDATION REPORT
{'=' * 60}

Idea: {idea}
Target Market: {target_market}
Business Model: {business_model}

Feasibility Assessment:

1. Problem Validation (Score: [X]/10):
   [✓ or ✗] [Specific assessment: Does THIS idea address a REAL problem? What problem specifically?]
   [✓ or ✗] [Specific assessment: Is THIS problem urgent/painful enough?]
   [?] [What needs validation for THIS specific problem?]
   → Action: [Specific action for THIS idea]

2. Market Feasibility (Score: [X]/10):
   [✓ or ✗] [Specific assessment: What is the market size for THIS idea?]
   [✓ or ✗] [Specific assessment: Are there growth trends for THIS market?]
   [?] [What market research is needed for THIS idea?]
   → Action: [Specific action for THIS idea]

3. Technical Feasibility (Score: [X]/10):
   [✓ or ✗] [Specific assessment: Can THIS idea be built with current tech?]
   [✓ or ✗] [Specific assessment: What technical challenges exist for THIS idea?]
   [?] [What technical expertise is needed for THIS idea?]
   → Action: [Specific technical action for THIS idea]

4. Business Model Viability (Score: [X]/10):
   [✓ or ✗] [Specific assessment: How does THIS idea make money?]
   [✓ or ✗] [Specific assessment: Are unit economics viable for THIS idea?]
   [?] [What needs validation for THIS business model?]
   → Action: [Specific action for THIS business model]

5. Competitive Position (Score: [X]/10):
   [✓ or ✗] [Specific assessment: Who are competitors for THIS idea?]
   [✓ or ✗] [Specific assessment: What differentiation exists for THIS idea?]
   [?] [What competitive risks exist for THIS idea?]
   → Action: [Specific action to improve competitive position]

Overall Feasibility Score: [X.X]/10

Strengths (specific to THIS idea):
- [Strength #1 specific to this idea]
- [Strength #2 specific to this idea]
- [At least 2-3 specific strengths]

Risks & Concerns (specific to THIS idea):
- [Concern #1 specific to this idea]
- [Concern #2 specific to this idea]
- [At least 2-3 specific concerns]

Next Steps for Validation (specific to THIS idea):
1. [Specific action #1 for this idea]
2. [Specific action #2 for this idea]
3. [At least 3-5 specific next steps]

RECOMMENDATION: [Specific recommendation for THIS idea - should this founder pursue it given their constraints?]
"""

    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert startup validator. Provide real, specific assessments for each unique idea. Don't use generic scores - actually evaluate each idea based on its merits and risks. Be honest and specific."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        
        validation_content = response.choices[0].message.content.strip()
        return validation_content
        
    except Exception as e:
        # Fallback message if AI call fails
        return f"""STARTUP IDEA VALIDATION REPORT
{'=' * 60}

Idea: {idea}
Target Market: {target_market}
Business Model: {business_model}

Error: Unable to generate personalized validation at this time. Please try again or contact support.

Note: AI-powered validation requires OPENAI_API_KEY to be configured.
Error details: {str(e)}

Generic Assessment:
- This idea requires validation across problem, market, technical, business model, and competitive factors.
- Conduct customer interviews to validate the problem.
- Research market size and competition.
- Assess technical feasibility based on available skills/resources.
- Validate business model and unit economics.
"""


@tool("Domain Availability Checker")
def check_domain_availability(business_name: str) -> str:
    """
    Check domain name availability and suggest alternatives.
    Note: This is a mock implementation. In production, you'd integrate 
    with a domain API like Namecheap, GoDaddy, or similar.
    
    Args:
        business_name: The business or startup name to check (required)
    
    Returns:
        Domain availability report with suggestions
    """
    # Ensure business_name is a string
    if isinstance(business_name, dict):
        business_name = str(business_name)
    business_name = str(business_name).strip()
    
    # In a real implementation, this would call a domain API
    # For now, this provides a template for the response
    
    # Clean the business name for domain checking
    domain_name = re.sub(r'[^a-zA-Z0-9]', '', business_name.lower())
    
    domain_report = f"""
    DOMAIN AVAILABILITY CHECK: {business_name}
    {'=' * 60}
    
    Primary Domain: {domain_name}.com
    Status: Check required via domain registrar
    
    Suggested Domain Variations:
    1. {domain_name}.com - Primary (check availability)
    2. {domain_name}.io - Tech-focused alternative
    3. {domain_name}app.com - App-focused
    4. get{domain_name}.com - Action-oriented
    5. {domain_name}.co - Modern alternative
    
    Domain Selection Tips:
    - Keep it short and memorable
    - Avoid hyphens and numbers
    - Check social media handle availability
    - Consider .io, .co, or industry-specific TLDs
    - Ensure it's easy to spell and pronounce
    
    Next Steps:
    1. Check availability on Namecheap, GoDaddy, or similar
    2. Secure the domain early if available
    3. Check social media handle availability (Twitter, Instagram, etc.)
    4. Consider trademark search
    
    NOTE: This is a mock check. Always verify domain availability 
    through an actual domain registrar before making decisions.
    """
    
    return domain_report.strip()


@tool("Risk Assessment Tool")
def assess_startup_risks(
    idea: str, 
    time_commitment: str = "", 
    financial_resources: str = "",
    user_profile: Optional[Dict[str, Any]] = None
) -> str:
    """
    Assess SPECIFIC risks associated with a startup idea using AI.
    Generates idea-specific risks with severity ratings and actionable mitigation strategies.
    
    Args:
        idea: Description of the startup idea (required)
        time_commitment: Available time commitment (optional)
        financial_resources: Available financial resources (optional)
        user_profile: Dictionary with user profile data (goal_type, skill_strength, work_style, etc.)
    
    Returns:
        Specific risk assessment with mitigation strategies formatted for Risk Radar section
    """
    # Ensure idea is a string
    if isinstance(idea, dict):
        idea = str(idea)
    idea = str(idea).strip()
    
    if not idea:
        return "Error: Startup idea is required for risk assessment."
    
    # Handle optional parameters
    if not time_commitment or (isinstance(time_commitment, str) and time_commitment.strip() == ""):
        time_commitment = "Not specified"
    else:
        time_commitment = str(time_commitment).strip()
    
    if not financial_resources or (isinstance(financial_resources, str) and financial_resources.strip() == ""):
        financial_resources = "Not specified"
    else:
        financial_resources = str(financial_resources).strip()
    
    # Build user profile context
    profile_context = ""
    if user_profile and isinstance(user_profile, dict):
        profile_parts = []
        if user_profile.get("skill_strength"):
            profile_parts.append(f"Skill Strength: {user_profile.get('skill_strength')}")
        if user_profile.get("work_style"):
            profile_parts.append(f"Work Style: {user_profile.get('work_style')}")
        if user_profile.get("budget_range"):
            profile_parts.append(f"Budget: {user_profile.get('budget_range')}")
        if user_profile.get("goal_type"):
            profile_parts.append(f"Goal: {user_profile.get('goal_type')}")
        
        if profile_parts:
            profile_context = "\n".join(profile_parts)
    
    # Create AI prompt for specific risk generation
    prompt = f"""Generate SPECIFIC, ACTIONABLE risks for this startup idea. Each risk must be tied to THIS exact idea, not generic startup risks.

Startup Idea: {idea}

Constraints & Profile:
- Time Commitment: {time_commitment}
- Financial Resources: {financial_resources}
{profile_context if profile_context else ""}

CRITICAL REQUIREMENTS:
1. Generate 4-6 SPECIFIC risks tied to THIS exact idea
2. Each risk must explain HOW it affects THIS idea given the user's constraints
3. Provide actionable mitigation steps with specific tools/platforms
4. Avoid generic risks like "market saturation" - explain HOW it affects THIS idea
5. Format each risk exactly as shown below

Your response MUST follow this EXACT format:

    STARTUP RISK ASSESSMENT
    {'=' * 60}
    
    Idea: {idea}

SPECIFIC RISKS:

1. [Risk Name] (Severity: Low/Medium/High):
   Explanation: [HOW this risk specifically affects THIS idea. Reference the idea name and explain the specific impact given the user's constraints (time: {time_commitment}, budget: {financial_resources}). Be specific about what could go wrong.]
   Mitigation: [Concrete action steps with specific tools/platforms/approaches. Example: "Start with [specific tool] to validate before building custom solutions. Use [specific platform] for initial MVP."]

2. [Risk Name] (Severity: Low/Medium/High):
   Explanation: [Specific explanation for THIS idea]
   Mitigation: [Specific mitigation steps]

[Continue for 4-6 risks total]

Example of GOOD risk format:
1. Technical Complexity Risk (Severity: High):
   Explanation: Building an AI chatbot for {idea} requires NLP expertise that may be beyond your current skill level. The time constraint of {time_commitment} means you'll struggle to learn these skills while building, which could delay launch by 6+ months.
   Mitigation: Start with no-code tools like Botpress or Dialogflow to validate the concept. Build a basic MVP in 2 weeks using pre-trained models, then iterate. Consider partnering with an NLP specialist for advanced features.

Example of BAD risk (avoid this):
- Market saturation (Medium): Focus on a niche market

Generate risks that are:
- SPECIFIC to {idea}
- Tied to the constraints (time: {time_commitment}, budget: {financial_resources})
- ACTIONABLE with concrete mitigation steps
- REALISTIC about what could go wrong

Focus on risks that matter for THIS idea, not generic startup risks.
"""

    tool_start_time = time.time()
    tool_name = "assess_startup_risks"
    
    # NEVER cache risk assessment - it uses user-specific context:
    # - time_commitment (personal constraint)
    # - financial_resources (personal constraint)
    # - user_profile (goal_type, skill_strength, work_style, budget_range - all personal)
    # Risk assessment is personalized to the user's specific situation
    
    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert risk analyst for startups. Generate specific, actionable risks tied to each unique startup idea. Avoid generic risks - focus on what could go wrong with THIS specific idea given the founder's constraints."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        
        risk_content = response.choices[0].message.content.strip()
        
        # NEVER cache risk assessment - it's personalized to user's constraints and profile
        # (time_commitment, financial_resources, work_style, goal_type, etc.)
        
        duration = time.time() - tool_start_time
        if METRICS_AVAILABLE and record_tool_call:
            record_tool_call(tool_name, duration, cache_hit=False, cache_miss=False, params={"idea": idea, "time_commitment": time_commitment})
        
        return risk_content
        
    except Exception as e:
        # Fallback to a structured template if AI call fails
        return f"""STARTUP RISK ASSESSMENT
{'=' * 60}

Idea: {idea}
Time Commitment: {time_commitment}
Financial Resources: {financial_resources}

Error: Unable to generate personalized risk assessment at this time. Please try again or contact support.

Note: AI-powered risk assessment requires OPENAI_API_KEY to be configured.
Error details: {str(e)}

Generic Risk Categories to Consider:
1. Technical complexity for this specific idea
2. Market timing and competition for THIS solution
3. Resource constraints ({time_commitment} time, {financial_resources} budget)
4. Regulatory/compliance requirements for this idea type
5. Operational challenges unique to this business model
"""

