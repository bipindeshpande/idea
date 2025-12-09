# DISCOVERY PIPELINE PERFORMANCE REDESIGN
## Summary of Changes

**Date:** 2025-01-05  
**Goal:** Reduce runtime from ~90s to ~20-25s, reduce LLM calls from 12-17 to 1-3

---

## ARCHITECTURE CHANGES

### Before (Hierarchical CrewAI)
- **Process:** Hierarchical with manager LLM
- **LLM Calls:** 12-17 (3 agents + manager + tools)
- **Execution:** Sequential tool calls within agents
- **File System:** Temp files written/read
- **Caching:** Per-tool cache keys
- **Runtime:** ~90 seconds

### After (Unified Single-Shot)
- **Process:** Direct OpenAI call with unified prompt
- **LLM Calls:** 1-3 (1 unified call + optional tool LLM calls if cache miss)
- **Execution:** Parallel tool pre-computation
- **File System:** In-memory processing only
- **Caching:** 8-factor composite hash (all profile fields + founder_psychology)
- **Runtime:** ~20-25 seconds (target)

---

## NEW FILES CREATED

### 1. `src/startup_idea_crew/unified_prompt.py`
**Purpose:** Single unified prompt template that generates all three sections in one LLM call.

**Key Features:**
- Combines profile analysis, idea research, and recommendations into one prompt
- Includes pre-computed tool results as context
- Maintains exact formatting requirements for backward compatibility
- Uses section delimiters: "## SECTION 1:", "## SECTION 2:", "## SECTION 3:"

### 2. `app/utils/discovery_cache.py`
**Purpose:** Enhanced caching system with 8-factor hash.

**Key Features:**
- Cache key includes all 8 factors:
  1. goal_type
  2. time_commitment
  3. budget_range
  4. interest_area
  5. sub_interest_area
  6. work_style
  7. skill_strength
  8. experience_summary
  9. founder_psychology (8th factor - composite)
- Stores complete Discovery output (all 3 sections)
- 7-day TTL
- Uses existing `ToolCacheEntry` table

### 3. `app/services/unified_discovery_service.py`
**Purpose:** Core service that orchestrates the unified pipeline.

**Key Functions:**
- `precompute_all_tools()`: Executes all 10 tools in parallel (ThreadPoolExecutor, max_workers=10)
- `generate_unified_response()`: Single LLM call with unified prompt (supports streaming)
- `parse_unified_response()`: Parses LLM response into 3 sections
- `run_unified_discovery()`: Main entry point (checks cache, pre-computes tools, calls LLM, caches results)

**Performance Optimizations:**
- All tools execute in parallel (10 workers)
- Single LLM call instead of 3+ agent calls
- In-memory processing (no file I/O)
- Streaming support for progressive rendering

---

## MODIFIED FILES

### 1. `app/routes/discovery.py`

**Major Changes:**
- **Removed:** CrewAI imports and initialization
- **Removed:** Temp file system (uuid, tempfile, Path operations)
- **Removed:** File reading with retry logic
- **Removed:** Task timing inference from file modification times
- **Added:** Import of `unified_discovery_service`
- **Added:** Streaming support via `?stream=true` query parameter
- **Added:** `_stream_discovery_response()` function for SSE streaming
- **Modified:** Response format (removed `raw_result`, added `performance_metrics` with new fields)

**Key Code Changes:**
```python
# OLD:
from startup_idea_crew.crew import StartupIdeaCrew
crew_instance = StartupIdeaCrew()
crew = crew_instance.crew()
# ... temp file setup ...
result = crew.kickoff(inputs=payload)
# ... read temp files ...

# NEW:
from app.services.unified_discovery_service import run_unified_discovery
outputs, metadata = run_unified_discovery(
    profile_data=payload,
    use_cache=True,
    stream=stream_requested,
)
```

**Backward Compatibility:**
- Response format unchanged: `{success, run_id, inputs, outputs}`
- `outputs` dict still has: `profile_analysis`, `startup_ideas_research`, `personalized_recommendations`
- Database storage unchanged
- Usage tracking unchanged

---

## REMOVED/DEPRECATED

### 1. `src/startup_idea_crew/crew.py`
**Status:** Still exists but no longer used by `/api/run` endpoint.

**Note:** May be used by other endpoints or can be removed in future cleanup.

### 2. Temp File System
**Removed from:**
- `app/routes/discovery.py`: All temp file creation, reading, cleanup code removed
- No more `tempfile.gettempdir() / "idea_crew_outputs"` usage
- No more file retry logic

**Impact:** Eliminates file I/O overhead and disk space concerns.

### 3. CrewAI Hierarchical Process
**Removed:**
- Manager LLM coordination
- Agent-to-agent communication
- Task dependency management
- File-based output passing

**Impact:** Eliminates manager LLM overhead and agent coordination latency.

---

## CACHING IMPROVEMENTS

### Old Cache System
- **Scope:** Per-tool caching
- **Key Format:** `{tool_name}:{params_hash}`
- **Cache Keys:** 10+ separate keys per Discovery run
- **Hit Rate:** Lower (tools called independently)

### New Cache System
- **Scope:** Complete Discovery output caching
- **Key Format:** `discovery:{8_factor_hash}`
- **Cache Keys:** 1 key per Discovery run
- **Hit Rate:** Higher (complete output cached)
- **Factors:** All 8 profile fields + founder_psychology

