"""
Customer Analysis Tools for Startup Idea Crew
Tools for customer persona generation and analysis - AI-powered for personalized insights
"""

from crewai.tools import tool
from openai import OpenAI
import os
from typing import Optional, Dict, Any


def _get_openai_client() -> OpenAI:
    """Get OpenAI client with API key from environment."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    return OpenAI(api_key=api_key)


@tool("Customer Persona Generator")
def generate_customer_persona(
    startup_idea: str, 
    target_market: str = "",
    user_profile: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate detailed, personalized customer personas for a startup idea using AI.
    
    Args:
        startup_idea: Description of the startup idea (required)
        target_market: Target market or customer segment (optional, can be empty)
        user_profile: Dictionary with user profile data (goal_type, budget_range, time_commitment, skill_strength, etc.)
    
    Returns:
        Detailed, personalized customer persona profiles
    """
    # Ensure startup_idea is a string
    if isinstance(startup_idea, dict):
        startup_idea = str(startup_idea)
    startup_idea = str(startup_idea).strip()
    
    if not startup_idea:
        return "Error: Startup idea is required for persona generation."
    
    # Handle empty string for optional parameter
    if not target_market or (isinstance(target_market, str) and target_market.strip() == ""):
        target_market = "To be determined based on idea analysis"
    else:
        target_market = str(target_market).strip()
    
    # Build user profile context
    profile_context = ""
    if user_profile and isinstance(user_profile, dict):
        profile_parts = []
        if user_profile.get("goal_type"):
            profile_parts.append(f"Goal: {user_profile.get('goal_type')}")
        if user_profile.get("budget_range"):
            profile_parts.append(f"Budget: {user_profile.get('budget_range')}")
        if user_profile.get("time_commitment"):
            profile_parts.append(f"Time Available: {user_profile.get('time_commitment')}")
        if user_profile.get("skill_strength"):
            profile_parts.append(f"Skills: {user_profile.get('skill_strength')}")
        if user_profile.get("work_style"):
            profile_parts.append(f"Work Style: {user_profile.get('work_style')}")
        if user_profile.get("interest_area"):
            profile_parts.append(f"Interest Area: {user_profile.get('interest_area')}")
        
        if profile_parts:
            profile_context = "\n".join(profile_parts)
    
    # Create AI prompt for personalized persona generation
    prompt = f"""Generate a detailed, SPECIFIC customer persona analysis for this startup idea. The persona must be tailored to THIS exact idea, not generic startup personas.

Startup Idea: {startup_idea}

Target Market: {target_market}

Founder Profile Context:
{profile_context if profile_context else "No specific founder constraints provided"}

IMPORTANT: Create personas that are:
1. SPECIFIC to this exact startup idea - not generic "25-45 age" personas that could apply to any startup
2. REALISTIC based on the founder's constraints (budget, time, skills)
3. ACTIONABLE with concrete demographics that can be used for marketing
4. DIFFERENT from generic templates - make them unique to this idea

Your response MUST follow this exact structure:

CUSTOMER PERSONA ANALYSIS
{'=' * 60}

Startup Idea: {startup_idea}
Target Market: {target_market}

Primary Customer Persona:

Demographics:
- Age: [SPECIFIC age range relevant to THIS idea]
- Location: [Specific locations where these customers are]
- Education: [Relevant education level for THIS idea]
- Income: [Income range that makes sense for THIS product/service]
- Occupation: [Specific job types or roles relevant to THIS idea]
- Other relevant demographics: [Any other specific traits]

Psychographics:
- Values: [Values specific to customers of THIS idea]
- Interests: [Interests that connect to THIS idea]
- Lifestyle: [How their lifestyle relates to THIS solution]
- Attitudes: [Attitudes towards this type of solution]

Pain Points (SPECIFIC to this idea):
1. [Specific pain point #1 related to this idea]
2. [Specific pain point #2 related to this idea]
3. [Specific pain point #3 related to this idea]
4. [At least 3-5 specific pain points]

Goals & Motivations (specific to this solution):
- [Goal #1]
- [Goal #2]
- [At least 3-5 specific goals]

Behavior Patterns:
- [How they research this type of solution]
- [Where they look for solutions]
- [What influences their decisions]
- [How they prefer to buy/engage]

Preferred Channels:
- [Specific channels relevant to THIS idea's customers]
- [Where they discover solutions]
- [Where they engage with brands]

Buying Process:
1. Awareness: [How they discover THIS type of solution]
2. Research: [How they research THIS type of solution]
3. Consideration: [What they evaluate for THIS solution]
4. Trial/Purchase: [How they try/buy THIS solution]
5. Retention: [How they stay engaged with THIS solution]

Secondary Personas (if relevant):
[Include 1-2 secondary personas ONLY if they make sense for THIS specific idea. Don't force generic B2B/Enterprise personas if they don't apply.]

Customer Journey Mapping (specific to this idea):
Stage 1: Awareness - [Specific to this idea]
Stage 2: Consideration - [Specific to this idea]
Stage 3: Trial/Evaluation - [Specific to this idea]
Stage 4: Purchase - [Specific to this idea]
Stage 5: Retention - [Specific to this idea]

Recommendations (tailored to this idea):
1. [Specific recommendation #1]
2. [Specific recommendation #2]
3. [At least 3-5 actionable recommendations]

RECOMMENDATION: [Final recommendation specific to validating and reaching these personas for THIS idea]
"""

    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert in customer persona development and market research. Generate highly specific, personalized customer personas that are tailored to each unique startup idea. Avoid generic templates and boilerplate content."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        
        persona_content = response.choices[0].message.content.strip()
        return persona_content
        
    except Exception as e:
        # Fallback to a simple message if AI call fails
        return f"""CUSTOMER PERSONA ANALYSIS
{'=' * 60}

Startup Idea: {startup_idea}
Target Market: {target_market}

Error: Unable to generate personalized persona at this time. Please try again or contact support.

Note: AI-powered persona generation requires OPENAI_API_KEY to be configured.
Error details: {str(e)}
"""


