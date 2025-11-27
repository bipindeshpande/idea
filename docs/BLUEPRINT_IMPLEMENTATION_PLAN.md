# Blueprint Implementation Plan

## Simplified Approach

**Strategy:** Import limiter from api.py after app initialization.
Flask-Limiter works with blueprints when initialized with the app.

## Implementation Steps

1. **Keep limiter in api.py** (initialized with app)
2. **Import limiter in blueprints** (after api.py loads, limiter is available)
3. **Migrate routes one blueprint at a time**
4. **Test after each migration**
5. **Remove old routes after all migrated**

## Blueprint Files to Create

1. `app/routes/auth.py` - Authentication routes
2. `app/routes/discovery.py` - Discovery routes
3. `app/routes/validation.py` - Validation routes  
4. `app/routes/payment.py` - Payment/subscription routes
5. `app/routes/admin.py` - Admin routes
6. `app/routes/user.py` - User management routes
7. `app/routes/public.py` - Public endpoints

## Migration Order

1. Public (2 routes) - Simplest
2. Auth (7 routes) - Foundation
3. Discovery (2 routes)
4. Validation (1 route)
5. User (14 routes)
6. Payment (5 routes)
7. Admin (16 routes) - Most complex

## Notes

- Import `limiter` from api.py in each blueprint
- Import all necessary dependencies in each blueprint
- Keep decorators (@require_auth, @limiter.limit, etc.)
- Test each blueprint before moving to next

**Ready to start! Let's begin with the first blueprint.**

