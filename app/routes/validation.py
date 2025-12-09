"""Validation routes blueprint - idea validation endpoints."""
from flask import Blueprint, request, jsonify, current_app
from typing import Any, Dict, Optional
from datetime import datetime, timezone
import os
import json
import re
import time

from openai import OpenAI
try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    Anthropic = None

from app.models.database import db, User, UserSession, UserRun, UserValidation, utcnow
from app.utils import get_current_session, require_auth
from app.utils.validators import validate_idea_explanation, validate_text_field, validate_string_array
from app.services.email_service import email_service
from app.services.email_templates import validation_ready_email

bp = Blueprint("validation", __name__)

# Import limiter lazily to avoid circular imports
_limiter = None

def get_limiter():
    """Get limiter instance lazily to avoid circular imports."""
    global _limiter
    if _limiter is None:
        try:
            from api import limiter
            _limiter = limiter
        except (ImportError, AttributeError, RuntimeError):
            _limiter = None
    return _limiter


def apply_rate_limit(limit_string):
    """Helper to apply rate limit decorator if limiter is available."""
    def decorator(func):
        limiter = get_limiter()
        if limiter:
            return limiter.limit(limit_string)(func)
        return func
    return decorator

# Validation model configuration - can be "openai", "claude", or "auto" (tries Claude first, falls back to OpenAI)
VALIDATION_MODEL_PROVIDER = os.environ.get("VALIDATION_MODEL_PROVIDER", "claude").lower()

ARCHETYPE_REFERENCE_EXAMPLES = """
### Reference Snapshots (non-tech friendly)
1. **Mumbai vada pav stall (Food & beverage)** — Market is the footfall around the stall, technical feasibility covers kitchen permits, hygiene, and prep capacity. Scalability means extra carts or franchising, not servers. Financials = rent, ingredients, daily break-even plates.
2. **Neighborhood yoga studio (Local service)** — Technical feasibility = certified instructors and studio readiness. Scalability = more time slots, instructors, or second location. Acquisition uses local partnerships, flyers, WhatsApp groups.
3. **Home plumbing service (Local service / Mostly offline)** — Focus on licenses, tools, on-call staffing, travel radius. Risk = reputation, seasonality, emergency availability.
4. **Eco-friendly bottle brand (Physical product)** — Technical feasibility = manufacturing + QA. Financials = unit cost, MOQ, inventory. Go-to-market = retail shelves, pop-ups, or D2C.
5. **Creator-led course (Content / education)** — Technical feasibility is the creator’s ability to produce and deliver content. Scalability = audience growth, cohorts, evergreen funnels. Financials = course pricing, marketing spend, platform fees.
""".strip()

BUSINESS_ARCHETYPE_PROFILES = [
    {
        "slug": "online_software",
        "label": "Online software / AI product (SaaS / app / tool)",
        "aliases": [
            "online software",
            "saas",
            "software",
            "app",
            "online software / ai product (saas / app / tool)"
        ],
        "guidance": {
            "market": "Discuss TAM/SAM, vertical focus, and willingness to pay for a digital tool.",
            "technical": "Evaluate engineering complexity, data/infra requirements, integrations, AI model needs, and founding team's technical depth.",
            "scalability": "Assess marginal cost per user, cloud/infrastructure scaling, and ability to serve global demand.",
            "financial": "Emphasize CAC vs. LTV, pricing model (subscription, usage), churn risk, and runway.",
            "risk": "Call out security, compliance, and dependency on APIs/models.",
            "gtm": "Focus on digital acquisition: SEO, content, outbound, partnerships, communities."
        }
    },
    {
        "slug": "local_service",
        "label": "Local service business",
        "aliases": [
            "local service",
            "local service business",
            "service business",
            "consulting",
            "coaching",
            "healthcare",
            "cleaning"
        ],
        "guidance": {
            "market": "Look at local demand, serviceable radius, competition density, and referrals.",
            "technical": "Focus on certifications, staffing skills, scheduling systems, and operational playbooks.",
            "scalability": "Think in terms of hiring/training additional staff, expanding service areas, or adding standardized packages.",
            "financial": "Consider hourly rates, utilization, travel/operating costs, and cash-flow management.",
            "risk": "Highlight reputation, service quality, liability, and dependency on the founder.",
            "gtm": "Use local SEO, partnerships, community groups, flyers, marketplaces (Thumbtack, Urban Company)."
        }
    },
    {
        "slug": "food_beverage",
        "label": "Food & beverage / restaurant / stall / catering",
        "aliases": [
            "food & beverage",
            "food and beverage",
            "restaurant",
            "stall",
            "catering",
            "food business",
            "food & beverage / restaurant / stall / catering"
        ],
        "guidance": {
            "market": "Emphasize local cuisine demand, foot traffic, neighborhood demographics, and competition.",
            "technical": "Cover kitchen setup, licensing, hygiene, supply chain, menu complexity, and staffing.",
            "scalability": "Assess table turns, delivery, catering, franchising, or multiple outlets.",
            "financial": "Track ingredient costs, rent, staff wages, equipment, daily break-even units.",
            "risk": "Mention food safety, spoilage, labor churn, and dependency on chef quality.",
            "gtm": "Use location visibility, aggregators (Swiggy/Zomato), social proof, tastings, or loyalty programs."
        }
    },
    {
        "slug": "retail_shop",
        "label": "Retail / physical shop",
        "aliases": [
            "retail",
            "physical shop",
            "store",
            "retail / physical shop"
        ],
        "guidance": {
            "market": "Focus on neighborhood income, walk-ins, complementary stores, and seasonal trends.",
            "technical": "Evaluate merchandising, inventory systems, POS, supplier relationships, and display.",
            "scalability": "Discuss additional stores, e-commerce add-ons, or franchising once playbook works.",
            "financial": "Consider rent, inventory turns, working capital, shrinkage, and gross margins.",
            "risk": "Highlight inventory risk, footfall dependency, landlord changes.",
            "gtm": "Use local ads, signage, partnerships, events, and online discovery to drive visits."
        }
    },
    {
        "slug": "physical_product",
        "label": "Physical product brand",
        "aliases": [
            "physical product",
            "product brand",
            "d2c",
            "manufacturing",
            "physical product brand"
        ],
        "guidance": {
            "market": "Analyze niche demand, differentiation, and willingness to switch from incumbents.",
            "technical": "Cover prototyping, manufacturing partners, quality assurance, and supply chain.",
            "scalability": "Look at batch production, distribution, retail partnerships, and unit economics improvement.",
            "financial": "Focus on COGS, MOQ, inventory carrying cost, gross margin, and cash conversion cycles.",
            "risk": "Consider stockouts, overproduction, logistics, and regulatory compliance.",
            "gtm": "Mention D2C funnels, marketplaces, wholesale, pop-ups, and influencer collaborations."
        }
    },
    {
        "slug": "content_creator",
        "label": "Content / creator / education",
        "aliases": [
            "content",
            "creator",
            "education",
            "content / creator / education",
            "newsletter",
            "course"
        ],
        "guidance": {
            "market": "Assess audience niche, engagement depth, and monetization appetite.",
            "technical": "Focus on production capability, tooling, editing, and platform dependence.",
            "scalability": "Discuss audience growth, evergreen content, community, and upsell ladders.",
            "financial": "Look at CPMs, course pricing, cohort size, sponsorship rates.",
            "risk": "Highlight platform risk, burnout, churn, and dependency on single persona.",
            "gtm": "Use content marketing, collaborations, social channels, community, newsletters."
        }
    },
    {
        "slug": "marketplace",
        "label": "Marketplace / platform",
        "aliases": [
            "marketplace",
            "platform",
            "marketplace / platform"
        ],
        "guidance": {
            "market": "Consider multi-sided demand, supply liquidity, and trust gaps.",
            "technical": "Discuss matching logic, ops tooling, escrow/payments, and moderation.",
            "scalability": "Assess network effects, geographic expansion, and operational complexity.",
            "financial": "Focus on take rates, transaction volume, and subsidies required.",
            "risk": "Call out chicken-and-egg, disintermediation, compliance.",
            "gtm": "Explain how each side is acquired (field sales, referrals, online campaigns)."
        }
    },
]

DEFAULT_ARCHETYPE_PROFILE = {
    "slug": "general",
    "label": "General business",
    "aliases": [],
    "guidance": {
        "market": "Comment on demand, competition, and target customer pain.",
        "technical": "Describe the operational or product capabilities required.",
        "scalability": "Explain how capacity can grow (staffing, locations, automation).",
        "financial": "Discuss revenue model, major costs, and break-even outlook.",
        "risk": "Note the biggest execution, regulatory, or market risks.",
        "gtm": "Explain the most realistic acquisition or distribution channels."
    }
}

def _match_archetype_profile(value: Optional[str]) -> Dict[str, Any]:
    if not value:
        return DEFAULT_ARCHETYPE_PROFILE
    normalized = value.strip().lower()
    for profile in BUSINESS_ARCHETYPE_PROFILES:
        aliases = [profile["label"].lower()] + profile.get("aliases", [])
        if normalized in aliases:
            return profile
    return DEFAULT_ARCHETYPE_PROFILE

