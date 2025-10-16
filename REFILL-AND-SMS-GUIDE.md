# 📋 Refill & SMS Notification Guide

## 🔄 How Refilling Works

### Overview
The system tracks medication quantity and alerts you when medications are running low.

### Key Features

#### 1. **Automatic Tracking**
- When you add a medication, you specify the **Total Quantity** (e.g., 30 tablets)
- System sets `remaining_quantity` = `total_quantity` initially
- Each time you mark a dose as "taken", it decrements the remaining quantity
- **Refill Alert Threshold: 7 or less remaining**

#### 2. **Refill Alerts Dashboard**
**Location:** Main Dashboard → "Refill Alerts" section (orange warning icon)

**Shows:**
- Medications with ≤7 units remaining
- Current remaining quantity
- "Refill" button for each medication

**Example:**
```
⚠️ Aspirin
   25 tablet(s) remaining
   [Refill Button]
```

#### 3. **How to Refill a Medication**

**Method 1: Dashboard Refill Button**
1. Go to Dashboard
2. Find medication in "Refill Alerts" section
3. Click **"Refill"** button
4. System automatically:
   - Adds the `total_quantity` to `remaining_quantity`
   - Increments `refill_count` by 1
   - Example: Had 5 left, total was 30 → Now have 35

**Method 2: Update Quantity Manually**
1. Go to Medications page
2. Click "View" on the medication
3. Adjust quantity manually (if your app has this feature)

**Method 3: AI Chatbot**
```
"Which medications need refilling?"
"What's running low?"
"Refill alerts"
```

#### 4. **Refill Logic**
```javascript
// When you click "Refill" button:
remaining_quantity = current_remaining + total_quantity
refill_count = refill_count + 1

// Example:
// Before: remaining_quantity = 5, total_quantity = 30
// After:  remaining_quantity = 35, refill_count = 1
```

---

## 📱 SMS Notifications Setup & Troubleshooting

### Why SMS Might Not Be Working

#### ❌ Common Issues:

**1. Twilio Not Configured**
Your `.env` file needs these values:
```env
TWILIO_ACCOUNT_SID=AC...your_sid...
TWILIO_AUTH_TOKEN=...your_token...
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio number
USER_PHONE_NUMBER=+1234567890    # Your personal phone
```

**2. Missing USER_PHONE_NUMBER**
The system sends SMS to `USER_PHONE_NUMBER` from your `.env` file.
- Check if it's set correctly
- Must include country code: `+91` for India, `+1` for US

**3. Twilio Trial Account Limitations**
If using Twilio free trial:
- ✅ Can ONLY send to **verified numbers**
- ❌ Cannot send to random numbers
- Must verify your phone number in Twilio Console first

**4. No Active Schedules**
SMS only sends when:
- You have a schedule for today
- Current time matches the schedule time exactly
- Schedule status is "pending"

---

### 🔧 How to Fix SMS Issues

#### **Step 1: Verify Twilio Configuration**

1. **Check Server Logs**
   Look for this on server startup:
   ```
   ✅ Twilio SMS enabled
   ```
   
   If you see this instead:
   ```
   ⚠️ Twilio not configured. SMS notifications disabled.
   ```
   Then Twilio credentials are missing!

2. **Get Twilio Credentials**
   - Go to: https://www.twilio.com/console
   - Find: Account SID, Auth Token, Phone Number
   - Copy to `.env` file

#### **Step 2: Verify Phone Number**

**If using Twilio Trial (Free):**
1. Go to: https://www.twilio.com/console/phone-numbers/verified
2. Click "Verify a Number"
3. Enter YOUR phone number (the one you want to receive SMS)
4. Enter verification code sent to your phone
5. Update `.env`:
   ```env
   USER_PHONE_NUMBER=+919876543210  # Your verified number
   ```

**If using Twilio Paid:**
- No verification needed
- Can send to any number

#### **Step 3: Test SMS Manually**

Create a test schedule:
1. Add a medication (if not already added)
2. Create a schedule for **2 minutes from now**
3. Wait for the time
4. Check server logs for:
   ```
   ✅ SENDING NOTIFICATION for Aspirin!
   📱 SMS sent to +919876543210
   ```

#### **Step 4: Check Server Logs**

Look for these indicators:

**✅ Good Signs:**
```
⏰ Checking schedules at 08:00...
📋 Found 1 schedules for today
   - Aspirin at 08:00 (status: pending)
   ✅ SENDING NOTIFICATION for Aspirin!
   📱 SMS sent to +919876543210
✅ Sent 1 notification(s)
```

