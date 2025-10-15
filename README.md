# 💊 Medication Manager - AI-Powered

**Smart medication tracking with AI assistant, real-time notifications, and cloud storage**

![Medication Manager](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## ✨ Features

### 📱 Mobile App (PWA)
- **Install on your phone** like a native app!
- Works on iOS and Android
- Offline support
- Full-screen experience
- Home screen icon
- Fast and responsive

### 🤖 AI Assistant
- Natural language commands
- Auto-fills medication and schedule forms
- Seamless workflow - no manual navigation
- Smart medication extraction

### 💊 Medication Management
- Add, edit, and delete medications
- Track dosage, form, and purpose
- Photo attachments for prescriptions
- Refill alerts and quantity tracking

### 📅 Smart Scheduling
- Daily, weekly, or as-needed schedules
- Multiple times per day
- Flexible start/end dates
- Special instructions and food requirements

### 🔔 Real-Time Notifications
- Desktop notifications at scheduled times
- Sound alerts
- Automatic reminders every minute
- Never miss a dose!

### 📊 Adherence Tracking
- Log medications as taken, missed, or skipped
- View complete history
- Adherence statistics and charts
- Track your progress over time

### ☁️ Cloud Storage
- Supabase integration for persistent data
- Never lose your medication data
- Access from anywhere
- Secure and reliable

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd medication-manager

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start the server
npm start
```

### Access the App
Open your browser and go to:
```
http://localhost:8080
```

---

## 🤖 Using the AI Assistant

### Find the AI Button
Look for the **purple 💬 button** in the bottom-right corner of the screen.

### Add Medications
```
"Add aspirin 500mg tablet for headache"
"Add metformin 850mg tablet for diabetes"
"Add vitamin D 1000 IU capsule"
```

**What happens:**
1. AI switches to Medications tab
2. Opens and fills the form automatically
3. You review and click "Add Medication"

### Create Schedules
```
"Schedule aspirin at 10:00 daily"
"Schedule metformin at 08:00 daily"
"Schedule vitamin D at 20:00 daily"
```

**What happens:**
1. AI switches to Schedules tab
2. Opens and fills the form automatically
3. You review and click "Add Schedule"

### Other Commands
```
"Show today's schedule"
"What needs refilling?"
"My adherence statistics"
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following:

```env
# Supabase (Required for persistent storage)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Twilio (Optional for SMS notifications)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### Setup Guides

- **STEP-BY-STEP-SETUP.md** - Detailed setup instructions
- **FREE-SERVICES-SETUP.md** - How to get free Supabase account
- **DEPLOYMENT.md** - Deploy to production
- **MOBILE-APP-GUIDE.md** - Install as mobile app

---

## 📱 Mobile App Installation

### Your app is now a PWA (Progressive Web App)!

**On Android:**
1. Deploy your app (see DEPLOYMENT.md)
2. Open the URL in Chrome
3. Tap "Install" when prompted
4. App appears on home screen!

**On iPhone:**
1. Deploy your app
2. Open the URL in Safari
3. Tap Share → "Add to Home Screen"
4. App appears on home screen!

**See MOBILE-APP-GUIDE.md for complete instructions!**

---

## 📱 How to Use

### 1. Add Your First Medication

**Using AI:**
- Click 💬 button
- Type: "Add aspirin 500mg tablet"
- Click "Add Medication"

**Manually:**
- Go to Medications tab
- Click "Add Medication" button
- Fill in the form
- Click "Add Medication"

### 2. Create a Schedule

**Using AI:**
- Click 💬 button
- Type: "Schedule aspirin at 10:00 daily"
- Click "Add Schedule"

**Manually:**
- Go to Schedules tab
- Click "Add Schedule" button
- Select medication and set time
- Click "Add Schedule"

### 3. Get Notifications

- Desktop notifications appear at scheduled times
- Sound alerts to grab your attention
- Check terminal to see notification logs

### 4. Log Your Medications

- When notification appears, mark as taken
- Or go to History tab to log manually
- Track your adherence over time

---

## 🎯 Tips & Tricks

### AI Commands
- Be specific with dosage and form
- Include purpose for better tracking
- Use 24-hour time format (22:30 not 10:30 PM)

### Scheduling
- Test with a schedule 2 minutes from now
- Use daily for regular medications
- Use weekly for supplements
- Use as-needed for occasional medications

### Notifications
- Allow browser notifications when prompted
- Keep the app open for desktop notifications
- Check terminal logs for debugging

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript, TailwindCSS
- **Backend:** Node.js, Express
- **Database:** Supabase (PostgreSQL)
- **Notifications:** node-notifier
- **SMS:** Twilio (optional)
- **Scheduling:** node-cron
- **File Upload:** Multer

---

## 📂 Project Structure

```
medication-manager/
├── public/              # Frontend files
│   ├── index.html      # Main HTML
│   ├── app.js          # Core functionality
│   └── chatbot-simple.js # AI assistant
├── server/             # Backend files
│   ├── enhanced-server.js # Main server
│   ├── database.js     # Database operations
│   └── supabase.js     # Supabase integration
├── uploads/            # Uploaded photos
├── .env               # Environment variables
├── package.json       # Dependencies
└── README.md          # This file
```

---

## 🚀 Deployment

See **DEPLOYMENT.md** for detailed instructions on deploying to:
- Netlify
- Vercel
- Heroku
- Your own server

---

## 🐛 Troubleshooting

### AI Button Not Visible
1. Hard refresh: `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
2. Check browser console (F12) for errors
3. Clear browser cache

### Notifications Not Working
1. Allow browser notifications when prompted
2. Check that server is running
3. Verify schedule time is in 24-hour format
4. Look at terminal logs for debugging

### Database Errors
1. Verify Supabase credentials in `.env`
2. Check Supabase dashboard for connection
3. Ensure tables are created (see STEP-BY-STEP-SETUP.md)

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

## 📞 Support

For issues or questions:
1. Check the documentation files
2. Look at browser console for errors
3. Check server terminal logs

---

## 🎉 Enjoy!

Your smart medication manager is ready to use!

**Start by clicking the 💬 button and typing:**
```
"Add aspirin 500mg tablet"
```

**Then create a schedule:**
```
"Schedule aspirin at 10:00 daily"
```

**Never miss a medication again!** 💊✨
