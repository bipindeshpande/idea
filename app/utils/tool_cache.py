"""
Tool result caching utility for Discovery endpoint optimization.
Caches tool results to reduce API calls and improve performance.
"""
import json
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, Dict
from flask import current_app, has_app_context
from app.models.database import db, utcnow


class ToolCache:
    """Simple cache wrapper for tool results using PostgreSQL."""
    
    @staticmethod
    def _generate_cache_key(tool_name: str, **params) -> str:
        """Generate a cache key from tool name and parameters."""
        # Normalize parameters: sort keys, convert to strings, strip whitespace
        normalized_params = {}
        for key, value in sorted(params.items()):
            if value is None:
                continue
            # Convert to string and strip
            str_value = str(value).strip()
            if str_value:  # Only include non-empty values
                normalized_params[key] = str_value
        
        # Create JSON string and hash it
        params_json = json.dumps(normalized_params, sort_keys=True)
        params_hash = hashlib.sha256(params_json.encode('utf-8')).hexdigest()[:16]
        
        return f"{tool_name}:{params_hash}"
    
    @staticmethod
    def get(tool_name: str, **params) -> Optional[str]:
        """
        Get cached tool result.
        
        Args:
            tool_name: Name of the tool
            **params: Tool parameters (used to generate cache key)
        
        Returns:
            Cached result string if found and not expired, None otherwise
        """
        # Only use cache if Flask app context is available
        if not has_app_context():
            return None
        
        try:
            cache_key = ToolCache._generate_cache_key(tool_name, **params)
            
            # Import here to avoid circular dependency
            from app.models.database import ToolCacheEntry
            
            cached = ToolCacheEntry.query.filter_by(
                cache_key=cache_key
            ).filter(
                ToolCacheEntry.expires_at > utcnow()
            ).first()
            
            if cached:
                cached.hit_count += 1
                db.session.commit()
                current_app.logger.debug(f"Tool cache hit: {tool_name} (key: {cache_key})")
                return cached.result
            
            return None
            
        except Exception as e:
            # Don't fail if cache lookup fails
            if has_app_context():
                current_app.logger.warning(f"Tool cache lookup failed: {e}")
            return None
    
    @staticmethod
    def set(tool_name: str, result: str, ttl_days: int = 7, **params) -> None:
        """
        Store tool result in cache.
        
        Args:
            tool_name: Name of the tool
            result: Tool result string to cache
            ttl_days: Time to live in days (default: 7)
            **params: Tool parameters (used to generate cache key)
        """
        # Only use cache if Flask app context is available
        if not has_app_context():
            return
        
        try:
            cache_key = ToolCache._generate_cache_key(tool_name, **params)
            expires_at = utcnow() + timedelta(days=ttl_days)
            
            # Import here to avoid circular dependency
            from app.models.database import ToolCacheEntry
            
            # Check if entry exists
            existing = ToolCacheEntry.query.filter_by(cache_key=cache_key).first()
            
            if existing:
                # Update existing entry
                existing.result = result
                existing.expires_at = expires_at
                existing.hit_count = 0  # Reset hit count on update
            else:
                # Create new entry
                cache_entry = ToolCacheEntry(
                    cache_key=cache_key,
                    tool_name=tool_name,
                    tool_params=json.dumps(params),
                    result=result,
                    expires_at=expires_at
                )
                db.session.add(cache_entry)
            
            db.session.commit()
            current_app.logger.debug(f"Tool cache stored: {tool_name} (key: {cache_key}, TTL: {ttl_days} days)")
            
        except Exception as e:
            # Don't fail if cache storage fails
            if has_app_context():
                current_app.logger.warning(f"Tool cache storage failed: {e}")
            try:
                db.session.rollback()
            except Exception:
                pass

