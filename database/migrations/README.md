# User Data Isolation - Implementation Guide

## ✅ Code Changes Complete

All application code has been updated to ensure complete data isolation between users.

## 🔧 Database Migration Required

**IMPORTANT**: You must run the SQL migration script in your Supabase dashboard before the application will work correctly with user isolation.

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run the Migration Script

1. Open the file: `database/migrations/002_user_data_isolation.sql`
2. Copy the entire contents of that file
3. Paste it into the Supabase SQL Editor
4. Click "Run" to execute the migration

### What the Migration Does

1. **Adds `user_id` column to `schedules` table**
   - Links schedules directly to users (not just through medications)
   - Populates existing data from medications table
   - Adds NOT NULL constraint and foreign key

2. **Creates `set_current_user_id()` function**
   - Used by app code to set user context for RLS policies
   
3. **Enables Row Level Security (RLS) on all tables**
   - medications
   - schedules
   - medication_logs
   - sms_reminders
   - interactions

4. **Creates RLS Policies**
   - Users can only SELECT, INSERT, UPDATE, DELETE their own data
   - Policies use `current_setting('app.current_user_id')` to filter rows

### Step 3: Verify Migration Success

After running the migration, execute these verification queries in the SQL Editor:

```sql
-- Check that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('medications', 'schedules', 'medication_logs')
ORDER BY tablename;

-- All should return rowsecurity = true
```

```sql
-- Check that policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Should show policies for each table
```

```sql
-- Verify schedules has user_id
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'schedules'
AND column_name = 'user_id';

-- Should return one row
```

## 🧪 Testing Data Isolation

After running the migration, test that users cannot see each other's data:

### Test 1: Two Different Users

1. **Login as User A** (e.g., user1@gmail.com)
   - Add medication: "Test Medication A"
   - Note the data you added

2. **Logout and login as User B** (e.g., user2@gmail.com)
   - Add medication: "Test Medication B"
   - Verify you do NOT see "Test Medication A"

3. **Logout and login as User A again**
   - Verify you ONLY see "Test Medication A"
   - Verify you do NOT see "Test Medication B"

### Test 2: Direct ID Access

1. Login as User A, add a medication
2. Note the medication ID (check browser devtools network tab)
3. Logout, login as User B
4. Try to access User A's medication ID directly via API
5. Should return 404 or empty result (RLS blocks access)

### Test 3: Schedules Isolation

1. Login as User A, create a schedule
2. Logout, login as User B
3. User B should NOT see User A's schedules
4. Create a schedule as User B
5. Logout, login as User A
6. User A should NOT see User B's schedule

## 📋 What Changed in the Code

### Database Layer ([supabase-db.js](file:///Users/christina/Desktop/medication-manager/server/supabase-db.js))

**Added `userId` parameter to all methods:**
- `getMedication(id, userId)`
- `updateMedication(id, updates, userId)`
- `deleteMedication(id, userId)`
- `addSchedule(data, userId)` - Also adds `user_id` to inserted data
- `updateSchedule(id, updates, userId)`
- `deleteSchedule(id, userId)`
- `addLog(data, userId)`
- `getLogs(filter, userId)`
- `getRefillAlerts(threshold, userId)`
- `getAdherenceStats(days, medicationId, userId)`

**Each method now:**
1. Accepts optional `userId` parameter
2. Calls `await this.setUserContext(userId)` before query
3. Lets RLS policies filter results automatically

### API Layer ([enhanced-server.js](file:///Users/christina/Desktop/medication-manager/server/enhanced-server.js))

**All endpoints now extract and pass userId:**
```javascript
const userId = req.user?.id;
await db.someMethod(..., userId);
```

**Updated endpoints:**
- `GET /api/medications` ✅
- `GET /api/medications/:id` ✅
- `POST /api/medications` ✅
- `PATCH /api/medications/:id` ✅
- `PUT /api/medications/:id` ✅
- `DELETE /api/medications/:id` ✅
- `GET /api/schedules` ✅
- `POST /api/schedules` ✅
- `PUT /api/schedules/:id` ✅
- `DELETE /api/schedules/:id` ✅
- `POST /api/logs` ✅
- `GET /api/logs` ✅
- `GET /api/schedule/today` ✅
- `GET /api/refill-alerts` ✅
- `GET /api/stats/adherence` ✅

## 🔒 How It Works

### Defense in Depth

The implementation uses multiple layers of security:

1. **Authentication**: `ensureAuthenticated` middleware
2. **User Context**: `setUserContext(userId)` sets session variable
3. **RLS Policies**: Database automatically filters by `app.current_user_id`
4. **Application Logic**: Code explicitly passes userId to methods

Even if application code has a bug, RLS policies prevent unauthorized data access.

### Flow Example

```
User Request → ensureAuthenticated → Extract req.user.id → Pass to db method
                                                              ↓
                                                   setUserContext(userId)
                                                              ↓
                                                   RLS policy checks user_id
                                                              ↓
                                                   Return only user's data
```

## ⚠️ Important Notes

1. **Migration is Required**: App won't work correctly until you run the SQL migration
2. **Backward Compatibility**: Existing data will be preserved and linked to correct users
3. **Service Role Client**: Only used for cron jobs and system tasks (bypasses RLS)
4. **Regular Client**: Used for all user operations (respects RLS)

## 🚀 Next Steps

1. ✅ Run the SQL migration in Supabase
2. ✅ Verify migration with test queries
3. ✅ Test with multiple user accounts
4. ✅ Deploy updated code to production
5. ✅ Monitor logs for any unauthorized access attempts

## 📞 Support

If you encounter any issues:
- Check that RLS is enabled on all tables
- Verify policies exist with the verification queries
- Ensure schedules table has user_id column
- Check application logs for any errors
