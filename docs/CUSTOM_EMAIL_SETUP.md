# Custom Email Domain Setup - Day One

## 🎯 Goal: Use `noreply@startupideaadvisor.com` from Day One

## Step-by-Step Setup

### Step 1: Sign Up for Resend

1. Go to https://resend.com
2. Sign up for a free account
3. Verify your email address
4. Go to Dashboard → API Keys
5. Create a new API key
6. Copy the API key (starts with `re_`)

### Step 2: Add Your Domain to Resend

1. In Resend Dashboard, go to **"Domains"**
2. Click **"Add Domain"**
3. Enter: `startupideaadvisor.com`
4. Click **"Add Domain"**
5. Resend will show you DNS records to add

### Step 3: Add DNS Records to Your Domain

You'll need to add these records to your domain's DNS settings:

#### Record 1: SPF Record (TXT)

```
Type: TXT
Name: @ (or leave blank, depends on your DNS provider)
Value: v=spf1 include:resend.com ~all
TTL: 3600 (or default)
```

#### Record 2: DKIM Record 1 (CNAME)

```
Type: CNAME
Name: resend._domainkey (or resend._domainkey.startupideaadvisor.com)
Value: [provided by Resend - looks like: xxxxxx.dkim.resend.com]
TTL: 3600
```

#### Record 3: DKIM Record 2 (CNAME)

```
Type: CNAME
Name: resend1._domainkey (or resend1._domainkey.startupideaadvisor.com)
Value: [provided by Resend - looks like: xxxxxx.dkim.resend.com]
TTL: 3600
```

#### Record 4: DMARC Record (TXT) - Optional but Recommended

```
Type: TXT
Name: _dmarc (or _dmarc.startupideaadvisor.com)
Value: v=DMARC1; p=none; rua=mailto:dmarc@startupideaadvisor.com
TTL: 3600
```

### Step 4: Where to Add DNS Records

**If your domain is on:**
- **Namecheap**: Go to Domain List → Manage → Advanced DNS
- **GoDaddy**: Go to My Products → DNS → Manage DNS
- **Cloudflare**: Go to DNS → Records → Add Record
- **Google Domains**: Go to DNS → Custom Records
- **AWS Route 53**: Go to Hosted Zones → Create Record

### Step 5: Verify Domain in Resend

1. After adding DNS records, wait 5-10 minutes for propagation
2. Go back to Resend Dashboard → Domains
3. Click **"Verify"** next to your domain
4. Resend will check the DNS records
5. Once verified (green checkmark), you're ready!

### Step 6: Configure Your App

Add to your `.env` file:

```bash
# Email Configuration
EMAIL_PROVIDER=resend
EMAIL_ENABLED=true
FROM_EMAIL=noreply@startupideaadvisor.com
FROM_NAME=Startup Idea Advisor
RESEND_API_KEY=re_your_actual_key_here
```

### Step 7: Test It

1. Restart your Flask server
2. Register a new test user
3. Check the welcome email
4. Verify the "From" address shows `noreply@startupideaadvisor.com`

---

## 🚨 Common Issues & Solutions

### Issue: DNS records not verifying

**Solutions:**
- Wait 10-15 minutes (DNS propagation takes time)
- Double-check record values (copy-paste from Resend exactly)
- Make sure record names match exactly (some DNS providers add the domain automatically)
- Try using `dig` or online DNS checker to verify records are live

### Issue: "Domain not verified" error

**Solutions:**
- Make sure all 3 records (SPF + 2 DKIM) are added
- Check record types are correct (TXT for SPF, CNAME for DKIM)
- Verify record values match Resend exactly
- Wait a bit longer and try verifying again

### Issue: Emails going to spam

**Solutions:**
- Make sure SPF and DKIM records are verified
- Add DMARC record (helps with deliverability)
- Avoid spam trigger words in subject/content
- Warm up your domain (start with low volume)

---

## 📋 DNS Records Checklist

Before verifying, make sure you have:

- [ ] SPF record (TXT) added
- [ ] DKIM record 1 (CNAME) added
- [ ] DKIM record 2 (CNAME) added
- [ ] DMARC record (TXT) added (optional but recommended)
- [ ] Waited 5-10 minutes after adding records
- [ ] Verified domain in Resend dashboard

---

## ✅ Quick Reference

**Your Email Address:**
```
noreply@startupideaadvisor.com
```

**Environment Variables:**
```bash
FROM_EMAIL=noreply@startupideaadvisor.com
RESEND_API_KEY=re_your_key
```

**Resend Dashboard:**
- Domains: https://resend.com/domains
- API Keys: https://resend.com/api-keys

---

## 🎯 Alternative Email Addresses

You can also use:
- `notifications@startupideaadvisor.com`
- `hello@startupideaadvisor.com`
- `support@startupideaadvisor.com`
- `noreply@mail.startupideaadvisor.com` (if using subdomain)

Just make sure the domain is verified in Resend first!

---

## 📞 Need Help?

- Resend Docs: https://resend.com/docs
- Resend Support: support@resend.com
- Check DNS records: https://mxtoolbox.com/SuperTool.aspx

