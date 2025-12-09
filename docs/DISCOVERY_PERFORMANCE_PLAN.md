# Discovery Endpoint Performance Optimization Plan

**Goal**: Reduce Discovery endpoint time from ~90 seconds to <30 seconds while maintaining personalization quality.

**Constraints**:
- Must maintain personalization quality (no generic templates)
- Full report reuse only for same user + identical inputs (idempotent rerun)
- In-request optimizations only (no background job queues)
- Can cache sub-results and archetype-level content

---

## Phase 0: Measurement & Instrumentation

### 0.1 Timing Instrumentation Points

Add precise timing logs at these critical points in the Discovery flow:

#### **Location 1: Profile Analysis Task**
- **File**: `app/routes/discovery.py` (before/after `crew.kickoff()`)
- **Timing**: Start timer before profile_analysis_task, end after file read
- **Log Structure**:
  ```json
  {
    "event": "discovery_timing",
    "run_id": "run_1234567890_1",
    "user_id": 1,
    "phase": "profile_analysis",
    "start_time": "2024-01-15T10:30:00.123Z",
    "end_time": "2024-01-15T10:30:18.456Z",
    "duration_ms": 18333,
    "llm_calls": 1,
    "tool_calls": 0
  }
  ```

#### **Location 2: Market/Competitor Research Tools**
- **File**: `src/startup_idea_crew/tools/market_research_tool.py`
- **Timing**: Wrap each tool function (research_market_trends, analyze_competitors, estimate_market_size)
- **Log Structure**:
  ```json
  {
    "event": "discovery_timing",
    "run_id": "run_1234567890_1",
    "user_id": 1,
    "phase": "tool_call",
    "tool_name": "research_market_trends",
    "tool_params": {"interest_area": "AI / Automation", "sub_interest_area": "Chatbots"},
    "start_time": "2024-01-15T10:30:18.500Z",
    "end_time": "2024-01-15T10:30:25.200Z",
    "duration_ms": 6700,
    "cache_hit": false
  }
  ```

#### **Location 3: Idea Research Task**
- **File**: `app/routes/discovery.py` (monitor idea_research_task execution)
- **Timing**: Track idea_research_task separately from profile_analysis
- **Log Structure**:
  ```json
  {
    "event": "discovery_timing",
    "run_id": "run_1234567890_1",
    "user_id": 1,
    "phase": "idea_research",
    "start_time": "2024-01-15T10:30:18.500Z",
    "end_time": "2024-01-15T10:30:52.100Z",
    "duration_ms": 33600,
    "llm_calls": 1,
    "tool_calls": 4,
    "tool_breakdown": {
      "research_market_trends": 6700,
      "analyze_competitors": 5200,
      "estimate_market_size": 4800,
      "validate_startup_idea": 8900
    }
  }
  ```

#### **Location 4: Recommendation Task**
- **File**: `app/routes/discovery.py` (monitor recommendation_task execution)
- **Timing**: Track recommendation_task execution
- **Log Structure**:
  ```json
  {
    "event": "discovery_timing",
    "run_id": "run_1234567890_1",
    "user_id": 1,
    "phase": "recommendation",
    "start_time": "2024-01-15T10:30:52.200Z",
    "end_time": "2024-01-15T10:31:28.500Z",
    "duration_ms": 36300,
    "llm_calls": 1,
    "tool_calls": 5,
    "tool_breakdown": {
      "assess_startup_risks": 6200,
      "estimate_startup_costs": 5100,
      "project_revenue": 4800,
      "check_financial_viability": 5500,
      "generate_customer_persona": 4200
    }
  }
  ```

#### **Location 5: File I/O & Assembly**
- **File**: `app/routes/discovery.py` (file reading section)
- **Timing**: Track file reading and response assembly
- **Log Structure**:
  ```json
  {
    "event": "discovery_timing",
    "run_id": "run_1234567890_1",
    "user_id": 1,
    "phase": "file_io",
    "start_time": "2024-01-15T10:31:28.600Z",
    "end_time": "2024-01-15T10:31:28.850Z",
    "duration_ms": 250
  }
  ```

