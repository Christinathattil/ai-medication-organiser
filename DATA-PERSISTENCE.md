# Data Persistence & Safety Guide

## 🔒 Your Data is Safe!

All user data is stored persistently and **will NOT be deleted automatically** unless you explicitly choose to delete it.

---

## 📊 What Data is Stored

### 1. **User Data** (Supabase PostgreSQL)
- ✅ User accounts and profiles
- ✅ Medications
- ✅ Schedules
- ✅ Medication logs
- ✅ SMS reminders
- ✅ Refill history

**Storage:** Supabase PostgreSQL database  
**Persistence:** Permanent until manually deleted  
**Backup:** Automatic Supabase backups  

### 2. **Session Data** (PostgreSQL Session Store)
- ✅ User login sessions
- ✅ Authentication state
- ✅ Session cookies

**Storage:** PostgreSQL `session` table (auto-created)  
**Persistence:** 30 days (cookie expiry)  
**Auto-cleanup:** Only expired sessions (> 30 days)

### 3. **Uploaded Photos**
- ✅ Prescription images

**Storage:** `/uploads` directory  
**Persistence:** Permanent until manually deleted  

---

## ✅ Data Persistence Features

### **PostgreSQL Session Store (Production-Ready)**

**Before (MemoryStore):**
```
❌ Sessions reset on server restart
❌ Users logged out when redeploying
❌ Not suitable for production
⚠️  Memory leaks with multiple users
```

**After (PostgreSQL Store):**
```
✅ Sessions persist across server restarts
✅ Users stay logged in after redeployment
✅ Production-ready and scalable
✅ Automatic cleanup of expired sessions only
✅ No memory leaks
```

### **Configuration**

**File:** `server/enhanced-server.js`

```javascript
// PostgreSQL session store
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool: pgPool,
    tableName: 'session',
    createTableIfMissing: true,        // Auto-creates table
    pruneSessionInterval: 60 * 15,     // Cleans expired sessions every 15 min
  }),
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000   // 30 days
  }
}));
```

**What gets cleaned up:**
- ✅ Only sessions older than 30 days
- ✅ Only expired/invalid sessions

**What NEVER gets deleted:**
- ✅ User medications
- ✅ Schedules
- ✅ Medication logs
- ✅ Active sessions
- ✅ Uploaded photos

---

## 🛡️ Data Safety Guarantees

### **1. No Automatic Data Loss**
- Medications are **never** automatically deleted
- Schedules are **never** automatically deleted
- Logs are **never** automatically deleted
- Photos are **never** automatically deleted

### **2. Manual Deletion Only**
- Users can delete their own data via the UI
- Database admin can run SQL scripts (e.g., `clear-all-data.sql`)
- No scheduled jobs delete user data

### **3. Session Expiry** (NOT Data Deletion)
- Sessions expire after 30 days of inactivity
- User just needs to log in again
- All their data remains intact

### **4. Row-Level Security (RLS)**
- Users can only access their own data
- Database-level isolation
- Protection against unauthorized access

---

## 🗄️ Database Tables

### **Application Tables** (Never Auto-Deleted)
```sql
users                  -- User accounts
medications            -- User medications
schedules              -- Medication schedules
medication_logs        -- Intake history
sms_reminders          -- SMS tracking
```

### **Session Table** (Auto-Cleanup of Expired Only)
```sql
session                -- User sessions
  - sid                -- Session ID
  - sess               -- Session data
  - expire             -- Expiration timestamp
```

**Cleanup Logic:**
- Runs every 15 minutes
- Only deletes sessions where `expire < NOW()`
- Active sessions are **never** touched

---

## 🔧 Setup for Data Persistence

### **1. Add DATABASE_URL to .env**

```bash
DATABASE_URL=postgresql://postgres.[project]:[password]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

**Get it from:**
1. Go to Supabase Dashboard
2. Settings → Database
3. Copy "Connection string" (URI format)

### **2. Session Table Creation**

The `session` table is **automatically created** on first run:

```sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" 
  PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" 
  ON "session" ("expire");
