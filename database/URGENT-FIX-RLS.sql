-- ========================================
-- URGENT: Fix User Data Isolation
-- Run this in Supabase SQL Editor IMMEDIATELY
-- ========================================

-- 1. CHECK CURRENT RLS STATUS
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('medications', 'schedules', 'medication_logs', 'sms_reminders', 'users');

-- 2. ENABLE RLS IF NOT ENABLED
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_reminders ENABLE ROW LEVEL SECURITY;

-- 3. DROP EXISTING POLICIES (to recreate them fresh)
DROP POLICY IF EXISTS "Users can view own medications" ON medications;
DROP POLICY IF EXISTS "Users can create own medications" ON medications;
DROP POLICY IF EXISTS "Users can update own medications" ON medications;
DROP POLICY IF EXISTS "Users can delete own medications" ON medications;

DROP POLICY IF EXISTS "Users can view own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can create own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can update own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can delete own schedules" ON schedules;

DROP POLICY IF EXISTS "Users can view own logs" ON medication_logs;
DROP POLICY IF EXISTS "Users can create own logs" ON medication_logs;
DROP POLICY IF EXISTS "Users can update own logs" ON medication_logs;
DROP POLICY IF EXISTS "Users can delete own logs" ON medication_logs;

-- 4. CREATE NEW SIMPLIFIED POLICIES

-- MEDICATIONS: Only see your own
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

-- SCHEDULES: Only see schedules for your medications
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

-- MEDICATION LOGS: Only see logs for your schedules
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

-- 5. VERIFY RLS IS WORKING
-- Test query (should return 0 if RLS is working)
-- Run this as a test:
-- SELECT COUNT(*) FROM medications WHERE user_id != current_setting('app.current_user_id', TRUE)::bigint;

-- 6. CHECK ALL POLICIES ARE ACTIVE
SELECT tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

COMMENT ON TABLE medications IS 'RLS Enabled: Users can only access their own medications';
COMMENT ON TABLE schedules IS 'RLS Enabled: Users can only access schedules for their medications';
COMMENT ON TABLE medication_logs IS 'RLS Enabled: Users can only access logs for their schedules';
