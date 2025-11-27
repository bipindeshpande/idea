# Blueprint Split Approach

## Strategy

Since Flask-Limiter needs to be initialized with the app, and blueprints need to use it, here's the approach:

### Option 1: Import Limiter from api.py
- Initialize limiter in api.py
- Import limiter in blueprints (works after api.py loads)
- Use `@limiter.limit()` decorator directly
- **Risk:** Circular import if not structured correctly

### Option 2: Access via current_app.extensions
- Flask-Limiter stores itself in `app.extensions['limiter']`
- Create helper decorator function
- Access limiter at runtime via current_app
- **Safer:** No circular import risk

### Option 3: Initialize Limiter Separately
- Create limiter in separate module
- Initialize in api.py
- Import in both api.py and blueprints
- **Cleanest:** But requires more setup

## Recommended: Option 2

Use a helper decorator that accesses limiter from current_app.extensions:

```python
def limit(limit_str):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            limiter = current_app.extensions.get('limiter')
            if limiter:
                # Apply rate limit check
                pass
            return func(*args, **kwargs)
        return wrapper
    return decorator
```

But actually, Flask-Limiter decorators work with blueprints automatically if limiter is initialized with the app. We just need to import it properly.

## Simplest Working Solution

1. Keep limiter initialization in api.py
2. Register blueprints AFTER limiter initialization
3. In blueprints, import limiter from api.py at module level
4. Use @limiter.limit() decorator directly

This works because:
- Blueprints are imported before registration
- Limiter is initialized before blueprint registration
- Python imports are cached, so circular import is avoided if structured right

Let's use this approach!

