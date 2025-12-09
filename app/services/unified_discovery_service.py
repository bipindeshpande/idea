"""
Unified Discovery Service - High-performance single-shot pipeline.
Replaces CrewAI hierarchical structure with pre-computed tools + single LLM call.
"""
import time
import re
import json
from typing import Dict, Any, Optional, Iterator, Tuple, Union
from concurrent.futures import ThreadPoolExecutor, as_completed, Future
from openai import OpenAI
import os
from flask import current_app

# Anthropic Claude support
try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    Anthropic = None

# Import tiktoken for accurate token counting
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False

# Import timing logger
try:
    from app.utils.timing_logger import log_timing, save_timing_log, clear_timing_data
    TIMING_LOGGER_AVAILABLE = True
except ImportError:
    TIMING_LOGGER_AVAILABLE = False
    def log_timing(*args, **kwargs):
        pass
    def save_timing_log():
        pass
    def clear_timing_data():
        pass

from startup_idea_crew.tools import (
    research_market_trends,
    analyze_competitors,
    estimate_market_size,
    validate_startup_idea,
    assess_startup_risks,
    estimate_startup_costs,
    project_revenue,
    check_financial_viability,
    generate_customer_persona,
    generate_validation_questions,
)
# Removed unified_prompt import - using two-stage system instead
from app.utils.discovery_cache import DiscoveryCache
from app.utils.archetype_cache import ArchetypeCache
# Removed domain_research import - not used in two-stage system
from app.utils.performance_metrics import record_tool_call, start_metrics_collection
from app.services.static_loader import load_static_blocks
from app.services.static_tool_loader import StaticToolLoader


# Injectable mock client for testing
_MOCK_OPENAI_CLIENT = None
_MOCK_ANTHROPIC_CLIENT = None

# Discovery model configuration - can be "openai", "claude", or "auto" (tries Claude first, falls back to OpenAI)
DISCOVERY_MODEL_PROVIDER = os.environ.get("DISCOVERY_MODEL_PROVIDER", "openai").lower()

# Removed CRITICAL_TOOLS - no longer needed with two-stage system using static blocks

# Default static tool fields - ensures Stage 2 always has all required fields
# Prevents tool execution AND reduces LLM complexity
DEFAULT_STATIC_TOOL_FIELDS = {
    "costs": "Typical startup costs for SaaS MVP: $50K-$150K development, $2K-$10K/month infrastructure, $20K-$40K/month team costs. Total first-year burn: $200K-$500K. Lower-cost options: No-code platforms ($500-$5K/month), API-first approach ($1K-$5K/month).",
    "revenue": "Common revenue models: Subscription SaaS ($29-$299/month per user), Usage-based ($0.01-$0.10 per API call), Enterprise licensing ($10K-$100K+ annually), Freemium (free tier + paid upgrades). Average ARPU: $50-$200/month for SMB, $500-$2000/month for enterprise.",
    "viability": "Startup viability factors: Strong market demand, multiple monetization paths, achievable break-even in 12-18 months with $10K-$50K MRR. Success factors: Focus on specific vertical, prioritize ease of use, build integration ecosystem, maintain competitive pricing, invest in customer education.",
    "persona": "Primary customer personas: SMB owners seeking automation (age 35-55, tech-savvy, time-constrained, budget-conscious), Enterprise operations teams (age 28-45, process-focused, ROI-driven), Developers/technical founders (age 25-40, early adopters, API-first mindset), Content creators (age 22-35, creative professionals, productivity-focused).",
    "validation_questions": "Key validation priorities: Prove time savings (quantify hours saved), Demonstrate ROI within 30-60 days, Showcase ease of integration (no-code options), Address data security concerns upfront, Provide clear use cases and templates. Key metrics: Time-to-value < 1 week, User activation rate > 40%, Monthly retention > 85%."
}


def _get_llm_client():
    """
    Get the appropriate LLM client for discovery (OpenAI or Anthropic).
    Returns: (client, model_name, is_claude)
    """
    provider = DISCOVERY_MODEL_PROVIDER
    
    # Force OpenAI if Claude is not available
    if provider == "claude" and not ANTHROPIC_AVAILABLE:
        current_app.logger.warning("Claude requested but anthropic package not installed. Falling back to OpenAI.")
        provider = "openai"
    
    # Auto mode: try Claude first, fall back to OpenAI
    if provider == "auto":
        if ANTHROPIC_AVAILABLE and os.environ.get("ANTHROPIC_API_KEY"):
            provider = "claude"
        else:
            provider = "openai"
    
    if provider == "claude":
        if _MOCK_ANTHROPIC_CLIENT is not None:
            return _MOCK_ANTHROPIC_CLIENT, os.environ.get("CLAUDE_MODEL_NAME", "claude-sonnet-4-20250514"), True
        
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            current_app.logger.warning("ANTHROPIC_API_KEY not set. Falling back to OpenAI.")
            # Fall through to OpenAI section below
        else:
            client = Anthropic(api_key=api_key)
            model_name = os.environ.get("CLAUDE_MODEL_NAME", "claude-sonnet-4-20250514")
            return client, model_name, True
    
    # Default to OpenAI (or fallback from Claude)
    if _MOCK_OPENAI_CLIENT is not None:
        return _MOCK_OPENAI_CLIENT, "gpt-4o-mini", False
    
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is not set")
    return OpenAI(api_key=api_key), "gpt-4o-mini", False


def _validate_profile_data(profile_data: Dict[str, Any]) -> None:
    """
    Validate profile_data structure and content.
    
    Args:
        profile_data: Profile data dictionary
    
    Raises:
        ValueError: If profile_data is invalid
    """
    if not isinstance(profile_data, dict):
        raise ValueError("profile_data must be a dictionary")
    
    # Check required fields (with defaults, so not strictly required)
    # But validate types if present
    for field in ["goal_type", "time_commitment", "budget_range", "interest_area",
                  "sub_interest_area", "work_style", "skill_strength", "experience_summary"]:
        if field in profile_data and profile_data[field] is not None:
            if not isinstance(profile_data[field], str):
                raise ValueError(f"{field} must be a string, got {type(profile_data[field])}")
    
    # Validate founder_psychology if present
    if "founder_psychology" in profile_data:
        fp = profile_data["founder_psychology"]
        if fp is not None and not isinstance(fp, dict):
            raise ValueError(f"founder_psychology must be a dict, got {type(fp)}")


def get_fallback_tool_summary(tool_name: str) -> str:
    """
    Get fallback summary for a tool that failed.
    
    Args:
        tool_name: Name of the tool that failed
    
    Returns:
        Fallback summary text
    """
    fallbacks = {
        "market_trends": "Market trends analysis unavailable. Proceed with general market assumptions.",
        "competitors": "Competitor analysis unavailable. Consider competitive landscape in recommendations.",
        "risks": "Risk assessment unavailable. Include standard risk considerations.",
        "validation": "Idea validation unavailable. Focus on general validation principles.",
        "market_size": "Market size estimate unavailable. Use conservative estimates.",
        "costs": "Cost estimation unavailable. Include standard cost considerations.",
        "revenue": "Revenue projection unavailable. Use standard revenue models.",
        "viability": "Financial viability analysis unavailable. Include standard viability checks.",
        "persona": "Customer persona unavailable. Use general target audience assumptions.",
        "validation_questions": "Validation questions unavailable. Include standard validation approach.",
    }
    return fallbacks.get(tool_name, f"{tool_name.replace('_', ' ').title()} analysis unavailable.")


def count_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    """
    Count tokens in text using tiktoken (accurate) or fallback estimation.
    
    Args:
        text: Text to count tokens for
        model: Model name (default: gpt-4o-mini)
    
    Returns:
        Token count
    """
    if not text:
        return 0
    
    if TIKTOKEN_AVAILABLE:
        try:
            # Use cl100k_base encoding for gpt-4o-mini and similar models
            encoding = tiktoken.encoding_for_model(model)
            return len(encoding.encode(text))
        except Exception as e:
            current_app.logger.warning(f"tiktoken encoding failed: {e}, using estimation")
    
    # Fallback: ~4 characters per token (conservative estimate)
    return len(text) // 4


