# 🎯 Tiered Pricing Implementation Plan

## Overview

Implementing a freemium tiered subscription model with usage limits.

---

## 📋 Pricing Tiers

### **Free Tier (Default)**
- **3 idea validations** (lifetime total)
- **1 idea discovery** (lifetime total)
- Full reports and PDF downloads
- Basic support

### **Starter Plan: $7/month**
- **10 validations/month** (resets monthly)
- **5 discoveries/month** (resets monthly)
- Full reports and PDF downloads
- Email support

### **Pro Plan: $15/month**
- **Unlimited validations**
- **Unlimited discoveries**
- Full reports and PDF downloads
- Priority support
- Advanced features

### **Weekly Plan: $5/week**
- **Unlimited validations**
- **Unlimited discoveries**
- Full reports and PDF downloads
- 7-day access

---

## 🗄️ Database Changes

### **User Model Updates**
Add fields to track usage:
- `free_validations_used` (INT, default 0) - Lifetime free validations used
- `free_discoveries_used` (INT, default 0) - Lifetime free discoveries used
- `monthly_validations_used` (INT, default 0) - Current month validations (for Starter/Pro)
- `monthly_discoveries_used` (INT, default 0) - Current month discoveries (for Starter/Pro)
- `usage_reset_date` (DATE) - Date when monthly usage resets

### **Subscription Types**
- `free` - Free tier (default)
- `starter` - Starter plan ($7/month)
- `pro` - Pro plan ($15/month)
- `weekly` - Weekly plan ($5/week)
- `free_trial` - Keep for backward compatibility

---

## 🔧 Backend Implementation

### **1. Usage Tracking Functions**

**File: `api.py`**

Add functions to:
- Check if user can perform validation (check limits)
- Check if user can perform discovery (check limits)
- Increment usage counters
- Reset monthly usage (cron job)

**Usage Limits:**
```python
USAGE_LIMITS = {
    "free": {
        "validations": 3,  # lifetime
        "discoveries": 1,  # lifetime
    },
    "starter": {
        "validations": 10,  # per month
        "discoveries": 5,   # per month
    },
    "pro": {
        "validations": None,  # unlimited
        "discoveries": None,  # unlimited
    },
    "weekly": {
        "validations": None,  # unlimited
        "discoveries": None,  # unlimited
    },
}
```

### **2. API Endpoint Updates**

**Update `/api/validate-idea`:**
- Check usage limits before processing
- Return error if limit exceeded
- Increment usage counter after successful validation

**Update `/api/discovery` (or discovery endpoint):**
- Check usage limits before processing
- Return error if limit exceeded
- Increment usage counter after successful discovery

**New Endpoint: `/api/user/usage`:**
- Return current usage stats
- Show remaining free uses
- Show monthly usage for Starter/Pro plans

### **3. Subscription Activation**

**Update `activate_subscription()` function:**
- Set `usage_reset_date` to next month for Starter/Pro
- Reset monthly counters when subscription activates
- Handle free tier (default state)

### **4. Monthly Usage Reset**

**Cron Job / Scheduled Task:**
- Run daily to check for users needing reset
- Reset `monthly_validations_used` and `monthly_discoveries_used` to 0
- Update `usage_reset_date` to next month
- Only for users with `starter` or `pro` subscription

---

## 🎨 Frontend Implementation

### **1. Pricing Page Updates**

**File: `frontend/src/pages/public/Pricing.jsx`**

