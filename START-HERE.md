# 🚀 Quick Start Guide - MediCare Pro

Welcome to MediCare Pro! Follow these simple steps to get started.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Groq AI (Essential)

### Get Your Free API Key

1. **Visit**: https://console.groq.com
2. **Sign up** (no credit card required)
3. **Create an API key**
4. **Copy the key**

### Add to Environment

```bash
# Copy the template
cp .env.template .env

# Edit the file
nano .env
# or
code .env
# or use any text editor
```

Add your Groq API key:
```
GROQ_API_KEY=gsk_your_actual_key_here
```

**Need help?** See [GROQ-SETUP.md](GROQ-SETUP.md) for detailed instructions.

## Step 3: Start the Server

```bash
npm start
```

You should see:
```
✅ Groq AI enabled
🏥 Medication Manager Server running at http://localhost:8080
```

## Step 4: Open in Browser

Visit: **http://localhost:8080**

## Step 5: Try the AI Chatbot

1. Look for the **purple AI button** in the bottom-right corner
2. Click it to open the chatbot
3. Try saying: **"Show me today's schedule"**

## 🎉 You're All Set!

### What to Do Next

1. **Add Your First Medication**
   - Click "Medications" tab
   - Click "Add Medication" button
   - Or use the AI: "Add aspirin 500mg tablet for headaches"

2. **Create a Schedule**
   - Click "Schedules" tab
   - Click "Add Schedule" button
   - Or use the AI: "Schedule aspirin at 8am daily"

3. **Explore Features**
   - Dashboard: Overview of your medications
   - History: See all your medication logs
   - Stats: View your adherence statistics

## Optional: Add Persistent Storage

For data that persists across restarts, set up Supabase:

1. Visit: https://supabase.com
2. Create a free account
3. Create a new project
4. Get your URL and API key
5. Add to `.env`:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

See [FREE-SERVICES-SETUP.md](FREE-SERVICES-SETUP.md) for details.

## Troubleshooting

### "I'm currently in basic mode"
- Your Groq API key is not configured
- Check your `.env` file
- Make sure you restarted the server

### Server won't start
- Make sure Node.js is installed: `node --version`
- Make sure dependencies are installed: `npm install`
- Check for port conflicts (default: 8080)

### Chatbot not responding
- Check browser console for errors (F12)
- Make sure server is running
- Check your internet connection

## Need Help?

- **Setup Guide**: [STEP-BY-STEP-SETUP.md](STEP-BY-STEP-SETUP.md)
- **Groq Setup**: [GROQ-SETUP.md](GROQ-SETUP.md)
- **What's New**: [WHATS-NEW.md](WHATS-NEW.md)
- **Full README**: [README.md](README.md)

## Tips for Best Experience

1. **Use Natural Language**: The AI understands conversational text
2. **Be Specific**: Include dosage and form when adding medications
3. **Check Daily**: Review your schedule each morning
4. **Log Consistently**: Mark medications as taken/missed for accurate stats

---

**Enjoy MediCare Pro! 💊✨**
