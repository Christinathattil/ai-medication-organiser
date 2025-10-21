# 💊 Medication Manager - AI-Powered Health Assistant

**Professional medication tracking with AI assistant, smart scheduling, and comprehensive health management**

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![AI Powered](https://img.shields.io/badge/AI-Groq-purple.svg)

---

## 🌟 Features

### 🤖 AI Assistant (Groq-Powered)
- **Natural language understanding** - Talk naturally to manage medications
- **Out-of-context handling** - Politely redirects off-topic questions
- **Smart field validation** - Asks for missing information one at a time
- **Quantity defaults** - Asks for quantity or defaults to 30 units
- **Concise responses** - Direct, 2-3 sentence answers

**AI Examples:**
```
"Add aspirin 500mg tablet 45 pills for headaches"
"Schedule metformin at 8am daily before food"
"What should I take today?"
"Show my adherence stats"
```

### 💊 Medication Management
- Add, edit, delete medications with detailed information
- Track dosage, form, purpose, and prescribing doctor
- Photo attachments for prescriptions
- **Interactive refill with quantity confirmation**
- Refill alerts when running low (≤7 units)

### 📅 Smart Scheduling
- **Food timing required**: Before food, after food, or no timing
- Daily, weekly, or as-needed frequencies
- Multiple times per day
- **Smart subgrouping**: 3+ medicines at same time grouped by food timing
- **Sorting options**: By time, medication name, or frequency
- Flexible start/end dates

### 🔔 Notifications & Reminders
- Desktop notifications at scheduled times
- SMS reminders via Twilio (optional)
- Two-way SMS: Reply YES/NO to log medication
- Real-time alerts
- Never miss a dose!

### 📊 Health Tracking
- Log medications as taken, missed, or skipped
- Complete medication history
- Adherence statistics with percentages
- Track progress over time

### 🔐 Security & Authentication
- Google OAuth 2.0 login
- Row-level security (RLS) for data isolation
- Input validation and sanitization
- Rate limiting protection
- Secure session management
- HTTPS enforced

### 📱 Mobile & PWA
- **Fully responsive** - works on all devices
- **Install as app** on iOS and Android
- Offline support
- Home screen icon
- Full-screen experience

### ☁️ Cloud Storage
- Supabase integration for persistent data
- Access from anywhere
- Automatic backups
- Secure and reliable

---

## 🚀 Quick Start

### Prerequisites
- Node.js v14 or higher
- npm or yarn
- **Groq API Key** (free from [console.groq.com](https://console.groq.com))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd medication-manager

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your credentials
nano .env
```

### Environment Variables

Create a `.env` file with:

```env
# Groq AI (REQUIRED for AI chatbot)
GROQ_API_KEY=your_groq_api_key_here

# Supabase (Required for persistent storage and auth)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Google OAuth (Required for authentication)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback

# Session Secret (Required)
SESSION_SECRET=your_random_secret_key

# Twilio (Optional for SMS notifications)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### Start the Server

```bash
npm start
```

### Access the App

Open your browser to:
```
http://localhost:8080
```

---

## 🔑 Setup Guides

### 1. Get Groq API Key (Required)

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card)
3. Navigate to "API Keys"
4. Create new API key
5. Copy to `.env` file

**Features enabled:**
- Natural language understanding
- Smart intent detection
- Conversational memory
- Context-aware responses

### 2. Setup Supabase (Required)

1. Visit [supabase.com](https://supabase.com)
2. Create free account
3. Create new project
4. Get URL and API key from Settings
5. Run migrations from `database/` folder

**Required tables:**
- users
- medications
- schedules
- medication_logs
- sms_reminders

### 3. Setup Google OAuth (Required)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:8080/auth/google/callback`
6. Copy Client ID and Secret to `.env`

### 4. Setup Twilio SMS (Optional)

1. Visit [twilio.com](https://www.twilio.com)
2. Create free account (trial credits provided)
3. Get phone number
4. Copy credentials to `.env`
5. Configure webhook: `https://your-domain.com/api/sms/webhook`

---

## 📖 How to Use

### Using the AI Assistant

**Find the 💬 button** in the bottom-right corner.

**Add Medication:**
```
"Add aspirin 500mg tablet"
→ AI asks: "How many units do you have? (Default: 30)"
→ You: "60"
→ AI opens form with all details filled
```

**Create Schedule:**
```
"Schedule aspirin at 8am daily before food"
→ AI opens schedule form
→ Review and click "Add Schedule"
```

**View Information:**
```
"What should I take today?"
"Show my stats"
"What needs refilling?"
```

### Manual Usage

**Add Medication:**
1. Go to Medications tab
2. Click "Add Medication"
3. Fill required fields (name*, dosage*)
4. Quantity defaults to 30 if not specified
5. Click "Add Medication"

**Create Schedule:**
1. Go to Schedules tab
2. Click "Add Schedule"
3. Select medication
4. Set time (required)
5. **Select food timing** (required): Before/After/None
6. Click "Add Schedule"

**Refill Medication:**
1. Dashboard shows "Refill Alerts" for medications ≤7 units
2. Click "Refill" button
3. **System asks for quantity** (suggests default)
4. Enter amount or accept default
5. Quantity updated!

**View Organized Schedules:**
1. Go to Schedules tab
2. Select "Sort by Time"
3. Check "Group by Time"
4. **3+ medicines at same time?** → Auto-subgrouped by food timing!

**Log Medications:**
1. When notification appears, mark as taken
2. Or go to History tab
3. Log manually as taken/missed/skipped

---

## ✨ Latest Enhancements

### 1. Refill Quantity Confirmation
- **Before**: Auto-filled with 30 units
- **After**: Prompts for confirmation, allows custom amount

### 2. Food Timing Updates
- **Removed**: "With food" option
- **Options now**: Before food, After food, No timing
- **Status**: Required field with validation

### 3. Smart Schedule Organization
- **Sorting**: By time, medication, or frequency
- **Grouping**: By time slots
- **Subgrouping**: 3+ meds at same time grouped by food timing

### 4. Enhanced AI Assistant
- Out-of-context detection and redirection
- Mandatory field validation
- One-at-a-time field prompts
- Quantity handling with defaults
- Concise, helpful responses

### 5. Security Implementation
- Google OAuth 2.0 authentication
- Row-level security (RLS)
- Input validation on all forms
- Rate limiting (100 req/15min)
- Session management
- CSRF protection

---

## 🏗️ Project Structure

```
medication-manager/
├── public/                 # Frontend files
│   ├── index.html         # Main application
│   ├── login.html         # Login page
│   ├── loading.html       # Loading screen
│   ├── app.js            # Core application logic
│   └── service-worker.js  # PWA support
│
├── server/                # Backend files
│   ├── enhanced-server.js # Main Express server
│   ├── auth.js           # Google OAuth
│   ├── security.js       # Security middleware
│   ├── database.js       # Fallback JSON storage
│   └── supabase-db.js    # Supabase integration
│
├── database/             # SQL migrations
│   ├── users-auth-migration.sql
│   ├── row-level-security.sql
│   ├── add-food-timing-migration.sql
│   └── sms-tracking-migration.sql
│
├── uploads/             # Uploaded photos
├── .env                # Environment variables
├── .env.example        # Environment template
├── package.json        # Dependencies
└── README.md          # This file
```

---

## 🛠️ Tech Stack

**Frontend:**
- Vanilla JavaScript (ES6+)
- TailwindCSS for styling
- Font Awesome icons
- Service Worker for PWA

**Backend:**
- Node.js & Express
- Passport.js (Google OAuth)
- Express Validator (input validation)
- Helmet.js (security headers)
- Express Rate Limit
- Node Cron (scheduling)
- Multer (file uploads)

**Database:**
- Supabase (PostgreSQL)
- Row-Level Security (RLS)
- JSON fallback for development

**AI & External Services:**
- Groq API (Llama 3.3 70B)
- Twilio (SMS)
- Google OAuth

---

## 🚀 Deployment (Render)

### Prerequisites
1. Push code to GitHub
2. Have all environment variables ready

### Steps
1. Visit [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: medication-manager
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   ```
   GROQ_API_KEY=your_groq_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   DATABASE_URL=postgresql://postgres.[project]:[password]@...pooler.supabase.com:5432/postgres
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_secret
   GOOGLE_CALLBACK_URL=https://your-app.onrender.com/auth/google/callback
   SESSION_SECRET=your_random_secret
   TWILIO_ACCOUNT_SID=your_twilio_sid (optional)
   TWILIO_AUTH_TOKEN=your_twilio_token (optional)
   TWILIO_PHONE_NUMBER=your_twilio_number (optional)
   USER_PHONE_NUMBER=your_phone (optional)
   NODE_ENV=production
   ```
6. Click "Create Web Service"
7. Wait 2-3 minutes for deployment

### Verify Deployment
Check logs for:
```
✅ PostgreSQL session store connected
✅ Using Supabase (persistent storage)
🌐 Public URL: https://your-app.onrender.com
```

## 📱 Mobile App Installation

### After Deployment

### Install on Phone

**Android (Chrome):**
1. Open deployed URL in Chrome
2. Tap "Install" when prompted
3. App appears on home screen

**iPhone (Safari):**
1. Open deployed URL in Safari
2. Tap Share icon
3. Select "Add to Home Screen"
4. App appears on home screen

---

## 🔒 Security Features

### Authentication
- Google OAuth 2.0
- Secure session management (30-day expiry)
- HttpOnly + Secure cookies
- Token security (server-side only)

### Data Protection
- Row-level security (RLS) - users only see their data
- Input validation on all forms
- SQL injection prevention
- XSS protection
- CSRF protection

### Rate Limiting
- API: 100 requests per 15 minutes
- Auth: 5 requests per 15 minutes
- SMS: 10 messages per hour

### Headers
- Content Security Policy (CSP)
- HSTS (Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options

---

## 🧪 Testing

### Test Refill Confirmation
1. Add medication with quantity 30
2. Take doses until ≤7 remaining
3. Click "Refill" → Prompt appears
4. Enter custom amount or accept default

### Test Food Timing Validation
1. Try creating schedule without selecting food timing
2. Should show error: "Food timing is required"
3. Select option → Submit succeeds

### Test Schedule Subgrouping
1. Create 3+ medications for same time (e.g., 8:00 AM)
2. Give different food timings
3. Go to Schedules → Sort by Time → Group by Time
4. Should see subgroups: Before Food, No Timing, After Food

### Test AI Assistant
```
"What's the weather?" → Should redirect to medication topics
"Add aspirin" → Should ask "What is the dosage?"
"Schedule it at 8am" → Should ask "Before/after food?"
```

---

## 🐛 Troubleshooting

### Login Issues
- Check Google OAuth credentials in `.env`
- Verify callback URL matches Google Console
- Clear browser cookies

### AI Not Responding
- Verify `GROQ_API_KEY` in `.env`
- Restart server after adding key
- Check browser console for errors

### Database Connection Failed (Render)
**Symptom:** `❌ Database connection failed` in logs
**Cause:** Missing `DATABASE_URL` environment variable
**Fix:**
1. Go to Render Dashboard → Environment
2. Add `DATABASE_URL` with your Supabase connection string
3. Get it from: Supabase → Settings → Database → Connection String (Session pooler)
4. Save and redeploy

### AI Extracting Wrong Quantity
**Symptom:** User says "20 units" but AI uses default 30
**Fix:** Already fixed in latest version (prioritizes current message)
**Workaround:** Be explicit: "Add aspirin 500mg tablet 20 units"

### Database Errors
- Verify Supabase credentials
- Run migrations in correct order
- Check RLS policies are enabled

### SMS Not Working
- Verify Twilio credentials
- Check webhook URL is publicly accessible
- Use ngrok for local testing

### Notifications Not Appearing
- Allow browser notifications
- Keep app open in a tab
- Check schedule time format (24-hour)

---

## 📊 Database Migrations

Run these SQL files in Supabase in order:

1. `users-auth-migration.sql` - Creates users table
2. `row-level-security.sql` - Enables RLS policies
3. `add-food-timing-migration.sql` - Adds food_timing column
4. `sms-tracking-migration.sql` - Adds SMS tracking

---

## 🔒 Data Persistence & Safety

### Your Data is Protected
- ✅ **All data stored permanently** in Supabase PostgreSQL
- ✅ **Sessions persist across restarts** (30-day expiry)
- ✅ **No automatic data deletion** - ever
- ✅ **Row-level security** isolates user data
- ✅ **Automatic backups** via Supabase

### What Gets Stored
**Permanently Stored:**
- User accounts and profiles
- Medications, schedules, logs
- SMS reminders and history
- Uploaded prescription photos

**Session Storage (30 days):**
- Login sessions (PostgreSQL-backed)
- Only expired sessions auto-deleted after 30 days

### Data Deletion
**Manual Only:**
- Users can delete their own data via UI
- No scheduled jobs delete user data
- Database admin can run SQL scripts if needed

**Session Expiry ≠ Data Loss:**
- Sessions expire after 30 days of inactivity
- User just needs to log in again
- All medication data remains intact

---

## 🎯 Best Practices

### For Patients
- Log medications consistently
- Set realistic schedules
- Use food timing accurately
- Review adherence stats weekly
- Keep refill alerts enabled

### For Developers
- Never commit `.env` file
- Test RLS policies thoroughly
- Validate all user inputs
- Use prepared statements
- Keep dependencies updated
- Follow security best practices

---

## 📝 API Endpoints

### Authentication
- `GET /auth/google` - Initiate OAuth
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/logout` - Logout
- `GET /auth/user` - Get current user

### Medications
- `GET /api/medications` - List medications
- `POST /api/medications` - Add medication
- `PUT /api/medications/:id` - Update medication
- `DELETE /api/medications/:id` - Delete medication
- `POST /api/medications/:id/quantity` - Update quantity (refill)

### Schedules
- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Add schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule
- `GET /api/schedule/today` - Get today's schedule

### Logs & Stats
- `GET /api/logs` - Medication history
- `POST /api/logs` - Log medication
- `GET /api/stats/adherence` - Adherence statistics
- `GET /api/refill-alerts` - Refill alerts

### AI
- `POST /api/chat` - Chat with AI assistant

### SMS
- `POST /api/sms/webhook` - Twilio webhook

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

MIT License - Free to use for personal or commercial purposes.

---

## 🆘 Support

**Need Help?**
1. Check this README
2. Review browser console (F12)
3. Check server logs
4. Verify environment variables

**Common Issues:**
- AI not working? Check `GROQ_API_KEY`
- Can't login? Check Google OAuth setup
- Database errors? Run migrations
- SMS not working? Check Twilio webhook

---

## 🎉 Get Started Now!

```bash
# Install
npm install

# Configure
cp .env.example .env
# Add your Groq API key and other credentials

# Start
npm start

# Open
http://localhost:8080
```

**First steps:**
1. Login with Google
2. Click 💬 AI button
3. Say: "Add aspirin 500mg tablet"
4. Say: "Schedule it at 8am daily before food"
5. Enjoy never missing a medication again! 💊✨

---

**Built with ❤️ for better health management**
