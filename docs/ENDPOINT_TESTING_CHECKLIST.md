# API Endpoint Testing Checklist

## 🚀 Backend Server

**Status:** Starting...
**Command:** `python api.py`
**Expected URL:** http://localhost:8000
**Health Check:** http://localhost:8000/api/health

---

## 📋 Endpoint Testing Checklist

### **Health Check Endpoints**

- [ ] `GET /api/health`
  - **Expected:** `{"status": "healthy", "database": "connected", "timestamp": "..."}`
  - **Status Code:** 200
  - **Test:** `curl http://localhost:8000/api/health`

- [ ] `GET /health`
  - **Expected:** `{"status": "ok"}`
  - **Status Code:** 200
  - **Test:** `curl http://localhost:8000/health`

---

### **Authentication Endpoints**

#### **Registration**
- [ ] `POST /api/auth/register`
  - **Body:** `{"email": "test@example.com", "password": "testpass123"}`
  - **Expected:** `{"success": true, "user": {...}, "session_token": "..."}`
  - **Status Code:** 200
  - **Test:** 
    ```bash
    curl -X POST http://localhost:8000/api/auth/register \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"testpass123"}'
    ```

#### **Login**
- [ ] `POST /api/auth/login`
  - **Body:** `{"email": "test@example.com", "password": "testpass123"}`
  - **Expected:** `{"success": true, "user": {...}, "session_token": "..."}`
  - **Status Code:** 200
  - **Test:**
    ```bash
    curl -X POST http://localhost:8000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"testpass123"}'
    ```

#### **Get Current User**
- [ ] `GET /api/auth/me`
  - **Headers:** `Authorization: Bearer <session_token>`
  - **Expected:** `{"success": true, "user": {...}}`
  - **Status Code:** 200
  - **Test:**
    ```bash
    curl http://localhost:8000/api/auth/me \
      -H "Authorization: Bearer <session_token>"
    ```

#### **Logout**
- [ ] `POST /api/auth/logout`
  - **Headers:** `Authorization: Bearer <session_token>`
  - **Expected:** `{"success": true}`
  - **Status Code:** 200

#### **Forgot Password**
- [ ] `POST /api/auth/forgot-password`
  - **Body:** `{"email": "test@example.com"}`
  - **Expected:** `{"success": true, "message": "..."}`
  - **Status Code:** 200

#### **Reset Password**
- [ ] `POST /api/auth/reset-password`
  - **Body:** `{"token": "...", "password": "newpass123"}`
  - **Expected:** `{"success": true, "message": "Password reset successful"}`
  - **Status Code:** 200

#### **Change Password**
- [ ] `POST /api/auth/change-password`
  - **Headers:** `Authorization: Bearer <session_token>`
  - **Body:** `{"current_password": "...", "new_password": "..."}`
  - **Expected:** `{"success": true, "message": "Password changed successfully"}`
  - **Status Code:** 200

---

### **Subscription Endpoints**

#### **Get Subscription Status**
- [ ] `GET /api/subscription/status`
  - **Headers:** `Authorization: Bearer <session_token>`
  - **Expected:** `{"success": true, "subscription": {...}, "payment_history": [...]}`
  - **Status Code:** 200

#### **Cancel Subscription**
- [ ] `POST /api/subscription/cancel`
  - **Headers:** `Authorization: Bearer <session_token>`
  - **Expected:** `{"success": true, "message": "...", "user": {...}}`
  - **Status Code:** 200

#### **Change Subscription Plan**
- [ ] `POST /api/subscription/change-plan`
  - **Headers:** `Authorization: Bearer <session_token>`
  - **Body:** `{"subscription_type": "weekly"}` or `{"subscription_type": "monthly"}`
  - **Expected:** `{"success": true, "message": "...", "user": {...}}`
  - **Status Code:** 200

---

### **Payment Endpoints**

#### **Create Payment Intent**
- [ ] `POST /api/payment/create-intent`
  - **Headers:** `Authorization: Bearer <session_token>`
  - **Body:** `{"subscription_type": "weekly"}` or `{"subscription_type": "monthly"}`
  - **Expected:** `{"success": true, "client_secret": "...", "amount": 5.0, "subscription_type": "weekly"}`
  - **Status Code:** 200
  - **Note:** Requires Stripe API key configured

#### **Confirm Payment**
- [ ] `POST /api/payment/confirm`
  - **Headers:** `Authorization: Bearer <session_token>`
  - **Body:** `{"payment_intent_id": "...", "subscription_type": "weekly"}`
  - **Expected:** `{"success": true, "user": {...}, "message": "Subscription activated"}`
  - **Status Code:** 200
  - **Note:** Requires Stripe API key configured

---

### **User Activity Endpoints**

#### **Get User Activity**
- [ ] `GET /api/user/activity`
  - **Headers:** `Authorization: Bearer <session_token>`
  - **Expected:** `{"success": true, "activity": {"runs": [...], "validations": [...], ...}}`
  - **Status Code:** 200

---

### **Discovery Endpoints**

#### **Run Idea Discovery**
- [ ] `POST /api/run`
  - **Headers:** `Authorization: Bearer <session_token>`
  - **Body:** `{"goal_type": "...", "time_commitment": "...", ...}`
  - **Expected:** `{"success": true, "run_id": "...", "inputs": {...}, "outputs": {...}}`
  - **Status Code:** 200
  - **Note:** Requires authentication and active subscription

---

### **Validation Endpoints**

