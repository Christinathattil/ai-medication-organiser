# Two-Way SMS Reminders Setup Guide

## Overview
Your medication manager now supports **two-way SMS reminders**! 

When you receive a medication reminder via SMS, you can reply:
- **YES** (or Y or 1) - To confirm you took the medication
- **NO** (or N or 0) - To mark it as skipped

The app will automatically update and reflect your response!

---

## Setup Steps

### 1. Run the Database Migration

First, add the SMS tracking table to your Supabase database:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `database/sms-tracking-migration.sql`
4. Copy and paste the SQL into the editor
5. Click **Run** to execute

This creates:
- `sms_reminders` table to track all SMS sent and responses
- Indexes for fast lookups
- Columns in `medication_logs` for SMS tracking

### 2. Configure Twilio Webhook

For Twilio to send responses back to your app, you need to configure a webhook:

#### Option A: For Local Development (Using ngrok)

1. **Install ngrok** (if not already installed):
   ```bash
   brew install ngrok  # Mac
   # Or download from: https://ngrok.com/download
   ```

2. **Start your server**:
   ```bash
   npm start
   ```

3. **In another terminal, start ngrok**:
   ```bash
   ngrok http 8080
   ```

4. **Copy the HTTPS URL** (looks like: `https://abc123.ngrok.io`)

5. **Configure Twilio**:
   - Go to: https://console.twilio.com/
   - Click on **Phone Numbers** → **Manage** → **Active numbers**
   - Click on your Twilio phone number
   - Scroll to **Messaging Configuration**
   - Under "A MESSAGE COMES IN":
     - Set to: **Webhook**
     - URL: `https://abc123.ngrok.io/api/sms/webhook`
     - HTTP: **POST**
   - Click **Save**

#### Option B: For Production (Deployed App)

1. **Deploy your app** to Render, Railway, or your hosting service

2. **Get your production URL** (e.g., `https://your-app.onrender.com`)

3. **Configure Twilio**:
   - Go to: https://console.twilio.com/
   - Click on **Phone Numbers** → **Manage** → **Active numbers**
   - Click on your Twilio phone number
   - Scroll to **Messaging Configuration**
   - Under "A MESSAGE COMES IN":
     - Set to: **Webhook**
     - URL: `https://your-app.onrender.com/api/sms/webhook`
     - HTTP: **POST**
   - Click **Save**

### 3. Test the Setup

1. **Send a test reminder**:
   ```bash
   curl http://localhost:8080/api/test-sms
   ```

2. **Check your phone** - You should receive an SMS like:
   ```
   💊 Medication Reminder: Time to take Aspirin (500mg)
   
   Reply YES when taken or NO if skipped.
   ```

3. **Reply to the SMS** with:
   - `YES` → App marks medication as taken
   - `NO` → App marks medication as skipped

4. **Check the app** - Refresh your dashboard to see the updated status!

---

## How It Works

### When a Reminder is Sent:

1. ✅ Desktop notification appears
2. 📱 SMS sent to your phone with YES/NO instructions
3. 💾 SMS tracked in database with:
   - Medication and schedule details
   - Twilio message ID
   - Timestamp
   - Status: "sent"

### When You Reply:

1. 📲 Twilio receives your SMS reply
2. 🔗 Twilio sends it to your webhook: `/api/sms/webhook`
3. 🤖 Server processes your response:
   - Recognizes YES → status = "taken"
   - Recognizes NO → status = "skipped"
4. 💾 Updates database:
   - Creates log entry in `medication_logs`
   - Updates `sms_reminders` with response
   - Decrements quantity if taken
5. ✅ Sends confirmation SMS back to you
6. 🔄 App reflects the updated status immediately

---

## Webhook Endpoint Details

**Endpoint**: `POST /api/sms/webhook`

**Receives from Twilio**:
- `From`: Phone number that sent the reply
- `Body`: Message content (YES/NO)
- `MessageSid`: Twilio message ID

**Processes**:
- Validates response (YES/NO)
- Finds matching medication reminder
- Logs medication status
- Updates SMS tracking
- Sends confirmation reply

**Returns**: TwiML response for Twilio

---

## Responses Recognized

The system recognizes multiple formats:

| User Reply | Status | Confirmation |
|------------|--------|--------------|
| YES, Y, 1 | taken | "✅ Great! Marked as taken. Stay healthy! 💊" |
| NO, N, 0 | skipped | "⏭️ Noted. Marked as skipped. Remember to take it when you can!" |
| Other | - | "Please reply with YES if you took your medication, or NO if you skipped it." |

---

## Database Schema

### sms_reminders Table
```sql
- id: Primary key
- medication_id: Reference to medications
- schedule_id: Reference to schedules
- phone_number: Recipient phone
- reminder_message: SMS content sent
- sent_at: When SMS was sent
- twilio_message_sid: Twilio tracking ID
- response_received: Boolean (has user replied?)
- response_text: User's reply text
- response_at: When user replied
- status: sent | delivered | failed | responded_yes | responded_no
```

### medication_logs Updates
```sql
- logged_via_sms: Boolean (was this logged via SMS?)
- sms_reminder_id: Reference to sms_reminders
```

---

## Troubleshooting

### Not receiving SMS?
- Check Twilio console for delivery status
- Verify phone number is verified (for trial accounts)
- Check server logs for errors

### Responses not working?
- Verify webhook is configured in Twilio
- Check ngrok is running (for local dev)
- View server logs: `console.log('📱 Received SMS from...')`
- Test webhook URL directly: `https://your-url/api/sms/webhook`

### Webhook not receiving messages?
- Ensure URL is publicly accessible
- For ngrok: Make sure HTTPS URL is used
- Check Twilio webhook logs in console
- Verify webhook URL doesn't have trailing slash

### Status not updating in app?
- Refresh the app dashboard
- Check browser console for errors
- Verify Supabase connection
- Check medication_logs table directly

---

## Security Notes

1. **Twilio validates webhooks** - Only Twilio can call your webhook
2. **Phone number matching** - Only responds to the configured USER_PHONE_NUMBER
3. **Time-based matching** - Only processes responses for recent reminders (within 2 hours)
4. **One response per reminder** - Prevents duplicate logging

---

## Cost Estimate

**Twilio Trial**: $15.50 free credit
- ~500 SMS messages (send + receive)
- Each reminder + response = 2 messages

**Twilio Paid**: 
- $0.0079 per SMS (US)
- 1 reminder/day = ~$5/year
- 3 reminders/day = ~$15/year

---

## Next Steps

1. ✅ Run the database migration
2. ✅ Configure Twilio webhook
3. ✅ Test with a real reminder
4. 🎉 Enjoy hands-free medication tracking!

**Pro Tip**: You can also manually log medications in the app if you prefer. The SMS feature is optional but makes tracking effortless!
