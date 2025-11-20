# 🚀 Deployment Guide - Making Your Site Accessible

This guide covers everything you need to deploy Startup Idea Advisor and make it accessible to users.

## 📋 Table of Contents

1. [Hosting Options](#hosting-options)
2. [Recommended Setup](#recommended-setup)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Domain & DNS Configuration](#domain--dns-configuration)
5. [Environment Variables](#environment-variables)
6. [Post-Deployment Checklist](#post-deployment-checklist)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🏗️ Hosting Options

### Option 1: **Vercel (Frontend) + Railway/Render (Backend)** ⭐ Recommended

**Why:** Easiest, fastest, and most cost-effective for startups

- **Frontend (Vercel):** Free tier, automatic SSL, CDN, instant deployments
- **Backend (Railway/Render):** $5-20/month, easy database setup, automatic SSL

**Cost:** ~$5-20/month

### Option 2: **Netlify (Frontend) + Heroku (Backend)**

- **Frontend (Netlify):** Free tier, great for React apps
- **Backend (Heroku):** $7-25/month, reliable, easy PostgreSQL

**Cost:** ~$7-25/month

### Option 3: **AWS (Full Stack)**

- **Frontend:** S3 + CloudFront
- **Backend:** EC2 or Elastic Beanstalk
- **Database:** RDS PostgreSQL

**Cost:** ~$20-50/month (more complex setup)

### Option 4: **DigitalOcean App Platform**

- Full-stack deployment in one place
- Automatic SSL, managed database

**Cost:** ~$12-25/month

---

## ✅ Recommended Setup: Vercel + Railway

This is the **easiest and most reliable** option for launch.

---

## 📦 Step-by-Step Deployment

### **Part 1: Deploy Backend (Railway)**

#### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"

#### Step 2: Deploy Backend
1. Click "Deploy from GitHub repo"
2. Select your repository
3. Railway will auto-detect Python
4. Set root directory to project root (not `frontend/`)

#### Step 3: Configure Environment Variables
In Railway dashboard, add these variables:

```bash
# Required
OPENAI_API_KEY=sk-your-key-here
STRIPE_SECRET_KEY=sk_live_your-key-here
ADMIN_PASSWORD=your-secure-password-here
SECRET_KEY=generate-random-32-char-string

# Database (Railway auto-creates PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Email Service
EMAIL_ENABLED=true
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your-key-here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Startup Idea Advisor

# Optional
PORT=8000
```

#### Step 4: Add PostgreSQL Database
1. In Railway project, click "+ New"
2. Select "PostgreSQL"
3. Railway will auto-set `DATABASE_URL`

#### Step 5: Initialize Database
1. Railway will run your app automatically
2. Database tables will be created on first run (via `db.create_all()`)
3. Check logs to confirm database initialization

#### Step 6: Get Backend URL
- Railway provides a URL like: `https://your-app.railway.app`
- **Note this URL** - you'll need it for frontend

---

### **Part 2: Deploy Frontend (Vercel)**

#### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"

#### Step 2: Import Repository
1. Select your GitHub repository
2. Set root directory to `frontend/`
3. Framework preset: **Vite**

#### Step 3: Configure Build Settings
Vercel should auto-detect, but verify:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

#### Step 4: Set Environment Variables
In Vercel dashboard → Settings → Environment Variables:

```bash
# Stripe (Public Key)
VITE_STRIPE_PUBLIC_KEY=pk_live_your-key-here

# Backend API URL (Railway URL)
VITE_API_URL=https://your-app.railway.app

# Optional
VITE_GA_ID=G-XXXXXXXXXX
```

#### Step 5: Update Frontend API Configuration
Create `frontend/vite.config.js` production proxy or update API calls:

**Option A: Update API calls to use environment variable**
- Update all `fetch("/api/...")` to use `import.meta.env.VITE_API_URL + "/api/..."`

**Option B: Use Vercel rewrites** (Recommended)
Create `vercel.json` in `frontend/`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-app.railway.app/api/:path*"
    }
  ]
}
```

#### Step 6: Deploy
1. Click "Deploy"
2. Vercel will build and deploy
3. You'll get a URL like: `https://your-app.vercel.app`

---

### **Part 3: Connect Custom Domain**

#### Step 1: Buy Domain (if needed)
- **Recommended:** Namecheap, Google Domains, or Cloudflare
- Cost: ~$10-15/year

#### Step 2: Configure DNS

**For Vercel (Frontend):**
1. In Vercel dashboard → Settings → Domains
2. Add your domain: `yourdomain.com`
3. Vercel will show DNS records to add:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

**For Railway (Backend):**
1. Railway provides a domain automatically
2. Or add custom domain in Railway settings
3. Update `VITE_API_URL` in Vercel to use custom domain

#### Step 3: Add DNS Records
1. Go to your domain registrar's DNS settings
2. Add the records Vercel provided
3. Wait 5-60 minutes for DNS propagation

#### Step 4: SSL Certificate
- **Vercel:** Automatic SSL (Let's Encrypt)
- **Railway:** Automatic SSL
- Both will provision SSL certificates automatically

---

## 🔐 Environment Variables Summary

### **Backend (Railway) - Required:**
```bash
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
ADMIN_PASSWORD=secure-password
SECRET_KEY=random-32-chars
DATABASE_URL=postgresql://... (auto-set by Railway)
EMAIL_ENABLED=true
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Startup Idea Advisor
```

### **Frontend (Vercel) - Required:**
```bash
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_API_URL=https://your-backend.railway.app
```

### **Frontend (Vercel) - Optional:**
```bash
VITE_GA_ID=G-XXXXXXXXXX
```

---

## ✅ Post-Deployment Checklist

### **Immediate (Before Launch)**
- [ ] Backend is accessible at Railway URL
- [ ] Frontend is accessible at Vercel URL
- [ ] Custom domain is connected and working
- [ ] SSL certificates are active (HTTPS)
- [ ] Database is initialized (check Railway logs)
- [ ] All environment variables are set correctly
- [ ] Test registration flow works
- [ ] Test payment flow works (use Stripe test mode first)
- [ ] Test idea validation works
- [ ] Test idea discovery works
- [ ] Admin panel is accessible (with secure password)

### **Testing Checklist**
- [ ] User can register
- [ ] User can login
- [ ] User can reset password
- [ ] User can validate an idea
- [ ] User can discover ideas
- [ ] User can subscribe (test mode)
- [ ] User can manage subscription
- [ ] Admin panel works
- [ ] Emails are being sent (check Resend dashboard)
- [ ] Mobile responsive design works

### **Security Checklist**
- [ ] Admin password is changed from default
- [ ] `SECRET_KEY` is a strong random string
- [ ] All API keys are production keys (not test keys)
- [ ] HTTPS is enforced (automatic with Vercel/Railway)
- [ ] CORS is configured correctly
- [ ] Database credentials are secure

### **Performance Checklist**
- [ ] Frontend loads in < 3 seconds
- [ ] API responses are < 2 seconds
- [ ] Images/assets are optimized
- [ ] CDN is working (automatic with Vercel)

---

## 🔄 Setting Up Cron Job for Expiring Subscriptions

### **Option 1: Railway Cron (Recommended)**
Railway doesn't have built-in cron, but you can:

1. **Use a cron service:**
   - [cron-job.org](https://cron-job.org) (free)
   - [EasyCron](https://www.easycron.com) (free tier)
   - [Cronitor](https://cronitor.io) (free tier)

2. **Set up daily job:**
   - URL: `https://your-backend.railway.app/api/emails/check-expiring`
   - Method: POST
   - Schedule: Daily at 9 AM UTC
   - Add header: `Authorization: Bearer your-admin-password` (optional, or make endpoint public with rate limiting)

### **Option 2: Use Railway's Scheduled Tasks**
Create a separate lightweight service that calls the endpoint daily.

### **Option 3: Add to Backend Startup**
Add a background thread that runs daily (less reliable, not recommended).

---

## 📊 Monitoring & Maintenance

### **Uptime Monitoring**
Set up free monitoring:
- [UptimeRobot](https://uptimerobot.com) - Free tier monitors every 5 minutes
- [Pingdom](https://www.pingdom.com) - Free tier
- [StatusCake](https://www.statuscake.com) - Free tier

Monitor:
- Frontend URL: `https://yourdomain.com`
- Backend health: `https://your-backend.railway.app/api/health` (create this endpoint)

### **Error Tracking**
- [Sentry](https://sentry.io) - Free tier, excellent error tracking
- Add to both frontend and backend

### **Analytics**
- Google Analytics (already configured)
- Check Vercel Analytics (built-in)

### **Logs**
- **Railway:** Built-in logs dashboard
- **Vercel:** Built-in logs dashboard
- Set up log aggregation if needed

### **Database Backups**
- **Railway:** Automatic daily backups (check plan)
- **Manual:** Export database weekly
- Consider automated backup to S3

---

## 🚨 Common Issues & Solutions

### **Issue: Frontend can't reach backend**
- **Solution:** Check `VITE_API_URL` or `vercel.json` rewrite rules
- Verify CORS settings in backend allow your frontend domain

### **Issue: Database connection fails**
- **Solution:** Check `DATABASE_URL` in Railway
- Verify database is running
- Check connection limits

### **Issue: Stripe payments fail**
- **Solution:** Verify you're using live keys (not test keys)
- Check Stripe webhook configuration (if using webhooks)
- Verify `STRIPE_SECRET_KEY` is set correctly

### **Issue: Emails not sending**
- **Solution:** Check Resend API key
- Verify `FROM_EMAIL` is verified in Resend
- Check Resend dashboard for delivery status

### **Issue: SSL certificate not working**
- **Solution:** Wait 5-10 minutes after DNS propagation
- Verify DNS records are correct
- Check Vercel/Railway SSL status

---

## 📈 Scaling Considerations

### **When to Scale:**
- **Users:** 100+ concurrent users
- **Database:** > 10,000 records
- **Traffic:** > 10,000 requests/day

### **Scaling Options:**
1. **Database:** Upgrade Railway PostgreSQL plan
2. **Backend:** Railway auto-scales, but monitor usage
3. **Frontend:** Vercel CDN handles scaling automatically
4. **Caching:** Add Redis for session management (future)

---

## 🎯 Quick Launch Checklist

**1 Week Before Launch:**
- [ ] Set up Railway account
- [ ] Set up Vercel account
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Test all features in production environment

**3 Days Before Launch:**
- [ ] Buy domain (if needed)
- [ ] Configure DNS
- [ ] Set up SSL
- [ ] Test custom domain
- [ ] Set up monitoring

**1 Day Before Launch:**
- [ ] Final testing
- [ ] Switch Stripe to live mode
- [ ] Set up cron job
- [ ] Prepare launch announcement

**Launch Day:**
- [ ] Monitor uptime
- [ ] Watch error logs
- [ ] Be ready to fix issues quickly

---

## 💡 Pro Tips

1. **Start with test mode:** Use Stripe test keys initially, switch to live before launch
2. **Monitor costs:** Railway and Vercel have usage-based pricing - monitor first month
3. **Backup database:** Set up automated backups from day 1
4. **Document everything:** Keep notes on what you changed and why
5. **Test on mobile:** Always test on real devices, not just browser dev tools
6. **Have a rollback plan:** Know how to revert if something breaks

---

## 📞 Need Help?

- **Railway Docs:** https://docs.railway.app
- **Vercel Docs:** https://vercel.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **Resend Docs:** https://resend.com/docs

---

**Ready to launch? Follow this guide step-by-step and you'll be live in under 2 hours!** 🚀

