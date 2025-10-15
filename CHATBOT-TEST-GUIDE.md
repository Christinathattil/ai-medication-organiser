# 🤖 AI Chatbot Test Guide

## Step 1: Verify Chatbot Appears

### What to Look For:
- **Purple gradient button** in bottom-right corner
- **"AI" badge** on the button (red circle with white text)
- Button should be **visible immediately** when page loads

### If Button Not Visible:

1. **Open Browser Console** (F12 or Right-click → Inspect → Console tab)

2. **Look for these messages:**
   ```
   🤖 Chatbot script loaded
   🔧 Initializing chatbot...
   📍 Document ready state: complete
   ✅ DOM ready, creating UI now...
   🎨 Creating chatbot UI...
   ✅ Chatbot HTML inserted into DOM
   ✅ Chatbot button found in DOM
   📍 Button position: DOMRect {...}
   ✅ Chatbot UI created and attached
   ✅ Chatbot event listeners attached
   ```

3. **If you see errors instead:**
   - Take a screenshot of the console
   - Note the exact error message
   - Try the fixes below

### Quick Fixes:

**Fix 1: Hard Refresh**
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

**Fix 2: Clear Cache**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Fix 3: Force Button Creation**
Open console and paste:
```javascript
// Check if chatbot exists
console.log('Chatbot instance:', window.medicationChatbot);
console.log('Button element:', document.getElementById('chatbot-toggle'));

// If button doesn't exist, force create
if (!document.getElementById('chatbot-toggle')) {
  if (window.medicationChatbot) {
    window.medicationChatbot.createChatbotUI();
    window.medicationChatbot.attachEventListeners();
  }
}
```

## Step 2: Test Chatbot Opens

1. **Click the purple AI button**
2. **Desktop:** Sidebar should slide in from right
3. **Mobile:** Full-screen chatbot should appear
4. **You should see:**
   - Welcome message from AI
   - Input field at bottom
   - Quick action buttons (📅 Today, ➕ Add, 📊 Stats, 🔔 Refill)
   - Close button (X) in top-right

## Step 3: Test Natural Language Commands

### Test 1: Add Medication
**Type:** `I need to add aspirin 500mg tablet for headaches`

**Expected:**
1. AI responds confirming it understood
2. Switches to "Medications" tab
3. Opens "Add Medication" form
4. Form is pre-filled with:
   - Name: Aspirin
   - Dosage: 500mg
   - Form: tablet
   - Purpose: headaches

### Test 2: Add Another Medication
**Type:** `Add lisinopril 10mg for blood pressure`

**Expected:**
1. AI confirms
2. Opens medication form
3. Pre-fills: Lisinopril, 10mg, blood pressure

### Test 3: Schedule Medication
**Type:** `Schedule aspirin at 8am daily`

**Expected:**
1. AI responds
2. Switches to "Schedules" tab
3. Opens "Add Schedule" form
4. Pre-fills:
   - Medication: Aspirin (if it exists)
   - Time: 08:00
   - Frequency: daily

### Test 4: View Today's Schedule
**Type:** `What's my schedule for today?`

**Expected:**
1. AI shows list of today's medications
2. Shows time, medication name, dosage
3. Shows status (✅ taken, ❌ missed, ⏰ pending)

### Test 5: View Statistics
**Type:** `How am I doing with my medications?`

**Expected:**
1. AI shows adherence statistics
2. Shows percentage for each medication
3. Shows taken vs missed counts

### Test 6: Check Refills
**Type:** `What needs refilling?`

**Expected:**
1. AI shows medications running low
2. Shows remaining quantity
3. Suggests refilling

## Step 4: Test Quick Actions

### Test Quick Action Buttons:

1. **📅 Today** - Should show today's schedule
2. **➕ Add** - Should prompt for medication details
3. **📊 Stats** - Should show adherence statistics
4. **🔔 Refill** - Should show refill alerts

## Step 5: Test Complex Commands

### Test 1: Multiple Details
**Type:** `I take metformin 1000mg tablet twice daily at 8am and 8pm with food`

**Expected:**
- AI understands multiple times
- Extracts: metformin, 1000mg, tablet, twice daily, with food
- May need to create two schedules (8am and 8pm)

### Test 2: Natural Variations
Try these variations:
- `Add my diabetes medication`
- `I need to start taking vitamin D`
- `Schedule my blood pressure pill for morning`
- `What do I need to take today?`
- `Show me my medication stats`

