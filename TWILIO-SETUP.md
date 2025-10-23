# Twilio SMS Setup Guide

## Overview
Your medication manager now uses **Twilio** for reliable SMS delivery. Twilio offers:
- ✅ **$15 free trial credits** (~500 SMS for India)
- ✅ **No credit card required** to start trial
- ✅ **Two-way SMS** - Users can reply YES/NO to medication reminders
- ✅ **99.95% uptime** - Industry-leading reliability

---

## Step 1: Sign Up for Twilio

1. Go to: **https://www.twilio.com/try-twilio**
2. Click **"Sign up for free"**
3. Fill in your details:
   - Email address
   - Password
   - Choose your country (India)
4. Verify your email
5. Complete phone verification

---

## Step 2: Get Your Credentials

After signing up, you'll land on the Twilio Console:

### A. Get Account SID and Auth Token
1. On the dashboard, find the **"Account Info"** section
2. Copy your **Account SID** (starts with AC...)
3. Copy your **Auth Token** (click "Show" to reveal it)

### B. Get a Phone Number
1. In the left sidebar, click **"Phone Numbers"** → **"Manage"** → **"Buy a number"**
2. Select **"India (+91)"** as country
3. Check **"SMS"** capability
4. Click **"Search"**
5. Pick a number and click **"Buy"**
6. Confirm purchase (uses trial credits - FREE!)
7. Copy your phone number (format: +91XXXXXXXXXX)

---

## Step 3: Add Credentials to Render

1. Go to **Render Dashboard**: https://dashboard.render.com/
2. Select your **"ai-medication-organiser"** service
3. Click **"Environment"** in the left sidebar
4. Add these three environment variables:

   **Variable 1:**
   - Key: `TWILIO_ACCOUNT_SID`
   - Value: [Your Account SID from Step 2A]

   **Variable 2:**
   - Key: `TWILIO_AUTH_TOKEN`
   - Value: [Your Auth Token from Step 2A]

   **Variable 3:**
   - Key: `TWILIO_PHONE_NUMBER`
   - Value: [Your phone number from Step 2B, e.g., +919876543210]

5. Click **"Save Changes"**
6. Render will automatically redeploy (~2 minutes)

---

## Step 4: Configure Webhook (for 2-way SMS)

To enable YES/NO responses to medication reminders:

1. In Twilio Console, go to **"Phone Numbers"** → **"Manage"** → **"Active numbers"**
2. Click on your phone number
3. Scroll to **"Messaging Configuration"**
4. Under **"A MESSAGE COMES IN"**, set:
   - **Webhook**: `https://ai-medication-organiser.onrender.com/api/sms/webhook`
   - **HTTP Method**: `POST`
5. Click **"Save"**

---

## Step 5: Test SMS

After Render redeploys:

1. Go to: `https://ai-medication-organiser.onrender.com/api/test-sms?phone=9876543210`
   (Replace with your actual phone number)
2. You should receive a test SMS!
3. Check server logs for confirmation

---

## Usage

### Phone Verification
- Users will receive OTP via Twilio
- 6-digit code, valid for 5 minutes

### Medication Reminders
- Sent at scheduled times
- Format: "💊 Medication Reminder: Time to take [name] ([dosage])"
- Users can reply:
  - **YES** / **Y** / **1** = Mark as taken
  - **NO** / **N** / **0** = Mark as skipped

---

## Cost Breakdown

### Trial Account
- **$15 free credits**
- India SMS: ~₹0.60-1.00 per SMS
- **Total: ~500 SMS free**

### After Trial (Pay-as-you-go)
- No monthly fees
- Pay only for what you use
- India SMS: ₹0.60-1.00 per SMS

### Example Costs
For 100 users with 3 reminders/day:
- Daily: 300 SMS × ₹0.60 = ₹180/day
- Monthly: ~₹5,400/month

---

## Troubleshooting

### "SMS API not configured" error
- Check all 3 environment variables are set in Render
- Verify no extra spaces in values
- Wait for redeploy to complete

### SMS not received
- Check Twilio Console → "Monitor" → "Logs"
- Verify phone number format (+91XXXXXXXXXX)
- Check if number is on DND list (India)

### Two-way SMS not working
- Verify webhook URL is configured correctly
- Check webhook uses HTTPS (not HTTP)
- Test by replying YES to a reminder

---

## Support

- **Twilio Docs**: https://www.twilio.com/docs/sms
- **Twilio Support**: https://support.twilio.com/

---

## Migration from Fast2SMS

If you had Fast2SMS configured:
1. ✅ Code already updated
2. ✅ Remove old `FAST2SMS_API_KEY` from Render (optional)
3. ✅ Add new Twilio variables (Step 3)
4. ✅ Everything will work automatically

---

**You're all set! 🎉**

Your medication manager now uses Twilio for reliable, two-way SMS communication.
