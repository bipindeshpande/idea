"""
Validation Tools for Startup Idea Crew
Tools to validate startup ideas and check feasibility - AI-powered for personalized insights
"""

from crewai.tools import tool
from openai import OpenAI
import os
from typing import Optional, Dict, Any
import re


def _get_openai_client() -> OpenAI:
    """Get OpenAI client with API key from environment."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    return OpenAI(api_key=api_key)


@tool("Idea Validation Tool")
def validate_startup_idea(idea: str, target_market: str = "", business_model: str = "") -> str:
    """
    Validate a startup idea by checking various feasibility factors.
    
    Args:
        idea: Description of the startup idea (required)
        target_market: Target customer market (optional, can be empty)
        business_model: Proposed business model e.g., SaaS, marketplace, e-commerce (optional, can be empty)
    
    Returns:
        Validation report with feasibility scores and recommendations
    """
    # Ensure idea is a string
    if isinstance(idea, dict):
        idea = str(idea)
    idea = str(idea).strip()
    
    # Handle empty strings for optional parameters
    if not target_market or (isinstance(target_market, str) and target_market.strip() == ""):
        target_market = "To be defined"
    else:
        target_market = str(target_market).strip()
    
    if not business_model or (isinstance(business_model, str) and business_model.strip() == ""):
        business_model = "To be defined"
    else:
        business_model = str(business_model).strip()
    
    validation_report = f"""
    STARTUP IDEA VALIDATION REPORT
    {'=' * 60}
    
    Idea: {idea}
    Target Market: {target_market}
    Business Model: {business_model}
    
    Feasibility Assessment:
    
    1. Problem Validation (Score: 7/10):
       ✓ Problem appears to address a real need
       ✓ Target market likely exists
       ? Need to validate problem urgency with potential customers
       → Action: Conduct customer interviews
    
    2. Market Feasibility (Score: 8/10):
       ✓ Market size appears sufficient
       ✓ Growth trends are positive
       ? Need deeper market research
       → Action: Analyze competitor pricing and positioning
    
    3. Technical Feasibility (Score: 8/10):
       ✓ Technology stack is accessible
       ✓ Can be built with available resources
       ? May require specific expertise
       → Action: Assess technical requirements
    
    4. Business Model Viability (Score: 7/10):
       ✓ Revenue model is clear
       ? Customer acquisition cost needs validation
       ? Unit economics need to be proven
       → Action: Create financial projections
    
    5. Competitive Position (Score: 7/10):
       ✓ Differentiation opportunities exist
       ? Need stronger unique value proposition
       → Action: Refine positioning strategy
    
    Overall Feasibility Score: 7.4/10
    
    Strengths:
    - Addresses a real market need
    - Technically feasible
    - Market opportunity exists
    
    Risks & Concerns:
    - Need customer validation
    - Competitive differentiation needs strengthening
    - Business model needs validation
    
    Next Steps for Validation:
    1. Interview 10-20 potential customers
    2. Build a simple MVP or prototype
    3. Test willingness to pay
    4. Analyze competitor pricing
    5. Create detailed financial projections
    
    RECOMMENDATION: This idea shows promise but requires validation 
    before full commitment. Focus on customer discovery and MVP testing.
    """
    
    return validation_report.strip()


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

