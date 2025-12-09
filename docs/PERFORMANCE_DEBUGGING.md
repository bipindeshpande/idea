# Performance Debugging Guide

## Issue: Discovery Still Takes 90 Seconds

If the pipeline is still taking ~90 seconds after optimizations, check the following:

### 1. Check Performance Logs

Look for these log messages in your console:

```
[PERF] run_unified_discovery_streaming: PIPELINE START
[PERF] run_unified_discovery_streaming: STAGE 1 + TOOLS START (PARALLEL)
[PERF] run_unified_discovery_streaming: PARALLEL EXECUTION COMPLETE
[PERF] run_unified_discovery_streaming: STAGE 1 END - Duration: XX.XXXs
[PERF] run_unified_discovery_streaming: TOOLS loaded/precomputed - Duration: XX.XXXs
[PERF] run_unified_discovery_streaming: STAGE 2 START
[PERF] run_unified_discovery_streaming: LLM call COMPLETE
[PERF] run_unified_discovery_streaming: PIPELINE COMPLETE
```

**Key Questions:**
- Is "PARALLEL EXECUTION COMPLETE" showing? If not, parallel execution isn't working.
- What's the tool duration? Should be <1s if using static files, ~30s if executing tools.
- What's Stage 1 duration? Should be 12-15s.
- What's Stage 2 LLM duration? Should be 8-12s.

### 2. Verify Static Files Are Being Used

Look for this log message:
```
Using static tools from file for 'AI / Automation' (9 fields)
```

If you see this instead:
```
Static tools missing/empty for 'AI / Automation', executing tools (SLOW - will take ~30s)
```

Then tools are being executed, which is why it's slow.

### 3. Check if Tools Are Actually Executing

Look for these log messages:
```
[PERF] precompute_all_tools: Cache MISS - generating tools
[PERF] precompute_all_tools: Starting execution of X tools
[PERF] precompute_all_tools: Tool 'market_trends' START
```

If you see these, tools are being executed unnecessarily.

### 4. Common Issues

#### Issue A: Static Files Not Found
**Symptom:** Log shows "Static tools missing/empty"
**Fix:** 
- Verify `static_data/ai.json` exists
- Check filename normalization: `"AI / Automation"` → `"ai"`
- Verify file has at least 3 fields with content >10 chars

#### Issue B: Parallel Execution Not Working
**Symptom:** Stage 1 duration + Tool duration = Total parallel time (should be max of the two)
**Fix:** 
- Check that ThreadPoolExecutor is being used
- Verify both futures are submitted before calling .result()

#### Issue C: LLM Taking Too Long
**Symptom:** Stage 2 LLM duration > 30s
**Fix:**
- Check max_tokens (should be 2000, not 3000)
- Check prompt token count (should be < 2000 tokens)
- Verify compression is working (should be 100 chars per field)

### 5. Quick Diagnostic Command

Run this to verify static files are working:

```python
from app.services.static_tool_loader import StaticToolLoader
from app.services.unified_discovery_service import _ensure_all_tool_fields

result = StaticToolLoader.load('AI / Automation')
print(f"Static load: {len(result)} fields")
final = _ensure_all_tool_fields(result)
print(f"After ensure_all: {len(final)} fields")
print(f"All keys: {list(final.keys())}")
```

Expected output:
- Static load: 9 fields
- After ensure_all: 12 fields (adds defaults)
- All keys should include: costs, revenue, viability, persona, validation_questions

### 6. Expected Timings

After all optimizations:
- **Stage 1:** 12-15s (Profile Analysis LLM call)
- **Tools:** <1s (Static file load, parallel with Stage 1)
- **Stage 2:** 8-12s (Idea Research LLM call with reduced tokens)
- **Total:** 20-30s (not 90s!)

### 7. If Still 90 Seconds

Check the performance log breakdown:
- If tools are ~30s → Tools are being executed (static files not used)
- If Stage 1 + Stage 2 are ~45s → Normal LLM time (may need faster model)
- If overhead is high → Check for blocking operations or database queries

