"""
Market Research Tools for Startup Idea Crew
Provides tools for researching markets, trends, and competition
"""

from crewai.tools import tool


@tool("Market Research Tool")
def research_market_trends(topic: str, market_segment: str = "") -> str:
    """
    Research current market trends and opportunities for a given topic or market segment.
    
    Args:
        topic: The topic or industry to research (e.g., "AI healthcare solutions", "SaaS productivity tools") (required)
        market_segment: Specific market segment to focus on (optional, can be empty)
    
    Returns:
        A comprehensive analysis of market trends, opportunities, and insights
    """
    # Ensure topic is a string
    if isinstance(topic, dict):
        topic = str(topic)
    topic = str(topic).strip()
    
    # Handle empty string for optional parameter
    if not market_segment or (isinstance(market_segment, str) and market_segment.strip() == ""):
        market_segment = "General Market"
    else:
        market_segment = str(market_segment).strip()
    
    # In a real implementation, this would call external APIs like:
    # - Google Trends API
    # - Market research APIs (Gartner, Forrester)
    # - News APIs for recent developments
    # - Industry reports
    
    research_summary = f"""
    MARKET RESEARCH SUMMARY: {topic}
    {'=' * 60}
    
    Market Segment: {market_segment}
    
    Current Market Trends:
    - Growing demand for {topic.lower()} solutions
    - Increased adoption of technology in this space
    - Shift towards personalized and AI-powered solutions
    - Rising investor interest in innovative startups
    
    Market Opportunities:
    1. Emerging niche segments with less competition
    2. Integration opportunities with existing platforms
    3. B2B opportunities with enterprise clients
    4. Consumer-focused solutions with subscription models
    
    Market Challenges:
    - Regulatory considerations
    - High competition in saturated segments
    - Need for significant upfront investment
    - Customer acquisition costs
    
    Key Insights:
    - The market is showing strong growth potential
    - Early movers have advantages in establishing market presence
    - Focus on differentiation and unique value proposition
    - Consider partnerships to accelerate growth
    
    RECOMMENDATION: This market appears viable for a startup, especially if you can 
    identify a specific niche or underserved segment. Focus on validating your 
    unique value proposition with early customers.
    """
    
    return research_summary.strip()


@tool("Competitive Analysis Tool")
def analyze_competitors(startup_idea: str, industry: str = "") -> str:
    """
    Analyze competitors in the market for a given startup idea.
    
    Args:
        startup_idea: Brief description of the startup idea (required)
        industry: Industry category (optional, can be empty)
    
    Returns:
        Analysis of competitors, their strengths, weaknesses, and market positioning
    """
    # Ensure startup_idea is a string
    if isinstance(startup_idea, dict):
        startup_idea = str(startup_idea)
    startup_idea = str(startup_idea).strip()
    
    # Handle empty string for optional parameter
    if not industry or (isinstance(industry, str) and industry.strip() == ""):
        industry = "General"
    else:
        industry = str(industry).strip()
    
    # In a real implementation, this would:
    # - Search for similar products/services
    # - Analyze competitor websites and offerings
    # - Check app stores, product directories
    # - Review funding and market presence
    
    competitor_analysis = f"""
    COMPETITIVE ANALYSIS: {startup_idea}
    {'=' * 60}
    
    Industry: {industry}
    
    Direct Competitors:
    1. Established Players:
       - Market leaders with significant market share
       - Strong brand recognition and customer base
       - Well-funded with extensive resources
       - Strengths: Brand, resources, customer base
       - Weaknesses: Slower innovation, higher prices
    
    2. Emerging Startups:
       - Recent entrants with innovative approaches
       - Focused on specific niches
       - Agility and speed advantages
       - Strengths: Innovation, flexibility
       - Weaknesses: Limited resources, unproven track record
    
    Competitive Landscape:
    - Market is moderately competitive
    - Opportunities exist in underserved segments
    - Differentiation through unique features is key
    - Customer service and user experience can be differentiators
    
    Market Gaps:
    - Specific feature gaps in existing solutions
    - Underserved customer segments
    - Price point opportunities
    - Integration opportunities
    
    Competitive Advantages to Consider:
    - Superior user experience
    - Better pricing model
    - Niche focus
    - Technology innovation
    - Superior customer support
    
    RECOMMENDATION: While competition exists, there are clear opportunities 
    for differentiation. Focus on a specific niche first, then expand. 
    Emphasize what makes your solution unique.
    """
    
    return competitor_analysis.strip()


@tool("Market Size Estimator")
def estimate_market_size(topic: str, target_audience: str = "") -> str:
    """
    Estimate the addressable market size for a startup idea.
    
    Args:
        topic: The startup idea or product category (required)
        target_audience: The target customer segment (optional, can be empty)
    
    Returns:
        Market size estimation with TAM, SAM, and SOM breakdown
    """
    # Ensure topic is a string
    if isinstance(topic, dict):
        topic = str(topic)
    topic = str(topic).strip()
    
    # Handle empty string for optional parameter
    if not target_audience or (isinstance(target_audience, str) and target_audience.strip() == ""):
        target_audience = "General Market"
    else:
        target_audience = str(target_audience).strip()
    
    # In a real implementation, this would use market research data
    # from sources like IBISWorld, Statista, industry reports
    
    market_size_estimate = f"""
    MARKET SIZE ESTIMATION: {topic}
    {'=' * 60}
    
    Target Audience: {target_audience}
    
    Market Size Breakdown:
    
    1. TAM (Total Addressable Market):
       - Global market size: $X billion (estimated)
       - Represents the total revenue opportunity if 100% market share achieved
       - Includes all potential customers worldwide
    
    2. SAM (Serviceable Addressable Market):
       - Realistic target market: $Y million (estimated)
       - Represents the portion of TAM you can realistically serve
       - Based on geographic, demographic, and product constraints
    
    3. SOM (Serviceable Obtainable Market):
       - Realistic first-year target: $Z million (estimated)
       - Represents the market share you can capture in first 1-3 years
       - Typically 1-5% of SAM for new startups
    
    Market Growth Rate:
    - Estimated CAGR: 15-25% annually
    - Market is growing, indicating opportunity
    - Timing appears favorable for market entry
    
    Market Characteristics:
    - Market maturity: Growing/Emerging
    - Customer willingness to pay: Moderate to High
    - Market fragmentation: Moderate
    - Barriers to entry: Moderate
    
    RECOMMENDATION: The market size appears sufficient to support a viable 
    startup. Focus on capturing a small but meaningful portion of the SAM 
    in your first few years, then scale.
    """
    
    return market_size_estimate.strip()

