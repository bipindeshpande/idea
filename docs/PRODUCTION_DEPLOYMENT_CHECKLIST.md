# 🚀 Production Deployment Checklist

## Phase 1: Pre-Production Testing (Do This First)

### Step 1: Build Production Version Locally
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already done)
npm install

# Build production version
npm run build

# Test production build locally
npm run preview
```

**What to check:**
- [ ] Build completes without errors
- [ ] Production site loads at `http://localhost:4173` (or preview port)
- [ ] All pages are accessible
- [ ] No console errors
- [ ] Payment modal loads correctly (lazy loading works)
- [ ] All images/assets load correctly

### Step 2: Test Production Build Performance
1. Open `http://localhost:4173/pricing` in Chrome
2. Open DevTools (F12 or Right-click → Inspect)
3. Go to Lighthouse tab
4. Run Lighthouse audit on:
   - Landing page (`/`)
   - Pricing page (`/pricing`)
   - Product page (`/product`)

**Target Scores:**
- Performance: ≥ 70 (ideally ≥ 80)
- Accessibility: ≥ 90 (ideally 100)
- SEO: ≥ 90
- Best Practices: ≥ 90

**If scores are low:**
- Check if it's a development vs production issue
- Review Lighthouse recommendations
- Most issues should be resolved in production build

---

## Phase 2: Environment Variables Setup

### Backend Environment Variables (Railway)

**Required:**
```bash
OPENAI_API_KEY=sk-your-production-key
STRIPE_SECRET_KEY=sk_live_your-production-key
ADMIN_PASSWORD=your-secure-password-here
SECRET_KEY=generate-random-32-char-string-here
DATABASE_URL=postgresql://... (auto-set by Railway)

# Email Service
EMAIL_ENABLED=true
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_your-production-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Startup Idea Advisor
```

**How to generate SECRET_KEY:**
```python
import secrets
print(secrets.token_urlsafe(32))
```

### Frontend Environment Variables (Vercel)

**Required:**
```bash
VITE_STRIPE_PUBLIC_KEY=pk_live_your-production-key
VITE_API_URL=https://your-backend.railway.app
```

**Optional:**
```bash
VITE_GA_ID=G-XXXXXXXXXX (if using Google Analytics)
```

---

## Phase 3: Deploy Backend (Railway)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"

### Step 2: Deploy from GitHub
1. Click "Deploy from GitHub repo"
2. Select your repository
3. Railway will auto-detect Python
4. **Important:** Set root directory to project root (not `frontend/`)

### Step 3: Add PostgreSQL Database
1. In Railway project, click "+ New"
2. Select "PostgreSQL"
3. Railway will auto-set `DATABASE_URL` environment variable

### Step 4: Set Environment Variables
1. Go to Railway project → Variables tab
2. Add all backend environment variables (from Phase 2)
3. **Important:** Use production keys (not test keys)

### Step 5: Deploy
1. Railway will automatically deploy
2. Check logs to ensure:
   - [ ] App starts successfully
   - [ ] Database connection works
   - [ ] Database tables are created (`db.create_all()`)
3. Note your Railway URL: `https://your-app.railway.app`

### Step 6: Test Backend
```bash
# Test health endpoint
curl https://your-app.railway.app/api/health

# Should return: {"status": "healthy", "database": "connected", ...}
```

---

## Phase 4: Deploy Frontend (Vercel)

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New Project"

### Step 2: Import Repository
1. Select your GitHub repository
2. **Important:** Set root directory to `frontend/`
3. Framework preset: **Vite**

### Step 3: Configure Build Settings
Vercel should auto-detect, but verify:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Step 4: Set Environment Variables
1. Go to Vercel project → Settings → Environment Variables
2. Add:
   - `VITE_STRIPE_PUBLIC_KEY` (production key)
   - `VITE_API_URL` (your Railway backend URL)

### Step 5: Update API Configuration
Create or update `frontend/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend.railway.app/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

**Replace `https://your-backend.railway.app` with your actual Railway URL.**

### Step 6: Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Note your Vercel URL: `https://your-app.vercel.app`

---

## Phase 5: Post-Deployment Testing

### Critical Tests (Do These First)

1. **Frontend Loads:**
   - [ ] Visit Vercel URL
   - [ ] Page loads without errors
   - [ ] No console errors

2. **Backend Connection:**
   - [ ] Try to register a new user
   - [ ] Check if API calls work (open DevTools → Network tab)
   - [ ] Verify requests go to Railway backend

3. **User Registration:**
   - [ ] Create a test account
   - [ ] Verify email is received (check Resend dashboard)
   - [ ] Login works

4. **Payment Flow (Test Mode First):**
   - [ ] Go to pricing page
   - [ ] Click "Subscribe"
   - [ ] Payment modal loads (lazy loading works)
   - [ ] Use Stripe test card: `4242 4242 4242 4242`
   - [ ] Complete payment
   - [ ] Verify subscription is activated

5. **Core Features:**
   - [ ] Idea validation works
   - [ ] Idea discovery works
   - [ ] Reports generate correctly
   - [ ] PDF download works

