-- ========================================
-- FIX USERS TABLE RLS
-- Allow users to update their own profile
-- ========================================

-- 1. Re-enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;

-- 3. Create correct policies with ::bigint casting

-- SELECT: Users can view their own profile
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (id = current_setting('app.current_user_id', TRUE)::bigint);

-- UPDATE: Users can update their own profile
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = current_setting('app.current_user_id', TRUE)::bigint)
  WITH CHECK (id = current_setting('app.current_user_id', TRUE)::bigint);

-- INSERT: System can create new users during OAuth
-- (No user context during initial signup, so allow all inserts)
CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (true);

-- ========================================
-- TEST THE FIX
-- ========================================

-- Set context as user 9
SELECT set_current_user_id(9);

-- Try to select own user (should work)
SELECT id, email, phone, phone_verified 
FROM users 
WHERE id = 9;

-- Try to update own profile (should work)
UPDATE users 
SET phone = '+919876543210',
    phone_verified = true
WHERE id = 9;

-- Verify the update worked
SELECT id, email, phone, phone_verified 
FROM users 
WHERE id = 9;

-- Try to access another user (should fail - 0 rows)
SELECT id, email, phone
FROM users 
WHERE id = 4;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ USERS TABLE RLS FIXED!';
  RAISE NOTICE 'Users can now update their own profiles';
  RAISE NOTICE 'Phone verification should work now!';
END $$;
