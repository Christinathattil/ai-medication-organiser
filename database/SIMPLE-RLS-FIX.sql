-- ========================================
-- SIMPLE FIX: User Data Isolation
-- Copy this entire script and run in Supabase SQL Editor
-- ========================================

-- 1. First, create or replace the RPC function
CREATE OR REPLACE FUNCTION set_current_user_id(p_user_id bigint)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enable RLS on all tables
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies (fresh start)
DROP POLICY IF EXISTS "medications_select_own" ON medications;
DROP POLICY IF EXISTS "medications_insert_own" ON medications;
DROP POLICY IF EXISTS "medications_update_own" ON medications;
DROP POLICY IF EXISTS "medications_delete_own" ON medications;

DROP POLICY IF EXISTS "schedules_select_own" ON schedules;
DROP POLICY IF EXISTS "schedules_insert_own" ON schedules;
DROP POLICY IF EXISTS "schedules_update_own" ON schedules;
DROP POLICY IF EXISTS "schedules_delete_own" ON schedules;

DROP POLICY IF EXISTS "logs_select_own" ON medication_logs;
DROP POLICY IF EXISTS "logs_insert_own" ON medication_logs;

-- 4. Create NEW policies that allow operations
CREATE POLICY "medications_select_own"
  ON medications FOR SELECT
  USING (
    user_id = current_setting('app.current_user_id', TRUE)::bigint
  );

CREATE POLICY "medications_insert_own"
  ON medications FOR INSERT
  WITH CHECK (
    user_id = current_setting('app.current_user_id', TRUE)::bigint
  );

CREATE POLICY "medications_update_own"
  ON medications FOR UPDATE
  USING (
    user_id = current_setting('app.current_user_id', TRUE)::bigint
  );

CREATE POLICY "medications_delete_own"
  ON medications FOR DELETE
  USING (
    user_id = current_setting('app.current_user_id', TRUE)::bigint
  );

-- Schedules: linked through medications
CREATE POLICY "schedules_select_own"
  ON schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = schedules.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

CREATE POLICY "schedules_insert_own"
  ON schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = schedules.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

CREATE POLICY "schedules_update_own"
  ON schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = schedules.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

CREATE POLICY "schedules_delete_own"
  ON schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = schedules.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- Medication logs: linked through schedules
CREATE POLICY "logs_select_own"
  ON medication_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      JOIN medications ON medications.id = schedules.medication_id
      WHERE schedules.id = medication_logs.schedule_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

CREATE POLICY "logs_insert_own"
  ON medication_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedules
      JOIN medications ON medications.id = schedules.medication_id
      WHERE schedules.id = medication_logs.schedule_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- 5. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION set_current_user_id(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_user_id(bigint) TO anon;

-- 6. Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('medications', 'schedules', 'medication_logs');

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'RLS policies successfully created!';
  RAISE NOTICE 'Users can now only access their own data.';
END $$;
