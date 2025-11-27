# Blueprint Migration Guide - Step by Step

## Current Situation
- **File:** `api.py` - 3,791 lines
- **Routes:** 51 endpoints
- **Problem:** Monolithic file causes merge conflicts and bugs

## Solution: Flask Blueprints

### Strategy
1. Create blueprint files for each route category
2. Move routes from api.py to blueprints
3. Register blueprints in api.py (reduces it to ~100 lines)
4. Rate limiting: Flask-Limiter works with blueprints automatically

### For Rate Limiting
Flask-Limiter works with blueprints when initialized with app. Two options:
1. **Apply limits after registration** - Register blueprints, then apply rate limits
2. **Import limiter in blueprints** - Import from api.py (works after app initialization)

**Recommended:** Apply rate limits after blueprint registration in api.py using the limiter instance.

## Implementation Steps

### Step 1: Create Blueprint Structure ✅ (In Progress)
- [x] `app/routes/__init__.py` - Blueprint registration
- [x] `app/routes/public.py` - Public routes (2 routes)
- [ ] `app/routes/auth.py` - Auth routes (7 routes)
- [ ] `app/routes/discovery.py` - Discovery routes (2 routes)
- [ ] `app/routes/validation.py` - Validation routes (1 route)
- [ ] `app/routes/user.py` - User routes (14 routes)
- [ ] `app/routes/payment.py` - Payment routes (5 routes)
- [ ] `app/routes/admin.py` - Admin routes (16 routes)

### Step 2: Register Blueprints in api.py
After creating blueprints, add to api.py (after limiter initialization):
```python
from app.routes import register_blueprints
register_blueprints(app)
```

### Step 3: Apply Rate Limits
After blueprint registration, apply rate limits:
```python
from app.routes.public import bp as public_bp
limiter.limit("5 per hour")(public_bp.contact_form)
limiter.limit("100 per hour")(public_bp.get_public_usage_stats)
```

### Step 4: Remove Old Routes
Remove routes from api.py after migration

### Step 5: Test
Test all endpoints work correctly

## Estimated Time
- **Per blueprint:** 30-60 minutes
- **Total:** 4-6 hours

---

**This is a large refactoring. Should we proceed with creating all blueprints now, or do you want to do it incrementally?**

