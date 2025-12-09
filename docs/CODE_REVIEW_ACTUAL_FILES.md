# Discovery Pipeline - Actual Code Files for Review

This document contains the **actual code** from the most critical files that need performance review.

---

## File 1: `app/services/unified_discovery_service.py`

### Critical Function 1: `precompute_all_tools()` (Lines 515-816)

```python
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
```

**🚨 PERFORMANCE ISSUES TO CHECK:**
1. ✅ Tools ARE running in parallel (ThreadPoolExecutor)
2. ❓ Are static blocks being loaded correctly?
3. ❓ Is cache lookup fast enough?
4. ❓ Are there blocking database operations in cache storage?

---

### Critical Function 2: `run_unified_discovery_streaming()` (Lines 1180-1439)

**KEY ISSUE:** This function appears to use `StaticToolLoader.load()` instead of `precompute_all_tools()`. This might be the bottleneck!

```python
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
    
    # STAGE 1: Profile Analysis (NO TOOLS - just LLM)
    stage1_start = time.time()
    print(f"[PERF] run_unified_discovery_streaming: STAGE 1 START (Profile Analysis) at {stage1_start:.3f}")
    log_timing("run_unified_discovery_streaming", "stage1_start", timestamp=stage1_start)
    
    stage1_result = run_profile_analysis(profile_data)
    profile_analysis_json = stage1_result.get("profile_analysis", "")
    
    stage1_end = time.time()
    stage1_duration = stage1_end - stage1_start
    print(f"[PERF] run_unified_discovery_streaming: STAGE 1 END (Profile Analysis) at {stage1_end:.3f} - Duration: {stage1_duration:.3f}s")
    log_timing("run_unified_discovery_streaming", "stage1_end",
              timestamp=stage1_end,
              duration=stage1_duration)
    
    # Yield Stage 1 result
    yield (profile_analysis_json, metadata)
    
    # STAGE 2: Idea Research (with cached static tools)
    stage2_start = time.time()
    print(f"[PERF] run_unified_discovery_streaming: STAGE 2 START (Idea Research) at {stage2_start:.3f}")
    log_timing("run_unified_discovery_streaming", "stage2_start", timestamp=stage2_start)
    
    # Extract interest_area for static tool loading
    interest_area = profile_data.get("interest_area", "")
    
    # ⚠️ ISSUE: Using StaticToolLoader instead of precompute_all_tools()
    # This might be loading from files, not executing tools!
    tool_start = time.time()
    print(f"[PERF] run_unified_discovery_streaming: Loading static tools at {tool_start:.3f}")
    tool_results = StaticToolLoader.load(interest_area)
    tool_complete = time.time()
    metadata["tool_precompute_time"] = tool_complete - tool_start
    print(f"[PERF] run_unified_discovery_streaming: Static tools loaded in {metadata['tool_precompute_time']:.3f}s ({len(tool_results)} tools)")
    
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
            max_tokens=3000,
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
            max_tokens=3000,
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
```

**🚨 CRITICAL ISSUES:**

1. **❌ Stage 1 and Stage 2 are SEQUENTIAL, not parallel!**
   - Stage 1 completes, THEN Stage 2 starts
   - Stage 2 should start AFTER Stage 1 starts, not after it completes

2. **❌ Using `StaticToolLoader.load()` instead of `precompute_all_tools()`**
   - This might be loading from static files, not executing tools
   - Should Stage 1 and tools run in parallel?

3. **❌ No parallel execution of Stage 1 and tools**
   - The code should use ThreadPoolExecutor to run Stage 1 and tool precomputation in parallel

---

### Critical Function 3: `run_profile_analysis()` (Lines 868-944)

```python
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
```

---

## File 2: `app/routes/discovery.py`

### Critical Function: `run_crew()` (Main Endpoint)

*[To be added - check the actual endpoint implementation]*

---

**🚨 CRITICAL FINDING:**

