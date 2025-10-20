-- Users table for Google OAuth authentication
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add user_id to medications table to associate with users
ALTER TABLE medications
ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;

-- Add user_id to schedules (via medications relationship)
-- No need to add directly as it's linked through medications

-- Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sessions table for express-session (using connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire);

COMMENT ON TABLE users IS 'Stores authenticated user information from Google OAuth';
COMMENT ON TABLE session IS 'Stores user session data for express-session';
-- SMS Reminders Tracking Table
-- Run this in your Supabase SQL Editor to enable two-way SMS tracking

CREATE TABLE IF NOT EXISTS sms_reminders (
  id BIGSERIAL PRIMARY KEY,
  medication_id BIGINT REFERENCES medications(id) ON DELETE CASCADE,
  schedule_id BIGINT REFERENCES schedules(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  reminder_message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  twilio_message_sid TEXT,
  response_received BOOLEAN DEFAULT FALSE,
  response_text TEXT,
  response_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('sent', 'delivered', 'failed', 'responded_yes', 'responded_no')) DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sms_reminders_schedule ON sms_reminders(schedule_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_reminders_phone ON sms_reminders(phone_number, sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_reminders_sid ON sms_reminders(twilio_message_sid);

-- Add a column to medication_logs to track if it was logged via SMS
ALTER TABLE medication_logs 
ADD COLUMN IF NOT EXISTS logged_via_sms BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_reminder_id BIGINT REFERENCES sms_reminders(id) ON DELETE SET NULL;

COMMENT ON TABLE sms_reminders IS 'Tracks SMS reminders sent and responses received';
COMMENT ON COLUMN sms_reminders.status IS 'Status: sent, delivered, failed, responded_yes, responded_no';
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
