# Phase 1 Performance Instrumentation

## Overview

This document describes the performance instrumentation added to measure Phase 1 optimizations (parallelization and tool-level caching) for the Discovery endpoint.

## What is Measured

### 1. Overall Discovery Duration
- Total time from request start to response completion
- Tracked in `app/routes/discovery.py` using `discovery_start_time`

### 2. Task-Level Timing
- **Profile Analysis Task**: Time to complete profile analysis
- **Idea Research Task**: Time to complete market/competitor research
- **Recommendation Task**: Time to generate final recommendations

Task timing is approximated by checking file modification times of output files, since CrewAI doesn't expose task-level timing directly.

### 3. Tool Call Timing
Each tool call is instrumented to measure:
- **Duration**: Time taken for the tool to execute
- **Cache Status**: Whether the result came from cache (hit) or was computed (miss)
- **Tool Name**: Which tool was called
- **Parameters**: Tool parameters (for debugging)

### 4. Cache Performance
- **Cache Hits**: Number of tool calls that returned cached results
- **Cache Misses**: Number of tool calls that computed new results
- **Cache Hit Rate**: Percentage of cached tool calls
- **Time Saved**: Estimated time saved from cache hits

## Instrumented Tools

The following tools are instrumented:
1. `research_market_trends` - Market trend research
2. `analyze_competitors` - Competitive analysis
3. `estimate_market_size` - Market size estimation
4. `assess_startup_risks` - Risk assessment (not cached, but timed)
5. `estimate_startup_costs` - Cost estimation

## How It Works

### Metrics Collection Flow

1. **Request Start**: `start_metrics_collection()` is called in `app/routes/discovery.py`
2. **Tool Execution**: Each tool records its timing and cache status via `record_tool_call()`
3. **Task Completion**: Task timing is recorded via `record_task()` (approximated from file mtimes)
4. **Request End**: `finalize_metrics()` calculates totals and generates report

### Metrics Storage

- **In-Memory**: Metrics are stored in a global `DiscoveryMetrics` object during request processing
- **Logs**: Performance report is logged at INFO level
- **JSON Files**: Metrics are saved to `{tempdir}/idea_crew_metrics/metrics_{run_id}.json` for analysis
- **API Response**: Summary metrics included in response under `performance_metrics` key

## Performance Report

After each Discovery run, a detailed report is generated that includes:

1. **Overall Metrics**
   - Total duration
   - Cache hit rate
   - Total cache hits/misses

2. **Task Breakdown**
   - Duration of each task
   - Percentage of total time

3. **Tool Call Breakdown**
   - Per-tool statistics (calls, total time, avg time, cache performance)

4. **Bottleneck Analysis**
   - Identifies tasks/tools taking >30% of total time
   - Flags slow tools (>5s per call)

5. **Cache Effectiveness**
   - Hit rate per tool
   - Time saved from caching
   - Average hit vs miss times

6. **Recommendations**
   - Suggestions for further optimization
   - Tools that could benefit from caching
   - Performance issues to address

## Example Report

```
================================================================================
DISCOVERY ENDPOINT PERFORMANCE REPORT
================================================================================
Run ID: 1234567890_123
Timestamp: 2024-01-15T10:30:00Z

OVERALL METRICS
--------------------------------------------------------------------------------
Total Duration: 45.23 seconds
Cache Hit Rate: 60.0% (6 hits, 4 misses)

TASK BREAKDOWN
--------------------------------------------------------------------------------
  Profile Analysis: 8.50s (18.8% of total)
  Idea Research: 12.30s (27.2% of total)
  Recommendation Task: 24.43s (54.0% of total)

TOOL CALL BREAKDOWN
--------------------------------------------------------------------------------
  research_market_trends:
    Calls: 2
    Total Time: 15.20s
    Avg Time: 7.60s
    Cache: 1 hits, 1 misses (50.0% hit rate)

BOTTLENECK ANALYSIS
--------------------------------------------------------------------------------
  ⚠️  Recommendation Task (24.43s) - 54.0% of total

CACHE EFFECTIVENESS
--------------------------------------------------------------------------------
  research_market_trends:
    Hit Rate: 50.0% (1/2)
    Avg Hit Time: 0.05s
    Avg Miss Time: 15.15s
    Estimated Time Saved: 15.10s

RECOMMENDATIONS
--------------------------------------------------------------------------------
  1. Recommendation task is slow - consider optimizing agent prompts or reducing tool calls
  2. Consider adding caching for: assess_startup_risks
================================================================================
```

## Usage

### Viewing Metrics

1. **Logs**: Check application logs for the performance report
2. **JSON Files**: Analyze saved metrics files in `{tempdir}/idea_crew_metrics/`
3. **API Response**: Check `performance_metrics` in the Discovery API response

### Analyzing Results

After running multiple Discovery requests, you can:

1. Aggregate metrics from JSON files to identify patterns
2. Compare cache hit rates across different input types
3. Identify which tools benefit most from caching
4. Find bottlenecks that need optimization

## Next Steps

After collecting metrics from real usage:

1. **Analyze Bottlenecks**: Identify the slowest components
2. **Optimize Cache Strategy**: Adjust TTLs or expand cache scope based on hit rates
3. **Phase 2 Planning**: Use metrics to prioritize Phase 2 optimizations (archetype caching)
4. **Tool Optimization**: Focus on slow tools that aren't cached

## Notes

- Task timing is approximate (based on file modification times)
- Cache hit metrics are recorded at the tool level, not task level
- Metrics collection has minimal overhead (<1ms per tool call)
- Metrics are thread-local (one request = one metrics object)







