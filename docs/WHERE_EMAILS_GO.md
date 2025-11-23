# Where Do Emails Go When Resend Isn't Set Up?

## 📍 Current Situation

**Without Resend configured:**
- ✅ Emails are "sent" (code runs successfully)
- ❌ But they're **logged to console**, not actually delivered
- 📝 You can see them in your Flask server terminal/logs

---

## 🔍 Where to Find Your Emails Right Now

### Option 1: Flask Server Console

**Check your terminal where Flask is running:**
- Look for lines like: `Email service not configured. Logging email to...`
- The full email content (HTML) will be printed there

**Example output:**
```
WARNING: Email service not configured. Logging email to user@example.com: Welcome to Startup Idea Advisor
INFO: Email content:
<!DOCTYPE html>
<html>
...
```

### Option 2: Check Flask Logs

If you're running Flask with logging, check:
- Console output
- Log files (if configured)

---

## ✅ To Actually Send Emails: Set Up Resend

### Quick Setup (5 minutes)

1. **Sign up for Resend:**
   - Go to https://resend.com
   - Click "Sign Up" (free)
   - Verify your email

2. **Get API Key:**
   - After signup, go to Dashboard
   - Click "API Keys" in sidebar
   - Click "Create API Key"
   - Copy the key (starts with `re_`)

3. **Add to Your `.env` File:**
   ```bash
   RESEND_API_KEY=re_your_actual_key_here
   EMAIL_PROVIDER=resend
   EMAIL_ENABLED=true
   FROM_EMAIL=noreply@startupideaadvisor.com
   ```

4. **Install Resend Package:**
   ```bash
   pip install resend
   ```

5. **Restart Flask Server:**
   - Stop the current server (Ctrl+C)
   - Start again: `python api.py`
   - You should see: `Resend email service initialized`

6. **Verify Domain (For Custom Email):**
   - In Resend Dashboard → Domains
   - Add `startupideaadvisor.com`
   - Add DNS records (see `docs/CUSTOM_EMAIL_SETUP.md`)
   - Verify domain

---

## 🧪 Test Email Sending

### Test 1: Contact Form
1. Go to `/contact`
2. Submit the form
3. Check your email inbox (if `ADMIN_EMAIL` is set)
4. Check Resend Dashboard → Emails (to see sent emails)

### Test 2: User Registration
1. Register a new user
2. Check user's email for welcome email
3. Check Resend Dashboard

---

## 📧 Where Emails Go After Setup

### With Resend Configured:

1. **Emails You Send:**
   - To: User's email inbox ✅
   - Also visible in: Resend Dashboard → Emails

2. **User Replies:**
   - To: `REPLY_TO_EMAIL` (if set) ✅
   - Or: Resend Dashboard → Replies

3. **Admin Notifications:**
   - To: `ADMIN_EMAIL` inbox ✅

4. **Contact Form:**
   - To: `ADMIN_EMAIL` inbox ✅
   - Confirmation to: User's email ✅

---

## 🔍 Check Resend Dashboard

After setting up Resend:
1. Go to https://resend.com/emails
2. See all sent emails
3. Check delivery status
4. View email content
5. See replies

---

## ⚠️ Current Status

**Right Now:**
- Emails are logged to console only
- No actual delivery
- Need to set up Resend to send real emails

**After Setup:**
- Emails will be delivered to inboxes
- You can track them in Resend Dashboard
- Replies will work

---

## 🚀 Quick Start Checklist

- [ ] Sign up at https://resend.com
- [ ] Get API key
- [ ] Add `RESEND_API_KEY` to `.env`
- [ ] Run `pip install resend`
- [ ] Restart Flask server
- [ ] Verify "Resend email service initialized" message
- [ ] Test contact form
- [ ] Check Resend Dashboard for sent emails

---

## 💡 Pro Tip

**For Development/Testing:**
- You can keep `EMAIL_ENABLED=false` to log emails only
- Or use Resend's test mode
- Or check console logs

**For Production:**
- Must have Resend configured
- Must verify domain for custom email
- Must set `ADMIN_EMAIL` and `REPLY_TO_EMAIL`

