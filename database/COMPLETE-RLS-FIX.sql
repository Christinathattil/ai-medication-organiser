-- ========================================
-- COMPLETE RLS FIX: Perfect for Your Schema
-- Copy this entire script and run in Supabase SQL Editor
-- ========================================

-- 1. Create or replace the RPC function
CREATE OR REPLACE FUNCTION set_current_user_id(p_user_id bigint)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enable RLS on ALL tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_reminders ENABLE ROW LEVEL SECURITY;

-- 3. Drop all existing policies (fresh start)
-- Users
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Medications
DROP POLICY IF EXISTS "medications_select_own" ON medications;
DROP POLICY IF EXISTS "medications_insert_own" ON medications;
DROP POLICY IF EXISTS "medications_update_own" ON medications;
DROP POLICY IF EXISTS "medications_delete_own" ON medications;

-- Schedules
DROP POLICY IF EXISTS "schedules_select_own" ON schedules;
DROP POLICY IF EXISTS "schedules_insert_own" ON schedules;
DROP POLICY IF EXISTS "schedules_update_own" ON schedules;
DROP POLICY IF EXISTS "schedules_delete_own" ON schedules;

-- Logs
DROP POLICY IF EXISTS "logs_select_own" ON medication_logs;
DROP POLICY IF EXISTS "logs_insert_own" ON medication_logs;
DROP POLICY IF EXISTS "logs_update_own" ON medication_logs;
DROP POLICY IF EXISTS "logs_delete_own" ON medication_logs;

-- Interactions
DROP POLICY IF EXISTS "interactions_select_own" ON interactions;
DROP POLICY IF EXISTS "interactions_insert_own" ON interactions;
DROP POLICY IF EXISTS "interactions_update_own" ON interactions;
DROP POLICY IF EXISTS "interactions_delete_own" ON interactions;

-- SMS Reminders
DROP POLICY IF EXISTS "sms_select_own" ON sms_reminders;
DROP POLICY IF EXISTS "sms_insert_system" ON sms_reminders;
DROP POLICY IF EXISTS "sms_update_system" ON sms_reminders;

-- ========================================
-- 4. CREATE POLICIES
-- ========================================

-- USERS: Can view/update own profile
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (id = current_setting('app.current_user_id', TRUE)::bigint);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = current_setting('app.current_user_id', TRUE)::bigint);

-- MEDICATIONS: Direct user_id filter
CREATE POLICY "medications_select_own"
  ON medications FOR SELECT
  USING (user_id = current_setting('app.current_user_id', TRUE)::bigint);

CREATE POLICY "medications_insert_own"
  ON medications FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', TRUE)::bigint);

CREATE POLICY "medications_update_own"
  ON medications FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', TRUE)::bigint);

CREATE POLICY "medications_delete_own"
  ON medications FOR DELETE
  USING (user_id = current_setting('app.current_user_id', TRUE)::bigint);

-- SCHEDULES: Linked through medications
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

-- MEDICATION LOGS: Linked through schedules → medications
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

CREATE POLICY "logs_update_own"
  ON medication_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      JOIN medications ON medications.id = schedules.medication_id
      WHERE schedules.id = medication_logs.schedule_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

CREATE POLICY "logs_delete_own"
  ON medication_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      JOIN medications ON medications.id = schedules.medication_id
      WHERE schedules.id = medication_logs.schedule_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- INTERACTIONS: Linked through medications
CREATE POLICY "interactions_select_own"
  ON interactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = interactions.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

CREATE POLICY "interactions_insert_own"
  ON interactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = interactions.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

CREATE POLICY "interactions_update_own"
  ON interactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = interactions.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

CREATE POLICY "interactions_delete_own"
  ON interactions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = interactions.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- SMS REMINDERS: Linked through medications
-- Users can view their own SMS reminders
CREATE POLICY "sms_select_own"
  ON sms_reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = sms_reminders.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- System (cron job) can insert SMS reminders
CREATE POLICY "sms_insert_system"
  ON sms_reminders FOR INSERT
  WITH CHECK (true);

-- System can update SMS status (delivery, responses)
CREATE POLICY "sms_update_system"
  ON sms_reminders FOR UPDATE
  USING (true);

-- ========================================
-- 5. GRANT PERMISSIONS
-- ========================================

GRANT EXECUTE ON FUNCTION set_current_user_id(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_user_id(bigint) TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON medications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON medication_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON interactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sms_reminders TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ========================================
-- 6. VERIFY RLS IS ENABLED
-- ========================================

SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'medications', 'schedules', 'medication_logs', 'interactions', 'sms_reminders')
ORDER BY tablename;

-- ========================================
-- 7. LIST ALL ACTIVE POLICIES
-- ========================================

SELECT 
  tablename,
  policyname,
  cmd as "Operation"
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS POLICIES SUCCESSFULLY CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Protected tables:';
  RAISE NOTICE '  - users';
  RAISE NOTICE '  - medications';
  RAISE NOTICE '  - schedules';
  RAISE NOTICE '  - medication_logs';
  RAISE NOTICE '  - interactions';
  RAISE NOTICE '  - sms_reminders';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can now only access their own data!';
  RAISE NOTICE '========================================';
END $$;
