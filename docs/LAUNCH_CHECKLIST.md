# 🚀 Launch Checklist - Ensure People Can Access Your Site

This is a **step-by-step action plan** to make your site accessible after launch.

## ⚡ Quick Start (2 Hours to Live)

### **Step 1: Choose Your Hosting (15 min)**

**Recommended:** Vercel (Frontend) + Railway (Backend)

**Why:**
- ✅ Free tier available
- ✅ Automatic SSL certificates
- ✅ Easy deployment from GitHub
- ✅ Built-in CDN and scaling
- ✅ ~$5-20/month total cost

**Alternatives:**
- Netlify + Render
- DigitalOcean App Platform
- AWS (more complex)

---

### **Step 2: Deploy Backend to Railway (30 min)**

1. **Sign up:** Go to [railway.app](https://railway.app) → Sign up with GitHub

2. **Create Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL Database:**
   - In Railway project, click "+ New"
   - Select "PostgreSQL"
   - Railway auto-sets `DATABASE_URL`

4. **Set Environment Variables:**
   In Railway → Variables tab, add:

   ```bash
   OPENAI_API_KEY=sk-your-key
   STRIPE_SECRET_KEY=sk_live_your-key
   ADMIN_PASSWORD=your-secure-password
   SECRET_KEY=generate-random-32-chars
   EMAIL_ENABLED=true
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_your-key
   FROM_EMAIL=noreply@yourdomain.com
   FROM_NAME=Startup Idea Advisor
   PORT=8000
   ```

5. **Deploy:**
   - Railway auto-detects Python
   - Set start command: `python api.py`
   - Railway will deploy automatically

6. **Get Backend URL:**
   - Railway gives you: `https://your-app.railway.app`
   - **Copy this URL** - you'll need it!

7. **Test Backend:**
   - Visit: `https://your-app.railway.app/api/health`
   - Should return: `{"status": "healthy"}`

---

### **Step 3: Deploy Frontend to Vercel (30 min)**

1. **Sign up:** Go to [vercel.com](https://vercel.com) → Sign up with GitHub

2. **Import Project:**
   - Click "Add New Project"
   - Select your GitHub repository
   - Set **Root Directory** to: `frontend`

3. **Configure Build:**
   - Framework Preset: **Vite**
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)

4. **Set Environment Variables:**
   In Vercel → Settings → Environment Variables:

   ```bash
   VITE_STRIPE_PUBLIC_KEY=pk_live_your-key
   VITE_API_URL=https://your-app.railway.app
   ```

5. **Update vercel.json:**
   Edit `frontend/vercel.json` and replace:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://YOUR-RAILWAY-URL.railway.app/api/:path*"
       }
     ]
   }
   ```
   Replace `YOUR-RAILWAY-URL` with your actual Railway URL.

6. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes
   - You'll get: `https://your-app.vercel.app`

7. **Test Frontend:**
   - Visit your Vercel URL
   - Try registering a user
   - Check browser console for errors

---

### **Step 4: Connect Custom Domain (20 min)**

1. **Buy Domain (if needed):**
   - Namecheap, Google Domains, or Cloudflare
   - Cost: ~$10-15/year

2. **Add Domain to Vercel:**
   - Vercel Dashboard → Settings → Domains
   - Add: `yourdomain.com` and `www.yourdomain.com`
   - Vercel shows DNS records to add

3. **Add DNS Records:**
   - Go to your domain registrar's DNS settings
   - Add the records Vercel provided:
     ```
     Type: A
     Name: @
     Value: 76.76.21.21
     
     Type: CNAME
     Name: www
     Value: cname.vercel-dns.com
     ```

