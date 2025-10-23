-- Fix RLS Policy for Phone Verification with Passport.js
-- This allows users to update their own phone verification status
-- while maintaining security

-- Step 1: Drop existing restrictive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Step 2: Create new update policy that works with Passport.js
-- The key insight: we set app.current_user_id before calling update,
-- so the policy should check if the row being updated matches that ID
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (
    -- Allow if Supabase Auth UID matches (for Supabase Auth users)
    auth.uid()::text = google_id 
    OR 
    -- Allow if the row's ID matches our set context (for Passport.js users)
    -- The updateUserPhone function calls setUserContext(userId) first
    id = NULLIF(current_setting('app.current_user_id', TRUE), '')::bigint
  )
  WITH CHECK (
    -- Same conditions must be true for the updated data
    auth.uid()::text = google_id 
    OR 
    id = NULLIF(current_setting('app.current_user_id', TRUE), '')::bigint
  );

-- Step 3: Ensure the set_current_user_id function exists and works correctly
CREATE OR REPLACE FUNCTION set_current_user_id(p_user_id bigint)
RETURNS void AS $$
BEGIN
  -- Set the configuration parameter for this session/transaction
  -- This is used by RLS policies to identify the current user
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
  
  -- Log for debugging (optional, remove in production)
  RAISE NOTICE 'Set app.current_user_id to: %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_current_user_id TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_user_id TO anon;

-- Verification queries (run these to test):
-- Check current policies:
-- SELECT schemaname, tablename, policyname, permissive, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'users';

-- Test setting user context:
-- SELECT set_current_user_id(1);
-- SELECT current_setting('app.current_user_id', TRUE);

COMMENT ON POLICY "Users can update own profile" ON users IS 
  'Allows users to update their own profile. Works with both Supabase Auth (via auth.uid()) 
   and Passport.js (via app.current_user_id context set by set_current_user_id function).';
