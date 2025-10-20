# 🔧 Fix App Functionality - Complete Setup

## 🎯 Issues to Fix:
1. ❌ Icons/buttons not working (Add medications, etc.)
2. ❌ SMS reminders not sending at scheduled times
3. ❌ Two-way SMS (YES/NO) not working

---

## ✅ Step-by-Step Fixes

### **STEP 1: Run Complete Database Migration** (5 minutes)

**The complete migration is already in your clipboard!**

1. Go to: **https://supabase.com/dashboard**
2. Select your project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New Query"**
5. **Paste** (Cmd+V) - Complete migration is ready!
6. Click **"RUN"**
7. Wait for "Success" message

**This creates:**
- ✅ `users` table (for authentication)
- ✅ `session` table (for login sessions)
- ✅ `sms_reminders` table (for SMS tracking)
- ✅ `user_id` column in medications table
- ✅ RLS policies (data security)
- ✅ All required indexes and triggers

---

### **STEP 2: Verify Environment Variables in Render**

Go to: **Render Dashboard → Environment tab**

**Required Variables:**

```
✅ SUPABASE_URL=https://xxx.supabase.co
✅ SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✅ DATABASE_URL=postgresql://postgres.xxx:[password]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
✅ GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
✅ GOOGLE_CLIENT_SECRET=GOCSPX-xxx
✅ GOOGLE_CALLBACK_URL=https://ai-medication-organiser.onrender.com/auth/google/callback
✅ SESSION_SECRET=long_random_string_64_chars
✅ NODE_ENV=production
```

**For SMS to Work (Required):**

```
✅ TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
✅ TWILIO_AUTH_TOKEN=your_auth_token
✅ TWILIO_PHONE_NUMBER=+13203488861
✅ USER_PHONE_NUMBER=+919446701395
```

**For AI Chatbot (Optional):**

```
GROQ_API_KEY=gsk_xxx
```

---

### **STEP 3: Setup Twilio Webhook for Two-Way SMS**

For YES/NO responses to work, Twilio needs to send responses to your app.

**A. Get Your Webhook URL:**
```
https://ai-medication-organiser.onrender.com/api/sms/webhook
```

**B. Configure in Twilio:**

1. Go to: **https://console.twilio.com/**
2. Click **"Phone Numbers"** → **"Manage"** → **"Active numbers"**
3. Click your phone number: **+1 320 348 8861**
4. Scroll to **"Messaging Configuration"**
5. Under **"A MESSAGE COMES IN"**:
   - Webhook: `https://ai-medication-organiser.onrender.com/api/sms/webhook`
   - HTTP Method: **POST**
6. Click **"Save"**

**What This Does:**
- When user replies "YES" or "NO" to SMS
- Twilio sends response to your webhook
- Your app automatically marks medication as taken/skipped
- Updates show in dashboard instantly

---

### **STEP 4: Test the App Features**

After deployment completes, test each feature:

#### **A. Test Authentication:**
1. Visit: `https://ai-medication-organiser.onrender.com`
2. Should redirect to login
3. Sign in with Google
4. Should see loading page → dashboard

#### **B. Test Add Medication:**
1. Click **"Add Medication"** button (plus icon)
2. Fill in:
   - Name: Test Med
   - Dosage: 10mg
   - Form: Tablet
   - Total Quantity: 30
3. Click **"Add"**
4. Should appear in dashboard

#### **C. Test Add Schedule:**
1. Click on a medication
2. Click **"Add Schedule"**
3. Set:
   - Time: Current time + 2 minutes
   - Frequency: Daily
   - Days: Select today
4. Click **"Save"**

#### **D. Test SMS Reminder:**
1. Wait for scheduled time (2 minutes)
2. You should receive SMS:
   ```
   🔔 Medication Reminder
   Test Med - 10mg
   Take 1 Tablet now
   
   Reply YES if taken, NO if skipped
   ```

