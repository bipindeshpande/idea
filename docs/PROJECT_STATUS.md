# Startup Idea Advisor - Project Status & Context

## Project Overview

**Startup Idea Advisor** is a web application that helps entrepreneurs discover and validate startup ideas using AI-powered analysis. The platform provides personalized startup recommendations based on user profiles, goals, and constraints.

## Core Features

### 1. User Authentication & Subscriptions
- User registration and login system
- Session management with 30-minute inactivity timeout
- Subscription tiers:
  - **Free**: 3 validations (lifetime), 1 discovery (lifetime)
  - **Starter**: $7/month - 10 validations/month, 5 discoveries/month
  - **Pro**: $15/month - Unlimited validations and discoveries
  - **Weekly**: $5/week - Unlimited validations and discoveries
- Stripe payment integration
- Subscription management (cancel, change plans)

### 2. Idea Discovery
- AI-powered startup idea recommendations
- Profile-based analysis (goals, time commitment, budget, interests)
- Personalized top 3 recommendations with detailed reports
- PDF download capability

### 3. Idea Validation
- Validation questionnaire system
- Category-based questions (industry, target audience, business model)
- Idea explanation prompts
- Validation results and scoring

### 4. Admin Panel
- **Authentication**: Password + MFA (Two-Factor Authentication)
- **Dashboard**: Comprehensive metrics overview with time range filtering
- **Reports**: Exportable CSV reports (Users, Payments, Activity, Subscriptions, Revenue, Full)
- **Statistics**: Real-time stats (users, revenue, subscriptions, activity)
- **User Management**: View and manage users, update subscriptions
- **Payment Management**: View all payment transactions
- **Content Management**: 
  - Validation questions editor
  - Intake form fields editor

## Technical Stack

### Backend
- **Framework**: Flask (Python)
- **Database**: SQLAlchemy (SQLite/PostgreSQL)
- **Payment**: Stripe integration
- **Email**: Email service for notifications
- **Session Management**: Token-based with inactivity timeout

### Frontend
- **Framework**: React with React Router
- **Styling**: Tailwind CSS with dark mode support
- **State Management**: React Context (Auth, Reports, Theme)
- **Payment**: Stripe React components

## Recent Implementations

### Session Timeout (30 minutes inactivity)
- **Backend**: `get_current_session()` checks last activity timestamp
- **Frontend**: Activity tracking (mouse, keyboard, scroll, touch events)
- **Auto-logout**: Sessions expire after 30 minutes of inactivity

### Admin Panel Enhancements
1. **Route Protection**: `AdminProtectedRoute` component ensures only authenticated admins can access
2. **MFA Implementation**: Two-step authentication (password → 6-digit MFA code)
3. **Dark Mode Support**: Full dark mode compatibility throughout admin panel
4. **Button Alignment**: Fixed report card buttons using flexbox (`flex-col`, `flex-grow`, `mt-auto`)

### Subscription Type Updates
- Backend updated to support all frontend plans: `starter`, `pro`, `weekly`, `free`
- Payment amounts: Starter ($7), Pro ($15), Weekly ($5)
- Duration mapping: Starter/Pro (30 days), Weekly (7 days)
- Removed frontend mapping - backend now accepts tier IDs directly

## Database Models

### User
- Email, password (hashed)
- Subscription type, status, expiration dates
- Usage tracking (validations, discoveries)
- Monthly usage counters with reset dates

### UserSession
- Session tokens
- Last activity timestamp
- Expiration dates
- IP address and user agent tracking

### UserRun
- Idea discovery runs
- Run IDs and timestamps

### UserValidation
- Idea validation records
- Validation IDs and timestamps

### Payment
- Stripe payment intents
- Amount, currency, subscription type
- Status tracking (completed, pending, failed)

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/change-password` - Change password

### Subscriptions
- `GET /api/subscription/status` - Get subscription status
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/subscription/change-plan` - Change subscription plan

### Payments
- `POST /api/payment/create-intent` - Create Stripe payment intent
- `POST /api/payment/confirm` - Confirm payment and activate subscription

### Admin
- `GET /admin/stats` - Get admin statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/user/<id>` - Get user details
- `POST /api/admin/user/<id>/subscription` - Update user subscription
- `GET /api/admin/payments` - Get all payments
- `GET /api/admin/reports/export` - Export reports as CSV
- `POST /admin/save-validation-questions` - Save validation questions
- `POST /admin/save-intake-fields` - Save intake form fields

## Environment Variables

### Backend
- `ADMIN_PASSWORD` - Admin authentication password
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLIC_KEY` - Stripe public key (for frontend)
- Database connection strings

### Frontend
- `VITE_STRIPE_PUBLIC_KEY` - Stripe public key

## Security Features

1. **Session Management**
   - Token-based authentication
   - 30-minute inactivity timeout
   - Secure session storage

2. **Admin Security**
   - Password-protected admin access
   - MFA (Multi-Factor Authentication)
   - Route protection
   - Admin-only API endpoints

3. **Payment Security**
   - Stripe secure payment processing
   - Payment intent verification
   - Payment status tracking

## Current State

### Working Features
✅ User authentication and registration
✅ Subscription management
✅ Payment processing (Stripe)
✅ Idea discovery and validation
✅ Admin panel with full functionality
✅ Session timeout (30 min inactivity)
✅ Dark mode support
✅ Report exports (CSV)
✅ Dashboard with metrics

### Known Limitations
- MFA uses simplified verification (needs TOTP library for production)
- Admin password is hardcoded (should use environment variable)
- Statistics endpoint doesn't support time range filtering yet (frontend ready)

## File Structure

```
project/
├── app/
│   ├── models/
│   │   └── database.py          # Database models
│   ├── utils.py                  # Session management, auth helpers
│   └── services/
│       ├── email_service.py      # Email notifications
│       └── email_templates.py    # Email templates
├── api.py                        # Main Flask application
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── admin/
│       │   │   └── Admin.jsx     # Admin panel
│       │   ├── auth/             # Login, register, password reset
│       │   ├── dashboard/        # User dashboard
│       │   ├── discovery/        # Idea discovery
│       │   ├── public/           # Landing, pricing, etc.
│       │   └── validation/       # Idea validation
│       ├── context/
│       │   ├── AuthContext.jsx   # Authentication state
│       │   ├── ReportsContext.jsx # Reports state
│       │   └── ThemeContext.jsx  # Dark mode
│       └── App.jsx               # Main app with routing
└── docs/
    └── PROJECT_STATUS.md        # This file
```

## Next Steps / TODO

1. **MFA Enhancement**: Integrate proper TOTP library (e.g., `otplib`) for production MFA
2. **Time Range Filtering**: Implement backend support for dashboard time range filtering
3. **Admin Password**: Move admin password to environment variable
4. **Email Notifications**: Enhance email templates and delivery
5. **Analytics**: Add more detailed analytics and reporting
6. **Testing**: Add unit and integration tests
7. **Documentation**: Complete API documentation

## How to Resume Work

If you need to continue work on this project, provide this context:

> "I'm working on the Startup Idea Advisor project. Here's the current status: [reference this document]. I need help with [specific task]."

Or simply say:

> "Continue working on Startup Idea Advisor. [Your specific request]"

The project is a React + Flask application for startup idea discovery and validation with subscription management, admin panel, and Stripe payments.

