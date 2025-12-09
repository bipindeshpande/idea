# Discovery Pipeline Code Review Checklist

## 🎯 Purpose
This document lists the **most critical files** for reviewing the Discovery pipeline performance and correctness.

---

## 📁 Critical Files (Review Priority Order)

### **Tier 1: Core Orchestration** ⚡
*These files control the overall pipeline flow and are most likely to have performance issues*

1. **`app/services/unified_discovery_service.py`** ⭐⭐⭐⭐⭐
   - **Lines:** ~1615
   - **Functions to Review:**
     - `run_unified_discovery()` (main entry point)
     - `run_unified_discovery_streaming()` (streaming path)
     - `run_unified_discovery_non_streaming()` (non-streaming path)
     - `precompute_all_tools()` (parallel tool execution)
     - `_wait_for_critical_tools()` (critical tools wait logic)
     - `run_profile_analysis()` (Stage 1)
     - `run_idea_research()` (Stage 2)
   - **Key Questions:**
     - Are tools running in parallel correctly?
     - Is Stage 1 and tool precomputation truly parallel?
     - Are there any blocking operations?
     - Is the critical tools wait logic correct?
     - Are there duplicate tool calls?

2. **`app/routes/discovery.py`** ⭐⭐⭐⭐
   - **Purpose:** API endpoint entry point
   - **Functions to Review:**
     - `run_crew()` (main endpoint handler)
     - `_stream_discovery_response_live()` (SSE streaming handler)
   - **Key Questions:**
     - Is caching checked correctly?
     - Is error handling comprehensive?
     - Are requests validated properly?
     - Is streaming working correctly?

### **Tier 2: Tool Execution** 🔧
*Tool implementations that could be slow or inefficient*

3. **`src/startup_idea_crew/tools/market_research_tool.py`** ⭐⭐⭐⭐
   - **Purpose:** Market research, competitor analysis, market size estimation
   - **Functions:**
     - `research_market_trends()`
     - `analyze_competitors()`
     - `estimate_market_size()`
   - **Key Questions:**
     - Are OpenAI calls optimized (temperature, max_tokens)?
     - Is caching working correctly?
     - Are there unnecessary retries?

4. **`src/startup_idea_crew/tools/validation_tool.py`** ⭐⭐⭐
   - **Purpose:** Idea validation and risk assessment
   - **Functions:**
     - `validate_startup_idea()`
     - `assess_startup_risks()`
   - **Key Questions:**
     - Are prompts too long?
     - Are there redundant calls?

5. **`src/startup_idea_crew/tools/financial_tool.py`** ⭐⭐⭐
   - **Purpose:** Cost estimation, revenue projection, financial viability
   - **Functions:**
     - `estimate_startup_costs()`
     - `project_revenue()`
     - `check_financial_viability()`
   - **Key Questions:**
     - Are calculations optimized?
     - Are there blocking database queries?

6. **`src/startup_idea_crew/tools/persona_tool.py`** ⭐⭐
   - **Purpose:** Customer persona generation
   - **Functions:**
     - `generate_customer_persona()`
     - `generate_validation_questions()`
   - **Key Questions:**
     - Are these tools actually used?
     - Are they blocking?

### **Tier 3: Caching & Performance** 💾
*Caching mechanisms that should speed things up*

7. **`app/utils/discovery_cache.py`** ⭐⭐⭐⭐
   - **Purpose:** Full discovery output caching
   - **Key Questions:**
     - Is cache lookup fast?
     - Is cache key generation correct?
     - Are cache hits being used?

8. **`app/utils/archetype_cache.py`** ⭐⭐⭐
   - **Purpose:** Archetype-based profile section caching
   - **Key Questions:**
     - Is extraction from Stage 1 working?
     - Is cache being populated correctly?

9. **`app/utils/tool_cache.py`** (if exists) ⭐⭐⭐
   - **Purpose:** Individual tool result caching
   - **Key Questions:**
     - Are tool results being cached?
     - Is cache TTL appropriate?

10. **`app/services/static_loader.py`** ⭐⭐⭐
    - **Purpose:** Static block loading (replaces tool calls)
    - **Key Questions:**
      - Are static blocks being loaded correctly?
      - Are tools being skipped when static blocks exist?
      - Is caching working?

### **Tier 4: Prompts & LLM Calls** 📝
*Prompt construction and LLM call optimization*

11. **`src/startup_idea_crew/prompts/profile_prompt.py`** (if exists) ⭐⭐⭐
    - **Purpose:** Stage 1 (Profile Analysis) prompt
    - **Key Questions:**
      - Is prompt too long?
      - Are instructions clear?
      - Is JSON output format specified correctly?

12. **`src/startup_idea_crew/prompts/idea_research_prompt.py`** (if exists) ⭐⭐⭐
    - **Purpose:** Stage 2 (Idea Research) prompt
    - **Key Questions:**
      - Is prompt optimized?
      - Are tool results compressed correctly?
      - Is JSON output format specified correctly?

13. **`src/startup_idea_crew/unified_prompt.py`** (if still used) ⭐⭐
    - **Purpose:** Legacy unified prompt (may not be used in two-stage system)
    - **Key Questions:**
      - Is this still being called?
      - Can it be removed?

### **Tier 5: Supporting Infrastructure** 🛠️
*Supporting files that might affect performance*

14. **`app/utils/performance_metrics.py`** ⭐⭐
    - **Purpose:** Performance tracking
    - **Key Questions:**
      - Are metrics causing overhead?
      - Are database queries optimized?

