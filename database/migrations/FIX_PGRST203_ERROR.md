# Fix for PGRST203 Error

## Problem

You're seeing this error:
```
❌ Error setting user context: {
  code: 'PGRST203',
  message: 'Could not choose the best candidate function between: 
    public.set_current_user_id(p_user_id => bigint), 
    public.set_current_user_id(p_user_id => integer)'
}
```

## Cause

The database has two versions of the `set_current_user_id` function (one for `integer`, one for `bigint`), and PostgreSQL cannot determine which one to use. This happened because the migration script was run multiple times or there was a pre-existing function.

## Fix

Run this SQL in your Supabase SQL Editor:

```sql
-- Drop all versions
DROP FUNCTION IF EXISTS set_current_user_id(p_user_id INTEGER);
DROP FUNCTION IF EXISTS set_current_user_id(p_user_id BIGINT);

-- Recreate with correct type
CREATE OR REPLACE FUNCTION set_current_user_id(p_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Or simply run the migration file:
`database/migrations/003_fix_set_user_context.sql`

## Steps

1. Go to Supabase Dashboard → SQL Editor
2. Copy the SQL from `003_fix_set_user_context.sql`
3. Click "Run"
4. Restart your Node.js server (`npm start`)

## Verification

After running the fix, you should see:
```
✅ User context set successfully for user 13
```

Instead of the error message.

## Why This Happened

The initial migration (`002_user_data_isolation.sql`) created the function, but if you ran it multiple times or had a previous version, PostgreSQL keeps both signatures. This fix ensures only one version exists.
