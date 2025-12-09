# UNIFIED DISCOVERY PIPELINE AUDIT
## Performance Analysis & Optimization Plan

**Date:** 2025-01-05

---

## 🔍 AUDIT RESULTS

### 1. Unified Cache Hit Status

**Status:** ✅ **Cache is being checked, but may not be hitting effectively**

**Evidence:**
- Cache check occurs at line 378 in `unified_discovery_service.py`
- Cache key generation includes all 8 factors + founder_psychology
- Cache lookup uses `ToolCacheEntry.query.filter_by(cache_key=...)`

**Potential Issues:**
- Cache key normalization may be too strict (whitespace, case sensitivity)
- No logging of cache misses (only hits are logged)
- Cache lookup happens AFTER input validation, but could happen earlier

**Recommendation:**
- Add cache miss logging to track hit rate
- Verify cache key normalization handles edge cases (empty strings, None values)
- Consider moving cache check earlier in the flow

---

### 2. Exact Token Count of Unified Prompt

**Estimated Token Count:** **~3,500 - 5,500 tokens** (varies with inputs)

**Breakdown:**

| Component | Estimated Tokens | Notes |
|-----------|------------------|-------|
| Base prompt template | ~2,200 | Fixed instructions (330 lines) |
| User profile (8 fields) | ~150-300 | Variable based on experience_summary length |
| Founder psychology | ~50-100 | 7 fields, typically short |
| Tool results (10 tools) | ~800-2,000 | **LARGEST VARIABLE** - each tool can be 80-200 tokens |
| Domain research | ~200-500 | If available |
| System message | ~30 | Fixed |
| **TOTAL** | **~3,500 - 5,500** | **Highly variable based on tool results** |

**Critical Finding:**
- Tool results are the largest variable component
- If tool results are verbose, prompt can exceed 5,000 tokens
- Current `max_tokens=4000` for output may be insufficient if prompt is large

**Recommendation:**
- Add token counting utility to log actual prompt size
- Truncate tool results if they exceed a threshold (e.g., 200 tokens per tool)
- Consider summarizing tool results before including in prompt

---

### 3. Tool Precompute Blocking Execution

**Status:** ⚠️ **YES - Tool precompute is BLOCKING the LLM call**

**Evidence:**
```python
# Line 385-388 in unified_discovery_service.py
tool_start = time.time()
tool_results, tool_elapsed = precompute_all_tools(profile_data)  # BLOCKS HERE
metadata["tool_precompute_time"] = tool_elapsed

# LLM call only happens AFTER all tools complete
llm_start = time.time()
response_text = generate_unified_response(...)  # Line 403
```

**Impact:**
- All 10 tools must complete before LLM call starts
- If one tool is slow (5-10s), entire pipeline waits
- No overlap between tool execution and LLM call

**Current Flow:**
```
[Tool 1] ─┐
[Tool 2] ─┤
[Tool 3] ─┤
...       ├─→ [Wait for ALL] ─→ [LLM Call]
[Tool 10]─┘
```