def compress_profile(profile_data: Dict[str, Any], max_chars: int = 200) -> str:
    """
    Compress user profile to a short summary (<200 chars).
    
    Args:
        profile_data: User profile data
        max_chars: Maximum characters (default 200)
    
    Returns:
        Compressed profile string
    """
    parts = []
    
    # Extract key fields only
    goal_type = profile_data.get("goal_type", "")
    time_commitment = profile_data.get("time_commitment", "")
    budget_range = profile_data.get("budget_range", "")
    interest_area = profile_data.get("interest_area", "")
    work_style = profile_data.get("work_style", "")
    skill_strength = profile_data.get("skill_strength", "")
    
    # Build compact summary
    if goal_type:
        parts.append(f"Goal: {goal_type}")
    if time_commitment:
        parts.append(f"Time: {time_commitment}")
    if budget_range:
        parts.append(f"Budget: {budget_range}")
    if interest_area:
        parts.append(f"Interest: {interest_area}")
    if work_style:
        parts.append(f"Style: {work_style}")
    if skill_strength:
        parts.append(f"Skills: {skill_strength}")
    
    result = " | ".join(parts)
    
    # Truncate if too long
    if len(result) > max_chars:
        result = result[:max_chars - 3] + "..."
    
    return result


def compress_tool_output(text: str, max_chars: int = 100) -> str:
    """
    Compress tool output to <100 characters, preserving key information.
    
    Args:
        text: Full tool output text
        max_chars: Maximum characters (default 100)
    
    Returns:
        Compressed tool output
    """
    if not text or len(text) <= max_chars:
        return text
    
    # Extract first line (usually summary)
    lines = text.split('\n')
    summary_parts = []
    chars_used = 0
    
    # Get first non-empty line
    for line in lines:
        line = line.strip()
        if line and len(line) > 10:  # Skip very short lines
            if chars_used + len(line) + 2 <= max_chars * 0.6:  # Use 60% for first line
                summary_parts.append(line)
                chars_used += len(line) + 2
                break
    
    # Extract key bullets/numbers
    for line in lines[1:]:
        if chars_used >= max_chars * 0.9:  # Use 90% total
            break
        
        line = line.strip()
        if not line:
            continue
        
        # Keep bullets, numbers, or key metrics
        has_numbers = bool(re.search(r'\d+', line))
        is_bullet = line.startswith('-') or line.startswith('*') or re.match(r'^\d+[\.\)]\s', line)
        has_keyword = any(kw in line.lower() for kw in ['$', '%', 'market', 'revenue', 'cost', 'risk', 'growth'])
        
        if (is_bullet or (has_numbers and has_keyword)) and chars_used + len(line) + 2 <= max_chars:
            summary_parts.append(line)
            chars_used += len(line) + 2
    
    result = '\n'.join(summary_parts)
    
    # Final truncation
    if len(result) > max_chars:
        result = result[:max_chars - 3] + "..."
    
    return result


def shorten_prompt(prompt: str, max_tokens: int, model: str = "gpt-4o-mini") -> str:
    """
    Auto-shorten prompt if it exceeds max_tokens by truncating intelligently.
    
    Args:
        prompt: Full prompt text
        max_tokens: Maximum allowed tokens
        model: Model name for token counting
    
    Returns:
        Shortened prompt
    """
    token_count = count_tokens(prompt, model)
    
    if token_count <= max_tokens:
        return prompt
    
    # Calculate target length (leave 10% buffer)
    target_chars = int((max_tokens * 0.9) * 4)  # ~4 chars per token
    
    # Try to preserve structure by truncating from the middle sections
    # Keep beginning (instructions) and end (format requirements)
    lines = prompt.split('\n')
    
    # Find instruction section end (usually after first few paragraphs)
    instruction_end = 0
    for i, line in enumerate(lines[:20]):  # Check first 20 lines
        if line.strip().startswith('##') or line.strip().startswith('USER PROFILE'):
            instruction_end = i
            break
    
    # Find format section start (usually near end)
    format_start = len(lines)
    for i in range(len(lines) - 1, max(0, len(lines) - 30), -1):  # Check last 30 lines
        if 'CRITICAL' in lines[i].upper() or 'FORMAT' in lines[i].upper():
            format_start = i
            break
    
    # Build shortened prompt: instructions + truncated middle + format
    if instruction_end > 0 and format_start < len(lines):
        # Keep instructions and format, truncate middle
        kept_lines = lines[:instruction_end + 1]
        format_lines = lines[format_start:]
        
        kept_text = '\n'.join(kept_lines)
        format_text = '\n'.join(format_lines)
        
        # Calculate available space for middle
        kept_tokens = count_tokens(kept_text, model)
        format_tokens = count_tokens(format_text, model)
        available_tokens = max_tokens - kept_tokens - format_tokens - 50  # 50 token buffer
        
        if available_tokens > 100:
            # Include truncated middle section
            middle_lines = lines[instruction_end + 1:format_start]
            middle_text = '\n'.join(middle_lines)
            middle_tokens = count_tokens(middle_text, model)
            
            if middle_tokens > available_tokens:
                # Truncate middle
                target_middle_chars = int(available_tokens * 4)
                middle_text = middle_text[:target_middle_chars] + "\n[... truncated ...]"
            
            return '\n'.join([kept_text, middle_text, format_text])
    
    # Fallback: simple truncation
    return prompt[:target_chars] + "\n[... truncated due to size limit ...]"
    
def summarize_tool_output(text: str, target_tokens: int = 100, aggressive: bool = False) -> str:
    """
    Summarize tool output to target token count.
    
    Uses simple heuristics to preserve key information:
    - Keeps first paragraph/sentence
    - Extracts bullet points or numbered lists
    - Preserves key metrics/numbers
    - Truncates to target length
    - In aggressive mode: removes prose fluff, focuses on data/bullets
    
    Args:
        text: Full tool output text
        target_tokens: Target token count (default 100)
        aggressive: If True, more aggressive summarization (40-60 tokens for non-critical)
    
    Returns:
        Summarized text (approximately target_tokens)
    """
    if not text or len(text.strip()) == 0:
        return text
    
    # Rough token estimation: ~4 characters per token
    target_chars = target_tokens * 4
    
    # If already short enough, return as-is
    if len(text) <= target_chars:
        return text
    
    # Strategy: Extract key information based on mode
    lines = text.split('\n')
    summary_parts = []
    chars_used = 0
    
    if aggressive:
        # Aggressive mode: Only extract numeric data and bullet lists
        # Skip prose, focus on structured data
        for line in lines:
            if chars_used >= target_chars * 0.9:  # Use 90% in aggressive mode
                break
            
            line = line.strip()
            if not line:
                continue
            
            # Extract only: bullets, numbers, key metrics
            has_numbers = bool(re.search(r'\d+', line))
            is_bullet = line.startswith('-') or line.startswith('*') or re.match(r'^\d+[\.\)]\s', line)
            has_keyword = any(kw in line.lower() for kw in ['market', 'revenue', 'cost', 'risk', 'opportunity', 'trend', 'competitor', '$', '%', 'growth', 'size'])
            
            if (is_bullet or (has_numbers and has_keyword)) and chars_used + len(line) + 2 <= target_chars:
                summary_parts.append(line)
                chars_used += len(line) + 2
    else:
        # Normal mode: Include first paragraph + key points
        if lines:
            first_line = lines[0].strip()
            if first_line:
                summary_parts.append(first_line)
                chars_used += len(first_line)
        
        # Extract bullet points or numbered lists (usually contain key info)
        for line in lines[1:]:
            if chars_used >= target_chars * 0.8:  # Use 80% of target for structured content
                break
            
            line = line.strip()
            if not line:
                continue
            
            # Keep bullet points, numbered lists, or lines with key indicators
            if (line.startswith('-') or line.startswith('*') or 
                re.match(r'^\d+[\.\)]\s', line) or
                any(keyword in line.lower() for keyword in ['market', 'revenue', 'cost', 'risk', 'opportunity', 'trend', 'competitor'])):
                if chars_used + len(line) + 2 <= target_chars:  # +2 for newline
                    summary_parts.append(line)
                    chars_used += len(line) + 2
        
        # If we still have room, add truncated remaining content
        if chars_used < target_chars * 0.6 and len(summary_parts) < 3:
            remaining = ' '.join(lines[len(summary_parts):])
            remaining = remaining[:target_chars - chars_used - 10]  # Leave room for ellipsis
            if remaining:
                summary_parts.append(remaining + "...")
    
    result = '\n'.join(summary_parts)
    
    # Final truncation if still too long
    if len(result) > target_chars:
        result = result[:target_chars - 3] + "..."
    
    return result


