-- ========================================
-- FIX RLS TYPE MISMATCH BUG
-- The policies were comparing bigint to text!
-- ========================================

-- Drop broken policies
DROP POLICY IF EXISTS "medications_select_own" ON medications;
DROP POLICY IF EXISTS "medications_insert_own" ON medications;
DROP POLICY IF EXISTS "medications_update_own" ON medications;
DROP POLICY IF EXISTS "medications_delete_own" ON medications;

DROP POLICY IF EXISTS "schedules_select_own" ON schedules;
DROP POLICY IF EXISTS "schedules_insert_own" ON schedules;
DROP POLICY IF EXISTS "schedules_update_own" ON schedules;
DROP POLICY IF EXISTS "schedules_delete_own" ON schedules;

-- Recreate with CORRECT type casting (::bigint not ::text)
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

-- Schedules
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

-- ========================================
-- TEST THE FIX
-- ========================================

-- Test as user 5 (Kristy) - should return NOTHING
SELECT set_current_user_id(5);
SELECT id, name, dosage, user_id FROM medications;
-- Expected: 0 rows

-- Test as user 4 (Christina) - should return 2 medications
SELECT set_current_user_id(4);
SELECT id, name, dosage, user_id FROM medications;
-- Expected: 2 rows (both Aspirin)

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ RLS TYPE MISMATCH FIXED!';
  RAISE NOTICE 'Policies now correctly cast to ::bigint';
  RAISE NOTICE 'Test above to verify user isolation works!';
END $$;
