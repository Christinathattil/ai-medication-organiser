-- ============================================================================
-- USER DATA ISOLATION - DATABASE MIGRATION
-- ============================================================================
-- Run this script in Supabase SQL Editor to enable complete user data isolation
-- Each user will only be able to access their own medications, schedules, and logs

-- ============================================================================
-- STEP 1: Add user_id column to schedules table
-- ============================================================================

-- Add the column (allow NULL initially)
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Populate existing schedules with user_id from their associated medications
UPDATE schedules s
SET user_id = m.user_id
FROM medications m
WHERE s.medication_id = m.id
AND s.user_id IS NULL;

-- Make it NOT NULL after population
ALTER TABLE schedules ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE schedules 
ADD CONSTRAINT schedules_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 2: Create function to set user context (if not exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_current_user_id(p_user_id INTEGER)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Enable Row Level Security on all tables
-- ============================================================================

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Drop existing policies if any (to avoid conflicts)
-- ============================================================================

-- Medications
DROP POLICY IF EXISTS "Users can view their own medications" ON medications;
DROP POLICY IF EXISTS "Users can insert their own medications" ON medications;
DROP POLICY IF EXISTS "Users can update their own medications" ON medications;
DROP POLICY IF EXISTS "Users can delete their own medications" ON medications;

-- Schedules
DROP POLICY IF EXISTS "Users can view their own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can insert their own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can update their own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can delete their own schedules" ON schedules;

-- Medication Logs
DROP POLICY IF EXISTS "Users can view their own logs" ON medication_logs;
DROP POLICY IF EXISTS "Users can insert their own logs" ON medication_logs;
DROP POLICY IF EXISTS "Users can update their own logs" ON medication_logs;
DROP POLICY IF EXISTS "Users can delete their own logs" ON medication_logs;

-- SMS Reminders
DROP POLICY IF EXISTS "Users can view their own sms reminders" ON sms_reminders;
DROP POLICY IF EXISTS "Users can insert their own sms reminders" ON sms_reminders;
DROP POLICY IF EXISTS "Users can update their own sms reminders" ON sms_reminders;

-- Interactions
DROP POLICY IF EXISTS "Users can view their own interactions" ON interactions;
DROP POLICY IF EXISTS "Users can insert their own interactions" ON interactions;

-- ============================================================================
-- STEP 5: Create RLS Policies for MEDICATIONS table
-- ============================================================================

CREATE POLICY "Users can view their own medications"
  ON medications FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::integer);

CREATE POLICY "Users can insert their own medications"
  ON medications FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::integer);

CREATE POLICY "Users can update their own medications"
  ON medications FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::integer);

CREATE POLICY "Users can delete their own medications"
  ON medications FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true)::integer);

-- ============================================================================
-- STEP 6: Create RLS Policies for SCHEDULES table
-- ============================================================================

CREATE POLICY "Users can view their own schedules"
  ON schedules FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::integer);

CREATE POLICY "Users can insert their own schedules"
  ON schedules FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::integer);

CREATE POLICY "Users can update their own schedules"
  ON schedules FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::integer);

CREATE POLICY "Users can delete their own schedules"
  ON schedules FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true)::integer);

-- ============================================================================
-- STEP 7: Create RLS Policies for MEDICATION_LOGS table
-- ============================================================================
-- Note: medication_logs doesn't have user_id, so we join through medications

CREATE POLICY "Users can view their own logs"
  ON medication_logs FOR SELECT
  USING (medication_id IN (
    SELECT id FROM medications 
    WHERE user_id = current_setting('app.current_user_id', true)::integer
  ));

CREATE POLICY "Users can insert their own logs"
  ON medication_logs FOR INSERT
  WITH CHECK (medication_id IN (
    SELECT id FROM medications 
    WHERE user_id = current_setting('app.current_user_id', true)::integer
  ));

CREATE POLICY "Users can update their own logs"
  ON medication_logs FOR UPDATE
  USING (medication_id IN (
    SELECT id FROM medications 
    WHERE user_id = current_setting('app.current_user_id', true)::integer
  ));

CREATE POLICY "Users can delete their own logs"
  ON medication_logs FOR DELETE
  USING (medication_id IN (
    SELECT id FROM medications 
    WHERE user_id = current_setting('app.current_user_id', true)::integer
  ));

-- ============================================================================
-- STEP 8: Create RLS Policies for SMS_REMINDERS table
-- ============================================================================
-- Note: sms_reminders links through medication_id

CREATE POLICY "Users can view their own sms reminders"
  ON sms_reminders FOR SELECT
  USING (medication_id IN (
    SELECT id FROM medications 
    WHERE user_id = current_setting('app.current_user_id', true)::integer
  ));

CREATE POLICY "Users can insert their own sms reminders"
  ON sms_reminders FOR INSERT
  WITH CHECK (medication_id IN (
    SELECT id FROM medications 
    WHERE user_id = current_setting('app.current_user_id', true)::integer
  ));

CREATE POLICY "Users can update their own sms reminders"
  ON sms_reminders FOR UPDATE
  USING (medication_id IN (
    SELECT id FROM medications 
    WHERE user_id = current_setting('app.current_user_id', true)::integer
  ));

-- ============================================================================
-- STEP 9: Create RLS Policies for INTERACTIONS table
-- ============================================================================
-- Note: interactions link through medication1_id and medication2_id

CREATE POLICY "Users can view their own interactions"
  ON interactions FOR SELECT
  USING (
    medication1_id IN (
      SELECT id FROM medications 
      WHERE user_id = current_setting('app.current_user_id', true)::integer
    )
    OR
    medication2_id IN (
      SELECT id FROM medications 
      WHERE user_id = current_setting('app.current_user_id', true)::integer
    )
  );

CREATE POLICY "Users can insert their own interactions"
  ON interactions FOR INSERT
  WITH CHECK (
    medication1_id IN (
      SELECT id FROM medications 
      WHERE user_id = current_setting('app.current_user_id', true)::integer
    )
    AND
    medication2_id IN (
      SELECT id FROM medications 
      WHERE user_id = current_setting('app.current_user_id', true)::integer
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful

-- Check that RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('medications', 'schedules', 'medication_logs', 'sms_reminders', 'interactions')
ORDER BY tablename;

-- List all active RLS policies
SELECT 
  tablename, 
  policyname, 
  permissive,
  CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify schedules table has user_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'schedules'
AND column_name = 'user_id';

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- After running this script:
-- ✅ All tables have RLS enabled
-- ✅ All tables have proper policies to isolate user data
-- ✅ schedules table now has user_id column
-- ✅ Users can only access their own data
-- 
-- Next: Update application code to pass userId to all database methods
-- ============================================================================
