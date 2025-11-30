# Validation Data Cleanup Locations

This document lists **ALL** places where validation data is stored and should be cleaned when deleting validations.

## 1. Database Storage (PostgreSQL)

### Primary Table
- **`user_validations`** table
  - Contains all validation records
  - Columns: `id`, `user_id`, `validation_id`, `category_answers`, `idea_explanation`, `validation_result`, `status`, `created_at`, `updated_at`, `is_deleted`, `archived_at`
  - **Cleanup**: `DELETE FROM user_validations;` (or specific WHERE clauses)

### Related Tables (Referential Data)
- **`user_actions`** table
  - Stores action items linked to validations via `idea_id` field
  - May reference `validation_id` in `idea_id` column
  - **Cleanup**: `DELETE FROM user_actions WHERE idea_id LIKE 'val_%';`

- **`user_notes`** table
  - Stores notes linked to validations via `idea_id` field
  - May reference `validation_id` in `idea_id` column
  - **Cleanup**: `DELETE FROM user_notes WHERE idea_id LIKE 'val_%';`

## 2. Frontend localStorage

### Primary Validation Storage
- **`sia_validations`** (Key: `"sia_validations"`)
  - Stores array of validation objects (up to 20 most recent)
  - Contains: `id`, `timestamp`, `categoryAnswers`, `ideaExplanation`, `validation`
  - **Location**: `frontend/src/context/ValidationContext.jsx`
  - **Cleanup**: `localStorage.removeItem("sia_validations")`

### Related localStorage Keys
- **`revalidate_data`** (Key: `"revalidate_data"`)
  - Stores temporary data for re-validation flow
  - **Cleanup**: `localStorage.removeItem("revalidate_data")`

- **`validation_tooltips_dismissed`** (Key: `"validation_tooltips_dismissed"`)
  - Stores dismissed tooltip states for validation forms
  - **Cleanup**: `localStorage.removeItem("validation_tooltips_dismissed")` (optional - this is UI state)

## 3. Frontend React State

### Component State Variables
- **`ValidationContext`** (`frontend/src/context/ValidationContext.jsx`)
  - `currentValidation` - Currently viewed/active validation
  - `categoryAnswers` - Category answers state
  - `ideaExplanation` - Idea explanation text
  - **Cleanup**: Call `clearCurrentValidation()` from context

- **Dashboard Component** (`frontend/src/pages/dashboard/Dashboard.jsx`)
  - `apiValidations` - Array of validations from API
  - `allValidations` - Combined validations (computed from API + localStorage)
  - **Cleanup**: Reset state on mount or clear localStorage (already handled)

- **Analytics Component** (`frontend/src/pages/dashboard/Analytics.jsx`)
  - `apiValidations` - Array of validations from API
  - `allValidations` - Combined validations for analytics
  - **Cleanup**: Resets on component re-mount after localStorage clear

- **IdeaValidator Component** (`frontend/src/pages/validation/IdeaValidator.jsx`)
  - Form state for editing validations
  - **Cleanup**: Resets when component unmounts or validation is deleted

## 4. API Endpoints That Return Validation Data

### GET Endpoints
- **`/api/user/activity`** (`app/routes/user.py`)
  - Returns `activity.validations[]` array
  - **Cleanup**: Automatically reflects database state

- **`/api/validate-idea/<validation_id>`** (if exists)
  - Returns specific validation data
  - **Cleanup**: Automatically reflects database state

- **`/api/user/compare-sessions`** (`app/routes/user.py`)
  - Can include validations in comparison data
  - **Cleanup**: Automatically reflects database state

### Admin Endpoints
- **`/api/admin/users/<user_id>`** (`app/routes/admin.py`)
  - Returns user's validations
  - **Cleanup**: Automatically reflects database state

- **`/api/admin/stats`** (`app/routes/admin.py`)
  - Returns validation count statistics
  - **Cleanup**: Automatically reflects database state

## 5. Complete Cleanup Checklist

When cleaning **ALL** validations:

### Backend (Database)

**See `docs/HOW_TO_ACCESS_DATABASE.md` for detailed step-by-step instructions.**

**Quick method using Docker:**
```bash
# Connect to database
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor

# Then run these SQL commands:
```

```sql
-- Primary cleanup
DELETE FROM user_validations;

-- Related data cleanup
DELETE FROM user_actions WHERE idea_id LIKE 'val_%';
DELETE FROM user_notes WHERE idea_id LIKE 'val_%';
```

**Or use Python script:**
```bash
# View first to confirm
python view_db_tables.py user_validations

# Then create a delete script (see Method 3 in HOW_TO_ACCESS_DATABASE.md)
```

### Frontend (localStorage)
```javascript
// Primary validation storage
localStorage.removeItem("sia_validations");

// Related validation data
localStorage.removeItem("revalidate_data");

// Optional UI state (can keep if desired)
// localStorage.removeItem("validation_tooltips_dismissed");
```

### Frontend (React State)
- State will automatically reset when:
  1. User refreshes the page
  2. localStorage is cleared and components re-mount
  3. API returns empty validation arrays

### Using the Utility Function
```javascript
// In browser console
clearAppLocalStorage();  // Clears all localStorage including validations

// Or specifically for validations
clearLocalStorageByCategory('validations');
```

## 6. Current Cleanup Implementation

### What's Already Implemented
1. ✅ Database cleanup script: `delete_all_validations.py` (deletes from `user_validations` table)
2. ✅ Automatic localStorage clearing in Dashboard when authenticated and API returns no validations
3. ✅ Utility function: `clearAllLocalStorage()` in `frontend/src/utils/clearLocalStorage.js`

### What Might Be Missing
1. ⚠️ Related data cleanup (`user_actions`, `user_notes` linked to validations)
2. ⚠️ Manual cleanup of `revalidate_data` localStorage key

## 7. Recommended Complete Cleanup Script

### Backend Cleanup

**Method 1: Using Docker (Recommended)**
```bash
# One-liner to delete everything
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor -c "
DELETE FROM user_actions WHERE idea_id LIKE 'val_%';
DELETE FROM user_notes WHERE idea_id LIKE 'val_%';
DELETE FROM user_validations;
"
```

**Method 2: Interactive psql**
```bash
# Connect to database
docker exec -it postgres-dev psql -U postgres -d startup_idea_advisor

# Then run:
DELETE FROM user_actions WHERE idea_id LIKE 'val_%';
DELETE FROM user_notes WHERE idea_id LIKE 'val_%';
DELETE FROM user_validations;
\q
```

**Method 3: Python Script**
See `docs/HOW_TO_ACCESS_DATABASE.md` for a complete Python cleanup script.

### Frontend Cleanup

```javascript
// In browser console (F12)
localStorage.removeItem("sia_validations");
localStorage.removeItem("revalidate_data");
location.reload();  // Refresh the page
```

Or use the utility:
```javascript
clearAppLocalStorage();  // Clears everything
location.reload();  // Refresh to reset React state
```

---

**📖 For detailed database access instructions, see: `docs/HOW_TO_ACCESS_DATABASE.md`**

