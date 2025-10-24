-- ========================================
-- DEBUG RLS POLICIES
-- Check if policies are working correctly
-- ========================================

-- 1. Check current user context (should be empty in SQL Editor)
SELECT current_setting('app.current_user_id', TRUE) as current_user_context;

-- 2. Manually test RLS by setting user context
-- Test as user 5 (Kristy)
SELECT set_current_user_id(5);

-- 3. Now query medications - should return NOTHING for user 5
SELECT id, name, dosage, user_id
FROM medications;

-- 4. Switch to user 4 (Christina)
SELECT set_current_user_id(4);

-- 5. Query medications - should return 2 medications for user 4
SELECT id, name, dosage, user_id
FROM medications;

-- ========================================
-- 6. Check what the actual RLS policy is doing
-- ========================================

-- View the actual policy definition
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as "Policy Condition"
FROM pg_policies
WHERE tablename = 'medications';

-- ========================================
-- 7. CRITICAL: Check if medications table has RLS enabled
-- ========================================

SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'medications';