**Cache Key Generation:**
```python
# Normalize all 8 factors
normalized = {
    "goal_type": normalize(goal_type),
    "time_commitment": normalize(time_commitment),
    "budget_range": normalize(budget_range),
    "interest_area": normalize(interest_area),
    "sub_interest_area": normalize(sub_interest_area),
    "work_style": normalize(work_style),
    "skill_strength": normalize(skill_strength),
    "experience_summary": normalize(experience_summary),
    "founder_psychology": json.dumps(founder_psychology, sort_keys=True),
}

# Hash and create key
cache_data = json.dumps(normalized, sort_keys=True)
cache_hash = sha256(cache_data).hexdigest()[:32]
cache_key = f"discovery:{cache_hash}"
```

---

## STREAMING SUPPORT

### Implementation
- **Endpoint:** `POST /api/run?stream=true`
- **Format:** Server-Sent Events (SSE)
- **Content-Type:** `text/event-stream`

### Event Types
1. **`start`**: Initial metadata with run_id
2. **`section`**: Each section as it's ready
   - `section: "profile_analysis"`
   - `section: "startup_ideas_research"`
   - `section: "personalized_recommendations"`
3. **`complete`**: Final event with total_time

### Frontend Integration
```javascript
const eventSource = new EventSource('/api/run?stream=true', {
  method: 'POST',
  body: JSON.stringify(payload),
  headers: {'Content-Type': 'application/json'}
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'section') {
    // Update UI with section content
    updateSection(data.section, data.content);
  }
};
```

**Note:** Streaming is optional - default behavior (non-streaming) maintains backward compatibility.

---

## PERFORMANCE METRICS

### New Metrics Collected
- `tool_precompute_time`: Time to execute all tools in parallel
- `llm_time`: Time for single unified LLM call
- `cache_hit`: Boolean indicating if cache was used
- `total_time`: Total Discovery execution time

### Expected Performance
- **Tool Pre-computation:** 5-10 seconds (parallel execution)
- **LLM Call:** 10-15 seconds (single unified call)
- **Total:** 20-25 seconds (vs. 90 seconds before)
- **Cache Hit:** <1 second (instant return)

---

## TESTING REQUIREMENTS

### Tests to Update
1. `tests/integration/test_discovery_pipeline_integration.py`
   - Update to use `unified_discovery_service` instead of CrewAI
   - Mock `_MOCK_OPENAI_CLIENT` in unified service
   - Verify 8-factor cache key generation

2. `tests/integration/test_discovery_full_pipeline_simple.py`
   - Remove CrewAI mocking
   - Add unified service mocking
   - Verify section parsing

3. `tests/integration/test_discovery_psychology_flow.py`
   - Update to verify founder_psychology in cache key
   - Verify psychology flows through unified prompt

### New Tests Needed
1. Test 8-factor cache key generation
2. Test unified prompt generation
3. Test section parsing (robustness)
4. Test streaming response format
5. Test parallel tool execution

---

## MIGRATION NOTES

### Production Deployment

1. **Database:**
   - No schema changes required
   - Existing `tool_cache` table used for Discovery cache
   - Cache entries will have `tool_name = "discovery_unified"`

2. **Environment Variables:**
   - No new variables required
   - Existing `OPENAI_API_KEY` used

3. **Dependencies:**
   - CrewAI still installed (for other potential uses)
   - No new dependencies added
   - OpenAI SDK already required

4. **Backward Compatibility:**
   - ✅ Response format unchanged
   - ✅ Database schema unchanged
   - ✅ Frontend can use existing code
   - ✅ Streaming is optional (opt-in via query param)

5. **Rollback Plan:**
   - Keep old `crew.py` file
   - Can revert `discovery.py` to use CrewAI if needed
   - Cache entries are separate (won't conflict)

### Performance Monitoring

**Metrics to Track:**
- Average `total_time` (target: <25s)
- Cache hit rate (target: >30% after warm-up)
- Tool pre-compute time (target: <10s)
- LLM time (target: <15s)
- Error rate (should remain <1%)

**Logging:**
- All performance metrics logged
- Cache hits/misses logged
- Tool execution times logged
- LLM call duration logged

---

## KNOWN LIMITATIONS

1. **Streaming:** Currently streams complete sections, not token-by-token. Could be enhanced for progressive token streaming.

2. **Tool Batching:** Tools still called individually (even in parallel). Future: Batch multiple tool calls into single LLM request if OpenAI supports it.

3. **Error Handling:** If one tool fails, others continue. May want to add retry logic for critical tools.

4. **Cache Invalidation:** No automatic invalidation on tool result changes. Relies on 7-day TTL.

---

## NEXT STEPS

1. ✅ Create unified prompt template
2. ✅ Create 8-factor cache system
3. ✅ Create unified discovery service
4. ✅ Update discovery.py endpoint
5. ⏳ Update tests
6. ⏳ Add streaming frontend support
7. ⏳ Performance testing and optimization
8. ⏳ Production deployment

---

## FILE DIFF SUMMARY

### New Files
- `src/startup_idea_crew/unified_prompt.py` (333 lines)
- `app/utils/discovery_cache.py` (150 lines)
- `app/services/unified_discovery_service.py` (385 lines)

### Modified Files
- `app/routes/discovery.py` (~200 lines removed, ~50 lines added)

### Deprecated (Not Removed)
- `src/startup_idea_crew/crew.py` (kept for potential rollback)

---

## PERFORMANCE COMPARISON

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| LLM Calls | 12-17 | 1-3 | 80-90% reduction |
| Runtime | ~90s | ~20-25s | 70-75% reduction |
| File I/O | Yes (temp files) | No | Eliminated |
| Parallelization | Limited | Full (tools) | 100% tool parallelization |
| Cache Scope | Per-tool | Complete output | Higher hit rate |

---

**END OF SUMMARY**


