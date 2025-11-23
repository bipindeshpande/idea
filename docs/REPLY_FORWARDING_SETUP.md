# Reply Forwarding Setup - Resend

## 🎯 Goal: Forward User Replies to Your Email

When users reply to emails from `noreply@startupideaadvisor.com`, forward those replies to your personal email.

---

## 📧 Option 1: Resend Reply-To Header (Easiest)

### Setup in Your Code

Add `Reply-To` header to your email templates so replies go to a different address.

**Update `app/services/email_service.py`:**

```python
def _send_resend(self, to_email: str, subject: str, html_content: str, text_content: Optional[str]) -> bool:
    """Send email via Resend."""
    try:
        reply_to = os.environ.get("REPLY_TO_EMAIL", "support@startupideaadvisor.com")
        
        params = {
            "from": f"{self.from_name} <{self.from_email}>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "reply_to": reply_to,  # Add this line
        }
        if text_content:
            params["text"] = text_content
        
        email = self.client.Emails.send(params)
        logger.info(f"Email sent via Resend to {to_email}: {email.get('id', 'unknown')}")
        return True
    except Exception as e:
        logger.error(f"Resend send failed: {e}")
        return False
```

**Set environment variable:**
```bash
REPLY_TO_EMAIL=your-email@gmail.com
# OR
REPLY_TO_EMAIL=support@startupideaadvisor.com
```

**How it works:**
- Users click "Reply" in their email
- Reply goes to `REPLY_TO_EMAIL` address
- You receive it in your inbox

---

## 📧 Option 2: Resend Webhooks (Advanced)

### Setup Webhook to Forward Replies

1. **In Resend Dashboard:**
   - Go to "Webhooks"
   - Click "Add Webhook"
   - Select event: "email.replied"
   - Enter webhook URL (your backend endpoint)

2. **Create Backend Endpoint:**
   ```python
   @app.post("/api/webhooks/resend")
   def resend_webhook():
       data = request.get_json()
       if data.get("type") == "email.replied":
           # Forward reply to your email
           reply_email = data.get("data", {}).get("to")
           reply_content = data.get("data", {}).get("text")
           # Send to your email
   ```

3. **Forward to Your Email:**
   - When webhook receives reply
   - Extract reply content
   - Send email to your personal address

---

## 📧 Option 3: Use Support Email Address (Best for Production)

### Setup Professional Support Email

1. **Set up email inbox:**
   - Use Google Workspace, Zoho Mail, or similar
   - Create: `support@startupideaadvisor.com`
   - Verify domain in email provider

2. **Configure Resend Reply-To:**
   ```bash
   REPLY_TO_EMAIL=support@startupideaadvisor.com
   ```

3. **Access inbox:**
   - Log into your email provider
   - Check `support@startupideaadvisor.com` inbox
   - Reply directly from there

**Pros:**
- ✅ Professional support email
- ✅ Can have multiple people access it
- ✅ Better for customer support
- ✅ Separate from personal email

---

## ⚙️ Quick Setup (Recommended)

### Step 1: Set Reply-To Email

Add to your `.env`:
```bash
REPLY_TO_EMAIL=your-email@gmail.com
```

### Step 2: Update Email Service

The code will be updated to include Reply-To header automatically.

### Step 3: Test It

1. Send a test email to yourself
2. Reply to that email
3. Check if reply goes to `REPLY_TO_EMAIL`

---

## 📋 Environment Variables

```bash
# Sending email
FROM_EMAIL=noreply@startupideaadvisor.com

# Receiving replies
REPLY_TO_EMAIL=your-email@gmail.com
# OR
REPLY_TO_EMAIL=support@startupideaadvisor.com

# Admin notifications
ADMIN_EMAIL=your-email@gmail.com
```

---

## ✅ Summary

**Current Setup:**
- Sending: `noreply@startupideaadvisor.com`
- Replies: Go to Resend Dashboard (manual check)

**After Setup:**
- Sending: `noreply@startupideaadvisor.com`
- Replies: Forward to `REPLY_TO_EMAIL` (your inbox)

**Next Steps:**
1. Set `REPLY_TO_EMAIL` in `.env`
2. Code will automatically add Reply-To header
3. Test by replying to an email
4. Replies will come to your inbox!

