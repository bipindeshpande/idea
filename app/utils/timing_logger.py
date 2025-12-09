"""
Timing Logger Utility
Collects and stores timing logs in a structured format for performance analysis.
"""
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
import threading
from flask import current_app

# Thread-local storage for timing data
_timing_data = threading.local()
_timing_enabled = True
_output_file = None


def init_timing_logger(output_file: Optional[str] = None):
    """Initialize timing logger with output file."""
    global _output_file
    if output_file:
        _output_file = Path(output_file)
        _output_file.parent.mkdir(parents=True, exist_ok=True)
    else:
        # Default to docs/timing_logs.json
        _output_file = Path(__file__).parent.parent.parent / "docs" / "timing_logs.json"
        _output_file.parent.mkdir(parents=True, exist_ok=True)


def get_timing_data() -> List[Dict[str, Any]]:
    """Get timing data for current thread."""
    if not hasattr(_timing_data, 'events'):
        _timing_data.events = []
    return _timing_data.events


def clear_timing_data():
    """Clear timing data for current thread."""
    if hasattr(_timing_data, 'events'):
        _timing_data.events = []


def log_timing(
    component: str,
    event: str,
    timestamp: Optional[float] = None,
    duration: Optional[float] = None,
    details: Optional[Dict[str, Any]] = None,
    **kwargs
):
    """
    Log a timing event.
    
    Args:
        component: Component name (e.g., "run_profile_analysis", "research_market_trends")
        event: Event name (e.g., "start", "openai_call_complete", "tool_complete")
        timestamp: Optional timestamp (defaults to current time)
        duration: Optional duration in seconds
        details: Optional dictionary with additional details
        **kwargs: Additional key-value pairs to store
    """
    if not _timing_enabled:
        return
    
    if timestamp is None:
        timestamp = time.time()
    
    # Create event dict
    event_data = {
        "component": component,
        "event": event,
        "timestamp": timestamp,
        "datetime": datetime.fromtimestamp(timestamp).isoformat(),
    }
    
    if duration is not None:
        event_data["duration"] = duration
    
    if details:
        event_data["details"] = details
    
    # Add any additional kwargs
    event_data.update(kwargs)
    
    # Store in thread-local data
    events = get_timing_data()
    events.append(event_data)
    
    # Also print to console for immediate visibility
    print(f"[TIMING] {component}: {event}" + 
          (f" at {timestamp:.3f}" if timestamp else "") +
          (f" (duration: {duration:.3f}s)" if duration is not None else "") +
          (f" - {json.dumps(details)}" if details else "") +
          (f" - {json.dumps(kwargs)}" if kwargs else ""))


def save_timing_log():
    """Save timing log to file."""
    if not _output_file:
        return
    
    events = get_timing_data()
    if not events:
        return
    
    # Load existing logs if file exists
    existing_logs = []
    if _output_file.exists():
        try:
            with open(_output_file, 'r') as f:
                existing_logs = json.load(f)
        except (json.JSONDecodeError, IOError):
            existing_logs = []
    
    # Create log entry
    log_entry = {
        "session_id": f"{int(time.time())}_{threading.current_thread().name}",
        "timestamp": datetime.now().isoformat(),
        "events": events,
        "summary": _calculate_summary(events)
    }
    
    # Append to existing logs
    existing_logs.append(log_entry)
    
    # Save back to file
    try:
        with open(_output_file, 'w') as f:
            json.dump(existing_logs, f, indent=2)
        
        # Also print summary
        summary = log_entry["summary"]
        print(f"\n[TIMING] Log saved to {_output_file}")
        print(f"[TIMING] Session summary: {json.dumps(summary, indent=2)}\n")
    except IOError as e:
        print(f"[TIMING] Failed to save timing log: {e}")


def _calculate_summary(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculate summary statistics from events."""
    summary = {
        "total_events": len(events),
        "components": {},
        "durations": [],
        "openai_calls": []
    }
    
    # Group by component
    for event in events:
        component = event.get("component", "unknown")
        if component not in summary["components"]:
            summary["components"][component] = {
                "event_count": 0,
                "events": []
            }
        summary["components"][component]["event_count"] += 1
        summary["components"][component]["events"].append(event.get("event"))
        
        # Collect durations
        if "duration" in event:
            summary["durations"].append({
                "component": component,
                "event": event.get("event"),
                "duration": event["duration"]
            })
        
        # Collect OpenAI call info
        if "openai_duration" in event or event.get("event") == "openai_call_complete":
            openai_info = {
                "component": component,
                "duration": event.get("openai_duration") or event.get("duration"),
                "tokens": event.get("tokens")
            }
            summary["openai_calls"].append(openai_info)
    
    # Calculate totals
    total_duration = sum(d["duration"] for d in summary["durations"] if "duration" in d)
    total_openai_duration = sum(
        d["duration"] for d in summary["openai_calls"] 
        if d.get("duration") is not None
    )
    
    summary["total_duration"] = total_duration
    summary["total_openai_duration"] = total_openai_duration
    summary["tool_overhead"] = total_duration - total_openai_duration
    
    return summary