def _format_archetype_guidance(profile: Dict[str, Any]) -> str:
    guidance = profile.get("guidance", {})
    return "\n".join(
        [
            f"- Market Opportunity: {guidance.get('market', DEFAULT_ARCHETYPE_PROFILE['guidance']['market'])}",
            f"- Technical Feasibility: {guidance.get('technical', DEFAULT_ARCHETYPE_PROFILE['guidance']['technical'])}",
            f"- Scalability Potential: {guidance.get('scalability', DEFAULT_ARCHETYPE_PROFILE['guidance']['scalability'])}",
            f"- Financial Sustainability: {guidance.get('financial', DEFAULT_ARCHETYPE_PROFILE['guidance']['financial'])}",
            f"- Risk Assessment: {guidance.get('risk', DEFAULT_ARCHETYPE_PROFILE['guidance']['risk'])}",
            f"- Go-to-Market Strategy: {guidance.get('gtm', DEFAULT_ARCHETYPE_PROFILE['guidance']['gtm'])}",
        ]
    )

def _build_validation_prompt(structured_json: str, business_profile: Dict[str, Any], delivery_channel: str) -> str:
    guidance_block = _format_archetype_guidance(business_profile)
    delivery_text = delivery_channel or "Not specified"
    return f"""You are an experienced, highly critical Venture Capital Partner and Product Analyst. Your sole purpose is to stress-test an early-stage startup or small business idea based on the structured data provided. Your analysis must be ruthless, objective, and focused on identifying the **weakest point** and **riskiest assumptions**. You must generate a structured report in **Markdown format only**.

{ARCHETYPE_REFERENCE_EXAMPLES}

### 1. INPUT DATA STRUCTURE

You will receive the following JSON data. Analyze all fields, especially combining the dropdown categories with the detailed narrative (`description_structured`):

```json
{structured_json}
```

**CRITICAL DATA INTEGRITY RULES:**
- You MUST ONLY use the data provided in the JSON above. Do NOT invent, assume, or fabricate any information not explicitly present in the input data.
- If a field contains "Not specified", "Unknown", or is empty, treat it as MISSING INFORMATION. Do NOT make assumptions about what it might be.
- Do NOT add details, examples, or specifics that are not present in the `description_structured` field.
- Do NOT reference competitors, market data, or industry trends that are not mentioned in the input data.
- When a field says "Not specified", acknowledge the gap in information rather than assuming a value.
- Your analysis must be grounded ONLY in what the user has actually provided.

### 2. BUSINESS CONTEXT

- Business type: {business_profile['label']}
- Delivery channel: {delivery_text}
- Adapt every parameter to this context. Do **not** assume the business is software by default. Use the following guidance:
{guidance_block}

### 3. CORE DIRECTIVES

1. **DO NOT** repeat the input data or confirm the categories. Jump immediately into the analysis.
2. **USE ONLY PROVIDED DATA**: Base your analysis EXCLUSIVELY on the JSON data provided. Do NOT add information not present in the input.
3. **ACKNOWLEDGE MISSING DATA**: When information is missing (marked "Not specified"), explicitly note this limitation rather than making assumptions.
4. **CRITIQUE** the idea based ONLY on the founder's provided ambition and constraints.
5. **SCORE** each pillar below on a scale of **1 (Poor) to 5 (Excellent)** based ONLY on the provided information.
6. **FOCUS** on the primary geography/delivery model provided (if specified).
7. **BUDGET RULE**: 
   - **IF `initial_budget` is provided** (and NOT "Not specified"): You MUST actively use this budget information in your financial analysis. Evaluate the revenue model, feasibility, and recommendations against the provided budget amount.
   - **IF `initial_budget` is "Not specified" or empty**: You MUST NOT mention any specific budget amounts (like "$20K", "$10,000", "budget of X", etc.) anywhere in your response. Do NOT assume or invent a budget. Focus on revenue model viability, unit economics, and general feasibility without budget constraints.
8. **NO FABRICATION**: Do NOT invent customer segments, pricing models, features, or business details not present in the input data.

### 4. REQUIRED OUTPUT STRUCTURE (Markdown Format)

Generate the full report using the exact headings and structure below:

## 🎯 Executive Summary & Overall Verdict

[Generate a single, concise paragraph (3-4 sentences) summarizing the idea's potential and its biggest challenge. Base this analysis ONLY on the information provided in the JSON data. Do NOT add details, examples, or assumptions not present in the input.]

| Pillar | Score (1-5) | Reasoning |
| :--- | :--- | :--- |
| **Problem-Solution Fit** | [Score 1-5] | [Critique how well the solution addresses the pain point.] |
| **Market Viability & Scope** | [Score 1-5] | [Critique the market size for the chosen geography and industry.] |
| **Competitive Moat** | [Score 1-5] | [Critique the strength of the differentiator against known/potential competitors.] |
| **Financial Viability** | [Score 1-5] | [If `initial_budget` is provided (not "Not specified"): Critique the revenue model against the provided budget and evaluate feasibility within that budget constraint. If budget is "Not specified": Focus on revenue model viability, unit economics, and general feasibility WITHOUT mentioning any specific budget amounts or constraints.] |
| **Feasibility & Risk** | [Score 1-5] | [Critique the founder's constraints and current stage against the required effort.] |

---

## 🔎 Deep Dive Analysis

### 1. Core Problem & User Urgency
* **Analysis:** Assess if the problem category matches the urgency described in the `description_structured`. Is this a 'Vitamin' or a 'Painkiller'?
* **Verdict:** [A single sentence verdict.]

### 2. Business Model Stress Test
* **Analysis:** Evaluate the chosen `revenue_model` against the solution type and archetype. Are they compatible? Is the pricing viable? ONLY reference pricing/revenue details if explicitly provided in the input data. **If `initial_budget` is provided (not "Not specified")**: Evaluate whether the revenue model is viable within the provided budget constraints. **If budget is "Not specified"**: Focus on revenue model compatibility and unit economics WITHOUT mentioning any specific budget amounts or constraints.
* **Red Flag:** [Identify the biggest financial viability risk based ONLY on the provided information. If `initial_budget` is provided, consider budget-related risks. If budget is "Not specified", focus on revenue model risks and do NOT mention budget constraints.]

### 3. Competitive Landscape
* **Analysis:** Based ONLY on the `competitors` field and `unique_moat` provided. If competitors are "Not specified" or "Unknown", acknowledge this gap. Do NOT invent competitor names or analysis not present in the input data.
* **Key Insight:** [The core competitive advantage or fatal flaw based ONLY on the user's provided information.]

---

## 🛑 Critical Assumptions & Next Steps

### 1. Riskiest Assumption (The 'Kill Switch')

[Identify the single most critical, unproven assumption that could immediately kill the business. This must be a specific statement the founder needs to validate, based ONLY on the information they have provided. Do NOT invent assumptions or risks not grounded in their input data.]

### 2. Actionable Next Steps (Prioritized)

IMPORTANT: Each next step MUST incorporate specific details from the user's input, but ONLY use information actually provided:
- Reference their **industry** ONLY if specified (e.g., "In the [industry] space..." - but if "Not specified", acknowledge this gap)
- Consider their **geography** ONLY if specified (e.g., "For the [geography] market..." - if "Not specified", don't assume a location)
- Account for their **stage** ONLY if specified (e.g., "Since you're at the [stage] stage...")
- Respect their **commitment level** ONLY if specified (e.g., "Given your [commitment] commitment...")
- Address their **problem category** ONLY if specified (e.g., "To validate the [problem_category] problem...")
- **Budget handling**: If `initial_budget` is provided (not "Not specified"), actively use it in your recommendations and evaluate feasibility within that budget. If budget is "Not specified" or missing, DO NOT mention any specific budget amounts (e.g., "$20K", "$5,000", etc.) in your analysis or recommendations. Do NOT assume or invent a budget.
- Use their **solution type** and **target user type** ONLY if explicitly provided

CRITICAL: Do NOT invent steps, tools, competitors, market data, or resources not mentioned in the input data. Base recommendations ONLY on what the user has provided.

Make steps concrete, specific, and actionable based on these inputs. Do not give generic advice, but also do NOT add details not present in the user's input.

CRITICAL BUDGET RULE: 
- **IF `initial_budget` is provided** (not "Not specified"): You MUST actively use this budget in your analysis, recommendations, and feasibility evaluation.
- **IF `initial_budget` is "Not specified" or empty**: You MUST NOT reference any specific budget amounts (like "$20K", "$10,000", "budget of X", etc.) anywhere in your response. Do NOT assume or invent a budget amount. Focus on revenue model and unit economics without budget constraints.

1. **Validation Step 1:** [Most urgent task - reference industry, geography, stage, or commitment level.]
2. **Validation Step 2:** [Product/service or market research step - incorporate problem category, solution type, or user type.]
3. **Validation Step 3:** [Strategic or financial planning task - consider revenue model and delivery channel. Only mention budget if explicitly provided in the input data.]

CRITICAL: Output ONLY the Markdown report in the exact format above. Do not include any preamble, introduction, or closing remarks. Start directly with `## 🎯 Executive Summary & Overall Verdict` and end with the last validation step."""

