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
    
    # Parse pricing to extract numeric value
    import re
    
    def parse_price(price_str: str, business_model: str) -> tuple[float, str]:
        """Parse price string and return (amount, period)."""
        # Remove dollar signs and commas
        price_clean = re.sub(r'[$,]', '', price_str.lower())
        
        # Extract number
        price_match = re.search(r'(\d+(?:\.\d+)?)', price_clean)
        if not price_match:
            return (50.0, "month")  # Default
        
        amount = float(price_match.group(1))
        
        # Determine period
        if "month" in price_clean or "/month" in price_clean:
            period = "month"
        elif "year" in price_clean or "/year" in price_clean or "annual" in price_clean:
            period = "year"
        elif "one-time" in price_clean or "one time" in price_clean:
            period = "one-time"
        elif business_model.lower() in ["subscription", "saas", "freemium"]:
            period = "month"
        else:
            period = "one-time"
        
        return (amount, period)
    
    price_amount, price_period = parse_price(price, business_model)
    
    # Calculate revenue for different scenarios
    conservative_customers = int(target_customers_int * 0.1)
    realistic_customers = int(target_customers_int * 0.3)
    optimistic_customers = int(target_customers_int * 0.5)
    
    # Calculate based on pricing model
    if price_period == "month":
        conservative_monthly = conservative_customers * price_amount
        realistic_monthly = realistic_customers * price_amount
        optimistic_monthly = optimistic_customers * price_amount
        
        conservative_annual = conservative_monthly * 12
        realistic_annual = realistic_monthly * 12
        optimistic_annual = optimistic_monthly * 12
        pricing_unit = "per month"
        
    elif price_period == "year":
        conservative_monthly = (conservative_customers * price_amount) / 12
        realistic_monthly = (realistic_customers * price_amount) / 12
        optimistic_monthly = (optimistic_customers * price_amount) / 12
        
        conservative_annual = conservative_customers * price_amount
        realistic_annual = realistic_customers * price_amount
        optimistic_annual = optimistic_customers * price_amount
        pricing_unit = "per year"
        
    else:  # one-time
        conservative_monthly = conservative_customers * price_amount / 12  # Average over year
        realistic_monthly = realistic_customers * price_amount / 12
        optimistic_monthly = optimistic_customers * price_amount / 12
        
        conservative_annual = conservative_customers * price_amount
        realistic_annual = realistic_customers * price_amount
        optimistic_annual = optimistic_customers * price_amount
        pricing_unit = "one-time"
    
    revenue_projection = f"""
    REVENUE PROJECTION ANALYSIS
    {'=' * 60}
    
    Business Model: {business_model}
    Pricing: ${price_amount:,.2f} {pricing_unit}
    Target Customers: {target_customers_int:,}
    
    Revenue Scenarios:
    
    Conservative Scenario (10% of target):
    - Customers: {conservative_customers:,}
    - Monthly Revenue: ${conservative_monthly:,.2f}
    - Annual Revenue: ${conservative_annual:,.2f}
    
    Realistic Scenario (30% of target):
    - Customers: {realistic_customers:,}
    - Monthly Revenue: ${realistic_monthly:,.2f}
    - Annual Revenue: ${realistic_annual:,.2f}
    
    Optimistic Scenario (50% of target):
    - Customers: {optimistic_customers:,}
    - Monthly Revenue: ${optimistic_monthly:,.2f}
    - Annual Revenue: ${optimistic_annual:,.2f}
    
    Key Assumptions:
    - Customer acquisition rate: 5-10% monthly growth
    - Churn rate: 5-10% monthly (for {business_model.lower()} models)
    - Average customer lifetime: 12-24 months
    
    Revenue Growth Timeline (Realistic Scenario):
    Month 1-3:   ${realistic_monthly * 0.2:,.2f}/month (early adopters)
    Month 4-6:   ${realistic_monthly * 0.5:,.2f}/month (growing traction)
    Month 7-12:  ${realistic_monthly * 0.8:,.2f}/month (scaling)
    Year 2:      ${realistic_monthly:,.2f}/month (mature growth)
    
    Important Considerations:
    - Customer acquisition costs (CAC): Estimate 10-30% of first month revenue
    - Customer lifetime value (LTV): ${price_amount * (12 if price_period == 'month' else 1):,.2f} (estimated)
    - Target LTV:CAC ratio: 3:1 or higher
    - Break-even: When monthly revenue exceeds operating costs
    - Cash flow: Ensure runway covers time to profitability
    
    Revenue Optimization:
    1. Focus on high-value customers first
    2. Implement upselling/cross-selling strategies
    3. Reduce churn through retention strategies (target <5% monthly)
    4. Optimize pricing through A/B testing
    5. Expand to additional revenue streams when ready
    
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
    
    # Try to parse costs and revenue for analysis
    import re
    
    def parse_financial_amount(amount_str: str) -> tuple[float, str]:
        """Parse financial amount string and return (amount, unit)."""
        if not amount_str or amount_str == "Not specified":
            return (0.0, "unknown")
        
        # Remove common currency symbols and text
        clean_str = re.sub(r'[$,]', '', str(amount_str).lower())
        
        # Extract number (handle ranges like "$5K-$15K")
        numbers = re.findall(r'(\d+(?:\.\d+)?)', clean_str)
        if not numbers:
            return (0.0, "unknown")
        
        # Use first number, or average if range
        if len(numbers) == 2:
            amount = (float(numbers[0]) + float(numbers[1])) / 2
        else:
            amount = float(numbers[0])
        
        # Detect unit (K, M, etc.)
        if 'k' in clean_str or 'thousand' in clean_str:
            amount *= 1000
        elif 'm' in clean_str or 'million' in clean_str:
            amount *= 1000000
        
        # Detect period
        if 'month' in clean_str or '/month' in clean_str:
            unit = "month"
        elif 'year' in clean_str or 'annual' in clean_str:
            unit = "year"
        else:
            unit = "one-time"
        
        return (amount, unit)
    
    cost_amount, cost_unit = parse_financial_amount(estimated_costs)
    revenue_amount, revenue_unit = parse_financial_amount(estimated_revenue)
    
    # Calculate viability score based on actual numbers
    viability_score = "MEDIUM"
    viability_details = []
    
    # Analyze based on costs vs revenue
    if cost_amount > 0 and revenue_amount > 0:
        # Calculate ROI and timeline
        if revenue_unit == "month" and cost_unit == "one-time":
            months_to_break_even = cost_amount / revenue_amount if revenue_amount > 0 else 999
            if months_to_break_even <= 12:
                viability_score = "HIGH"
                viability_details.append(f"Strong viability: Break-even in {months_to_break_even:.1f} months")
            elif months_to_break_even <= 24:
                viability_score = "MEDIUM-HIGH"
                viability_details.append(f"Good viability: Break-even in {months_to_break_even:.1f} months")
            else:
                viability_score = "MEDIUM"
                viability_details.append(f"Moderate viability: Break-even in {months_to_break_even:.1f} months - consider cost reduction")
        
        # Check if revenue covers costs
        if revenue_unit == cost_unit:
            if revenue_amount > cost_amount * 1.5:
                viability_score = "HIGH"
                viability_details.append(f"Strong profitability: Revenue exceeds costs by {((revenue_amount / cost_amount - 1) * 100):.0f}%")
            elif revenue_amount > cost_amount:
                viability_score = "MEDIUM-HIGH"
                viability_details.append(f"Profitable: Revenue exceeds costs")
            else:
                viability_score = "LOW"
                viability_details.append(f"Challenging: Revenue doesn't cover costs - need to increase revenue or reduce costs")
    
    # Analyze based on cost magnitude
    if cost_amount > 0:
        if cost_amount < 10000:
            viability_details.append("Low startup costs - good for bootstrapping")
        elif cost_amount < 50000:
            viability_details.append("Moderate startup costs - may need seed funding")
        elif cost_amount < 500000:
            viability_details.append("High startup costs - will likely need significant funding")
        else:
            viability_details.append("Very high startup costs - requires substantial funding or partnerships")
    
    # Analyze revenue potential
    if revenue_amount > 0:
        if revenue_unit == "month":
            annual_revenue = revenue_amount * 12
            if annual_revenue > 100000:
                viability_details.append("Strong revenue potential - scalable business model")
            elif annual_revenue > 50000:
                viability_details.append("Good revenue potential - viable for lifestyle business")
            else:
                viability_details.append("Moderate revenue potential - may need to scale or increase pricing")
        elif revenue_unit == "year":
            if revenue_amount > 100000:
                viability_details.append("Strong annual revenue potential")
            else:
                viability_details.append("Moderate annual revenue - consider growth strategies")
    
    # Build strengths and concerns
    strengths = []
    concerns = []
    
    if cost_amount < 50000:
        strengths.append("Relatively low startup costs enable bootstrapping or minimal funding")
    if revenue_amount > cost_amount if cost_amount > 0 else False:
        strengths.append("Revenue projections exceed cost estimates")
    if cost_amount > 0 and revenue_amount > 0:
        strengths.append("Financial projections show path to profitability")
    
    if cost_amount == 0 or revenue_amount == 0:
        concerns.append("Missing cost or revenue estimates - need actual financial projections")
    if cost_amount > 0 and revenue_amount > 0 and revenue_amount < cost_amount:
        concerns.append("Revenue doesn't cover costs - need to revise business model or pricing")
    if cost_amount > 100000 and revenue_amount < cost_amount:
        concerns.append("High capital requirements with uncertain revenue - significant risk")
    
    if not strengths:
        strengths.append("Financial data needed for accurate assessment")
    if not concerns:
        concerns.append("Need to validate actual customer demand and pricing")
    
    viability_report = f"""
    FINANCIAL VIABILITY ASSESSMENT
    {'=' * 60}
    
    Idea: {idea}
    Time Horizon: {time_horizon}
    
    Estimated Costs: {estimated_costs}
    Estimated Revenue: {estimated_revenue}
    
    Financial Analysis:
    """
    
    months_to_be = 0
    if cost_amount > 0 and revenue_amount > 0:
        viability_report += f"""
    - Cost Amount: ${cost_amount:,.2f} ({cost_unit})
    - Revenue Amount: ${revenue_amount:,.2f} ({revenue_unit})
    """
        if revenue_unit == "month" and cost_unit == "one-time":
            months_to_be = cost_amount / revenue_amount if revenue_amount > 0 else 0
            viability_report += f"    - Break-even Timeline: {months_to_be:.1f} months\n"
    
    viability_report += f"""
    Financial Metrics:
    
    1. Break-even Analysis:
       - Time to break-even: {f"{months_to_be:.1f} months" if (cost_amount > 0 and revenue_amount > 0 and revenue_unit == "month" and months_to_be > 0) else "12-24 months (typical for startups)"}
       - Recommended: Achieve break-even within 18 months
       - {'✅' if (cost_amount > 0 and revenue_amount > 0 and revenue_unit == 'month' and months_to_be <= 18) else '⚠️'} {'Break-even achievable' if (cost_amount > 0 and revenue_amount > 0 and revenue_unit == 'month' and months_to_be <= 18) else 'Need to validate break-even timeline'}
    
    2. Unit Economics:
       - Customer Acquisition Cost (CAC): Should be < 1/3 of LTV
       - Lifetime Value (LTV): Should be 3x CAC minimum
       - Gross Margin: Should be > 50% for SaaS, > 30% for e-commerce
       - ⚠️ Need to calculate actual unit economics based on customer data
    
    3. Cash Flow:
       - Initial cash requirement: ${cost_amount:,.2f} (estimated)
       - Monthly revenue: ${revenue_amount * 12 / 12:,.2f} (estimated, if annual) or ${revenue_amount:,.2f}/month (if monthly)
       - Runway: {'12+ months recommended' if cost_amount > 0 and revenue_amount > 0 else 'Calculate based on burn rate'}
    
    4. Funding Requirements:
       - {('Bootstrap viable' if cost_amount < 10000 else ('Seed funding needed ($50K-$500K)' if cost_amount < 500000 else 'Series A or significant funding needed ($1M+)')) if cost_amount > 0 else 'Determine based on cost estimates'}
    
    Viability Score: {viability_score}
    """
    
    if viability_details:
        viability_report += "\n    Key Insights:\n"
        for detail in viability_details:
            viability_report += f"    - {detail}\n"
    
    viability_report += f"""
    Strengths:
    """
    for strength in strengths:
        viability_report += f"    - {strength}\n"
    
    viability_report += f"""
    Concerns:
    """
    for concern in concerns:
        viability_report += f"    - {concern}\n"
    
    viability_report += f"""
    Recommendations:
    1. Validate pricing with potential customers
    2. Test customer acquisition channels to confirm CAC estimates
    3. Build detailed financial model with actual data
    4. Secure adequate funding/runway (${cost_amount:,.2f} initial + 12 months operating expenses)
    5. Monitor key metrics closely: CAC, LTV, churn rate, burn rate
    
    RECOMMENDATION: The idea shows {viability_score.lower()} financial viability. {'Focus on validating unit economics and customer acquisition before scaling.' if viability_score in ['MEDIUM', 'MEDIUM-HIGH'] else 'Continue validating market demand and refine financial projections based on actual sales data.' if viability_score == 'HIGH' else 'Consider revising business model, reducing costs, or increasing revenue potential before proceeding.'}
    """
    
    return viability_report.strip()
    
    return viability_report.strip()

