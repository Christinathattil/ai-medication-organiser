# 🚀 Render Deployment Debugging Guide

## Current Status
Your chatbot code is syntactically correct and should work. The issue is likely deployment-related.

## Step 1: Verify Local Development (First)

1. **Start your local server:**
   ```bash
   npm start
   ```

2. **Open browser console** (F12)

3. **Check these messages:**
   ```
   ✅ MedicationChatbotGroq class found
   🤖 Groq-powered Chatbot initialized
   ✅ Chatbot UI created and attached
   ```

4. **Verify button appears:**
   - Purple button in bottom-right corner
   - "AI" badge visible
   - Button clickable

## Step 2: Deployment Issues & Fixes

### Issue A: Service Worker Caching Old Version

**Symptoms:** Class not found, old errors persist

**Fix:**
```javascript
// Run in browser console on deployed site:
navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()));
caches.keys().then(n => n.forEach(name => caches.delete(name)));
setTimeout(() => location.reload(true), 2000);
```

### Issue B: Build/Dependency Problems

**Check Render Logs:**
1. Go to your Render service dashboard
2. Click "Logs" tab
3. Look for:
   - `npm install` success
   - Module loading errors
   - Port binding issues

**Common Fixes:**
- Ensure all dependencies in `package.json`
- Check for native module issues
- Verify Node.js version compatibility

### Issue C: Environment Variables

**Required for Render:**
```
NODE_ENV=production
PORT=10000  # Render assigns this
```

**Optional:**
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GROQ_API_KEY=your_groq_key
```

## Step 3: Manual Debugging Commands

### For Your Deployed Site:

**1. Check if script loads:**
```javascript
// In browser console on deployed site:
fetch('/chatbot-groq.js').then(r => r.text()).then(t => {
  console.log('Script content length:', t.length);
  console.log('Contains MedicationChatbotGroq:', t.includes('MedicationChatbotGroq'));
});
```

**2. Check API_BASE variable:**
```javascript
console.log('API_BASE:', typeof API_BASE !== 'undefined' ? API_BASE : 'NOT DEFINED');
```

**3. Force reload script:**
```javascript
const script = document.createElement('script');
script.src = '/chatbot-groq.js?v=' + Date.now();
script.onload = () => {
  console.log('✅ Script loaded manually');
  if (typeof MedicationChatbotGroq !== 'undefined') {
    window.medicationChatbot = new MedicationChatbotGroq();
    console.log('✅ Chatbot created');
  } else {
    console.error('❌ Class still not found');
  }
};
script.onerror = () => console.error('❌ Script load failed');
document.head.appendChild(script);
```

## Step 4: Render-Specific Configuration

### Update render.yaml (if needed):

```yaml
services:
  - type: web
    name: medication-manager
    env: node
    buildCommand: npm ci --production  # Faster than npm install
    startCommand: npm start
    autoDeploy: true
    healthCheckPath: /health
    diskSizeGB: 1
    envVars:
      - key: NODE_ENV
        value: production
```

### Add to your server for better debugging:

```javascript
// Add this to your server for debugging
app.get('/debug', (req, res) => {
  res.json({
    chatbot_file_exists: require('fs').existsSync('./public/chatbot-groq.js'),
    chatbot_file_size: require('fs').statSync('./public/chatbot-groq.js')?.size,
    api_base: API_BASE,
    environment: process.env.NODE_ENV,
    port: process.env.PORT
  });
});
```

## Step 5: Testing Your Deployment

### 1. Health Check:
```bash
curl https://your-app.render.com/health
```

### 2. API Test:
```bash
curl https://your-app.render.com/api/medications
```

### 3. Script Loading:
```bash
curl -I https://your-app.render.com/chatbot-groq.js
```

### 4. Frontend Test:
```bash
curl https://your-app.render.com/ | grep -q "Medication Manager"
echo "✅ Frontend loads"
```

## Step 6: Common Deployment Fixes

### Fix A: Clear All Caches
```javascript
// Complete cache clear
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});

caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});

localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

### Fix B: Disable Service Worker Temporarily
Comment out service worker registration in `index.html`:
```javascript
// Temporarily disable:
// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.register('/service-worker.js')
// }
```

### Fix C: Check File Permissions
Ensure all files have correct permissions:
```bash
chmod 644 public/chatbot-groq.js
chmod 755 server/
```

## Step 7: Emergency Fallback Test

If nothing works, add this to your `index.html` temporarily:

```html
<script>
  // Emergency chatbot creation
  setTimeout(() => {
    if (typeof MedicationChatbotGroq === 'undefined') {
      console.error('🚨 CHATBOT CLASS NOT FOUND');
      alert('Chatbot not loading. Check console for errors.');
    } else {
      console.log('✅ Chatbot class available');
      if (!window.medicationChatbot) {
        window.medicationChatbot = new MedicationChatbotGroq();
      }
    }
  }, 3000);
</script>
```

## Quick Test Commands

**Copy and run in browser console:**

```javascript
// 1. Check class
console.log('Class:', typeof MedicationChatbotGroq);

// 2. Check instance
console.log('Instance:', window.medicationChatbot);

// 3. Check button
console.log('Button:', document.getElementById('chatbot-toggle'));

// 4. Force create if needed
if (typeof MedicationChatbotGroq !== 'undefined' && !window.medicationChatbot) {
  window.medicationChatbot = new MedicationChatbotGroq();
  console.log('✅ Created manually');
}
```

## Expected Working State

When working correctly, you should see:
```
✅ MedicationChatbotGroq class found
🤖 Groq-powered Chatbot initialized
✅ Chatbot UI created and attached
✅ Chatbot button already exists
🖱️ Chatbot button clicked
✅ Using existing chatbot instance
```

---

**Try the debugging commands above and let me know what errors you see! 🚀**
