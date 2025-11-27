# Route Mapping - Complete Reference

## All Routes in api.py (51 total)

### Health Routes (2) - Already in `app/routes/health.py`
| Line | Route | Method | Description |
|------|-------|--------|-------------|
| 124 | `/api/health` | GET | Health check with DB |
| 270 | `/health` | GET | Simple health check |

---

### Public Routes (2) - ✅ Migrated to `app/routes/public.py`
| Line | Route | Method | Rate Limit | Auth | Description |
|------|-------|--------|------------|------|-------------|
| 3559 | `/api/contact` | POST | 5/hour | No | Contact form |
| 3665 | `/api/public/usage-stats` | GET | 100/hour | No | Public stats |

---

### Auth Routes (7) - 🔄 To migrate to `app/routes/auth.py`
| Line | Route | Method | Rate Limit | Auth | Description |
|------|-------|--------|------------|------|-------------|
| 1755 | `/api/auth/register` | POST | 3/hour | No | Register user |
| 1834 | `/api/auth/login` | POST | 5/minute | No | Login user |
| 1992 | `/api/auth/logout` | POST | 20/hour | Yes | Logout |
| 2004 | `/api/auth/me` | GET | 60/hour | Yes | Get current user |
| 2040 | `/api/auth/forgot-password` | POST | 3/hour | No | Request reset |
| 2082 | `/api/auth/reset-password` | POST | 5/hour | No | Reset password |
| 2119 | `/api/auth/change-password` | POST | 5/hour | Yes | Change password |

**Dependencies:**
- `User`, `UserSession` models
- `create_user_session`, `get_current_session`, `require_auth` utils
- Email services: `welcome_email`, `password_reset_email`, `password_changed_email`, `get_base_template`
- `datetime`, `timedelta`, `os`

---

### Discovery Routes (2) - 🔄 To migrate to `app/routes/discovery.py`
| Line | Route | Method | Rate Limit | Auth | Description |
|------|-------|--------|------------|------|-------------|
| 276 | `/api/run` | POST | 10/hour | Yes | Run discovery |
| 411 | `/api/enhance-report` | POST | 30/hour | Yes | Enhance report |

**Dependencies:**
- `StartupIdeaCrew`
- `UserRun`, `UserSession` models
- `PROFILE_FIELDS`, `_validate_discovery_inputs`, `create_user_session`, `get_current_session`, `require_auth`, `read_output_file` utils
- Complex AI integration

---

### Validation Routes (1) - 🔄 To migrate to `app/routes/validation.py`
| Line | Route | Method | Rate Limit | Auth | Description |
|------|-------|--------|------------|------|-------------|
| 686 | `/api/validate-idea` | POST | 20/hour | Yes | Validate idea |

**Dependencies:**
- OpenAI client
- `UserValidation`, `UserSession` models
- `require_auth`, `get_current_session` utils
- Complex validation logic

---

### User Routes (14) - 🔄 To migrate to `app/routes/user.py`
| Line | Route | Method | Rate Limit | Auth | Description |
|------|-------|--------|------------|------|-------------|
| 2407 | `/api/user/usage` | GET | - | Yes | Get usage stats |
| 2425 | `/api/user/activity` | GET | - | Yes | Get activity |
| 2495 | `/api/user/run/<run_id>` | GET | - | Yes | Get run details |
| 2602 | `/api/user/run/<run_id>` | DELETE | - | Yes | Delete run |
| 3007 | `/api/user/actions` | GET | - | Yes | Get actions |
| 3044 | `/api/user/actions` | POST | - | Yes | Create action |
| 3114 | `/api/user/actions/<id>` | PUT | - | Yes | Update action |
| 3179 | `/api/user/actions/<id>` | DELETE | - | Yes | Delete action |
| 3206 | `/api/user/notes` | GET | - | Yes | Get notes |
| 3247 | `/api/user/notes` | POST | - | Yes | Create note |
| 3299 | `/api/user/notes/<id>` | PUT | - | Yes | Update note |
| 3349 | `/api/user/notes/<id>` | DELETE | - | Yes | Delete note |
| 3376 | `/api/user/compare-sessions` | POST | - | Yes | Compare sessions |
| 3449 | `/api/user/smart-recommendations` | GET | - | Yes | Smart recommendations |
| 2932 | `/api/emails/check-expiring` | POST | - | Yes | Check expiring emails |