15. **`app/utils/timing_logger.py`** ⭐⭐
    - **Purpose:** Timing log collection
    - **Key Questions:**
      - Is logging causing performance issues?
      - Is file I/O blocking?

---

## 🔍 Code Review Focus Areas

### **Performance Bottlenecks**

1. **Sequential Execution**
   - [ ] Are tools running in parallel? Check `ThreadPoolExecutor` usage
   - [ ] Is Stage 1 truly parallel with tool precomputation?
   - [ ] Are there any `.result()` calls blocking on futures?

2. **Tool Execution**
   - [ ] Are tools making redundant OpenAI calls?
   - [ ] Is caching working for all tools?
   - [ ] Are static blocks replacing tools correctly?
   - [ ] Are tool prompts too long (causing slow LLM responses)?

3. **Critical Tools Wait Logic**
   - [ ] Is `MIN_CRITICAL_TOOLS` correct?
   - [ ] Is `CRITICAL_TOOLS_TIMEOUT` appropriate?
   - [ ] Are we waiting too long for non-critical tools?

4. **LLM Calls**
   - [ ] Are Stage 1 and Stage 2 prompts optimized?
   - [ ] Are we using the right models (GPT-4 vs GPT-3.5)?
   - [ ] Are `max_tokens` set appropriately?
   - [ ] Is streaming working correctly?

5. **Caching**
   - [ ] Are cache lookups fast (database queries optimized)?
   - [ ] Are cache keys correct?
   - [ ] Are we checking cache before expensive operations?

6. **Database Operations**
   - [ ] Are there N+1 query problems?
   - [ ] Are database queries optimized with indexes?
   - [ ] Is connection pooling working?

### **Correctness Issues**

1. **Two-Stage Pipeline**
   - [ ] Is Stage 1 output validated correctly?
   - [ ] Is Stage 2 receiving correct inputs?
   - [ ] Are errors handled gracefully in each stage?

2. **Tool Results**
   - [ ] Are tool results being summarized correctly?
   - [ ] Are tool results being compressed before Stage 2?
   - [ ] Are empty tool results handled?

3. **Streaming**
   - [ ] Is streaming order correct (Stage 1 → Stage 2 → Final)?
   - [ ] Are errors streamed correctly?
   - [ ] Is final event sent correctly?

4. **JSON Parsing**
   - [ ] Is Stage 1 JSON validated?
   - [ ] Is Stage 2 JSON validated?
   - [ ] Are parsing errors handled?

---

## 🚨 Common Performance Anti-Patterns to Look For

1. **Blocking Operations**
   ```python
   # ❌ BAD: Sequential execution
   result1 = tool1()
   result2 = tool2()
   
   # ✅ GOOD: Parallel execution
   with ThreadPoolExecutor() as executor:
       future1 = executor.submit(tool1)
       future2 = executor.submit(tool2)
   ```

2. **Synchronous Database Queries**
   ```python
   # ❌ BAD: Blocking DB query
   cache = ToolCacheEntry.query.filter_by(...).first()
   
   # ✅ GOOD: Async or optimized query
   # (Use connection pooling, indexes, etc.)
   ```

3. **Redundant LLM Calls**
   ```python
   # ❌ BAD: Calling tool when static block exists
   if not static_blocks.get("market_trends"):
       result = research_market_trends()
   
   # ✅ GOOD: Check static blocks first
   ```

4. **Long Prompts**
   ```python
   # ❌ BAD: Including full tool outputs
   prompt = f"Tool results: {full_tool_output}"  # Could be 10K tokens
   
   # ✅ GOOD: Compress tool outputs
   prompt = f"Tool results: {compress_tool_output(full_tool_output, max_chars=300)}"
   ```

5. **Duplicate Tool Calls**
   ```python
   # ❌ BAD: Calling same tool twice
   result1 = research_market_trends(idea)
   result2 = research_market_trends(idea)  # Duplicate!
   
   # ✅ GOOD: Use cache or store result
   ```

---

## 📊 Performance Metrics to Check

1. **Tool Execution Times**
   - Each tool should complete in < 10 seconds
   - Critical tools should complete in < 5 seconds

2. **Stage 1 (Profile Analysis)**
   - Should complete in < 15 seconds
   - Should NOT wait for tools

3. **Stage 2 (Idea Research)**
   - Should start as soon as critical tools complete
   - Should complete in < 30 seconds

4. **Total Pipeline Time**
   - Target: < 60 seconds
   - Current: ~90 seconds (investigate!)

5. **Cache Hit Rate**
   - Should be > 50% for repeated queries
   - Tool cache should have high hit rate

---

## 🎯 Review Order Recommendation

1. **Start with `unified_discovery_service.py`** - This is the orchestrator
2. **Check `precompute_all_tools()`** - Tool execution logic
3. **Check `_wait_for_critical_tools()`** - Critical tools wait logic
4. **Review each tool file** - Look for slow operations
5. **Check caching** - Ensure cache is being used
6. **Review prompts** - Ensure they're optimized

---

## 📝 Review Template

For each file, answer:

1. **Performance:**
   - Are there blocking operations?
   - Are parallel operations working correctly?
   - Is caching being used?
   - Are there redundant calls?

2. **Correctness:**
   - Is the logic correct?
   - Are edge cases handled?
   - Is error handling comprehensive?

3. **Code Quality:**
   - Is code readable?
   - Are there code smells?
   - Can anything be simplified?

---

## 🔗 Related Documentation

- `docs/TIMING_LOGS_README.md` - Timing logs format
- `docs/STATIC_BLOCKS_GUIDE.md` - Static blocks usage
- `docs/SAMPLE_JSON_STRUCTURES.md` - JSON output formats

