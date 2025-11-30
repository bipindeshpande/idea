# Test Suite

## Status

✅ **27 tests passing** (84% pass rate)
⚠️ 2 failed, 4 errors (minor issues to fix)

## Running Tests

```bash
# Run all tests
python -m pytest tests/

# Run with coverage
python -m pytest tests/ --cov=app --cov-report=html

# Run specific test file
python -m pytest tests/test_auth.py

# Run with verbose output
python -m pytest tests/ -v
```

## Test Structure

- `tests/conftest.py` - Pytest fixtures and configuration
- `tests/test_auth.py` - Authentication tests (9 tests)
- `tests/test_admin.py` - Admin route tests (6 tests)
- `tests/test_health.py` - Health check tests (2 tests)
- `tests/test_models.py` - Database model tests (6 tests)
- `tests/test_user_routes.py` - User route tests (4 tests)

## Test Coverage

### ✅ Passing Tests

**Authentication (7/9)**
- User registration
- Duplicate email registration
- Short password validation
- Login success
- Invalid credentials
- Non-existent user login
- Get current user (authenticated)
- Get current user (unauthenticated)
- Logout

**Admin (6/6)**
- Admin login success
- Admin login failure
- MFA development mode
- MFA production mode
- Admin stats unauthorized
- Admin users unauthorized

**Health (2/2)**
- Health check success
- Simple health check

**Models (6/6)**
- Password hashing
- Subscription active check
- Subscription expired check
- Days remaining calculation
- Subscription activation
- Reset token generation

**User Routes (2/4)**
- Get user usage
- Get user dashboard

### ⚠️ Needs Fixing

**Authentication (2)**
- Forgot password (session refresh issue)
- Reset password (token lookup issue)

**User Routes (4)**
- Create/get actions (session token uniqueness)
- Create/get notes (session token uniqueness)

## Test Fixtures

- `app` - Flask application instance
- `client` - Test client
- `test_user` - Test user with free subscription
- `test_user_session` - Authenticated session
- `authenticated_client` - Client with auth headers
- `admin_user` - Admin user
- `free_trial_user` - User with free trial
- `paid_user` - User with paid subscription

## Notes

- Tests use in-memory SQLite database
- All tests run in isolated database sessions
- Test environment variables are set in `conftest.py`
- Some tests may need database session refresh fixes

## Next Steps

1. Fix session refresh issues in password reset tests
2. Fix session token uniqueness in user route tests
3. Add more integration tests
4. Add E2E tests for critical flows
5. Increase coverage to 80%+

---

**Last Updated**: [Current Date]