**❌ Problem Signs:**
```
⚠️ Twilio not configured. SMS notifications disabled.
```
→ Fix: Add Twilio credentials to `.env`

```
📋 Found 0 schedules for today
```
→ Fix: Create a schedule first

```
Error sending SMS: 21608 - Unverified number
```
→ Fix: Verify your phone number in Twilio Console

---

### 📝 Step-by-Step SMS Setup

#### **1. Get Twilio Account**
```
1. Go to: https://www.twilio.com/try-twilio
2. Sign up (FREE $15.50 credit)
3. Verify your email
4. Get a free phone number
```

#### **2. Get Credentials**
```
1. Go to: https://www.twilio.com/console
2. Copy:
   - Account SID
   - Auth Token
3. Go to: Phone Numbers
4. Copy: Your Twilio Phone Number (+1...)
```

#### **3. Update .env File**
```env
TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcd
TWILIO_AUTH_TOKEN=your_auth_token_here_32_chars
TWILIO_PHONE_NUMBER=+15551234567
USER_PHONE_NUMBER=+919876543210  # YOUR phone number
```

#### **4. Verify Your Phone (Trial Only)**
```
1. Go to: https://www.twilio.com/console/phone-numbers/verified
2. Click: "+ Verify a Number"
3. Enter: +919876543210 (your number)
4. Enter: Verification code sent via SMS
5. Done!
```

#### **5. Restart Server**
```bash
npm start
```

Look for:
```
✅ Twilio SMS enabled
```

#### **6. Create a Test Schedule**
```
1. Add medication: "Aspirin 500mg"
2. Schedule it for: 2 minutes from current time
3. Wait...
4. You should receive SMS!
```

---

### 🔍 Debugging SMS Issues

#### **Check 1: Environment Variables**
```bash
# In your terminal:
cd /Users/christina/Desktop/medication-manager
cat .env | grep TWILIO
cat .env | grep USER_PHONE
```

Should show:
```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
USER_PHONE_NUMBER=+91...
```

#### **Check 2: Server Startup**
When you run `npm start`, you should see:
```
✅ Twilio SMS enabled
```

If not, Twilio credentials are wrong/missing.

#### **Check 3: Test Direct SMS**
You can test SMS sending directly via API:
```bash
curl -X POST http://localhost:8080/api/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "message": "Test message from medication manager"
  }'
```

#### **Check 4: Twilio Console Logs**
- Go to: https://www.twilio.com/console/sms/logs
- Check if any messages were attempted
- See error codes if failed

---

## 🎯 Quick Reference

### Refill System
| Feature | Description |
|---------|-------------|
| **Alert Threshold** | ≤7 units remaining |
| **Refill Amount** | Adds `total_quantity` to remaining |
| **Refill Counter** | Tracks number of refills |
| **Location** | Dashboard → Refill Alerts (orange) |

### SMS Notifications
| Requirement | Value |
|-------------|-------|
| **Service** | Twilio (free trial: $15.50 credit) |
| **Trial Limitation** | Only sends to verified numbers |
| **Sends When** | Schedule time matches current time |
| **Check Frequency** | Every minute |
| **Message Format** | "💊 Medication Reminder: Time to take [Name] ([Dosage])" |

---

## 💡 Pro Tips

1. **Keep Quantities Updated**
   - Mark doses as "taken" to track remaining quantity
   - System will auto-alert when low

2. **Set Realistic Totals**
   - If your prescription is 30 tablets, set total_quantity=30
   - When you refill in real life, click the Refill button

3. **Test SMS First**
   - Create a test schedule 2 min ahead
   - Verify SMS works before relying on it

4. **Check Logs**
   - Server logs show all SMS attempts
   - Use for debugging

5. **Upgrade Twilio**
   - Free trial: Only verified numbers
   - Paid ($20): Any number, more features

---

## 📞 Still Not Working?

**Check these in order:**

1. ✅ Twilio credentials in `.env`?
2. ✅ `USER_PHONE_NUMBER` set correctly with country code?
3. ✅ Phone number verified in Twilio Console (if trial)?
4. ✅ Server shows "Twilio SMS enabled"?
5. ✅ Created a schedule for testing?
6. ✅ Schedule time matches current time?
7. ✅ Server logs show "SENDING NOTIFICATION"?
8. ✅ Server logs show "SMS sent to..."?

If all ✅ but still no SMS → Check Twilio Console Logs for error codes.

---

**Last Updated:** October 17, 2025
