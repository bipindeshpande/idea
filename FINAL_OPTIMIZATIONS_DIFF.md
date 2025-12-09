# FINAL OPTIMIZATIONS - DETAILED DIFFS
## Quality, Stability & Performance Improvements

**Date:** 2025-01-05

---

## FILE: `app/utils/discovery_cache.py`

### Enhanced Normalization

```diff
  @staticmethod
  def _normalize_value(value: Any) -> str:
-     """Normalize a value for hashing."""
+     """
+     Normalize a value for hashing to ensure cache correctness.
+     
+     Handles:
+     - None values → empty string
+     - Dict values → sorted JSON string
+     - String values → trimmed, lowercased, normalized whitespace
+     - Other types → string representation, trimmed
+     """
      if value is None:
          return ""
      if isinstance(value, dict):
-         # Sort dict keys and convert to JSON string
-         return json.dumps(value, sort_keys=True)
+         # Sort dict keys and convert to JSON string (deterministic)
+         return json.dumps(value, sort_keys=True, ensure_ascii=False)
      if isinstance(value, str):
-         return value.strip()
-     return str(value).strip()
+         # Normalize: trim, lowercase, collapse whitespace
+         normalized = value.strip().lower()
+         # Collapse multiple whitespace to single space
+         normalized = ' '.join(normalized.split())
+         return normalized
+     # Convert to string, trim, and normalize
+     str_value = str(value).strip().lower()
+     return ' '.join(str_value.split())
```

### Enhanced Cache Get with Logging

```diff
  @staticmethod
- def get(profile_data: Dict[str, Any]) -> Optional[Dict[str, str]]:
+ def get(profile_data: Dict[str, Any], bypass: bool = False) -> Optional[Dict[str, str]]:
      """
      Get cached Discovery output.
      
      Args:
          profile_data: Dictionary with all profile fields + founder_psychology
+         bypass: If True, skip cache lookup (for debugging)
      
      Returns:
          Dictionary with keys: profile_analysis, startup_ideas_research, personalized_recommendations
          Or None if not found/expired
      """
+     if bypass:
+         current_app.logger.info("Discovery cache bypassed (bypass=True)")
+         return None
+     
      if not has_app_context():
+         current_app.logger.debug("Discovery cache lookup skipped (no app context)")
          return None
      
      try:
          cache_key = DiscoveryCache._generate_cache_key(profile_data)
+         current_app.logger.debug(f"Discovery cache lookup: {cache_key}")
          
          cached = ToolCacheEntry.query.filter_by(...).first()
          
          if cached:
              cached.hit_count += 1
              db.session.commit()
              
              try:
                  result = json.loads(cached.result)
-                 current_app.logger.debug(f"Discovery cache hit: {cache_key}")
+                 current_app.logger.info(
+                     f"Discovery cache HIT: {cache_key} "
+                     f"(hit_count={cached.hit_count}, expires_at={cached.expires_at})"
+                 )
                  return result
              except json.JSONDecodeError as e:
-                 current_app.logger.warning(f"Discovery cache entry has invalid JSON: {cache_key}")
+                 current_app.logger.warning(
+                     f"Discovery cache entry has invalid JSON: {cache_key}, error: {e}"
+                 )
                  return None
          
+         current_app.logger.debug(f"Discovery cache MISS: {cache_key}")
          return None
          
      except Exception as e:
          if has_app_context():
-             current_app.logger.warning(f"Discovery cache lookup failed: {e}")
+             current_app.logger.warning(
+                 f"Discovery cache lookup failed: {e}",
+                 exc_info=True
+             )
          return None
```

### Enhanced Cache Set with Validation

