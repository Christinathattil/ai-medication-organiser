# 🆓 FREE Services Setup Guide

## All services are 100% FREE with generous limits!

---

## 1. 💾 Supabase (Persistent Database) - FREE

### Why Supabase?
- ✅ 500MB storage (FREE forever)
- ✅ PostgreSQL database
- ✅ Real-time updates
- ✅ No credit card required
- ✅ Unlimited API requests

### Setup (5 minutes):

1. **Create Account**
   - Go to: https://supabase.com
   - Click "Start your project"
   - Sign up with GitHub/Google (free)

2. **Create Project**
   - Click "New Project"
   - Name: `medication-manager`
   - Database Password: (create a strong one)
   - Region: Choose closest to you
   - Click "Create new project" (takes 2 minutes)

3. **Get API Keys**
   - Go to Settings → API
   - Copy:
     - `Project URL` (looks like: https://xxx.supabase.co)
     - `anon public` key (long string)

4. **Create Tables**
   - Go to SQL Editor
   - Click "New query"
   - Paste this SQL:

```sql
-- Medications table
CREATE TABLE medications (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  form TEXT NOT NULL,
  purpose TEXT,
  prescribing_doctor TEXT,
  prescription_date DATE,
  refill_count INTEGER DEFAULT 0,
  total_quantity INTEGER,
  remaining_quantity INTEGER,
  side_effects TEXT,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Schedules table
CREATE TABLE schedules (
  id BIGSERIAL PRIMARY KEY,
  medication_id BIGINT REFERENCES medications(id) ON DELETE CASCADE,
  time TEXT NOT NULL,
  frequency TEXT NOT NULL,
  days_of_week TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  with_food BOOLEAN DEFAULT FALSE,
  special_instructions TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Logs table
CREATE TABLE medication_logs (
  id BIGSERIAL PRIMARY KEY,
  medication_id BIGINT REFERENCES medications(id) ON DELETE CASCADE,
  schedule_id BIGINT REFERENCES schedules(id) ON DELETE SET NULL,
  taken_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Interactions table
CREATE TABLE interactions (
  id BIGSERIAL PRIMARY KEY,
  medication1_id BIGINT REFERENCES medications(id) ON DELETE CASCADE,
  medication2_id BIGINT REFERENCES medications(id) ON DELETE CASCADE,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can add auth later)
CREATE POLICY "Allow all" ON medications FOR ALL USING (true);
CREATE POLICY "Allow all" ON schedules FOR ALL USING (true);
CREATE POLICY "Allow all" ON medication_logs FOR ALL USING (true);
CREATE POLICY "Allow all" ON interactions FOR ALL USING (true);
```

5. **Add to Your App**
   - Create `.env` file in medication-manager folder:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key-here
   ```

**Done! Your data now persists forever!** ✅

---

## 2. 📅 Google Calendar Integration - FREE

### Why Google Calendar?
- ✅ Unlimited events
- ✅ Sync across devices
- ✅ Reminders included
- ✅ No credit card required

### Setup (10 minutes):

1. **Create Google Cloud Project**
   - Go to: https://console.cloud.google.com
   - Click "Select a project" → "New Project"
   - Name: `Medication Manager`
   - Click "Create"

2. **Enable Calendar API**
   - In the project, go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click it → Click "Enable"

3. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: `Medication Manager`
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback`
     - `https://your-netlify-url.netlify.app/auth/google/callback`
   - Click "Create"

4. **Get Credentials**
   - Copy `Client ID` and `Client Secret`
   - Add to `.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

**Done! Calendar sync enabled!** ✅

---

## 3. 📸 Photo Attachments - FREE

### Why Supabase Storage?
- ✅ 1GB storage (FREE)
- ✅ Image optimization
- ✅ CDN included
- ✅ No credit card required

### Setup (2 minutes):

1. **Enable Storage in Supabase**
   - In your Supabase project
   - Go to "Storage"
   - Click "New bucket"
   - Name: `medication-photos`
   - Public: Yes (for easy access)
   - Click "Create bucket"

2. **Set Storage Policy**
   - Click on the bucket
   - Go to "Policies"
   - Click "New Policy"
   - Template: "Allow public access"
   - Click "Review" → "Save policy"

**Done! Photo uploads enabled!** ✅

---

## 4. 📱 SMS Notifications (Twilio) - FREE

### Why Twilio?
- ✅ $15.50 FREE credit (no card needed for trial)
- ✅ ~500 SMS messages free
- ✅ Global coverage
- ✅ Easy API

### Setup (5 minutes):

1. **Create Account**
   - Go to: https://www.twilio.com/try-twilio
   - Sign up (email verification required)
   - No credit card for trial!

2. **Get Phone Number**
   - After signup, you'll get a trial phone number
   - This is your `TWILIO_PHONE_NUMBER`

3. **Get Credentials**
   - Go to Console Dashboard
   - Copy:
     - `Account SID`
     - `Auth Token`
   - Add to `.env`:
   ```bash
   TWILIO_ACCOUNT_SID=your-account-sid
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

4. **Verify Your Phone**
   - In trial mode, you need to verify recipient numbers
   - Go to "Phone Numbers" → "Verified Caller IDs"
   - Add your phone number
   - Enter verification code

**Done! SMS notifications enabled!** ✅

**Note:** Trial has $15.50 credit = ~500 messages. For unlimited, upgrade (still very cheap: $0.0075/SMS)

---

## 5. 🔔 Web Push Notifications (OneSignal) - FREE

### Why OneSignal?
- ✅ 10,000 notifications/month FREE
- ✅ Works when app is closed
- ✅ No credit card required
- ✅ Easy setup

### Setup (5 minutes):

1. **Create Account**
   - Go to: https://onesignal.com
   - Click "Get Started Free"
   - Sign up (email only)

2. **Create App**
   - Click "New App/Website"
   - Name: `Medication Manager`
   - Select "Web Push"

3. **Configure Web Push**
   - Site URL: Your Netlify URL or localhost
   - Auto Resubscribe: On
   - Click "Save"

4. **Get App ID**
   - Copy your `App ID`
   - Add to `.env`:
   ```bash
   ONESIGNAL_APP_ID=your-app-id
   ```

5. **Add SDK**
   - OneSignal will give you a code snippet
   - I'll integrate it for you!

**Done! Push notifications enabled!** ✅

---

## 📊 Cost Summary

| Service | Free Tier | Enough For |
|---------|-----------|------------|
| **Supabase** | 500MB + unlimited requests | Years of data |
| **Google Calendar** | Unlimited | Unlimited schedules |
| **Supabase Storage** | 1GB | 1000s of photos |
| **Twilio SMS** | $15.50 credit | 500+ messages |
| **OneSignal** | 10,000/month | 300+ notifications/day |
| **Netlify** | 100GB bandwidth | 1000s of users |

**Total Monthly Cost: $0** 🎉

---

## 🚀 Quick Setup Script

After getting all your keys, create `.env` file:

```bash
# Copy the example
cp .env.example .env

# Edit with your keys
nano .env
```

Paste your keys:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
ONESIGNAL_APP_ID=xxxxx-xxxx-xxxx
```

Then install dependencies:
```bash
npm install
npm start
```

**All features now work!** ✅

---

## 🆘 Need Help?

### I can help you:
1. **Setup any service** - Just share your screen
2. **Get API keys** - I'll guide you step-by-step
3. **Debug issues** - I'll fix any problems
4. **Optimize limits** - Make the most of free tiers

### Common Issues:

**Supabase not connecting?**
- Check URL format: `https://xxx.supabase.co`
- Verify anon key (not service_role key)
- Check if tables are created

**Twilio SMS not sending?**
- Verify recipient phone number in console
- Check trial credit balance
- Ensure phone number format: +1234567890

**Calendar not syncing?**
- Check OAuth redirect URIs match exactly
- Enable Google Calendar API
- Verify credentials

**Photos not uploading?**
- Check Supabase storage bucket is public
- Verify storage policies
- Check file size (<5MB recommended)

---

## 💡 Pro Tips

1. **Supabase**: Use their dashboard to view/edit data directly
2. **Twilio**: Upgrade to paid ($20) for unlimited verified numbers
3. **Calendar**: Can sync with Apple Calendar, Outlook too
4. **Photos**: Compress before upload to save space
5. **OneSignal**: Schedule notifications in advance

---

## 🎯 Next Steps

1. ✅ Setup Supabase (5 min) - **MOST IMPORTANT**
2. ✅ Setup Twilio (5 min) - For SMS
3. ✅ Setup Google Calendar (10 min) - For sync
4. ✅ Enable photo storage (2 min) - Already in Supabase
5. ✅ Setup OneSignal (5 min) - For push notifications

**Total setup time: ~30 minutes**
**Total cost: $0/month forever**

---

## 🚀 Ready to Setup?

**Option 1: I'll help you**
- Share your screen
- I'll guide you through each service
- Takes 30 minutes total

**Option 2: Do it yourself**
- Follow the guides above
- Each service is straightforward
- Ask me if you get stuck!

**Let's make your medication manager AMAZING!** 🎉