VALIDATION_SYSTEM_PROMPT = """You are an experienced, highly critical Venture Capital Partner and Product Analyst. You evaluate ANY business type—software, local services, food stalls, retail, creator businesses, physical products, or marketplaces. Never assume the idea is digital by default. Always adapt to the provided business archetype and delivery channel. Be direct, specific, and brutally honest.

FUNDAMENTAL PRINCIPLE: AUTHENTICITY AND DATA INTEGRITY
- Your analysis MUST be based EXCLUSIVELY on the data provided by the user in the JSON input
- You MUST NOT invent, fabricate, assume, or add any information not present in the user's input
- If information is missing (marked "Not specified"), acknowledge the gap - do NOT make assumptions
- Do NOT add competitor names, market statistics, pricing details, or features not mentioned by the user
- Do NOT create examples or use cases not present in the user's description
- Every claim, reference, or detail in your response must trace back to the provided JSON data

SCORING GUIDELINES (1-5 scale):
- 1 (Poor): Critical flaws that make the idea unviable
- 2 (Weak): Significant weaknesses that are hard to overcome
- 3 (Moderate): Viable but with notable challenges
- 4 (Good): Strong idea with minor concerns
- 5 (Excellent): Exceptional idea with clear advantages

CRITICAL DATA RULES:
- **BUDGET HANDLING**: 
  * If `initial_budget` is provided (not "Not specified"): USE the budget actively in your financial analysis and recommendations
  * If `initial_budget` is "Not specified" or missing: You MUST NOT mention any specific budget amounts (like "$20K", "$10,000", "budget of X dollars", etc.) anywhere in your response. Do NOT assume or invent a budget amount.
- If `competitors` is "Not specified" or "Unknown", do NOT invent competitor names or analysis
- If `geography` is "Not specified", do NOT assume a specific market
- If `revenue_model` is generic, critique what's provided but do NOT suggest specific pricing not mentioned
- Only reference information explicitly provided in the JSON data structure

Use grounded business language. Refer to customers/clients/diners/patients/etc. based on the archetype, not generic "users" unless it fits."""

def _get_validation_client():
    """
    Get the appropriate AI client for validation.
    Returns: (client, model_name, is_claude)
    """
    import logging
    logger = logging.getLogger(__name__)
    
    provider = VALIDATION_MODEL_PROVIDER
    
    # Force OpenAI if Claude is not available
    if provider == "claude" and not ANTHROPIC_AVAILABLE:
        try:
            current_app.logger.warning("Claude requested but anthropic package not installed. Falling back to OpenAI.")
        except RuntimeError:
            logger.warning("Claude requested but anthropic package not installed. Falling back to OpenAI.")
        provider = "openai"
    
    # Auto mode: try Claude first, fall back to OpenAI
    if provider == "auto":
        if ANTHROPIC_AVAILABLE and os.environ.get("ANTHROPIC_API_KEY"):
            provider = "claude"
        else:
            provider = "openai"
    
    if provider == "claude":
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            try:
                current_app.logger.warning("ANTHROPIC_API_KEY not set. Falling back to OpenAI.")
            except RuntimeError:
                logger.warning("ANTHROPIC_API_KEY not set. Falling back to OpenAI.")
            return OpenAI(api_key=os.environ.get("OPENAI_API_KEY")), "gpt-4o", False
        
        client = Anthropic(api_key=api_key)
        # Use the latest Claude Sonnet model (2025)
        # Default to Sonnet 4, but allow override via environment variable
        # Available 2025 models:
        # - claude-sonnet-4-20250514 (Sonnet 4 - recommended for validation)
        # - claude-3-7-sonnet-20250219 (Sonnet 3.7 - alternative)
        # - claude-3-5-sonnet-20240620 (Sonnet 3.5 - older but still works)
        model_name = os.environ.get("CLAUDE_MODEL_NAME", "claude-sonnet-4-20250514")
        return client, model_name, True
    else:
        # Default to OpenAI
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        return OpenAI(api_key=api_key), "gpt-4o", False


def _call_ai_validation(client, model_name, is_claude: bool, system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 2500) -> str:
    """
    Call AI model for validation. Supports both OpenAI and Claude.
    Returns: Response text content
    """
    if is_claude:
        # Claude API
        response = client.messages.create(
            model=model_name,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        return response.content[0].text
    else:
        # OpenAI API
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()


def _is_idea_vague_or_nonsensical(idea_explanation: str) -> bool:
    """
    Detect if an idea is too vague, nonsensical, or not a real business concept.
    Returns True if the idea should be scored 0-2.
    This is a STRICT filter - only catches truly nonsensical ideas.
    """
    if not idea_explanation or len(idea_explanation.strip()) < 5:
        return True
    
    idea_lower = idea_explanation.lower().strip()
    
    # ONLY catch truly nonsensical patterns - be very strict
    vague_patterns = [
        # Exact match only for truly vague phrases
        r'^sell\s+ice\s+to\s+(eskimo|esquimau)$',
        r'^perpetual\s+motion$',
        r'^free\s+energy$',
        # Very vague single words or short phrases (exact match)
        r'^(a\s+business|an\s+idea|a\s+startup|making\s+money|earn\s+money)$',
        r'^(sell|selling)\s+(air|nothing|something)$',
    ]
    
    # Check if idea matches vague patterns (must be exact match)
    for pattern in vague_patterns:
        if re.match(pattern, idea_lower, re.IGNORECASE):
            return True
    
    # Only flag if EXTREMELY short (< 15 chars) with no content
    if len(idea_explanation.strip()) < 15:
        # Check if it's just one word or very vague
        words = idea_explanation.strip().split()
        if len(words) <= 1:
            vague_single_words = ['business', 'idea', 'startup', 'money', 'something', 'anything']
            if words[0].lower() in vague_single_words:
                return True
    
    # Only catch specific nonsensical phrases (exact match required)
    nonsensical_phrases = [
        'sell ice to eskimo',
        'sell ice to eskimos',
        'perpetual motion machine',
        'free energy device',
    ]
    
    idea_normalized = ' '.join(idea_lower.split())  # Normalize whitespace
    words = idea_explanation.strip().split()
    for phrase in nonsensical_phrases:
        if phrase in idea_normalized and len(idea_explanation.strip()) < 60:
            # Only catch if it's the main content, not just mentioned
            if idea_normalized.count(phrase) == 1 and len(words) <= 10:
                return True
    
    return False


def _clean_budget_references(content: str, initial_budget: str) -> str:
    """
    Remove budget references from validation response if budget was not specified.
    """
    if not content:
        return content
    
    # If budget is specified and not "Not specified", keep budget references
    if initial_budget and initial_budget.strip().lower() not in ["not specified", "none", ""]:
        return content
    
    # Remove common budget patterns that mention budget amounts
    # More targeted patterns that specifically look for budget-related phrases
    patterns_to_remove = [
        # Patterns with "budget" keyword
        r'\$\d+[Kk]\s+budget',  # $20K budget
        r'\$\d{1,3}(?:,\d{3})+\s+budget',  # $20,000 budget
        r'budget\s+of\s+\$?\d+[Kk]',  # budget of $20K
        r'budget\s+of\s+\$\d{1,3}(?:,\d{3})+',  # budget of $20,000
        r'with\s+a?\s+\$?\d+[Kk]?\s+budget',  # with a $20K budget
        r'with\s+\$?\d{1,3}(?:,\d{3})+\s+budget',  # with $20,000 budget
        r'\$?\d+[Kk]\s+initial\s+budget',  # $20K initial budget
        r'initial\s+budget\s+of\s+\$?\d+[Kk]',  # initial budget of $20K
        # Standalone budget amounts in context that suggest budget (following "with", "on", "for", etc.)
        r'(?:with|on|for|using)\s+\$?\d+[Kk]\s+(?:as|a|your|the)?\s*(?:budget|investment|capital)',  # with $20K budget
        r'(?:budget|investment|capital)\s+(?:of|is|at)\s+\$?\d+[Kk]',  # budget of $20K
        # Additional patterns for common AI-generated budget references
        r'within\s+(?:a\s+)?(?:your\s+)?\$?\d+[Kk]\s+budget',  # within a $20K budget
        r'given\s+(?:a\s+)?(?:your\s+)?\$?\d+[Kk]\s+budget',  # given a $20K budget
        r'considering\s+(?:a\s+)?(?:your\s+)?\$?\d+[Kk]\s+budget',  # considering a $20K budget
        r'budget\s+constraint[s]?\s+(?:of|at|is)\s+\$?\d+[Kk]',  # budget constraint of $20K
    ]
    
    cleaned = content
    for pattern in patterns_to_remove:
        # Remove the matched pattern
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    
    # Clean up extra spaces and line breaks that might result from removals
    cleaned = re.sub(r'\s{2,}', ' ', cleaned)  # Multiple spaces to single space
    cleaned = re.sub(r'\s+\n\s+', '\n', cleaned)  # Spaces around newlines
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)  # Multiple newlines to double
    
    return cleaned

