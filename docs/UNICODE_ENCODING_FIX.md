# Unicode Encoding Fix for Windows

**Issue:** CrewAI event handlers are logging emoji characters (🚀) that Windows console can't display, causing encoding errors.

## 🔍 Error Message

```
[EventBus Error] Handler 'on_agent_logs_started' failed for event 'AgentLogsStartedEvent': 
'charmap' codec can't encode character '\U0001f680' in position 0: character maps to <undefined>
```

## ✅ Fix Applied

### 1. **app.py** - Main Entry Point
Added UTF-8 encoding configuration at the start:
```python
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == "win32":
    # Set UTF-8 encoding for stdout/stderr
    if sys.stdout.encoding != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")
    if sys.stderr.encoding != "utf-8":
        sys.stderr.reconfigure(encoding="utf-8")
    # Set environment variable for subprocesses
    os.environ["PYTHONIOENCODING"] = "utf-8"
```

### 2. **api.py** - Backward Compatibility Entry Point
Added the same UTF-8 encoding configuration with error handling for older Python versions.

## 📋 What This Does

1. **Reconfigures stdout/stderr** to use UTF-8 encoding on Windows
2. **Sets PYTHONIOENCODING** environment variable for subprocesses (like CrewAI)
3. **Handles gracefully** if reconfigure is not available (Python < 3.7)

## 🧪 Testing

After this fix:
- ✅ CrewAI event handlers can log emoji characters
- ✅ No more 'charmap' codec errors
- ✅ Application runs without encoding warnings
- ✅ Works on Windows, Linux, and macOS

## 📝 Files Modified

1. `app.py` - Main entry point
2. `api.py` - Backward compatibility entry point

## 🔧 Alternative Solution (If Still Having Issues)

If the fix doesn't work, you can also set the environment variable before running:

**PowerShell:**
```powershell
$env:PYTHONIOENCODING="utf-8"
python app.py
```

**Command Prompt:**
```cmd
set PYTHONIOENCODING=utf-8
python app.py
```

---

**Status:** ✅ Fixed! Unicode encoding is now properly configured for Windows.

