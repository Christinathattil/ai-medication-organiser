-- ============================================
-- FIX: Duplicate set_current_user_id Function
-- ============================================
-- This fixes the PGRST203 error caused by function overloading

-- Drop all versions of the function
DROP FUNCTION IF EXISTS set_current_user_id(p_user_id INTEGER);
DROP FUNCTION IF EXISTS set_current_user_id(p_user_id BIGINT);

-- Recreate with correct type (INTEGER matches the users.id column)
CREATE OR REPLACE FUNCTION set_current_user_id(p_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify it was created correctly
SELECT proname, pronargs, proargtypes::regtype[]
FROM pg_proc
WHERE proname = 'set_current_user_id';

-- Should return:
-- proname              | pronargs | proargtypes
-- set_current_user_id  |        1 | {integer}