def _parse_markdown_validation(markdown_content: str) -> dict:
    """
    Parse Markdown validation output and convert to JSON format expected by frontend.
    Extracts scores from the 5-pillar table (1-5 scale) and converts to 0-10 scale.
    """
    if not markdown_content or not isinstance(markdown_content, str):
        return None
    
    try:
        # Extract Executive Summary
        exec_summary_match = re.search(
            r'## 🎯 Executive Summary & Overall Verdict\s*\n\n(.*?)(?=\n\n\|)', 
            markdown_content, 
            re.DOTALL
        )
        executive_summary = exec_summary_match.group(1).strip() if exec_summary_match else ""
        
        # Extract scores from the table (1-5 scale)
        pillar_scores = {}
        # Try multiple patterns to find the table
        table_match = None
        table_patterns = [
            r'\| Pillar \| Score.*?\|\n\|.*?\|\n(.*?)(?=\n\n---)',  # Original pattern
            r'\| Pillar \| Score.*?\|\n\|.*?\|\n(.*?)(?=\n\n##)',  # Pattern without --- separator
            r'\|.*?Pillar.*?Score.*?\|\n\|.*?\|\n(.*?)(?=\n\n)',   # More flexible pattern
        ]
        
        for pattern in table_patterns:
            table_match = re.search(pattern, markdown_content, re.DOTALL | re.IGNORECASE)
            if table_match:
                break
        
        if table_match:
            table_rows = table_match.group(1).strip().split('\n')
            pillar_mapping = {
                "Problem-Solution Fit": "problem_solution_fit",
                "Market Viability & Scope": "market_opportunity",
                "Competitive Moat": "competitive_landscape",
                "Financial Viability": "financial_sustainability",
                "Feasibility & Risk": "risk_assessment"
            }
            
            for row in table_rows:
                if '|' in row:
                    # Extract pillar name and score - be more flexible with format
                    parts = [p.strip() for p in row.split('|') if p.strip()]
                    if len(parts) >= 2:
                        # Clean pillar name (remove markdown formatting)
                        pillar_name = re.sub(r'\*\*|\*|`', '', parts[0]).strip()
                        score_text = parts[1].strip()
                        # Extract numeric score (1-5) - look for number in score column
                        score_match = re.search(r'(\d+)', score_text)
                        if score_match:
                            score_1_5 = int(score_match.group(1))
                            # Convert 1-5 scale to 0-10 scale: (score-1)*2.25+1
                            # 1→2, 2→5, 3→7, 4→9, 5→10
                            score_0_10 = max(1, min(10, round((score_1_5 - 1) * 2.25 + 1)))
                            
                            # Map to our scoring keys (case-insensitive partial match)
                            for key, value in pillar_mapping.items():
                                if key.lower() in pillar_name.lower() or pillar_name.lower() in key.lower():
                                    pillar_scores[value] = score_0_10
                                    break
        
        # Calculate overall score as average of pillar scores (convert to 0-10)
        if pillar_scores:
            avg_score = sum(pillar_scores.values()) / len(pillar_scores)
            overall_score = round(avg_score)
        else:
            overall_score = 5  # Default if parsing fails
        
        # Extract Deep Dive Analysis sections
        deep_dive_match = re.search(
            r'## 🔎 Deep Dive Analysis\s*\n\n(.*?)(?=\n\n## 🛑)', 
            markdown_content, 
            re.DOTALL
        )
        deep_dive_full = deep_dive_match.group(1).strip() if deep_dive_match else ""
        
        # Extract individual Deep Dive sections
        # Section 1: Core Problem & User Urgency
        problem_section_match = re.search(
            r'### 1\. Core Problem & User Urgency\s*\n(.*?)(?=\n\n### 2\.|$)', 
            deep_dive_full, 
            re.DOTALL
        )
        problem_analysis = problem_section_match.group(1).strip() if problem_section_match else ""
        
        # Section 2: Business Model Stress Test
        business_model_match = re.search(
            r'### 2\. Business Model Stress Test\s*\n(.*?)(?=\n\n### 3\.|$)', 
            deep_dive_full, 
            re.DOTALL
        )
        business_model_analysis = business_model_match.group(1).strip() if business_model_match else ""
        
        # Section 3: Competitive Landscape
        competitive_match = re.search(
            r'### 3\. Competitive Landscape\s*\n(.*?)(?=\n\n### |$)', 
            deep_dive_full, 
            re.DOTALL
        )
        competitive_analysis = competitive_match.group(1).strip() if competitive_match else ""
        
        # Extract Critical Assumptions & Next Steps
        assumptions_match = re.search(
            r'## 🛑 Critical Assumptions & Next Steps\s*\n\n(.*?)$', 
            markdown_content, 
            re.DOTALL
        )
        assumptions_steps = assumptions_match.group(1).strip() if assumptions_match else ""
        
        # Extract Riskiest Assumption
        riskiest_match = re.search(
            r'### 1\. Riskiest Assumption.*?\n\n(.*?)(?=\n\n### 2\.|$)', 
            assumptions_steps, 
            re.DOTALL
        )
        riskiest_assumption = riskiest_match.group(1).strip() if riskiest_match else ""
        
        # Build details dict - extract specific insights for each parameter
        # Each parameter card should show unique, actionable insights based on the AI analysis
        
        details = {}
        
        # Extract reasoning from the pillar table for each pillar
        pillar_reasoning = {}
        if table_match:
            table_rows = table_match.group(1).strip().split('\n')
            for row in table_rows:
                if '|' in row:
                    parts = [p.strip() for p in row.split('|') if p.strip()]
                    if len(parts) >= 3:
                        # Clean pillar name (remove markdown formatting)
                        pillar_name = re.sub(r'\*\*|\*|`', '', parts[0]).strip()
                        reasoning = parts[2].strip() if len(parts) > 2 else ""
                        # Only store meaningful reasoning (at least 10 characters)
                        if reasoning and len(reasoning) > 10:
                            pillar_reasoning[pillar_name] = reasoning
        
        # Map extracted analysis to frontend parameters with specific insights
        # Problem-Solution Fit
        if "Problem-Solution Fit" in pillar_reasoning:
            details["Problem-Solution Fit"] = f"**Key Insight:** {pillar_reasoning['Problem-Solution Fit']}"
        elif problem_analysis:
            # Extract verdict from problem analysis
            verdict_match = re.search(r'\*\*Verdict:\*\*\s*(.*?)(?:\n|$)', problem_analysis, re.IGNORECASE)
            if verdict_match:
                details["Problem-Solution Fit"] = f"**Assessment:** {verdict_match.group(1).strip()}"
            else:
                # Use first meaningful sentence of problem analysis (at least 20 chars)
                sentences = [s.strip() for s in problem_analysis.split('.') if len(s.strip()) > 20]
                if sentences:
                    details["Problem-Solution Fit"] = f"**Analysis:** {sentences[0]}."
                else:
                    # Use first 150 chars of analysis if no sentences found
                    details["Problem-Solution Fit"] = f"**Analysis:** {problem_analysis[:150]}{'...' if len(problem_analysis) > 150 else ''}"
        elif executive_summary:
            # Fallback to executive summary if problem analysis not available
            details["Problem-Solution Fit"] = f"**Summary:** {executive_summary[:150]}{'...' if len(executive_summary) > 150 else ''}"
        else:
            details["Problem-Solution Fit"] = "See detailed analysis tab for insights."
        
        # Market Opportunity
        if "Market Viability & Scope" in pillar_reasoning:
            details["Market Opportunity"] = f"**Market Assessment:** {pillar_reasoning['Market Viability & Scope']}"
        elif deep_dive_full:
            # Try to extract market-related insights from deep dive
            market_insight = re.search(r'(?:market|size|opportunity|scope|geography|audience).{20,200}\.', deep_dive_full, re.IGNORECASE)
            if market_insight:
                details["Market Opportunity"] = f"**Market View:** {market_insight.group(0)}"
            elif executive_summary:
                # Use executive summary as fallback
                details["Market Opportunity"] = f"**Overview:** {executive_summary[:150]}{'...' if len(executive_summary) > 150 else ''}"
            else:
                details["Market Opportunity"] = "See detailed analysis tab for market insights."
        elif executive_summary:
            details["Market Opportunity"] = f"**Overview:** {executive_summary[:150]}{'...' if len(executive_summary) > 150 else ''}"
        else:
            details["Market Opportunity"] = "See detailed analysis tab for insights."
        
        # Competitive Landscape
        if "Competitive Moat" in pillar_reasoning:
            details["Competitive Landscape"] = f"**Competitive Position:** {pillar_reasoning['Competitive Moat']}"
        elif competitive_analysis:
            # Extract key insight from competitive analysis
            key_insight_match = re.search(r'\*\*Key Insight:\*\*\s*(.*?)(?:\n|$)', competitive_analysis, re.IGNORECASE)
            if key_insight_match:
                details["Competitive Landscape"] = f"**Key Insight:** {key_insight_match.group(1).strip()}"
            else:
                sentences = [s.strip() for s in competitive_analysis.split('.') if len(s.strip()) > 20]
                if sentences:
                    details["Competitive Landscape"] = f"**Analysis:** {sentences[0]}."
                else:
                    details["Competitive Landscape"] = f"**Analysis:** {competitive_analysis[:150]}{'...' if len(competitive_analysis) > 150 else ''}"
        elif executive_summary:
            details["Competitive Landscape"] = f"**Overview:** {executive_summary[:150]}{'...' if len(executive_summary) > 150 else ''}"
        else:
            details["Competitive Landscape"] = "See detailed analysis tab for insights."
        
        # Business Model Viability
        if "Financial Viability" in pillar_reasoning:
            details["Business Model Viability"] = f"**Viability Check:** {pillar_reasoning['Financial Viability']}"
        elif business_model_analysis:
            # Extract red flag or key insight
            red_flag_match = re.search(r'\*\*Red Flag:\*\*\s*(.*?)(?:\n|$)', business_model_analysis, re.IGNORECASE)
            if red_flag_match:
                details["Business Model Viability"] = f"**Critical Risk:** {red_flag_match.group(1).strip()}"
            else:
                sentences = [s.strip() for s in business_model_analysis.split('.') if len(s.strip()) > 20]
                if sentences:
                    details["Business Model Viability"] = f"**Analysis:** {sentences[0]}."
                else:
                    details["Business Model Viability"] = f"**Analysis:** {business_model_analysis[:150]}{'...' if len(business_model_analysis) > 150 else ''}"
        elif executive_summary:
            details["Business Model Viability"] = f"**Overview:** {executive_summary[:150]}{'...' if len(executive_summary) > 150 else ''}"
        else:
            details["Business Model Viability"] = "See detailed analysis tab for insights."
        
        # Risk Assessment
        if "Feasibility & Risk" in pillar_reasoning:
            details["Risk Assessment"] = f"**Risk Profile:** {pillar_reasoning['Feasibility & Risk']}"
        elif riskiest_assumption:
            # Use the riskiest assumption as the insight
            first_sentence = riskiest_assumption.split('.')[0] if riskiest_assumption else ""
            details["Risk Assessment"] = f"**Riskiest Assumption:** {first_sentence}." if first_sentence else "See detailed analysis tab for risk assessment."
        else:
            details["Risk Assessment"] = "See detailed analysis tab for insights."
        
        # Technical Feasibility (derived from feasibility & risk)
        if "Feasibility & Risk" in pillar_reasoning:
            # Extract technical aspects from feasibility reasoning
            tech_match = re.search(r'(?:technical|technology|build|implementation|development).*?\.', pillar_reasoning.get("Feasibility & Risk", ""), re.IGNORECASE)
            if tech_match:
                details["Technical Feasibility"] = f"**Technical View:** {tech_match.group(0)}"
            else:
                details["Technical Feasibility"] = f"**Assessment:** {pillar_reasoning['Feasibility & Risk'][:100]}..."
        else:
            details["Technical Feasibility"] = "See detailed analysis tab for technical assessment."
        
        # Financial Sustainability (derived from financial viability)
        if "Financial Viability" in pillar_reasoning:
            details["Financial Sustainability"] = f"**Financial Health:** {pillar_reasoning['Financial Viability']}"
        elif business_model_analysis:
            # Extract financial insights
            financial_match = re.search(r'(?:financial|revenue|pricing|cost|budget).*?\.', business_model_analysis, re.IGNORECASE)
            if financial_match:
                details["Financial Sustainability"] = f"**Financial Insight:** {financial_match.group(0)}"
            else:
                details["Financial Sustainability"] = "See detailed analysis tab for financial insights."
        else:
            details["Financial Sustainability"] = "See detailed analysis tab for insights."
        
        # Scalability Potential (derived from market + feasibility)
        if "Market Viability & Scope" in pillar_reasoning:
            market_text = pillar_reasoning['Market Viability & Scope']
            scale_match = re.search(r'(?:scale|scalable|growth|expand).*?\.', market_text, re.IGNORECASE)
            if scale_match:
                details["Scalability Potential"] = f"**Scalability:** {scale_match.group(0)}"
            else:
                details["Scalability Potential"] = f"**Assessment:** {market_text[:100]}..."
        else:
            details["Scalability Potential"] = "See detailed analysis tab for scalability assessment."
        
        # Target Audience Clarity (derived from problem analysis)
        if problem_analysis:
            audience_match = re.search(r'(?:user|customer|audience|target|market).*?\.', problem_analysis, re.IGNORECASE)
            if audience_match:
                details["Target Audience Clarity"] = f"**Audience Insight:** {audience_match.group(0)}"
            else:
                details["Target Audience Clarity"] = "See detailed analysis tab for audience insights."
        else:
            details["Target Audience Clarity"] = "See detailed analysis tab for insights."
        
        # Go-to-Market Strategy (derived from next steps or competitive analysis)
        if competitive_analysis:
            gtm_match = re.search(r'(?:market|launch|go-to-market|GTM|strategy|approach).*?\.', competitive_analysis, re.IGNORECASE)
            if gtm_match:
                details["Go-to-Market Strategy"] = f"**Strategy Insight:** {gtm_match.group(0)}"
            else:
                details["Go-to-Market Strategy"] = "See detailed analysis tab for GTM strategy."
        else:
            details["Go-to-Market Strategy"] = "See detailed analysis tab for insights."
        
        # Build recommendations from executive summary + deep dive + assumptions
        # Use the full markdown content if specific sections weren't extracted
        if executive_summary or deep_dive_full or assumptions_steps:
            recommendations = ""
            if executive_summary:
                recommendations += executive_summary + "\n\n"
            if deep_dive_full:
                recommendations += "## 🔎 Deep Dive Analysis\n\n" + deep_dive_full + "\n\n"
            if assumptions_steps:
                recommendations += "## 🛑 Critical Assumptions & Next Steps\n\n" + assumptions_steps
        else:
            # Fallback: use the entire markdown content
            recommendations = markdown_content if markdown_content else "Analysis available in detailed report."
        
        # Extract next steps as list
        next_steps = []
        steps_match = re.search(r'### 2\. Actionable Next Steps.*?\n\n(.*?)(?=\n\n|$)', markdown_content, re.DOTALL)
        if steps_match:
            steps_text = steps_match.group(1)
            step_lines = [line.strip() for line in steps_text.split('\n') if line.strip() and re.match(r'^\d+\.', line.strip())]
            next_steps = step_lines[:5]  # Max 5 steps
        
        # Build complete validation data structure (compatible with frontend)
        # Map 5 pillars to 10 parameters with intelligent distribution
        # If a pillar score exists, use it; otherwise calculate from related pillars or use overall
        market_score = pillar_scores.get("market_opportunity", None)
        problem_score = pillar_scores.get("problem_solution_fit", None)
        competitive_score = pillar_scores.get("competitive_landscape", None)
        financial_score = pillar_scores.get("financial_sustainability", None)
        risk_score = pillar_scores.get("risk_assessment", None)
        
        # Calculate derived scores intelligently
        # If we have market_score, use it for market_opportunity and target_audience_clarity
        # If we have problem_score, use it for problem_solution_fit
        # If we have competitive_score, use it for competitive_landscape and go_to_market_strategy
        # If we have financial_score, use it for financial_sustainability and business_model_viability
        # If we have risk_score, use it for risk_assessment and technical_feasibility
        # For scalability, use market_score if available, otherwise overall
        
        validation_data = {
            "overall_score": overall_score,
            "scores": {
                "market_opportunity": market_score if market_score is not None else round(overall_score),
                "problem_solution_fit": problem_score if problem_score is not None else round(overall_score),
                "competitive_landscape": competitive_score if competitive_score is not None else round(overall_score),
                "target_audience_clarity": market_score if market_score is not None else (problem_score if problem_score is not None else round(overall_score)),
                "business_model_viability": financial_score if financial_score is not None else (market_score if market_score is not None else round(overall_score)),
                "technical_feasibility": risk_score if risk_score is not None else (problem_score if problem_score is not None else round(overall_score)),
                "financial_sustainability": financial_score if financial_score is not None else round(overall_score),
                "scalability_potential": market_score if market_score is not None else (financial_score if financial_score is not None else round(overall_score)),
                "risk_assessment": risk_score if risk_score is not None else round(overall_score),
                "go_to_market_strategy": competitive_score if competitive_score is not None else (market_score if market_score is not None else round(overall_score)),
            },
            "details": details,
            "recommendations": recommendations,
            "next_steps": next_steps if next_steps else ["1. Review the detailed analysis above", "2. Address the critical assumptions identified", "3. Execute the prioritized validation steps"],
            "markdown_report": markdown_content,  # Store original Markdown for full display
        }
        
        return validation_data
        
    except Exception as e:
        # Safe logger access - may not be in Flask context
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        try:
            from flask import current_app
            if current_app:
                logger = current_app.logger
        except RuntimeError:
            pass  # Not in Flask context, use standard logger
        logger.error(f"Failed to parse Markdown validation: {e}")
        logger.error(f"Markdown content length: {len(markdown_content) if markdown_content else 0}")
        logger.error(f"First 1000 chars: {markdown_content[:1000] if markdown_content else 'None'}")
        logger.error(traceback.format_exc())
        return None