6. **Admin Panel:**
   - [ ] Access `/admin` page
   - [ ] Login with admin password
   - [ ] Can view stats, users, payments

### Performance Testing

1. **Run Lighthouse on Production:**
   - Open production URL in Chrome
   - Run Lighthouse audit
   - Compare with local production build scores

2. **Check Network Performance:**
   - Open DevTools → Network tab
   - Reload page
   - Check:
     - [ ] Total page size < 2MB
     - [ ] Payment modal chunk loads only when needed
     - [ ] Images are optimized

### Security Checks

- [ ] HTTPS is enforced (automatic with Vercel/Railway)
- [ ] Admin password is changed from default
- [ ] All API keys are production keys (not test keys)
- [ ] CORS is configured correctly
- [ ] No sensitive data in frontend code

---

## Phase 6: Custom Domain (Optional but Recommended)

### Step 1: Buy Domain
- Recommended: Namecheap, Google Domains, or Cloudflare
- Cost: ~$10-15/year

### Step 2: Configure DNS (Vercel)
1. In Vercel dashboard → Settings → Domains
2. Add your domain: `yourdomain.com`
3. Vercel will show DNS records to add
4. Add records in your domain registrar's DNS settings

### Step 3: Update Backend URL
1. Update `VITE_API_URL` in Vercel to use custom domain (if you set one for backend)
2. Or keep using Railway URL (simpler)

### Step 4: Wait for DNS Propagation
- Usually 5-60 minutes
- Check SSL certificate status in Vercel

---

## Phase 7: Final Pre-Launch Checklist

### Before Going Live

- [ ] All tests pass (Phase 5)
- [ ] Lighthouse scores are acceptable
- [ ] Custom domain is working (if using)
- [ ] SSL certificates are active
- [ ] Stripe is switched to **live mode** (not test mode)
- [ ] All environment variables are production values
- [ ] Database is backed up
- [ ] Monitoring is set up (see below)

### Set Up Monitoring

1. **Uptime Monitoring:**
   - Sign up for [UptimeRobot](https://uptimerobot.com) (free)
   - Monitor:
     - Frontend: `https://yourdomain.com`
     - Backend: `https://your-backend.railway.app/api/health`

2. **Error Tracking (Optional but Recommended):**
   - Sign up for [Sentry](https://sentry.io) (free tier)
   - Add to both frontend and backend

3. **Analytics:**
   - Google Analytics (if configured)
   - Vercel Analytics (built-in)

### Set Up Cron Job for Expiring Subscriptions

1. Sign up for [cron-job.org](https://cron-job.org) (free)
2. Create daily job:
   - URL: `https://your-backend.railway.app/api/emails/check-expiring`
   - Method: POST
   - Schedule: Daily at 9 AM UTC
   - (Optional: Add Authorization header with admin password)

---

## Phase 8: Launch! 🚀

### Launch Day

1. **Final Checks:**
   - [ ] Everything works in production
   - [ ] Stripe is in live mode
   - [ ] Monitoring is active
   - [ ] You're ready to respond to issues

2. **Announce:**
   - Share on social media
   - Post on Product Hunt (if desired)
   - Email your network

3. **Monitor:**
   - Watch error logs
   - Monitor uptime
   - Check user registrations
   - Watch for payment issues

---

## 🆘 Troubleshooting

### Issue: Frontend can't reach backend
**Solution:**
- Check `VITE_API_URL` in Vercel
- Verify `vercel.json` rewrite rules
- Check CORS settings in backend

### Issue: Build fails
**Solution:**
- Check Vercel build logs
- Verify all dependencies are in `package.json`
- Check for TypeScript/ESLint errors

### Issue: Database connection fails
**Solution:**
- Verify `DATABASE_URL` in Railway
- Check Railway database is running
- Review Railway logs

### Issue: Stripe payments fail
**Solution:**
- Verify using live keys (not test keys)
- Check Stripe dashboard for errors
- Verify `STRIPE_SECRET_KEY` is correct

### Issue: Emails not sending
**Solution:**
- Check Resend API key
- Verify `FROM_EMAIL` is verified in Resend
- Check Resend dashboard for delivery status

---

## 📊 Success Metrics

After launch, monitor:
- **Performance:** Lighthouse scores should be ≥ 70
- **Uptime:** Should be ≥ 99.9%
- **Error Rate:** Should be < 1%
- **Page Load Time:** Should be < 3 seconds
- **API Response Time:** Should be < 2 seconds

---

## ✅ Quick Reference

**Backend URL:** `https://your-app.railway.app`  
**Frontend URL:** `https://your-app.vercel.app`  
**Custom Domain:** `https://yourdomain.com` (if configured)

**Key Files:**
- `frontend/vercel.json` - Vercel configuration
- `frontend/vite.config.js` - Build configuration
- `api.py` - Backend API
- `app/models/database.py` - Database models

**Important Commands:**
```bash
# Build frontend
cd frontend && npm run build

# Test production build
cd frontend && npm run preview

# Check backend health
curl https://your-backend.railway.app/api/health
```

---

**Ready? Start with Phase 1 and work through each phase step-by-step!** 🚀

