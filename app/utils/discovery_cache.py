"""
Enhanced caching system for Discovery pipeline.
Uses 8-factor hash: all profile fields + founder_psychology.
"""
import json
import hashlib
from datetime import timedelta
from typing import Optional, Dict, Any
from flask import current_app, has_app_context
from app.models.database import db, utcnow, ToolCacheEntry


class DiscoveryCache:
    """Cache for complete Discovery outputs using 8-factor hash."""
    
    # The 8 factors that make up the cache key
    CACHE_FACTORS = [
        "goal_type",
        "time_commitment",
        "budget_range",
        "interest_area",
        "sub_interest_area",
        "work_style",
        "skill_strength",
        "experience_summary",
        "founder_psychology",  # 8th factor
    ]
    
    @staticmethod
    def _normalize_value(value: Any) -> str:
        """
        Normalize a value for hashing to ensure cache correctness.
        
        Handles:
        - None values → empty string
        - Dict values → sorted JSON string
        - String values → trimmed, lowercased, normalized whitespace
        - Other types → string representation, trimmed
        """
        if value is None:
            return ""
        if isinstance(value, dict):
            # Sort dict keys and convert to JSON string (deterministic)
            return json.dumps(value, sort_keys=True, ensure_ascii=False)
        if isinstance(value, str):
            # Normalize: trim, lowercase, collapse whitespace
            normalized = value.strip().lower()
            # Collapse multiple whitespace to single space
            normalized = ' '.join(normalized.split())
            return normalized
        # Convert to string, trim, and normalize
        str_value = str(value).strip().lower()
        return ' '.join(str_value.split())
    
    @staticmethod
    def _generate_cache_key(profile_data: Dict[str, Any]) -> str:
        """
        Generate cache key from all 8 factors.
        
        Args:
            profile_data: Dictionary containing all profile fields + founder_psychology
        
        Returns:
            Cache key string: "discovery:{hash}"
        """
        # Build normalized dict with all 8 factors
        normalized = {}
        for factor in DiscoveryCache.CACHE_FACTORS:
            value = profile_data.get(factor, "")
            normalized[factor] = DiscoveryCache._normalize_value(value)
        
        # Create JSON string and hash it
        # Sort keys to ensure consistent hashing
        cache_data = json.dumps(normalized, sort_keys=True)
        cache_hash = hashlib.sha256(cache_data.encode('utf-8')).hexdigest()[:32]
        
        return f"discovery:{cache_hash}"
    
    @staticmethod
    def get(profile_data: Dict[str, Any], bypass: bool = False) -> Optional[Dict[str, str]]:
        """
        Get cached Discovery output.
        
        Args:
            profile_data: Dictionary with all profile fields + founder_psychology
            bypass: If True, skip cache lookup (for debugging)
        
        Returns:
            Dictionary with keys: profile_analysis, startup_ideas_research, personalized_recommendations
            Or None if not found/expired
        """
        if bypass:
            current_app.logger.info("Discovery cache bypassed (bypass=True)")
            return None
        
        if not has_app_context():
            current_app.logger.debug("Discovery cache lookup skipped (no app context)")
            return None
        
        try:
            cache_key = DiscoveryCache._generate_cache_key(profile_data)
            current_app.logger.debug(f"Discovery cache lookup: {cache_key}")
            
            # Check if table exists, if not return None (cache miss)
            try:
                cached = ToolCacheEntry.query.filter_by(
                    cache_key=cache_key
                ).filter(
                    ToolCacheEntry.expires_at > utcnow()
                ).first()
            except Exception as table_error:
                # Table doesn't exist or column mismatch - log and return None
                current_app.logger.warning(
                    f"ToolCacheEntry table error (table may not exist): {table_error}. "
                    f"Returning cache miss. Run migration: migrations/add_tool_cache_table.sql"
                )
                return None
            
            if cached:
                cached.hit_count += 1
                db.session.commit()
                
                # Parse cached result (stored as JSON)
                try:
                    result = json.loads(cached.result)
                    current_app.logger.info(
                        f"Discovery cache HIT: {cache_key} "
                        f"(hit_count={cached.hit_count}, expires_at={cached.expires_at})"
                    )
                    return result
                except json.JSONDecodeError as e:
                    current_app.logger.warning(
                        f"Discovery cache entry has invalid JSON: {cache_key}, error: {e}"
                    )
                    return None
            
            current_app.logger.debug(f"Discovery cache MISS: {cache_key}")
            return None
            
        except Exception as e:
            if has_app_context():
                current_app.logger.warning(
                    f"Discovery cache lookup failed: {e}",
                    exc_info=True
                )
            return None
    
    @staticmethod
    def set(
        profile_data: Dict[str, Any],
        outputs: Dict[str, str],
        ttl_days: int = 7,
        bypass: bool = False
    ) -> None:
        """
        Store Discovery output in cache.
        
        Args:
            profile_data: Dictionary with all profile fields + founder_psychology
            outputs: Dictionary with keys: profile_analysis, startup_ideas_research, personalized_recommendations
            ttl_days: Time to live in days (default: 7)
            bypass: If True, skip cache storage (for debugging)
        """
        if bypass:
            current_app.logger.info("Discovery cache storage bypassed (bypass=True)")
            return
        
        if not has_app_context():
            current_app.logger.debug("Discovery cache storage skipped (no app context)")
            return
        
        try:
            cache_key = DiscoveryCache._generate_cache_key(profile_data)
            expires_at = utcnow() + timedelta(days=ttl_days)
            
            # Validate outputs structure
            required_keys = {"profile_analysis", "startup_ideas_research", "personalized_recommendations"}
            if not all(key in outputs for key in required_keys):
                current_app.logger.warning(
                    f"Discovery cache storage skipped: missing required keys. "
                    f"Expected: {required_keys}, Got: {set(outputs.keys())}"
                )
                return
            
            # Store outputs as JSON string
            result_json = json.dumps(outputs, ensure_ascii=False, sort_keys=True)
            
            # Check if table exists, if not skip caching
            try:
                existing = ToolCacheEntry.query.filter_by(cache_key=cache_key).first()
            except Exception as table_error:
                # Table doesn't exist or column mismatch - log and skip caching
                current_app.logger.warning(
                    f"ToolCacheEntry table error (table may not exist): {table_error}. "
                    f"Skipping cache storage. Run migration: migrations/add_tool_cache_table.sql"
                )
                return
            
            if existing:
                # Update existing entry
                existing.result = result_json
                existing.expires_at = expires_at
                existing.hit_count = 0  # Reset hit count on update
                existing.tool_name = "discovery_unified"  # Update tool name
                current_app.logger.info(
                    f"Discovery cache UPDATED: {cache_key} "
                    f"(TTL: {ttl_days} days, expires_at={expires_at})"
                )
            else:
                # Create new entry
                cache_entry = ToolCacheEntry(
                    cache_key=cache_key,
                    tool_name="discovery_unified",
                    tool_params=json.dumps(profile_data, sort_keys=True, ensure_ascii=False),
                    result=result_json,
                    expires_at=expires_at
                )
                db.session.add(cache_entry)
                current_app.logger.info(
                    f"Discovery cache STORED: {cache_key} "
                    f"(TTL: {ttl_days} days, expires_at={expires_at})"
                )
            
            db.session.commit()
            
        except Exception as e:
            if has_app_context():
                current_app.logger.warning(
                    f"Discovery cache storage failed: {e}",
                    exc_info=True
                )
            try:
                db.session.rollback()
            except Exception:
                pass

