"""
Market Research Tools for Startup Idea Crew
Provides tools for researching markets, trends, and competition - AI-powered for personalized insights
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


@tool("Market Research Tool")
def research_market_trends(
    topic: str, 
    market_segment: str = "",
    user_profile: Optional[Dict[str, Any]] = None
) -> str:
    """
    Research current market trends and opportunities for a specific topic using AI.
    Generates personalized market insights tied to the specific idea.
    
    Args:
        topic: The topic or industry to research (e.g., "AI healthcare solutions", "SaaS productivity tools") (required)
        market_segment: Specific market segment to focus on (optional)
        user_profile: Dictionary with user profile data (optional)
    
    Returns:
        A comprehensive, personalized analysis of market trends, opportunities, and insights
    """
    # Ensure topic is a string
    if isinstance(topic, dict):
        topic = str(topic)
    topic = str(topic).strip()
    
    if not topic:
        return "Error: Topic is required for market research."
    
    # Handle optional parameters
    if not market_segment or (isinstance(market_segment, str) and market_segment.strip() == ""):
        market_segment = "To be determined based on analysis"
    else:
        market_segment = str(market_segment).strip()
    
    # Build context
    context = ""
    if user_profile and isinstance(user_profile, dict):
        if user_profile.get("budget_range"):
            context += f"\nBudget Context: {user_profile.get('budget_range')}"
        if user_profile.get("time_commitment"):
            context += f"\nTime Context: {user_profile.get('time_commitment')}"
    
    # Create AI prompt for personalized market research
    prompt = f"""Research market trends and opportunities for THIS specific topic. Provide real, specific insights, not generic trends that could apply to any startup.

Topic/Idea: {topic}
Market Segment: {market_segment}
{context}

IMPORTANT: Generate insights that are:
1. SPECIFIC to {topic} - not generic "technology adoption" trends
2. CURRENT and relevant - actual trends happening now in this space
3. ACTIONABLE - opportunities the founder can actually pursue
4. REAL - based on actual market dynamics, not theoretical

Your response MUST follow this EXACT format:

MARKET RESEARCH SUMMARY: {topic}
{'=' * 60}

Market Segment: {market_segment}

