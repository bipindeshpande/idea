"""
Static Tool Loader - Loads pre-generated static tool results from JSON files.

These are one-time LLM-generated data files that replace dynamic tool execution.
Tool execution cost = 0.0 seconds (instant file read).
"""
import json
import re
from pathlib import Path
from typing import Dict, Any


class StaticToolLoader:
    """Loads pre-generated static tool results for interest areas."""
    
    @staticmethod
    def normalize_interest_area(interest_area: str) -> str:
        """
        Normalize interest_area to filename format.
        
        Examples:
            'AI / Automation' -> 'ai'
            'E-commerce' -> 'ecommerce'
            'Health & Wellness' -> 'healthtech'
        
        Args:
            interest_area: Original interest area string
        
        Returns:
            Normalized string suitable for filename
        """
        if not interest_area:
            return ""
        
        # Convert to lowercase
        normalized = interest_area.lower()
        
        # Map common variations to standard filenames
        mapping = {
            "ai / automation": "ai",
            "ai automation": "ai",
            "artificial intelligence": "ai",
            "fintech": "fintech",
            "financial technology": "fintech",
            "health & wellness": "healthtech",
            "healthtech": "healthtech",
            "health tech": "healthtech",
            "e-commerce": "ecommerce",
            "ecommerce": "ecommerce",
            "edtech": "edtech",
            "education technology": "edtech",
            "creator": "creator",
            "creator economy": "creator",
            "sustainability": "sustainability",
            "green tech": "sustainability",
        }
        
        # Check mapping first
        if normalized in mapping:
            return mapping[normalized]
        
        # Replace common separators with underscores
        normalized = re.sub(r'[/\s&]+', '_', normalized)
        
        # Remove special characters except underscores and hyphens
        normalized = re.sub(r'[^a-z0-9_-]', '', normalized)
        
        # Collapse multiple underscores
        normalized = re.sub(r'_+', '_', normalized)
        
        # Remove leading/trailing underscores
        normalized = normalized.strip('_')
        
        return normalized
    
    @staticmethod
    def load(interest_area: str) -> Dict[str, str]:
        """
        Loads pre-generated static JSON for an interest area.
        
        Contains:
        - market_trends
        - market_size
        - risks
        - competitors
        - costs
        - revenue_models
        - persona
        - validation_insights
        - viability_summary
        
        Args:
            interest_area: Interest area string (e.g., "AI / Automation")
        
        Returns:
            Dictionary of tool results, or empty dict if file missing
        """
        if not interest_area:
            return {}
        
        # Normalize interest area to filename
        normalized = StaticToolLoader.normalize_interest_area(interest_area)
        if not normalized:
            return {}
        
        # Load from static_data directory
        static_data_dir = Path(__file__).parent.parent.parent / "static_data"
        json_file = static_data_dir / f"{normalized}.json"
        
        if not json_file.exists():
            return {}
        
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Validate structure - ensure it's a dict
            if not isinstance(data, dict):
                return {}
            
            # Convert all values to strings (tools return strings)
            result = {k: str(v) for k, v in data.items()}
            
            return result
        
        except (json.JSONDecodeError, IOError, OSError) as e:
            # Log error but don't fail - return empty dict
            try:
                from flask import current_app, has_app_context
                if has_app_context():
                    current_app.logger.warning(f"Failed to load static tools from {json_file}: {e}")
            except Exception:
                pass
            return {}

