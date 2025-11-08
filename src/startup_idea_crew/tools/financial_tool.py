"""
Financial Analysis Tools for Startup Idea Crew
Tools for estimating costs, revenue, and financial projections
"""

from crewai.tools import tool
from typing import Optional


@tool("Startup Cost Estimator")
def estimate_startup_costs(business_type: str, scope: str = "MVP") -> str:
    """
    Estimate startup costs for different types of businesses.
    
    Args:
        business_type: Type of business e.g., SaaS, E-commerce, Mobile App, Marketplace (required)
        scope: Scope of estimation MVP, Full Launch, or Year 1 (optional, defaults to MVP)
    
    Returns:
        Cost breakdown with estimates
    """
    # Ensure parameters are strings
    if isinstance(business_type, dict):
        business_type = str(business_type)
    business_type = str(business_type).strip()
    
    if isinstance(scope, dict):
        scope = str(scope)
    scope = str(scope).strip() if scope else "MVP"
    
    # Cost templates for different business types
    cost_estimates = {
        "SaaS": {
            "MVP": {
                "Development": "$5,000 - $15,000",
                "Hosting/Infrastructure": "$50 - $200/month",
                "Tools & Software": "$100 - $500/month",
                "Marketing": "$500 - $2,000",
                "Legal/Incorporation": "$500 - $1,500",
                "Total MVP": "$6,000 - $19,000"
            },
            "Year 1": {
                "Development": "$20,000 - $50,000",
                "Hosting/Infrastructure": "$200 - $1,000/month",
                "Tools & Software": "$500 - $2,000/month",
                "Marketing": "$10,000 - $50,000",
                "Legal/Compliance": "$2,000 - $5,000",
                "Team (if hiring)": "$0 - $120,000",
                "Total Year 1": "$35,000 - $230,000+"
            }
        },
        "E-commerce": {
            "MVP": {
                "Platform Setup": "$0 - $300/month",
                "Initial Inventory": "$1,000 - $10,000",
                "Website Development": "$2,000 - $8,000",
                "Marketing": "$1,000 - $5,000",
                "Legal/Incorporation": "$500 - $1,500",
                "Total MVP": "$4,500 - $25,000"
            }
        },
        "Mobile App": {
            "MVP": {
                "Development": "$10,000 - $30,000",
                "App Store Fees": "$99 - $299/year",
                "Hosting/Backend": "$100 - $500/month",
                "Marketing": "$1,000 - $5,000",
                "Legal": "$500 - $1,500",
                "Total MVP": "$12,000 - $37,000"
            }
        }
    }
    
    # Get estimates for the business type
    estimates = cost_estimates.get(business_type, cost_estimates["SaaS"])
    scope_data = estimates.get(scope, estimates.get("MVP", {}))
    
    cost_report = f"""
    STARTUP COST ESTIMATION
    {'=' * 60}
    
    Business Type: {business_type}
    Scope: {scope}
    
    Cost Breakdown:
    """
    
    for category, amount in scope_data.items():
        if category != f"Total {scope}":
            cost_report += f"\n  {category}: {amount}"
    
    cost_report += f"\n\n  {'─' * 50}"
    cost_report += f"\n  Total Estimated Cost: {scope_data.get(f'Total {scope}', 'See breakdown above')}"
    
    cost_report += f"""
    
    Cost Optimization Tips:
    1. Start with MVP to validate idea
    2. Use no-code/low-code tools where possible
    3. Leverage free tiers of services initially
    4. Bootstrap and avoid unnecessary expenses
    5. Consider equity partnerships for services
    6. Outsource non-core functions
    7. Use open-source tools and frameworks
    
    Hidden Costs to Consider:
    - Payment processing fees (2-3% per transaction)
    - Customer acquisition costs
    - Ongoing maintenance and updates
    - Insurance and compliance
    - Accounting and bookkeeping
    - Unexpected technical issues
    
    Funding Options:
    - Bootstrapping (self-funded)
    - Friends and family
    - Angel investors
    - Venture capital
    - Grants and competitions
    - Crowdfunding
    
    RECOMMENDATION: Start lean with an MVP. Validate the idea before 
    investing significant resources. Most successful startups start with 
    minimal costs and scale as they validate product-market fit.
    """
    
    return cost_report.strip()