#### **Location 6: Database Operations**
- **File**: `app/routes/discovery.py` (save to UserRun)
- **Timing**: Track database write time
- **Log Structure**:
  ```json
  {
    "event": "discovery_timing",
    "run_id": "run_1234567890_1",
    "user_id": 1,
    "phase": "db_write",
    "start_time": "2024-01-15T10:31:28.900Z",
    "end_time": "2024-01-15T10:31:29.050Z",
    "duration_ms": 150
  }
  ```

### 0.2 Aggregate Timing Summary

After each discovery run, log a summary:

```json
{
  "event": "discovery_timing_summary",
  "run_id": "run_1234567890_1",
  "user_id": 1,
  "total_duration_ms": 89000,
  "breakdown": {
    "profile_analysis": 18333,
    "idea_research": 33600,
    "recommendation": 36300,
    "file_io": 250,
    "db_write": 150,
    "overhead": 367
  },
  "tool_calls_total": 9,
  "llm_calls_total": 3,
  "cache_hits": 0
}
```

### 0.3 Expected Findings

Based on typical LLM/tool patterns, we expect:
- **Profile Analysis**: ~15-20s (single LLM call, no tools)
- **Idea Research**: ~30-40s (LLM call + 3-4 tool calls, each 5-10s)
- **Recommendation**: ~35-45s (LLM call + 4-5 tool calls)
- **File I/O**: <1s (negligible)
- **DB Write**: <1s (negligible)

**Total**: ~80-105s, with tool calls likely dominating.

---

## Phase 1: Parallelization + Tool Caching

### 1.1 Parallelization Strategy

#### **Current Flow (Sequential)**
```
profile_analysis (20s) → idea_research (35s) → recommendation (40s) = 95s
```

#### **Optimized Flow (Parallel)**
```
profile_analysis (20s) ─┐
                        ├─→ recommendation (40s) = 60s
idea_research (35s) ────┘
```

**Key Insight**: `idea_research_task` currently depends on `profile_analysis_task` via `context=[self.profile_analysis_task()]`, but the dependency is weak:
- `idea_research_task` uses the same input variables directly
- It only references profile analysis for "context", not hard dependencies
- We can make profile analysis optional context and run them in parallel

#### **Implementation Approach**

1. **Modify Task Dependencies**:
   - Remove `context=[self.profile_analysis_task()]` from `idea_research_task`
   - Make profile analysis available as optional context (if ready, use it; if not, proceed with inputs)
   - Change crew process from `Process.sequential` to `Process.hierarchical`

2. **Refactor Crew Configuration**:
   ```python
   # In src/startup_idea_crew/crew.py
   @crew
   def crew(self) -> Crew:
       return Crew(
           agents=self.agents,
           tasks=self.tasks,
           process=Process.hierarchical,  # Allows parallel execution
           verbose=True,
       )
   ```

3. **Task Context Handling**:
   - `idea_research_task` should accept profile analysis as optional context
   - If profile analysis completes first, pass it as context
   - If not ready, proceed with raw inputs (which is sufficient)

**Expected Reduction**: 30-35s (from 95s → 60s)

### 1.2 Tool Result Caching

#### **Cacheable Tools** (High Value)

1. **`research_market_trends`**
   - **Cache Key**: `market_trends:{interest_area}:{sub_interest_area}`
   - **TTL**: 7 days (market trends change slowly)
   - **Storage**: PostgreSQL table `tool_cache` or Redis
   - **Expected Hit Rate**: 60-70% (many users share interest areas)

2. **`analyze_competitors`**
   - **Cache Key**: `competitors:{interest_area}:{sub_interest_area}`
   - **TTL**: 14 days (competitor landscape changes slowly)
   - **Expected Hit Rate**: 50-60%

