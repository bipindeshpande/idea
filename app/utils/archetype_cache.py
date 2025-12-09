"""
Archetype caching for Discovery pipeline performance optimization.
Caches generic profile sections that don't depend on experience_summary.
"""
import json
import hashlib
from datetime import timedelta
from typing import Optional, Dict, Any
from flask import current_app, has_app_context
from app.models.database import db, utcnow, ToolCacheEntry


class ArchetypeCache:
    """Cache for archetype-based profile sections that don't require personalization."""
    
    # The factors that make up the archetype cache key (excluding experience_summary)
    ARCHETYPE_FACTORS = [
        "goal_type",
        "skill_strength",
        "time_commitment",
        "budget_range",
        "interest_area",
        "sub_interest_area",
        "work_style",
        "founder_psychology_constraints",  # Constraints extracted from founder_psychology
    ]
    
    @staticmethod
    def _extract_psychology_constraints(founder_psychology: Dict[str, Any]) -> str:
        """
        Extract constraint-relevant fields from founder_psychology.
        
        Includes: decision_style, energy_pattern, consistency_pattern, risk_approach
        Excludes: motivation, fear, success_definition (these affect personalization)
        
        Args:
            founder_psychology: Founder psychology dict
            
        Returns:
            Normalized string of constraints
        """
        if not founder_psychology or not isinstance(founder_psychology, dict):
            return ""
        
        constraints = []
        
        # Include constraint-relevant fields only
        if founder_psychology.get("decision_style"):
            constraints.append(f"decision_style:{founder_psychology.get('decision_style')}")
        if founder_psychology.get("energy_pattern"):
            constraints.append(f"energy_pattern:{founder_psychology.get('energy_pattern')}")
        if founder_psychology.get("consistency_pattern"):
            constraints.append(f"consistency_pattern:{founder_psychology.get('consistency_pattern')}")
        if founder_psychology.get("risk_approach"):
            constraints.append(f"risk_approach:{founder_psychology.get('risk_approach')}")
        
        return "|".join(sorted(constraints))  # Sort for deterministic hash
    
    @staticmethod
    def _normalize_value(value: Any) -> str:
        """
        Normalize a value for hashing to ensure cache correctness.
        
        Args:
            value: Value to normalize
            
        Returns:
            Normalized string value, or empty string if None
        """
        if value is None:
            return ""
        if isinstance(value, dict):
            # Sort dict keys and convert to JSON string (deterministic)
            return json.dumps(value, sort_keys=True, ensure_ascii=False)
        if isinstance(value, str):
            # Normalize: trim, lowercase, collapse whitespace
            normalized = value.strip().lower()
            normalized = ' '.join(normalized.split())
            return normalized
        # Convert to string, trim, and normalize
        str_value = str(value).strip().lower()
        return ' '.join(str_value.split())
    
    @staticmethod
    def _generate_archetype_key(profile_data: Dict[str, Any]) -> str:
        """
        Generate cache key from archetype factors (excluding experience_summary).
        
        Args:
            profile_data: Dictionary containing profile fields + founder_psychology
            
        Returns:
            Cache key string: "archetype:{hash}"
        """
        # Build normalized dict with archetype factors
        normalized = {}
        
        # Standard profile fields
        for factor in ["goal_type", "skill_strength", "time_commitment", "budget_range", 
                       "interest_area", "sub_interest_area", "work_style"]:
            value = profile_data.get(factor, "")
            normalized[factor] = ArchetypeCache._normalize_value(value)
        
        # Extract constraints from founder_psychology
        founder_psychology = profile_data.get("founder_psychology", {})
        psychology_constraints = ArchetypeCache._extract_psychology_constraints(founder_psychology)
        normalized["founder_psychology_constraints"] = ArchetypeCache._normalize_value(psychology_constraints)
        
        # Create JSON string and hash it
        cache_data = json.dumps(normalized, sort_keys=True)
        cache_hash = hashlib.sha256(cache_data.encode('utf-8')).hexdigest()[:32]
        
        return f"archetype:{cache_hash}"
    
    @staticmethod
    def get(profile_data: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """
        Get cached archetype blocks.
        
        Returns cached blocks:
        - operating_constraints
        - opportunity_within_interest
        - strengths_to_leverage
        - skill_gaps_to_fill
        
        Args:
            profile_data: Dictionary with profile fields + founder_psychology
            
        Returns:
            Dictionary with archetype blocks, or None if not found/expired
        """
        if not has_app_context():
            current_app.logger.debug("Archetype cache lookup skipped (no app context)")
            return None
        
        try:
            cache_key = ArchetypeCache._generate_archetype_key(profile_data)
            current_app.logger.debug(f"Archetype cache lookup: {cache_key}")
            
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
                        f"Archetype cache HIT: {cache_key} "
                        f"(hit_count={cached.hit_count}, expires_at={cached.expires_at})"
                    )
                    return result
                except json.JSONDecodeError as e:
                    current_app.logger.warning(
                        f"Archetype cache entry has invalid JSON: {cache_key}, error: {e}"
                    )
                    return None
            
            current_app.logger.debug(f"Archetype cache MISS: {cache_key}")
            return None
            
        except Exception as e:
            if has_app_context():
                current_app.logger.warning(
                    f"Archetype cache lookup failed: {e}",
                    exc_info=True
                )
            return None
    
    @staticmethod
    def set(
        profile_data: Dict[str, Any],
        archetype_blocks: Dict[str, str],
        ttl_days: int = 30,
    ) -> None:
        """
        Store archetype blocks in cache.
        
        Args:
            profile_data: Dictionary with profile fields + founder_psychology
            archetype_blocks: Dictionary with keys:
                - operating_constraints
                - opportunity_within_interest
                - strengths_to_leverage
                - skill_gaps_to_fill
            ttl_days: Time to live in days (default: 30)
        """
        if not has_app_context():
            current_app.logger.debug("Archetype cache storage skipped (no app context)")
            return
        
        try:
            cache_key = ArchetypeCache._generate_archetype_key(profile_data)
            expires_at = utcnow() + timedelta(days=ttl_days)
            
            # Validate archetype_blocks structure
            required_keys = {
                "operating_constraints",
                "opportunity_within_interest",
                "strengths_to_leverage",
                "skill_gaps_to_fill"
            }
            if not all(key in archetype_blocks for key in required_keys):
                current_app.logger.warning(
                    f"Archetype cache storage skipped: missing required keys. "
                    f"Expected: {required_keys}, Got: {set(archetype_blocks.keys())}"
                )
                return
            
            # Store archetype_blocks as JSON string
            result_json = json.dumps(archetype_blocks, ensure_ascii=False, sort_keys=True)
            
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
                existing.tool_name = "archetype_cache"  # Update tool name
                current_app.logger.info(
                    f"Archetype cache UPDATED: {cache_key} "
                    f"(TTL: {ttl_days} days, expires_at={expires_at})"
                )
            else:
                # Create new entry
                cache_entry = ToolCacheEntry(
                    cache_key=cache_key,
                    tool_name="archetype_cache",
                    tool_params=json.dumps({
                        "goal_type": profile_data.get("goal_type"),
                        "skill_strength": profile_data.get("skill_strength"),
                        "time_commitment": profile_data.get("time_commitment"),
                        "budget_range": profile_data.get("budget_range"),
                        "interest_area": profile_data.get("interest_area"),
                        "sub_interest_area": profile_data.get("sub_interest_area"),
                        "work_style": profile_data.get("work_style"),
                    }, sort_keys=True, ensure_ascii=False),
                    result=result_json,
                    expires_at=expires_at
                )
                db.session.add(cache_entry)
                current_app.logger.info(
                    f"Archetype cache STORED: {cache_key} "
                    f"(TTL: {ttl_days} days, expires_at={expires_at})"
                )
            
            db.session.commit()
            
        except Exception as e:
            if has_app_context():
                current_app.logger.warning(
                    f"Archetype cache storage failed: {e}",
                    exc_info=True
                )
            try:
                db.session.rollback()
            except Exception:
                pass

