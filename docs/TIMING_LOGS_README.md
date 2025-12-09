# Timing Logs Documentation

## Overview

The timing logger automatically collects and stores timing data from the discovery pipeline execution. All timing logs are saved to `docs/timing_logs.json` in a structured JSON format.

## File Location

- **Timing Logs File**: `docs/timing_logs.json`
- **Logger Module**: `app/utils/timing_logger.py`

## What Gets Logged

The timing logger captures:

1. **Pipeline Events**:
   - Pipeline start/complete
   - Tool precompute start/completion
   - Stage 1 start/completion
   - Stage 2 start/completion
   - Critical tools wait duration

2. **Tool Execution**:
   - Tool start timestamps
   - OpenAI API call durations
   - Token usage (prompt, completion, total)
   - Total tool duration
   - Overhead time

3. **LLM Calls**:
   - Stage 1 profile analysis timing
   - Stage 2 idea research timing
   - Prompt building duration
   - JSON parsing duration
   - Validation duration

## Log Format

Each session creates a log entry with:

```json
{
  "session_id": "timestamp_threadname",
  "timestamp": "ISO datetime",
  "events": [
    {
      "component": "run_profile_analysis",
      "event": "openai_call_complete",
      "timestamp": 1234567890.123,
      "datetime": "2024-01-01T12:00:00",
      "duration": 2.345,
      "openai_duration": 2.345,
      "tokens": 500,
      "prompt_tokens": 300,
      "completion_tokens": 200
    }
  ],
  "summary": {
    "total_events": 25,
    "total_duration": 45.678,
    "total_openai_duration": 35.123,
    "tool_overhead": 10.555,
    "components": {
      "run_profile_analysis": {
        "event_count": 5,
        "events": ["stage1_start", "prompt_built", ...]
      }
    },
    "durations": [...],
    "openai_calls": [...]
  }
}
```

## Viewing Timing Logs

To view the timing logs:

```bash
# View the JSON file
cat docs/timing_logs.json | python -m json.tool

# Or open in your editor
code docs/timing_logs.json
```

## Analyzing Performance

The summary section includes:
- **total_duration**: Total time for the session
- **total_openai_duration**: Combined time for all OpenAI API calls
- **tool_overhead**: Non-OpenAI overhead (caching, parsing, etc.)
- **durations**: Breakdown by component and event
- **openai_calls**: Detailed OpenAI call information

## Example Analysis

To identify bottlenecks:

1. Check `total_openai_duration` - if this is close to `total_duration`, tools are the bottleneck
2. Check individual tool durations in `durations` array
3. Compare Stage 1 vs Stage 2 timing
4. Look for tools with unusually long durations

## Console Output

Timing logs are also printed to the console with `[TIMING]` prefix for immediate visibility during development.

## Disabling Timing Logs

To disable timing logs, set:

```python
from app.utils.timing_logger import _timing_enabled
_timing_enabled = False
```

Or comment out the timing logger imports in the service files.