#### **E. Test Two-Way SMS:**
1. Reply to SMS with: **YES**
2. Check dashboard - medication should show as "Taken" ✅
3. Or reply: **NO** - should show as "Skipped"

---

### **STEP 5: Troubleshooting**

#### **Issue: Buttons Not Working**

**Check Browser Console:**
1. Press F12 (or Cmd+Option+I on Mac)
2. Click "Console" tab
3. Try clicking "Add Medication"
4. Look for errors

**Common Errors:**
- `401 Unauthorized` → Not logged in properly
- `404 Not Found` → API routes not working
- `CORS error` → Check CORS settings

**Fix:**
```javascript
// Check if you're authenticated
fetch('https://ai-medication-organiser.onrender.com/api/auth/status')
  .then(r => r.json())
  .then(d => console.log('Auth status:', d))
```

#### **Issue: SMS Not Sending**

**Check Render Logs:**
1. Go to Render Dashboard
2. Click "Logs" tab
3. Look for:
   ```
   ⏰ Checking schedules at XX:XX...
   📋 Found X schedules for today
   📱 Sending SMS to +919446701395
   ```

**Common Issues:**
- No Twilio credentials → Add to environment variables
- Wrong phone numbers → Verify format (+91...)
- Twilio credit exhausted → Check Twilio balance

#### **Issue: YES/NO Not Working**

**Check Webhook:**
1. Send test SMS to your Twilio number
2. Check Render logs for:
   ```
   📨 SMS webhook received from +919446701395
   ✅ Medication marked as taken
   ```

**If not appearing:**
- Webhook not configured → Follow Step 3
- Wrong webhook URL → Verify exact URL
- Twilio error → Check Twilio debugger

---

### **STEP 6: Verify Everything Works**

**Complete Checklist:**

```
□ Database migration run successfully
□ All environment variables set in Render
□ Deployment shows "Live" status
□ Can log in with Google
□ Can add medications
□ Can add schedules
□ SMS reminder received at scheduled time
□ Replying YES marks as taken
□ Replying NO marks as skipped
□ Dashboard updates in real-time
```

---

## 🚀 Quick Command Reference

### **View Render Logs:**
```
https://dashboard.render.com/
→ Your service → Logs tab
```

### **Test API Endpoints:**
```bash
# Check health
curl https://ai-medication-organiser.onrender.com/health

# Check auth status (in browser console)
fetch('/api/auth/status').then(r=>r.json()).then(console.log)

# Check medications (in browser console)
fetch('/api/medications').then(r=>r.json()).then(console.log)
```

### **Check Database Tables:**
```sql
-- In Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should show: medications, medication_logs, schedules, 
-- session, sms_reminders, users
```

---

## 📱 SMS Message Format

**Reminder SMS:**
```
🔔 Medication Reminder
[Medication Name] - [Dosage]
Take [Quantity] [Form] now

Reply YES if taken, NO if skipped
```

**Accepted Responses:**
- **YES**: Y, YES, yes, 1, TAKEN
- **NO**: N, NO, no, 0, SKIP, SKIPPED

---

## 💡 Pro Tips

1. **Test with near-future schedules** (2-3 minutes ahead) to verify quickly
2. **Keep Render logs open** when testing to see real-time activity
3. **Check browser console** for frontend errors
4. **Verify Twilio balance** has credits for SMS
5. **Use incognito/private window** if login issues persist

---

## 🆘 Still Having Issues?

**Share these with me:**

1. **Render Logs** (last 50 lines):
   - Copy from Render Dashboard → Logs

2. **Browser Console Errors**:
   - Press F12 → Console tab → Screenshot any errors

3. **Database Tables**:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

4. **Environment Variables Status**:
   - Which variables are set in Render?

---

**Start with STEP 1 (database migration) - it's already in your clipboard!**
**Then verify STEP 2 (environment variables) in Render.**

Once those are done, everything should work! 🎉
