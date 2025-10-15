# 🚀 Quick Start Guide

## ✨ What You Have

A complete **AI-powered medication manager** that:
- ✅ Works on desktop and mobile
- ✅ Can be installed as a mobile app (PWA)
- ✅ Has AI assistant for easy medication tracking
- ✅ Sends real-time notifications
- ✅ Stores data in the cloud (Supabase)
- ✅ Works offline after first visit

---

## 🏃 Run Locally (Development)

### 1. Install Dependencies
```bash
cd /Users/christina/Desktop/medication-manager
npm install
```

### 2. Setup Environment
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials
nano .env
```

### 3. Start Server
```bash
npm start
```

### 4. Open in Browser
```
http://localhost:8080
```

**That's it!** ✅

---

## 🌐 Deploy Online (Production)

### Use Render (FREE & Recommended)

**1. Push to GitHub:**
```bash
git init
git add .
git commit -m "Medication Manager"
git remote add origin https://github.com/YOUR_USERNAME/medication-manager.git
git push -u origin main
```

**2. Deploy on Render:**
1. Go to https://render.com
2. Sign up (free)
3. New + → Web Service
4. Connect GitHub repo
5. Settings:
   - Environment: `Node`
   - Build: `npm install`
   - Start: `npm start`
   - Plan: Free
6. Add environment variables from `.env`
7. Deploy!

**3. Get Your URL:**
```
https://medication-manager.onrender.com
```

**See DEPLOYMENT.md for detailed steps!**

---

## 📱 Install on Mobile

### After deploying:

**Android:**
1. Open Chrome
2. Go to your deployed URL
3. Tap "Install" when prompted
4. App appears on home screen!

**iPhone:**
1. Open Safari
2. Go to your deployed URL
3. Share → "Add to Home Screen"
4. App appears on home screen!

**See MOBILE-APP-GUIDE.md for details!**

---

## 🤖 Using the AI Assistant

### Find the 💬 button (bottom-right corner)

**Add Medications:**
```
"Add aspirin 500mg tablet"
"Add metformin 850mg tablet for diabetes"
```

**Create Schedules:**
```
"Schedule aspirin at 10:00 daily"
"Schedule metformin at 08:00 daily"
```

**AI automatically:**
- Switches to correct tab
- Opens the form
- Fills all fields
- You just click "Add"!

---

## 📚 Documentation Files

### Essential Guides:
- **README.md** - Main documentation
- **DEPLOYMENT.md** - How to deploy online
- **MOBILE-APP-GUIDE.md** - Mobile installation
- **STEP-BY-STEP-SETUP.md** - Detailed setup
- **FREE-SERVICES-SETUP.md** - Free Supabase account

### This File:
- **QUICK-START.md** - You are here!

---

## ⚡ Quick Commands

### Development:
```bash
npm install          # Install dependencies
npm start           # Start server
```

### Deployment:
```bash
git add .
git commit -m "Update"
git push            # Auto-deploys on Render
```

---

## 🎯 Common Tasks

### Add Medication (AI):
1. Click 💬
2. Type: "Add aspirin 500mg tablet"
3. Click "Add Medication"

### Create Schedule (AI):
1. Click 💬
2. Type: "Schedule aspirin at 10:00 daily"
3. Click "Add Schedule"

### Test Notifications:
1. Create schedule for 2 minutes from now
2. Wait for notification
3. Desktop notification appears!

---

## 🆘 Troubleshooting

### AI Button Not Visible?
- Hard refresh: `Ctrl + Shift + R`
- Check console (F12) for errors

### Deployment Failed?
- Check environment variables are set
- Make sure using Render (not Netlify!)
- See DEPLOYMENT.md

### Mobile Install Not Working?
- Must deploy first (can't install from localhost)
- Android: Use Chrome
- iPhone: Use Safari
- See MOBILE-APP-GUIDE.md

---

## ✅ Checklist

### Local Development:
- [ ] Install dependencies (`npm install`)
- [ ] Setup `.env` file
- [ ] Start server (`npm start`)
- [ ] Test at localhost:8080

### Deployment:
- [ ] Push to GitHub
- [ ] Deploy on Render
- [ ] Add environment variables
- [ ] Test deployed URL

### Mobile:
- [ ] Open deployed URL on phone
- [ ] Install as app
- [ ] Test all features

---

## 🎉 You're Ready!

Your medication manager is:
- ✅ Fully functional
- ✅ AI-powered
- ✅ Mobile-ready
- ✅ Cloud-connected
- ✅ Ready to deploy!

**Start using it now or deploy to share with others!** 🚀

---

**Need more help? Check the other documentation files!**
