# Subscription Cancellation Reason Feature

## Overview

This feature captures the reason when a user cancels their subscription, storing it in the database for retrospective analysis and product improvement.

## Implementation Details

### Database Model

**New Table:** `subscription_cancellations`

**Fields:**
- `id` (Integer, Primary Key)
- `user_id` (Integer, Foreign Key to users.id, Indexed)
- `subscription_type` (String) - The plan type (weekly, monthly)
- `cancellation_reason` (Text) - User-provided reason (up to 500 characters)
- `cancellation_category` (String, Optional) - For future categorization
- `cancelled_at` (DateTime) - Timestamp of cancellation
- `subscription_expires_at` (DateTime) - When access actually expires

### API Endpoint

**Endpoint:** `POST /api/subscription/cancel`

**Request Body:**
```json
{
  "cancellation_reason": "User's reason for canceling (required, max 500 chars)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription cancelled. You'll have access until expiration.",
  "user": { ... }
}
```

**Validation:**
- `cancellation_reason` is required
- Must not be empty after trimming
- Maximum 500 characters

### Frontend Implementation

**Location:** `frontend/src/pages/dashboard/Account.jsx`

**Features:**
1. **Modal Dialog** - Opens when user clicks "Cancel Subscription"
2. **Required Text Area** - User must provide a reason (500 char limit)
3. **Character Counter** - Shows remaining characters
4. **Validation** - Prevents submission without reason
5. **Error Handling** - Displays errors if cancellation fails

**User Flow:**
1. User clicks "Cancel Subscription" button
2. Modal opens asking for cancellation reason
3. User enters reason (required, max 500 chars)
4. User clicks "Confirm Cancellation"
5. Reason is sent to backend and saved
6. Subscription is cancelled
7. Modal closes, success message shown

## Data Usage

The cancellation reasons can be used for:

1. **Product Improvement**
   - Identify common pain points
   - Understand why users leave
   - Prioritize feature development

2. **Pricing Optimization**
   - See if price is a common concern
   - Adjust pricing strategy
   - Offer discounts to retain users

3. **User Retention**
   - Follow up with users who cancel
   - Address specific concerns
   - Offer alternatives

4. **Analytics**
   - Track cancellation trends
   - Measure churn reasons
   - Identify patterns

## Database Queries

### Get all cancellations
```python
from app.models.database import SubscriptionCancellation

cancellations = SubscriptionCancellation.query.all()
```

### Get cancellations by user
```python
cancellations = SubscriptionCancellation.query.filter_by(user_id=user_id).all()
```

### Get cancellations with reasons
```python
cancellations = SubscriptionCancellation.query.filter(
    SubscriptionCancellation.cancellation_reason.isnot(None)
).all()
```

### Count cancellations by reason (common reasons)
```python
from sqlalchemy import func

# Group by reason (first 50 chars for grouping)
cancellations = db.session.query(
    func.substr(SubscriptionCancellation.cancellation_reason, 1, 50).label('reason_snippet'),
    func.count(SubscriptionCancellation.id).label('count')
).group_by('reason_snippet').order_by(func.count(SubscriptionCancellation.id).desc()).all()
```

## Future Enhancements

1. **Categorization** - Auto-categorize reasons (price, features, alternatives, etc.)
2. **Admin Dashboard** - View cancellation reasons in admin panel
3. **Analytics Dashboard** - Visualize cancellation trends
4. **Follow-up Emails** - Send personalized emails based on reason
5. **Retention Offers** - Offer discounts based on cancellation reason

## Migration Notes

The new table will be created automatically when the application starts (via `db.create_all()` in `app/__init__.py`).

For existing databases, you may need to run:
```python
from app import create_app
from app.models.database import db

app = create_app()
with app.app_context():
    db.create_all()
```

## Testing

To test the feature:

1. **Create a test user with active subscription**
2. **Navigate to Account page** (`/account`)
3. **Click "Cancel Subscription"**
4. **Enter a cancellation reason**
5. **Confirm cancellation**
6. **Verify in database:**
   ```python
   from app.models.database import SubscriptionCancellation
   cancellation = SubscriptionCancellation.query.filter_by(user_id=user_id).first()
   print(cancellation.cancellation_reason)
   ```

## Security Considerations

- Cancellation reasons are stored as plain text (consider encryption for sensitive data)
- Only authenticated users can cancel their own subscriptions
- Reason is required to prevent accidental cancellations
- Character limit prevents abuse

