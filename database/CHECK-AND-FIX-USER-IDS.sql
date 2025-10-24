-- ========================================
-- CHECK AND FIX NULL USER IDS
-- Run this to diagnose and fix data isolation issues
-- ========================================

-- 1. Check if medications have NULL user_id
SELECT 
  id,
  name,
  dosage,
  user_id,
  CASE 
    WHEN user_id IS NULL THEN '❌ NULL (PROBLEM!)'
    ELSE '✅ Has user_id'
  END as status
FROM medications
ORDER BY created_at DESC;

-- 2. Check users table
SELECT id, email, name, google_id
FROM users
ORDER BY created_at DESC;

-- 3. Count medications per user
SELECT 
  u.email,
  u.id as user_id,
  COUNT(m.id) as medication_count
FROM users u
LEFT JOIN medications m ON m.user_id = u.id
GROUP BY u.id, u.email
ORDER BY u.created_at DESC;

-- ========================================
-- FIX: Assign NULL medications to first user
-- (Only run this if you see NULL user_ids above)
-- ========================================

-- UNCOMMENT AND RUN THIS IF NEEDED:
/*
DO $$
DECLARE
  first_user_id bigint;
BEGIN
  -- Get the first user (or current user)
  SELECT id INTO first_user_id FROM users ORDER BY created_at LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Update medications with NULL user_id
    UPDATE medications
    SET user_id = first_user_id
    WHERE user_id IS NULL;
    
    RAISE NOTICE 'Updated medications to belong to user ID: %', first_user_id;
  ELSE
    RAISE NOTICE 'No users found in database!';
  END IF;
END $$;
*/

-- ========================================
-- VERIFICATION: Check RLS is working
-- ========================================

-- This should show the current user context
SELECT current_setting('app.current_user_id', TRUE) as current_user_context;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'medications';