def _ensure_all_tool_fields(tool_results: Dict[str, str]) -> Dict[str, str]:
    """
    Ensure all required tool fields are present in tool_results.
    Adds DEFAULT_STATIC_TOOL_FIELDS for missing fields and maps field names.
    
    This prevents tool execution AND reduces LLM complexity.
    
    Args:
        tool_results: Dictionary of tool results (may be incomplete or use different field names)
    
    Returns:
        Dictionary with all required fields (guaranteed to have defaults if missing)
    """
    result = tool_results.copy()
    
    # Map static JSON field names to expected field names
    field_mapping = {
        "revenue_models": "revenue",
        "validation_insights": "validation_questions",
        "viability_summary": "viability",
    }
    
    # Apply field mapping
    for old_key, new_key in field_mapping.items():
        if old_key in result and new_key not in result:
            result[new_key] = result[old_key]
    
    # Add defaults for missing fields
    for key, default_value in DEFAULT_STATIC_TOOL_FIELDS.items():
        if key not in result or not result[key]:
            result[key] = default_value
            current_app.logger.debug(f"Added default field '{key}' to tool results")
    
    return result


def _get_openai_client() -> OpenAI:
    """Get OpenAI client with API key from environment or injected mock.
    DEPRECATED: Use _get_llm_client() instead for Claude support."""
    client, _, _ = _get_llm_client()
    if isinstance(client, OpenAI):
        return client
    raise ValueError("OpenAI client requested but Claude is configured")


def load_cached_tools(interest_area: str, sub_interest_area: str = "") -> Dict[str, str]:
    """
    Load or generate cached tool results based ONLY on interest_area + sub_interest_area.
    
    Tools are STATIC/SEMI-STATIC - they don't depend on user-specific data.
    Cache TTL = 24 hours.
    If cache exists, return immediately without running tools.
    
    Args:
        interest_area: Interest area (e.g., "AI / Automation")
        sub_interest_area: Optional sub-interest (e.g., "Chatbots")
    
    Returns:
        Dictionary of tool results (market_trends, competitors, market_size, risks, 
        validation, persona, costs, revenue, viability, validation_questions)
    """
    if not interest_area:
        return {}
    
    # Create cache key based on interest_area + sub_interest_area
    cache_key_parts = [interest_area]
    if sub_interest_area:
        cache_key_parts.append(sub_interest_area)
    cache_key = f"static_tools_{'_'.join(cache_key_parts).lower().replace(' ', '_').replace('/', '_')}"
    
    # Check cache first (24 hour TTL)
    try:
        from app.models.database import db, utcnow, ToolCacheEntry
        from datetime import timedelta
        import json
        
        cached = ToolCacheEntry.query.filter_by(
            cache_key=cache_key
        ).filter(
            ToolCacheEntry.expires_at > utcnow()
        ).first()
        
        if cached:
            try:
                results = json.loads(cached.result)
                current_app.logger.info(f"Tool cache HIT: {cache_key} ({len(results)} tools)")
                return results
            except json.JSONDecodeError:
                pass
    except Exception as e:
        current_app.logger.warning(f"Cache lookup failed: {e}")
    
    # Cache miss - generate tools (will cache after generation)
    return {}


