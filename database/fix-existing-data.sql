-- Fix existing medications to assign them to the current user
-- This is needed if you created medications before the user_id column was added

-- First, let's see if there are any medications without user_id
-- (Run this to check)
SELECT id, name, user_id FROM medications WHERE user_id IS NULL;

-- If the query above shows medications, run this to assign them to your user:
-- Replace 1 with your actual user ID (check users table first)

-- Check your user ID:
SELECT id, email, name FROM users;

-- Then assign orphaned medications to that user:
-- UPDATE medications SET user_id = 1 WHERE user_id IS NULL;
-- (Uncomment and run after confirming your user ID)

-- Also make sure RLS policies allow access
DROP POLICY IF EXISTS "Users can view own medications" ON medications;
DROP POLICY IF EXISTS "Users can insert own medications" ON medications;
DROP POLICY IF EXISTS "Users can update own medications" ON medications;
DROP POLICY IF EXISTS "Users can delete own medications" ON medications;

-- Enable RLS
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to access their own medications
CREATE POLICY "Users can view own medications" ON medications
  FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE id = auth.uid()) OR user_id IS NULL);

CREATE POLICY "Users can insert own medications" ON medications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own medications" ON medications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own medications" ON medications
  FOR DELETE
  USING (true);

-- Same for schedules
DROP POLICY IF EXISTS "Users can view own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can insert own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can update own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can delete own schedules" ON schedules;

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules" ON schedules
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own schedules" ON schedules
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own schedules" ON schedules
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own schedules" ON schedules
  FOR DELETE
  USING (true);

-- Same for medication_logs
DROP POLICY IF EXISTS "Users can view own logs" ON medication_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON medication_logs;

ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON medication_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own logs" ON medication_logs
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE medications IS 'Medications with RLS allowing service role full access';