```

**No manual setup needed!** ✅

---

## 📝 Startup Messages

### **Successful Connection:**
```
✅ PostgreSQL session store connected - sessions persist across restarts
✅ User data is safe and will NOT be deleted automatically
```

### **Connection Failed (Fallback):**
```
❌ Database connection failed: [error message]
⚠️  Falling back to memory sessions (data will be lost on restart)
```

**Fix:** Check your `DATABASE_URL` in `.env`

---

## 🔄 Session Lifecycle

### **1. User Logs In**
```
1. User authenticates with Google OAuth
2. Session created in PostgreSQL
3. Session ID stored in cookie (30-day expiry)
4. User stays logged in
```

### **2. Server Restarts**
```
1. Server restarts/redeploys
2. User opens app
3. Cookie still valid → loads session from PostgreSQL
4. User still logged in! ✅
```

### **3. Session Expires (After 30 Days)**
```
1. 30 days of inactivity pass
2. Session marked as expired
3. Cleanup job removes expired session
4. User needs to log in again
5. All their data still intact! ✅
```

### **4. User Logs Out**
```
1. User clicks logout
2. Session destroyed in PostgreSQL
3. Cookie cleared
4. All their data remains in database ✅
```

---

## 🧪 Testing Data Persistence

### **Test 1: Server Restart**
```bash
# 1. Start server
npm start

# 2. Log in to app
# 3. Add some medications
# 4. Restart server (Ctrl+C then npm start again)
# 5. Open app → Still logged in ✅
# 6. Medications still there ✅
```

### **Test 2: Data Safety**
```bash
# 1. Add medications, schedules, logs
# 2. Wait 1 day
# 3. Check database → All data still there ✅
# 4. Wait 30 days
# 5. Session expires, need to login
# 6. After login → All data still there ✅
```

### **Test 3: Session Cleanup**
```bash
# Check sessions before cleanup
SELECT COUNT(*) FROM session;

# Wait 15 minutes (or force cleanup)
# Expired sessions removed, active ones kept

# Check again
SELECT COUNT(*) FROM session WHERE expire > NOW();
# Should show only active sessions ✅
```

---

## 🗑️ Manual Data Deletion

### **Option 1: Via UI**
- Go to Medications tab → Delete button
- Go to Schedules tab → Delete button
- Individual item deletion only

### **Option 2: Clear All Data (Admin Only)**

**File:** `database/clear-all-data.sql`

```sql
-- ⚠️ WARNING: This deletes ALL user data
DELETE FROM sms_reminders;
DELETE FROM medication_logs;
DELETE FROM schedules;
DELETE FROM medications;
DELETE FROM users;
```

**Run in Supabase SQL Editor:** Only when you explicitly want to clear everything.

### **Option 3: Clear Expired Sessions Only**
```sql
-- Safe - only removes expired sessions
DELETE FROM session WHERE expire < NOW();
```

---

## 📊 Data Retention Summary

| Data Type | Storage | Retention | Auto-Delete? |
|-----------|---------|-----------|--------------|
| **Medications** | Supabase | Forever | ❌ Never |
| **Schedules** | Supabase | Forever | ❌ Never |
| **Logs** | Supabase | Forever | ❌ Never |
| **Users** | Supabase | Forever | ❌ Never |
| **Photos** | File system | Forever | ❌ Never |
| **Active Sessions** | PostgreSQL | 30 days | ❌ Never |
| **Expired Sessions** | PostgreSQL | N/A | ✅ Yes (cleanup) |

---

## 🎯 Key Takeaways

### **✅ Your Data is Protected**
1. All user data stored permanently in Supabase
2. Sessions stored in PostgreSQL (persist across restarts)
3. Only expired sessions (>30 days) are cleaned up
4. Manual deletion is the only way to remove data

### **✅ Production Ready**
1. No memory leaks from MemoryStore
2. Scales to thousands of users
3. Sessions survive deployments
4. Database-backed reliability

### **✅ Zero Data Loss**
1. Server restarts → Data safe
2. Deployments → Data safe
3. Session expiry → Data safe (just re-login)
4. Power outage → Data safe (PostgreSQL)

---

## 🆘 Troubleshooting

### **Issue: Sessions reset on restart**
**Cause:** `DATABASE_URL` not configured  
**Fix:** Add `DATABASE_URL` to `.env` file

### **Issue: "Database connection failed"**
**Cause:** Invalid `DATABASE_URL` or network issue  
**Fix:** 
1. Check Supabase connection string
2. Verify password and project ID
3. Test connection in Supabase dashboard

### **Issue: Session table not created**
**Cause:** Database permissions  
**Fix:** Ensure user has CREATE TABLE permission

---

## 📚 Related Documentation

- **SECURITY-GUIDE.md** - Security features and RLS
- **GOOGLE-AUTH-SETUP.md** - Authentication setup
- **database/clear-all-data.sql** - Manual data cleanup script
- **database/users-auth-migration.sql** - Initial database setup

---

**Your medication manager is now production-ready with full data persistence!** 🎉

No automatic data deletion. Ever. Your data is safe. ✅