3. **`estimate_market_size`**
   - **Cache Key**: `market_size:{interest_area}:{sub_interest_area}`
   - **TTL**: 30 days (market size estimates are stable)
   - **Expected Hit Rate**: 70-80%

4. **`assess_startup_risks`**
   - **Cache Key**: `risks:{interest_area}:{work_style}:{budget_range}`
   - **TTL**: 14 days
   - **Expected Hit Rate**: 40-50% (more user-specific)

5. **`estimate_startup_costs`**
   - **Cache Key**: `startup_costs:{interest_area}:{budget_range}`
   - **TTL**: 14 days
   - **Expected Hit Rate**: 50-60%

#### **Less Cacheable Tools** (Lower Value)

- **`validate_startup_idea`**: Too idea-specific, low hit rate
- **`generate_customer_persona`**: User-specific, but could cache archetypes
- **`generate_validation_questions`**: Idea-specific, low hit rate
- **`check_domain_availability`**: Real-time data, shouldn't cache
- **`project_revenue`**: Idea-specific, low hit rate
- **`check_financial_viability`**: Idea-specific, low hit rate

#### **Cache Storage Design**

**Option A: PostgreSQL Table**
```sql
CREATE TABLE tool_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    tool_params JSONB NOT NULL,
    result TEXT NOT NULL,  -- JSON string of tool result
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    INDEX idx_cache_key (cache_key),
    INDEX idx_expires (expires_at)
);
```

**Option B: Redis** (if available)
- Key: `tool_cache:{cache_key}`
- Value: JSON string of result
- TTL: Set on write
- Better for high concurrency, but adds infrastructure dependency

#### **Cache Integration Points**

1. **Before Tool Call**:
   ```python
   def research_market_trends(interest_area, sub_interest_area):
       cache_key = f"market_trends:{interest_area}:{sub_interest_area}"
       cached = get_from_cache(cache_key)
       if cached and not expired(cached):
           log_cache_hit(cache_key)
           return cached.result
       
       # Execute tool
       result = execute_tool(...)
       store_in_cache(cache_key, result, ttl_days=7)
       return result
   ```

2. **Cache Invalidation**:
   - Manual: Admin can invalidate by interest_area
   - Automatic: TTL-based expiration
   - On update: Invalidate related caches when market data updates

**Expected Reduction**: 15-25s for cached tool calls (from 60s → 35-45s)

### 1.3 Error Handling for Parallelization

1. **Partial Failure Handling**:
   - If `profile_analysis` fails but `idea_research` succeeds, continue with idea_research
   - If `idea_research` fails, recommendation can still use profile_analysis
   - Log partial failures but don't block the request

2. **Timeout Handling**:
   - Set per-task timeouts (e.g., 45s per task)
   - If a task times out, use fallback (cached archetype or simplified version)

3. **Context Availability**:
   - Use `asyncio` or `concurrent.futures` to wait for profile_analysis
   - If not ready in time, proceed without it

**Phase 1 Total Expected Reduction**: 40-50s (from 90s → 40-50s)

---

## Phase 2: Archetype Caching

### 2.1 Archetype Definition

An "archetype" is a user profile pattern based on non-personal inputs:
- `goal_type` (e.g., "Extra Income", "Career Change")
- `interest_area` (e.g., "AI / Automation", "E-commerce")
- `sub_interest_area` (e.g., "Chatbots", "Dropshipping")
- `time_commitment` (e.g., "<5 hrs/week", "10-20 hrs/week")
- `budget_range` (e.g., "Free / Sweat-equity only", "$1k-$5k")
- `work_style` (e.g., "Solo", "Team")
- `skill_strength` (e.g., "Analytical / Strategic", "Creative / Design")

**Excluded from archetype** (personalization layer):
- `experience_summary` (user-specific narrative)

### 2.2 Cacheable Sub-Results

#### **Layer 2.1: Profile Archetype Analysis**

