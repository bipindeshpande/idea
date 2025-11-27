# Rate Limits to Apply to Blueprints

## Auth Routes (`app/routes/auth.py`)
- `/api/auth/register` - `3 per hour`
- `/api/auth/login` - `5 per minute`
- `/api/auth/logout` - `20 per hour`
- `/api/auth/me` - `60 per hour`
- `/api/auth/forgot-password` - `3 per hour`
- `/api/auth/reset-password` - `5 per hour`
- `/api/auth/change-password` - `5 per hour`

## Discovery Routes (`app/routes/discovery.py`)
- `/api/run` - `10 per hour`
- `/api/enhance-report` - `30 per hour`

## Validation Routes (`app/routes/validation.py`)
- `/api/validate-idea` - `20 per hour`

## User Routes (`app/routes/user.py`)
- `/api/user/usage` - `30 per hour`
- `/api/user/activity` - `100 per hour`
- `/api/user/run/<run_id>` GET - `200 per hour`
- `/api/user/run/<run_id>` DELETE - `20 per hour`
- `/api/user/actions` GET - `100 per hour`
- `/api/user/actions` POST - `50 per hour`
- `/api/user/actions/<id>` PUT - `100 per hour`
- `/api/user/actions/<id>` DELETE - `50 per hour`
- `/api/user/notes` GET - `100 per hour`
- `/api/user/notes` POST - `50 per hour`
- `/api/user/notes/<id>` PUT - `100 per hour`
- `/api/user/notes/<id>` DELETE - `50 per hour`
- `/api/user/compare-sessions` - `50 per hour`
- `/api/user/smart-recommendations` - `50 per hour`
- `/api/emails/check-expiring` - `10 per day`

## Payment Routes (`app/routes/payment.py`)
- `/api/subscription/status` - `30 per hour`
- `/api/subscription/cancel` - `5 per hour`
- `/api/subscription/change-plan` - `5 per hour`
- `/api/payment/create-intent` - `10 per hour`
- `/api/payment/confirm` - `10 per hour`
- `/api/webhooks/stripe` - `100 per hour`

## Public Routes (`app/routes/public.py`)
- `/api/contact` - `5 per hour`
- `/api/public/usage-stats` - `100 per hour`

## Admin Routes (`app/routes/admin.py`)
- `/api/admin/login` - `10 per hour`
- `/api/admin/mfa-setup` - `5 per hour`
- `/api/admin/verify-mfa` - `20 per hour`
- `/api/admin/forgot-password` - `3 per hour`
- `/api/admin/reset-password` - `5 per hour`
- `/api/admin/stats` - `30 per hour`
- `/api/admin/users` - `30 per hour`
- `/api/admin/payments` - `30 per hour`
- `/api/admin/settings` GET - `30 per hour`
- `/api/admin/settings` POST - `10 per hour`
- `/api/admin/user/<id>` - `30 per hour`
- `/api/admin/user/<id>/subscription` - `10 per hour`
- `/api/admin/save-validation-questions` - `10 per hour`
- `/api/admin/save-intake-fields` - `10 per hour`
- `/api/admin/data/clear-validations-runs` - `5 per hour`
- `/api/admin/reports/export` - `10 per hour`