#### **Validate Idea**
- [ ] `POST /api/validate-idea`
  - **Headers:** `Authorization: Bearer <session_token>`
  - **Body:** `{"category_answers": {...}, "idea_explanation": "..."}`
  - **Expected:** `{"success": true, "validation_id": "...", "validation": {...}}`
  - **Status Code:** 200
  - **Note:** Requires authentication, active subscription, and OpenAI API key

---

### **Admin Endpoints**

#### **Get Admin Stats**
- [ ] `GET /admin/stats`
  - **Headers:** `Authorization: Bearer <admin_password>`
  - **Expected:** `{"success": true, "stats": {...}}`
  - **Status Code:** 200

#### **Get All Users**
- [ ] `GET /api/admin/users`
  - **Headers:** `Authorization: Bearer <admin_password>`
  - **Expected:** `{"success": true, "users": [...]}`
  - **Status Code:** 200

#### **Get All Payments**
- [ ] `GET /api/admin/payments`
  - **Headers:** `Authorization: Bearer <admin_password>`
  - **Expected:** `{"success": true, "payments": [...]}`
  - **Status Code:** 200

#### **Get User Detail**
- [ ] `GET /api/admin/user/<user_id>`
  - **Headers:** `Authorization: Bearer <admin_password>`
  - **Expected:** `{"success": true, "user": {...}, "runs": [...], ...}`
  - **Status Code:** 200

#### **Update User Subscription**
- [ ] `POST /api/admin/user/<user_id>/subscription`
  - **Headers:** `Authorization: Bearer <admin_password>`
  - **Body:** `{"subscription_type": "weekly", "duration_days": 7}`
  - **Expected:** `{"success": true, "message": "...", "user": {...}}`
  - **Status Code:** 200

#### **Save Validation Questions**
- [ ] `POST /admin/save-validation-questions`
  - **Headers:** `Authorization: Bearer <admin_password>`
  - **Body:** `{"questions": {...}}`
  - **Expected:** `{"success": true, "message": "Validation questions saved"}`
  - **Status Code:** 200

#### **Save Intake Fields**
- [ ] `POST /admin/save-intake-fields`
  - **Headers:** `Authorization: Bearer <admin_password>`
  - **Body:** `{"fields": [...], "screen_id": "...", ...}`
  - **Expected:** `{"success": true, "message": "Intake fields saved"}`
  - **Status Code:** 200

---

### **Email Endpoints**

#### **Check Expiring Subscriptions**
- [ ] `POST /api/emails/check-expiring`
  - **Expected:** `{"success": true, "emails_sent": 0, "message": "..."}`
  - **Status Code:** 200
  - **Note:** Can be called by cron job

---

## 🔒 Authentication Testing

### **Test Protected Routes**
- [ ] Call protected endpoint without auth token
  - **Expected:** `{"success": false, "error": "Authentication required"}`
  - **Status Code:** 401

- [ ] Call protected endpoint with invalid token
  - **Expected:** `{"success": false, "error": "Authentication required"}`
  - **Status Code:** 401

- [ ] Call protected endpoint with expired subscription
  - **Expected:** `{"success": false, "error": "Subscription expired", ...}`
  - **Status Code:** 403

### **Test Admin Routes**
- [ ] Call admin endpoint without auth
  - **Expected:** `{"success": false, "error": "Unauthorized"}`
  - **Status Code:** 401

- [ ] Call admin endpoint with wrong password
  - **Expected:** `{"success": false, "error": "Unauthorized"}`
  - **Status Code:** 401

---

## 🧪 Error Handling Testing

### **Invalid Inputs**
- [ ] Register with missing email
  - **Expected:** `{"success": false, "error": "Email and password are required"}`
  - **Status Code:** 400

- [ ] Register with short password (< 8 chars)
  - **Expected:** `{"success": false, "error": "Password must be at least 8 characters"}`
  - **Status Code:** 400

- [ ] Register with existing email
  - **Expected:** `{"success": false, "error": "Email already registered"}`
  - **Status Code:** 400

- [ ] Login with wrong password
  - **Expected:** `{"success": false, "error": "Invalid email or password"}`
  - **Status Code:** 401

- [ ] Validate idea without explanation
  - **Expected:** `{"success": false, "error": "Idea explanation is required"}`
  - **Status Code:** 400

---

## 📊 Database Testing

- [ ] Verify database connection works
  - **Test:** Health check endpoint should show "database": "connected"

- [ ] Verify user creation works
  - **Test:** Register new user, check database

- [ ] Verify session creation works
  - **Test:** Login, verify session token works

- [ ] Verify subscription tracking works
  - **Test:** Create subscription, verify database record

---

## 📧 Email Service Testing

- [ ] Verify email service initializes
  - **Check:** Server logs for email service status

- [ ] Test welcome email (on registration)
  - **Check:** Email sent (if email service configured)

- [ ] Test validation ready email
  - **Check:** Email sent after validation (if configured)

---

## ✅ Testing Results

### **Endpoints Tested:** ___ / 25
### **Errors Found:** ___
### **Database Status:** ✅ Connected / ❌ Disconnected
### **Email Service:** ✅ Working / ❌ Not Configured

### **Notes:**
- 
- 
- 

---

## 🐛 Issues Found

### **Critical Issues:**
- 

### **Minor Issues:**
- 

### **Configuration Issues:**
- 

---

**Last Updated:** [Date]
**Tester:** [Name]
**Status:** ⏳ In Progress / ✅ Complete

