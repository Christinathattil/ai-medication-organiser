-- Row Level Security (RLS) Policies
-- CRITICAL FOR PRODUCTION: Run this to secure your data
-- Ensures users can only access their own data

-- ========================================
-- 1. Enable RLS on all tables
-- ========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_reminders ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. Users Table Policies
-- ========================================

-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  USING (auth.uid()::text = google_id OR id = current_setting('app.current_user_id', TRUE)::bigint);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid()::text = google_id OR id = current_setting('app.current_user_id', TRUE)::bigint);

-- ========================================
-- 3. Medications Table Policies
-- ========================================

-- Users can only see their own medications
CREATE POLICY "Users can view own medications"
  ON medications
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id', TRUE)::bigint);

-- Users can create medications for themselves
CREATE POLICY "Users can create own medications"
  ON medications
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', TRUE)::bigint);

-- Users can update their own medications
CREATE POLICY "Users can update own medications"
  ON medications
  FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', TRUE)::bigint);

-- Users can delete their own medications
CREATE POLICY "Users can delete own medications"
  ON medications
  FOR DELETE
  USING (user_id = current_setting('app.current_user_id', TRUE)::bigint);

-- ========================================
-- 4. Schedules Table Policies
-- ========================================

-- Users can view schedules for their medications
CREATE POLICY "Users can view own schedules"
  ON schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = schedules.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- Users can create schedules for their medications
CREATE POLICY "Users can create own schedules"
  ON schedules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = schedules.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- Users can update their own schedules
CREATE POLICY "Users can update own schedules"
  ON schedules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = schedules.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- Users can delete their own schedules
CREATE POLICY "Users can delete own schedules"
  ON schedules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = schedules.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- ========================================
-- 5. Medication Logs Table Policies
-- ========================================

-- Users can view logs for their schedules
CREATE POLICY "Users can view own logs"
  ON medication_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      JOIN medications ON medications.id = schedules.medication_id
      WHERE schedules.id = medication_logs.schedule_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- Users can create logs for their schedules
CREATE POLICY "Users can create own logs"
  ON medication_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM schedules
      JOIN medications ON medications.id = schedules.medication_id
      WHERE schedules.id = medication_logs.schedule_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- Users can update their own logs
CREATE POLICY "Users can update own logs"
  ON medication_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      JOIN medications ON medications.id = schedules.medication_id
      WHERE schedules.id = medication_logs.schedule_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- Users can delete their own logs
CREATE POLICY "Users can delete own logs"
  ON medication_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM schedules
      JOIN medications ON medications.id = schedules.medication_id
      WHERE schedules.id = medication_logs.schedule_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- ========================================
-- 6. SMS Reminders Table Policies
-- ========================================

-- Users can view their SMS reminders
CREATE POLICY "Users can view own sms reminders"
  ON sms_reminders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = sms_reminders.medication_id
      AND medications.user_id = current_setting('app.current_user_id', TRUE)::bigint
    )
  );

-- System can create SMS reminders (for automated reminders)
CREATE POLICY "System can create sms reminders"
  ON sms_reminders
  FOR INSERT
  WITH CHECK (true);

-- System can update SMS reminders (for delivery status)
CREATE POLICY "System can update sms reminders"
  ON sms_reminders
  FOR UPDATE
  USING (true);

-- ========================================
-- 7. Helper Function for User Context
-- ========================================

-- Function to set current user context
CREATE OR REPLACE FUNCTION set_current_user_id(p_user_id bigint)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 8. Grant Permissions
-- ========================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON medications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON medication_logs TO authenticated;
GRANT SELECT ON sms_reminders TO authenticated;

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ========================================
-- VERIFICATION QUERIES (Run to test)
-- ========================================

-- Check RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('users', 'medications', 'schedules', 'medication_logs', 'sms_reminders');

-- List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public';

COMMENT ON FUNCTION set_current_user_id IS 'Sets the current user context for RLS policies';