@tool("Customer Validation Questions")
def generate_validation_questions(
    startup_idea: str,
    target_market: str = "",
    user_profile: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate personalized customer validation questions for a startup idea using AI.
    
    Args:
        startup_idea: Description of the startup idea
        target_market: Target market or customer segment (optional)
        user_profile: Dictionary with user profile data (optional)
    
    Returns:
        Personalized list of validation questions to ask potential customers
    """
    # Ensure startup_idea is a string
    if isinstance(startup_idea, dict):
        startup_idea = str(startup_idea)
    startup_idea = str(startup_idea).strip()
    
    if not startup_idea:
        return "Error: Startup idea is required for validation question generation."
    
    # Build context
    context_parts = []
    if target_market:
        context_parts.append(f"Target Market: {target_market}")
    
    if user_profile and isinstance(user_profile, dict):
        if user_profile.get("interest_area"):
            context_parts.append(f"Interest Area: {user_profile.get('interest_area')}")
        if user_profile.get("goal_type"):
            context_parts.append(f"Goal: {user_profile.get('goal_type')}")
    
    context = "\n".join(context_parts) if context_parts else "No additional context provided"
    
    # Create AI prompt for personalized validation questions
    prompt = f"""Generate SPECIFIC customer validation questions for this startup idea. The questions must be tailored to THIS exact idea, not generic questions that could apply to any startup.

Startup Idea: {startup_idea}

Additional Context:
{context}

IMPORTANT: Create questions that are:
1. SPECIFIC to this exact idea - mention the actual problem/solution being validated
2. ACTIONABLE - questions that will provide real insights
3. TARGETED - questions that help validate whether THIS specific idea solves THIS specific problem
4. NOT GENERIC - avoid questions like "Have you experienced [specific problem]?" without filling in what the problem actually is

Your response MUST follow this exact structure:

CUSTOMER VALIDATION QUESTIONS
{'=' * 60}

Startup Idea: {startup_idea}

Problem Validation Questions:

1. Problem Recognition (SPECIFIC to this idea):
   - "[Exact question that mentions the specific problem from the idea]"
   - "[Question about frequency/impact specific to this problem]"
   - "[Question about current solutions to THIS specific problem]"
   - "[Question about cost/impact of THIS specific problem]"

2. Current Solution (specific to this problem):
   - "[Question about what they currently use for THIS problem]"
   - "[Question about what they like/dislike in current solutions to THIS problem]"
   - "[Question about gaps in current solutions to THIS problem]"

3. Willingness to Pay (for THIS solution):
   - "[Question about paying for THIS specific solution]"
   - "[Question about pricing for THIS solution type]"
   - "[Question about what would make THIS a must-have]"

4. Product Fit (for THIS idea):
   - "[Question asking if THIS solution concept solves their problem]"
   - "[Question about essential features for THIS solution]"
   - "[Question about barriers to using THIS solution]"

5. Adoption (of THIS solution):
   - "[Question about trying THIS solution]"
   - "[Question about concerns with THIS solution]"
   - "[Question about who needs to approve THIS solution]"

Validation Interview Script (tailored to this idea):

Opening (5 min):
- Thank them for their time
- Explain you're researching [specific problem from idea]
- Ask permission to ask questions
- Emphasize there are no right/wrong answers

Problem Discovery (15 min):
- Ask about their experience with [specific problem]
- Explore how this problem impacts them
- Understand what they currently do
- Identify specific pain points related to THIS problem

Solution Validation (10 min):
- Present your [specific solution concept]
- Ask for honest feedback on THIS solution
- Explore what would make THIS solution valuable
- Identify objections to THIS specific solution

Closing (5 min):
- Ask if they'd be interested in updates about THIS solution
- Request referrals to others with [specific problem]
- Thank them for their time

Red Flags to Watch For:
- Generic responses without specific examples
- "That's interesting" without commitment
- "Maybe I would" without enthusiasm
- Can't provide specific examples of the problem

Green Flags:
- Emotional response to [specific problem]
- Specific stories/examples about [specific problem]
- "I need this now" or "When can I get it?"
- Willingness to pay for THIS solution
- Offers to introduce others with [specific problem]

How Many Interviews?
- Minimum: 10-15 interviews
- Ideal: 20-30 interviews
- Stop when patterns repeat
- Focus on quality over quantity

RECOMMENDATION: Conduct at least 10-15 customer interviews focusing on [specific problem/solution]. Listen carefully and be ready to pivot based on what you learn. The goal is to validate [specific problem], not sell your solution.
"""

    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert in customer validation and startup research. Generate highly specific, actionable validation questions that are tailored to each unique startup idea. Avoid generic questions and fill in placeholders with actual problem/solution details."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=1800,
        )
        
        questions_content = response.choices[0].message.content.strip()
        return questions_content
        
    except Exception as e:
        # Fallback message if AI call fails
        return f"""CUSTOMER VALIDATION QUESTIONS
{'=' * 60}

Startup Idea: {startup_idea}

Error: Unable to generate personalized validation questions at this time. Please try again or contact support.

Note: AI-powered question generation requires OPENAI_API_KEY to be configured.
Error details: {str(e)}
"""

