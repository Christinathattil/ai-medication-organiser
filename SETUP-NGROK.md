# 🌐 ngrok Setup for Two-Way SMS Testing

## Option 1: Quick ngrok Setup (Recommended - Free)

### Step 1: Sign up for ngrok (30 seconds)
1. Go to: https://dashboard.ngrok.com/signup
2. Sign up with Google/GitHub (quickest)
3. You'll get to the dashboard

### Step 2: Get your authtoken
1. You should see a page titled "Your Authtoken"
2. Copy the command that looks like:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```
3. Paste and run it in your terminal

### Step 3: Start ngrok
```bash
ngrok http 8080
```

### Step 4: Copy the HTTPS URL
Look for a line like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:8080
```
Copy that HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Step 5: Configure Twilio Webhook
1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click your phone number: **+13203488861**
3. Scroll to "Messaging Configuration"
4. Under "A MESSAGE COMES IN":
   - Webhook: `https://abc123.ngrok.io/api/sms/webhook`
   - HTTP: **POST**
5. Click **Save**

### Step 6: Test!
Reply to the test SMS you received with: **YES**

You should get a confirmation message and see the status update in your app!

---

## Option 2: Test Without ngrok (Manual Testing)

If you don't want to use ngrok right now, you can still test the SMS system manually:

### Test the webhook endpoint directly:
```bash
curl -X POST http://localhost:8080/api/sms/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=+919446701395&Body=YES&MessageSid=TEST123"
```

This simulates receiving a "YES" response from your phone number.

Check your app - you should see a new log entry!

---

## Option 3: Deploy to Production (No ngrok needed)

Once you deploy your app to Render or another hosting service, you can use your production URL directly:

**Production Webhook URL:**
```
https://your-app.onrender.com/api/sms/webhook
```

No ngrok needed in production!

---

## Quick Commands

**Start ngrok after auth:**
```bash
ngrok http 8080
```

**Keep it running in a separate terminal while testing**

**When done testing:**
Press `Ctrl+C` to stop ngrok
