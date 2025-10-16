# 🚀 Quick Reference - Medication Manager

## Server Commands

```bash
# Start server
npm start

# Stop server
Ctrl+C (in terminal)

# Check if running
lsof -i :8080
```

---

## URLs

- **App:** http://localhost:8080
- **Health Check:** http://localhost:8080/health
- **API Base:** http://localhost:8080/api

---

## AI Chatbot Commands

Click the AI button (bottom-right) and try:

```
"Show me today's schedule"
"Add aspirin 500mg for headaches"
"Schedule vitamin D at 8am daily"
"What are my stats?"
"Check refill alerts"
"I need to add my blood pressure medication"
```

---

## SMS Testing

### Manual SMS Test (Browser Console)
```javascript
fetch('http://localhost:8080/api/send-sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '+919446701395',
    message: 'Test from Medication Manager'
  })
}).then(r => r.json()).then(console.log);
```

### Change SMS Recipient
Edit `.env` file:
```
USER_PHONE_NUMBER=+1234567890
```
Then restart server.

---

## Common Issues & Fixes

### Chatbot not loading?
1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Check console (F12) for errors
3. Restart server

### Edit schedule not working?
- **FIXED!** Just refresh your browser

### SMS not received?
1. Check server logs for "SMS sent"
2. Verify phone number in `.env`
3. Check Twilio balance
4. Verify number in Twilio console (trial mode)

---

## Environment Variables (.env)

```bash
# Database
SUPABASE_URL=your_url
SUPABASE_KEY=your_key

# SMS
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890  # Twilio number
USER_PHONE_NUMBER=+1234567890    # Your number

# AI
GROQ_API_KEY=your_groq_key
```

---

## Key Features

✅ Add/Edit/Delete Medications
✅ Schedule Management
✅ AI Chatbot (Natural Language)
✅ SMS Reminders (Automatic)
✅ Photo Uploads
✅ Adherence Tracking
✅ Refill Alerts

---

## Status Check

```bash
# Server running?
curl http://localhost:8080/health

# Expected response:
{"status":"healthy","timestamp":"..."}
```

---

## Browser Console Shortcuts

```javascript
// Check if chatbot loaded
typeof MedicationChatbotGroq

// Open chatbot
window.medicationChatbot.toggle()

// Check API connection
fetch('/api/medications').then(r=>r.json()).then(console.log)
```

---

## Documentation Files

- `FINAL-STATUS.md` - Complete system status
- `ALL-FIXES-COMPLETE.md` - Detailed fixes
- `SMS-SETUP-COMPLETE.md` - SMS guide
- `QUICK-REFERENCE.md` - This file

---

**Need help? Check the documentation files above! 📚**

Last updated: Oct 16, 2025, 9:28 PM IST
