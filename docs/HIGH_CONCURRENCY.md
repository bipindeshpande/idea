# High Concurrency Support (1000+ Users)

This document explains how the system handles high-concurrency scenarios with 1000+ simultaneous users.

## Problem Statement

With 1000 concurrent users, we face several challenges:
- **3000+ files** created simultaneously (1000 users × 3 output files)
- **Race conditions** if files share names
- **Disk space issues** if cleanup fails
- **File system bottlenecks** from high I/O
- **Performance degradation** from concurrent file operations

## Solution Architecture

### 1. Unique Temporary Files Per Run

Each user run gets **unique temporary files** using:
- **UUID-based filenames**: `{uuid}_{timestamp}_{filename}.md`
- **System temp directory**: Uses OS-managed temp directory (`tempfile.gettempdir()`)
- **Secure permissions**: Files created with `0o700` permissions

**Example:**
```
/tmp/idea_crew_outputs/a1b2c3d4e5f6_1734567890_profile_analysis.md
/tmp/idea_crew_outputs/a1b2c3d4e5f6_1734567890_startup_ideas_research.md
/tmp/idea_crew_outputs/a1b2c3d4e5f6_1734567890_personalized_recommendations.md
```

### 2. Immediate Cleanup After Use

Files are **deleted immediately** after:
1. Crew writes output to file
2. System reads file content
3. Content saved to database
4. File deleted (always, even on errors)

**Result:** At most 3000 temp files exist at any moment (if all 1000 users run simultaneously), then all are cleaned up.

### 3. Robust Error Handling

- **Retry logic**: File reads have 3 retries with progressive backoff
- **Graceful degradation**: Cleanup failures don't fail the request
- **Background cleanup**: Orphaned files cleaned up automatically

### 4. Automatic Orphaned File Cleanup

**Multiple cleanup mechanisms:**

1. **On Startup**: Cleanup runs when server starts
2. **Periodic**: Random cleanup (~1% of requests) to catch orphaned files
3. **After Each Run**: Immediate cleanup in `finally` block
4. **Age-based**: Removes files older than 1 hour

### 5. Database as Source of Truth

All outputs are stored in the `UserRun` database table. Files are **temporary intermediaries** only.

## Performance Characteristics

### File System Load

**With 1000 concurrent users:**
- **Peak files**: 3000 temp files maximum
- **File lifetime**: ~5-30 seconds (time to complete crew run)
- **Disk space**: ~50-150 MB peak (assuming 50 KB per file)
- **Cleanup rate**: Immediate (after each run)

### Scalability

- ✅ **No shared state**: Each user has isolated files
- ✅ **No race conditions**: Unique filenames prevent conflicts
- ✅ **Auto-cleanup**: Prevents disk space issues
- ✅ **OS-managed**: Uses system temp directory (auto-cleaned on reboot)

## Monitoring

### Key Metrics to Watch

1. **Temp directory size**: Monitor `/tmp/idea_crew_outputs/`
2. **File count**: Should stay under 3000 during peak
3. **Cleanup failures**: Check logs for cleanup warnings
4. **Disk space**: Ensure temp directory has sufficient space

### Logs to Monitor

```
INFO: Cleaned up 150 old temp file(s) (7.5 MB) from /tmp/idea_crew_outputs
WARNING: Failed to cleanup temp_file_xyz: [error]
```

## Optimization for Higher Scale

If scaling beyond 1000 concurrent users, consider:

1. **Distributed temp storage**: Use shared storage (S3, etc.) for temp files
2. **In-memory storage**: Capture outputs directly without files (if CrewAI supports)
3. **Queue system**: Use task queue (Celery, etc.) to throttle concurrent runs
4. **Container tempfs**: Use RAM-based tempfs for temp directory
5. **Rate limiting**: Limit concurrent crew executions per user/IP

## Configuration

### Environment Variables

- `TEMP_DIR`: Override temp directory (default: system temp)
- `CLEANUP_MAX_AGE_HOURS`: Age threshold for cleanup (default: 1 hour)

### Tuning Parameters

In `app/utils/output_manager.py`:
- `max_age_hours`: How old files must be before cleanup (default: 1)
- Cleanup frequency: Random 1% of requests (adjustable)

## Testing

To test high concurrency:

```python
# Simulate 1000 concurrent users
import concurrent.futures
import requests

def run_discovery(user_id):
    response = requests.post('/api/run', json={
        'goal_type': 'Extra Income',
        # ... other fields
    })
    return response.json()

with concurrent.futures.ThreadPoolExecutor(max_workers=1000) as executor:
    futures = [executor.submit(run_discovery, i) for i in range(1000)]
    results = [f.result() for f in concurrent.futures.as_completed(futures)]
```

## Troubleshooting

### Issue: Disk Space Full

**Symptom**: Temp directory fills up

**Solution**:
1. Manually run cleanup: `cleanup_old_temp_files(max_age_hours=0)`
2. Increase cleanup frequency
3. Monitor cleanup logs

### Issue: File Not Found Errors

**Symptom**: `FileNotFoundError` when reading temp files

**Solution**:
- Already handled with retry logic
- Check file permissions
- Verify temp directory exists and is writable

### Issue: Slow Performance

**Symptom**: High latency during peak load

**Solution**:
1. Use faster storage (SSD, RAM-based tempfs)
2. Reduce cleanup frequency
3. Consider distributed architecture

