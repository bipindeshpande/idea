# Blueprint Migration Status

## Overview
Migrating 3,791-line `api.py` into organized Flask Blueprints.

## Route Distribution

### Blueprints to Create:

1. **`public.py`** - 2 routes
   - `/api/contact` (POST)
   - `/api/public/usage-stats` (GET)

2. **`auth.py`** - 7 routes
   - `/api/auth/register` (POST)
   - `/api/auth/login` (POST)
   - `/api/auth/logout` (POST)
   - `/api/auth/me` (GET)
   - `/api/auth/forgot-password` (POST)
   - `/api/auth/reset-password` (POST)
   - `/api/auth/change-password` (POST)

3. **`discovery.py`** - 2 routes
   - `/api/run` (POST)
   - `/api/enhance-report` (POST)

4. **`validation.py`** - 1 route
   - `/api/validate-idea` (POST)

5. **`payment.py`** - 5 routes
   - `/api/payment/create-intent` (POST)
   - `/api/payment/confirm` (POST)
   - `/api/webhooks/stripe` (POST)
   - `/api/subscription/status` (GET)
   - `/api/subscription/cancel` (POST)
   - `/api/subscription/change-plan` (POST)

6. **`admin.py`** - 16 routes
   - All `/api/admin/*` routes

7. **`user.py`** - 14 routes
   - All `/api/user/*` routes
   - `/api/emails/check-expiring` (POST)

8. **`health.py`** - 2 routes ✅ Already exists
   - `/api/health` (GET)
   - `/health` (GET)

## Migration Order
1. ✅ Health (already done)
2. ⏳ Public (2 routes) - Starting here
3. ⏳ Auth (7 routes)
4. ⏳ Discovery (2 routes)
5. ⏳ Validation (1 route)
6. ⏳ User (14 routes)
7. ⏳ Payment (5 routes)
8. ⏳ Admin (16 routes)

## Notes
- Limiter will be imported from api.py (works after app initialization)
- All decorators (@require_auth, @limiter.limit) will be preserved
- Test each blueprint after creation

