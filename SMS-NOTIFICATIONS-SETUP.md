# 📱 SMS Notifications Setup Guide

## Overview
This guide will help you set up automated SMS medication reminders using Twilio and Render cron jobs.

---

## ✅ What's Been Created

### Files Added:
1. **`server/send-reminders.js`** - Cron job script that checks schedules and sends SMS
2. **`render.yaml`** - Updated with cron job configuration
3. **`.env.example`** - Added `SUPABASE_SERVICE_ROLE_KEY`

### How It Works:
1. **Every minute**, Render runs the cron job
2. Script checks if any schedules match current time
3. For each match, sends SMS to user's verified phone
4. Logs SMS in `sms_reminders` table
5. Supports 2-way SMS (YES/NO responses via webhook)

---

## 🔧 Setup Steps

### Step 1: Get Twilio Credentials (FREE!)

1. **Sign up for Twilio:**
   - Go to: https://www.twilio.com/try-twilio
   - Sign up (no credit card needed for trial)
   - Free trial: $15 credit + free phone number

2. **Get your credentials:**
   - After signup, go to Twilio Console
   - Copy these 3 values:
     - **Account SID** (starts with `AC...`)
     - **Auth Token** (click to reveal)
     - **Phone Number** (from Phone Numbers → Manage → Active Numbers)

3. **Format phone number:**
   - Must include country code: `+1234567890`
   - Example for US: `+14155552671`
   - Example for India: `+919876543210`

---

### Step 2: Get Supabase Service Role Key

1. **Go to Supabase Dashboard**
2. **Project Settings → API**
3. **Copy "service_role" key** (NOT the anon key!)
4. **Keep it secret!** This key bypasses RLS (needed for cron job)

---

### Step 3: Add Environment Variables to Render

1. **Go to Render Dashboard**
2. **Select your service:** `medication-manager`
3. **Click "Environment"** (left sidebar)
4. **Add these variables:**

   | Key | Value | Notes |
   |-----|-------|-------|
   | `TWILIO_ACCOUNT_SID` | `AC...` | From Twilio Console |
   | `TWILIO_AUTH_TOKEN` | Your token | From Twilio Console |
   | `TWILIO_PHONE_NUMBER` | `+1234567890` | From Twilio |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service key | From Supabase API settings |

5. **Click "Save Changes"** (will trigger redeploy)

---

### Step 4: Deploy the Cron Job

1. **Commit and push changes:**
   ```bash
   git add server/send-reminders.js render.yaml .env.example
   git commit -m "Add SMS reminder cron job"
   git push origin main
   ```

2. **Wait for Render to deploy** (~2-3 minutes)

3. **Verify cron job is running:**
   - Go to Render Dashboard
   - You should see TWO services now:
     - `medication-manager` (web)
     - `medication-reminders` (cron)

4. **Check cron job logs:**
   - Click on `medication-reminders` service
   - Click "Logs" tab
   - You should see: `✅ Reminder check complete` every minute

---

### Step 5: Add Your Phone Number in the App

1. **Login to your app**
2. **Go to Profile/Settings** (we need to add this UI!)
3. **Add your phone number** with country code
4. **Verify it** (we'll add verification later)

**OR** add it manually in Supabase:

```sql
UPDATE users
SET phone = '+1234567890',
    phone_verified = true
WHERE email = 'your.email@example.com';
```

---

## 🧪 Testing

### Test 1: Check Cron Job Logs

1. **Go to Render Dashboard → medication-reminders → Logs**
2. **Should see every minute:**
   ```
   🔍 Checking for medication reminders...
   ⏰ Current time: 16:45 on 2025-10-24
   ✅ No reminders to send at this time
   ```

### Test 2: Send a Test SMS

1. **Create a schedule for 2 minutes from now**
   - Example: If it's 4:45 PM, schedule for 4:47 PM
2. **Add your verified phone number** to user profile
3. **Wait for the time** (cron runs every minute)
4. **Check cron logs** - should see:
   ```
   📋 Found 1 schedule(s) to process
   ✅ SMS sent to +1234567890 for Aspirin
   ```
5. **Check your phone** - you should receive the SMS!

### Test 3: Reply to SMS

1. **Reply "YES"** to the SMS
2. **Check webhook logs** in main service logs
3. **Should log the medication** as taken

---

## 💰 Twilio Costs

### Free Trial:
- ✅ **$15 credit** (free)
- ✅ **~500 SMS messages** (free)
- ✅ **1 free phone number**
- ❌ Can only send to **verified numbers**

### After Trial:
- 📱 SMS: **$0.0079 per message** (less than 1 cent!)
- 📞 Phone number: **$1.15/month**
- 💳 Pay-as-you-go (no subscription)

**Example cost:**
- 3 medications × 3 times/day = 9 SMS/day
- 9 × 30 days = 270 SMS/month
- Cost: 270 × $0.0079 = **$2.13/month** + $1.15 = **$3.28/month total**

---

## 🔍 Troubleshooting

### "Twilio not configured" in logs
- ✅ Check all 3 env vars are set in Render
- ✅ Redeploy after adding env vars

### "No users found" for medication
- ✅ Run RLS fix script first! (FIX-RLS-TYPE-MISMATCH.sql)
- ✅ Check medications have correct user_id

### "User doesn't have verified phone"
- ✅ Add phone number to user in Supabase
- ✅ Set phone_verified = true

### SMS not received
- ✅ Check phone number format (+1234567890)
- ✅ Check Twilio trial restrictions (verified numbers only)
- ✅ Check Twilio logs in Twilio Console

### Cron job not running
- ✅ Check render.yaml syntax is correct
- ✅ Redeploy after updating render.yaml
- ✅ Check cron schedule format ("* * * * *")

---

## 📋 Next Steps

### After Basic Setup:
1. ✅ Add phone verification flow in app UI
2. ✅ Add user settings page to manage phone number
3. ✅ Add SMS delivery status tracking
4. ✅ Add retry logic for failed SMS
5. ✅ Add daily summary SMS option

### Optional Enhancements:
- 🌍 Support multiple languages
- 🕐 Custom reminder times (15 min before, etc.)
- 📊 SMS analytics dashboard
- 🔕 Do Not Disturb hours
- 📅 Weekly medication reports

---

## 🚨 Important Security Notes

1. **Never commit .env file!** (it's gitignored)
2. **Service role key** bypasses RLS - keep it secret!
3. **Use anon key** in frontend, service key only in cron job
4. **Verify phone numbers** before sending SMS
5. **Rate limit** SMS to prevent abuse

---

## ✅ Summary Checklist

Before SMS works, you need:

- [ ] Fix RLS (run FIX-RLS-TYPE-MISMATCH.sql)
- [ ] Sign up for Twilio (free trial)
- [ ] Get Twilio credentials (SID, Token, Phone)
- [ ] Get Supabase service role key
- [ ] Add all env vars to Render
- [ ] Push code changes (send-reminders.js, render.yaml)
- [ ] Wait for deployment
- [ ] Add your phone number to user profile
- [ ] Create a test schedule
- [ ] Receive SMS! 🎉

---

## 🆘 Need Help?

- **Twilio Docs:** https://www.twilio.com/docs/sms
- **Render Cron:** https://render.com/docs/cronjobs
- **Check logs** in Render Dashboard for errors

Good luck! 📱✨
