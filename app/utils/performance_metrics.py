"""
Performance metrics collection for Discovery endpoint.
Tracks timing, cache performance, and bottlenecks.
"""
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
import json


@dataclass
class ToolCallMetric:
    """Metrics for a single tool call."""
    tool_name: str
    duration_seconds: float
    cache_hit: bool = False
    cache_miss: bool = False
    timestamp: float = field(default_factory=time.time)
    params: Optional[Dict[str, Any]] = None


@dataclass
class TaskMetric:
    """Metrics for a CrewAI task."""
    task_name: str
    duration_seconds: float
    start_time: float
    end_time: float
    tool_calls: List[ToolCallMetric] = field(default_factory=list)
    cache_hits: int = 0
    cache_misses: int = 0


@dataclass
class DiscoveryMetrics:
    """Complete metrics for a Discovery run."""
    run_id: Optional[str] = None
    total_duration_seconds: float = 0.0
    profile_analysis_duration: Optional[float] = None
    idea_research_duration: Optional[float] = None
    recommendation_task_duration: Optional[float] = None
    tasks: List[TaskMetric] = field(default_factory=list)
    tool_calls: List[ToolCallMetric] = field(default_factory=list)
    total_cache_hits: int = 0
    total_cache_misses: int = 0
    cache_hit_rate: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "run_id": self.run_id,
            "total_duration_seconds": round(self.total_duration_seconds, 3),
            "profile_analysis_duration": round(self.profile_analysis_duration, 3) if self.profile_analysis_duration else None,
            "idea_research_duration": round(self.idea_research_duration, 3) if self.idea_research_duration else None,
            "recommendation_task_duration": round(self.recommendation_task_duration, 3) if self.recommendation_task_duration else None,
            "tasks": [asdict(task) for task in self.tasks],
            "tool_calls": [asdict(tool) for tool in self.tool_calls],
            "total_cache_hits": self.total_cache_hits,
            "total_cache_misses": self.total_cache_misses,
            "cache_hit_rate": round(self.cache_hit_rate, 3),
            "timestamp": self.timestamp,
        }
    
    def generate_report(self) -> str:
        """Generate a human-readable diagnostic report."""
        report_lines = [
            "=" * 80,
            "DISCOVERY ENDPOINT PERFORMANCE REPORT",
            "=" * 80,
            f"Run ID: {self.run_id or 'N/A'}",
            f"Timestamp: {self.timestamp}",
            "",
            "OVERALL METRICS",
            "-" * 80,
            f"Total Duration: {self.total_duration_seconds:.2f} seconds",
            f"Cache Hit Rate: {self.cache_hit_rate:.1f}% ({self.total_cache_hits} hits, {self.total_cache_misses} misses)",
            "",
        ]
        
        # Task breakdown
        report_lines.extend([
            "TASK BREAKDOWN",
            "-" * 80,
        ])
        
        if self.profile_analysis_duration:
            report_lines.append(f"  Profile Analysis: {self.profile_analysis_duration:.2f}s ({self.profile_analysis_duration/self.total_duration_seconds*100:.1f}% of total)")
        
        if self.idea_research_duration:
            report_lines.append(f"  Idea Research: {self.idea_research_duration:.2f}s ({self.idea_research_duration/self.total_duration_seconds*100:.1f}% of total)")
        
        if self.recommendation_task_duration:
            report_lines.append(f"  Recommendation Task: {self.recommendation_task_duration:.2f}s ({self.recommendation_task_duration/self.total_duration_seconds*100:.1f}% of total)")
        
        report_lines.append("")
        
        # Tool call breakdown
        if self.tool_calls:
            report_lines.extend([
                "TOOL CALL BREAKDOWN",
                "-" * 80,
            ])
            
            # Group by tool name
            tool_stats: Dict[str, List[ToolCallMetric]] = {}
            for tool_call in self.tool_calls:
                if tool_call.tool_name not in tool_stats:
                    tool_stats[tool_call.tool_name] = []
                tool_stats[tool_call.tool_name].append(tool_call)
            
            for tool_name, calls in sorted(tool_stats.items()):
                total_time = sum(c.duration_seconds for c in calls)
                avg_time = total_time / len(calls) if calls else 0
                hits = sum(1 for c in calls if c.cache_hit)
                misses = sum(1 for c in calls if c.cache_miss)
                hit_rate = (hits / len(calls) * 100) if calls else 0
                
                report_lines.append(f"  {tool_name}:")
                report_lines.append(f"    Calls: {len(calls)}")
                report_lines.append(f"    Total Time: {total_time:.2f}s")
                report_lines.append(f"    Avg Time: {avg_time:.2f}s")
                report_lines.append(f"    Cache: {hits} hits, {misses} misses ({hit_rate:.1f}% hit rate)")
                report_lines.append("")
        
        # Bottleneck analysis
        report_lines.extend([
            "BOTTLENECK ANALYSIS",
            "-" * 80,
        ])
        
        bottlenecks = []
        if self.profile_analysis_duration and self.profile_analysis_duration > self.total_duration_seconds * 0.3:
            bottlenecks.append(f"Profile Analysis ({self.profile_analysis_duration:.2f}s) - {self.profile_analysis_duration/self.total_duration_seconds*100:.1f}% of total")
        
        if self.idea_research_duration and self.idea_research_duration > self.total_duration_seconds * 0.3:
            bottlenecks.append(f"Idea Research ({self.idea_research_duration:.2f}s) - {self.idea_research_duration/self.total_duration_seconds*100:.1f}% of total")
        
        if self.recommendation_task_duration and self.recommendation_task_duration > self.total_duration_seconds * 0.3:
            bottlenecks.append(f"Recommendation Task ({self.recommendation_task_duration:.2f}s) - {self.recommendation_task_duration/self.total_duration_seconds*100:.1f}% of total")
        
        # Find slowest tools
        if self.tool_calls:
            slowest_tools = sorted(self.tool_calls, key=lambda x: x.duration_seconds, reverse=True)[:3]
            for tool_call in slowest_tools:
                if tool_call.duration_seconds > 5.0:  # Tools taking >5s are bottlenecks
                    bottlenecks.append(f"{tool_call.tool_name} tool call ({tool_call.duration_seconds:.2f}s)")
        
        if bottlenecks:
            for bottleneck in bottlenecks:
                report_lines.append(f"  ⚠️  {bottleneck}")
        else:
            report_lines.append("  ✓ No major bottlenecks identified")
        
        report_lines.append("")
        
        # Cache effectiveness
        report_lines.extend([
            "CACHE EFFECTIVENESS",
            "-" * 80,
        ])
        
        if self.tool_calls:
            cached_tools = [t for t in self.tool_calls if t.cache_hit or t.cache_miss]
            if cached_tools:
                for tool_name in sorted(set(t.tool_name for t in cached_tools)):
                    tool_calls = [t for t in cached_tools if t.tool_name == tool_name]
                    hits = sum(1 for t in tool_calls if t.cache_hit)
                    misses = sum(1 for t in tool_calls if t.cache_miss)
                    total = len(tool_calls)
                    hit_rate = (hits / total * 100) if total > 0 else 0
                    
                    avg_hit_time = sum(t.duration_seconds for t in tool_calls if t.cache_hit) / hits if hits > 0 else 0
                    avg_miss_time = sum(t.duration_seconds for t in tool_calls if t.cache_miss) / misses if misses > 0 else 0
                    time_saved = (avg_miss_time - avg_hit_time) * hits if hits > 0 else 0
                    
                    report_lines.append(f"  {tool_name}:")
                    report_lines.append(f"    Hit Rate: {hit_rate:.1f}% ({hits}/{total})")
                    if hits > 0 and misses > 0:
                        report_lines.append(f"    Avg Hit Time: {avg_hit_time:.2f}s")
                        report_lines.append(f"    Avg Miss Time: {avg_miss_time:.2f}s")
                        report_lines.append(f"    Estimated Time Saved: {time_saved:.2f}s")
                    report_lines.append("")
        
        # Recommendations
        report_lines.extend([
            "RECOMMENDATIONS",
            "-" * 80,
        ])
        
        recommendations = []
        
        if self.cache_hit_rate < 20:
            recommendations.append("Low cache hit rate - consider expanding cache scope or increasing TTL")
        
        if self.profile_analysis_duration and self.profile_analysis_duration > 20:
            recommendations.append("Profile analysis is slow - consider optimizing LLM calls or reducing context size")
        
        if self.idea_research_duration and self.idea_research_duration > 30:
            recommendations.append("Idea research is slow - consider parallelizing tool calls or increasing cache TTL")
        
        if self.recommendation_task_duration and self.recommendation_task_duration > 40:
            recommendations.append("Recommendation task is slow - consider optimizing agent prompts or reducing tool calls")
        
        # Check for tools that could benefit from caching
        uncached_slow_tools = [t for t in self.tool_calls if not t.cache_hit and not t.cache_miss and t.duration_seconds > 3.0]
        if uncached_slow_tools:
            tool_names = sorted(set(t.tool_name for t in uncached_slow_tools))
            recommendations.append(f"Consider adding caching for: {', '.join(tool_names)}")
        
        if recommendations:
            for i, rec in enumerate(recommendations, 1):
                report_lines.append(f"  {i}. {rec}")
        else:
            report_lines.append("  ✓ Performance is within acceptable ranges")
        
        report_lines.extend([
            "",
            "=" * 80,
        ])
        
        return "\n".join(report_lines)


