# Blueprint Migration - Execution Plan

## Overview
Splitting 3,791-line `api.py` into Flask Blueprints with clear phases.

## Route Mapping Status ✅
- Complete route mapping created in `docs/ROUTE_MAPPING.md`
- 51 routes identified and categorized
- Dependencies documented for each blueprint

---

## Phased Execution Plan

### Phase 1: Foundation Blueprints ✅ COMPLETE
- [x] Create `app/routes/public.py` (2 routes)
- [x] Create route mapping document

**Status:** ✅ DONE

---

### Phase 2: Authentication Blueprints
**Target:** `app/routes/auth.py` (7 routes)
**Estimated Time:** 30 minutes

**Routes to migrate:**
1. `/api/auth/register` (line 1755)
2. `/api/auth/login` (line 1834)
3. `/api/auth/logout` (line 1992)
4. `/api/auth/me` (line 2004)
5. `/api/auth/forgot-password` (line 2040)
6. `/api/auth/reset-password` (line 2082)
7. `/api/auth/change-password` (line 2119)

**Dependencies needed:**
- `User`, `UserSession` models
- `create_user_session`, `get_current_session`, `require_auth` utils
- Email services: `welcome_email`, `password_reset_email`, `password_changed_email`, `get_base_template`
- `datetime`, `timedelta`, `os`, `json`, `request`, `jsonify`, `current_app`

**Rate Limits to apply:**
- Register: 3/hour
- Login: 5/minute
- Logout: 20/hour
- Me: 60/hour
- Forgot password: 3/hour
- Reset password: 5/hour
- Change password: 5/hour

**Action:** Create `app/routes/auth.py` blueprint with all 7 routes

---

### Phase 3: User Management Blueprints
**Target:** `app/routes/user.py` (14 routes)
**Estimated Time:** 45 minutes

**Routes to migrate:**
1. `/api/user/usage` (line 2407)
2. `/api/user/activity` (line 2425)
3. `/api/user/run/<run_id>` GET (line 2495)
4. `/api/user/run/<run_id>` DELETE (line 2602)
5. `/api/user/actions` GET (line 3007)
6. `/api/user/actions` POST (line 3044)
7. `/api/user/actions/<id>` PUT (line 3114)
8. `/api/user/actions/<id>` DELETE (line 3179)
9. `/api/user/notes` GET (line 3206)
10. `/api/user/notes` POST (line 3247)
11. `/api/user/notes/<id>` PUT (line 3299)
12. `/api/user/notes/<id>` DELETE (line 3349)
13. `/api/user/compare-sessions` (line 3376)
14. `/api/user/smart-recommendations` (line 3449)
15. `/api/emails/check-expiring` (line 2932)

**Dependencies:** See ROUTE_MAPPING.md

**Action:** Create `app/routes/user.py` blueprint with all 15 routes

---

### Phase 4: Payment & Subscription Blueprints
**Target:** `app/routes/payment.py` (6 routes)
**Estimated Time:** 45 minutes

**Routes to migrate:**
1. `/api/subscription/status` (line 2160)
2. `/api/subscription/cancel` (line 2222)
3. `/api/subscription/change-plan` (line 2348)
4. `/api/payment/create-intent` (line 2630)
5. `/api/payment/confirm` (line 2708)
6. `/api/webhooks/stripe` (line 2813)

**Dependencies:** Stripe integration, payment models, email services

**Action:** Create `app/routes/payment.py` blueprint with all 6 routes

---

### Phase 5: Discovery Blueprints
**Target:** `app/routes/discovery.py` (2 routes)
**Estimated Time:** 30 minutes

**Routes to migrate:**
1. `/api/run` (line 276) - Complex AI integration
2. `/api/enhance-report` (line 411) - AI enhancement

**Dependencies:** `StartupIdeaCrew`, AI services, profile validation

**Action:** Create `app/routes/discovery.py` blueprint with both routes

---

### Phase 6: Validation Blueprints
**Target:** `app/routes/validation.py` (1 route)
**Estimated Time:** 20 minutes

**Routes to migrate:**
1. `/api/validate-idea` (line 686) - Complex validation logic

**Dependencies:** OpenAI client, validation models

**Action:** Create `app/routes/validation.py` blueprint

---

### Phase 7: Admin Blueprints
**Target:** `app/routes/admin.py` (16 routes)
**Estimated Time:** 60 minutes

**Routes to migrate:** All `/api/admin/*` routes (lines 1038-1733)

**Dependencies:** Admin models, admin auth, complex admin logic

**Action:** Create `app/routes/admin.py` blueprint with all admin routes

---

### Phase 8: Registration & Integration
**Estimated Time:** 30 minutes

**Steps:**
1. Update `app/routes/__init__.py` to register all blueprints
2. Register blueprints in `api.py` (after limiter initialization)
3. Apply rate limits to blueprint routes using limiter from api.py
4. Test blueprint registration works

**Action:** Integrate all blueprints into main app

---

### Phase 9: Cleanup
**Estimated Time:** 20 minutes

**Steps:**
1. Remove old routes from `api.py`
2. Remove unused imports from `api.py`
3. Clean up duplicate code
4. Update api.py to be minimal (~100 lines)

**Action:** Clean up api.py file

---

### Phase 10: Testing
**Estimated Time:** 30 minutes

**Steps:**
1. Test all public endpoints
2. Test all auth endpoints
3. Test all user endpoints
4. Test all payment endpoints
5. Test all discovery endpoints
6. Test all validation endpoints
7. Test all admin endpoints

**Action:** Comprehensive endpoint testing

---

## Total Estimated Time: 4-6 hours

---

## Next Steps

**Ready to start Phase 2: Authentication Blueprints**

Should I proceed with creating `app/routes/auth.py`?

---

## Notes

- Rate limiting will be handled via limiter from api.py (imported after app initialization)
- All decorators (`@require_auth`, etc.) will be preserved
- All imports will be included in each blueprint
- Blueprints will use `current_app` instead of `app` for logging

**This plan provides a clear roadmap for systematic migration!** 🚀