**What to Cache**:
- Generic profile analysis sections that don't depend on `experience_summary`
- Sections like:
  - "Operating Constraints" (time, work style, budget analysis)
  - "Opportunity Within [Interest Area]" (market opportunity analysis)
  - "Strengths You Can Leverage" (generic skill strength analysis)
  - "Skill Gaps to Fill" (generic gaps for skill type)

**Cache Key**: `profile_archetype:{goal_type}:{interest_area}:{sub_interest_area}:{time_commitment}:{budget_range}:{work_style}:{skill_strength}`

**TTL**: 30 days

**Personalization Layer**:
- "Core Motivation" section: Fresh analysis using `experience_summary`
- "Recommendations" section: Blend archetype recommendations with user-specific insights

#### **Layer 2.2: Market Analysis Blocks**

**What to Cache**:
- Market opportunity sections from `idea_research_task`
- Generic market trends, competitor landscape, market size
- Industry-specific risk patterns

**Cache Key**: `market_analysis:{interest_area}:{sub_interest_area}`

**TTL**: 14 days

**Personalization Layer**:
- Idea-specific sections (how ideas fit the user's profile)
- User-specific execution timelines

#### **Layer 2.3: Generic Risk/Constraint Sections**

**What to Cache**:
- Standard risk patterns for interest_area + work_style + budget_range combinations
- Generic constraint analysis (time, budget, skill gaps)

**Cache Key**: `risk_patterns:{interest_area}:{work_style}:{budget_range}`

**TTL**: 30 days

**Personalization Layer**:
- How risks specifically impact the user's chosen ideas
- User-specific mitigation strategies

### 2.3 Rehydration Strategy

#### **Step 1: Check Archetype Cache**
```python
archetype_key = build_archetype_key(payload)
cached_archetype = get_archetype_cache(archetype_key)

if cached_archetype:
    # Use cached blocks
    profile_blocks = cached_archetype.profile_blocks
    market_blocks = cached_archetype.market_blocks
    risk_blocks = cached_archetype.risk_blocks
else:
    # Generate fresh (will cache after)
    profile_blocks = generate_profile_archetype(payload)
    market_blocks = generate_market_analysis(payload)
    risk_blocks = generate_risk_patterns(payload)
```

#### **Step 2: Generate Personalization Layer**
```python
# Fresh LLM call, but smaller scope
personalization_prompt = f"""
Based on this user's experience: {experience_summary}

And these archetype insights:
{profile_blocks}

Generate:
1. Core Motivation section (personalized to their experience)
2. Personalized recommendations that blend archetype insights with their specific background
"""

personalized_sections = llm_call(personalization_prompt)  # ~10-15s instead of 20s
```

#### **Step 3: Assemble Final Report**
```python
final_profile_analysis = assemble(
    personalized_sections.core_motivation,
    profile_blocks.operating_constraints,
    profile_blocks.opportunity_within_interest,
    profile_blocks.strengths_to_leverage,
    profile_blocks.skill_gaps,
    personalized_sections.recommendations
)
```

### 2.4 Cache Storage for Archetypes

**PostgreSQL Table**:
```sql
CREATE TABLE archetype_cache (
    id SERIAL PRIMARY KEY,
    archetype_key VARCHAR(255) UNIQUE NOT NULL,
    profile_blocks JSONB NOT NULL,  -- Cached profile sections
    market_blocks JSONB NOT NULL,     -- Cached market analysis
    risk_blocks JSONB NOT NULL,       -- Cached risk patterns
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    INDEX idx_archetype_key (archetype_key),
    INDEX idx_expires (expires_at)
);
```

### 2.5 Quality Guardrails

1. **Minimum Fresh Content Requirement**:
   - At least 30% of final report must be fresh (personalized)
   - Core Motivation section always fresh
   - At least one personalized recommendation section

2. **Cache Hit Indicators**:
   - Add metadata to response: `{"cached_components": ["profile_archetype", "market_analysis"], "fresh_components": ["core_motivation", "recommendations"]}`
   - Frontend can show: "Personalized for you" badge on fresh sections

3. **Archetype Validation**:
   - If archetype cache is >60 days old, regenerate (market conditions may have changed)
   - If user's `experience_summary` is very detailed (>500 chars), reduce archetype usage (more personalization needed)

**Phase 2 Total Expected Reduction**: Additional 15-20s (from 40-50s → 25-30s)

---

## Phase 3: Streaming / Progressive Response

### 3.1 API Design: Server-Sent Events (SSE)

**Why SSE over Polling**:
- Lower latency (push vs pull)
- Simpler than WebSockets (unidirectional is sufficient)
- Built into Flask (via `flask.Response` with `stream=True`)

**Endpoint**: `/api/run/stream` (new endpoint, keep `/api/run` for backward compatibility)

### 3.2 Response Phases

#### **Phase 1: Profile Analysis** (~20s)
```json
{
  "phase": "profile_analysis",
  "status": "completed",
  "data": {
    "profile_analysis": "## 1. Core Motivation\n\nYou're exploring..."
  },
  "progress": 0.25,
  "estimated_remaining_ms": 60000
}
```

#### **Phase 2: Idea Research** (~35s)
```json
{
  "phase": "idea_research",
  "status": "completed",
  "data": {
    "startup_ideas_research": "### Idea Research Report\n\n..."
  },
  "progress": 0.60,
  "estimated_remaining_ms": 40000
}
```

#### **Phase 3: Recommendations** (~40s)
```json
{
  "phase": "recommendation",
  "status": "completed",
  "data": {
    "personalized_recommendations": "### Comprehensive Recommendation Report\n\n..."
  },
  "progress": 1.0,
  "run_id": "run_1234567890_1",
  "complete": true
}
```

#### **Progress Updates** (during each phase)
```json
{
  "phase": "idea_research",
  "status": "in_progress",
  "progress": 0.45,
  "current_step": "Analyzing market trends...",
  "estimated_remaining_ms": 45000
}
```

### 3.3 Frontend Integration

#### **React Hook for SSE**
```javascript
function useDiscoveryStream(inputs) {
  const [phases, setPhases] = useState({
    profile_analysis: null,
    idea_research: null,
    recommendation: null,
  });
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/run/stream?${new URLSearchParams(inputs)}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.phase === 'profile_analysis' && data.status === 'completed') {
        setPhases(prev => ({ ...prev, profile_analysis: data.data.profile_analysis }));
        // Show profile analysis immediately
      }
      
      if (data.phase === 'idea_research' && data.status === 'completed') {
        setPhases(prev => ({ ...prev, idea_research: data.data.startup_ideas_research }));
        // Show research immediately
      }
      
      if (data.complete) {
        setPhases(prev => ({ ...prev, recommendation: data.data.personalized_recommendations }));
        eventSource.close();
      }
      
      setProgress(data.progress);
      setCurrentStep(data.current_step || '');
    };
    
    return () => eventSource.close();
  }, [inputs]);
  
  return { phases, progress, currentStep };
}
```

#### **UI Updates**
- Show profile analysis as soon as Phase 1 completes (~20s perceived time)
- Show research as soon as Phase 2 completes (~55s perceived time)
- Show recommendations when Phase 3 completes (~95s actual, but feels like incremental progress)

**Perceived Time Reduction**: 70-80% (from 90s wait → 20s first result)

### 3.4 Implementation Details

#### **Flask SSE Endpoint**
```python
@bp.get("/api/run/stream")
@require_auth
def run_crew_stream():
    def generate():
        # Phase 1: Profile Analysis
        yield f"data: {json.dumps({'phase': 'profile_analysis', 'status': 'in_progress'})}\n\n"
        profile_result = execute_profile_analysis()
        yield f"data: {json.dumps({'phase': 'profile_analysis', 'status': 'completed', 'data': {'profile_analysis': profile_result}, 'progress': 0.25})}\n\n"
        
        # Phase 2: Idea Research (can run in parallel with profile, but stream separately)
        yield f"data: {json.dumps({'phase': 'idea_research', 'status': 'in_progress'})}\n\n"
        research_result = execute_idea_research()
        yield f"data: {json.dumps({'phase': 'idea_research', 'status': 'completed', 'data': {'startup_ideas_research': research_result}, 'progress': 0.60})}\n\n"
        
        # Phase 3: Recommendations
        yield f"data: {json.dumps({'phase': 'recommendation', 'status': 'in_progress'})}\n\n"
        rec_result = execute_recommendations()
        yield f"data: {json.dumps({'phase': 'recommendation', 'status': 'completed', 'data': {'personalized_recommendations': rec_result}, 'progress': 1.0, 'complete': True})}\n\n"
    
    return Response(generate(), mimetype='text/event-stream')
```

### 3.5 Backward Compatibility

- Keep `/api/run` endpoint unchanged (returns full result after completion)
- Frontend can choose: streaming (new UI) or traditional (existing UI)
- Both endpoints share the same underlying execution logic

**Phase 3 Perceived Time Reduction**: 70-80% (first result in ~20s instead of 90s)

---

## Phase 4: Exact Rerun Cache (Layer 1)

### 4.1 Cache Strategy

**Cache Key**: `exact_rerun:{user_id}:{input_hash}`

Where `input_hash` is SHA256 of all inputs (including `experience_summary`):
```python
import hashlib
import json

all_inputs = {
    'goal_type': payload['goal_type'],
    'time_commitment': payload['time_commitment'],
    'budget_range': payload['budget_range'],
    'interest_area': payload['interest_area'],
    'sub_interest_area': payload['sub_interest_area'],
    'work_style': payload['work_style'],
    'skill_strength': payload['skill_strength'],
    'experience_summary': payload['experience_summary'],  # Include for exact match
}
input_hash = hashlib.sha256(json.dumps(all_inputs, sort_keys=True).encode()).hexdigest()
```

### 4.2 Cache Storage

**PostgreSQL Table**:
```sql
CREATE TABLE exact_rerun_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    input_hash VARCHAR(64) NOT NULL,
    inputs JSONB NOT NULL,
    outputs JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, input_hash),
    INDEX idx_user_hash (user_id, input_hash)
);
```

### 4.3 Cache Logic

1. **Before Crew Execution**:
   ```python
   input_hash = compute_input_hash(payload)
   cached = ExactRerunCache.query.filter_by(user_id=user.id, input_hash=input_hash).first()
   
   if cached:
       # Return immediately (0-1s response time)
       return jsonify({
           "success": True,
           "run_id": cached.run_id or generate_new_run_id(),
           "inputs": cached.inputs,
           "outputs": cached.outputs,
           "cached": True,
           "cached_at": cached.created_at.isoformat()
       })
   ```

2. **After Successful Execution**:
   ```python
   # Store in cache
   cache_entry = ExactRerunCache(
       user_id=user.id,
       input_hash=input_hash,
       inputs=payload,
       outputs=outputs
   )
   db.session.add(cache_entry)
   db.session.commit()
   ```

### 4.4 Cache Management

- **TTL**: No expiration (exact reruns are valid indefinitely)
- **Cleanup**: Manual cleanup of old entries (e.g., >1 year old) via admin script
- **Hit Rate**: Expected 5-10% (users occasionally rerun with same inputs)

**Expected Reduction**: 90s → <1s for exact reruns (5-10% of requests)

---

## Risk and Quality Notes

### 5.1 Personalization Quality Risks

#### **Risk 1: Over-Caching Archetypes**
**Problem**: If archetype cache is too aggressive, reports feel generic.

**Mitigation**:
- Require minimum 30% fresh content per report
- Always generate Core Motivation fresh (uses experience_summary)
- If experience_summary is detailed (>500 chars), reduce archetype usage to 20%

#### **Risk 2: Stale Market Data**
**Problem**: Cached market analysis becomes outdated.

**Mitigation**:
- Shorter TTL for market data (7-14 days)
- Invalidate cache when market conditions change (admin-triggered)
- Add "Last updated" metadata to cached sections

#### **Risk 3: Tool Cache Miss-Match**
**Problem**: Cached tool results don't match current query context.

**Mitigation**:
- Include relevant parameters in cache key
- Validate cache key matches exactly before use
- Log cache misses for monitoring

### 5.2 Quality Guardrails

1. **Minimum Fresh Content**:
   - At least 30% of report must be fresh (personalized)
   - Core Motivation always fresh
   - At least one recommendation section personalized

2. **Cache Indicators**:
   - Add metadata to response indicating cached components
   - Frontend can show badges: "Personalized" vs "Based on similar profiles"

3. **User Experience**:
   - If user changes inputs significantly, show: "Generating fresh analysis..."
   - If using cache, show: "Using optimized analysis (similar to your previous request)"

4. **Monitoring**:
   - Track cache hit rates
   - Monitor user feedback on personalization quality
   - A/B test: cached vs fully fresh reports

### 5.3 Fallback Strategies

1. **Cache Unavailable**:
   - If cache lookup fails, proceed with full generation
   - Log cache failures but don't block request

2. **Partial Cache Hit**:
   - If only some components are cached, use what's available
   - Generate missing components fresh

3. **Cache Corruption**:
   - Validate cached data structure before use
   - If invalid, regenerate and update cache

---

## Implementation Phases Summary

### Phase 0: Measurement (Week 1)
- Add timing instrumentation
- Collect baseline metrics
- Identify bottlenecks

**Expected Outcome**: Clear understanding of where time is spent

### Phase 1: Parallelization + Tool Caching (Week 2-3)
- Implement parallel task execution
- Add tool result caching
- Optimize error handling

**Expected Outcome**: 40-50s total time (from 90s)

### Phase 2: Archetype Caching (Week 4-5)
- Implement archetype cache
- Build rehydration logic
- Add quality guardrails

**Expected Outcome**: 25-30s total time (from 40-50s)

### Phase 3: Streaming (Week 6-7)
- Implement SSE endpoint
- Update frontend for progressive display
- Maintain backward compatibility

**Expected Outcome**: <1s perceived time for first result (20s actual)

### Phase 4: Exact Rerun Cache (Week 8)
- Implement exact rerun cache
- Add cache management
- Monitor hit rates

**Expected Outcome**: <1s for exact reruns (5-10% of requests)

---

## Success Metrics

1. **Performance**:
   - Target: <30s total time for new requests
   - Target: <1s for exact reruns
   - Target: <20s perceived time (first result via streaming)

2. **Quality**:
   - User satisfaction scores maintained (no degradation)
   - Personalization quality metrics stable
   - Cache hit rates: 40-60% for tools, 20-30% for archetypes

3. **Reliability**:
   - Error rates <1%
   - Cache failure doesn't block requests
   - Fallback strategies work correctly

---

## Appendix: Cache Key Examples

### Tool Cache Keys
```
market_trends:AI / Automation:Chatbots
competitors:AI / Automation:Chatbots
market_size:AI / Automation:Chatbots
risks:AI / Automation:Solo:Free / Sweat-equity only
startup_costs:AI / Automation:Free / Sweat-equity only
```

### Archetype Cache Keys
```
profile_archetype:Extra Income:AI / Automation:Chatbots:<5 hrs/week:Free / Sweat-equity only:Solo:Analytical / Strategic
market_analysis:AI / Automation:Chatbots
risk_patterns:AI / Automation:Solo:Free / Sweat-equity only
```

### Exact Rerun Cache Keys
```
exact_rerun:1:a1b2c3d4e5f6... (user_id:input_hash)
```

