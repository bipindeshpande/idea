# MIGRATION GUIDE: Discovery Pipeline Performance Redesign

**Version:** 2.0 (Unified Architecture)  
**Date:** 2025-01-05  
**Migration Type:** Backward Compatible (No Breaking Changes)

---

## OVERVIEW

This migration replaces the hierarchical CrewAI-based Discovery pipeline with a unified single-shot architecture. The change is **backward compatible** - the API response format remains identical, and no frontend changes are required.

---

## WHAT CHANGED

### Architecture
- **Before:** Hierarchical CrewAI (3 agents, manager LLM, sequential tool calls)
- **After:** Unified single LLM call with parallel tool pre-computation

### Performance
- **Before:** ~90 seconds, 12-17 LLM calls
- **After:** ~20-25 seconds, 1-3 LLM calls

### Caching
- **Before:** Per-tool caching (10+ cache keys per run)
- **After:** Complete output caching (1 cache key per run, 8-factor hash)

### File System
- **Before:** Temp files written/read
- **After:** In-memory processing only

---

## DEPLOYMENT STEPS

### 1. Pre-Deployment Checklist

- [ ] Backup database
- [ ] Review new code files
- [ ] Test in staging environment
- [ ] Verify OpenAI API key is configured
- [ ] Check disk space (no longer needed for temp files)

### 2. Code Deployment

**Files to Deploy:**
- `src/startup_idea_crew/unified_prompt.py` (NEW)
- `app/utils/discovery_cache.py` (NEW)
- `app/services/unified_discovery_service.py` (NEW)
- `app/routes/discovery.py` (MODIFIED)

**Files to Keep (for rollback):**
- `src/startup_idea_crew/crew.py` (deprecated but kept)

### 3. Database Changes

**No schema changes required.** The new cache system uses the existing `tool_cache` table with:
- `tool_name = "discovery_unified"`
- `cache_key = "discovery:{hash}"`

### 4. Environment Variables

**No new variables required.** Uses existing:
- `OPENAI_API_KEY` (required)

### 5. Dependencies

**No new dependencies.** Existing dependencies sufficient:
- `openai` (already required)
- `flask` (already required)
- `concurrent.futures` (standard library)

**Note:** CrewAI is still installed but no longer used by `/api/run` endpoint.

---

## TESTING IN PRODUCTION

### Smoke Tests

1. **Basic Discovery Request:**
   ```bash
   curl -X POST http://your-domain/api/run \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "goal_type": "Extra Income",
       "time_commitment": "<5 hrs/week",
       "interest_area": "AI / Automation"
     }'
   ```

2. **Verify Response Format:**
   - Check `success: true`
   - Check `outputs.profile_analysis` exists
   - Check `outputs.startup_ideas_research` exists
   - Check `outputs.personalized_recommendations` exists

3. **Check Performance:**
   - Response time should be 20-30 seconds (vs. 90s before)
   - Check `performance_metrics.total_duration_seconds` in response

### Cache Testing

1. **First Request:** Should be cache miss (slower)
2. **Second Request (same inputs):** Should be cache hit (<1 second)
3. **Check Logs:** Look for "Discovery cache hit" messages

### Streaming Test

```bash
curl -X POST "http://your-domain/api/run?stream=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}' \
  --no-buffer
```

Should receive SSE events:
- `type: start`
- `type: section` (3 times)
- `type: complete`

---

## MONITORING

### Key Metrics to Watch

1. **Response Times:**
   - Target: <25 seconds (p95)
   - Alert if: >40 seconds

2. **Cache Hit Rate:**
   - Target: >30% after warm-up
   - Monitor: `performance_metrics.cache_hit` in logs

3. **Error Rate:**
   - Target: <1%
   - Alert if: >5%

4. **Tool Pre-compute Time:**
   - Target: <10 seconds
   - Monitor: `performance_metrics.tool_precompute_time`

5. **LLM Time:**
   - Target: <15 seconds
   - Monitor: `performance_metrics.llm_time`

### Log Messages to Monitor

**Success Indicators:**
- `"Unified Discovery completed in X.XXs"`
- `"Discovery cache hit - returning cached results"`
- `"Pre-computed X tools in X.XX seconds"`

**Warning Indicators:**
- `"Failed to parse section: X"`
- `"Tool X failed: ..."`
- `"Discovery cache storage failed"`