# Alias for backward compatibility with tests
_extract_validation_data_from_markdown = _parse_markdown_validation


def _cap_scores_for_vague_idea(validation_data: dict, idea_explanation: str) -> dict:
    """
    Cap all scores to 0-2 if idea is detected as vague/nonsensical.
    """
    if not _is_idea_vague_or_nonsensical(idea_explanation):
        return validation_data
    
    # Log that we're capping scores
    current_app.logger.warning(
        f"Capping validation scores to 0-2 for vague/nonsensical idea: '{idea_explanation[:100]}'"
    )
    
    # Original scores for reference
    original_overall = validation_data.get("overall_score", 5)
    
    # Cap overall score to max 2
    validation_data["overall_score"] = min(original_overall, 2)
    
    # Cap all parameter scores to max 2
    if "scores" in validation_data and isinstance(validation_data["scores"], dict):
        for key in validation_data["scores"]:
            validation_data["scores"][key] = min(validation_data["scores"].get(key, 5), 2)
    
    # Add note in recommendations about why scores were capped
    if "recommendations" in validation_data:
        note = "\n\n**NOTE**: This idea was identified as too vague or nonsensical as a business concept. Scores have been capped at 2/10. To improve your score, provide a clear business description including: what problem you're solving, who your target customers are, how your solution works, and your revenue model."
        validation_data["recommendations"] = note + "\n\n" + str(validation_data.get("recommendations", ""))
    
    return validation_data