Update tiers array:
```javascript
const tiers = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out the service.",
    features: [
      "3 idea validations (lifetime)",
      "1 idea discovery (lifetime)",
      "Full reports",
      "PDF downloads",
    ],
    highlight: false,
    color: "brand",
    duration_days: 0,
  },
  {
    id: "starter",
    name: "Starter",
    price: "$7",
    period: "per month",
    description: "Best for regular users testing ideas.",
    features: [
      "10 validations/month",
      "5 discoveries/month",
      "Full reports",
      "PDF downloads",
      "Email support",
    ],
    highlight: false,
    color: "brand",
    duration_days: 30,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$15",
    period: "per month",
    description: "For power users and serial entrepreneurs.",
    features: [
      "Unlimited validations",
      "Unlimited discoveries",
      "Full reports",
      "PDF downloads",
      "Priority support",
    ],
    highlight: true,
    color: "coral",
    duration_days: 30,
  },
  {
    id: "weekly",
    name: "Weekly",
    price: "$5",
    period: "per week",
    description: "Perfect for short-term projects.",
    features: [
      "Unlimited validations",
      "Unlimited discoveries",
      "Full reports",
      "PDF downloads",
    ],
    highlight: false,
    color: "brand",
    duration_days: 7,
  },
];
```

### **2. Usage Display Component**

**New File: `frontend/src/components/dashboard/UsageDisplay.jsx`**

Display:
- Remaining free validations/discoveries (for free tier)
- Monthly usage and limits (for Starter/Pro)
- Progress bars
- Upgrade prompts when near limit

### **3. Dashboard Updates**

**File: `frontend/src/pages/dashboard/Dashboard.jsx`**

Add usage display:
- Show usage stats at top
- Display remaining uses
- Show upgrade CTA when limit reached

### **4. Limit Enforcement UI**

**Update validation/discovery pages:**
- Check usage before allowing submission
- Show error message if limit exceeded
- Display upgrade prompt with link to pricing

---

## 🔄 Migration Strategy

### **Existing Users**
- All existing users default to `free` tier
- Set `free_validations_used = 0` and `free_discoveries_used = 0`
- Existing subscriptions (weekly/monthly) become `pro` tier (unlimited)
- Or migrate to appropriate tier based on current subscription

### **Data Migration Script**
```python
# Set all users to free tier initially
# Migrate existing subscriptions:
# - weekly -> weekly (keep)
# - monthly -> pro (upgrade to unlimited)
```

---

## 📊 Usage Tracking Logic

### **Check Before Validation:**
```python
def can_perform_validation(user):
    subscription_type = user.subscription_type or "free"
    limits = USAGE_LIMITS[subscription_type]
    
    if limits["validations"] is None:
        return True  # Unlimited
    
    if subscription_type == "free":
        used = user.free_validations_used
        return used < limits["validations"]
    else:  # starter or pro
        # Check if monthly reset needed
        if user.usage_reset_date and user.usage_reset_date < datetime.utcnow().date():
            reset_monthly_usage(user)
        
        used = user.monthly_validations_used
        return used < limits["validations"]
```

### **Increment Usage:**
```python
def increment_validation_usage(user):
    subscription_type = user.subscription_type or "free"
    
    if subscription_type == "free":
        user.free_validations_used += 1
    else:
        user.monthly_validations_used += 1
    
    db.session.commit()
```

---

## 🧪 Testing Checklist

- [ ] Free tier: Can perform 3 validations, then blocked
- [ ] Free tier: Can perform 1 discovery, then blocked
- [ ] Starter: Can perform 10 validations/month, then blocked
- [ ] Starter: Can perform 5 discoveries/month, then blocked
- [ ] Pro: Unlimited validations
- [ ] Pro: Unlimited discoveries
- [ ] Weekly: Unlimited everything
- [ ] Monthly usage resets correctly
- [ ] Usage display shows correct counts
- [ ] Upgrade prompts appear when limit reached
- [ ] Payment flow works for all tiers

---

## 📅 Implementation Order

1. **Database Migration** - Add usage tracking fields
2. **Backend Logic** - Usage checking and incrementing
3. **API Updates** - Enforce limits in endpoints
4. **Frontend Display** - Show usage in dashboard
5. **Pricing Page** - Update with new tiers
6. **Limit Enforcement UI** - Block actions when limit reached
7. **Monthly Reset** - Implement cron job
8. **Testing** - Test all scenarios

---

## 🎯 Success Metrics

- Free tier conversion rate (free → paid)
- Starter plan upgrade rate (starter → pro)
- Usage patterns per tier
- Revenue per user by tier
- Churn rate by tier

