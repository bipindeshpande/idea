# Quick Testing Guide

## 🚀 Quick Start Testing

### **1. Start Servers**
```bash
# Terminal 1: Backend
python api.py

# Terminal 2: Frontend
cd frontend
npm run dev
```

### **2. Test Authentication**

**Register:**
- Go to: http://localhost:5173/register
- Create test account
- Verify email validation works

**Login:**
- Go to: http://localhost:5173/login
- Login with test account
- Verify redirect to dashboard

**Password Reset:**
- Click "Forgot Password"
- Enter email
- Check email for reset link
- Reset password

---

### **3. Test Idea Validation**

**Flow:**
1. Go to: http://localhost:5173/validate-idea
2. Answer all 10 category questions
3. Enter idea explanation
4. Submit validation
5. Wait for results (~30-60 seconds)

**Verify:**
- ✅ All 10 parameters show scores
- ✅ Detailed Analysis tab has content
- ✅ Final Conclusion tab has content
- ✅ Next Steps tab has content
- ✅ **PDF Export button works** (Critical!)
- ✅ PDF downloads correctly
- ✅ PDF has proper page breaks

**Re-Validation:**
- Click "Improve This Idea" button
- Verify previous data pre-filled
- Submit new validation
- Check comparison banner appears

---

### **4. Test Idea Discovery**

**Flow:**
1. Go to: http://localhost:5173/ (or /discover)
2. Fill intake form (3 steps)
3. Submit discovery request
4. Wait for results (~60-90 seconds)

**Verify:**
- ✅ Profile analysis displays
- ✅ Top recommendations show
- ✅ Click individual idea opens detail page
- ✅ Full report accessible
- ✅ **PDF Export works** (Critical!)
- ✅ All sections in PDF

---

### **5. Test Dashboard**

**My Sessions Tab:**
- View saved ideas
- View saved validations
- Test filters (date, score)
- Delete a session

**Active Ideas Tab:**
- Create action item on an idea
- Create note on an idea
- Verify idea appears in Active Ideas
- Click to open idea detail

**Search Tab:**
- Search by goal type
- Search by interest area
- Test advanced filters
- Verify results show correctly

**Compare Tab:**
- Select 2-3 ideas
- Run comparison
- Verify comparison results show
- Try selecting validation (should prevent mixing)

---

### **6. Test Subscription & Payment**

**Free Tier Limits:**
- Use 2 validations (should work)
- Try 3rd validation (should show upgrade prompt)
- Use 4 discoveries (should work)
- Try 5th discovery (should show upgrade prompt)

**Payment Flow (Test Mode):**
- Go to: http://localhost:5173/pricing
- Select a paid tier
- Use Stripe test card: **4242 4242 4242 4242**
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)
- Complete payment
- Verify subscription activated
- Check limits updated in dashboard

**Test Cards:**
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Requires Auth: 4000 0025 0000 3155

---

### **7. Test Admin Panel**

**Login:**
- Go to: http://localhost:5173/admin
- Password: admin2024
- MFA Code: 2538

**System Settings:**
- Go to Dashboard tab
- Find "System Settings" section
- Toggle "Debug Mode" ON
- Verify setting saves
- Toggle OFF
- Verify setting saves

**User Management:**
- Go to Users tab
- View user list
- Click on user to see details
- Test subscription update

**Reports:**
- Go to Reports tab
- Export users report
- Export payments report
- Verify CSV downloads

---

### **8. Test PDF Export (Critical!)**

**Validation Results PDF:**
1. Complete a validation
2. Go to validation results page
3. Click "Download PDF" button
4. Verify:
   - ✅ PDF generates without errors
   - ✅ All tabs included (Input, Results, Analysis, Conclusion, Next Steps)
   - ✅ Page breaks work correctly
   - ✅ No content cutoff
   - ✅ Formatting looks good

**Discovery Report PDF:**
1. Complete a discovery
2. Go to full report page
3. Click "Download Complete Report PDF"
4. Verify:
   - ✅ PDF generates without errors
   - ✅ All sections included
   - ✅ Page breaks work correctly
   - ✅ No content cutoff

---

### **9. Test UI/UX**

**Navigation:**
- Test all menu links
- Test mobile menu
- Test dark mode toggle
- Verify responsive design

**Forms:**
- Test form validations
- Test error messages
- Test success messages
- Test loading states

**Pages:**
- Landing page loads
- About page (founder story visible)
- Pricing page
- Contact page

---

### **10. Test Error Handling**

**Network Errors:**
- Disable network
- Try to submit form
- Verify error message shows

**Invalid Data:**
- Submit empty forms
- Enter invalid email
- Verify validation errors

---

## 🐛 Critical Issues to Verify Fixed

### **Debug Mode**
- [ ] Admin can toggle debug mode
- [ ] Debug mode defaults to OFF
- [ ] No debug tracebacks in production mode

### **PDF Export**
- [ ] Validation PDF works
- [ ] Discovery PDF works
- [ ] Page breaks correct
- [ ] No content cutoff

### **Console Logs**
- [ ] No console.log in production build
- [ ] Only console.error for errors
- [ ] All wrapped in dev checks

### **Founder Story**
- [ ] Visible on About page
- [ ] Renders correctly
- [ ] Dark mode compatible

---

## 📝 Test Results

**Date:** _______________
**Tester:** _______________

### Critical Issues Found:
1. _________________________________
2. _________________________________

### Minor Issues Found:
1. _________________________________
2. _________________________________

### Notes:
_________________________________
_________________________________

---

## ✅ Ready to Launch Checklist

Before launching, verify:
- [ ] All critical paths tested
- [ ] PDF export works for both validation and discovery
- [ ] Payment flow works (test mode)
- [ ] Admin panel accessible
- [ ] Debug mode can be toggled
- [ ] No critical errors in console
- [ ] All forms validate correctly
- [ ] Mobile responsive
- [ ] Dark mode works

**If all checked: You're ready for soft launch! 🚀**

