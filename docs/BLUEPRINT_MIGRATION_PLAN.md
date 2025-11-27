# Blueprint Migration Plan

## Route Categories

1. **Auth** (7 routes): `/api/auth/*`
2. **Discovery** (2 routes): `/api/run`, `/api/enhance-report`
3. **Validation** (1 route): `/api/validate-idea`
4. **Payment** (5 routes): `/api/payment/*`, `/api/subscription/*`, `/api/webhooks/stripe`
5. **Admin** (16 routes): `/api/admin/*`
6. **User** (14 routes): `/api/user/*`, `/api/emails/*`
7. **Public** (2 routes): `/api/public/*`, `/api/contact`
8. **Health** (2 routes): Already in `health.py` ✅

**Total: 49 routes to migrate**