**Optimization Opportunity:**
- Start LLM call as soon as critical tools complete (don't wait for all)
- Or: Start LLM call with partial tool results, stream updates

---

### 4. Model Call Streaming Mode

**Status:** ⚠️ **Streaming is IMPLEMENTED but NOT USED for progressive response**

**Evidence:**
```python
# Line 396-401 in unified_discovery_service.py
if stream:
    # For streaming, collect chunks
    response_chunks = []
    for chunk in generate_unified_response(..., stream=True):
        response_chunks.append(chunk)  # COLLECTS ALL CHUNKS
    response_text = "".join(response_chunks)  # WAITS FOR COMPLETE RESPONSE
else:
    response_text = generate_unified_response(..., stream=False)
```

**Problem:**
- When `stream=True`, code still collects ALL chunks before returning
- No progressive response to user
- Streaming provides no latency benefit (still waits for complete response)

**Current Behavior:**
- `stream=True`: Collects all chunks, then returns complete response
- `stream=False`: Returns complete response directly
- **Result: Same latency for both modes**

**Recommendation:**
- Fix streaming to yield chunks as they arrive (progressive response)
- Or: Remove streaming parameter if not being used

---

### 5. Max Tokens Larger Than Needed

**Status:** ⚠️ **Likely TOO LARGE - May be causing unnecessary latency**

**Current Setting:**
- `max_tokens=4000` (line 229, 245 in unified_discovery_service.py)

**Expected Output Size:**
- Section 1 (Profile Analysis): 600-800 words ≈ 800-1,100 tokens
- Section 2 (Idea Research): 800-1,000 words ≈ 1,100-1,400 tokens
- Section 3 (Recommendations): 800-1,000 words ≈ 1,100-1,400 tokens
- **Total Expected: ~3,000-3,900 tokens**

**Analysis:**
- `max_tokens=4000` is close to expected output
- However, if actual output is ~3,000 tokens, setting to 4000 may cause:
  - Slower generation (model generates more tokens than needed)
  - Higher costs
  - No latency benefit (model stops when done anyway)

**Recommendation:**
- Measure actual output token count
- Set `max_tokens` to expected output + 10% buffer (e.g., 3,500)
- Or: Use dynamic max_tokens based on prompt size

---

## 📊 PERFORMANCE BOTTLENECKS IDENTIFIED

### Critical Issues (High Impact)

1. **Tool Precompute Blocking** ⚠️
   - Impact: 5-10 seconds of blocking
   - Fix: Start LLM call with partial tool results

2. **Large Prompt Size** ⚠️
   - Impact: Slower LLM processing, higher costs
   - Fix: Truncate/summarize tool results

3. **Streaming Not Used** ⚠️
   - Impact: No progressive response benefit
   - Fix: Implement true streaming (or remove)

### Medium Issues

4. **Max Tokens Possibly Too Large**
   - Impact: Minor latency increase
   - Fix: Measure and optimize

5. **Cache Hit Rate Unknown**
   - Impact: May be missing cache hits
   - Fix: Add logging and monitoring

---

## 🚀 OPTIMIZATION PLAN: Reduce Cold-Start Latency by 20-30%

**Target:** Reduce from ~20-25s to ~14-20s (20-30% improvement)

**Constraints:**
- ❌ Cannot split into multiple LLM calls
- ❌ Cannot remove sections
- ❌ Cannot remove psychology personalization
- ❌ Cannot change output format

---

### OPTIMIZATION 1: Parallel Tool Execution + LLM Call Overlap ⭐ **HIGHEST IMPACT**

**Current:** Tools complete → LLM call starts
**Optimized:** Critical tools complete → LLM call starts (non-critical tools continue in background)

**Implementation:**
```python
# Start LLM call as soon as critical tools (5-6 tools) complete
# Don't wait for all 10 tools

critical_tools = ["market_trends", "competitors", "risks", "persona", "validation"]
non_critical_tools = ["market_size", "costs", "revenue", "viability", "validation_questions"]

# Execute all tools in parallel
# Start LLM call when critical tools complete
# Include partial tool results in prompt
```

**Expected Savings:** 3-5 seconds (15-25% improvement)

**Risk:** Low - non-critical tools can be added to prompt later if needed

---

### OPTIMIZATION 2: Truncate Tool Results in Prompt ⭐ **HIGH IMPACT**

**Current:** Full tool results included (800-2,000 tokens)
**Optimized:** Summarize/truncate tool results to 100-150 tokens each

**Implementation:**
```python
def truncate_tool_result(result: str, max_tokens: int = 150) -> str:
    """Truncate tool result to max_tokens, preserving key information."""
    # Use first N tokens, add "... (truncated)" if needed
    # Or: Use LLM to summarize (but that adds latency)
    # Better: Extract key points programmatically
    return truncated_result
```

**Expected Savings:** 1-2 seconds (5-10% improvement)
- Reduces prompt size by ~500-1,000 tokens
- Faster LLM processing

**Risk:** Low - tool results are still available, just summarized

---

### OPTIMIZATION 3: Optimize Max Tokens ⭐ **MEDIUM IMPACT**

**Current:** `max_tokens=4000`
**Optimized:** `max_tokens=3500` (or dynamic based on prompt size)

**Implementation:**
```python
# Measure actual output size over time
# Set max_tokens = expected_output_size + 10% buffer
# Or: Use prompt size to estimate output size
max_tokens = min(3500, int(prompt_tokens * 0.7))  # Output ~70% of input
```

**Expected Savings:** 0.5-1 second (2-5% improvement)
- Faster generation (model doesn't generate unnecessary tokens)
- Lower costs

**Risk:** Very Low - can always increase if needed

---

### OPTIMIZATION 4: Cache Check Earlier in Flow ⭐ **MEDIUM IMPACT**

**Current:** Cache check after input validation
**Optimized:** Cache check immediately after input sanitization

**Implementation:**
```python
# Move cache check to start of run_unified_discovery()
# Before any other processing
# Return immediately on cache hit
```

**Expected Savings:** 0.1-0.3 seconds (0.5-1.5% improvement)
- Faster cache hit responses
- Reduces unnecessary processing

**Risk:** Very Low - no functional change

---

### OPTIMIZATION 5: Optimize Prompt Template ⭐ **LOW-MEDIUM IMPACT**

**Current:** Very verbose instructions (~2,200 tokens)
**Optimized:** Condense instructions while maintaining clarity

**Implementation:**
```python
# Remove redundant instructions
# Combine similar requirements
# Use shorter phrasing
# Keep all requirements but make more concise
```

**Expected Savings:** 0.5-1 second (2-5% improvement)
- Reduces prompt size by ~200-400 tokens
- Faster LLM processing

**Risk:** Medium - must ensure instructions remain clear

---

### OPTIMIZATION 6: Pre-warm LLM Connection ⭐ **LOW IMPACT**

**Current:** Create OpenAI client on each request
**Optimized:** Reuse client connection (if supported)

**Implementation:**
```python
# Reuse OpenAI client across requests
# Or: Pre-connect before first request
```

**Expected Savings:** 0.1-0.2 seconds (0.5-1% improvement)

**Risk:** Low - OpenAI SDK may already handle this

---

## 📈 EXPECTED TOTAL IMPROVEMENT

| Optimization | Savings | Cumulative |
|--------------|---------|------------|
| Baseline | 20-25s | 20-25s |
| 1. Tool/LLM Overlap | -3 to -5s | 17-20s |
| 2. Truncate Tool Results | -1 to -2s | 16-18s |
| 3. Optimize Max Tokens | -0.5 to -1s | 15.5-17s |
| 4. Early Cache Check | -0.1 to -0.3s | 15.4-16.7s |
| 5. Condense Prompt | -0.5 to -1s | 14.9-15.7s |
| 6. Pre-warm Connection | -0.1 to -0.2s | **14.8-15.5s** |

**Total Improvement:** **~25-30% reduction** (from 20-25s to 14.8-15.5s)

---

## 🎯 PRIORITY IMPLEMENTATION ORDER

### Phase 1: Quick Wins (1-2 days)
1. ✅ Optimization 4: Early cache check
2. ✅ Optimization 3: Optimize max_tokens
3. ✅ Optimization 6: Pre-warm connection

**Expected:** 5-8% improvement (1-2 seconds)

### Phase 2: High Impact (3-5 days)
4. ✅ Optimization 2: Truncate tool results
5. ✅ Optimization 1: Tool/LLM overlap

**Expected:** 20-25% improvement (4-7 seconds)

### Phase 3: Polish (2-3 days)
6. ✅ Optimization 5: Condense prompt template

**Expected:** 2-5% improvement (0.5-1 second)

---

## ⚠️ RISKS & MITIGATION

### Risk 1: Tool Truncation Loses Information
**Mitigation:** 
- Keep full tool results available
- Only truncate in prompt
- Can include "See full results in context" note

### Risk 2: Partial Tool Results Cause Incomplete Output
**Mitigation:**
- Only start LLM with critical tools
- Non-critical tools can be added to context if needed
- Test thoroughly with various inputs

### Risk 3: Condensed Prompt Loses Clarity
**Mitigation:**
- A/B test condensed vs. full prompt
- Monitor output quality
- Keep all requirements, just make more concise

---

## 📝 IMPLEMENTATION CHECKLIST

- [ ] Add token counting utility
- [ ] Implement tool result truncation
- [ ] Implement tool/LLM overlap
- [ ] Optimize max_tokens
- [ ] Move cache check earlier
- [ ] Condense prompt template
- [ ] Add performance monitoring
- [ ] A/B test optimizations
- [ ] Measure actual improvements
- [ ] Document changes

---

**END OF AUDIT**


