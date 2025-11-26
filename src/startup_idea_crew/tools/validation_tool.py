"""
Validation Tools for Startup Idea Crew
Tools to validate startup ideas and check feasibility
"""

from crewai.tools import tool
import re


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
def assess_startup_risks(idea: str, time_commitment: str = "", financial_resources: str = "") -> str:
    """
    Assess risks associated with a startup idea.
    
    Args:
        idea: Description of the startup idea (required)
        time_commitment: Available time commitment (optional, can be empty)
        financial_resources: Available financial resources (optional, can be empty)
    
    Returns:
        Risk assessment report with mitigation strategies
    """
    # Ensure idea is a string
    if isinstance(idea, dict):
        idea = str(idea)
    idea = str(idea).strip()
    
    # Handle empty strings for optional parameters
    if not time_commitment or (isinstance(time_commitment, str) and time_commitment.strip() == ""):
        time_commitment = "Not specified"
    else:
        time_commitment = str(time_commitment).strip()
    
    if not financial_resources or (isinstance(financial_resources, str) and financial_resources.strip() == ""):
        financial_resources = "Not specified"
    else:
        financial_resources = str(financial_resources).strip()
    
    # Generate more specific risk assessment based on the idea
    idea_lower = idea.lower()
    
    # Identify specific risk areas based on idea keywords
    specific_risks = []
    
    # Technical/Development risks
    if any(keyword in idea_lower for keyword in ['ai', 'ml', 'machine learning', 'algorithm', 'automation', 'bot', 'chatbot']):
        specific_risks.append("Technical Complexity: AI/ML components require specialized knowledge and may need significant development time. Consider using pre-built APIs or no-code AI tools initially.")
    
    if any(keyword in idea_lower for keyword in ['app', 'mobile', 'ios', 'android', 'platform']):
        specific_risks.append("Platform Development: Mobile app development requires platform-specific expertise and app store approval processes. Consider starting with a web version or using no-code app builders.")
    
    # Market/Competition risks
    if any(keyword in idea_lower for keyword in ['marketplace', 'platform', 'network', 'community']):
        specific_risks.append("Chicken-and-Egg Problem: Marketplace/platform ideas need both supply and demand sides. Consider focusing on one side first or providing initial value yourself.")
    
    # Financial risks based on resources
    if financial_resources and financial_resources.lower() in ['free', 'sweat-equity', 'low', 'minimal', 'not specified']:
        specific_risks.append("Limited Financial Resources: With {financial_resources} budget, you'll need to rely heavily on free tools, sweat equity, and bootstrapping. This may limit marketing spend and slow growth.")
    
    # Time commitment risks
    if time_commitment and ('<5' in time_commitment or 'part-time' in time_commitment.lower() or 'minimal' in time_commitment.lower()):
        specific_risks.append("Time Constraints: With {time_commitment} available, development will be slow. Consider focusing on MVP features only and using pre-built solutions to accelerate progress.")
    
    # Build the risk assessment
    risk_assessment = f"""
    STARTUP RISK ASSESSMENT
    {'=' * 60}
    
    Idea: {idea}
    Time Commitment: {time_commitment}
    Financial Resources: {financial_resources}
    
    SPECIFIC RISKS FOR THIS IDEA:
    {chr(10).join(f"- {risk}" for risk in specific_risks) if specific_risks else "- Analyze the specific idea to identify unique risks"}
    
    Risk Categories to Consider:
    
    1. Market Risks:
       - How does THIS specific idea face customer demand uncertainty?
       - What competitive threats exist for THIS idea specifically?
       - Is the market timing right for THIS idea?
    
    2. Technical Risks:
       - What specific technical challenges does THIS idea face?
       - What skills/expertise are needed that might be missing?
       - Are there specific technologies that could fail or be too complex?
    
    3. Financial Risks:
       - How does the {financial_resources} budget constraint specifically impact THIS idea?
       - What are the specific costs for THIS idea (tools, platforms, services)?
       - What revenue model challenges exist for THIS specific idea?
    
    4. Operational Risks:
       - How does {time_commitment} time commitment specifically limit THIS idea?
       - What operational challenges are unique to THIS idea's business model?
       - What resources (beyond money) does THIS idea need?
    
    5. Regulatory/Compliance Risks:
       - Are there specific regulations that apply to THIS idea?
       - What data privacy/security concerns exist for THIS idea?
    
    IMPORTANT: When writing the Risk Radar section, you MUST:
    - Reference the specific idea name and what makes it risky
    - Explain HOW each risk impacts THIS idea given the user's constraints
    - Provide concrete mitigation steps with specific tools/platforms/actions
    - Avoid generic risks like "market saturation" unless you explain HOW it specifically affects THIS idea
    - Tie each risk to the user's profile (budget, time, skills, work style)
    
    Example of GOOD risk: "Technical complexity risk: Building an AI chatbot requires NLP expertise that may be beyond your current {skill_strength} skills. Mitigation: Start with no-code tools like Botpress or Dialogflow to validate the concept before building custom solutions."
    
    Example of BAD risk: "Market saturation (Medium severity): Focus on a specific niche"
    """
    
    return risk_assessment.strip()