4. **Wait for DNS:**
   - Usually 5-60 minutes
   - Check: [whatsmydns.net](https://www.whatsmydns.net)

5. **SSL Certificate:**
   - Vercel automatically provisions SSL
   - Wait 5-10 minutes after DNS propagates

6. **Test:**
   - Visit: `https://yourdomain.com`
   - Should load your site with SSL lock icon

---

### **Step 5: Final Configuration (15 min)**

1. **Update CORS in Backend:**
   In `api.py`, ensure CORS allows your domain:
   ```python
   CORS(app, origins=[
       "https://yourdomain.com",
       "https://www.yourdomain.com",
       "https://your-app.vercel.app"  # Keep Vercel URL as backup
   ])
   ```

2. **Set Up Cron Job:**
   - Use [cron-job.org](https://cron-job.org) (free)
   - URL: `https://your-app.railway.app/api/emails/check-expiring`
   - Method: POST
   - Schedule: Daily at 9 AM UTC

3. **Test Everything:**
   - [ ] User registration works
   - [ ] User login works
   - [ ] Idea validation works
   - [ ] Idea discovery works
   - [ ] Payment flow works (test mode first!)
   - [ ] Admin panel accessible
   - [ ] Emails are sending

---

## ✅ Pre-Launch Testing Checklist

### **Functionality Tests:**
- [ ] Homepage loads correctly
- [ ] User can register with email
- [ ] User can login
- [ ] User can reset password
- [ ] User can validate an idea
- [ ] User can discover ideas
- [ ] User can view reports
- [ ] User can subscribe (test payment)
- [ ] User can manage subscription
- [ ] Admin panel works
- [ ] Mobile responsive design works

### **Payment Tests:**
- [ ] Stripe test payment works
- [ ] Subscription activates after payment
- [ ] Payment history shows correctly
- [ ] Subscription cancellation works
- [ ] Switch to Stripe **live keys** before launch

### **Email Tests:**
- [ ] Welcome email sends on registration
- [ ] Validation ready email sends
- [ ] Trial ending email sends (test manually)
- [ ] Subscription emails send
- [ ] Check Resend dashboard for delivery

### **Security Tests:**
- [ ] HTTPS is enforced (SSL lock icon)
- [ ] Admin password is changed
- [ ] API keys are production keys (not test)
- [ ] Database is secure
- [ ] CORS is configured correctly

---

## 🚨 Common Issues & Quick Fixes

### **Issue: Frontend can't reach backend**
**Fix:**
1. Check `vercel.json` has correct Railway URL
2. Check `VITE_API_URL` in Vercel environment variables
3. Verify CORS in backend allows your frontend domain

### **Issue: Database connection fails**
**Fix:**
1. Check `DATABASE_URL` in Railway variables
2. Verify PostgreSQL is running in Railway
3. Check Railway logs for connection errors

### **Issue: Stripe payments fail**
**Fix:**
1. Verify Stripe keys are **live keys** (not test)
2. Check Stripe dashboard for webhook configuration
3. Verify `STRIPE_SECRET_KEY` is set correctly

### **Issue: Emails not sending**
**Fix:**
1. Check Resend API key is correct
2. Verify `FROM_EMAIL` is verified in Resend
3. Check Resend dashboard for delivery status
4. Verify `EMAIL_ENABLED=true`

### **Issue: SSL certificate not working**
**Fix:**
1. Wait 5-10 minutes after DNS propagation
2. Verify DNS records are correct
3. Check Vercel dashboard → Domains → SSL status

---

## 📊 Post-Launch Monitoring

### **Set Up Uptime Monitoring:**
1. **UptimeRobot** (free): [uptimerobot.com](https://uptimerobot.com)
   - Monitor: `https://yourdomain.com`
   - Monitor: `https://your-app.railway.app/api/health`
   - Alert: Email/SMS if down

2. **Check Daily:**
   - Railway logs for errors
   - Vercel analytics for traffic
   - Stripe dashboard for payments
   - Resend dashboard for email delivery

### **Set Up Error Tracking:**
1. **Sentry** (free tier): [sentry.io](https://sentry.io)
   - Add to frontend and backend
   - Get alerts for errors

---

## 🎯 Launch Day Checklist

**1 Hour Before:**
- [ ] All tests pass
- [ ] Stripe switched to live mode
- [ ] All environment variables set
- [ ] Domain is connected
- [ ] SSL is active
- [ ] Monitoring is set up

**Launch:**
- [ ] Announce on social media
- [ ] Share with beta users
- [ ] Monitor error logs
- [ ] Watch uptime monitoring
- [ ] Be ready to fix issues quickly

**First 24 Hours:**
- [ ] Monitor user registrations
- [ ] Check for errors in logs
- [ ] Verify payments are processing
- [ ] Respond to user feedback
- [ ] Fix any critical bugs

---

## 💰 Cost Estimate

**Monthly Costs:**
- **Vercel:** Free (or $20/month for Pro)
- **Railway:** $5-20/month (depends on usage)
- **Domain:** $1-2/month ($10-15/year)
- **Resend:** Free tier (3,000 emails/month)
- **Stripe:** 2.9% + $0.30 per transaction
- **Total:** ~$6-25/month + transaction fees

---

## 📞 Need Help?

- **Railway Support:** [docs.railway.app](https://docs.railway.app)
- **Vercel Support:** [vercel.com/docs](https://vercel.com/docs)
- **Stripe Support:** [stripe.com/docs](https://stripe.com/docs)
- **Resend Support:** [resend.com/docs](https://resend.com/docs)

---

## 🎉 You're Ready!

Follow this checklist step-by-step, and your site will be **live and accessible** in under 2 hours!

**Next Steps After Launch:**
1. Monitor for first week
2. Gather user feedback
3. Fix any issues
4. Plan marketing strategy
5. Iterate and improve

**Good luck with your launch! 🚀**