def precompute_all_tools(
    interest_area: str,
    sub_interest_area: str = "",
    return_futures: bool = False,
) -> Union[Tuple[Dict[str, str], float], Tuple[Dict[str, str], Dict[str, Future], float]]:
    """
    Pre-compute all tool results in parallel.
    
    Tools are STATIC - they ONLY depend on interest_area and sub_interest_area.
    NO user-specific parameters (goal_type, budget_range, work_style, etc.)
    
    Args:
        interest_area: Interest area (e.g., "AI / Automation")
        sub_interest_area: Optional sub-interest (e.g., "Chatbots")
        return_futures: If True, returns futures dict for early LLM execution
    
    Returns:
        If return_futures=False: Tuple of (tool_results_dict, elapsed_seconds)
        If return_futures=True: Tuple of (tool_results_dict, futures_dict, elapsed_seconds)
    """
    start_time = time.time()
    results = {}
    futures = {}
    
    # Check cache first
    cached_results = load_cached_tools(interest_area, sub_interest_area)
    if cached_results:
        # Return cached results immediately
        elapsed = time.time() - start_time
        print(f"[PERF] precompute_all_tools: Cache HIT - returning {len(cached_results)} cached tools in {elapsed:.3f}s")
        return (cached_results, elapsed) if not return_futures else (cached_results, {}, elapsed)
    
    # Cache miss - generate tools
    print(f"[PERF] precompute_all_tools: Cache MISS - generating tools for {interest_area}/{sub_interest_area}")
    
    # Use interest_area as base idea concept
    idea_concept = f"{interest_area} {sub_interest_area}".strip() or interest_area or "startup idea"
    primary_idea = idea_concept
    
    # Load static blocks - if available, skip corresponding tools
    static_blocks = load_static_blocks(interest_area) if interest_area else {}
    static_tools_skipped = []
    
    # Tools that can be replaced by static blocks
    STATIC_TOOL_MAPPING = {
        "market_trends": "market_trends",
        "competitors": "competitors",
        "market_size": "market_size",
        "risks": "risks",
        "validation_questions": "idea_patterns"  # validation_questions uses idea_patterns from static blocks
    }
    
    # Check which static tools we can skip
    for tool_name, static_key in STATIC_TOOL_MAPPING.items():
        if static_key in static_blocks and static_blocks[static_key]:
            static_tools_skipped.append(tool_name)
            # Add static block content to results immediately
            results[tool_name] = static_blocks[static_key]
            current_app.logger.info(f"Skipping tool '{tool_name}' - using static block '{static_key}'")
    
    if static_tools_skipped:
        print(f"[PERF] precompute_all_tools: Skipping {len(static_tools_skipped)} tools with static blocks: {static_tools_skipped}")
    
    # Helper function to unwrap CrewAI Tool objects to get the underlying function
    def unwrap_tool(tool_obj):
        """Unwrap a CrewAI Tool object to get the underlying callable function."""
        # CrewAI Tool objects have a 'func' attribute containing the original function
        if hasattr(tool_obj, 'func'):
            return tool_obj.func
        elif hasattr(tool_obj, '__wrapped__'):
            # If it's a decorated function, get the original
            return tool_obj.__wrapped__
        else:
            # Assume it's already a callable function
            return tool_obj
    
    # Unwrap all tools to get underlying functions
    research_market_trends_func = unwrap_tool(research_market_trends)
    analyze_competitors_func = unwrap_tool(analyze_competitors)
    estimate_market_size_func = unwrap_tool(estimate_market_size)
    validate_startup_idea_func = unwrap_tool(validate_startup_idea)
    assess_startup_risks_func = unwrap_tool(assess_startup_risks)
    estimate_startup_costs_func = unwrap_tool(estimate_startup_costs)
    project_revenue_func = unwrap_tool(project_revenue)
    check_financial_viability_func = unwrap_tool(check_financial_viability)
    generate_customer_persona_func = unwrap_tool(generate_customer_persona)
    generate_validation_questions_func = unwrap_tool(generate_validation_questions)
    
    # Prepare all tool calls using unwrapped functions
    # SKIP tools that have static blocks available
    tool_calls = {}
    
    # Market research tools (for interest area) - STATIC, only use interest_area + sub_interest_area
    # SKIP if static blocks available
    if "market_trends" not in static_tools_skipped:
        tool_calls["market_trends"] = lambda: research_market_trends_func(
            topic=interest_area,
            market_segment=sub_interest_area
            # NO user_profile - tools are static
        )
    if "competitors" not in static_tools_skipped:
        tool_calls["competitors"] = lambda: analyze_competitors_func(
            startup_idea=primary_idea,
            industry=interest_area
            # NO user_profile - tools are static
        )
    if "market_size" not in static_tools_skipped:
        tool_calls["market_size"] = lambda: estimate_market_size_func(
            topic=primary_idea,
            target_audience=interest_area
            # NO user_profile - tools are static
        )
    
    # Validation tool - STATIC, only use interest_area
    if "validation" not in static_tools_skipped:
        tool_calls["validation"] = lambda: validate_startup_idea_func(
            idea=primary_idea,
            target_market=interest_area,
            business_model=""
            # NO user_profile - tools are static
        )
    
    # Financial tools - STATIC, only use interest_area
    if "risks" not in static_tools_skipped:
        tool_calls["risks"] = lambda: assess_startup_risks_func(
            idea=primary_idea
            # NO time_commitment, financial_resources, user_profile - tools are static
        )
    
    # These tools are fast and always run (not in static blocks) - STATIC
    tool_calls["costs"] = lambda: estimate_startup_costs_func(
        business_type="SaaS",  # Default, can be inferred from idea
        scope="MVP"
    )
    tool_calls["revenue"] = lambda: project_revenue_func(
        business_model="Subscription",
        target_customers="1000",
        pricing_model="$29/month"
    )
    tool_calls["viability"] = lambda: check_financial_viability_func(
        idea=primary_idea,
        estimated_costs="",
        estimated_revenue="",
        time_horizon="Year 1"
    )
    
    # Customer tools - STATIC, only use interest_area
    tool_calls["persona"] = lambda: generate_customer_persona_func(
        startup_idea=primary_idea,
        target_market=interest_area
    )
    if "validation_questions" not in static_tools_skipped:
        tool_calls["validation_questions"] = lambda: generate_validation_questions_func(
            startup_idea=primary_idea
        )
    
    # Execute all tools in parallel
    print(f"\n[PERF] precompute_all_tools: Starting execution of {len(tool_calls)} tools at {time.time():.3f}")
    log_timing("precompute_all_tools", "start", timestamp=start_time)
    tool_start_times = {}
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        executor_start = time.time()
        # Track when each tool actually starts (submit time)
        for name, func in tool_calls.items():
            tool_start_times[name] = time.time()
            print(f"[PERF] precompute_all_tools: Tool '{name}' START at {tool_start_times[name]:.3f}")
            log_timing(f"tool_{name}", "start", timestamp=tool_start_times[name])
        
        future_to_tool = {executor.submit(func): name for name, func in tool_calls.items()}
        executor_ready = time.time()
        print(f"[PERF] precompute_all_tools: ThreadPoolExecutor ready in {executor_ready - executor_start:.3f}s, submitted {len(future_to_tool)} futures")
        
        # Store futures if requested
        if return_futures:
            for future, tool_name in future_to_tool.items():
                futures[tool_name] = future
        
        first_complete_time = None
        first_complete_tool = None
        
        for future in as_completed(future_to_tool):
            tool_name = future_to_tool[future]
            tool_start_time = tool_start_times.get(tool_name, start_time)
            tool_complete_start = time.time()
            
            try:
                result = future.result()
                tool_complete_end = time.time()
                tool_total_duration = tool_complete_end - tool_start_time
                tool_result_duration = tool_complete_end - tool_complete_start
                
                # Track first completion
                if first_complete_time is None:
                    first_complete_time = tool_complete_end
                    first_complete_tool = tool_name
                    print(f"[PERF] precompute_all_tools: FIRST tool completed: '{tool_name}' at {first_complete_time:.3f} (elapsed: {tool_total_duration:.3f}s)")
                    log_timing("precompute_all_tools", "first_tool_complete", 
                              timestamp=first_complete_time, 
                              duration=tool_total_duration,
                              details={"tool": tool_name})
                
                # Better cache detection - check for cached patterns
                result_str = str(result)
                cache_used = (
                    "MARKET RESEARCH SUMMARY" in result_str or 
                    "COMPETITIVE ANALYSIS" in result_str or 
                    "CACHED" in result_str.upper() or
                    (len(result_str) < 500 and "error" not in result_str.lower())
                )
                
                print(f"[PERF] precompute_all_tools: Tool '{tool_name}' END at {tool_complete_end:.3f} - "
                      f"Elapsed: {tool_total_duration:.3f}s (start: {tool_start_time:.3f}, end: {tool_complete_end:.3f}), "
                      f"Result retrieval: {tool_result_duration:.3f}s, "
                      f"Cache: {'YES' if cache_used else 'NO/OpenAI'}")
                
                # Log to timing logger
                log_timing(f"tool_{tool_name}", "end", 
                          timestamp=tool_complete_end,
                          duration=tool_total_duration,
                          details={"cache_used": cache_used, "result_length": len(result_str)})
                
                # Record metrics
                try:
                    record_tool_call(
                        tool_name=tool_name,
                        duration=tool_total_duration,
                        cache_hit=cache_used,
                        cache_miss=not cache_used,
                        params={"idea": primary_idea, "interest_area": interest_area}
                    )
                except Exception:
                    pass  # Don't fail if metrics fail
                
                results[tool_name] = result
                current_app.logger.debug(f"Pre-computed tool: {tool_name} ({tool_total_duration:.2f}s)")
            except Exception as e:
                tool_complete_end = time.time()
                tool_total_duration = tool_complete_end - tool_start_time
                print(f"[PERF] precompute_all_tools: Tool '{tool_name}' FAILED at {tool_complete_end:.3f} after {tool_total_duration:.3f}s - Error: {e}")
                current_app.logger.warning(f"Tool {tool_name} failed: {e}")
                results[tool_name] = f"Error: {str(e)}"
    
    elapsed = time.time() - start_time
    first_tool_time_str = f"{first_complete_time:.3f}" if first_complete_time else "N/A"
    print(f"[PERF] precompute_all_tools: ALL tools completed. Total elapsed: {elapsed:.3f}s, "
          f"Completed: {len(results)}/{len(tool_calls)}, First tool: {first_complete_tool} at {first_tool_time_str}\n")
    
    # Cache results for 24 hours
    if results:
        try:
            from app.models.database import db, utcnow, ToolCacheEntry
            from datetime import timedelta
            import json
            
            cache_key_parts = [interest_area]
            if sub_interest_area:
                cache_key_parts.append(sub_interest_area)
            cache_key = f"static_tools_{'_'.join(cache_key_parts).lower().replace(' ', '_').replace('/', '_')}"
            
            expires_at = utcnow() + timedelta(hours=24)
            result_json = json.dumps(results, ensure_ascii=False, sort_keys=True)
            
            existing = ToolCacheEntry.query.filter_by(cache_key=cache_key).first()
            if existing:
                existing.result = result_json
                existing.expires_at = expires_at
                existing.hit_count = 0
                existing.tool_name = "static_tools"
            else:
                cache_entry = ToolCacheEntry(
                    cache_key=cache_key,
                    tool_name="static_tools",
                    tool_params=json.dumps({"interest_area": interest_area, "sub_interest_area": sub_interest_area}, sort_keys=True),
                    result=result_json,
                    expires_at=expires_at
                )
                db.session.add(cache_entry)
            
            db.session.commit()
            current_app.logger.info(f"Cached {len(results)} tools for {cache_key} (24h TTL)")
        except Exception as e:
            current_app.logger.warning(f"Failed to cache tool results: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass
    
    log_timing("precompute_all_tools", "end", 
              timestamp=time.time(),
              duration=elapsed,
              details={"tools_completed": len(results), "total_tools": len(tool_calls), "first_tool": first_complete_tool})
    
    current_app.logger.info(
        f"Pre-computed {len(results)}/{len(tool_calls)} tools in {elapsed:.2f}s. "
        f"Completed: {list(results.keys())}"
    )
    
    if return_futures:
        # Return results dict (may be incomplete), futures dict, and elapsed time
        return results, futures, elapsed
    return results, elapsed


def _build_profile_analysis_prompt(profile_data: Dict[str, Any]) -> str:
    """
    Build prompt for Stage 1: Profile Analysis (no tools, just profile data).
    MAX INPUT TOKENS: 1500 (hard limit)
    
    Args:
        profile_data: User profile data
    
    Returns:
        Prompt string for profile analysis (compressed to <1500 tokens)
    """
    # Compress profile to <200 characters
    compressed_profile = compress_profile(profile_data, max_chars=200)
    
    # Build minimal prompt (removed long instructions and examples)
    prompt = f"""Analyze user profile and generate profile analysis.

USER PROFILE: {compressed_profile}

Generate 4 sections:
## 1. Core Motivation
[3-4 sentences on their motivations]

## 2. Constraints
[4-6 bullets on time, work style, budget limits]

## 3. Strengths
[4-6 bullets on skills and advantages]

## 4. Skill Gaps
[4-6 bullets on missing skills and why they matter]

Format: Use "You", markdown headings (##), 400-500 words total."""
    
    # Enforce 1500 token limit
    STAGE1_MAX_TOKENS = 1500
    token_count = count_tokens(prompt)
    
    if token_count > STAGE1_MAX_TOKENS:
        current_app.logger.warning(f"Stage 1 prompt too large: {token_count} tokens, shortening to {STAGE1_MAX_TOKENS}")
        prompt = shorten_prompt(prompt, STAGE1_MAX_TOKENS)
        token_count = count_tokens(prompt)
    
    current_app.logger.info(f"Stage 1 prompt: {token_count} tokens (limit: {STAGE1_MAX_TOKENS})")
    print(f"[TOKEN] Stage 1 prompt: {token_count} tokens (limit: {STAGE1_MAX_TOKENS})")
    
    return prompt


def run_profile_analysis(profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Stage 1: Run profile analysis (NO TOOLS - just LLM call).
    
    Args:
        profile_data: User profile data
    
    Returns:
        Dictionary with "profile_analysis" JSON string
    """
    stage1_start = time.time()
    log_timing("run_profile_analysis", "start", timestamp=stage1_start)
    
    # Build prompt
    prompt = _build_profile_analysis_prompt(profile_data)
    
    # Count tokens and log before LLM call
    system_message = "You are a startup advisor. Generate complete profile analysis in the exact format requested."
    total_tokens = count_tokens(system_message) + count_tokens(prompt)
    print(f"[TOKEN] Stage 1 LLM call - Input tokens: {total_tokens} (system: {count_tokens(system_message)}, user: {count_tokens(prompt)})")
    current_app.logger.info(f"Stage 1 LLM call - Input tokens: {total_tokens}")
    
    # Abort if >2500 tokens (safety check)
    if total_tokens > 2500:
        current_app.logger.error(f"Stage 1 prompt exceeds 2500 token limit: {total_tokens} tokens, aborting")
        raise ValueError(f"Stage 1 prompt exceeds 2500 token limit: {total_tokens} tokens")
    
    # Get LLM client (OpenAI or Claude)
    client, model_name, is_claude = _get_llm_client()
    
    llm_start = time.time()
    log_timing("run_profile_analysis", "llm_call_start", timestamp=llm_start)
    
    if is_claude:
        # Claude API
        response = client.messages.create(
            model=model_name,
            max_tokens=600,
            temperature=0.3,
            system=system_message,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        profile_analysis = response.content[0].text
    else:
        # OpenAI API
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=600,
            stream=False,
        )
        
        if not response.choices or not response.choices[0].message:
            current_app.logger.warning("Profile analysis response has no choices or message")
            return {"profile_analysis": ""}
        
        profile_analysis = response.choices[0].message.content or ""
    
    llm_end = time.time()
    llm_duration = llm_end - llm_start
    
    stage1_end = time.time()
    stage1_duration = stage1_end - stage1_start
    
    log_timing("run_profile_analysis", "llm_call_end", timestamp=llm_end, duration=llm_duration, openai_duration=llm_duration)
    log_timing("run_profile_analysis", "end", timestamp=stage1_end, duration=stage1_duration)
    
    print(f"[PERF] run_profile_analysis: COMPLETE in {stage1_duration:.3f}s (LLM: {llm_duration:.3f}s)")
    
    # Return as JSON string for Stage 2
    return {"profile_analysis": profile_analysis}


def _build_idea_research_prompt(
    profile_analysis_json: str,
    tool_results: Dict[str, str],
) -> str:
    """
    Build prompt for Stage 2: Idea Research (with static tool blocks).
    MAX INPUT TOKENS: 2000 (hard limit)
    
    Args:
        profile_analysis_json: JSON string from Stage 1 (short profile)
        tool_results: Static tool results loaded from JSON files
    
    Returns:
        Prompt string for idea research (compressed to <2000 tokens)
    """
    # Compress profile analysis to <200 chars
    if len(profile_analysis_json) > 200:
        # Extract key points from profile analysis
        lines = profile_analysis_json.split('\n')
        compressed_lines = []
        for line in lines[:5]:  # First 5 lines usually contain key info
            if line.strip() and len(line.strip()) > 10:
                compressed_lines.append(line.strip()[:100])  # Max 100 chars per line
        profile_analysis_json = ' '.join(compressed_lines)[:200]
    
    # Compress ALL tool outputs to <100 chars each
    compressed_tools = {}
    for tool_name, tool_output in tool_results.items():
        compressed_tools[tool_name] = compress_tool_output(str(tool_output), max_chars=100)
    
    # Format compressed tool results as compact JSON (no indentation to save tokens)
    import json
    static_blocks_json = json.dumps(compressed_tools, ensure_ascii=False, separators=(',', ':')) if compressed_tools else "{}"
    
    # Build minimal prompt (removed long instructions, examples, schemas)
    prompt = f"""Generate idea research and recommendations.

USER PROFILE: {profile_analysis_json}

RESEARCH DATA (summaries only):
{static_blocks_json}

Generate 2 sections:

## SECTION 1: IDEA RESEARCH REPORT
### Idea Research Report
- Executive summary (3-4 sentences)
- 5+ startup ideas (numbered, format: 1. **Idea Name**)
- Each idea: concept, market, revenue model, resources, timeline, risks
- ### Validation Backlog

## SECTION 2: PERSONALIZED RECOMMENDATIONS
### Comprehensive Recommendation Report
Include: Profile Fit Summary, Recommendation Matrix (table), Top 3 Ideas Deep Dive, Financial Outlook, Risk Radar, Customer Persona, Validation Questions, 30/60/90 Day Roadmap, Decision Checklist.

Use research data as knowledge, personalize for user. 1500-2000 words total."""
    
    # Enforce 2000 token limit
    STAGE2_MAX_TOKENS = 2000
    token_count = count_tokens(prompt)
    
    if token_count > STAGE2_MAX_TOKENS:
        current_app.logger.warning(f"Stage 2 prompt too large: {token_count} tokens, shortening to {STAGE2_MAX_TOKENS}")
        prompt = shorten_prompt(prompt, STAGE2_MAX_TOKENS)
        token_count = count_tokens(prompt)
    
    # Abort if still >2500 tokens (safety check)
    if token_count > 2500:
        current_app.logger.error(f"Stage 2 prompt still too large after shortening: {token_count} tokens, aborting")
        raise ValueError(f"Stage 2 prompt exceeds 2500 token limit: {token_count} tokens")
    
    current_app.logger.info(f"Stage 2 prompt: {token_count} tokens (limit: {STAGE2_MAX_TOKENS})")
    print(f"[TOKEN] Stage 2 prompt: {token_count} tokens (limit: {STAGE2_MAX_TOKENS})")
    
    return prompt


def run_idea_research(
    profile_analysis_json: str,
    tool_results: Dict[str, str],
) -> Dict[str, str]:
    """
    Stage 2: Run idea research (with static tool blocks).
    
    Args:
        profile_analysis_json: JSON string from Stage 1 profile analysis (short)
        tool_results: Static tool results loaded from JSON files
        
    Returns:
        Dictionary with "startup_ideas_research" and "personalized_recommendations"
    """
    stage2_start = time.time()
    log_timing("run_idea_research", "start", timestamp=stage2_start)
    
    # Build prompt
    prompt = _build_idea_research_prompt(profile_analysis_json, tool_results)
    
    # Count tokens and log before LLM call
    system_message = "You are a startup advisor. Generate complete idea research and recommendations in the exact format requested."
    total_tokens = count_tokens(system_message) + count_tokens(prompt)
    print(f"[TOKEN] Stage 2 LLM call - Input tokens: {total_tokens} (system: {count_tokens(system_message)}, user: {count_tokens(prompt)})")
    current_app.logger.info(f"Stage 2 LLM call - Input tokens: {total_tokens}")
    
    # Abort if >2500 tokens (safety check)
    if total_tokens > 2500:
        current_app.logger.error(f"Stage 2 prompt exceeds 2500 token limit: {total_tokens} tokens, aborting")
        raise ValueError(f"Stage 2 prompt exceeds 2500 token limit: {total_tokens} tokens")
    
    # Get LLM client (OpenAI or Claude)
    client, model_name, is_claude = _get_llm_client()
    
    llm_start = time.time()
    log_timing("run_idea_research", "llm_call_start", timestamp=llm_start)
    
    if is_claude:
        # Claude API
        response = client.messages.create(
            model=model_name,
            max_tokens=2000,  # Reduced from 3000 for faster generation
            temperature=0.3,
            system=system_message,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        response_text = response.content[0].text
    else:
        # OpenAI API
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000,  # Reduced from 3000 for faster generation
            stream=False,
        )
        
        if not response.choices or not response.choices[0].message:
            current_app.logger.warning("Idea research response has no choices or message")
            return {"startup_ideas_research": "", "personalized_recommendations": ""}
        
        response_text = response.choices[0].message.content or ""
    
    llm_end = time.time()
    llm_duration = llm_end - llm_start
    
    # Log full response for debugging if sections are missing
    if not response_text:
        current_app.logger.error("Idea research response is empty")
        return {"startup_ideas_research": "", "personalized_recommendations": ""}
    
    # Parse response into two sections with better error handling
    outputs = {
        "startup_ideas_research": "",
        "personalized_recommendations": "",
    }
    
    # Try multiple marker variations for robustness
    research_markers = ["### Idea Research Report", "## SECTION 1: IDEA RESEARCH REPORT", "## IDEA RESEARCH REPORT", "Idea Research Report"]
    rec_markers = ["### Comprehensive Recommendation Report", "## SECTION 2: PERSONALIZED RECOMMENDATIONS", "## PERSONALIZED RECOMMENDATIONS", "Comprehensive Recommendation Report"]
    
    research_start = -1
    research_marker_used = None
    for marker in research_markers:
        pos = response_text.find(marker)
        if pos != -1:
            research_start = pos
            research_marker_used = marker
            break
    
    if research_start != -1:
        # Find recommendation section start
        rec_start = -1
        rec_marker_used = None
        for marker in rec_markers:
            pos = response_text.find(marker, research_start)
            if pos != -1:
                rec_start = pos
                rec_marker_used = marker
                break
        
        if rec_start != -1:
            # Both sections found
            outputs["startup_ideas_research"] = response_text[research_start:rec_start].strip()
            outputs["personalized_recommendations"] = response_text[rec_start:].strip()
            current_app.logger.info(f"Successfully parsed both sections (research: {research_marker_used}, rec: {rec_marker_used})")
        else:
            # Only research section found
            outputs["startup_ideas_research"] = response_text[research_start:].strip()
            current_app.logger.warning(f"Recommendation section not found. Research marker: {research_marker_used}")
            current_app.logger.debug(f"Response length: {len(response_text)}, Preview: {response_text[-500:]}")
    else:
        # No research section found - try to extract recommendations only
        rec_start = -1
        rec_marker_used = None
        for marker in rec_markers:
            pos = response_text.find(marker)
            if pos != -1:
                rec_start = pos
                rec_marker_used = marker
                break
        
        if rec_start != -1:
            outputs["personalized_recommendations"] = response_text[rec_start:].strip()
            current_app.logger.warning(f"Idea research section not found, but recommendations found (marker: {rec_marker_used})")
        else:
            # Fallback: use entire response as research
            outputs["startup_ideas_research"] = response_text.strip()
            current_app.logger.warning("Neither section marker found, using entire response as research")
            current_app.logger.debug(f"Response preview (first 1000 chars): {response_text[:1000]}")
    
    stage2_end = time.time()
    stage2_duration = stage2_end - stage2_start
    
    log_timing("run_idea_research", "llm_call_end", timestamp=llm_end, duration=llm_duration, openai_duration=llm_duration)
    log_timing("run_idea_research", "end", timestamp=stage2_end, duration=stage2_duration)
    
    print(f"[PERF] run_idea_research: COMPLETE in {stage2_duration:.3f}s (LLM: {llm_duration:.3f}s)")
    
    return outputs


# Removed parse_unified_response - no longer needed with two-stage system

# Removed old unified system helper functions (no longer used):
# - _wait_for_critical_tools
# - _prepare_non_critical_tools
# - _extract_archetype_blocks
# - _run_unified_discovery_internal


def run_unified_discovery_streaming(
    profile_data: Dict[str, Any],
    use_cache: bool = True,
    cache_bypass: bool = False,
) -> Iterator[Tuple[str, Dict[str, Any]]]:
    """
    Run unified Discovery pipeline with streaming (generator).
    
    Args:
        profile_data: User profile data including all fields + founder_psychology
        use_cache: Whether to check cache first
        cache_bypass: If True, bypass cache (for debugging)
    
    Yields:
        Iterator of (chunk, metadata_dict) tuples
    """
    pipeline_start = time.time()
    print(f"\n{'='*80}")
    print(f"[PERF] run_unified_discovery_streaming: PIPELINE START at {pipeline_start:.3f}")
    print(f"{'='*80}")
    log_timing("run_unified_discovery_streaming", "pipeline_start", timestamp=pipeline_start)
    
    start_time = time.time()
    stage1_start = None
    stage1_end = None
    stage2_start = None
    stage2_end = None
    metadata = {
        "cache_hit": False,
        "tool_precompute_time": 0.0,
        "llm_time": 0.0,
        "total_time": 0.0,
    }
    
    # Validate profile_data structure
    try:
        _validate_profile_data(profile_data)
    except ValueError as e:
        current_app.logger.error(f"Invalid profile_data: {e}")
        raise
    
    # Check cache first
    if use_cache and not cache_bypass:
        cached = DiscoveryCache.get(profile_data, bypass=cache_bypass)
        if cached:
            metadata["cache_hit"] = True
            metadata["total_time"] = time.time() - start_time
            print(f"[PERF] run_unified_discovery_streaming: CACHE HIT - returning cached results in {metadata['total_time']:.3f}s")
            current_app.logger.info(f"Discovery cache hit - returning cached results")
            # For streaming, yield cached results as chunks
            for section_name, section_content in cached.items():
                if section_content:
                    yield (section_content, metadata)
            return
    
    # PARALLEL EXECUTION: Stage 1 (Profile Analysis) + Tool Precomputation
    # This removes ~15 seconds of dead time by running both concurrently
    stage1_start = time.time()
    print(f"[PERF] run_unified_discovery_streaming: STAGE 1 + TOOLS START (PARALLEL) at {stage1_start:.3f}")
    log_timing("run_unified_discovery_streaming", "parallel_start", timestamp=stage1_start)
    
    # Extract interest_area for tool loading
    interest_area = profile_data.get("interest_area", "")
    sub_interest_area = profile_data.get("sub_interest_area", "")
    
    # Run Stage 1 and tool loading/precomputation in PARALLEL
    tool_start = time.time()
    with ThreadPoolExecutor(max_workers=2) as executor:
        # Stage 1: Profile Analysis
        stage1_future = executor.submit(run_profile_analysis, profile_data)
        
        # Tool loading: Load static tools ONLY (NEVER execute tools if static files exist)
        def load_or_compute_tools():
            """Load static tools, or fallback to precompute_all_tools ONLY if static files completely missing."""
            tool_results = StaticToolLoader.load(interest_area)
            
            # Check if static files have meaningful content (at least 3 fields)
            if tool_results and len([k for k, v in tool_results.items() if v and len(str(v)) > 10]) >= 3:
                # Static files exist and have content - use them, NEVER execute tools
                current_app.logger.info(f"Using static tools from file for '{interest_area}' ({len(tool_results)} fields)")
                # Ensure all required fields are present (adds defaults for missing ones)
                return _ensure_all_tool_fields(tool_results)
            else:
                # Static files don't exist or are empty - fallback to tool execution
                current_app.logger.warning(f"Static tools missing/empty for '{interest_area}', executing tools (SLOW - will take ~30s)")
                tool_results, _ = precompute_all_tools(interest_area, sub_interest_area)
                return _ensure_all_tool_fields(tool_results)
        
        tool_future = executor.submit(load_or_compute_tools)
        
        # Wait for Stage 1 to complete (for streaming, we yield it immediately)
        try:
            stage1_result = stage1_future.result(timeout=60)
            profile_analysis_json = stage1_result.get("profile_analysis", "")
        except Exception as e:
            current_app.logger.error(f"Stage 1 failed: {e}", exc_info=True)
            profile_analysis_json = ""
        
        # Wait for tools to complete
        try:
            tool_results = tool_future.result(timeout=60)
        except Exception as e:
            current_app.logger.error(f"Tool loading/precomputation failed: {e}", exc_info=True)
            # Fallback to defaults only
            tool_results = _ensure_all_tool_fields({})
    
    stage1_end = time.time()
    stage1_duration = stage1_end - stage1_start
    tool_complete = time.time()
    metadata["tool_precompute_time"] = tool_complete - tool_start
    
    print(f"[PERF] run_unified_discovery_streaming: PARALLEL EXECUTION COMPLETE")
    print(f"[PERF] run_unified_discovery_streaming: STAGE 1 END (Profile Analysis) - Duration: {stage1_duration:.3f}s")
    print(f"[PERF] run_unified_discovery_streaming: TOOLS loaded/precomputed - Duration: {metadata['tool_precompute_time']:.3f}s ({len(tool_results)} tools)")
    log_timing("run_unified_discovery_streaming", "parallel_end",
              timestamp=stage1_end,
              duration=stage1_duration,
              details={"tool_duration": metadata["tool_precompute_time"]})
    
    # Yield Stage 1 result
    yield (profile_analysis_json, metadata)
    
    # STAGE 2: Idea Research (with static tool blocks - NEVER executes tools)
    stage2_start = time.time()
    print(f"[PERF] run_unified_discovery_streaming: STAGE 2 START (Idea Research) at {stage2_start:.3f}")
    log_timing("run_unified_discovery_streaming", "stage2_start", timestamp=stage2_start)
    
    # Build prompt for idea research
    prompt = _build_idea_research_prompt(profile_analysis_json, tool_results)
    
    # Count tokens and log before LLM call
    system_message = "You are a startup advisor. Generate complete idea research and recommendations in the exact format requested."
    total_tokens = count_tokens(system_message) + count_tokens(prompt)
    print(f"[TOKEN] Stage 2 LLM call (streaming) - Input tokens: {total_tokens} (system: {count_tokens(system_message)}, user: {count_tokens(prompt)})")
    current_app.logger.info(f"Stage 2 LLM call (streaming) - Input tokens: {total_tokens}")
    
    # Abort if >2500 tokens (safety check)
    if total_tokens > 2500:
        current_app.logger.error(f"Stage 2 prompt exceeds 2500 token limit: {total_tokens} tokens, aborting")
        raise ValueError(f"Stage 2 prompt exceeds 2500 token limit: {total_tokens} tokens")
    
    # Get LLM client (OpenAI or Claude)
    client, model_name, is_claude = _get_llm_client()
    
    llm_start = time.time()
    log_timing("run_idea_research", "llm_call_start", timestamp=llm_start)
    
    # Note: Claude streaming is different, but for now we'll use OpenAI streaming
    # If Claude is selected, we'll fall back to non-streaming for now
    if is_claude:
        # Claude doesn't support streaming in the same way, use non-streaming
        current_app.logger.info("Claude selected but streaming requested - using non-streaming mode")
        response = client.messages.create(
            model=model_name,
            max_tokens=2000,  # Reduced from 3000 for faster generation
            temperature=0.3,
            system=system_message,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        response_text = response.content[0].text
        # Yield as single chunk for compatibility
        yield (response_text, metadata)
        response_chunks = [response_text]
    else:
        # OpenAI API with streaming
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000,  # Reduced from 3000 for faster generation
            stream=True,
        )
        
        # Stream chunks
        response_chunks = []
        last_heartbeat = time.time()
        HEARTBEAT_INTERVAL = 15.0
        
        try:
            last_chunk_time = time.time()
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    chunk_content = chunk.choices[0].delta.content
                    response_chunks.append(chunk_content)
                    metadata["llm_time"] = time.time() - llm_start
                    
                    # Send heartbeat if needed
                    current_time = time.time()
                    if current_time - last_heartbeat >= HEARTBEAT_INTERVAL:
                        yield ("__HEARTBEAT__", metadata)
                        last_heartbeat = current_time
                    
                    # Yield chunk immediately
                    yield (chunk_content, metadata)
                last_chunk_time = time.time()
        except Exception as e:
            # Log structured error
            error_info = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "tool_precompute_time": metadata.get("tool_precompute_time", 0),
                "llm_time": time.time() - llm_start,
                "total_time": time.time() - start_time,
            }
            current_app.logger.error(
                f"Error during streaming: {json.dumps(error_info)}",
                exc_info=True
            )
            # Re-raise to be handled by caller (will send SSE error event)
            raise
    
    # After streaming completes, assemble full response for post-processing
    response_text = "".join(response_chunks)
    llm_complete = time.time()
    stage2_end = time.time()
    metadata["llm_time"] = llm_complete - llm_start
    print(f"[PERF] run_unified_discovery_streaming: LLM call COMPLETE at {llm_complete:.3f}")
    print(f"[PERF] run_unified_discovery_streaming: LLM duration: {metadata['llm_time']:.3f}s")
    print(f"[PERF] run_unified_discovery_streaming: STAGE 2 END (Idea Research) at {stage2_end:.3f} - Duration: {stage2_end - stage2_start:.3f}s")
    log_timing("run_unified_discovery_streaming", "stage2_end",
              timestamp=stage2_end,
              duration=stage2_end - stage2_start)
    
    # Parse response into two sections
    outputs = {
        "profile_analysis": profile_analysis_json,
        "startup_ideas_research": "",
        "personalized_recommendations": "",
        }
    
    try:
        # Extract idea research report
        if "### Idea Research Report" in response_text:
            research_start = response_text.find("### Idea Research Report")
            rec_marker = "### Comprehensive Recommendation Report"
            if rec_marker in response_text:
                research_end = response_text.find(rec_marker)
                outputs["startup_ideas_research"] = response_text[research_start:research_end].strip()
            else:
                outputs["startup_ideas_research"] = response_text[research_start:].strip()
        
        # Extract recommendations
        if "### Comprehensive Recommendation Report" in response_text:
            rec_start = response_text.find("### Comprehensive Recommendation Report")
            outputs["personalized_recommendations"] = response_text[rec_start:].strip()
    except Exception as e:
        current_app.logger.error(f"Error parsing streaming response: {e}", exc_info=True)
    
    # Cache results (only if outputs are valid)
    if use_cache and not cache_bypass:
        try:
            # Only cache if at least one section has content
            if any(outputs.get(key, "") for key in ["profile_analysis", "startup_ideas_research", "personalized_recommendations"]):
                DiscoveryCache.set(profile_data, outputs, ttl_days=7, bypass=cache_bypass)
        except Exception as e:
            current_app.logger.warning(f"Failed to cache Discovery results: {e}")
    
    pipeline_end = time.time()
    metadata["total_time"] = pipeline_end - start_time
    total_pipeline_time = pipeline_end - pipeline_start
    
    # Safe access to timing variables (may not exist if early failure)
    tool_elapsed_safe = metadata.get('tool_precompute_time', 0.0)
    llm_time_safe = metadata.get('llm_time', 0.0)
    stage1_duration = (stage1_end - stage1_start) if stage1_start and stage1_end else 0.0
    stage2_duration = (stage2_end - stage2_start) if stage2_start and stage2_end else 0.0
    
    print(f"\n{'='*80}")
    print(f"[PERF] run_unified_discovery_streaming: PIPELINE COMPLETE at {pipeline_end:.3f}")
    print(f"[PERF] run_unified_discovery_streaming: Unified Discovery completed in {total_pipeline_time:.3f} seconds")
    print(f"[PERF] run_unified_discovery_streaming: BREAKDOWN:")
    print(f"  - Stage 1 (Profile Analysis): {stage1_duration:.3f}s (start: {stage1_start:.3f}, end: {stage1_end:.3f})")
    print(f"  - Stage 2 (Idea Research): {stage2_duration:.3f}s (start: {stage2_start:.3f}, end: {stage2_end:.3f})")
    print(f"  - Tool precompute: {tool_elapsed_safe:.3f}s")
    print(f"  - LLM generation: {llm_time_safe:.3f}s")
    print(f"  - Other overhead: {total_pipeline_time - stage1_duration - stage2_duration:.3f}s")
    print(f"{'='*80}\n")
    
    log_timing("run_unified_discovery_streaming", "pipeline_end",
              timestamp=pipeline_end,
              duration=total_pipeline_time,
              details={
                  "stage1_duration": stage1_duration,
                  "stage2_duration": stage2_duration,
                  "tool_precompute": tool_elapsed_safe,
                  "llm_generation": llm_time_safe,
                  "overhead": total_pipeline_time - stage1_duration - stage2_duration
              })
    
    current_app.logger.info(f"Unified Discovery completed in {metadata['total_time']:.2f}s (Stage 1: {stage1_duration:.2f}s, Stage 2: {stage2_duration:.2f}s)")
    
    # Yield final metadata with outputs for post-processing
    yield (None, {"final": True, "outputs": outputs, "metadata": metadata})


def run_unified_discovery_non_streaming(
    profile_data: Dict[str, Any],
    use_cache: bool = True,
    cache_bypass: bool = False,
) -> Tuple[Dict[str, str], Dict[str, Any]]:
    """
    Run unified Discovery pipeline without streaming (returns tuple directly, NOT a generator).
    
    Args:
        profile_data: User profile data including all fields + founder_psychology
        use_cache: Whether to check cache first
        cache_bypass: If True, bypass cache (for debugging)
    
    Returns:
        Tuple of (outputs_dict, metadata_dict) - NOT a generator
    """
    pipeline_start = time.time()
    print(f"\n{'='*80}")
    print(f"[PERF] run_unified_discovery_non_streaming: PIPELINE START at {pipeline_start:.3f}")
    print(f"{'='*80}")
    log_timing("run_unified_discovery_non_streaming", "pipeline_start", timestamp=pipeline_start)
    
    start_time = time.time()
    stage1_start = None
    stage1_end = None
    stage2_start = None
    stage2_end = None
    metadata = {
        "cache_hit": False,
        "tool_precompute_time": 0.0,
        "llm_time": 0.0,
        "total_time": 0.0,
    }
    
    # Validate profile_data structure
    try:
        _validate_profile_data(profile_data)
    except ValueError as e:
        current_app.logger.error(f"Invalid profile_data: {e}")
        raise
    
    # Check cache first
    if use_cache and not cache_bypass:
        cached = DiscoveryCache.get(profile_data, bypass=cache_bypass)
        if cached:
            metadata["cache_hit"] = True
            metadata["total_time"] = time.time() - start_time
            print(f"[PERF] run_unified_discovery_non_streaming: CACHE HIT - returning cached results in {metadata['total_time']:.3f}s")
            current_app.logger.info(f"Discovery cache hit - returning cached results")
            return cached, metadata
    
    # PARALLEL EXECUTION: Stage 1 (Profile Analysis) + Tool Precomputation
    # This removes ~15 seconds of dead time by running both concurrently
    stage1_start = time.time()
    print(f"[PERF] run_unified_discovery_non_streaming: STAGE 1 + TOOLS START (PARALLEL) at {stage1_start:.3f}")
    log_timing("run_unified_discovery_non_streaming", "parallel_start", timestamp=stage1_start)
    
    # Extract interest_area for tool loading
    interest_area = profile_data.get("interest_area", "")
    sub_interest_area = profile_data.get("sub_interest_area", "")
    
    # Run Stage 1 and tool loading/precomputation in PARALLEL
    tool_start = time.time()
    with ThreadPoolExecutor(max_workers=2) as executor:
        # Stage 1: Profile Analysis
        stage1_future = executor.submit(run_profile_analysis, profile_data)
        
        # Tool loading: Load static tools ONLY (NEVER execute tools if static files exist)
        def load_or_compute_tools():
            """Load static tools, or fallback to precompute_all_tools ONLY if static files completely missing."""
            tool_results = StaticToolLoader.load(interest_area)
            
            # Check if static files have meaningful content (at least 3 fields)
            if tool_results and len([k for k, v in tool_results.items() if v and len(str(v)) > 10]) >= 3:
                # Static files exist and have content - use them, NEVER execute tools
                current_app.logger.info(f"Using static tools from file for '{interest_area}' ({len(tool_results)} fields)")
                # Ensure all required fields are present (adds defaults for missing ones)
                return _ensure_all_tool_fields(tool_results)
            else:
                # Static files don't exist or are empty - fallback to tool execution
                current_app.logger.warning(f"Static tools missing/empty for '{interest_area}', executing tools (SLOW - will take ~30s)")
                tool_results, _ = precompute_all_tools(interest_area, sub_interest_area)
                return _ensure_all_tool_fields(tool_results)
        
        tool_future = executor.submit(load_or_compute_tools)
        
        # Wait for both to complete
        try:
            stage1_result = stage1_future.result(timeout=60)
            profile_analysis_json = stage1_result.get("profile_analysis", "")
        except Exception as e:
            current_app.logger.error(f"Stage 1 failed: {e}", exc_info=True)
            profile_analysis_json = ""
        
        try:
            tool_results = tool_future.result(timeout=60)
        except Exception as e:
            current_app.logger.error(f"Tool loading/precomputation failed: {e}", exc_info=True)
            # Fallback to defaults only
            tool_results = _ensure_all_tool_fields({})
    
    stage1_end = time.time()
    stage1_duration = stage1_end - stage1_start
    tool_complete = time.time()
    metadata["tool_precompute_time"] = tool_complete - tool_start
    
    print(f"[PERF] run_unified_discovery_non_streaming: PARALLEL EXECUTION COMPLETE")
    print(f"[PERF] run_unified_discovery_non_streaming: STAGE 1 END (Profile Analysis) - Duration: {stage1_duration:.3f}s")
    print(f"[PERF] run_unified_discovery_non_streaming: TOOLS loaded/precomputed - Duration: {metadata['tool_precompute_time']:.3f}s ({len(tool_results)} tools)")
    log_timing("run_unified_discovery_non_streaming", "parallel_end",
              timestamp=stage1_end,
              duration=stage1_duration,
              details={"tool_duration": metadata["tool_precompute_time"]})
    
    # STAGE 2: Idea Research (with static tool blocks - NEVER executes tools)
    stage2_start = time.time()
    print(f"[PERF] run_unified_discovery_non_streaming: STAGE 2 START (Idea Research) at {stage2_start:.3f}")
    log_timing("run_unified_discovery_non_streaming", "stage2_start", timestamp=stage2_start)
    
    # Run idea research (Stage 2 is the ONLY personalization layer)
    idea_research_outputs = run_idea_research(
        profile_analysis_json=profile_analysis_json,
        tool_results=tool_results  # Static tool results (from JSON files)
    )
    
    stage2_end = time.time()
    stage2_duration = stage2_end - stage2_start
    metadata["llm_time"] = stage2_duration  # Stage 2 includes LLM time
    print(f"[PERF] run_unified_discovery_non_streaming: STAGE 2 END (Idea Research) at {stage2_end:.3f} - Duration: {stage2_duration:.3f}s")
    log_timing("run_unified_discovery_non_streaming", "stage2_end",
              timestamp=stage2_end,
              duration=stage2_duration)
    
    # Combine outputs
    outputs = {
        "profile_analysis": profile_analysis_json,
        "startup_ideas_research": idea_research_outputs.get("startup_ideas_research", ""),
        "personalized_recommendations": idea_research_outputs.get("personalized_recommendations", ""),
    }
    
    # Cache results (only if outputs are valid)
    if use_cache and not cache_bypass:
        try:
            # Only cache if at least one section has content
            if any(outputs.get(key, "") for key in ["profile_analysis", "startup_ideas_research", "personalized_recommendations"]):
                DiscoveryCache.set(profile_data, outputs, ttl_days=7, bypass=cache_bypass)
        except Exception as e:
            current_app.logger.warning(f"Failed to cache Discovery results: {e}")
    
    pipeline_end = time.time()
    metadata["total_time"] = pipeline_end - start_time
    total_pipeline_time = pipeline_end - pipeline_start
    
    # Safe access to timing variables
    tool_elapsed_safe = metadata.get('tool_precompute_time', 0.0)
    llm_time_safe = metadata.get('llm_time', 0.0)
    
    print(f"\n{'='*80}")
    print(f"[PERF] run_unified_discovery_non_streaming: PIPELINE COMPLETE at {pipeline_end:.3f}")
    print(f"[PERF] run_unified_discovery_non_streaming: Unified Discovery completed in {total_pipeline_time:.3f} seconds")
    print(f"[PERF] run_unified_discovery_non_streaming: BREAKDOWN:")
    print(f"  - Stage 1 (Profile Analysis): {stage1_duration:.3f}s (start: {stage1_start:.3f}, end: {stage1_end:.3f})")
    print(f"  - Stage 2 (Idea Research): {stage2_duration:.3f}s (start: {stage2_start:.3f}, end: {stage2_end:.3f})")
    print(f"  - Tool precompute: {tool_elapsed_safe:.3f}s")
    print(f"  - LLM generation: {llm_time_safe:.3f}s")
    print(f"  - Other overhead: {total_pipeline_time - stage1_duration - stage2_duration:.3f}s")
    print(f"{'='*80}\n")
    
    log_timing("run_unified_discovery_non_streaming", "pipeline_end",
              timestamp=pipeline_end,
              duration=total_pipeline_time,
              details={
                  "stage1_duration": stage1_duration,
                  "stage2_duration": stage2_duration,
                  "tool_precompute": tool_elapsed_safe,
                  "llm_generation": llm_time_safe,
                  "overhead": total_pipeline_time - stage1_duration - stage2_duration
              })
    
    current_app.logger.info(f"Unified Discovery completed in {metadata['total_time']:.2f}s (Stage 1: {stage1_duration:.2f}s, Stage 2: {stage2_duration:.2f}s)")
    
    # ALWAYS return tuple, even on error
    return outputs, metadata


def run_unified_discovery(
    profile_data: Dict[str, Any],
    use_cache: bool = True,
    stream: bool = False,
    cache_bypass: bool = False,
) -> Union[Tuple[Dict[str, str], Dict[str, Any]], Iterator[Tuple[str, Dict[str, Any]]]]:
    """
    Main entry point for unified Discovery pipeline.
    
    Args:
        profile_data: User profile data including all fields + founder_psychology
        use_cache: Whether to check cache first
        stream: If True, returns streaming iterator; if False, returns tuple directly
        cache_bypass: If True, bypass cache (for debugging)
    
    Returns:
        If stream=False: Tuple of (outputs_dict, metadata_dict) - NOT a generator
        If stream=True: Iterator of (chunk, metadata_dict) tuples
    """
    if stream:
        return run_unified_discovery_streaming(profile_data, use_cache, cache_bypass)
    
    # Non-streaming: return tuple directly (NOT a generator)
    return run_unified_discovery_non_streaming(profile_data, use_cache, cache_bypass)

