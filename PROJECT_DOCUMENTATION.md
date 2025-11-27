# 📚 Project Documentation & Setup Guide

This document consolidates all technical documentation, setup guides, and deployment instructions for the Medication Manager project.

---

## 📋 Table of Contents

1. [Deployment Guide (Render)](#1-deployment-guide-render)
2. [SMS Notifications Setup](#2-sms-notifications-setup)
   - [Twilio Setup](#twilio-setup)
   - [Fast2SMS Setup (India)](#fast2sms-setup-india)
3. [Browser Notification System](#3-browser-notification-system)
4. [Database Migrations](#4-database-migrations)
5. [Sound Assets](#5-sound-assets)

---

## 1. Deployment Guide (Render)

### 🚀 Deploy to Render

**Prerequisites:**
- GitHub account with your code pushed
- Google Cloud Console project
- Supabase account
- Groq API account

### Step 1: Update Google OAuth Credentials
**IMPORTANT:** You must add your Render URL to Google OAuth before deployment!
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, add: `https://your-app-name.onrender.com/auth/google/callback`
5. Click **Save**

### Step 2: Create Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `medication-manager`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/enhanced-server.js`
   - **Instance Type**: Free

### Step 3: Add Environment Variables
Go to **Environment** tab and add these variables:

```bash
# Node Environment
NODE_ENV=production

# Supabase (Database & Auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Database URL for persistent sessions (CRITICAL!)
DATABASE_URL=postgresql://postgres.[project]:[password]@aws-0-us-west-1.pooler.supabase.com:5432/postgres

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-app-name.onrender.com/auth/google/callback

# Session Secret (generate new one!)
SESSION_SECRET=your_random_secret_here

# Groq AI
GROQ_API_KEY=your_groq_api_key

# SMS (Optional - Add Twilio or Fast2SMS keys here)
```

### Step 4: Verify Deployment
Check logs for:
```
✅ PostgreSQL session store connected
✅ Using Supabase (persistent storage)
🚀 Server ready!
```

---

## 2. SMS Notifications Setup

You can use either **Twilio** (Global/Reliable) or **Fast2SMS** (India/Free Tier).

### Twilio Setup
**Best for:** Reliability, 2-way SMS (Reply YES/NO), Global support.

1. **Sign Up:** [twilio.com/try-twilio](https://www.twilio.com/try-twilio) (Free trial $15 credit)
2. **Get Credentials:** Copy Account SID, Auth Token, and Phone Number.
3. **Configure Render Env Vars:**
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
4. **Enable 2-Way SMS (Webhook):**
   - In Twilio Console → Phone Numbers → Manage → Active numbers
   - Under "Messaging", set Webhook to: `https://your-app.onrender.com/api/sms/webhook` (POST)

### Fast2SMS Setup (India)
**Best for:** Free tier (50 SMS/day) in India.

1. **Sign Up:** [fast2sms.com](https://www.fast2sms.com/)
2. **Get API Key:** Go to Dev API section.
3. **Configure Render Env Vars:**
   - `FAST2SMS_API_KEY`
4. **Note:** Fast2SMS does not support 2-way replies on the free tier.

---

## 3. Browser Notification System

The app includes a built-in push notification system that works on desktop and mobile.

### Features
- **Action Buttons:** Click "✅ Taken" or "⏭️ Skip" directly from the notification.
- **Offline Support:** Works via Service Worker.
- **Sync:** Updates database immediately.

### Setup
1. **First Visit:** App will ask for notification permission. Click "Allow".
2. **Testing:**
   - Add a test schedule for 1 minute from now.
   - Wait for the notification.
   - Click an action button to test logging.

### Troubleshooting
- **Not showing?** Check browser site settings and ensure "Notifications" are allowed.
- **Mobile:** Works on Android (Chrome/Firefox). iOS requires adding to Home Screen (PWA) for full support.

---

## 4. Database Migrations

**Location:** `database/migrations/`

### Critical Migrations
You must run these SQL scripts in Supabase SQL Editor to ensure the app works:

1. **`002_user_data_isolation.sql`**
   - **Purpose:** Enforces Row Level Security (RLS) so users only see their own data.
   - **Action:** Run this if you haven't already!

2. **`004_fix_ambiguous_function.sql`**
   - **Purpose:** Fixes the `PGRST203` error related to `set_current_user_id`.
   - **Action:** Run this to fix database errors.

### Verification
Run this query in Supabase to check if RLS is active:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```
Should return `true` for `medications`, `schedules`, etc.

---

## 5. Sound Assets

**Location:** `public/sounds/`

The app uses audio feedback for interactions. Ensure these files exist in `public/sounds/`:

1. **`reminder.mp3`**: Gentle chime for medication alerts.
2. **`success.mp3`**: Positive sound for marking as taken.
3. **`alert.mp3`**: Warning sound for errors or skipped doses.

**Sources:**
- [Freesound.org](https://freesound.org/)
- [Zapsplat.com](https://www.zapsplat.com/)

---
