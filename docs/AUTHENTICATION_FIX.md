# Authentication Fix for "Start Run" Error

**Issue:** Users getting "authentication required" error when trying to start a run, even though they're authenticated.

## 🔍 Root Cause

The `/api/run` and `/api/validate-idea` endpoints require authentication (they have `@require_auth` decorator), but the frontend contexts were not sending the authentication token in the request headers.

## ✅ Fix Applied

### 1. **ReportsContext.jsx**
- Added import: `import { useAuth } from "./AuthContext.jsx";`
- Added `getAuthHeaders` from `useAuth()` hook
- Updated `/api/run` request to include auth headers:
  ```jsx
  headers: {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  }
  ```
- Updated dependency array: `}, [getAuthHeaders]);`

### 2. **ValidationContext.jsx**
- Added import: `import { useAuth } from "./AuthContext.jsx";`
- Added `getAuthHeaders` from `useAuth()` hook
- Updated `/api/validate-idea` request to include auth headers:
  ```jsx
  headers: {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  }
  ```
- Updated dependency array: `}, [getAuthHeaders]);`

## 📋 Provider Hierarchy

The provider hierarchy in `main.jsx` is correct:
```jsx
<AuthProvider>
  <ReportsProvider>
    <ValidationProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ValidationProvider>
  </ReportsProvider>
</AuthProvider>
```

This ensures both `ReportsProvider` and `ValidationProvider` can access `useAuth()`.

## 🧪 Testing

After this fix:
1. ✅ Users can start a run when authenticated
2. ✅ Users can validate ideas when authenticated
3. ✅ Authentication token is properly sent with API requests
4. ✅ Unauthenticated users are still redirected to login

## 📝 Files Modified

1. `frontend/src/context/ReportsContext.jsx`
2. `frontend/src/context/ValidationContext.jsx`

---

**Status:** ✅ Fixed! Authentication headers are now included in all API requests.