@bp.post("/api/validate-idea")
@require_auth
@apply_rate_limit("10 per hour")
def validate_idea() -> Any:
  """Validate a startup idea across 10 key parameters using OpenAI."""
  # Check usage limits and refresh session activity at start
  session = get_current_session()
  if not session:
    return jsonify({"success": False, "error": "Authentication required"}), 401
  
  # Refresh session activity at the start to prevent expiration during long validation
  session.last_activity = utcnow()
  db.session.commit()
  
  user = session.user
  can_validate, error_message = user.can_perform_validation()
  if not can_validate:
    return jsonify({
      "success": False,
      "error": error_message,
      "usage_limit_reached": True,
      "upgrade_required": True,
    }), 403
  
  data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
  category_answers = data.get("category_answers", {})
  idea_explanation = data.get("idea_explanation", "").strip()
  
  # Validate idea explanation using centralized validator
  is_valid, error_msg = validate_idea_explanation(idea_explanation)
  if not is_valid:
    return jsonify({
      "success": False,
      "error": error_msg or "Please provide a valid description of your idea.",
    }), 400
  
  # Validate category_answers fields if provided
  if category_answers:
    # Validate individual category answer fields for length and content
    max_field_lengths = {
      "industry": 200,
      "geography": 200,
      "stage": 100,
      "commitment": 100,
      "problem_category": 200,
      "solution_type": 200,
      "user_type": 200,
      "revenue_model": 200,
      "unique_moat": 1000,
      "initial_budget": 100,
      "competitors": 2000,
      "business_archetype": 200,
      "delivery_channel": 200,
    }
    
    for field_name, max_length in max_field_lengths.items():
      if field_name in category_answers and category_answers[field_name]:
        field_value = str(category_answers[field_name]).strip()
        is_valid, error_msg = validate_text_field(
          field_value,
          field_name.replace("_", " ").title(),
          required=False,
          max_length=max_length,
          allow_html=False
        )
        if not is_valid:
          return jsonify({
            "success": False,
            "error": error_msg,
          }), 400
    
    # Validate constraints array if provided
    if "constraints" in category_answers and category_answers["constraints"]:
      is_valid, error_msg, _ = validate_string_array(
        category_answers["constraints"],
        "Constraints",
        max_items=50,
        max_item_length=200,
        required=False
      )
      if not is_valid:
        return jsonify({
          "success": False,
          "error": error_msg,
        }), 400
  
  # PRE-CHECK: If idea is vague/nonsensical, return harsh default score immediately (no AI call)
  # DISABLED - Let AI judge instead since we have structured data from form
  # if _is_idea_vague_or_nonsensical(idea_explanation):
  #   current_app.logger.info(f"Vague/nonsensical idea detected, returning default low score: '{idea_explanation[:100]}'")
  #   
  #   # Return a default harsh validation without AI call
  #   validation_id = f"val_{int(time.time())}"
  #   default_validation = {
  #     "overall_score": 1,
  #     "scores": {
  #       "market_opportunity": 1,
  #       "problem_solution_fit": 1,
  #       "competitive_landscape": 1,
  #       "target_audience_clarity": 1,
  #       "business_model_viability": 1,
  #       "technical_feasibility": 5,  # Technically feasible but not a business
  #       "financial_sustainability": 1,
  #       "scalability_potential": 1,
  #       "risk_assessment": 2,
  #       "go_to_market_strategy": 1,
  #     },
  #     "details": {
  #       "Market Opportunity": f"This idea ('{idea_explanation[:100]}') is too vague or nonsensical to evaluate as a business concept. No clear market opportunity exists because the idea lacks a concrete business model, target customers, or value proposition.",
  #       "Problem-Solution Fit": "No clear problem is being solved. This appears to be a question, phrase, or concept rather than an actual business idea. Real business ideas solve specific problems for specific customers.",
  #       "Competitive Landscape": "Cannot evaluate competition because this is not a clear business concept.",
  #       "Target Audience Clarity": "No target audience can be identified. This idea is too vague to determine who would be the customer.",
  #       "Business Model Viability": "No clear business model exists. This is not a viable business concept as presented.",
  #       "Technical Feasibility": "While technically anything could be built, this is not a coherent business idea to evaluate.",
  #       "Financial Sustainability": "No financial model can be evaluated because this is not a clear business concept.",
  #       "Scalability Potential": "Cannot evaluate scalability for a non-existent business model.",
  #       "Risk Assessment": "The primary risk is that this is not a coherent business idea with a clear path forward.",
  #       "Go-to-Market Strategy": "No go-to-market strategy can be developed because the business concept is unclear or nonsensical.",
  #     },
  #     "recommendations": f"""
  # ## Critical Assessment
  # 
  # **This idea is too vague or nonsensical to evaluate as a business.**
  # 
  # What you provided: "{idea_explanation}"
  # 
  # ### Why this scored 1/10:
  # 
  # 1. **Not a Business Concept**: This appears to be a question, phrase, or abstract concept rather than an actual business idea.
  # 2. **No Clear Value Proposition**: There's no clear problem being solved or value being created.
  # 3. **No Target Market**: We cannot identify who would pay for this.
  # 4. **No Business Model**: There's no clear way this makes money or creates value.
  # 
  # ### What You Need to Provide:
  # 
  # A real business idea should include:
  # - **The Problem**: What specific problem are you solving?
  # - **The Solution**: How does your product/service solve it?
  # - **Target Customers**: Who specifically will pay for this?
  # - **Revenue Model**: How will you make money?
  # - **Why Now**: Why is this needed now?
  # 
  # ### Examples of Better Idea Descriptions:
  # 
  # ❌ **Bad**: "Making money online"
  # ✅ **Good**: "A SaaS platform that helps freelancers automatically track and invoice their billable hours, solving the problem of manual time tracking and missed billings. Target customers: Freelancers earning $50K+. Revenue: $29/month subscription."
  # 
  # ❌ **Bad**: "A business"
  # ✅ **Good**: "An AI-powered meal planning app for busy professionals that generates personalized weekly meal plans based on dietary restrictions, schedule, and budget. Targets: 25-45 year old professionals. Revenue: Freemium model with $9.99/month premium."
  # 
  # ❌ **Bad**: "Sell ice to eskimos"
  # ✅ **Good**: "A sales training consultancy that teaches B2B sales teams advanced consultative selling techniques, using frameworks like 'how to sell to customers who think they don't need it.' Targets: Mid-size B2B companies. Revenue: $5,000-$20,000 per training engagement."
  # 
  # ### Next Steps:
  # 
  # 1. **Refine Your Idea**: Clearly articulate what problem you're solving and for whom.
  # 2. **Do Research**: Understand your target market and competition.
  # 3. **Define Your Value Proposition**: What makes your solution better than alternatives?
  # 4. **Test the Concept**: Talk to potential customers before building.
  # 
  # Once you have a clear business concept with these elements, we can provide a meaningful validation.
  #       """,
  #     "next_steps": [
  #       "1. **Define the problem clearly**: What specific pain point are you solving?",
  #       "2. **Identify your target customer**: Who specifically needs this solution?",
  #       "3. **Articulate your solution**: How does your product/service solve the problem?",
  #       "4. **Explain your business model**: How will you make money?",
  #       "5. **Re-submit with details**: Once you have a clear business concept, submit it again for validation.",
  #     ],
  #   }
  #   
  #   # Save to database if user is authenticated
  #   if session:
  #     user = session.user
  #     user_validation = UserValidation(
  #       user_id=user.id,
  #       validation_id=validation_id,
  #       category_answers=json.dumps(category_answers),
  #       idea_explanation=idea_explanation,
  #       validation_result=json.dumps(default_validation),
  #       status="completed",  # Explicitly set status
  #       is_deleted=False,  # Explicitly set is_deleted
  #     )
  #     db.session.add(user_validation)
  #     user.increment_validation_usage()
  #     if session:
  #       session.last_activity = utcnow()
  #     db.session.commit()
  #   
  #   return jsonify({
  #     "success": True,
  #     "validation_id": validation_id,
  #     "validation": default_validation,
  #     "note": "Idea was identified as vague/nonsensical. Score capped at 1/10. Please provide a clear business concept for meaningful validation.",
  #   })
  
  # Build explanation from category answers if idea_explanation is empty or very short
  if not idea_explanation or len(idea_explanation) < 10:
    explanation_parts = []
    for key, value in category_answers.items():
      if value:
        explanation_parts.append(f"{key.replace('_', ' ').title()}: {value}")
    if explanation_parts:
      idea_explanation = "\n".join(explanation_parts)
    elif not idea_explanation:
      idea_explanation = "No detailed explanation provided."
  
  # Final check - ensure we have something to validate
  if not idea_explanation or len(idea_explanation.strip()) < 5:
    return jsonify({"success": False, "error": "Please provide category answers or idea explanation"}), 400
  
  try:
    client, model_name, is_claude = _get_validation_client()
    
    # Get user's latest intake data from their most recent run
    user_intake = {}
    latest_run = UserRun.query.filter_by(user_id=user.id).order_by(UserRun.created_at.desc()).first()
    if latest_run and latest_run.inputs:
      try:
        if isinstance(latest_run.inputs, str):
          user_intake = json.loads(latest_run.inputs)
        else:
          user_intake = latest_run.inputs
      except (json.JSONDecodeError, TypeError):
        current_app.logger.warning(f"Failed to parse user intake data for user {user.id}")
        user_intake = {}
    
    # Build structured data for the 14-field validation system
    # Map available data to the structured format expected by the new validation prompt
    
    def _sanitize_list(value):
      if not value:
        return []
      if isinstance(value, (list, tuple, set)):
        candidates = list(value)
      else:
        candidates = [value]
      cleaned = []
      for item in candidates:
        if not item:
          continue
        text = item.strip() if isinstance(item, str) else str(item)
        if text and text not in cleaned:
          cleaned.append(text)
      return cleaned
    
    constraint_values = _sanitize_list(category_answers.get("constraints"))
    intake_constraint_sources = [
      user_intake.get("time_commitment"),
      user_intake.get("budget_range"),
      user_intake.get("work_style"),
      user_intake.get("skill_strength"),
    ]
    for extra in intake_constraint_sources:
      if not extra:
        continue
      text = extra.strip() if isinstance(extra, str) else str(extra)
      if text and text not in constraint_values:
        constraint_values.append(text)
    
    structured_data = {
      "industry": category_answers.get("industry") or user_intake.get("industry") or user_intake.get("interest_area") or "Not specified",
      "geography": category_answers.get("geography") or user_intake.get("primary_geography") or "Global",
      "stage": category_answers.get("stage") or user_intake.get("idea_stage") or "Raw Idea",
      "commitment": category_answers.get("commitment") or user_intake.get("time_commitment") or "Part-time",
      "problem_category": category_answers.get("problem_category") or category_answers.get("industry") or user_intake.get("pain_point") or "General",
      "solution_type": category_answers.get("solution_type") or category_answers.get("solution") or user_intake.get("solution_type") or "Product",
      "user_type": category_answers.get("user_type") or category_answers.get("target_audience") or user_intake.get("target_audience") or "General users",
      "revenue_model": category_answers.get("revenue_model") or category_answers.get("business_model") or user_intake.get("revenue_model") or "Subscription",
      "unique_moat": category_answers.get("unique_moat") or category_answers.get("unique_value") or user_intake.get("differentiator") or "Not specified",
      "description_structured": idea_explanation,
      "initial_budget": category_answers.get("initial_budget") or category_answers.get("budget") or user_intake.get("budget_range") or "Not specified",
      "constraints": constraint_values,
      "competitors": category_answers.get("competitors") or category_answers.get("competition") or user_intake.get("known_competitors") or "Unknown",
      "business_archetype": category_answers.get("business_archetype") or user_intake.get("business_archetype") or "Not specified",
      "delivery_channel": category_answers.get("delivery_channel") or user_intake.get("delivery_channel") or "Not specified",
    }
    
    # Build the structured JSON data string for the prompt
    structured_json = json.dumps(structured_data, indent=2)
    business_profile = _match_archetype_profile(structured_data.get("business_archetype"))
    delivery_channel_value = structured_data.get("delivery_channel")
    validation_prompt = _build_validation_prompt(structured_json, business_profile, delivery_channel_value)
    
    system_prompt = VALIDATION_SYSTEM_PROMPT
    
    content = _call_ai_validation(
      client=client,
      model_name=model_name,
      is_claude=is_claude,
      system_prompt=system_prompt,
      user_prompt=validation_prompt,
      temperature=0.7,
      max_tokens=4000  # Increased for Markdown format output
    )
    
    # Clean budget references if budget was not specified
    initial_budget = structured_data.get("initial_budget", "")
    if not initial_budget or initial_budget.strip().lower() in ["not specified", "none", ""]:
        content = _clean_budget_references(content, initial_budget or "")
    
    # Parse Markdown response and convert to JSON format
    validation_data = _parse_markdown_validation(content)
    
    if not validation_data:
        current_app.logger.error(f"Failed to parse validation response. Content length: {len(content) if content else 0}")
        current_app.logger.error(f"First 1000 chars of content: {content[:1000] if content else 'None'}")
        # Fallback: try to parse as JSON (backward compatibility)
        try:
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
            if json_match:
                content = json_match.group(1)
            else:
                json_match = re.search(r'\{.*?\}', content, re.DOTALL)
                if json_match:
                    content = json_match.group(0)
            
            validation_data = json.loads(content)
        except:
            current_app.logger.error(f"Failed to parse validation (both Markdown and JSON failed). Raw content: {content[:500]}")
            return jsonify({
                "success": False,
                "error": "We couldn't generate a properly structured validation for your idea. Please try again or provide more details about your business concept.",
                "error_type": "invalid_response",
                "suggestion": "Make sure your idea description is clear and includes: what problem you're solving, who your customers are, and how your solution works.",
            }), 422
    
    # POST-PROCESSING: Skip capping - let AI scores stand with structured data
    # if validation_data and isinstance(validation_data, dict):
    #     validation_data = _cap_scores_for_vague_idea(validation_data, idea_explanation)
    
    # Validate that we got meaningful validation results
    if not validation_data or not isinstance(validation_data, dict):
      return jsonify({
        "success": False,
        "error": "We couldn't analyze your idea properly. Please provide more details about your idea and try again.",
        "error_type": "invalid_response",
      }), 422
    
    # Check if we have the essential validation data
    has_score = "overall_score" in validation_data or "score" in validation_data
    has_parameters = "parameters" in validation_data or "analysis" in validation_data
    has_recommendations = "recommendations" in validation_data or "details" in validation_data
    
    # Check if the content is meaningful (not just empty/default)
    content_meaningful = False
    if has_recommendations:
      recs = validation_data.get("recommendations", "") or validation_data.get("details", "")
      if isinstance(recs, str) and len(recs.strip()) > 50:
        content_meaningful = True
      elif isinstance(recs, dict) and len(str(recs)) > 50:
        content_meaningful = True
    
    if not has_score and not has_parameters and not content_meaningful:
      return jsonify({
        "success": False,
        "error": "We couldn't generate a complete validation for your idea. Please provide more specific details about your business idea, target market, and value proposition.",
        "error_type": "incomplete_validation",
        "suggestion": "Try including more details about: what problem you're solving, who your target customers are, how your solution works, and what makes it unique.",
      }), 422
    
    # Check if the idea explanation itself is too vague/nonsensical
    if len(idea_explanation.strip()) < 20:
      return jsonify({
        "success": False,
        "error": "Your idea description is too brief or unclear. Please provide a more detailed explanation of your business idea, including what problem it solves and how it works.",
        "error_type": "insufficient_detail",
        "suggestion": "Aim for at least 50-100 words describing your idea, target customers, and how it works.",
      }), 400
    
    validation_id = f"val_{int(time.time())}"
    
    # Save to database if user is authenticated
    session = get_current_session()
    if session:
      user = session.user
      user_validation = UserValidation(
        user_id=user.id,
        validation_id=validation_id,
        category_answers=json.dumps(category_answers),
        idea_explanation=idea_explanation,
        validation_result=json.dumps(validation_data),
        status="completed",  # Explicitly set status
        is_deleted=False,  # Explicitly set is_deleted
      )
      db.session.add(user_validation)
      # Increment usage counter
      user.increment_validation_usage()
      # Refresh session activity after long operation completes
      if session:
        session.last_activity = utcnow()
      db.session.commit()
      
      # Send validation ready email
      try:
        overall_score = validation_data.get("overall_score", None)
        html_content, text_content = validation_ready_email(
          user_name=user.email,
          validation_id=validation_id,
          validation_score=overall_score,
        )
        email_service.send_email(
          to_email=user.email,
          subject="Your Idea Validation is Ready! 📊",
          html_content=html_content,
          text_content=text_content,
        )
      except Exception as e:
        current_app.logger.warning(f"Failed to send validation ready email: {e}")
    
    return jsonify({
      "success": True,
      "validation_id": validation_id,
      "validation": validation_data,
    })
    
  except Exception as exc:
    current_app.logger.exception("Idea validation failed: %s", exc)
    return jsonify({
      "success": False,
      "error": str(exc),
    }), 500