`StaticToolLoader.load()` loads from `static_data/{normalized}.json` files - this is just file I/O, should be instant (< 0.01s).

**If `static_data/` files don't exist, it returns empty dict `{}`, and tools should then be executed!**

---

## File 3: `app/services/static_tool_loader.py`

**FULL CODE:**

```python
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
```

**🚨 KEY FINDING:**

- Loads from `static_data/{normalized}.json` (e.g., `static_data/ai.json`)
- ✅ Files exist: `static_data/ai.json`, `static_data/fintech.json`
- Should be instant (< 0.01s) if file exists
- **ISSUE:** If file doesn't exist, returns empty dict `{}` - tools should be executed but code doesn't handle this!

---

## 🎯 Performance Review Checklist

### ✅ Check These Issues:

1. **Sequential Execution**
   - [ ] ❌ **CRITICAL:** Stage 1 and Stage 2 are SEQUENTIAL in `run_unified_discovery_streaming()`
   - [ ] ❌ Stage 1 should run in parallel with tool precomputation
   - [ ] ✅ Tools ARE running in parallel (ThreadPoolExecutor in `precompute_all_tools()`)

2. **Tool Execution**
   - [ ] ⚠️ **ISSUE:** Using `StaticToolLoader.load()` which loads from files, not executing tools
   - [ ] ❓ If `static_data/{normalized}.json` doesn't exist, tools are NOT executed!
   - [ ] ❓ Should `precompute_all_tools()` be called if `StaticToolLoader.load()` returns empty?

3. **Missing Parallel Execution**
   - [ ] ❌ **CRITICAL:** `run_unified_discovery_streaming()` doesn't use ThreadPoolExecutor for Stage 1 + tools
   - [ ] ❌ Stage 1 completes, THEN tools are loaded (should be parallel)

4. **Caching**
   - [ ] ✅ Cache is checked first (good)
   - [ ] ❓ Is cache lookup fast (database queries optimized)?

5. **LLM Calls**
   - [ ] ✅ Prompts are token-counted
   - [ ] ✅ Streaming is implemented

---

## 🚨 **ROOT CAUSE ANALYSIS**

### Issue #1: Sequential Execution
**Problem:** `run_unified_discovery_streaming()` runs Stage 1, THEN loads tools.

**Current Flow:**
```
1. Stage 1 (Profile Analysis) - ~15s
2. Wait for Stage 1 to complete
3. Load static tools (or execute tools) - ~30s
4. Stage 2 (Idea Research) - ~30s
Total: ~75-90s
```

**Should Be:**
```
1. Stage 1 (Profile Analysis) + Tool Precomputation in PARALLEL
   - Stage 1: ~15s
   - Tools: ~30s
   - Total: ~30s (longest of the two)
2. Stage 2 (Idea Research) - ~30s
Total: ~60s
```

### Issue #2: StaticToolLoader vs precompute_all_tools()
**Problem:** Code uses `StaticToolLoader.load()` which just reads files. If files don't exist, tools are NOT executed.

**Should check:**
1. Does `static_data/ai.json` exist?
2. If not, should call `precompute_all_tools()` to execute tools?

---

## 📝 Immediate Action Items

1. **Fix Sequential Execution**
   - Modify `run_unified_discovery_streaming()` to run Stage 1 and tool precomputation in parallel using ThreadPoolExecutor
   
2. **Fix Tool Execution Logic**
   - If `StaticToolLoader.load()` returns empty dict, call `precompute_all_tools()` to execute tools
   - Or always call `precompute_all_tools()` (it checks cache first)

3. **Verify static_data files exist**
   - Check if `static_data/ai.json` exists
   - If not, create them or ensure tools are executed

---

## 📂 Files to Review Next

1. **`app/services/unified_discovery_service.py`** - `run_unified_discovery_non_streaming()` - Does it have same issues?
2. **`app/routes/discovery.py`** - Full endpoint code
3. **Tool implementations** - Are individual tools slow?
4. **Cache implementations** - Are database queries optimized?

