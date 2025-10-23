# Render Deployment Guide

## 🚀 Deploy to Render

### Prerequisites
- GitHub account with your code pushed
- Google Cloud Console project
- Supabase account
- Groq API account
- Fast2SMS account (optional)

---

## Step 1: Update Google OAuth Credentials

**IMPORTANT:** You must add your Render URL to Google OAuth before deployment!

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add:
   ```
   https://your-app-name.onrender.com/auth/google/callback
   ```
   (Replace `your-app-name` with your actual Render app name)
5. Click **Save**

---

## Step 2: Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `medication-manager` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/enhanced-server.js`
   - **Instance Type**: Free

---

## Step 3: Add Environment Variables on Render

Go to **Environment** tab and add these variables:

### Required Variables:

```bash
# Node Environment
NODE_ENV=production

# Supabase (Database & Auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Database URL for persistent sessions (CRITICAL!)
DATABASE_URL=postgresql://postgres.[project]:[password]@aws-0-us-west-1.pooler.supabase.com:5432/postgres

# Google OAuth (CRITICAL!)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-app-name.onrender.com/auth/google/callback

# Session Secret (generate new one!)
SESSION_SECRET=your_random_secret_here

# Groq AI
GROQ_API_KEY=your_groq_api_key

# Fast2SMS (Optional)
FAST2SMS_API_KEY=your_fast2sms_api_key
```

### Generate Session Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 4: Deploy

1. Click **Create Web Service**
2. Render will automatically:
   - Clone your repo
   - Install dependencies
   - Start your server
3. Wait for deployment to complete (5-10 minutes)

---

## Step 5: Verify Deployment

### Check Logs:
Look for these success messages:
```
✅ PostgreSQL session store connected
✅ Using Supabase (persistent storage)
✅ Fast2SMS enabled
✅ Groq AI enabled
🚀 Server ready!
```

### Test the App:
1. Visit: `https://your-app-name.onrender.com`
2. Should redirect to `/login`
3. Click "Sign in with Google"
4. Should authenticate successfully
5. Should show phone verification page (if not verified)

---

## Common Issues & Solutions

### Issue 1: "Not allowed by CORS"

**Cause:** Your Render URL doesn't match CORS configuration

**Solution:** The code now auto-detects Render URL, but if issues persist:
1. Check server logs for "CORS blocked origin"
2. Verify `RENDER_EXTERNAL_URL` is set by Render (it should be automatic)
3. Check your browser is using HTTPS (not HTTP)

### Issue 2: "OAuth Error" or Redirects to Login

**Cause:** Google OAuth callback URL not configured

**Solution:**
1. Go to Google Cloud Console
2. Add your Render URL to authorized redirect URIs:
   ```
   https://your-app-name.onrender.com/auth/google/callback
   ```
3. Wait 5 minutes for Google to propagate changes
4. Clear browser cookies
5. Try again

### Issue 3: Session Lost After Login

**Cause:** DATABASE_URL not configured or incorrect

**Solution:**
1. Verify DATABASE_URL is set in Render environment variables
2. Check Supabase connection string is correct
3. Look for "PostgreSQL session store connected" in logs
4. If not connected, sessions will be memory-only (lost on restart)

### Issue 4: "Failed to fetch" or 500 Errors

**Cause:** Missing environment variables

**Solution:**
1. Check all required env vars are set in Render
2. Restart service after adding env vars
3. Check logs for specific error messages

### Issue 5: App Works Locally But Not on Render

**Possible causes:**
1. **Environment variables:** Make sure ALL env vars from `.env` are added to Render
2. **Callback URL:** Must match exactly (including HTTPS)
3. **Session cookie:** Render uses HTTPS, so `secure: true` is required
4. **Database:** Must use Supabase (not local JSON)

**Check:**
```bash
# In Render logs, verify:
✅ Using Supabase (persistent storage)  # NOT "Using JSON storage"
✅ PostgreSQL session store connected   # Sessions persist
✅ Fast2SMS enabled                     # SMS configured
✅ Groq AI enabled                      # AI configured
```

---

## Step 6: Update Google OAuth (Again)

After first deployment, your Render URL might change. Update callback URL:

1. Note your actual Render URL from dashboard
2. Update Google OAuth authorized redirect URIs
3. Update `GOOGLE_CALLBACK_URL` environment variable on Render
4. Restart service

---

## Step 7: Run Database Migration

**IMPORTANT:** Run phone verification migration after deployment!

1. Go to your Supabase project → SQL Editor
2. Copy contents of `database/phone-verification-migration.sql`
3. Run the SQL migration
4. Verify tables created:
   - `users` table has `phone`, `phone_verified`, `phone_verified_at` columns
   - `schedules` table has `user_phone` column

---

## Auto-Deploy Setup

Render automatically deploys when you push to GitHub:

1. Make changes locally
2. Commit: `git commit -m "your changes"`
3. Push: `git push origin main`
4. Render auto-deploys (takes ~5 min)
5. Check deployment logs in Render dashboard

---

## Environment Variables Reference

| Variable | Required | Example | Where to Get |
|----------|----------|---------|--------------|
| `NODE_ENV` | Yes | `production` | Set manually |
| `SUPABASE_URL` | Yes | `https://xxx.supabase.co` | Supabase dashboard |
| `SUPABASE_KEY` | Yes | `eyJhbG...` | Supabase → Settings → API |
| `DATABASE_URL` | Yes | `postgresql://...` | Supabase → Settings → Database |
| `GOOGLE_CLIENT_ID` | Yes | `123...apps.googleusercontent.com` | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | `GOCSPX-...` | Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | Yes | `https://app.onrender.com/auth/google/callback` | Your Render URL |
| `SESSION_SECRET` | Yes | `abc123...` | Generate with crypto |
| `GROQ_API_KEY` | Yes | `gsk_...` | console.groq.com |
| `FAST2SMS_API_KEY` | Optional | `abc123...` | fast2sms.com |

---

## Security Checklist

Before going live:

- [ ] All environment variables are set
- [ ] SESSION_SECRET is randomly generated (not default)
- [ ] DATABASE_URL uses Supabase (not local)
- [ ] Google OAuth callback URL matches Render URL exactly
- [ ] HTTPS is enforced (Render does this automatically)
- [ ] Session cookies are secure (`secure: true` in production)
- [ ] CORS allows your Render domain
- [ ] API rate limiting is enabled
- [ ] Sensitive data is stripped from responses

---

## Monitoring

### Check App Health:
```
https://your-app-name.onrender.com/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": 123,
  "version": "1.0.0"
}
```

### Monitor Logs:
1. Render Dashboard → Your Service → Logs
2. Look for errors or warnings
3. Check "CORS blocked" messages

### Performance:
- Free tier: Sleeps after 15 min inactivity
- First request after sleep: 30-60 seconds
- Subsequent requests: Fast
- Upgrade to paid for always-on

---

## Troubleshooting Commands

### Test OAuth Locally First:
```bash
# Set production callback URL temporarily
GOOGLE_CALLBACK_URL=https://your-app.onrender.com/auth/google/callback npm start

# Test in browser
http://localhost:8080
```

### Check Supabase Connection:
```bash
# In Render logs, look for:
✅ PostgreSQL session store connected
```

### Verify Environment:
```bash
# In Render shell (if available):
echo $NODE_ENV
echo $GOOGLE_CALLBACK_URL
echo $DATABASE_URL
```

---

## Support

If issues persist:

1. Check Render logs for specific errors
2. Verify all environment variables
3. Clear browser cookies
4. Test Google OAuth settings
5. Check Supabase connection
6. Review CORS errors in browser console (F12)

---

## Success Checklist

Your deployment is successful when:

- [x] App loads at Render URL
- [x] Google sign-in works
- [x] Phone verification page appears
- [x] SMS OTP is sent (if Fast2SMS configured)
- [x] After verification, dashboard loads
- [x] Can add medications
- [x] Can create schedules
- [x] Data persists after logout/login
- [x] Sessions survive server restarts

---

## Next Steps

1. Test all features on production
2. Set up custom domain (optional)
3. Monitor error logs
4. Configure backup strategy
5. Set up monitoring/alerts

**Your app is now live!** 🎉