@bp.put("/api/validate-idea/<validation_id>")
@require_auth
def update_validation(validation_id: str) -> Any:
  """Update/edit an existing validation with a new idea explanation."""
  session = get_current_session()
  if not session:
    return jsonify({"success": False, "error": "Not authenticated"}), 401
  
  user = session.user
  
  # Check if validation exists and belongs to user (exclude deleted)
  # Try to convert validation_id to integer if it's numeric (for database id matching)
  validation_id_int = None
  try:
    validation_id_int = int(validation_id)
  except (ValueError, TypeError):
    pass
  
  # Find validation by validation_id (string) or id (integer)
  # Try validation_id first (most common case)
  user_validation = UserValidation.query.filter_by(
    user_id=user.id,
    validation_id=validation_id,
    is_deleted=False
  ).first()
  
  # If not found by validation_id, try by database id (if validation_id is numeric)
  if not user_validation and validation_id_int:
    user_validation = UserValidation.query.filter_by(
      user_id=user.id,
      id=validation_id_int,
      is_deleted=False
    ).first()
  
  if not user_validation:
    return jsonify({
      "success": False,
      "error": "Validation not found or access denied"
    }), 404
  
  data: Dict[str, Any] = request.get_json(force=True, silent=True) or {}
  new_idea_explanation = data.get("idea_explanation", "").strip()
  new_category_answers = data.get("category_answers", {})
  
  if not new_idea_explanation and not new_category_answers:
    return jsonify({
      "success": False,
      "error": "Please provide a new idea_explanation or category_answers"
    }), 400
  
  # Use new idea explanation or build from category answers
  if new_idea_explanation:
    idea_explanation = new_idea_explanation
  elif new_category_answers:
    explanation_parts = []
    for key, value in new_category_answers.items():
      if value:
        explanation_parts.append(f"{key.replace('_', ' ').title()}: {value}")
    idea_explanation = "\n".join(explanation_parts) if explanation_parts else user_validation.idea_explanation
  else:
    idea_explanation = user_validation.idea_explanation
  
  # Check usage limits (re-validation counts as a new validation)
  can_validate, error_message = user.can_perform_validation()
  if not can_validate:
    return jsonify({
      "success": False,
      "error": error_message,
      "usage_limit_reached": True,
      "upgrade_required": True,
    }), 403
  
  # PRE-CHECK: If idea is vague/nonsensical, return harsh default score immediately
  if _is_idea_vague_or_nonsensical(idea_explanation):
    current_app.logger.info(f"Vague/nonsensical idea detected in edit, returning default low score: '{idea_explanation[:100]}'")
    
    default_validation = {
      "overall_score": 1,
      "scores": {
        "market_opportunity": 1,
        "problem_solution_fit": 1,
        "competitive_landscape": 1,
        "target_audience_clarity": 1,
        "business_model_viability": 1,
        "technical_feasibility": 5,
        "financial_sustainability": 1,
        "scalability_potential": 1,
        "risk_assessment": 2,
        "go_to_market_strategy": 1,
      },
      "details": {
        "Market Opportunity": f"This idea is too vague or nonsensical to evaluate as a business. No clear market exists.",
        "Problem-Solution Fit": "No clear problem is being solved. This appears to be a question/phrase rather than a business idea.",
        "Competitive Landscape": "Cannot evaluate - not a clear business concept.",
        "Target Audience Clarity": "No target audience can be identified - idea is too vague.",
        "Business Model Viability": "No clear business model exists.",
        "Technical Feasibility": "Technically possible but not a coherent business idea.",
        "Financial Sustainability": "No financial model can be evaluated - not a clear business.",
        "Scalability Potential": "Cannot evaluate scalability for non-existent business model.",
        "Risk Assessment": "Primary risk: this is not a coherent business idea.",
        "Go-to-Market Strategy": "No GTM strategy possible - business concept is unclear.",
      },
      "recommendations": f"## Critical Issue\n\n**This idea ('{idea_explanation}') is too vague or nonsensical to evaluate as a business.**\n\nPlease provide a clear business description with: problem, solution, target customers, and revenue model.",
      "next_steps": [
        "1. Define the problem clearly",
        "2. Identify your target customer",
        "3. Articulate your solution",
        "4. Explain your business model",
        "5. Re-submit with details",
      ],
    }
    
    # Update validation record
    user_validation.idea_explanation = idea_explanation
    user_validation.category_answers = json.dumps(new_category_answers if new_category_answers else user_validation.category_answers or {})
    user_validation.validation_result = json.dumps(default_validation)
    user_validation.created_at = utcnow()  # Update timestamp
    
    user.increment_validation_usage()
    db.session.commit()
    
    return jsonify({
      "success": True,
      "validation_id": validation_id,
      "validation": default_validation,
      "note": "Idea identified as vague/nonsensical. Score: 1/10.",
    })
  
  # Otherwise, run full validation (same logic as create)
  try:
    client, model_name, is_claude = _get_validation_client()
    
    # Get user's latest intake data
    user_intake = {}
    latest_run = UserRun.query.filter_by(user_id=user.id).order_by(UserRun.created_at.desc()).first()
    if latest_run and latest_run.inputs:
      try:
        if isinstance(latest_run.inputs, str):
          user_intake = json.loads(latest_run.inputs)
        else:
          user_intake = latest_run.inputs
      except (json.JSONDecodeError, TypeError):
        pass
    
    # Build structured data (same as create endpoint)
    category_answers = new_category_answers if new_category_answers else {}
    if user_validation.category_answers:
      try:
        existing_answers = json.loads(user_validation.category_answers)
        category_answers = {**existing_answers, **category_answers}  # Merge
      except:
        pass
    
    structured_data = {
      "industry": category_answers.get("industry") or user_intake.get("interest_area") or "Not specified",
      "geography": category_answers.get("geography") or "Global",
      "stage": user_intake.get("time_commitment") or category_answers.get("stage") or "Early",
      "commitment": user_intake.get("time_commitment") or category_answers.get("commitment") or "Part-time",
      "problem_category": category_answers.get("problem_category") or category_answers.get("industry") or "General",
      "solution_type": category_answers.get("solution_type") or category_answers.get("business_model") or "Product",
      "user_type": category_answers.get("target_audience") or category_answers.get("user_type") or "General users",
      "revenue_model": category_answers.get("revenue_model") or category_answers.get("business_model") or "Subscription",
      "unique_moat": category_answers.get("unique_moat") or category_answers.get("unique_value") or "Not specified",
      "description_structured": idea_explanation,
      "initial_budget": user_intake.get("budget_range") or category_answers.get("budget") or "Not specified",
      "constraints": [
        user_intake.get("time_commitment", ""),
        user_intake.get("budget_range", ""),
        user_intake.get("work_style", ""),
      ],
      "competitors": category_answers.get("competitors") or "Not specified",
      "business_archetype": category_answers.get("business_archetype") or "Not specified",
      "delivery_channel": category_answers.get("delivery_channel") or "Not specified",
      "timeline": user_intake.get("time_commitment") or "Not specified",
    }
    
    structured_data["constraints"] = [c for c in structured_data["constraints"] if c]
    structured_json = json.dumps(structured_data, indent=2)
    business_profile = _match_archetype_profile(structured_data.get("business_archetype"))
    delivery_channel_value = structured_data.get("delivery_channel")
    
    validation_prompt = _build_validation_prompt(structured_json, business_profile, delivery_channel_value)
    system_prompt = VALIDATION_SYSTEM_PROMPT
    
    content = _call_ai_validation(
      client=client,
      model_name=model_name,
      is_claude=is_claude,
      system_prompt=system_prompt,
      user_prompt=validation_prompt,
      temperature=0.7,
      max_tokens=4000  # Increased for Markdown format output
    )
    
    # Clean budget references if budget was not specified
    initial_budget = structured_data.get("initial_budget", "")
    if not initial_budget or initial_budget.strip().lower() in ["not specified", "none", ""]:
        content = _clean_budget_references(content, initial_budget or "")
    
    # Parse Markdown response and convert to JSON format (same as create)
    validation_data = _parse_markdown_validation(content)
    
    if not validation_data:
      # Fallback: try to parse as JSON (backward compatibility)
      try:
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
        if json_match:
          content = json_match.group(1)
        else:
          json_match = re.search(r'\{.*?\}', content, re.DOTALL)
          if json_match:
            content = json_match.group(0)
        
        validation_data = json.loads(content)
      except:
        current_app.logger.error(f"Failed to parse validation (both Markdown and JSON failed) in edit. Raw content: {content[:500]}")
        return jsonify({
          "success": False,
          "error": "We couldn't generate a properly structured validation. Please try again.",
          "error_type": "invalid_response",
        }), 422
    
    # POST-PROCESSING: Cap scores for vague/nonsensical ideas
    validation_data = _cap_scores_for_vague_idea(validation_data, idea_explanation)
    
    # Update validation record
    user_validation.idea_explanation = idea_explanation
    user_validation.category_answers = json.dumps(new_category_answers if new_category_answers else (user_validation.category_answers or {}))
    user_validation.validation_result = json.dumps(validation_data)
    user_validation.created_at = utcnow()  # Update timestamp
    
    user.increment_validation_usage()
    db.session.commit()
    
    return jsonify({
      "success": True,
      "validation_id": validation_id,
      "validation": validation_data,
      "message": "Validation updated successfully",
    })
    
  except Exception as exc:
    current_app.logger.exception("Validation update failed: %s", exc)
    db.session.rollback()
    return jsonify({
      "success": False,
      "error": str(exc),
    }), 500