```diff
  @staticmethod
  def set(
      profile_data: Dict[str, Any],
      outputs: Dict[str, str],
      ttl_days: int = 7
+     bypass: bool = False
  ) -> None:
      """
      Store Discovery output in cache.
      
      Args:
          profile_data: Dictionary with all profile fields + founder_psychology
          outputs: Dictionary with keys: profile_analysis, startup_ideas_research, personalized_recommendations
          ttl_days: Time to live in days (default: 7)
+         bypass: If True, skip cache storage (for debugging)
      """
+     if bypass:
+         current_app.logger.info("Discovery cache storage bypassed (bypass=True)")
+         return
+     
      if not has_app_context():
+         current_app.logger.debug("Discovery cache storage skipped (no app context)")
          return
      
      try:
          cache_key = DiscoveryCache._generate_cache_key(profile_data)
          expires_at = utcnow() + timedelta(days=ttl_days)
          
+         # Validate outputs structure
+         required_keys = {"profile_analysis", "startup_ideas_research", "personalized_recommendations"}
+         if not all(key in outputs for key in required_keys):
+             current_app.logger.warning(
+                 f"Discovery cache storage skipped: missing required keys. "
+                 f"Expected: {required_keys}, Got: {set(outputs.keys())}"
+             )
+             return
+         
          # Store outputs as JSON string
-         result_json = json.dumps(outputs, ensure_ascii=False)
+         result_json = json.dumps(outputs, ensure_ascii=False, sort_keys=True)
          
          # Check if entry exists
          existing = ToolCacheEntry.query.filter_by(cache_key=cache_key).first()
          
          if existing:
              # Update existing entry
              existing.result = result_json
              existing.expires_at = expires_at
              existing.hit_count = 0  # Reset hit count on update
              existing.tool_name = "discovery_unified"  # Update tool name
+             current_app.logger.info(
+                 f"Discovery cache UPDATED: {cache_key} "
+                 f"(TTL: {ttl_days} days, expires_at={expires_at})"
+             )
          else:
              # Create new entry
              cache_entry = ToolCacheEntry(...)
              db.session.add(cache_entry)
+             current_app.logger.info(
+                 f"Discovery cache STORED: {cache_key} "
+                 f"(TTL: {ttl_days} days, expires_at={expires_at})"
+             )
          
          db.session.commit()
-         current_app.logger.debug(f"Discovery cache stored: {cache_key} (TTL: {ttl_days} days)")
          
      except Exception as e:
          if has_app_context():
-             current_app.logger.warning(f"Discovery cache storage failed: {e}")
+             current_app.logger.warning(
+                 f"Discovery cache storage failed: {e}",
+                 exc_info=True
+             )
          try:
              db.session.rollback()
          except Exception:
              pass
```

---

## FILE: `app/services/unified_discovery_service.py`

### Added Imports

```diff
  import time
  import re
+ import json
  from typing import Dict, Any, Optional, Iterator, Tuple, Union
```

### Added Functions

```diff
+ def get_fallback_tool_summary(tool_name: str) -> str:
+     """
+     Get fallback summary for a tool that failed.
+     
+     Returns fallback text for each tool type.
+     """
+     fallbacks = {
+         "market_trends": "Market trends analysis unavailable...",
+         "competitors": "Competitor analysis unavailable...",
+         # ... etc for all 10 tools
+     }
+     return fallbacks.get(tool_name, f"{tool_name.replace('_', ' ').title()} analysis unavailable.")
+ 
+ def _validate_profile_data(profile_data: Dict[str, Any]) -> None:
+     """
+     Validate profile_data structure and content.
+     
+     Raises ValueError if invalid.
+     """
+     if not isinstance(profile_data, dict):
+         raise ValueError("profile_data must be a dictionary")
+     
+     # Validate field types
+     for field in ["goal_type", "time_commitment", ...]:
+         if field in profile_data and not isinstance(profile_data[field], str):
+             raise ValueError(f"{field} must be a string")
+     
+     # Validate founder_psychology
+     if "founder_psychology" in profile_data:
+         fp = profile_data["founder_psychology"]
+         if fp is not None and not isinstance(fp, dict):
+             raise ValueError("founder_psychology must be a dict")
```

### Enhanced Critical Tools Wait with Timeout

