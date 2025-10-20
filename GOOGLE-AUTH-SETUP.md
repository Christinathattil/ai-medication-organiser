# 🔐 Google Authentication Setup Guide

## Step 1: Create Google OAuth Credentials (5 minutes)

### 1. Go to Google Cloud Console
- Visit: https://console.cloud.google.com/

### 2. Create a New Project (or select existing)
- Click the project dropdown at the top
- Click "NEW PROJECT"
- Name it: **"Medication Manager"**
- Click "CREATE"

### 3. Enable Google+ API
- Go to: https://console.cloud.google.com/apis/library
- Search for: **"Google+ API"**
- Click on it
- Click **"ENABLE"**

### 4. Create OAuth 2.0 Credentials
- Go to: https://console.cloud.google.com/apis/credentials
- Click **"+ CREATE CREDENTIALS"**
- Select **"OAuth client ID"**

### 5. Configure OAuth Consent Screen (if prompted)
- User Type: **External**
- Click **CREATE**
- Fill in:
  - App name: **Medication Manager**
  - User support email: **your email**
  - Developer contact: **your email**
- Click **SAVE AND CONTINUE**
- Skip scopes (click SAVE AND CONTINUE)
- Add test users: **your email** (click SAVE AND CONTINUE)
- Click **BACK TO DASHBOARD**

### 6. Create OAuth Client ID
- Go back to: https://console.cloud.google.com/apis/credentials
- Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
- Application type: **Web application**
- Name: **Medication Manager Web**

- **Authorized JavaScript origins:**
  ```
  http://localhost:8080
  ```

- **Authorized redirect URIs:**
  ```
  http://localhost:8080/auth/google/callback
  ```

- Click **CREATE**

### 7. Copy Your Credentials
You'll see a popup with:
- **Client ID** (looks like: `123456-abc.apps.googleusercontent.com`)
- **Client Secret** (looks like: `GOCSPX-xyz123abc`)

**COPY THESE!** You'll need them for your `.env` file.

---

## Step 2: Add to Your .env File

Open `/Users/christina/Desktop/medication-manager/.env` and add:

```env
# Google OAuth (for user authentication)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback
SESSION_SECRET=your_random_secret_key_here_make_it_long_and_random
```

**For SESSION_SECRET**, generate a random string. You can use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 3: For Production Deployment

When you deploy to Render/Railway:

1. **Update Google Cloud Console:**
   - Go to credentials page
   - Edit your OAuth client
   - Add production URLs:
     ```
     Authorized JavaScript origins:
     https://your-app.onrender.com
     
     Authorized redirect URIs:
     https://your-app.onrender.com/auth/google/callback
     ```

2. **Update .env on Render:**
   ```env
   GOOGLE_CALLBACK_URL=https://your-app.onrender.com/auth/google/callback
   ```

---

## 🎯 How It Works

1. **User visits your app** → Sees login page
2. **Clicks "Sign in with Google"** → Redirected to Google
3. **Logs in with Google account** → Google asks for permission
4. **Google redirects back** → User is authenticated
5. **Session created** → User stays logged in
6. **Access protected routes** → Can use medication manager

---

## 🔒 Security Features

- ✅ Sessions stored securely in Supabase (PostgreSQL)
- ✅ Only authenticated users can access the app
- ✅ Google handles password security
- ✅ Session expires after inactivity
- ✅ CSRF protection included

---

## 📝 Testing

After setup:

1. Start server: `npm start`
2. Open: http://localhost:8080
3. You'll see login page
4. Click "Sign in with Google"
5. Authenticate
6. You're in! 🎉

---

## 🆘 Troubleshooting

**Error: "redirect_uri_mismatch"**
- Check that redirect URI in Google Console matches exactly
- Should be: `http://localhost:8080/auth/google/callback`

**Error: "invalid_client"**
- Double-check your Client ID and Secret in .env
- Make sure there are no extra spaces

**Not staying logged in**
- Check SESSION_SECRET is set in .env
- Make sure Supabase is connected

---

**Ready to set up?** Follow Steps 1 & 2, then I'll test it for you!