@bp.delete("/api/validate-idea/<validation_id>")
@require_auth
def delete_validation(validation_id: str) -> Any:
  """Delete a validation (soft delete by setting is_deleted=True)."""
  session = get_current_session()
  if not session:
    return jsonify({"success": False, "error": "Not authenticated"}), 401
  
  user = session.user
  
  try:
    # Try to convert validation_id to integer if it's numeric (for database id matching)
    validation_id_int = None
    try:
      validation_id_int = int(validation_id)
    except (ValueError, TypeError):
      pass
    
    # Find validation by validation_id (string) or id (integer)
    # Try validation_id first (most common case)
    user_validation = UserValidation.query.filter_by(
      user_id=user.id,
      validation_id=validation_id,
      is_deleted=False
    ).first()
    
    # If not found by validation_id, try by database id (if validation_id is numeric)
    if not user_validation and validation_id_int:
      user_validation = UserValidation.query.filter_by(
        user_id=user.id,
        id=validation_id_int,
        is_deleted=False
      ).first()
    
    if not user_validation:
      current_app.logger.warning(
        f"Validation delete failed: validation_id={validation_id} not found for user_id={user.id}"
      )
      return jsonify({
        "success": False,
        "error": "Validation not found or access denied. It may have already been deleted."
      }), 404
    
    # Soft delete by setting is_deleted=True
    user_validation.is_deleted = True
    db.session.commit()
    
    return jsonify({
      "success": True,
      "message": "Validation deleted successfully"
    })
    
  except Exception as exc:
    current_app.logger.exception("Validation deletion failed: %s", exc)
    db.session.rollback()
    return jsonify({
      "success": False,
      "error": str(exc),
    }), 500

