-- ⚠️ DANGER: This will DELETE ALL USER DATA
-- This operation is IRREVERSIBLE
-- Use with extreme caution!

-- Clear all data from tables in the correct order (respecting foreign key constraints)

-- 1. Clear SMS reminders (references schedules and medications)
DELETE FROM sms_reminders;

-- 2. Clear medication logs (references schedules and medications)
DELETE FROM medication_logs;

-- 3. Clear schedules (references medications)
DELETE FROM schedules;

-- 4. Clear medications (references users)
DELETE FROM medications;

-- 5. Clear users (no dependencies)
DELETE FROM users;

-- Verify all tables are empty
SELECT 'sms_reminders' as table_name, COUNT(*) as remaining_records FROM sms_reminders
UNION ALL
SELECT 'medication_logs', COUNT(*) FROM medication_logs
UNION ALL
SELECT 'schedules', COUNT(*) FROM schedules
UNION ALL
SELECT 'medications', COUNT(*) FROM medications
UNION ALL
SELECT 'users', COUNT(*) FROM users;

-- Reset sequences (optional - to restart IDs from 1)
-- ALTER SEQUENCE users_id_seq RESTART WITH 1;
-- ALTER SEQUENCE medications_id_seq RESTART WITH 1;
-- ALTER SEQUENCE schedules_id_seq RESTART WITH 1;
-- ALTER SEQUENCE medication_logs_id_seq RESTART WITH 1;
-- ALTER SEQUENCE sms_reminders_id_seq RESTART WITH 1;

-- Success message
SELECT '✅ All user data has been cleared' as status;