```diff
  # Wait for critical tools to complete
  critical_results = {}
  critical_tools_complete = False
  critical_start = time.time()
+ CRITICAL_TOOLS_TIMEOUT = 30.0  # Max 30 seconds to wait for critical tools
  
  while not critical_tools_complete:
+     # Check timeout
+     if time.time() - critical_start > CRITICAL_TOOLS_TIMEOUT:
+         current_app.logger.warning(
+             f"Critical tools timeout after {CRITICAL_TOOLS_TIMEOUT}s. "
+             f"Completed: {set(critical_results.keys())}, Missing: {CRITICAL_TOOLS - set(critical_results.keys())}"
+         )
+         # Use fallbacks for missing tools
+         for tool_name in CRITICAL_TOOLS:
+             if tool_name not in critical_results:
+                 fallback = get_fallback_tool_summary(tool_name)
+                 critical_results[tool_name] = fallback
+                 tool_results_full[tool_name] = f"Timeout: Tool did not complete within {CRITICAL_TOOLS_TIMEOUT}s"
+         break
+     
      critical_tools_complete = True
      for tool_name in CRITICAL_TOOLS:
          if tool_name not in critical_results:
              future = tool_futures.get(tool_name)
              if future and future.done():
                  try:
                      result = future.result()
                      critical_results[tool_name] = result
                      tool_results_full[tool_name] = result
                  except Exception as e:
                      error_msg = f"Error: {str(e)}"
                      critical_results[tool_name] = error_msg
                      tool_results_full[tool_name] = error_msg
+                     current_app.logger.warning(f"Critical tool {tool_name} failed: {e}")
              else:
                  critical_tools_complete = False
      
      if not critical_tools_complete:
          time.sleep(0.05)  # Small sleep to avoid busy-waiting
  
  critical_wait_time = time.time() - critical_start
- current_app.logger.info(f"Critical tools completed in {critical_wait_time:.2f}s, starting LLM call early")
+ current_app.logger.info(
+     f"Critical tools completed in {critical_wait_time:.2f}s, starting LLM call early. "
+     f"Tools ready: {list(critical_results.keys())}"
+ )
```

### Enhanced Tool Summarization with Fallbacks

```diff
  # Summarize critical tool results for prompt (with fallbacks for errors)
  tool_results_summarized = {}
- for tool_name, full_result in critical_results.items():
-     tool_results_summarized[tool_name] = summarize_tool_output(full_result, target_tokens=100)
+ for tool_name in CRITICAL_TOOLS:
+     full_result = critical_results.get(tool_name, "")
+     if full_result and not full_result.startswith("Error:"):
+         tool_results_summarized[tool_name] = summarize_tool_output(full_result, target_tokens=100)
+     else:
+         # Use fallback summary for failed tools
+         fallback = get_fallback_tool_summary(tool_name)
+         tool_results_summarized[tool_name] = fallback
+         current_app.logger.warning(f"Tool {tool_name} failed, using fallback summary")
```

### Enhanced Non-Critical Tools with Fallbacks

```diff
  for tool_name in non_critical_tools:
      future = tool_futures.get(tool_name)
      if future:
          try:
              full_result = future.result(timeout=30)  # Wait up to 30s for non-critical tools
              tool_results_summarized[tool_name] = summarize_tool_output(full_result, target_tokens=100)
              tool_results_full[tool_name] = full_result
          except Exception as e:
-             error_msg = f"Error: {str(e)}"
-             tool_results_summarized[tool_name] = summarize_tool_output(error_msg, target_tokens=100)
-             tool_results_full[tool_name] = error_msg
+             # Use fallback summary for failed non-critical tools
+             fallback = get_fallback_tool_summary(tool_name)
+             tool_results_summarized[tool_name] = fallback
+             tool_results_full[tool_name] = f"Error: {str(e)}"
+             current_app.logger.warning(f"Non-critical tool {tool_name} failed: {e}, using fallback summary")
```

### Enhanced Streaming with Heartbeats

```diff
  if stream:
      # TRUE streaming: yield chunks immediately as they arrive from OpenAI
      # Accumulate full response in background for post-processing
      response_chunks = []
+     last_heartbeat = time.time()
+     HEARTBEAT_INTERVAL = 15.0  # Send heartbeat every 15 seconds for long responses
+     
      chunk_generator = generate_unified_response(...)
      
      try:
          for chunk in chunk_generator:
              # Accumulate for full response (post-processing)
              response_chunks.append(chunk)
              # Update metadata with current time
              metadata["llm_time"] = time.time() - llm_start
              
+             # Send heartbeat if needed (for long responses)
+             current_time = time.time()
+             if current_time - last_heartbeat >= HEARTBEAT_INTERVAL:
+                 yield ("__HEARTBEAT__", metadata)
+                 last_heartbeat = current_time
+             
              # Yield chunk immediately - TRUE streaming, no buffering
              yield (chunk, metadata)
      except Exception as e:
-         current_app.logger.error(f"Error during streaming: {e}")
+         # Log structured error
+         error_info = {
+             "error_type": type(e).__name__,
+             "error_message": str(e),
+             "tool_precompute_time": metadata.get("tool_precompute_time", 0),
+             "llm_time": time.time() - llm_start,
+             "total_time": time.time() - start_time,
+         }
+         current_app.logger.error(
+             f"Error during streaming: {json.dumps(error_info)}",
+             exc_info=True
+         )
          # Re-raise to be handled by caller (will send SSE error event)
          raise
```