## Step 6: Verify Data Persistence

1. **Add a medication via chatbot**
2. **Go to Medications tab manually**
3. **Verify medication appears in list**
4. **Add a schedule via chatbot**
5. **Go to Schedules tab manually**
6. **Verify schedule appears in list**

## Troubleshooting

### Issue 1: Button Not Appearing

**Check Console:**
```javascript
// Run in console:
console.log('=== CHATBOT DEBUG ===');
console.log('1. Script loaded:', typeof MedicationChatbotGroq !== 'undefined');
console.log('2. Instance exists:', typeof window.medicationChatbot !== 'undefined');
console.log('3. Button exists:', document.getElementById('chatbot-toggle') !== null);
console.log('4. Button visible:', document.getElementById('chatbot-toggle')?.offsetParent !== null);
console.log('====================');
```

**Expected Output:**
```
=== CHATBOT DEBUG ===
1. Script loaded: true
2. Instance exists: true
3. Button exists: true
4. Button visible: true
====================
```

### Issue 2: Chatbot Opens But Doesn't Respond

**Check:**
1. Server is running (`npm start`)
2. No errors in console
3. Network tab shows `/api/chat` request
4. Groq API key is configured in `.env`

**Test API Manually:**
```javascript
// Run in console:
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'test', history: [] })
})
.then(r => r.json())
.then(d => console.log('API Response:', d))
.catch(e => console.error('API Error:', e));
```

### Issue 3: Forms Not Pre-filling

**Check:**
1. Form IDs match: `add-medication-form`, `add-schedule-form`
2. Input names match: `name`, `dosage`, `form`, `purpose`, etc.
3. Console shows no errors when opening forms

### Issue 4: AI Not Understanding Commands

**Check:**
1. Groq API key is configured
2. Server logs show API calls
3. Try simpler commands first
4. Check if fallback mode is active (message about configuring API key)

## Success Criteria

✅ **Chatbot button visible on page load**
✅ **Button clickable and opens chatbot**
✅ **Can type and send messages**
✅ **AI responds to messages**
✅ **Quick actions work**
✅ **Can add medication via natural language**
✅ **Can schedule medication via natural language**
✅ **Forms pre-fill correctly**
✅ **Data saves to database**
✅ **Works on both desktop and mobile**

## Example Conversation Flow

```
You: Hi
AI: 👋 Hello! I'm your AI medication assistant. How can I help you today?

You: I need to add aspirin 500mg for headaches
AI: I'll help you add Aspirin 500mg for headaches. Let me open the form for you...
[Form opens with pre-filled data]

You: Schedule it for 8am daily
AI: I'll help you schedule that. Opening the schedule form...
[Schedule form opens with pre-filled data]

You: What's my schedule for today?
AI: 📅 Today's Schedule (1 medication):
⏰ 08:00 - Aspirin (500mg)

You: Thanks!
AI: You're welcome! Let me know if you need anything else.
```

## Mobile-Specific Testing

### On Mobile Device:

1. **Button should be visible** (bottom-right corner)
2. **Button should be easy to tap** (not too small)
3. **Chatbot opens full-screen** (not sidebar)
4. **Can type in input field**
5. **Keyboard doesn't hide input**
6. **Quick actions are tappable**
7. **Messages are readable** (not too small)
8. **Can scroll chat history**
9. **Close button works**

## Performance Testing

### Check Load Times:
- **Button appears:** < 1 second
- **Chatbot opens:** < 0.5 seconds
- **AI response:** < 2 seconds (with Groq)
- **Form opens:** < 0.5 seconds

### Check Smoothness:
- **Animations are smooth** (no lag)
- **Scrolling is responsive**
- **No freezing or crashes**
- **Memory usage reasonable**

## Final Checklist

- [ ] Chatbot button visible on desktop
- [ ] Chatbot button visible on mobile
- [ ] Can open and close chatbot
- [ ] Can send messages
- [ ] AI responds appropriately
- [ ] Can add medication via chat
- [ ] Can schedule medication via chat
- [ ] Forms pre-fill correctly
- [ ] Data persists after adding
- [ ] Quick actions work
- [ ] No console errors
- [ ] Works in different browsers
- [ ] Works on different devices

---

**If all tests pass, your AI chatbot is working perfectly! 🎉**

**If any tests fail, check the console for errors and refer to the troubleshooting section.**
