# Triggered Emails Setup Guide

## ✅ Implementation Complete

Phase 1: Triggered Emails has been implemented with the following features:

### 📧 Email Types Implemented

1. **Welcome Email** - Sent when user registers
   - Trigger: User registration
   - Content: Welcome message, getting started guide, 3-day trial info

2. **Validation Ready Email** - Sent when idea validation completes
   - Trigger: Validation completion
   - Content: Validation score, link to results, next steps

3. **Trial Ending Email** - Sent 1 day before trial expires
   - Trigger: Trial expiring in 1 day
   - Content: Reminder, subscription options, CTA to subscribe

4. **Subscription Expiring Email** - Sent 3 days before subscription expires
   - Trigger: Paid subscription expiring in 3 days
   - Content: Renewal reminder, subscription benefits

5. **Subscription Activated Email** - Sent when payment is confirmed
   - Trigger: Payment confirmation
   - Content: Welcome to paid plan, features unlocked

---

## 🔧 Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Email Service Configuration
EMAIL_ENABLED=true  # Set to false to disable emails (logs only)
EMAIL_PROVIDER=resend  # Options: resend, sendgrid, smtp
FROM_EMAIL=noreply@startupideaadvisor.com
FROM_NAME=Startup Idea Advisor

# Resend Configuration (Recommended)
RESEND_API_KEY=your_resend_api_key_here

# OR SendGrid Configuration
# SENDGRID_API_KEY=your_sendgrid_api_key_here

# OR SMTP Configuration
# SMTP_SERVER=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USERNAME=your_email@gmail.com
# SMTP_PASSWORD=your_app_password
```

### Email Provider Setup

#### Option 1: Resend (Recommended - Easiest)
1. Sign up at https://resend.com
2. Get your API key
3. Set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY=your_key`
4. Install: `pip install resend` (optional, will auto-import if installed)

**Free Tier**: 3,000 emails/month

#### Option 2: SendGrid
1. Sign up at https://sendgrid.com
2. Get your API key
3. Set `EMAIL_PROVIDER=sendgrid` and `SENDGRID_API_KEY=your_key`
4. Install: `pip install sendgrid`

**Free Tier**: 100 emails/day

#### Option 3: SMTP (Gmail, etc.)
1. Set `EMAIL_PROVIDER=smtp`
2. Configure SMTP settings in environment variables
3. For Gmail: Use App Password (not regular password)

**Note**: SMTP is less reliable for production use

---

## 📦 Installation

### Install Email Packages (Optional)

The email service will work without packages installed (logs only), but to actually send emails:

```bash
# For Resend
pip install resend

# OR For SendGrid
pip install sendgrid
```

---

## 🚀 Usage

### Automatic Triggers

Emails are automatically sent when:
- ✅ User registers → Welcome email
- ✅ Validation completes → Validation ready email
- ✅ Payment confirmed → Subscription activated email

### Manual Check for Expiring Subscriptions

Call the endpoint to check and send expiration emails:

```bash
POST /api/emails/check-expiring
```

**Response:**
```json
{
  "success": true,
  "emails_sent": 5,
  "message": "Checked expiring subscriptions, sent 5 emails"
}
```

### Setting Up Cron Job

To automatically check expiring subscriptions daily, set up a cron job:

```bash
# Run daily at 9 AM
0 9 * * * curl -X POST http://localhost:8000/api/emails/check-expiring
```

Or use a service like:
- **Cron-job.org** (free)
- **EasyCron** (free tier)
- **AWS EventBridge** (if on AWS)
- **Heroku Scheduler** (if on Heroku)

---

## 🧪 Testing

### Test Email Sending

1. **Disable emails** (logs only):
   ```bash
   EMAIL_ENABLED=false
   ```
   Emails will be logged to console instead of sent.

2. **Test welcome email**: Register a new user

3. **Test validation email**: Complete an idea validation

4. **Test subscription email**: Complete a payment

5. **Test expiration check**: Call `/api/emails/check-expiring`

### Check Logs

All email attempts are logged:
- Success: `Email sent via [provider] to [email]`
- Failure: `Failed to send email to [email]: [error]`

---

## 📊 Email Templates

All templates are in `email_templates.py`:
- Professional HTML design
- Responsive layout
- Brand colors
- Clear CTAs
- Plain text fallback

### Customizing Templates

Edit `email_templates.py` to customize:
- Colors and styling
- Content and messaging
- CTA buttons
- Footer information

---

## 🔍 Monitoring

### Check Email Status

1. **Provider Dashboard**: Check your email provider's dashboard for:
   - Delivery rates
   - Open rates
   - Bounce rates
   - Spam reports

2. **Application Logs**: Check Flask logs for:
   - Email send attempts
   - Success/failure messages
   - Error details

### Common Issues

1. **Emails not sending**:
   - Check `EMAIL_ENABLED=true`
   - Verify API key is set correctly
   - Check provider dashboard for errors
   - Review application logs

2. **Emails going to spam**:
   - Set up SPF/DKIM records (provider will guide you)
   - Use a custom domain for FROM_EMAIL
   - Avoid spam trigger words

3. **Rate limiting**:
   - Check provider limits
   - Implement rate limiting if needed
   - Use queue system for high volume

---

## 📈 Next Steps

### Phase 2: In-App Engagement (Recommended Next)

After triggered emails are working, consider:
- Dashboard tips section
- "What's New" feature
- Personalized recommendations on login
- Activity summaries

### Phase 3: Blog/Content

- SEO-optimized articles
- Shareable frameworks
- Case studies

---

## ✅ Checklist

- [x] Email service module created
- [x] Email templates created
- [x] Welcome email trigger added
- [x] Validation ready email trigger added
- [x] Subscription activated email trigger added
- [x] Expiration check endpoint created
- [ ] Email provider configured (Resend/SendGrid/SMTP)
- [ ] Environment variables set
- [ ] Test emails sent
- [ ] Cron job set up (optional)
- [ ] Email deliverability verified

---

## 🎯 Summary

**What's Done:**
- ✅ Complete email service with multiple provider support
- ✅ 5 email templates (welcome, validation, trial ending, subscription expiring, subscription activated)
- ✅ Automatic triggers for key events
- ✅ Manual endpoint for expiration checks
- ✅ Error handling and logging

**What You Need to Do:**
1. Choose email provider (Resend recommended)
2. Set environment variables
3. Test email sending
4. Set up cron job for expiration checks (optional)

**Time to Value:** ~30 minutes setup, then automatic!