### Added Input Validation

```diff
  start_time = time.time()
  metadata = {...}
  
+ # Validate profile_data structure
+ try:
+     _validate_profile_data(profile_data)
+ except ValueError as e:
+     current_app.logger.error(f"Invalid profile_data: {e}")
+     raise
  
  # Check cache first
  if use_cache and not cache_bypass:
```

### Added Cache Bypass Parameter

```diff
  def run_unified_discovery(
      profile_data: Dict[str, Any],
      use_cache: bool = True,
      stream: bool = False,
+     cache_bypass: bool = False,
  ) -> Union[Tuple[Dict[str, str], Dict[str, Any]], Iterator[Tuple[str, Dict[str, Any]]]]:
      """
      Run unified Discovery pipeline with early LLM execution.
      
      Args:
          profile_data: User profile data including all fields + founder_psychology
          use_cache: Whether to check cache first
          stream: If True, yields chunks as they arrive; if False, returns complete result
+         cache_bypass: If True, bypass cache (for debugging)
```

---

## FILE: `src/startup_idea_crew/unified_prompt.py`

### Added Sanitization Function

```diff
+ import re
  from typing import Dict, Any

+ def _sanitize_tool_result(text: str) -> str:
+     """
+     Sanitize tool result for prompt inclusion.
+     
+     - Removes excessive whitespace
+     - Cleans invalid markdown
+     - Truncates if too long
+     - Preserves key information
+     """
+     if not text:
+         return ""
+     
+     # Remove excessive whitespace (multiple newlines → single newline)
+     text = re.sub(r'\n{3,}', '\n\n', text)
+     
+     # Remove leading/trailing whitespace from each line
+     lines = [line.strip() for line in text.split('\n')]
+     text = '\n'.join(lines)
+     
+     # Remove invalid markdown patterns
+     text = re.sub(r'\[([^\]]+)\]\(\)', r'\1', text)  # Remove empty links
+     
+     # Collapse multiple spaces to single space
+     text = re.sub(r' {2,}', ' ', text)
+     
+     return text.strip()
```

### Deterministic Tool Ordering

```diff
  # Format tool results for prompt (deterministic order)
  tool_results_text = ""
  if tool_results:
      tool_sections = []
-     for tool_name, result in tool_results.items():
+     # Sort tool names for deterministic ordering
+     sorted_tool_names = sorted(tool_results.keys())
+     for tool_name in sorted_tool_names:
+         result = tool_results[tool_name]
+         # Sanitize result: remove excessive whitespace, clean markdown
+         result = _sanitize_tool_result(result)
          tool_display_name = tool_name.replace("_", " ").title()
          tool_sections.append(f"### {tool_display_name} Results\n{result}\n")
```

### Deterministic Psychology Ordering

```diff
  # Format founder psychology for prompt (deterministic order)
  psychology_text = ""
  if founder_psychology:
-     psychology_parts = []
-     if founder_psychology.get("motivation_primary"):
-         psychology_parts.append(f"Primary Motivation: {founder_psychology.get('motivation_primary')}")
-     if founder_psychology.get("motivation_secondary"):
-         psychology_parts.append(f"Secondary Motivation: {founder_psychology.get('motivation_secondary')}")
-     # ... etc (order depends on dict iteration)
+     # Define order for deterministic output
+     psychology_fields = [
+         ("motivation_primary", "Primary Motivation"),
+         ("motivation_secondary", "Secondary Motivation"),
+         ("biggest_fear", "Biggest Fear"),
+         ("decision_style", "Decision Style"),
+         ("energy_pattern", "Energy Pattern"),
+         ("constraints", "Constraints"),
+         ("success_definition", "Success Definition"),
+     ]
+     
+     psychology_parts = []
+     for field_key, field_label in psychology_fields:
+         value = founder_psychology.get(field_key)
+         if value:
+             # Sanitize value (trim, normalize whitespace)
+             value_str = str(value).strip()
+             value_str = ' '.join(value_str.split())  # Normalize whitespace
+             psychology_parts.append(f"{field_label}: {value_str}")
+     
+     if psychology_parts:
+         psychology_text = "\n".join(psychology_parts)
```

