# 🤖 AI Chatbot Troubleshooting Guide

## Issue: AI Chatbot Not Visible

If you cannot see the purple AI button on your screen, follow these steps:

## Quick Fix Steps

### 1. Hard Refresh the Page
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### 2. Clear Browser Cache
1. Open browser settings
2. Clear cache and cookies
3. Restart browser
4. Visit the app again

### 3. Check Browser Console
1. Press F12 (or right-click → Inspect)
2. Go to "Console" tab
3. Look for these messages:
   - ✅ `🤖 Chatbot script loaded`
   - ✅ `🤖 Initializing chatbot...`
   - ✅ `✅ Chatbot UI created`
   - ✅ `✅ Chatbot event listeners attached`

### 4. Verify Files Are Loaded
In browser console, check:
```javascript
// Type this in console:
window.medicationChatbot
// Should show: MedicationChatbotGroq {isOpen: false, ...}
```

### 5. Check Network Tab
1. Open DevTools (F12)
2. Go to "Network" tab
3. Refresh page
4. Look for `chatbot-groq.js` - should be status 200 (green)

## Common Issues & Solutions

### Issue 1: Script Not Loading
**Symptoms:** No chatbot messages in console

**Solution:**
1. Check if `public/chatbot-groq.js` exists
2. Restart the server: `npm start`
3. Hard refresh browser

### Issue 2: Button Hidden Behind Content
**Symptoms:** Button exists but not visible

**Solution:**
1. Open browser console
2. Type: `document.getElementById('chatbot-toggle').style.zIndex = '9999'`
3. If button appears, there's a z-index conflict

### Issue 3: JavaScript Error
**Symptoms:** Red errors in console

**Solution:**
1. Check console for specific error
2. Common errors:
   - `Cannot read property...` - Script loading order issue
   - `fetch is not defined` - Browser compatibility
   - `Unexpected token` - Syntax error in file

### Issue 4: Mobile-Specific Issue
**Symptoms:** Works on desktop but not mobile

**Solution:**
1. Check if viewport meta tag is present
2. Test in mobile browser's desktop mode
3. Clear mobile browser cache
4. Try different mobile browser

## Manual Verification

### Step 1: Check HTML
Open `public/index.html` and verify these lines exist near the end:
```html
<script src="app.js"></script>
<script src="chatbot-groq.js"></script>
```

### Step 2: Check File Exists
```bash
ls -la public/chatbot-groq.js
# Should show the file with size > 0
```

### Step 3: Test Chatbot Manually
Open browser console and type:
```javascript
// Create chatbot manually
const testBot = new MedicationChatbotGroq();
// Should create the button
```

## Force Chatbot to Appear

If nothing else works, add this to browser console:
```javascript
// Emergency chatbot creation
const chatbotHTML = `
  <button id="chatbot-toggle" style="position: fixed; bottom: 20px; right: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); z-index: 9999; border: none; cursor: pointer; font-size: 24px;">
    💬
    <span style="position: absolute; top: -5px; right: -5px; background: red; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: bold;">AI</span>
  </button>
`;
document.body.insertAdjacentHTML('beforeend', chatbotHTML);
document.getElementById('chatbot-toggle').onclick = () => alert('Chatbot button works! Now fix the script loading.');
```

## Server-Side Check

### Verify Server is Serving Files
```bash
# Start server
npm start

# In another terminal, test file access
curl http://localhost:8080/chatbot-groq.js
# Should return JavaScript code
```

### Check Server Logs
Look for:
```
✅ Groq AI enabled
🏥 Medication Manager Server running at http://localhost:8080
```

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Not Supported
- ❌ Internet Explorer
- ❌ Very old mobile browsers

## Testing Checklist

- [ ] Server is running (`npm start`)
- [ ] No errors in terminal
- [ ] Browser console shows chatbot messages
- [ ] `chatbot-groq.js` loads (Network tab)
- [ ] No JavaScript errors (Console tab)
- [ ] Hard refresh performed
- [ ] Cache cleared
- [ ] Tested in different browser
- [ ] Tested on different device

## Still Not Working?

### Option 1: Reinstall Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

### Option 2: Check Git Status
```bash
git status
# Make sure chatbot-groq.js is committed
git log --oneline -1
# Should show recent commit with chatbot
```

### Option 3: Re-download Chatbot File
The chatbot file should be in: `public/chatbot-groq.js`
Size: ~13KB
Lines: ~426

### Option 4: Use Browser DevTools Device Mode
1. Open DevTools (F12)
2. Click device icon (Ctrl+Shift+M)
3. Select "iPhone 12 Pro"
4. Refresh page
5. Look for purple button in bottom-right

## Success Indicators

When working correctly, you should see:

### On Desktop:
- Purple gradient button in bottom-right corner
- "AI" badge on button
- Button has hover effect (scales up)
- Clicking opens sidebar from right

### On Mobile:
- Purple button visible (not hidden)
- Button easy to tap (not too small)
- Clicking opens full-screen chatbot
- Can type and send messages

### In Console:
```
🤖 Chatbot script loaded
🤖 Initializing chatbot...
✅ Chatbot UI created
✅ Chatbot event listeners attached
```

## Contact Support

If still not working after all steps:

1. **Take Screenshots:**
   - Browser console (F12 → Console)
   - Network tab showing loaded files
   - The page where button should be

2. **Provide Information:**
   - Browser name and version
   - Device type (desktop/mobile)
   - Operating system
   - Error messages from console

3. **Check GitHub Issues:**
   - Look for similar issues
   - Create new issue with details

## Quick Test Command

Run this in browser console to test everything:
```javascript
console.log('=== CHATBOT DEBUG ===');
console.log('1. Script loaded:', typeof MedicationChatbotGroq !== 'undefined');
console.log('2. Instance exists:', typeof window.medicationChatbot !== 'undefined');
console.log('3. Button exists:', document.getElementById('chatbot-toggle') !== null);
console.log('4. Button visible:', document.getElementById('chatbot-toggle')?.offsetParent !== null);
console.log('5. API Base:', typeof API_BASE !== 'undefined' ? API_BASE : 'NOT DEFINED');
console.log('====================');
```

Expected output:
```
=== CHATBOT DEBUG ===
1. Script loaded: true
2. Instance exists: true
3. Button exists: true
4. Button visible: true
5. API Base: http://localhost:8080/api
====================
```

---

**The chatbot WILL work - just need to find which step fixes it! 🤖✨**