Current Market Trends (specific to {topic}):
- [Trend #1]: [Specific trend happening in THIS market, not generic]
- [Trend #2]: [Another specific trend for THIS topic]
- [Trend #3]: [Current development or shift in THIS space]
- [At least 3-4 specific trends]

Market Opportunities (specific to {topic}):
1. [Opportunity #1]: [Specific opportunity tied to THIS topic, not generic]
2. [Opportunity #2]: [Another specific opportunity for THIS market]
3. [Opportunity #3]: [Specific niche or gap in THIS space]
4. [At least 3-4 specific opportunities]

Market Challenges (specific to {topic}):
- [Challenge #1]: [Specific challenge for THIS market/idea]
- [Challenge #2]: [Another specific challenge]
- [At least 2-3 specific challenges]

Key Insights (actionable for THIS topic):
- [Insight #1]: [Specific insight about THIS market]
- [Insight #2]: [Actionable insight for THIS topic]
- [At least 2-3 specific insights]

Growth Indicators:
- [Specific growth signal #1 for THIS market]
- [Specific growth signal #2]
- [Why NOW is a good/bad time for THIS idea]

RECOMMENDATION: [Specific recommendation for THIS topic/market - should focus on what makes sense for this particular idea, not generic startup advice]
"""

    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert market researcher. Provide specific, current market insights tied to each unique topic. Avoid generic trends - focus on what's actually happening in THIS specific market. Be specific about companies, technologies, and trends relevant to the topic."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        
        research_content = response.choices[0].message.content.strip()
        return research_content
        
    except Exception as e:
        # Fallback message if AI call fails
        return f"""MARKET RESEARCH SUMMARY: {topic}
{'=' * 60}

Market Segment: {market_segment}

Error: Unable to generate personalized market research at this time. Please try again or contact support.

Note: AI-powered market research requires OPENAI_API_KEY to be configured.
Error details: {str(e)}

Generic Market Considerations:
- Research current market size and growth trends for {topic}
- Identify emerging opportunities and gaps
- Analyze competitive landscape
- Assess market timing and readiness
"""


@tool("Competitive Analysis Tool")
def analyze_competitors(
    startup_idea: str, 
    industry: str = "",
    user_profile: Optional[Dict[str, Any]] = None
) -> str:
    """
    Analyze ACTUAL competitors in the market for a given startup idea using AI.
    Generates specific competitor names and analysis, not generic categories.
    
    Args:
        startup_idea: Brief description of the startup idea (required)
        industry: Industry category (optional)
        user_profile: Dictionary with user profile data (optional)
    
    Returns:
        Analysis of actual competitors with specific names, strengths, weaknesses, and market positioning
    """
    # Ensure startup_idea is a string
    if isinstance(startup_idea, dict):
        startup_idea = str(startup_idea)
    startup_idea = str(startup_idea).strip()
    
    if not startup_idea:
        return "Error: Startup idea is required for competitive analysis."
    
    # Handle optional parameters
    if not industry or (isinstance(industry, str) and industry.strip() == ""):
        industry = "To be determined based on idea analysis"
    else:
        industry = str(industry).strip()
    
    # Build context
    context = ""
    if user_profile and isinstance(user_profile, dict):
        if user_profile.get("budget_range"):
            context += f"\nBudget Context: {user_profile.get('budget_range')}"
    
    # Create AI prompt for personalized competitive analysis
    prompt = f"""Analyze ACTUAL competitors for THIS specific startup idea. List real competitor names and companies, not generic categories.

Startup Idea: {startup_idea}
Industry: {industry}
{context}

CRITICAL REQUIREMENTS:
1. List ACTUAL competitor names/companies (e.g., "Stripe", "Shopify", "Zoom", not "Established Players")
2. Provide SPECIFIC analysis for each competitor mentioned
3. Identify real market gaps and opportunities for THIS idea
4. Analyze how THIS idea can differentiate from actual competitors
5. Be specific about what makes each competitor strong/weak

Your response MUST follow this EXACT format:

COMPETITIVE ANALYSIS: {startup_idea}
{'=' * 60}

Industry: {industry}

Direct Competitors (ACTUAL companies/products):

1. [Actual Competitor Name/Company]:
   - Product/Service: [What they offer]
   - Strengths: [Specific strengths relevant to THIS idea]
   - Weaknesses: [Specific weaknesses relevant to THIS idea]
   - Pricing: [If known, their pricing model]
   - Market Position: [How they position themselves]

2. [Actual Competitor Name/Company]:
   - Product/Service: [What they offer]
   - Strengths: [Specific strengths]
   - Weaknesses: [Specific weaknesses]
   - Pricing: [If known]
   - Market Position: [Their position]

[Include 2-4 actual competitors. If you don't know specific competitors, mention the types/approaches and what to look for]

Competitive Landscape (specific to {startup_idea}):
- Market Competition Level: [High/Medium/Low] - [Explain why for THIS idea]
- Barriers to Entry: [Specific barriers for THIS idea]
- Differentiation Opportunities: [Specific ways THIS idea can stand out]

Market Gaps (specific opportunities for THIS idea):
1. [Gap #1]: [Specific gap in competitor offerings that THIS idea could fill]
2. [Gap #2]: [Another specific opportunity]
3. [At least 2-3 specific gaps]

Competitive Advantages to Pursue (for THIS idea):
- [Advantage #1]: [How THIS idea can compete]
- [Advantage #2]: [Specific differentiation strategy]
- [At least 2-3 specific advantages]

How to Differentiate:
- [Specific strategy #1 for THIS idea to stand out]
- [Specific strategy #2]
- [At least 2-3 actionable differentiation strategies]

RECOMMENDATION: [Specific recommendation for competing in THIS market with THIS idea. What should the founder focus on given these actual competitors?]
"""

    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert competitive analyst. Identify ACTUAL competitor companies and products for each startup idea. Provide specific competitor names, not generic categories. Be specific about how each competitor relates to the idea being analyzed."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        
        competitor_content = response.choices[0].message.content.strip()
        return competitor_content
        
    except Exception as e:
        # Fallback message if AI call fails
        return f"""COMPETITIVE ANALYSIS: {startup_idea}
{'=' * 60}

Industry: {industry}

Error: Unable to generate personalized competitive analysis at this time. Please try again or contact support.

Note: AI-powered competitive analysis requires OPENAI_API_KEY to be configured.
Error details: {str(e)}

Generic Competitive Considerations:
- Research actual competitors in this space
- Analyze their strengths and weaknesses
- Identify market gaps and opportunities
- Develop differentiation strategy
"""


@tool("Market Size Estimator")
def estimate_market_size(
    topic: str, 
    target_audience: str = "",
    user_profile: Optional[Dict[str, Any]] = None
) -> str:
    """
    Estimate the addressable market size for a startup idea using AI.
    Generates actual market size numbers, not placeholder text.
    
    Args:
        topic: The startup idea or product category (required)
        target_audience: The target customer segment (optional)
        user_profile: Dictionary with user profile data (optional)
    
    Returns:
        Market size estimation with actual TAM, SAM, and SOM numbers
    """
    # Ensure topic is a string
    if isinstance(topic, dict):
        topic = str(topic)
    topic = str(topic).strip()
    
    if not topic:
        return "Error: Topic is required for market size estimation."
    
    # Handle optional parameters
    if not target_audience or (isinstance(target_audience, str) and target_audience.strip() == ""):
        target_audience = "To be determined based on analysis"
    else:
        target_audience = str(target_audience).strip()
    
    # Build context
    context = ""
    if user_profile and isinstance(user_profile, dict):
        if user_profile.get("budget_range"):
            context += f"\nBudget Context: {user_profile.get('budget_range')}"
    
    # Create AI prompt for personalized market size estimation
    prompt = f"""Estimate the ACTUAL market size for THIS specific startup idea. Provide real numbers, not placeholders like "$X billion".

Topic/Idea: {topic}
Target Audience: {target_audience}
{context}

CRITICAL REQUIREMENTS:
1. Provide ACTUAL market size estimates in dollars (e.g., "$5.2 billion", "$120 million", not "$X billion")
2. Base estimates on realistic market analysis for THIS specific idea
3. Break down TAM, SAM, and SOM with actual numbers
4. Explain the reasoning behind each estimate
5. Be realistic - not overly optimistic or pessimistic

Your response MUST follow this EXACT format:

MARKET SIZE ESTIMATION: {topic}
{'=' * 60}

Target Audience: {target_audience}

Market Size Breakdown:

1. TAM (Total Addressable Market):
   - Global market size: $[ACTUAL NUMBER] billion/million (e.g., "$5.2 billion" or "$120 million")
   - Market Definition: [Explain what market this represents - be specific to THIS idea]
   - Calculation Basis: [Brief explanation of how this number was estimated]
   - Represents: Total revenue opportunity if 100% market share achieved

2. SAM (Serviceable Addressable Market):
   - Realistic target market: $[ACTUAL NUMBER] million/billion
   - Geographic Scope: [Specific regions/countries for THIS idea]
   - Customer Segments: [Specific segments that can realistically be served]
   - Calculation Basis: [Explain how SAM was calculated from TAM]
   - Represents: Portion of TAM that can realistically be served

3. SOM (Serviceable Obtainable Market):
   - Realistic first-year target: $[ACTUAL NUMBER] million
   - Market Share Assumption: [X% of SAM - typically 1-5% for new startups]
   - Timeline: [First 1-3 years]
   - Calculation Basis: [Explain how SOM was calculated]
   - Represents: Realistic market share that can be captured initially

Market Growth Rate:
- Estimated CAGR: [ACTUAL PERCENTAGE]% annually (e.g., "18% annually", not "15-25%")
- Growth Drivers: [Specific factors driving growth in THIS market]
- Market Timing: [Is this a good/bad time to enter THIS market? Why?]

Market Characteristics (specific to THIS idea):
- Market Maturity: [Mature/Growing/Emerging] - [Explain why for THIS idea]
- Customer Willingness to Pay: [High/Medium/Low] - [Explain for THIS idea]
- Market Fragmentation: [High/Medium/Low] - [Explain for THIS idea]
- Barriers to Entry: [High/Medium/Low] - [Specific barriers for THIS idea]

Validation Needed:
- [What market research is needed to validate these estimates]
- [How to verify market size assumptions]

RECOMMENDATION: [Specific recommendation based on THIS market size - is it sufficient? What should the founder focus on given these numbers?]
"""

    try:
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert market analyst. Provide actual market size estimates in dollars (not placeholders) for each unique startup idea. Base estimates on realistic market analysis. Be specific with numbers and explain your reasoning."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.6,  # Lower temperature for more consistent numbers
            max_tokens=2000,
        )
        
        market_size_content = response.choices[0].message.content.strip()
        return market_size_content
        
    except Exception as e:
        # Fallback message if AI call fails
        return f"""MARKET SIZE ESTIMATION: {topic}
{'=' * 60}

Target Audience: {target_audience}

Error: Unable to generate personalized market size estimation at this time. Please try again or contact support.

Note: AI-powered market size estimation requires OPENAI_API_KEY to be configured.
Error details: {str(e)}

Generic Market Size Framework:
- TAM: Total addressable market - calculate based on all potential customers
- SAM: Serviceable addressable market - portion of TAM you can realistically serve
- SOM: Serviceable obtainable market - realistic first 1-3 year target (typically 1-5% of SAM)

Research needed:
- Industry reports (IBISWorld, Statista, Gartner)
- Market research data
- Competitor analysis
- Customer segment sizing
"""