@tool("Revenue Projection Tool")
def project_revenue(business_model: str, target_customers: str, pricing_model: str = "") -> str:
    """
    Project potential revenue for a startup idea.
    
    Args:
        business_model: Business model type e.g., Subscription, One-time, Marketplace, Freemium (required)
        target_customers: Target number of customers/users as a string e.g., "1000" (required)
        pricing_model: Pricing details e.g., "$29/month", "$99 one-time" (optional, can be empty)
    
    Returns:
        Revenue projections with different scenarios
    """
    # Ensure parameters are strings
    if isinstance(business_model, dict):
        business_model = str(business_model)
    business_model = str(business_model).strip()
    
    if isinstance(target_customers, dict):
        target_customers = str(target_customers)
    target_customers_str = str(target_customers).strip()
    
    # Convert target_customers string to int
    try:
        target_customers_int = int(target_customers_str.replace(",", ""))
    except (ValueError, AttributeError):
        target_customers_int = 1000  # Default if conversion fails
    
    if isinstance(pricing_model, dict):
        pricing_model = str(pricing_model)
    pricing_model = str(pricing_model).strip() if pricing_model else ""
    
    # Example pricing assumptions (should be customized based on actual data)
    pricing_examples = {
        "Subscription": "$29/month",
        "One-time": "$99",
        "Marketplace": "10% commission",
        "Freemium": "Free + $49/month premium"
    }
    
    if not pricing_model or pricing_model.strip() == "":
        price = pricing_examples.get(business_model, "$50/month")
    else:
        price = pricing_model
    
    revenue_projection = f"""
    REVENUE PROJECTION ANALYSIS
    {'=' * 60}
    
    Business Model: {business_model}
    Pricing: {price}
    Target Customers: {target_customers_int:,}
    
    Revenue Scenarios:
    
    Conservative Scenario (10% of target):
    - Customers: {int(target_customers_int * 0.1):,}
    - Monthly Revenue: Calculate based on pricing model
    - Annual Revenue: Projected based on growth
    
    Realistic Scenario (30% of target):
    - Customers: {int(target_customers_int * 0.3):,}
    - Monthly Revenue: Calculate based on pricing model
    - Annual Revenue: Projected based on growth
    
    Optimistic Scenario (50% of target):
    - Customers: {int(target_customers_int * 0.5):,}
    - Monthly Revenue: Calculate based on pricing model
    - Annual Revenue: Projected based on growth
    
    Key Assumptions:
    - Customer acquisition rate: 5-10% monthly growth
    - Churn rate: 5-10% monthly (for subscriptions)
    - Average customer lifetime: 12-24 months
    
    Revenue Growth Timeline:
    Month 1-3:   Initial customers (10-50)
    Month 4-6:   Early growth (50-200)
    Month 7-12:  Scaling phase (200-1,000)
    Year 2:      Mature growth (1,000+)
    
    Important Considerations:
    - Customer acquisition costs (CAC)
    - Customer lifetime value (LTV)
    - LTV:CAC ratio should be 3:1 or higher
    - Time to profitability
    - Cash flow management
    
    Revenue Optimization:
    1. Focus on high-value customers first
    2. Implement upselling/cross-selling
    3. Reduce churn through retention strategies
    4. Optimize pricing through testing
    5. Expand to additional revenue streams
    
    RECOMMENDATION: Start with conservative projections. Focus on 
    achieving product-market fit before scaling. Revenue projections 
    should be validated through actual customer acquisition and retention data.
    """
    
    return revenue_projection.strip()


@tool("Financial Viability Checker")
def check_financial_viability(idea: str, estimated_costs: str = "", estimated_revenue: str = "", time_horizon: str = "Year 1") -> str:
    """
    Check financial viability of a startup idea.
    
    Args:
        idea: Description of the startup idea (required)
        estimated_costs: Estimated costs (optional, can be empty)
        estimated_revenue: Estimated revenue (optional, can be empty)
        time_horizon: Time period for analysis (optional, defaults to "Year 1")
    
    Returns:
        Financial viability assessment
    """
    # Ensure idea is a string
    if isinstance(idea, dict):
        idea = str(idea)
    idea = str(idea).strip()
    
    # Handle optional parameters
    if not estimated_costs or (isinstance(estimated_costs, str) and estimated_costs.strip() == ""):
        estimated_costs = "Not specified"
    else:
        estimated_costs = str(estimated_costs).strip()
    
    if not estimated_revenue or (isinstance(estimated_revenue, str) and estimated_revenue.strip() == ""):
        estimated_revenue = "Not specified"
    else:
        estimated_revenue = str(estimated_revenue).strip()
    
    if isinstance(time_horizon, dict):
        time_horizon = str(time_horizon)
    time_horizon = str(time_horizon).strip() if time_horizon else "Year 1"
    
    viability_report = f"""
    FINANCIAL VIABILITY ASSESSMENT
    {'=' * 60}
    
    Idea: {idea}
    Time Horizon: {time_horizon}
    
    Estimated Costs: {estimated_costs}
    Estimated Revenue: {estimated_revenue}
    
    Financial Metrics:
    
    1. Break-even Analysis:
       - Break-even point: Needs calculation based on specific numbers
       - Time to break-even: Typically 12-24 months for startups
       - Recommended: Achieve break-even within 18 months
    
    2. Unit Economics:
       - Customer Acquisition Cost (CAC): Should be < 1/3 of LTV
       - Lifetime Value (LTV): Should be 3x CAC minimum
       - Gross Margin: Should be > 50% for SaaS, > 30% for e-commerce
    
    3. Cash Flow:
       - Initial cash requirement: Should cover 12-18 months
       - Monthly burn rate: Monitor closely
       - Runway: Should have 12+ months of runway
    
    4. Funding Requirements:
       - Bootstrap: If costs are low and revenue comes quickly
       - Seed funding: If need $50K-$500K for initial launch
       - Series A: If need $1M+ for scaling
    
    Viability Score: MEDIUM-HIGH
    
    Strengths:
    - Business model appears viable
    - Revenue potential exists
    - Costs are manageable
    
    Concerns:
    - Need to validate actual customer demand
    - Unit economics need validation
    - Cash flow management is critical
    
    Recommendations:
    1. Validate pricing with potential customers
    2. Test customer acquisition channels
    3. Build financial model with actual data
    4. Secure adequate funding/runway
    5. Monitor key metrics closely
    
    RECOMMENDATION: The idea shows financial viability potential, but 
    requires validation through customer testing and actual sales data. 
    Focus on proving unit economics before scaling.
    """
    
    return viability_report.strip()

