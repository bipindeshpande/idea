# Blueprint Structure Plan

## Key Considerations

1. **Rate Limiter**: Currently uses `@limiter.limit()` decorator. For blueprints, we need to either:
   - Pass limiter instance to blueprints, OR
   - Create limiter wrapper function, OR
   - Import limiter from a shared location

2. **Dependencies**: Each blueprint needs:
   - Flask imports (Blueprint, request, jsonify)
   - Database models
   - Utils functions
   - Email services
   - Rate limiter access

3. **App Context**: Blueprints can access `current_app` for app-level config

## Solution: Create Shared Limiter Wrapper

Create `app/utils.py` or `app/routes/limiter_helper.py`:
```python
from flask import current_app
from flask_limiter import Limiter

def get_limiter():
    """Get limiter instance from app context."""
    return current_app.extensions.get('limiter')
```

Or simpler: Pass limiter as app extension and access via current_app.

## Approach

Since `limiter` is created in `api.py`, we'll:
1. Make limiter accessible via `current_app.extensions['limiter']`
2. Create helper function in utils to get limiter
3. Each blueprint can use the helper

OR simpler approach:
- Keep limiter in api.py
- Import it in blueprints (but this creates circular dependency risk)
- Better: Use Flask's `current_app.extensions`

Actually, the cleanest approach:
- Initialize limiter in api.py
- Store it in `app.extensions['limiter']`
- Import in blueprints using `current_app.extensions.get('limiter')`

