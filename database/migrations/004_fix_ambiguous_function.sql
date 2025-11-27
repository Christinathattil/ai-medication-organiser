-- ============================================
-- FIX: Ambiguous Function Error (Definitive)
-- ============================================

-- 1. Drop the function with specific signatures to be safe
DROP FUNCTION IF EXISTS public.set_current_user_id(integer);
DROP FUNCTION IF EXISTS public.set_current_user_id(bigint);

-- 2. Recreate the function with the correct signature (INTEGER)
-- This matches the auth.uid() and our internal user_id usage
CREATE OR REPLACE FUNCTION public.set_current_user_id(p_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Set the configuration parameter
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_current_user_id(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_current_user_id(INTEGER) TO service_role;

-- 4. Verify (Optional - for manual checking)
-- SELECT proname, proargtypes::regtype[] FROM pg_proc WHERE proname = 'set_current_user_id';
