# Discovery Pipeline - Most Important Files for Code Review

## 🎯 Top Priority Files (Must Review)

### 1. **`app/services/unified_discovery_service.py`** ⭐⭐⭐⭐⭐
**Size:** ~1,615 lines  
**Why Critical:** Main orchestration service controlling the entire pipeline

**Key Functions to Review:**
- `run_unified_discovery()` - Main entry point (line ~1590)
- `run_unified_discovery_streaming()` - Streaming path (line ~1180)
- `run_unified_discovery_non_streaming()` - Non-streaming path (line ~1442)
- `precompute_all_tools()` - Parallel tool execution (line ~520)
- `_wait_for_critical_tools()` - Critical tools wait logic (line ~740)
- `run_profile_analysis()` - Stage 1 LLM call (line ~868)
- `run_idea_research()` - Stage 2 LLM call (line ~1024)

**Performance Concerns:**
- Check if tools are truly running in parallel
- Verify Stage 1 and tool precomputation are parallel
- Check for blocking `.result()` calls
- Verify critical tools wait logic isn't too aggressive

---

### 2. **`app/routes/discovery.py`** ⭐⭐⭐⭐
**Size:** ~771 lines  
**Why Critical:** API endpoint entry point, handles caching and streaming

**Key Functions to Review:**
- `run_crew()` - Main endpoint handler (line ~52)
- `_stream_discovery_response_live()` - SSE streaming handler (line ~200)

**Performance Concerns:**
- Cache lookup efficiency
- Streaming implementation
- Error handling overhead

---

### 3. **`src/startup_idea_crew/tools/market_research_tool.py`** ⭐⭐⭐⭐
**Size:** ~641 lines  
**Why Critical:** Contains 3 expensive tools that run in parallel

**Key Functions:**
- `research_market_trends()` - Market research tool
- `analyze_competitors()` - Competitor analysis tool
- `estimate_market_size()` - Market size estimation tool

**Performance Concerns:**
- OpenAI API call optimization (temperature, max_tokens)
- Caching effectiveness
- Prompt length (should be concise)

---

### 4. **`src/startup_idea_crew/tools/validation_tool.py`** ⭐⭐⭐
**Why Critical:** Validates ideas and assesses risks

**Key Functions:**
- `validate_startup_idea()` - Idea validation
- `assess_startup_risks()` - Risk assessment

**Performance Concerns:**
- Prompt optimization
- Redundant calls

---

### 5. **`src/startup_idea_crew/tools/financial_tool.py`** ⭐⭐⭐
**Size:** ~736 lines  
**Why Critical:** Financial calculations and projections

**Key Functions:**
- `estimate_startup_costs()` - Cost estimation
- `project_revenue()` - Revenue projection
- `check_financial_viability()` - Financial viability check

**Performance Concerns:**
- Calculation efficiency
- Database query optimization

---

### 6. **`app/utils/discovery_cache.py`** ⭐⭐⭐⭐
**Why Critical:** Full discovery output caching (should speed things up significantly)

**Key Functions:**
- `get()` - Cache lookup
- `set()` - Cache storage

**Performance Concerns:**
- Database query optimization (indexes?)
- Cache key generation efficiency
- Cache hit rate

---

### 7. **`app/services/static_loader.py`** ⭐⭐⭐
**Why Critical:** Loads static blocks that replace expensive tool calls

**Key Functions:**
- `load_static_blocks()` - Load static blocks for interest area
- `normalize_interest_area()` - Normalize interest area to filename

**Performance Concerns:**
- Cache lookup efficiency
- File I/O optimization
- Tool skipping logic correctness

---

## 📋 Secondary Priority Files

### 8. **`app/utils/archetype_cache.py`** ⭐⭐⭐
**Why Important:** Caches archetype-based profile sections

---

### 9. **`src/startup_idea_crew/tools/customer_tool.py`** ⭐⭐
**Why Important:** Customer persona generation (may not be critical path)

---

### 10. **`app/utils/timing_logger.py`** ⭐⭐
**Why Important:** Timing logs (ensure logging isn't causing overhead)

---

## 🔍 Review Focus Areas

### Performance Bottlenecks
1. **Tool Execution Parallelism**
   - Check `precompute_all_tools()` - Are tools running in parallel?
   - Check `_wait_for_critical_tools()` - Is wait logic correct?
   - Are there blocking operations?

2. **Stage Parallelism**
   - Is Stage 1 (profile analysis) running in parallel with tool precomputation?
   - Check `run_unified_discovery_streaming()` - Look for ThreadPoolExecutor usage

3. **Caching**
   - Are cache lookups fast?
   - Are tools using cache correctly?
   - Are static blocks replacing tools?

4. **LLM Calls**
   - Are prompts optimized?
   - Are tool results compressed before Stage 2?
   - Is streaming working correctly?

### Common Issues to Look For
- ❌ Sequential tool execution instead of parallel
- ❌ Blocking `.result()` calls on futures
- ❌ Duplicate tool calls
- ❌ Missing cache checks
- ❌ Long prompts (too many tokens)
- ❌ Synchronous database queries

---

## 📊 Current Performance Targets vs Reality

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Total Pipeline Time | < 60s | ~90s | ⚠️ Needs Review |
| Stage 1 (Profile Analysis) | < 15s | ? | ⚠️ Check |
| Stage 2 (Idea Research) | < 30s | ? | ⚠️ Check |
| Tool Execution (Parallel) | < 30s | ? | ⚠️ Check |
| Critical Tools Wait | < 10s | ? | ⚠️ Check |

---

## 🚀 Quick Review Script

Run this to get file statistics:

```bash
# Get line counts for critical files
wc -l app/services/unified_discovery_service.py
wc -l app/routes/discovery.py
wc -l src/startup_idea_crew/tools/*.py
```

---

## 📝 Review Checklist

For each file, check:
- [ ] Are operations running in parallel?
- [ ] Is caching being used effectively?
- [ ] Are there blocking operations?
- [ ] Are prompts optimized?
- [ ] Is error handling comprehensive?
- [ ] Are there code smells or technical debt?

---

## 🔗 Related Docs

- `docs/DISCOVERY_CODE_REVIEW_CHECKLIST.md` - Detailed review checklist
- `docs/TIMING_LOGS_README.md` - Performance timing logs
- `docs/STATIC_BLOCKS_GUIDE.md` - Static blocks usage

