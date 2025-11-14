# Admin Panel Documentation 🔐

The Admin Panel provides a secure interface for managing content and configuration of the Startup Idea Advisor application.

## 🔑 Access

**URL:** `http://localhost:5173/admin` (or your production domain)

**Default Password:** `admin2024`

⚠️ **Important:** Change the default password before deploying to production!

## 🛡️ Security

### Changing the Password

#### Frontend Password
Edit `frontend/src/pages/Admin.jsx`:
```javascript
const ADMIN_PASSWORD = "your-secure-password-here";
```

#### Backend Password
Set the `ADMIN_PASSWORD` environment variable:
```bash
# Windows PowerShell
$env:ADMIN_PASSWORD = "your-secure-password-here"

# Linux/Mac
export ADMIN_PASSWORD="your-secure-password-here"
```

Or add it to your `.env` file:
```
ADMIN_PASSWORD=your-secure-password-here
```

### Authentication
- Password-protected login page
- Session stored in localStorage (client-side)
- Bearer token authentication for API endpoints
- All admin API endpoints require valid authentication

## 📋 Features

### 1. Validation Questions Editor

Manage the questions and prompts used in the Idea Validator flow.

#### Category Questions
- **Industry/Sector** - Options for industry selection
- **Target Audience** - B2C, B2B, Enterprise options
- **Business Model** - SaaS, Marketplace, E-commerce, etc.

**Actions:**
- Add new questions
- Edit question text and ID
- Add/remove options for each question
- Delete questions

#### Idea Explanation Prompts
- Edit the prompts shown to users when explaining their idea
- Add new prompts
- Remove prompts

**Save:** Changes are saved to `frontend/src/config/validationQuestions.json` via the backend API.

### 2. Intake Form Fields Editor

Manage the form fields used in the Idea Discovery flow.

**Editable Properties:**
- **Screen Title** - Main heading of the intake form
- **Screen Description** - Subtitle/description text
- **Field ID** - Unique identifier for each field
- **Field Label** - Display label
- **Field Type** - Picklist, Short Text, or Long Text
- **Required** - Mark fields as required/optional
- **Options** - For picklist fields, manage the available options

**Actions:**
- Add new fields
- Edit existing fields
- Reorder fields (by editing)
- Delete fields

**Save:** Changes are saved to `frontend/src/config/intakeScreen.json` via the backend API.

### 3. Statistics Dashboard

View application usage statistics:

- **Total Runs** - Number of idea discovery sessions
- **Total Validations** - Number of idea validations completed
- **Total Users** - Unique session count
- **Recent Activity** - Last 5 runs and validations with timestamps

**Note:** Statistics are currently pulled from localStorage. In production, this would connect to a database.

## 🔌 API Endpoints

All admin endpoints require Bearer token authentication in the `Authorization` header.

### Save Validation Questions
```http
POST /api/admin/save-validation-questions
Authorization: Bearer <admin_password>
Content-Type: application/json

{
  "questions": {
    "category_questions": [...],
    "idea_explanation_prompts": [...]
  }
}
```

### Save Intake Fields
```http
POST /api/admin/save-intake-fields
Authorization: Bearer <admin_password>
Content-Type: application/json

{
  "screen_id": "idea_finder_input",
  "screen_title": "Tell Us About You",
  "description": "...",
  "fields": [...]
  }
}
```

### Get Statistics
```http
GET /api/admin/stats
Authorization: Bearer <admin_password>
```

## 📁 File Structure

```
frontend/src/
├── pages/
│   └── Admin.jsx              # Main admin panel component
├── config/
│   ├── validationQuestions.js # Default validation questions
│   └── intakeScreen.js        # Default intake form fields
└── ...

# Generated files (after saving from admin)
frontend/src/config/
├── validationQuestions.json   # Saved validation questions
└── intakeScreen.json          # Saved intake fields
```

## 🔄 Workflow

1. **Login** - Enter password to access admin panel
2. **Edit Content** - Make changes to questions or fields
3. **Save Changes** - Click "Save Changes" button
4. **Backend Processing** - Changes are saved to JSON files
5. **Frontend Update** - To use new configs, update the JS files or implement dynamic loading

### Using Saved Configs

Currently, saved JSON files are separate from the JS config files. To use them:

**Option 1: Manual Update**
- Copy content from `validationQuestions.json` to `validationQuestions.js`
- Copy content from `intakeScreen.json` to `intakeScreen.js`

**Option 2: Dynamic Loading (Future Enhancement)**
- Modify the frontend to load from JSON files instead of JS files
- Implement hot-reloading or restart the dev server

## 🚨 Troubleshooting

### Can't Login
- Verify password matches in both frontend (`Admin.jsx`) and backend (`api.py`)
- Check browser console for errors
- Clear localStorage: `localStorage.removeItem('sia_admin_authenticated')`

### Changes Not Saving
- Check browser console for API errors
- Verify backend is running on port 8000
- Check network tab for 401 (Unauthorized) errors
- Verify `ADMIN_PASSWORD` environment variable matches frontend password

### Statistics Not Showing
- Statistics are pulled from localStorage
- Users must have completed runs/validations in the same browser
- In production, implement database-backed statistics

## 🔒 Production Considerations

Before deploying to production:

1. **Change Default Password** - Use a strong, unique password
2. **Use Environment Variables** - Store password securely
3. **Enable HTTPS** - Admin panel should only be accessible over HTTPS
4. **Rate Limiting** - Add rate limiting to admin endpoints
5. **IP Whitelisting** - Consider restricting admin access by IP
6. **Audit Logging** - Log all admin actions for security
7. **Session Management** - Implement proper session tokens instead of localStorage
8. **Database Integration** - Move statistics and configs to a database

## 📝 Notes

- Admin panel is client-side only (no server-side session management)
- Saved configs are in JSON format for easy editing
- Changes require manual integration or dynamic loading implementation
- Statistics are currently limited to localStorage data

---

For questions or issues, refer to the main [README.md](README.md) or check the code in `frontend/src/pages/Admin.jsx`.

