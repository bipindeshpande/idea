"""
Domain Research Manager for Layer 1 (Shared Facts)
Manages reading/writing domain research JSON files per interest_area.
These files contain objective, non-personalized data that can be cached.
"""
import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
from flask import current_app

# Domain research directory path
DOMAIN_RESEARCH_DIR = Path(__file__).parent.parent / "data" / "domain_research"


def _ensure_directory():
    """Ensure the domain research directory exists."""
    DOMAIN_RESEARCH_DIR.mkdir(parents=True, exist_ok=True)


def _normalize_interest_area(interest_area: str) -> str:
    """Normalize interest area to a valid filename."""
    # Remove special characters, replace spaces with underscores
    normalized = interest_area.strip().lower()
    normalized = normalized.replace(" ", "_")
    normalized = normalized.replace("/", "_")
    normalized = normalized.replace("\\", "_")
    normalized = "".join(c for c in normalized if c.isalnum() or c == "_")
    return normalized or "default"


def get_domain_research_file_path(interest_area: str) -> Path:
    """Get the file path for a domain research JSON file."""
    _ensure_directory()
    filename = f"{_normalize_interest_area(interest_area)}.json"
    return DOMAIN_RESEARCH_DIR / filename


def load_domain_research(interest_area: str) -> Optional[Dict[str, Any]]:
    """
    Load domain research data for an interest area.
    
    Args:
        interest_area: The interest area (e.g., "AI / Automation")
    
    Returns:
        Dictionary with domain research data, or None if not found
    """
    file_path = get_domain_research_file_path(interest_area)
    
    if not file_path.exists():
        return None
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if current_app:
                current_app.logger.debug(f"Loaded domain research from {file_path.name}")
            return data
    except (json.JSONDecodeError, IOError) as e:
        if current_app:
            current_app.logger.warning(f"Failed to load domain research from {file_path.name}: {e}")
        return None


def save_domain_research(interest_area: str, data: Dict[str, Any]) -> bool:
    """
    Save domain research data for an interest area.
    
    Args:
        interest_area: The interest area (e.g., "AI / Automation")
        data: Dictionary with domain research data
    
    Returns:
        True if saved successfully, False otherwise
    """
    _ensure_directory()
    file_path = get_domain_research_file_path(interest_area)
    
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        if current_app:
            current_app.logger.info(f"Saved domain research to {file_path.name}")
        return True
    except IOError as e:
        if current_app:
            current_app.logger.error(f"Failed to save domain research to {file_path.name}: {e}")
        return False


def update_domain_research_field(interest_area: str, field: str, value: Any) -> bool:
    """
    Update a specific field in domain research data.
    
    Args:
        interest_area: The interest area
        field: Field name to update (e.g., "market_trends", "competitor_overview")
        value: Value to set
    
    Returns:
        True if updated successfully, False otherwise
    """
    data = load_domain_research(interest_area) or {}
    data[field] = value
    return save_domain_research(interest_area, data)


def has_domain_research(interest_area: str, field: Optional[str] = None) -> bool:
    """
    Check if domain research exists for an interest area (and optionally a specific field).
    
    Args:
        interest_area: The interest area
        field: Optional field name to check
    
    Returns:
        True if research exists (and field exists if specified)
    """
    data = load_domain_research(interest_area)
    if data is None:
        return False
    if field:
        return field in data and data[field] is not None
    return True