---

## FILE: `app/routes/discovery.py`

### Added Cache Bypass Support

```diff
          # Check if streaming is requested
          stream_requested = request.args.get('stream', 'false').lower() == 'true'
+         
+         # Check for cache bypass (debugging)
+         cache_bypass = request.args.get('cache_bypass', 'false').lower() == 'true'
          
          # Run unified Discovery pipeline
          try:
              # If streaming requested, handle streaming path
              if stream_requested:
                  return _stream_discovery_response_live(
                      run_unified_discovery(
                          profile_data=payload, 
                          use_cache=True, 
                          stream=True,
+                         cache_bypass=cache_bypass
                      ),
                      payload, user, session, discovery_start_time
                  )
              
              # Non-streaming path
              outputs, metadata = run_unified_discovery(
                  profile_data=payload,
                  use_cache=True,
                  stream=False,
+                 cache_bypass=cache_bypass,
              )
```

### Enhanced SSE Error Handling

```diff
          try:
              # Stream chunks immediately as they arrive (TRUE streaming)
              for chunk, chunk_metadata in chunk_iterator:
                  # Check if this is the final metadata message
                  if chunk is None and chunk_metadata.get("final"):
                      outputs = chunk_metadata.get("outputs")
                      metadata = chunk_metadata.get("metadata", {})
                      break
                  
+                 # Handle heartbeat
+                 if chunk == "__HEARTBEAT__":
+                     yield f"data: {json.dumps({'event': 'heartbeat', 'metadata': chunk_metadata})}\n\n"
+                     continue
+                 
                  # Regular chunk - accumulate and stream immediately
                  if chunk:
                      full_response += chunk
                      metadata = chunk_metadata
                      
                      # Yield chunk immediately as SSE event (TRUE streaming)
                      yield f"data: {json.dumps({'event': 'delta', 'text': chunk})}\n\n"
          
          except Exception as e:
-             current_app.logger.error(f"Error during streaming: {e}")
-             yield f"data: {json.dumps({'event': 'error', 'error': str(e)})}\n\n"
+             # Log structured error
+             error_info = {
+                 "error_type": type(e).__name__,
+                 "error_message": str(e),
+                 "timestamp": time.time(),
+             }
+             current_app.logger.error(
+                 f"Error during streaming: {json.dumps(error_info)}",
+                 exc_info=True
+             )
+             # Send SSE error event immediately
+             yield f"data: {json.dumps({'event': 'error', 'error': str(e), 'error_type': type(e).__name__})}\n\n"
              return
```

---

## NEW FILE: `tests/integration/test_unified_discovery_streaming.py`

**Purpose:** Comprehensive integration tests for streaming, cache, and error handling.

**Tests:**
1. `test_streaming_events_format` - Validates SSE event format
2. `test_streaming_chunks_arrive_immediately` - Verifies no buffering
3. `test_cache_hit_skips_streaming` - Cache hit behavior
4. `test_cache_bypass_mode` - Cache bypass functionality
5. `test_tool_failure_fallback` - Tool failure handling
6. `test_prompt_deterministic_ordering` - Prompt consistency
7. `test_cache_key_normalization` - Cache key correctness
8. `test_error_handling_sends_sse_error` - Error event handling

---

## SUMMARY OF IMPROVEMENTS

### Quality
- ✅ Deterministic prompt generation
- ✅ Input validation
- ✅ Tool result sanitization
- ✅ Comprehensive error handling

### Stability
- ✅ Tool failure fallbacks
- ✅ Timeout protection
- ✅ Safe generator termination
- ✅ Partial result protection

### Performance
- ✅ TRUE streaming (no buffering)
- ✅ Heartbeats for long responses
- ✅ Enhanced cache normalization
- ✅ Early LLM execution maintained

### Observability
- ✅ Detailed cache logging
- ✅ Structured error logging
- ✅ Performance metrics tracking
- ✅ Cache bypass for debugging

---

**END OF DIFFS**