# Global metrics collector (thread-local would be better for production)
_current_metrics: Optional[DiscoveryMetrics] = None


def start_metrics_collection(run_id: Optional[str] = None) -> DiscoveryMetrics:
    """Start collecting metrics for a Discovery run."""
    global _current_metrics
    _current_metrics = DiscoveryMetrics(run_id=run_id)
    return _current_metrics


def get_current_metrics() -> Optional[DiscoveryMetrics]:
    """Get the current metrics collector."""
    return _current_metrics


def record_tool_call(tool_name: str, duration: float, cache_hit: bool = False, cache_miss: bool = False, params: Optional[Dict[str, Any]] = None):
    """Record a tool call metric."""
    if _current_metrics:
        tool_metric = ToolCallMetric(
            tool_name=tool_name,
            duration_seconds=duration,
            cache_hit=cache_hit,
            cache_miss=cache_miss,
            params=params
        )
        _current_metrics.tool_calls.append(tool_metric)
        if cache_hit:
            _current_metrics.total_cache_hits += 1
        if cache_miss:
            _current_metrics.total_cache_misses += 1


def record_task(task_name: str, duration: float, start_time: float, end_time: float):
    """Record a task metric."""
    if _current_metrics:
        task_metric = TaskMetric(
            task_name=task_name,
            duration_seconds=duration,
            start_time=start_time,
            end_time=end_time
        )
        _current_metrics.tasks.append(task_metric)
        
        # Map to specific task durations
        if task_name == "profile_analysis_task":
            _current_metrics.profile_analysis_duration = duration
        elif task_name == "idea_research_task":
            _current_metrics.idea_research_duration = duration
        elif task_name == "recommendation_task":
            _current_metrics.recommendation_task_duration = duration


def finalize_metrics(total_duration: float):
    """Finalize metrics collection."""
    if _current_metrics:
        _current_metrics.total_duration_seconds = total_duration
        total_tool_calls = _current_metrics.total_cache_hits + _current_metrics.total_cache_misses
        if total_tool_calls > 0:
            _current_metrics.cache_hit_rate = (_current_metrics.total_cache_hits / total_tool_calls) * 100
        return _current_metrics
    return None







