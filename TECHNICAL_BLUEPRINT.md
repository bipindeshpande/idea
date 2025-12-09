# COMPLETE TECHNICAL BLUEPRINT
## Startup Idea Advisor Platform - Full Architecture Documentation

**Version:** 1.0  
**Date:** 2025-01-05  
**Purpose:** Complete cross-file, cross-directory architecture summary for performance redesign

---

## TABLE OF CONTENTS

1. [Discovery Execution Path](#1-discovery-execution-path)
2. [CrewAI Configuration](#2-crewai-configuration)
3. [Tool Usage](#3-tool-usage)
4. [Founder Psychology Integration](#4-founder-psychology-integration)
5. [Caching Infrastructure](#5-caching-infrastructure)
6. [Performance Mechanisms](#6-performance-mechanisms)
7. [Output Architecture](#7-output-architecture)
8. [Testing Hooks](#8-testing-hooks)
9. [Current Known Problems](#9-current-known-problems)
10. [Architecture Diagram](#10-architecture-diagram)
11. [Authentication System](#11-authentication-system)
12. [Billing & Pricing](#12-billing--pricing)
13. [Frontend Architecture](#13-frontend-architecture)
14. [Technology Stack](#14-technology-stack)

---

## 1. DISCOVERY EXECUTION PATH

### 1.1 Complete Call Stack

```
HTTP Request: POST /api/run
    ↓
Flask Route: app/routes/discovery.py::run_crew()
    ↓
[Pre-processing]
    ├─ Input Validation (sanitize_text, validate_text_field)
    ├─ Default Value Assignment
    ├─ Usage Limit Check (user.can_perform_discovery())
    ├─ Founder Psychology Extraction (user.founder_psychology → payload)
    ├─ Input Validation (_validate_discovery_inputs)
    └─ Metrics Collection Start (start_metrics_collection)
    ↓
[File Setup]
    ├─ Generate Unique Run ID (uuid4 + timestamp)
    ├─ Create Temp Directory (tempfile.gettempdir() / "idea_crew_outputs")
    ├─ Create Unique Temp Files:
    │   ├─ {run_file_id}_profile_analysis.md
    │   ├─ {run_file_id}_startup_ideas_research.md
    │   └─ {run_file_id}_personalized_recommendations.md
    └─ Map Original Output Paths → Temp Files
    ↓
[CrewAI Initialization]
    ├─ Import: startup_idea_crew.crew.StartupIdeaCrew
    ├─ Instantiate: crew_instance = StartupIdeaCrew()
    ├─ Get Crew: crew = crew_instance.crew()
    └─ Override Task Output Files (task.output_file = temp_file_path)
    ↓
[Crew Execution with Timeout]
    ├─ ThreadPoolExecutor(max_workers=1)
    ├─ Submit: future = executor.submit(crew.kickoff, inputs=payload)
    ├─ Wait with Timeout: future.result(timeout=100 seconds)
    └─ Handle TimeoutError / Exception
    ↓
[CrewAI Internal Flow - Hierarchical Process]
    ├─ Manager LLM (gpt-4o-mini) Coordinates Execution
    ├─ [PARALLEL] profile_analysis_task (Agent: profile_analyzer)
    │   └─ Writes: output/profile_analysis.md → {temp_file}_profile_analysis.md
    ├─ [PARALLEL] idea_research_task (Agent: idea_researcher)
    │   └─ Writes: output/startup_ideas_research.md → {temp_file}_startup_ideas_research.md
    └─ [SEQUENTIAL] recommendation_task (Agent: recommendation_advisor)
        ├─ Reads: profile_analysis.md + startup_ideas_research.md
        └─ Writes: output/personalized_recommendations.md → {temp_file}_personalized_recommendations.md
    ↓
[Post-processing]
    ├─ Check File Modification Times (infer task completion)
    ├─ Record Task Metrics (record_task)
    ├─ Read Temp Files with Retry Logic (max_retries=3, progressive backoff)
    ├─ Validate Results (check content length > 100-200 chars)
    └─ Finalize Metrics (finalize_metrics)
    ↓
[Response Generation]
    ├─ Save to Database (UserRun)
    ├─ Increment Usage Counter (user.increment_discovery_usage())
    ├─ Refresh Session Activity
    └─ Return JSON Response with outputs
    ↓
[Cleanup]
    ├─ Delete Temp Files (unlink)
    └─ Periodic Cleanup (1% chance: cleanup_old_temp_files)
```

### 1.2 Key Functions and Files

| Function/Class | File | Purpose |
|---------------|------|---------|
| `run_crew()` | `app/routes/discovery.py:56` | Main endpoint handler |
| `_validate_discovery_inputs()` | `app/utils.py:132` | Input validation |
| `StartupIdeaCrew` | `src/startup_idea_crew/crew.py:26` | CrewAI crew definition |
| `crew.kickoff()` | CrewAI internal | Executes agent tasks |
| `read_output_file()` | `app/utils.py:24` | Legacy file reader (not used in API) |
| `cleanup_old_temp_files()` | `app/utils/output_manager.py:136` | Temp file cleanup |

### 1.3 Pre-processing Details

**Location:** `app/routes/discovery.py:56-171`

1. **Input Sanitization** (lines 64-100)
   - Field max lengths defined per field
   - `sanitize_text()` removes HTML, limits length
   - `validate_text_field()` checks format and content

2. **Default Values** (lines 102-118)
   - If field empty, assign defaults:
     - `goal_type`: "Extra Income"
     - `time_commitment`: "<5 hrs/week"
     - `budget_range`: "Free / Sweat-equity only"
     - `interest_area`: "AI / Automation"
     - `sub_interest_area`: "Chatbots"
     - `work_style`: "Solo"
     - `skill_strength`: "Analytical / Strategic"
     - `experience_summary`: "No detailed experience summary provided."

3. **Usage Limit Check** (lines 125-133)
   - `user.can_perform_discovery()` checks subscription limits
   - Returns `(can_perform: bool, error_message: str)`

4. **Founder Psychology Extraction** (lines 135-154)
   - Reads `user.founder_psychology` (dict or JSON string)
   - Parses JSON if string
   - Adds to `payload["founder_psychology"]`
   - Empty dict for anonymous users

5. **Input Validation** (lines 164-170)
   - `_validate_discovery_inputs()` checks for:
     - Minimum 2 non-default fields
     - Contradictory combinations (full-time goal + low time)
     - Vague experience summaries

### 1.4 Post-processing Details

**Location:** `app/routes/discovery.py:253-393`

1. **Task Timing Inference** (lines 256-293)
   - Uses file modification times to estimate task duration
   - Records metrics via `record_task()`
   - Adjusts recommendation_task start time (after profile + research)

2. **File Reading with Retry** (lines 295-320)
   - Max 3 retries with progressive backoff (0.1s, 0.2s, 0.3s)
   - Handles `OSError`, `IOError`
   - Maps temp files to output keys

3. **Result Validation** (lines 342-372)
   - Checks each output has > 100-200 chars
   - Returns 422 if no valid results

4. **Metrics Finalization** (lines 374-392)
   - Calculates total duration
   - Generates performance report
   - Saves metrics JSON to temp directory

### 1.5 File I/O Architecture

**Temp File Strategy:**
- **Directory:** `{tempfile.gettempdir()}/idea_crew_outputs/`
- **Naming:** `{uuid4().hex[:12]}_{timestamp}_{filename}`
- **Permissions:** `0o700` (secure)
- **Cleanup:** Immediate deletion after read + periodic cleanup (1% chance per request)

**File Mapping:**
```python
{
    'output/profile_analysis.md': '{temp_dir}/{run_file_id}_profile_analysis.md',
    'output/startup_ideas_research.md': '{temp_dir}/{run_file_id}_startup_ideas_research.md',
    'output/personalized_recommendations.md': '{temp_dir}/{run_file_id}_personalized_recommendations.md'
}
```

**Task Output Override:**
- CrewAI tasks define `output_file` in YAML
- Runtime override: `task.output_file = temp_file_path` (line 214)

---

## 2. CREWAI CONFIGURATION

### 2.1 Process Type

**Process:** `Process.hierarchical`  
**Manager LLM:** `"openai/gpt-4o-mini"`  
**Location:** `src/startup_idea_crew/crew.py:106`

**Why Hierarchical:**
- Allows `profile_analysis_task` and `idea_research_task` to run **in parallel**
- `recommendation_task` waits for both to complete (automatic dependency)
- Manager LLM coordinates execution order

### 2.2 Agents Configuration

**File:** `src/startup_idea_crew/config/agents.yaml`

#### Agent 1: profile_analyzer
- **Role:** Strategic Profile Advisor
- **Goal:** Analyze user profile, provide insights (not just repeat inputs)
- **LLM:** `openai/gpt-4o-mini`
- **Max Tokens:** 800
- **Tools:** None (no tools assigned)
- **Key Features:**
  - Must use second-person ("You")
  - Must start with `## 1. Core Motivation` (exact format)
  - Interprets `founder_psychology` data
  - Outputs "Founder Psychology Summary" section for downstream agents

#### Agent 2: idea_researcher
- **Role:** Startup Idea Researcher
- **Goal:** Research and generate 5-8 innovative startup ideas
- **LLM:** `openai/gpt-4o-mini`
- **Max Tokens:** 2000
- **Tools:**
  - `research_market_trends`
  - `analyze_competitors`
  - `estimate_market_size`
  - `validate_startup_idea`
- **Key Features:**
  - Uses tools selectively (only for top 2-3 ideas)
  - Considers `founder_psychology` as optional context
  - Outputs structured research report

#### Agent 3: recommendation_advisor
- **Role:** Startup Recommendation Advisor
- **Goal:** Create personalized recommendations with actionable steps
- **LLM:** `openai/gpt-4o-mini`
- **Max Tokens:** 1500
- **Tools:**
  - `assess_startup_risks`
  - `estimate_startup_costs`
  - `project_revenue`
  - `check_financial_viability`
  - `check_domain_availability`
  - `generate_customer_persona`
  - `generate_validation_questions`
- **Key Features:**
  - Uses tools only for #1 recommended idea (to save time)
  - Receives both raw `founder_psychology` and interpreted psyche signals
  - Personalizes tone, ranking, risk framing, roadmap based on psychology

### 2.3 Tasks Configuration

**File:** `src/startup_idea_crew/config/tasks.yaml`

#### Task 1: profile_analysis_task
- **Agent:** `profile_analyzer`
- **Output File:** `output/profile_analysis.md`
- **Description:** Analyzes user inputs, interprets founder psychology
- **Expected Output:** 8 sections:
  1. Core Motivation
  2. Operating Constraints
  3. Opportunity Within [Interest Area]
  4. Strengths You Can Leverage
  5. Skill Gaps to Fill
  6. Recommendations
  7. **Founder Psychology Summary** (INTERNAL - for downstream agents)
  8. Clarifications Needed

#### Task 2: idea_research_task
- **Agent:** `idea_researcher`
- **Output File:** `output/startup_ideas_research.md`
- **Description:** Researches and generates 5-8 startup ideas
- **Expected Output:**
  - Heading: `### Idea Research Report`
  - Executive Summary
  - Numbered ideas (1-5+) with subsections:
    - Idea Fit Summary
    - Market Opportunity
    - Revenue Model & Financials
    - Resource & Skill Mapping
    - Timeline & Effort
    - Risks & Mitigations
    - Immediate Experiments
  - Validation Backlog section

#### Task 3: recommendation_task
- **Agent:** `recommendation_advisor`
- **Output File:** `output/personalized_recommendations.md`
- **Description:** Creates personalized recommendations ranking top 3 ideas
- **Expected Output:**
  - Heading: `### Comprehensive Recommendation Report`
  - Profile Fit Summary
  - Recommendation Matrix
  - Numbered ideas (1-3) with:
    - Execution path
    - Financial snapshot
    - Key risks & mitigations
  - Financial Outlook
  - **Risk Radar** (idea-specific, not generic)
  - Customer Persona
  - Validation Questions
  - **30/60/90 Day Roadmap** (concrete, actionable, tool-specific)
  - Decision Checklist

### 2.4 Dependencies

**Task Dependencies (Handled by Hierarchical Process):**
```
profile_analysis_task ──┐
                        ├──→ recommendation_task
idea_research_task ─────┘
```

**Agent Dependencies:**
- `recommendation_advisor` reads outputs from:
  - `profile_analyzer` (profile_analysis.md)
  - `idea_researcher` (startup_ideas_research.md)

**Manager LLM Role:**
- Coordinates task execution order
- Manages agent communication
- Ensures dependencies are met before starting `recommendation_task`

---

## 3. TOOL USAGE

### 3.1 Complete Tool List

**File:** `src/startup_idea_crew/tools/__init__.py`

#### Market Research Tools
1. **`research_market_trends`**
   - **File:** `src/startup_idea_crew/tools/market_research_tool.py:60`
   - **Uses LLM:** Yes (OpenAI GPT-4)
   - **Uses Cache:** Yes (7-day TTL)
   - **Uses Domain Research:** Yes (Layer 1)
   - **Accepts user_profile:** Yes
   - **Agent:** `idea_researcher`

2. **`analyze_competitors`**
   - **File:** `src/startup_idea_crew/tools/market_research_tool.py:200+`
   - **Uses LLM:** Yes (OpenAI GPT-4)
   - **Uses Cache:** Yes (7-day TTL)
   - **Uses Domain Research:** Yes (Layer 1)
   - **Accepts user_profile:** Yes
   - **Agent:** `idea_researcher`

3. **`estimate_market_size`**
   - **File:** `src/startup_idea_crew/tools/market_research_tool.py:350+`
   - **Uses LLM:** Yes (OpenAI GPT-4)
   - **Uses Cache:** Yes (7-day TTL)
   - **Uses Domain Research:** Yes (Layer 1)
   - **Accepts user_profile:** Yes
   - **Agent:** `idea_researcher`

#### Validation Tools
4. **`validate_startup_idea`**
   - **File:** `src/startup_idea_crew/tools/validation_tool.py:45`
   - **Uses LLM:** Yes (OpenAI GPT-4)
   - **Uses Cache:** Yes (7-day TTL)
   - **Accepts user_profile:** Yes
   - **Agent:** `idea_researcher`, `recommendation_advisor`

5. **`check_domain_availability`**
   - **File:** `src/startup_idea_crew/tools/validation_tool.py:226+`
   - **Uses LLM:** No (mock implementation)
   - **Uses Cache:** No
   - **Agent:** `recommendation_advisor`

6. **`assess_startup_risks`**
   - **File:** `src/startup_idea_crew/tools/validation_tool.py:300+`
   - **Uses LLM:** Yes (OpenAI GPT-4)
   - **Uses Cache:** Yes (7-day TTL)
   - **Accepts user_profile:** Yes
   - **Agent:** `recommendation_advisor`

#### Financial Tools
7. **`estimate_startup_costs`**
   - **File:** `src/startup_idea_crew/tools/financial_tool.py:39`
   - **Uses LLM:** No (template-based)
   - **Uses Cache:** Yes (7-day TTL)
   - **Agent:** `recommendation_advisor`

8. **`project_revenue`**
   - **File:** `src/startup_idea_crew/tools/financial_tool.py:200+`
   - **Uses LLM:** No (calculation-based)
   - **Uses Cache:** Yes (7-day TTL)
   - **Agent:** `recommendation_advisor`

9. **`check_financial_viability`**
   - **File:** `src/startup_idea_crew/tools/financial_tool.py:350+`
   - **Uses LLM:** No (analysis-based)
   - **Uses Cache:** Yes (7-day TTL)
   - **Agent:** `recommendation_advisor`

#### Customer Tools
10. **`generate_customer_persona`**
    - **File:** `src/startup_idea_crew/tools/customer_tool.py:9`
    - **Uses LLM:** No (template-based)
    - **Uses Cache:** No
    - **Agent:** `recommendation_advisor`

11. **`generate_validation_questions`**
    - **File:** `src/startup_idea_crew/tools/customer_tool.py:150+`
    - **Uses LLM:** No (template-based)
    - **Uses Cache:** No
    - **Agent:** `recommendation_advisor`

### 3.2 Tool Caching Status

| Tool | Cached | TTL | Cache Key Format |
|------|--------|-----|------------------|
| research_market_trends | ✅ | 7 days | `tool_name:{params_hash}` |
| analyze_competitors | ✅ | 7 days | `tool_name:{params_hash}` |
| estimate_market_size | ✅ | 7 days | `tool_name:{params_hash}` |
| validate_startup_idea | ✅ | 7 days | `tool_name:{params_hash}` |
| assess_startup_risks | ✅ | 7 days | `tool_name:{params_hash}` |
| estimate_startup_costs | ✅ | 7 days | `tool_name:{params_hash}` |
| project_revenue | ✅ | 7 days | `tool_name:{params_hash}` |
| check_financial_viability | ✅ | 7 days | `tool_name:{params_hash}` |
| check_domain_availability | ❌ | N/A | N/A |
| generate_customer_persona | ❌ | N/A | N/A |
| generate_validation_questions | ❌ | N/A | N/A |

### 3.3 Tools That Accept user_profile

**Tools that accept `user_profile` parameter:**
- `research_market_trends(topic, market_segment, user_profile)`
- `analyze_competitors(idea, industry, user_profile)`
- `estimate_market_size(idea, target_audience, user_profile)`
- `validate_startup_idea(idea, target_market, business_model, user_profile)`
- `assess_startup_risks(idea, time_commitment, financial_resources, user_profile)`

**user_profile fields used:**
- `budget_range`
- `time_commitment`
- `goal_type`
- `skill_strength`
- `work_style`

**Note:** `founder_psychology` is NOT passed to tools directly. It flows through:
1. `payload["founder_psychology"]` → Agent prompts (via YAML template variables)
2. Profile analysis task interprets it → Outputs "Founder Psychology Summary"
3. Recommendation task reads interpreted signals

### 3.4 Tools That Call External APIs

**None.** All tools use:
- OpenAI API (via `_get_openai_client()`)
- Template-based responses (financial, customer tools)
- Domain research JSON files (Layer 1 shared facts)

**Mock Implementations:**
- `check_domain_availability`: Returns mock "available" response

---

## 4. FOUNDER PSYCHOLOGY INTEGRATION

### 4.1 Entry Point

**Location:** `app/routes/discovery.py:135-154`

```python
# PART A: Pass founder_psychology into Discovery pipeline
founder_psychology = {}
if hasattr(user, 'founder_psychology') and user.founder_psychology:
    if isinstance(user.founder_psychology, dict):
        founder_psychology = user.founder_psychology
    elif isinstance(user.founder_psychology, str):
        # Parse JSON string
        founder_psychology = json.loads(user.founder_psychology)
    
payload["founder_psychology"] = founder_psychology
```

**Storage:** `User.founder_psychology` (attribute - may be JSON column or computed property)
**Note:** Not found in User model schema. Likely stored as JSON in database or computed from related data.

### 4.2 Data Structure

**Expected Format:**
```python
{
    "motivation_primary": "security" | "freedom" | "extra income" | ...,
    "motivation_secondary": "stability" | "independence" | "" | ...,
    "biggest_fear": "failure" | "moving too slowly" | "overcommitting" | ...,
    "decision_style": "fast" | "slow",
    "energy_pattern": "short bursts" | "steady" | "low",
    "constraints": "time" | "money" | "job + family" | "" | ...,
    "success_definition": "stable recurring income" | "speed and growth" | "earn without burnout" | ...
}
```

### 4.3 Flow Through Pipeline

#### Step 1: Profile Analysis Task
**Location:** `src/startup_idea_crew/config/tasks.yaml:31`

- Receives: `{founder_psychology}` as template variable
- Task description includes: "Founder Psychology: {founder_psychology}"
- Agent goal includes: "founder_psychology {founder_psychology}"

**Output Section 7:** "Founder Psychology Summary (INTERNAL)"
- Interprets raw psychology data
- Produces structured insights:
  - `psyche_summary`
  - `execution_tendencies`
  - `risk_reactivity`
  - `confidence_signals`
  - `ideal_work_patterns`

#### Step 2: Idea Research Task
**Location:** `src/startup_idea_crew/config/tasks.yaml:186`

- Receives: `{founder_psychology}` as optional context
- Description: "Consider founder psychology factors: {founder_psychology} (optional context for idea generation)"
- **Note:** Less emphasis here - mainly for idea filtering

#### Step 3: Recommendation Task
**Location:** `src/startup_idea_crew/config/tasks.yaml:239, 293-304`

- Receives:
  1. Raw `{founder_psychology}` (template variable)
  2. Interpreted psyche signals (from profile_analysis_task Section 7)

**Behavioral Rules Applied:**
- If `biggest_fear = "fear of failure"`: Emphasize safe validation, quick wins
- If `decision_style = "fast"`: Roadmap tasks short, crisp, action-heavy
- If `decision_style = "slow"`: Include checkpoints, reflection tasks
- If `energy_pattern = "short bursts"`: Break tasks into smaller blocks
- If `constraints` include time/money: Prioritize lean tasks early

**Personalization Areas:**
1. **Idea Ranking:** Based on founder fit (psychological profile match)
2. **Tone:** Match `decision_style`, `energy_pattern`, `motivation_primary`
3. **Risk Framing:** Based on `biggest_fear`
4. **Roadmap Pacing:** Based on `energy_pattern` and `decision_style`
5. **Strengths Emphasis:** Align with `motivation_primary` and `motivation_secondary`

### 4.4 Agent Prompts Integration

**profile_analyzer (agents.yaml:12):**
```
Translate ... founder_psychology {founder_psychology} into practical, execution-focused insights
```

**recommendation_advisor (agents.yaml:75-98):**
```
You will receive:
- founder_psychology: Raw psychology data (motivation_primary, motivation_secondary, biggest_fear, decision_style, energy_pattern, constraints, success_definition)
- profile_analysis interpreted psyche signals: Processed psychology insights from profile_analysis_task

Use these signals to:
- Rank ideas based on founder fit
- Personalize tone and narrative
- Highlight risks based on fears
- Emphasize strengths and motivations
- Adjust execution pacing using energy_pattern
- Tailor roadmap steps using decision_style
- Respect constraints
- Explain why each idea uniquely fits this founder
```

---

## 5. CACHING INFRASTRUCTURE

### 5.1 ToolCache Class

**File:** `app/utils/tool_cache.py`

**Purpose:** Cache tool results in PostgreSQL database to reduce LLM API calls

**Database Table:** `tool_cache` (ToolCacheEntry model)

**Schema:**
```python
- id: Integer (primary key)
- cache_key: String(255), unique, indexed
- tool_name: String(100), indexed
- tool_params: Text (JSON string)
- result: Text (cached result)
- hit_count: Integer, indexed
- created_at: DateTime, indexed
- expires_at: DateTime, indexed
```

### 5.2 Cache Key Generation

**Method:** `ToolCache._generate_cache_key(tool_name, **params)`

**Algorithm:**
1. Normalize parameters:
   - Sort keys
   - Convert values to strings, strip whitespace
   - Skip None values
   - Skip empty strings
2. Create JSON: `json.dumps(normalized_params, sort_keys=True)`
3. Hash: `hashlib.sha256(params_json.encode('utf-8')).hexdigest()[:16]`
4. Format: `"{tool_name}:{params_hash}"`

**Example:**
```python
research_market_trends(topic="AI chatbots", market_segment="SaaS")
→ "research_market_trends:a3f5b2c1d4e6f7g8"
```

### 5.3 Cache Operations

#### Get Cache
```python
ToolCache.get(tool_name, **params) -> Optional[str]
```
- Generates cache key
- Queries `ToolCacheEntry` where `cache_key` matches AND `expires_at > now()`
- Increments `hit_count` if found
- Returns cached result or `None`

#### Set Cache
```python
ToolCache.set(tool_name, result, ttl_days=7, **params)
```
- Generates cache key
- Creates or updates `ToolCacheEntry`
- Sets `expires_at = now() + timedelta(days=ttl_days)`
- Default TTL: 7 days

### 5.4 Tools Using Caching

**All LLM-based tools use caching:**
- `research_market_trends` (7-day TTL)
- `analyze_competitors` (7-day TTL)
- `estimate_market_size` (7-day TTL)
- `validate_startup_idea` (7-day TTL)
- `assess_startup_risks` (7-day TTL)

**Template-based tools also cached:**
- `estimate_startup_costs` (7-day TTL)
- `project_revenue` (7-day TTL)
- `check_financial_viability` (7-day TTL)

**Not Cached:**
- `check_domain_availability` (mock, fast)
- `generate_customer_persona` (template, fast)
- `generate_validation_questions` (template, fast)

### 5.5 Cache Bypass Conditions

**Cache is bypassed if:**
1. Flask app context not available (`has_app_context() == False`)
2. Cache lookup fails (exception caught, returns `None`)
3. Cache entry expired (`expires_at <= now()`)
4. Cache entry not found

**Cache is NOT bypassed for:**
- Different user profiles (cache key includes params, so different profiles = different keys)
- Different tool parameters (normalized into cache key)

### 5.6 Cache Performance Tracking

**Metrics Collected:**
- `total_cache_hits` (incremented on cache hit)
- `total_cache_misses` (incremented on cache miss)
- `cache_hit_rate` (calculated: `hits / (hits + misses) * 100`)

**Location:** `app/utils/performance_metrics.py:242-256`

---

## 6. PERFORMANCE MECHANISMS

### 6.1 Parallelization

#### Task-Level Parallelization
**Location:** `src/startup_idea_crew/crew.py:106`

- **Process:** `Process.hierarchical`
- **Effect:** `profile_analysis_task` and `idea_research_task` run in parallel
- **Coordination:** Manager LLM (gpt-4o-mini) handles dependencies

#### Tool-Level Parallelization (NOT CURRENTLY USED)
**File:** `src/startup_idea_crew/parallel_executor.py`

**Functions:**
- `pre_execute_idea_research_tools()`: Executes 4 tools in parallel (ThreadPoolExecutor, max_workers=4)
- `pre_execute_recommendation_tools()`: Executes 5 tools in parallel (ThreadPoolExecutor, max_workers=5)

**Status:** **NOT INTEGRATED** - File exists but is not called by discovery.py or crew.py

**Potential:** Could reduce execution time by 30-40% if integrated

### 6.2 Threading

#### Crew Execution Timeout
**Location:** `app/routes/discovery.py:224-251`

- Uses `ThreadPoolExecutor(max_workers=1)` to add timeout to `crew.kickoff()`
- Timeout: 100 seconds (buffer before 120s frontend timeout)
- Handles `TimeoutError` gracefully
- Shuts down executor on timeout/error

#### Enhancement Generation (Parallel)
**Location:** `app/routes/discovery.py:706-727`

- Uses `ThreadPoolExecutor(max_workers=7)` for `/api/enhance-report`
- Executes 7 enhancement functions in parallel:
  1. Enhanced financial
  2. Enhanced risk radar
  3. Competitive analysis
  4. Market intelligence
  5. Success metrics
  6. Tool stack
  7. Validation plan

### 6.3 Async Work

**None.** All operations are synchronous.

### 6.4 Batching of LLM Calls

**None.** Each tool call is independent. No batching implemented.

**Potential:** Could batch multiple tool calls into single LLM request if tools accept arrays.

### 6.5 Timing and Metrics Decorators

**Performance Metrics System:**
**File:** `app/utils/performance_metrics.py`

**Functions:**
- `start_metrics_collection(run_id)`: Initializes `DiscoveryMetrics`
- `record_tool_call(tool_name, duration, cache_hit, cache_miss, params)`: Records tool metrics
- `record_task(task_name, duration, start_time, end_time)`: Records task metrics
- `finalize_metrics(total_duration)`: Calculates final metrics, generates report

**Metrics Collected:**
- Total duration
- Task durations (profile_analysis, idea_research, recommendation_task)
- Tool call durations
- Cache hit/miss counts
- Cache hit rate
- Bottleneck analysis

**Report Generation:**
- Human-readable diagnostic report
- Saved to JSON file: `{temp_dir}/idea_crew_metrics/metrics_{run_id}.json`

### 6.6 Retry Logic

#### File Reading Retry
**Location:** `app/routes/discovery.py:295-312`

- Max retries: 3
- Progressive backoff: `0.1 * (attempt + 1)` seconds
- Handles `OSError`, `IOError`
- For high-concurrency scenarios (file might not be ready yet)

#### Session Creation Retry
**Location:** `app/utils.py:36-77`

- Max retries: 3
- Retries on token collision (unique constraint violation)
- Generates new token on each retry

**No retry logic for:**
- LLM API calls (handled by OpenAI SDK if configured)
- Database queries (handled by SQLAlchemy connection pooling)
- Tool execution (failures propagate to agent)

---

## 7. OUTPUT ARCHITECTURE

### 7.1 How Outputs Are Written

**CrewAI Task Output Mechanism:**
1. Task defines `output_file` in YAML config
2. CrewAI agent writes to `task.output_file` when task completes
3. Runtime override: `task.output_file = temp_file_path` (discovery.py:214)
4. Agent writes directly to temp file (UTF-8 encoding)

**File Paths:**
- **Original (YAML):** `output/profile_analysis.md`
- **Runtime (Temp):** `{temp_dir}/{run_file_id}_profile_analysis.md`

### 7.2 How Outputs Are Read Back

**Location:** `app/routes/discovery.py:295-320`

1. **Read with Retry:**
   ```python
   for attempt in range(max_retries):
       if temp_file_path.exists():
           content = temp_file_path.read_text(encoding='utf-8')
           break
       else:
           time.sleep(0.1 * (attempt + 1))  # Progressive backoff
   ```

2. **Map to Output Keys:**
   ```python
   if filename == 'profile_analysis.md':
       outputs["profile_analysis"] = content
   elif filename == 'startup_ideas_research.md':
       outputs["startup_ideas_research"] = content
   elif filename == 'personalized_recommendations.md':
       outputs["personalized_recommendations"] = content
   ```

### 7.3 How Final Files Are Selected

**No selection needed.** All 3 files are always read:
- `profile_analysis.md`
- `startup_ideas_research.md`
- `personalized_recommendations.md`

**Validation:** Each output must have > 100-200 chars or request fails (422).

### 7.4 Where Parsing Happens

**Frontend Parsing:**
- Markdown parsing: `react-markdown` library
- Section extraction: Frontend components parse markdown headings
- No backend parsing of markdown content

**Backend Validation:**
- Content length check (lines 346-362)
- No structured parsing (treats as text)

### 7.5 Where Cleanup Happens

**Immediate Cleanup:**
**Location:** `app/routes/discovery.py:322-340`

```python
finally:
    # Always cleanup temp files, even on errors
    for temp_file_path in cleanup_files:
        if temp_file_path.exists():
            temp_file_path.unlink()
```

**Periodic Cleanup:**
**Location:** `app/routes/discovery.py:333-340`

- 1% chance per request (random.random() < 0.01)
- Calls `cleanup_old_temp_files(max_age_hours=1)`
- Removes files older than 1 hour from `{temp_dir}/idea_crew_outputs/`

**Cleanup Function:**
**Location:** `app/utils/output_manager.py:136-187`

- Scans temp directory
- Removes files older than `max_age_hours`
- Logs cleanup stats (count, size)

---

## 8. TESTING HOOKS

### 8.1 Mock Injection Points

#### OpenAI Client Mock
**Location:** `src/startup_idea_crew/tools/market_research_tool.py:45-57`
**Location:** `src/startup_idea_crew/tools/validation_tool.py:30-42`

```python
# Injectable mock client for testing (set via monkeypatch)
_MOCK_OPENAI_CLIENT = None

def _get_openai_client() -> OpenAI:
    """Get OpenAI client with API key from environment or injected mock."""
    if _MOCK_OPENAI_CLIENT is not None:
        return _MOCK_OPENAI_CLIENT
    # ... normal client creation
```

**Usage in Tests:**
```python
monkeypatch.setattr('startup_idea_crew.tools.market_research_tool._MOCK_OPENAI_CLIENT', mock_client)
monkeypatch.setattr('startup_idea_crew.tools.validation_tool._MOCK_OPENAI_CLIENT', mock_client)
```

### 8.2 LLM Wrapper Functions

**None.** Direct OpenAI client usage:
- `OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))`
- `client.chat.completions.create(...)`

**No abstraction layer** - would need to be added for easier mocking.

### 8.3 Environment Toggles for Test Mode

**Rate Limiting Disable:**
**Location:** Test fixtures (e.g., `tests/integration/test_auth_integration.py`)

```python
def mock_apply_rate_limit(limit_string):
    return no_op_decorator

monkeypatch.setattr('app.routes.discovery.apply_rate_limit', mock_apply_rate_limit)
```

**Database Test Mode:**
- Uses in-memory SQLite: `'sqlite:///:memory:'`
- Set in test fixtures: `app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'`

**No explicit TEST_MODE flag** - tests patch individual components.

---

## 9. CURRENT KNOWN PROBLEMS

### 9.1 Performance Bottlenecks

#### 1. Sequential Tool Execution
**Problem:** Tools are called sequentially by agents, not in parallel
**Impact:** Adds 30-40% execution time
**Solution Available:** `parallel_executor.py` exists but not integrated
**Location:** `src/startup_idea_crew/parallel_executor.py`

#### 2. Manager LLM Overhead
**Problem:** Hierarchical process uses manager LLM (gpt-4o-mini) for coordination
**Impact:** Additional LLM call overhead
**Mitigation:** Manager uses cheaper model (gpt-4o-mini vs gpt-4)

#### 3. No Tool Batching
**Problem:** Each tool call is separate LLM request
**Impact:** Multiple round trips to OpenAI API
**Potential:** Batch multiple tool calls if OpenAI supports it

#### 4. Cache Hit Rate Unknown
**Problem:** No monitoring of cache effectiveness in production
**Impact:** May be missing optimization opportunities
**Solution:** Metrics collected but not analyzed regularly

### 9.2 Warnings from Cursor

**None documented in code.** However, based on architecture:

1. **Temp File Cleanup:** 1% chance cleanup may not be sufficient for 1000+ concurrent users
2. **No Connection Pooling:** Database connections may bottleneck under high load
3. **Synchronous Operations:** All operations are sync, blocking event loop

### 9.3 Refactors Postponed

#### 1. Parallel Tool Execution Integration
**Status:** Code exists (`parallel_executor.py`) but not integrated
**Reason:** Requires changes to CrewAI task execution flow
**Complexity:** Medium

#### 2. LLM Abstraction Layer
**Status:** Direct OpenAI client usage throughout
**Reason:** Would require refactoring all tools
**Complexity:** High

#### 3. Async/Await Migration
**Status:** All operations synchronous
**Reason:** Would require major refactor of Flask routes and CrewAI integration
**Complexity:** Very High

#### 4. Domain Research Pre-computation
**Status:** Layer 1 (domain research) exists but may not be fully utilized
**Reason:** Requires ensuring all tools check domain research before LLM calls
**Complexity:** Low-Medium

---

## 10. ARCHITECTURE DIAGRAM

### 10.1 Discovery Pipeline Sequence Diagram

```
┌─────────────┐
│   Client    │
│  (Frontend) │
└──────┬──────┘
       │ POST /api/run
       │ {inputs, founder_psychology}
       ▼
┌─────────────────────────────────────┐
│   Flask Route: run_crew()          │
│   app/routes/discovery.py           │
├─────────────────────────────────────┤
│ 1. Validate & Sanitize Inputs      │
│ 2. Check Usage Limits               │
│ 3. Extract founder_psychology       │
│ 4. Create Temp Files                │
│ 5. Start Metrics Collection         │
└──────┬──────────────────────────────┘
       │
       │ Initialize CrewAI
       ▼
┌─────────────────────────────────────┐
│   StartupIdeaCrew.crew()            │
│   Process: hierarchical              │
│   Manager LLM: gpt-4o-mini          │
└──────┬──────────────────────────────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
       ▼                 ▼                 │
┌──────────────┐  ┌──────────────┐        │
│   Manager    │  │   Manager    │        │
│     LLM      │  │     LLM      │        │
│ Coordinates  │  │ Coordinates  │        │
└──────┬───────┘  └──────┬───────┘        │
       │                 │                 │
       ▼                 ▼                 │
┌─────────────────┐ ┌─────────────────┐  │
│ profile_analysis │ │ idea_research    │  │
│     _task       │ │     _task        │  │
│                 │ │                 │  │
│ Agent:          │ │ Agent:          │  │
│ profile_analyzer│ │ idea_researcher │  │
│                 │ │                 │  │
│ LLM: gpt-4o-mini│ │ LLM: gpt-4o-mini│  │
│ Tools: None     │ │ Tools: 4 tools  │  │
│                 │ │ (with caching)  │  │
└────────┬────────┘ └────────┬────────┘  │
         │                   │            │
         │ Write File        │ Write File │
         ▼                   ▼            │
    {temp}_profile      {temp}_research   │
         │                   │            │
         └─────────┬─────────┘            │
                   │                      │
                   │ Both Complete        │
                   ▼                      │
         ┌──────────────────┐            │
         │   Manager LLM     │            │
         │   Coordinates    │            │
         └─────────┬────────┘            │
                   │                      │
                   ▼                      │
         ┌──────────────────┐            │
         │ recommendation_ │            │
         │     _task        │            │
         │                  │            │
         │ Agent:           │            │
         │ recommendation_ │            │
         │ advisor          │            │
         │                  │            │
         │ LLM: gpt-4o-mini │            │
         │ Tools: 7 tools    │            │
         │ (with caching)   │            │
         │                  │            │
         │ Reads:            │            │
         │ - profile_analysis│            │
         │ - idea_research  │            │
         │                  │            │
         │ Uses:             │            │
         │ - founder_psychology│          │
         │ - psyche signals  │            │
         └─────────┬────────┘            │
                   │                      │
                   │ Write File           │
                   ▼                      │
              {temp}_recommendations      │
                   │                      │
                   └──────────────────────┘
                           │
                           │ All Tasks Complete
                           ▼
┌─────────────────────────────────────┐
│   Post-Processing                    │
├─────────────────────────────────────┤
│ 1. Read Temp Files (with retry)     │
│ 2. Validate Results                 │
│ 3. Record Metrics                   │
│ 4. Save to Database (UserRun)        │
│ 5. Increment Usage Counter          │
│ 6. Cleanup Temp Files                │
└──────┬──────────────────────────────┘
       │
       │ JSON Response
       ▼
┌─────────────┐
│   Client    │
│  (Frontend) │
└─────────────┘
```

### 10.2 Tool Execution Flow (with Caching)

```
Agent Calls Tool
       │
       ▼
┌──────────────────┐
│  Tool Function   │
│  (e.g., research │
│   _market_trends)│
└────────┬─────────┘
         │
         │ Check Cache
         ▼
    ┌─────────┐
    │ ToolCache│
    │  .get() │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Cache Hit  Cache Miss
    │         │
    │         ├─→ Generate Cache Key
    │         │   (tool_name + params hash)
    │         │
    │         ├─→ Query Database
    │         │   (ToolCacheEntry)
    │         │
    │         ├─→ Check Expiration
    │         │
    │         └─→ Return Cached Result
    │             OR
    │             Continue to LLM Call
    │
    │         │
    │         ▼
    │    ┌─────────────┐
    │    │ OpenAI API  │
    │    │   Call      │
    │    └─────┬───────┘
    │          │
    │          ▼
    │    ┌─────────────┐
    │    │   Result    │
    │    └─────┬───────┘
    │          │
    │          ▼
    │    ┌─────────────┐
    │    │ ToolCache   │
    │    │  .set()     │
    │    │  (TTL: 7d)  │
    │    └─────┬───────┘
    │          │
    └──────────┘
         │
         ▼
    Return Result to Agent
```

### 10.3 Founder Psychology Flow

```
User.founder_psychology (Database)
         │
         ▼
┌──────────────────────┐
│ discovery.py:151     │
│ Extract & Parse      │
└──────────┬───────────┘
           │
           ▼
    payload["founder_psychology"]
           │
           ├──────────────────┬──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ profile_analysis │ │ idea_research    │ │ recommendation   │
│     _task        │ │     _task        │ │     _task        │
│                  │ │                  │ │                  │
│ Receives:        │ │ Receives:        │ │ Receives:        │
│ {founder_        │ │ {founder_        │ │ {founder_        │
│  psychology}     │ │  psychology}    │ │  psychology}     │
│                  │ │ (optional)       │ │                  │
│                  │ │                  │ │ + Interpreted    │
│ Interprets:      │ │                  │ │  psyche signals  │
│ - motivation     │ │ Uses for:        │ │ (from profile    │
│ - fears          │ │ - Idea filtering │ │  analysis)       │
│ - decision style │ │                  │ │                  │
│ - energy pattern │ │                  │ │ Uses for:        │
│ - constraints    │ │                  │ │ - Ranking        │
│                  │ │                  │ │ - Tone           │
│ Outputs:         │ │                  │ │ - Risk framing   │
│ Section 7:       │ │                  │ │ - Roadmap pacing │
│ "Founder         │ │                  │ │ - Strengths      │
│ Psychology       │ │                  │ │                  │
│ Summary"         │ │                  │ │                  │
│ (INTERNAL)       │ │                  │ │                  │
└────────┬─────────┘ └──────────────────┘ └──────────────────┘
         │
         │
         ▼
    Markdown File
    (Section 7)
         │
         │ Read by recommendation_task
         ▼
    Interpreted Psyche Signals
    (execution_tendencies, risk_reactivity, etc.)
```

---

## 11. AUTHENTICATION SYSTEM

### 11.1 All /api/auth Routes

**File:** `app/routes/auth.py`

| Route | Method | Auth Required | Rate Limit | Purpose |
|-------|--------|---------------|------------|---------|
| `/api/auth/register` | POST | No | 3/hour | Register new user |
| `/api/auth/login` | POST | No | 5/minute | Login user |
| `/api/auth/logout` | POST | Yes | None | Logout user |
| `/api/auth/me` | GET | Yes | None | Get current user |
| `/api/auth/forgot-password` | POST | No | 3/hour | Request password reset |
| `/api/auth/reset-password` | POST | No | 3/hour | Reset password with token |
| `/api/auth/change-password` | POST | Yes | 5/hour | Change password (requires current) |

### 11.2 Token/Session Logic

**Session Model:** `UserSession` (app/models/database.py:497)

**Fields:**
- `session_token`: String(255), unique, indexed
- `user_id`: Foreign key to users
- `created_at`: DateTime
- `expires_at`: DateTime, indexed (7 days from creation)
- `last_activity`: DateTime (updated on each request)
- `ip_address`: String(45)
- `user_agent`: String(255)

**Session Creation:**
**Location:** `app/utils.py:36-77`

```python
def create_user_session(user_id, ip_address, user_agent):
    session_token = secrets.token_urlsafe(32)  # 32 bytes = 43 chars URL-safe
    expires_at = utcnow() + timedelta(days=7)
    # Retry on token collision (max 3 times)
```

**Session Validation:**
**Location:** `app/models/database.py:518-536`

```python
def is_valid(self) -> bool:
    # Check expiration
    if now >= expires_at:
        return False
    # Check inactivity timeout (15 minutes)
    if time_since_activity > timedelta(minutes=15):
        return False
    return True
```

**Session Retrieval:**
**Location:** `app/utils.py:80-107`

```python
def get_current_session():
    # Extract Bearer token from Authorization header
    token = auth_header.replace("Bearer ", "").strip()
    session = UserSession.query.filter_by(session_token=token).first()
    if session and session.is_valid():
        session.last_activity = utcnow()  # Refresh activity
        return session
    return None
```

### 11.3 User Model Fields Related to Auth

**File:** `app/models/database.py:30-494`

**Auth Fields:**
- `id`: Integer (primary key)
- `email`: String(255), unique, indexed
- `password_hash`: String(255) (Werkzeug bcrypt hash)
- `created_at`: DateTime
- `is_active`: Boolean, indexed (account status)

**Password Methods:**
- `set_password(password)`: Hashes and stores password
- `check_password(password)`: Verifies password against hash
- `generate_reset_token()`: Creates password reset token
- `verify_reset_token(token)`: Validates reset token
- `clear_reset_token()`: Clears reset token after use

**Reset Token Fields:**
- `reset_token`: String(255), nullable
- `reset_token_expires_at`: DateTime, nullable (1 hour TTL)

### 11.4 Middleware/Decorators

**@require_auth Decorator:**
**Location:** `app/utils.py:110-129`

```python
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session = get_current_session()
        if not session:
            return jsonify({"success": False, "error": "Authentication required"}), 401
        if not session.user.is_subscription_active():
            return jsonify({"success": False, "error": "Subscription expired"}), 403
        return f(*args, **kwargs)
    return decorated_function
```

**Usage:**
```python
@bp.post("/api/run")
@require_auth
def run_crew():
    # ... handler code
```

### 11.5 Session Expiration

**Expiration Types:**
1. **Absolute Expiration:** 7 days from creation (`expires_at`)
2. **Inactivity Timeout:** 15 minutes since `last_activity`

**Expiration Check:**
- Performed in `UserSession.is_valid()`
- Also checked in `get_current_session()` before returning session

**Session Refresh:**
- `last_activity` updated on every authenticated request
- `expires_at` NOT automatically extended (fixed 7-day window)

### 11.6 Password Reset Logic

**Flow:**
1. **Request Reset:** `POST /api/auth/forgot-password`
   - Validates email
   - Generates token: `user.generate_reset_token()` (1-hour TTL)
   - Sends email with reset link
   - Returns success (doesn't reveal if email exists)

2. **Reset Password:** `POST /api/auth/reset-password`
   - Validates token: `user.verify_reset_token(token)`
   - Validates new password
   - Sets new password: `user.set_password(new_password)`
   - Clears token: `user.clear_reset_token()`
   - Sends confirmation email

**Token Security:**
- Token: `secrets.token_urlsafe(32)` (43 characters)
- Expires: 1 hour
- Single-use (cleared after use)
- Constant-time comparison: `secrets.compare_digest()`

---

## 12. BILLING + PRICING

### 12.1 Stripe Integration

**Payment Routes:**
**File:** `app/routes/payment.py`

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/payment/create-intent` | POST | Yes | Create Stripe PaymentIntent |
| `/api/payment/confirm` | POST | Yes | Confirm payment and activate subscription |
| `/api/webhooks/stripe` | POST | No | Handle Stripe webhook events |

**Payment Intent Creation:**
**Location:** `app/routes/payment.py:498-576`

```python
intent = stripe.PaymentIntent.create(
    amount=amount_cents,
    currency="usd",
    metadata={
        "user_id": str(user.id),
        "subscription_type": subscription_type,
        "duration_days": str(duration_days),
    },
)
```

**Payment Confirmation:**
**Location:** `app/routes/payment.py:579-692`

1. Verify PaymentIntent status (`intent.status == "succeeded"`)
2. Check for duplicate processing
3. Activate subscription: `user.activate_subscription(subscription_type, duration_days)`
4. Record payment in database
5. Send activation email

**Webhook Handler:**
**Location:** `app/routes/payment.py:695-840`

**Events Handled:**
- `payment_intent.succeeded`: Activate subscription, send email
- `payment_intent.payment_failed`: Mark payment failed, send failure email

**Idempotency:**
- Checks `StripeEvent` table for `stripe_event_id`
- Prevents duplicate processing

### 12.2 Subscription Model

**User Fields:**
- `subscription_type`: String(50), indexed
  - Values: `"free"`, `"free_trial"`, `"starter"`, `"pro"`, `"annual"`
- `subscription_started_at`: DateTime
- `subscription_expires_at`: DateTime, indexed
- `payment_status`: String(50), indexed
  - Values: `"trial"`, `"active"`, `"expired"`, `"cancelled"`

**Subscription Tiers:**
**File:** `app/constants.py:11-29`

```python
SUBSCRIPTION_DURATIONS = {
    "starter": 30,    # days
    "pro": 30,        # days
    "annual": 365,    # days
    "free_trial": 3,  # days
}

SUBSCRIPTION_PRICES = {
    "starter": 900,   # $9.00/month (cents)
    "pro": 1500,      # $15.00/month (cents)
    "annual": 12000,  # $120.00/year (cents)
}
```

### 12.3 Entitlement Checks

**Usage Limits by Tier:**
**File:** `app/models/database.py:224-310`

#### Validations:
- **Free:** 2 lifetime validations
- **Starter:** 20/month
- **Pro/Annual:** Unlimited

#### Discoveries:
- **Free:** 4 lifetime discoveries
- **Starter:** 10/month
- **Pro/Annual:** Unlimited

#### Connections:
- **Free:** 3/month
- **Starter:** 15/month
- **Pro/Annual:** 999/month (effectively unlimited)

**Check Methods:**
- `user.can_perform_validation()` → `(bool, error_message)`
- `user.can_perform_discovery()` → `(bool, error_message)`
- `user.can_send_connection_request()` → `(bool, error_message)`

**Usage Tracking:**
- `free_validations_used`: Integer (lifetime, free tier)
- `free_discoveries_used`: Integer (lifetime, free tier)
- `monthly_validations_used`: Integer (current month, starter/pro)
- `monthly_discoveries_used`: Integer (current month, starter/pro)
- `monthly_connections_used`: Integer (current month, all tiers)
- `usage_reset_date`: Date (first of next month)

**Monthly Reset:**
**Location:** `app/models/database.py:207-222`

- `check_and_reset_monthly_usage()` called before usage checks
- Resets counters if `date.today() >= usage_reset_date`
- Sets next reset date to first of next month

### 12.4 How Free vs Paid Usage is Enforced

**Enforcement Points:**

1. **Discovery Endpoint:**
   **Location:** `app/routes/discovery.py:125-133`
   ```python
   can_discover, error_message = user.can_perform_discovery()
   if not can_discover:
       return jsonify({
           "success": False,
           "error": error_message,
           "usage_limit_reached": True,
           "upgrade_required": True,
       }), 403
   ```

2. **Validation Endpoint:**
   (Similar check in validation route)

3. **Connection Request:**
   (Similar check in founder connect route)

**Increment Methods:**
- `user.increment_discovery_usage()` (called after successful discovery)
- `user.increment_validation_usage()` (called after successful validation)
- `user.increment_connection_usage()` (called after connection request sent)

**Subscription Status Check:**
**Location:** `app/models/database.py:91-177`

```python
def is_subscription_active(self) -> bool:
    # Free tier: always active
    if subscription_type == "free":
        return True
    # Paid tiers: check expiration
    return now < subscription_expires_at
```

**Also checked in `@require_auth` decorator:**
- Returns 403 if subscription not active

---

## 13. FRONTEND ARCHITECTURE

### 13.1 Navigation Structure

**File:** `frontend/src/App.jsx:58-74`

#### Primary Navigation Links:
```javascript
const primaryNavLinks = [
  { label: "Product", to: "/product" },
  { label: "Pricing", to: "/pricing" },
];
```

#### Learn Menu (Dropdown):
```javascript
const learnNavLinks = [
  { label: "Resources", to: "/resources" },
  { label: "Blog", to: "/blog" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];
```

#### Reports Menu (Conditional - shown when reports exist):
```javascript
const reportNavLinks = [
  { label: "Profile Summary", to: "/results/profile" },
  { label: "Top Recommendations", to: "/results/recommendations" },
  { label: "Full Recommendation", to: "/results/recommendations/full" },
];
```

### 13.2 Pages

**Public Pages:**
- `/` - LandingPage (`frontend/src/pages/public/Landing.jsx`)
- `/product` - ProductPage (`frontend/src/pages/public/Product.jsx`)
- `/pricing` - PricingPage (`frontend/src/pages/public/Pricing.jsx`)
- `/about` - AboutPage (`frontend/src/pages/public/About.jsx`)
- `/contact` - ContactPage (`frontend/src/pages/public/Contact.jsx`)
- `/privacy` - PrivacyPage (`frontend/src/pages/public/Privacy.jsx`)
- `/terms` - TermsPage (`frontend/src/pages/public/Terms.jsx`)

**Discovery Pages:**
- `/home` - HomePage (intake form) (`frontend/src/pages/discovery/Home.jsx`)
- `/results/profile` - ProfileReport (`frontend/src/pages/discovery/ProfileReport.jsx`)
- `/results/recommendations` - RecommendationsReport (`frontend/src/pages/discovery/RecommendationsReport.jsx`)
- `/results/recommendations/full` - RecommendationFullReport (lazy loaded) (`frontend/src/pages/discovery/RecommendationFullReport.jsx`)
- `/results/recommendations/:ideaId` - RecommendationDetail (`frontend/src/pages/discovery/RecommendationDetail.jsx`)

**Validation Pages:**
- `/validate` - IdeaValidator (`frontend/src/pages/validation/IdeaValidator.jsx`)
- `/validation/:id` - ValidationResult (`frontend/src/pages/validation/ValidationResult.jsx`)

**Dashboard Pages:**
- `/dashboard` - DashboardPage (`frontend/src/pages/dashboard/Dashboard.jsx`)
- `/dashboard/compare` - CompareSessionsPage (`frontend/src/pages/dashboard/CompareSessionsPage.jsx`)
- `/dashboard/analytics` - AnalyticsPage (lazy loaded) (`frontend/src/pages/dashboard/Analytics.jsx`)
- `/dashboard/account` - AccountPage (lazy loaded) (`frontend/src/pages/dashboard/Account.jsx`)

**Founder Connect:**
- `/founder-connect` - FounderConnectPage (`frontend/src/pages/founder/FounderConnect.jsx`)

**Auth Pages:**
- `/register` - RegisterPage (`frontend/src/pages/auth/Register.jsx`)
- `/login` - LoginPage (`frontend/src/pages/auth/Login.jsx`)
- `/forgot-password` - ForgotPasswordPage (`frontend/src/pages/auth/ForgotPassword.jsx`)
- `/reset-password` - ResetPasswordPage (`frontend/src/pages/auth/ResetPassword.jsx`)

**Admin Pages:**
- `/admin` - AdminPage (lazy loaded) (`frontend/src/pages/admin/Admin.jsx`)
- `/admin/forgot-password` - AdminForgotPasswordPage (lazy loaded)
- `/admin/reset-password` - AdminResetPasswordPage (lazy loaded)

**Resources Pages:**
- `/resources` - ResourcesPage (`frontend/src/pages/resources/Resources.jsx`)
- `/blog` - BlogPage (`frontend/src/pages/resources/Blog.jsx`)
- `/frameworks` - FrameworksPage (`frontend/src/pages/resources/Frameworks.jsx`)

### 13.3 Dynamic Routing Config

**File:** `frontend/src/App.jsx:735-850`

**Route Structure:**
```javascript
<Routes>
  {/* Public Routes */}
  <Route path="/" element={<LandingPage />} />
  <Route path="/product" element={<ProductPage />} />
  <Route path="/pricing" element={<PricingPage />} />
  {/* ... other public routes */}
  
  {/* Protected Routes */}
  <Route element={<ProtectedRoute />}>
    <Route path="/home" element={<HomePage />} />
    <Route path="/results/profile" element={<ProfileReport />} />
    <Route path="/results/recommendations" element={<RecommendationsReport />} />
    <Route path="/results/recommendations/full" element={<Suspense><RecommendationFullReport /></Suspense>} />
    <Route path="/results/recommendations/:ideaId" element={<RecommendationDetail />} />
    {/* ... other protected routes */}
  </Route>
  
  {/* Admin Routes */}
  <Route element={<AdminRoute />}>
    <Route path="/admin" element={<Suspense><AdminPage /></Suspense>} />
    {/* ... admin routes */}
  </Route>
</Routes>
```

**ProtectedRoute Component:**
- Checks authentication via `useAuth()`
- Redirects to `/login` if not authenticated
- Checks subscription status

**AdminRoute Component:**
- Checks admin authentication
- Redirects to `/admin/login` if not authenticated

---

## 14. TECHNOLOGY STACK

### 14.1 Backend Libraries

**Core Framework:**
- Flask 2.x
- Flask-CORS
- Flask-Limiter (rate limiting)
- SQLAlchemy (ORM)
- Werkzeug (password hashing, security)

**AI/LLM:**
- CrewAI (agent orchestration)
- OpenAI Python SDK
- LangChain (via CrewAI)

**Database:**
- SQLite (development/test)
- PostgreSQL (production, via SQLAlchemy)

**Utilities:**
- python-dotenv (environment variables)
- secrets (token generation)
- hashlib (cache key hashing)
- concurrent.futures (ThreadPoolExecutor)

### 14.2 Frontend Libraries

**Core:**
- React 18.3.1
- React DOM 18.3.1
- React Router DOM 6.28.0

**UI/Styling:**
- Tailwind CSS 3.4.6
- @tailwindcss/typography 0.5.15

**Markdown:**
- react-markdown 9.0.3

**PDF Generation:**
- @react-pdf/renderer 4.3.1
- jspdf 2.5.1
- html2canvas 1.4.1

**Payment:**
- @stripe/react-stripe-js 5.3.0
- @stripe/stripe-js 8.4.0

**Build Tools:**
- Vite 5.2.0
- @vitejs/plugin-react 4.3.1
- PostCSS 8.4.38
- Autoprefixer 10.4.19

**Testing:**
- @playwright/test 1.57.0

### 14.3 Hosting Infrastructure

**Not specified in codebase.** Likely:
- Backend: Flask app (WSGI server: Gunicorn/uWSGI)
- Frontend: Static hosting (Vercel/Netlify) or CDN
- Database: PostgreSQL (managed service: AWS RDS, Heroku Postgres, etc.)

### 14.4 Build Process

**Frontend:**
```bash
npm run build  # Vite build → dist/
npm run preview  # Preview production build
```

**Backend:**
- No explicit build step (Python interpreted)
- Database migrations: Manual SQL scripts in `migrations/`

### 14.5 LLM Configuration

**Models Used:**
- **Manager LLM:** `openai/gpt-4o-mini` (hierarchical process coordination)
- **Agent LLMs:** `openai/gpt-4o-mini` (all agents)
- **Enhancement Endpoint:** `gpt-4` (for `/api/enhance-report`)

**Configuration:**
- API Key: `OPENAI_API_KEY` environment variable
- No explicit model configuration in code (uses CrewAI defaults)
- Max tokens per agent: 800-2000 (defined in agents.yaml)

### 14.6 Environment Variables

**Required:**
- `OPENAI_API_KEY` - OpenAI API key for LLM calls
- `FLASK_ENV` - Environment (development/production)
- `DEBUG` - Debug mode flag
- `SQLALCHEMY_DATABASE_URI` - Database connection string
- `SECRET_KEY` - Flask secret key (for sessions)

**Optional:**
- `STRIPE_SECRET_KEY` - Stripe API key (for payments)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature verification
- `ADMIN_EMAIL` - Admin notification email
- `FRONTEND_URL` - Frontend URL (for password reset links)

**Not Found in Codebase:**
- `.env.example` file (should be created)

---

## APPENDIX: FILE REFERENCE

### Discovery Pipeline Files

| File | Purpose |
|------|---------|
| `app/routes/discovery.py` | Main API endpoint, orchestration |
| `src/startup_idea_crew/crew.py` | CrewAI crew definition |
| `src/startup_idea_crew/config/agents.yaml` | Agent configurations |
| `src/startup_idea_crew/config/tasks.yaml` | Task configurations |
| `src/startup_idea_crew/tools/__init__.py` | Tool exports |
| `src/startup_idea_crew/tools/market_research_tool.py` | Market research tools |
| `src/startup_idea_crew/tools/validation_tool.py` | Validation tools |
| `src/startup_idea_crew/tools/financial_tool.py` | Financial analysis tools |
| `src/startup_idea_crew/tools/customer_tool.py` | Customer persona tools |
| `app/utils/tool_cache.py` | Tool result caching |
| `app/utils/performance_metrics.py` | Performance tracking |
| `app/utils/domain_research.py` | Domain research JSON management |
| `app/utils/output_manager.py` | Temp file cleanup |

### Authentication Files

| File | Purpose |
|------|---------|
| `app/routes/auth.py` | Authentication routes |
| `app/models/database.py` | User, UserSession models |
| `app/utils.py` | Session management, require_auth decorator |

### Payment Files

| File | Purpose |
|------|---------|
| `app/routes/payment.py` | Payment and subscription routes |
| `app/models/database.py` | Payment, SubscriptionCancellation models |

### Frontend Files

| File | Purpose |
|------|---------|
| `frontend/src/App.jsx` | Main app, routing, navigation |
| `frontend/src/context/ReportsContext.jsx` | Discovery state management |
| `frontend/src/context/AuthContext.jsx` | Authentication state |
| `frontend/package.json` | Dependencies |

---

## END OF DOCUMENT

**This blueprint is complete and exhaustive. Use it as the foundation for performance architecture redesign.**

