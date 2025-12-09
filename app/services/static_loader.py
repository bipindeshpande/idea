"""
Static Block Loader - Loads precomputed static knowledge blocks for interest areas.

Static blocks are cached for 30 days and used as knowledge inputs to the LLM,
not shown directly to users.
"""
import json
import re
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import timedelta

try:
    from flask import current_app, has_app_context
    from app.models.database import db, utcnow, ToolCacheEntry
    CACHE_AVAILABLE = True
except ImportError:
    CACHE_AVAILABLE = False


def normalize_interest_area(interest_area: str) -> str:
    """
    Normalize interest_area to filename format.
    
    Examples:
        'AI / Automation' -> 'ai_automation'
        'E-commerce' -> 'e_commerce'
        'Health & Wellness' -> 'health_wellness'
    
    Args:
        interest_area: Original interest area string
    
    Returns:
        Normalized string suitable for filename
    """
    if not interest_area:
        return ""
    
    # Convert to lowercase
    normalized = interest_area.lower()
    
    # Replace common separators with underscores
    normalized = re.sub(r'[/\s&]+', '_', normalized)
    
    # Remove special characters except underscores and hyphens
    normalized = re.sub(r'[^a-z0-9_-]', '', normalized)
    
    # Collapse multiple underscores
    normalized = re.sub(r'_+', '_', normalized)
    
    # Remove leading/trailing underscores
    normalized = normalized.strip('_')
    
    return normalized


def load_static_blocks(interest_area: str) -> Dict[str, str]:
    """
    Loads static block JSON for the given interest_area.
    
    Normalizes interest_area (e.g., 'AI / Automation' -> 'ai_automation').
    If file exists: return its JSON.
    If not: return {}.
    Caches using ArchetypeCache for 30 days.
    
    Args:
        interest_area: Interest area string (e.g., "AI / Automation")
    
    Returns:
        Dictionary with static blocks (market_trends, competitors, risks, etc.)
        or empty dict if file not found
    """
    if not interest_area:
        return {}
    
    # Normalize interest area to filename
    normalized = normalize_interest_area(interest_area)
    if not normalized:
        return {}
    
    # Check cache first (30 day TTL)
    if CACHE_AVAILABLE and has_app_context():
        cache_key = f"static_blocks_{normalized}"
        try:
            from flask import current_app
            cached = ToolCacheEntry.query.filter_by(
                cache_key=cache_key
            ).filter(
                ToolCacheEntry.expires_at > utcnow()
            ).first()
            
            if cached:
                try:
                    result = json.loads(cached.result)
                    if has_app_context():
                        current_app.logger.debug(f"Static blocks cache HIT: {cache_key}")
                    return result
                except json.JSONDecodeError:
                    pass
        except Exception:
            # If cache lookup fails, continue to file load
            pass
    
    # Load from file
    static_blocks_dir = Path(__file__).parent.parent.parent / "src" / "startup_idea_crew" / "static_blocks"
    json_file = static_blocks_dir / f"{normalized}.json"
    
    if not json_file.exists():
        return {}
    
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            blocks = json.load(f)
        
        # Validate structure - ensure it's a dict of strings
        if not isinstance(blocks, dict):
            return {}
        
        # Filter to only string values
        filtered_blocks = {k: str(v) for k, v in blocks.items() if isinstance(v, (str, int, float))}
        
        # Cache for 30 days
        if CACHE_AVAILABLE and has_app_context() and filtered_blocks:
            try:
                from flask import current_app
                cache_key = f"static_blocks_{normalized}"
                expires_at = utcnow() + timedelta(days=30)
                result_json = json.dumps(filtered_blocks, ensure_ascii=False, sort_keys=True)
                
                existing = ToolCacheEntry.query.filter_by(cache_key=cache_key).first()
                if existing:
                    existing.result = result_json
                    existing.expires_at = expires_at
                    existing.hit_count = 0
                    existing.tool_name = "static_blocks"
                else:
                    cache_entry = ToolCacheEntry(
                        cache_key=cache_key,
                        tool_name="static_blocks",
                        tool_params=json.dumps({"interest_area": interest_area}, sort_keys=True),
                        result=result_json,
                        expires_at=expires_at
                    )
                    db.session.add(cache_entry)
                
                db.session.commit()
                if has_app_context():
                    current_app.logger.debug(f"Static blocks cached: {cache_key}")
            except Exception as e:
                # If caching fails, continue without cache
                try:
                    if has_app_context():
                        from flask import current_app
                        current_app.logger.warning(f"Failed to cache static blocks: {e}")
                except Exception:
                    pass
                try:
                    db.session.rollback()
                except Exception:
                    pass
        
        return filtered_blocks
    
    except (json.JSONDecodeError, IOError, OSError) as e:
        # Log error but don't fail - return empty dict
        try:
            if has_app_context():
                from flask import current_app
                current_app.logger.warning(f"Failed to load static blocks from {json_file}: {e}")
        except Exception:
            pass
        return {}


def get_static_block_keys() -> list:
    """
    Get list of expected static block keys.
    
    Returns:
        List of expected keys in static block JSON files
    """
    return [
        "market_trends",
        "competitors",
        "risks",
        "market_size",
        "opportunity_space",
        "idea_patterns"
    ]

