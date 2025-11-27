# Quick Reference: Hardcoded & Repetitive Messages

## 🔴 Most Critical - Users See These Frequently

### 1. **"Please try again"** 
- **Occurrences**: 30+ times
- **Files**:
  - Backend: All route blueprints (`app/routes/*.py`)
  - Frontend: `Dashboard.jsx`, `Account.jsx`, `ManageSubscription.jsx`, etc.
- **Problem**: Too generic, not helpful

### 2. **"Invalid email or password"**
- **Occurrences**: 2+ times (every failed login)
- **File**: `app/routes/auth.py` lines 131, 140
- **Problem**: Same message for both wrong email AND wrong password

### 3. **"Not authenticated" / "Unauthorized"**
- **Occurrences**: 25+ times
- **Files**: 
  - `app/routes/auth.py`: 2 times
  - `app/routes/admin.py`: 12+ times  
  - `app/routes/user.py`: 10+ times
  - `app/routes/payment.py`: 5+ times
- **Problem**: Duplicated across files

### 4. **"Internal server error"**
- **Occurrences**: 5+ times
- **Files**: Multiple route files
- **Problem**: Too generic, doesn't explain what went wrong

### 5. **"An error occurred. Please try again."**
- **Occurrences**: 5+ times in frontend
- **Files**: 
  - `Account.jsx`: 3 times (lines 148, 190, 238)
  - `ManageSubscription.jsx`: 2 times (lines 69, 103)
- **Problem**: Exact duplicate, no context

### 6. **"Failed to compare ideas. Please try again."**
- **Occurrences**: 3+ times
- **Files**: 
  - `Dashboard.jsx`: 2 times (lines 462, 466)
  - `CompareSessions.jsx`: 1+ time (line 139)
- **Problem**: Exact duplicate

### 7. **"Failed to delete session. Please try again."**
- **Occurrences**: 2 times
- **File**: `Dashboard.jsx` lines 513, 517
- **Problem**: Exact duplicate

## 📍 Complete Location Map

### Backend Routes

#### `app/routes/auth.py`
```
Line 36, 121: "Email and password are required"
Line 39, 360, 401: "Password must be at least 8 characters" (3x)
Line 131, 140: "Invalid email or password" (2x) ⚠️
Line 128: "Database error. Please try again."
Line 137: "Authentication error. Please try again."
Line 279, 391: "Not authenticated" (2x)
Line 305: "Internal server error"
Line 225: "Failed to create session. Please try again."
Line 237: "Failed to create session token. Please try again."
Line 320, 343: "If email exists, reset link sent" (2x)
```

#### `app/routes/admin.py`
```
Line 34, 58, 91, 137, 152, 178, 197, 223, 269, 325, 520, 561: "Unauthorized" (12x) ⚠️⚠️⚠️
Line 306, 318: "Incorrect password" (2x)
Line 371, 416: "Invalid MFA code" (2x)
Line 437, 473: "If email exists, reset link sent" (2x)
```

#### `app/routes/user.py`
```
Line 27, 44, 114, 219, 246, 282: "Not authenticated" (6x)
Line 160, 227: "Run not found" (2x)
Line 133: "Database connection error. Please try again."
Line 147, 156: "Database query error" (2x)
Line 210: "Internal server error"
```

#### `app/routes/payment.py`
```
Line 28, 89, 214, 273, 351: "Not authenticated" (5x)
Line 221, 280, 402: "Invalid subscription type" (3x)
Line 322, 442, 560: "Stripe not installed" (3x)
Line 205: "Failed to cancel subscription"
Line 264: "Failed to change subscription"
Line 342: "Payment processing failed"
Line 446: "Payment confirmation failed"
```

#### `app/routes/discovery.py`
```
Line 116: "We couldn't generate any valid recommendations based on your inputs. Please try adjusting your preferences, interests, or constraints and try again."
   ^ 180+ characters, very long, will repeat
```

#### `app/routes/validation.py`
```
Line 276: "We couldn't analyze your idea properly. Please provide more details about your idea and try again."
   ^ Long message, will repeat on validation failures
```

### Frontend Components

#### `frontend/src/pages/dashboard/Dashboard.jsx`
```
Line 399, 1922, 2086: "Maximum 5 ideas can be compared at once" (3x)
Line 462, 466: "Failed to compare ideas. Please try again." (2x) ⚠️
Line 513, 517: "Failed to delete session. Please try again." (2x) ⚠️
Line 472: "Network error. Please check your connection and try again."
Line 2120: "Please select at least one idea to compare"
```

#### `frontend/src/pages/dashboard/Account.jsx`
```
Line 148, 190, 238: "An error occurred. Please try again." (3x) ⚠️⚠️
```

#### `frontend/src/pages/dashboard/ManageSubscription.jsx`
```
Line 69, 103: "An error occurred. Please try again." (2x) ⚠️
```

#### `frontend/src/pages/admin/Admin.jsx`
```
Line 78, 87: "Incorrect password" (2x)
Line 102: "Invalid MFA code. Please enter the correct code."
Line 365, 607: "Failed to save (${response.status})" (2x)
Line 386, 628: "Failed to save: ${data.error || 'Unknown error'}" (2x)
Line 391, 633: "Backend save failed: ${errorMessage}. Data saved to localStorage as backup." (2x)
```

#### `frontend/src/pages/public/PaymentModal.jsx`
```
Line 69: "An error occurred while processing your card. Please try again."
Line 187: "Failed to load Stripe. Please try again."
```

#### `frontend/src/pages/validation/ValidationResult.jsx`
```
Line 632: "Failed to generate PDF. Please try again."
```

### Email Templates

#### `app/services/email_templates.py`
```
Line 37-74: validation_ready_email() - Static template, repeats for every validation
Line 77-99: trial_ending_email() - Static template, repeats for all users
Line 100-132: subscription_expiring_email() - Static template
Line 134-165: subscription_reminder_email() - Static template
Line 167-198: subscription_final_reminder_email() - Static template
Line 200-231: welcome_email() - Static template
Line 233-264: subscription_activated_email() - Static template
Line 266-297: password_reset_email() - Static template
Line 299-330: password_changed_email() - Static template
Line 332-363: payment_failed_email() - Static template
```

**All email templates are 100% static** - no personalization beyond name extraction.

## 🎯 Immediate Action Items

### Priority 1: Fix Exact Duplicates
1. ✅ Create constants file for error messages
2. ✅ Replace "An error occurred. Please try again." (5 occurrences)
3. ✅ Replace "Failed to compare ideas..." (3 occurrences)
4. ✅ Replace "Failed to delete session..." (2 occurrences)
5. ✅ Consolidate "Unauthorized" (12+ occurrences)

### Priority 2: Improve Generic Messages
1. Replace "Please try again" with specific guidance
2. Add error codes for tracking
3. Add retryable flags and suggestions

### Priority 3: Personalize Email Templates
1. Add user activity context
2. Vary language/tone
3. Include personalized next steps

