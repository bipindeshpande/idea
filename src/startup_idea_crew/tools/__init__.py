"""Custom tools for the Startup Idea Crew"""

from .market_research_tool import (
    research_market_trends,
    analyze_competitors,
    estimate_market_size
)
from .validation_tool import (
    validate_startup_idea,
    check_domain_availability,
    assess_startup_risks
)
from .financial_tool import (
    estimate_startup_costs,
    project_revenue,
    check_financial_viability
)
from .customer_tool import (
    generate_customer_persona,
    generate_validation_questions
)

__all__ = [
    # Market Research Tools
    "research_market_trends",
    "analyze_competitors",
    "estimate_market_size",
    # Validation Tools
    "validate_startup_idea",
    "check_domain_availability",
    "assess_startup_risks",
    # Financial Tools
    "estimate_startup_costs",
    "project_revenue",
    "check_financial_viability",
    # Customer Tools
    "generate_customer_persona",
    "generate_validation_questions",
]
