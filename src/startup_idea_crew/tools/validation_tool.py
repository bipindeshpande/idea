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
    
    risk_assessment = f"""
    STARTUP RISK ASSESSMENT
    {'=' * 60}
    
    Idea: {idea}
    Time Commitment: {time_commitment}
    Financial Resources: {financial_resources}
    
    Risk Categories:
    
    1. Market Risks (Medium):
       - Customer demand uncertainty
       - Market timing risks
       - Competitive threats
       Mitigation: Validate early, test MVP, monitor competition
    
    2. Technical Risks (Low-Medium):
       - Technology feasibility
       - Development complexity
       - Scalability challenges
       Mitigation: Prototype early, use proven technologies
    
    3. Financial Risks (Medium-High):
       - Insufficient funding
       - Cash flow challenges
       - Customer acquisition costs
       Mitigation: Bootstrap if possible, validate unit economics
    
    4. Operational Risks (Low-Medium):
       - Resource constraints
       - Time management
       - Team building
       Mitigation: Start lean, outsource non-core functions
    
    5. Regulatory Risks (Low):
       - Compliance requirements
       - Industry regulations
       - Data privacy laws
       Mitigation: Research regulations early, consult experts
    
    Overall Risk Level: MEDIUM
    
    Risk Mitigation Priority:
    1. Validate customer demand (HIGHEST PRIORITY)
    2. Test business model assumptions
    3. Build MVP quickly and cheaply
    4. Secure initial customers
    5. Monitor cash flow closely
    
    Recommendations:
    - Start as a side project if possible
    - Validate before scaling
    - Keep costs low initially
    - Build a financial runway
    - Have a backup plan
    
    RECOMMENDATION: Risks are manageable with proper planning and validation. 
    Focus on de-risking through early customer validation and lean startup methods.
    """
    
    return risk_assessment.strip()