**Error Indicators:**
- `"Discovery timed out"`
- `"Discovery failed after X.XX seconds"`
- `"No valid results generated"`

---

## ROLLBACK PROCEDURE

If issues occur, rollback is straightforward:

### Quick Rollback (5 minutes)

1. **Revert `app/routes/discovery.py`:**
   ```bash
   git checkout HEAD~1 app/routes/discovery.py
   ```

2. **Restart application:**
   ```bash
   # Your deployment process
   ```

3. **Verify:**
   - Old CrewAI flow should work
   - Temp files will be created again
   - Performance returns to ~90s

### Full Rollback (if needed)

1. Remove new files:
   - `src/startup_idea_crew/unified_prompt.py`
   - `app/utils/discovery_cache.py`
   - `app/services/unified_discovery_service.py`

2. Restore old `discovery.py`

3. Restart application

**Note:** Cache entries in database are harmless - they won't interfere with old code.

---

## POST-MIGRATION CLEANUP

### After 1 Week (if stable)

1. **Remove deprecated code:**
   - `src/startup_idea_crew/crew.py` (if not used elsewhere)
   - Old temp file cleanup code (already removed)

2. **Clean up old cache entries:**
   ```sql
   -- Optional: Clean up old per-tool cache entries
   DELETE FROM tool_cache 
   WHERE tool_name != 'discovery_unified' 
   AND created_at < NOW() - INTERVAL '30 days';
   ```

3. **Update documentation:**
   - Remove references to CrewAI hierarchical process
   - Update architecture diagrams

---

## TROUBLESHOOTING

### Issue: Slow Performance (>40s)

**Possible Causes:**
1. Tool pre-computation taking too long
   - Check: `performance_metrics.tool_precompute_time`
   - Solution: Verify tool caching is working

2. LLM call taking too long
   - Check: `performance_metrics.llm_time`
   - Solution: May need to reduce `max_tokens` or simplify prompt

3. Network latency
   - Check: OpenAI API response times
   - Solution: Verify API key and region settings

### Issue: Missing Sections in Output

**Possible Causes:**
1. LLM didn't follow format
   - Check: Logs for parsing warnings
   - Solution: Prompt may need refinement

2. Parsing logic failed
   - Check: `"Failed to parse section: X"` in logs
   - Solution: Review `parse_unified_response()` function

### Issue: Cache Not Working

**Possible Causes:**
1. Database connection issues
   - Check: Database logs
   - Solution: Verify database connectivity

2. Cache key generation issue
   - Check: `discovery_cache.py` logs
   - Solution: Verify 8-factor hash generation

### Issue: Streaming Not Working

**Possible Causes:**
1. Frontend not handling SSE
   - Check: Browser console for errors
   - Solution: Verify EventSource implementation

2. Nginx/proxy buffering
   - Check: `X-Accel-Buffering: no` header
   - Solution: Configure proxy to not buffer SSE

---

## PERFORMANCE TUNING

### If Still Too Slow

1. **Reduce LLM max_tokens:**
   - Current: 4000
   - Try: 3000 (may reduce quality)

2. **Increase tool cache TTL:**
   - Current: 7 days
   - Try: 14 days (more cache hits)

3. **Optimize tool execution:**
   - Review slow tools
   - Consider skipping non-critical tools

4. **Use faster LLM model:**
   - Current: `gpt-4o-mini`
   - Alternative: `gpt-3.5-turbo` (faster but lower quality)

### If Cache Hit Rate Too Low

1. **Normalize inputs more aggressively:**
   - Trim whitespace
   - Lowercase comparison
   - Remove punctuation variations

2. **Increase cache TTL:**
   - Current: 7 days
   - Try: 14-30 days

3. **Review cache key generation:**
   - Ensure consistent normalization
   - Check for unnecessary variations

---

## SUPPORT

For issues or questions:
1. Check logs: `app.log` or application logs
2. Review metrics: `performance_metrics` in response
3. Check cache: Database `tool_cache` table
4. Contact: [Your support channel]

---

## APPENDIX: File Locations

### New Files
- `src/startup_idea_crew/unified_prompt.py`
- `app/utils/discovery_cache.py`
- `app/services/unified_discovery_service.py`

### Modified Files
- `app/routes/discovery.py`

### Deprecated (Kept for Rollback)
- `src/startup_idea_crew/crew.py`

---

**END OF MIGRATION GUIDE**


