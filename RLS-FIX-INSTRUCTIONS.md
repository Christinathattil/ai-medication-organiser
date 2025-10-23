# Fix Phone Verification RLS Issue

## The Problem
Row Level Security (RLS) is blocking phone verification updates because the policy doesn't properly recognize Passport.js authenticated users.

## The Solution
Run the SQL migration to update the RLS policy to work with both Supabase Auth and Passport.js.

---

## Step-by-Step Instructions

### 1. Open Supabase SQL Editor

1. Go to: **https://supabase.com/dashboard**
2. Select your project: **ai-medication-organiser**
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

### 2. Copy and Run the Migration

1. Open file: `database/fix-phone-verification-rls.sql`
2. **Copy all contents** of the file
3. **Paste** into Supabase SQL Editor
4. Click **"Run"** button

You should see:
```
Success. No rows returned
```

### 3. Verify the Fix

Run this query in SQL Editor to check the policy:

```sql
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'users';
```

You should see the policy **"Users can update own profile"** listed.

### 4. Test Phone Verification

1. Go to: https://ai-medication-organiser.onrender.com/
2. **Clear browser cache** (important!)
3. Sign in with Google
4. Try phone verification again
5. It should work now! ✅

---

## What Changed

### Before (Broken)
- RLS policy only checked `current_setting('app.current_user_id')` without handling NULL/empty strings
- Passport.js context wasn't being recognized properly

### After (Fixed)
- Uses `NULLIF(current_setting('app.current_user_id', TRUE), '')::bigint`
- Properly handles empty strings and NULL values
- Added logging to `set_current_user_id` function for debugging
- Grants proper permissions to both authenticated and anonymous users

---

## Alternative: Temporary Bypass

If you want to test the app **immediately** without fixing RLS:

**Add to Render Environment:**
- **Key**: `PHONE_VERIFICATION_REQUIRED`
- **Value**: `false`

This disables phone verification requirement temporarily.

---

## Troubleshooting

### Migration fails with "policy already exists"
The script handles this - it drops the old policy first. If it still fails, manually drop it:

```sql
DROP POLICY IF EXISTS "Users can update own profile" ON users;
```

Then run the migration again.

### Still getting RLS errors after migration
1. Check if context is being set:
```sql
SELECT current_setting('app.current_user_id', TRUE);
```

2. Check server logs for "Set app.current_user_id to: X"

3. Verify the policy is active:
```sql
SELECT * FROM pg_policies WHERE tablename = 'users';
```

---

## Need Help?

Check server logs after phone verification attempt:
- Should see: `Set app.current_user_id to: [number]`
- Should see: `✅ Database updated: phone_verified=true`

If you still see RLS errors, share the logs!

---

**After running this migration, phone verification will work properly!** 🎉
