# 🚀 Render Deployment Configuration

## render.yaml - For Proper Deployment

Create a `render.yaml` file in your project root:

```yaml
services:
  - type: web
    name: medication-manager
    env: node
    buildCommand: npm install
    startCommand: npm start
    autoDeploy: true
    healthCheckPath: /
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        generateValue: true
```

## Environment Variables for Render

In your Render dashboard, set these environment variables:

### Required:
```
NODE_ENV=production
PORT=10000  # Render assigns this automatically
```

### Database (Choose one):

**Option A: Supabase (Recommended)**
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

**Option B: JSON (Temporary)**
```
# No additional env vars needed
```

### Optional Features:

**AI Chatbot (Groq):**
```
GROQ_API_KEY=your_groq_api_key
```

**SMS Notifications:**
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number
```

## File Structure for Deployment

```
/ (project root)
├── server/
│   ├── enhanced-server.js    ✅ Main server
│   ├── database.js          ✅ JSON database
│   └── supabase-db.js       ✅ Supabase database
├── public/
│   ├── index.html           ✅ Frontend
│   ├── app.js              ✅ Frontend logic
│   ├── chatbot-groq.js     ✅ AI chatbot
│   ├── service-worker.js   ✅ PWA
│   └── manifest.json       ✅ PWA manifest
├── package.json            ✅ Dependencies
└── render.yaml            ✅ Deployment config (create this)
```

## Deployment Steps

### 1. Create render.yaml
Add the YAML config above to your project root.

### 2. Set Environment Variables
In Render dashboard:
- Go to your service
- Click "Environment"
- Add the variables listed above

### 3. Deploy
- Commit and push to GitHub
- Render will auto-deploy

## Common Deployment Issues & Fixes

### Issue 1: "Application failed to respond"
**Solution:** Check logs for port binding issues
- Ensure `PORT` env var is set
- Server should bind to `process.env.PORT`

### Issue 2: "Build failed"
**Solution:** Check dependencies
```bash
npm install
```

### Issue 3: "Module not found"
**Solution:** Add to package.json dependencies
- Check server imports match installed packages

### Issue 4: Database connection fails
**Solution:** Verify environment variables
- Supabase URL and key must be correct
- Test connection locally first

## Production Optimizations

### 1. Remove Development Dependencies
```json
{
  "dependencies": {
    // Keep only runtime dependencies
  }
}
```

### 2. Add Health Check
```javascript
// Add to server
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### 3. Error Handling
```javascript
// Add to server
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
```

## Testing Deployment

### 1. Local Test
```bash
PORT=10000 npm start
```

### 2. Check Endpoints
```bash
curl http://localhost:10000/api/medications
curl http://localhost:10000/health
```

### 3. Verify Frontend
- Open http://localhost:10000
- Check console for errors
- Verify chatbot button appears

## Troubleshooting Render Issues

### Check Render Logs:
1. Go to your Render service dashboard
2. Click "Logs" tab
3. Look for error messages

### Common Render-Specific Issues:

**1. Port Issues:**
```
Error: listen EADDRINUSE: address already in use :::10000
```
**Fix:** Ensure only one process binds to PORT

**2. Module Resolution:**
```
Error: Cannot find module 'groq-sdk'
```
**Fix:** Run `npm install` in Render

**3. Environment Variables:**
```
ReferenceError: process.env.SUPABASE_URL is not defined
```
**Fix:** Set env vars in Render dashboard

## Quick Deployment Test

After deployment, test these endpoints:

```bash
# Health check
curl https://your-app.render.com/health

# API test
curl https://your-app.render.com/api/medications

# Frontend test
curl https://your-app.render.com/ | grep -q "Medication Manager"
```

## Next Steps

1. **Create render.yaml** in project root
2. **Set environment variables** in Render dashboard
3. **Deploy** - Render will auto-deploy on push
4. **Test** all endpoints and frontend functionality
5. **Monitor logs** for any runtime issues

---

**With these fixes, your app should deploy successfully on Render! 🎉**
