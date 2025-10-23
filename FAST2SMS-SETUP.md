# Fast2SMS Setup Guide

## Overview

This application uses **Fast2SMS** for sending SMS notifications. Fast2SMS is a free Indian SMS service that provides:
- ✅ **50 free SMS per day**
- ✅ **No credit card required**
- ✅ **Simple REST API**
- ✅ **Reliable delivery**
- ✅ **Works with all Indian mobile numbers**

---

## Step 1: Create Fast2SMS Account

1. Visit [https://www.fast2sms.com/](https://www.fast2sms.com/)
2. Click **"Sign Up"** or **"Register"**
3. Fill in your details:
   - Name
   - Email
   - Password
   - Mobile number (Indian)
4. Verify your email and mobile number
5. Login to your account

---

## Step 2: Get API Key

1. After logging in, go to **Dashboard**
2. Click on **"Dev API"** in the left sidebar
3. You'll see your API key displayed
4. Copy the API key (it looks like: `abcdefghijklmnopqrstuvwxyz123456`)

**Important:** Keep your API key secret! Don't share it publicly.

---

## Step 3: Configure Application

1. Open your `.env` file
2. Add your Fast2SMS API key:

```env
FAST2SMS_API_KEY=your_api_key_here
```

3. Save the file
4. Restart the server

---

## Step 4: Test SMS Functionality

1. Start the application
2. Navigate to: `http://localhost:8080/api/test-sms?phone=9876543210`
   - Replace `9876543210` with your actual phone number
3. You should receive a test SMS within seconds
4. Check server logs for confirmation

---

## Phone Verification Flow

### For Users:

1. **First Time Login:**
   - After Google OAuth login, users are redirected to phone verification page
   - Enter 10-digit Indian mobile number
   - Receive 6-digit OTP via SMS
   - Enter OTP to verify (valid for 5 minutes)
   - Access granted to app features

2. **SMS Notifications:**
   - Once verified, users receive medication reminders via SMS
   - Format: `💊 Medication Reminder: Time to take [name] ([dosage])`
   - Includes food timing and special instructions

### For Developers:

**Verification endpoints:**
- `POST /api/verify/send-otp` - Send OTP to phone
- `POST /api/verify/check-otp` - Verify OTP
- `GET /api/verify/status` - Check verification status

**Middleware:**
- `requirePhoneVerification()` - Protects routes requiring verified phone
- Applied to: `/dashboard`, `/api/medications`, `/api/schedules`, `/api/logs`

---

## API Limits & Pricing

### Free Tier (Current):
- **50 SMS per day**
- **All features included**
- **No expiry**

### Paid Plans (Optional):
- **₹100 = 700 SMS** (~₹0.14 per SMS)
- **₹500 = 4000 SMS** (~₹0.125 per SMS)
- **₹1000 = 9000 SMS** (~₹0.11 per SMS)

*Check [Fast2SMS pricing](https://www.fast2sms.com/pricing) for latest rates*

---

## Troubleshooting

### SMS Not Received?

1. **Check API Key:**
   ```bash
   # Verify API key is set
   echo $FAST2SMS_API_KEY
   ```

2. **Check Daily Limit:**
   - Login to Fast2SMS dashboard
   - View remaining SMS count
   - Free tier resets daily at midnight IST

3. **Check Phone Format:**
   - Must be 10 digits
   - No country code (+91 is added automatically)
   - Example: `9876543210` ✅
   - Not: `+919876543210` ❌

4. **Check Server Logs:**
   ```bash
   # Look for SMS send confirmation
   ✅ SMS sent: fast2sms_1234567890
   ```

5. **Test API Directly:**
   ```bash
   curl -X POST "https://www.fast2sms.com/dev/bulkV2" \
     -H "authorization: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "route": "v3",
       "sender_id": "TXTIND",
       "message": "Test message",
       "language": "english",
       "flash": 0,
       "numbers": "9876543210"
     }'
   ```

### OTP Expired?

- OTP is valid for **5 minutes**
- Click **"Resend Code"** to get a new OTP
- Each resend counts as 1 SMS from your daily quota

### Verification Page Not Loading?

- Clear browser cache
- Check if server is running
- Verify route middleware configuration

---

## Database Schema

### Users Table:
```sql
phone TEXT                  -- Phone number in +91XXXXXXXXXX format
phone_verified BOOLEAN      -- Whether phone has been verified
phone_verified_at TIMESTAMP -- When verification completed
```

### Schedules Table:
```sql
user_phone TEXT            -- Cached user phone for SMS notifications
```

---

## Security Best Practices

1. **Never commit API keys:**
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Rate limiting:**
   - OTP requests are limited
   - Prevent abuse with rate limiters

3. **OTP expiry:**
   - OTPs expire after 5 minutes
   - Automatic cleanup of expired codes

4. **Session management:**
   - Phone verification stored in session
   - Persists across server restarts (with PostgreSQL)

---

## Migration from Twilio

### Changes Made:

1. **Dependencies:**
   - ❌ Removed: `twilio` npm package
   - ✅ Added: Native `fetch` API for Fast2SMS

2. **Environment Variables:**
   - ❌ Removed: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `USER_PHONE_NUMBER`
   - ✅ Added: `FAST2SMS_API_KEY`

3. **Phone Format:**
   - Twilio: `+1234567890` (international)
   - Fast2SMS: `9876543210` (10-digit Indian)

4. **Features:**
   - ✅ Send SMS notifications
   - ✅ Phone verification with OTP
   - ⚠️ Two-way SMS (requires Fast2SMS premium)

### Code Changes:

```javascript
// Old (Twilio)
const twilio = require('twilio');
const client = twilio(SID, AUTH_TOKEN);
await client.messages.create({ ... });

// New (Fast2SMS)
await fetch('https://www.fast2sms.com/dev/bulkV2', {
  method: 'POST',
  headers: { 'authorization': API_KEY },
  body: JSON.stringify({ ... })
});
```

---

## Support & Resources

- **Fast2SMS Dashboard:** [https://www.fast2sms.com/dashboard](https://www.fast2sms.com/dashboard)
- **API Documentation:** [https://www.fast2sms.com/dashboard/dev-api](https://www.fast2sms.com/dashboard/dev-api)
- **Support:** [https://www.fast2sms.com/support](https://www.fast2sms.com/support)

---

## Alternative SMS Providers (India)

If Fast2SMS doesn't work for you, consider:

1. **MSG91** - [https://msg91.com/](https://msg91.com/)
   - Free tier: 100 SMS
   - OTP, transactional, and promotional SMS

2. **Kaleyra** - [https://www.kaleyra.com/](https://www.kaleyra.com/)
   - Enterprise-grade SMS API
   - Free trial available

3. **TextLocal** - [https://www.textlocal.in/](https://www.textlocal.in/)
   - 25 free SMS on signup
   - Simple API integration

---

## Next Steps

1. ✅ Get Fast2SMS API key
2. ✅ Add to `.env` file
3. ✅ Run database migration for phone verification
4. ✅ Restart server
5. ✅ Test with `/api/test-sms?phone=YOUR_NUMBER`
6. ✅ Login and verify your phone
7. ✅ Add medication schedules
8. ✅ Receive SMS reminders!

---

**Questions?** Open an issue on GitHub or contact support.