**Dependencies:**
- `UserRun`, `UserValidation`, `UserAction`, `UserNote`, `UserSession` models
- `require_auth`, `get_current_session` utils
- Email services for notifications

---

### Payment Routes (5) - 🔄 To migrate to `app/routes/payment.py`
| Line | Route | Method | Rate Limit | Auth | Description |
|------|-------|--------|------------|------|-------------|
| 2160 | `/api/subscription/status` | GET | 30/hour | Yes | Get subscription |
| 2222 | `/api/subscription/cancel` | POST | - | Yes | Cancel subscription |
| 2348 | `/api/subscription/change-plan` | POST | - | Yes | Change plan |
| 2630 | `/api/payment/create-intent` | POST | - | Yes | Create payment intent |
| 2708 | `/api/payment/confirm` | POST | - | Yes | Confirm payment |
| 2813 | `/api/webhooks/stripe` | POST | - | No | Stripe webhook |

**Dependencies:**
- Stripe integration
- `User`, `Payment`, `SubscriptionCancellation` models
- `require_auth`, `get_current_session` utils
- Email services: `subscription_activated_email`, `subscription_expiring_email`, etc.

---

### Admin Routes (16) - 🔄 To migrate to `app/routes/admin.py`
| Line | Route | Method | Rate Limit | Auth | Description |
|------|-------|--------|------------|------|-------------|
| 1306 | `/api/admin/login` | POST | - | No | Admin login |
| 1339 | `/api/admin/mfa-setup` | GET | - | Admin | MFA setup |
| 1383 | `/api/admin/verify-mfa` | POST | - | Admin | Verify MFA |
| 1439 | `/api/admin/forgot-password` | POST | - | No | Admin forgot password |
| 1500 | `/api/admin/reset-password` | POST | - | No | Admin reset password |
| 1097 | `/api/admin/stats` | GET | - | Admin | Admin stats |
| 1144 | `/api/admin/users` | GET | - | Admin | Get users |
| 1160 | `/api/admin/payments` | GET | - | Admin | Get payments |
| 1187 | `/api/admin/settings` | GET | - | Admin | Get settings |
| 1207 | `/api/admin/settings` | POST | 10/hour | Admin | Update settings |
| 1234 | `/api/admin/user/<id>` | GET | - | Admin | Get user details |
| 1281 | `/api/admin/user/<id>/subscription` | POST | - | Admin | Update user subscription |
| 1038 | `/api/admin/save-validation-questions` | POST | 10/hour | Admin | Save validation questions |
| 1063 | `/api/admin/save-intake-fields` | POST | - | Admin | Save intake fields |
| 1538 | `/api/admin/data/clear-validations-runs` | DELETE | - | Admin | Clear data |
| 1582 | `/api/admin/reports/export` | GET | - | Admin | Export reports |

**Dependencies:**
- `Admin`, `AdminResetToken`, `SystemSettings` models
- `check_admin_auth` utils
- Email services: `admin_password_reset_email`
- Complex admin logic

---

## Summary by Blueprint

| Blueprint | Routes | Lines to Migrate | Complexity |
|-----------|--------|------------------|------------|
| `health.py` | 2 | 124-142, 270-273 | ✅ Done |
| `public.py` | 2 | 3559-3661, 3665-3777 | ✅ Done |
| `auth.py` | 7 | 1755-2156 | Medium |
| `discovery.py` | 2 | 276-410, 411-685 | High (AI) |
| `validation.py` | 1 | 686-1037 | High (AI) |
| `user.py` | 14 | 2407-3558 | Medium |
| `payment.py` | 6 | 2160-2931 | Medium (Stripe) |
| `admin.py` | 16 | 1038-1733 | High |

**Total:** 50 routes (health already done, so 49 to migrate)

---

## Migration Order (Recommended)

1. ✅ **Public** - Done
2. **Auth** - Foundation for others
3. **User** - Depends on auth
4. **Payment** - Depends on auth
5. **Discovery** - Complex AI
6. **Validation** - Complex AI
7. **Admin** - Most complex

---

## Next Steps

1. Create route mapping document ✅
2. Create blueprint files with all routes
3. Register blueprints in api.py
4. Apply rate limits
5. Remove old routes
6. Test all endpoints

**Ready for phased execution!**

