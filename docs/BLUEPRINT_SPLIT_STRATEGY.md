# Blueprint Split Strategy

## Challenge
- 3,791 lines in single `api.py` file
- 51 routes to migrate
- Limiter decorator used throughout
- Many shared dependencies

## Solution Approach

### Step 1: Handle Limiter
Since limiter is initialized with `app=app`, Flask-Limiter stores it in `app.extensions['limiter']`.
We can access it in blueprints via `current_app.extensions['limiter']`.

**Option A (Simplest):** Import limiter from api.py after initialization
- Works but creates dependency

**Option B (Better):** Access via current_app.extensions
- Cleaner, no circular imports
- Need wrapper function for decorator

**Option C (Best):** Create limiter helper module
- Initialize limiter separately
- Import in both api.py and blueprints

### Step 2: Migration Order

1. **Public Routes** (easiest, no auth)
2. **Auth Routes** (foundation)
3. **User Routes** (depend on auth)
4. **Discovery Routes** (simple)
5. **Validation Routes** (simple)
6. **Payment Routes** (more complex)
7. **Admin Routes** (most complex)

### Step 3: Keep it Working

- Migrate one blueprint at a time
- Test each before moving to next
- Keep old routes until all migrated
- Then remove old routes

## Implementation Plan

### Phase 1: Setup Infrastructure
- [ ] Create limiter helper module
- [ ] Update app/routes/__init__.py to register blueprints
- [ ] Test blueprint registration works

### Phase 2: Migrate Routes (One at a Time)
- [ ] Public routes (2 routes)
- [ ] Auth routes (7 routes)  
- [ ] User routes (14 routes)
- [ ] Discovery routes (2 routes)
- [ ] Validation routes (1 route)
- [ ] Payment routes (5 routes)
- [ ] Admin routes (16 routes)

### Phase 3: Cleanup
- [ ] Remove old routes from api.py
- [ ] Remove unused imports
- [ ] Test all endpoints
- [ ] Update documentation

## Estimated Time: 4-6 hours

---

**Let's start with the infrastructure setup first, then migrate routes one blueprint at a time.**

