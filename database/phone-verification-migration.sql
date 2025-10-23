-- Phone Verification Migration
-- Add phone verification fields to users table

-- Add phone-related columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

-- Add index for phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified);

-- Update existing schedules to include user_phone for notifications
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS user_phone TEXT;

-- Add function to automatically set user_phone when schedule is created
CREATE OR REPLACE FUNCTION set_user_phone_on_schedule()
RETURNS TRIGGER AS $$
BEGIN
  -- Get user's verified phone from users table based on medication ownership
  SELECT u.phone INTO NEW.user_phone
  FROM users u
  INNER JOIN medications m ON m.user_id = u.id
  WHERE m.id = NEW.medication_id
    AND u.phone_verified = TRUE
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set user_phone
DROP TRIGGER IF EXISTS trg_set_user_phone ON schedules;
CREATE TRIGGER trg_set_user_phone
  BEFORE INSERT OR UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION set_user_phone_on_schedule();

-- Comments
COMMENT ON COLUMN users.phone IS 'User phone number in +91XXXXXXXXXX format';
COMMENT ON COLUMN users.phone_verified IS 'Whether phone has been verified via OTP';
COMMENT ON COLUMN users.phone_verified_at IS 'Timestamp of phone verification';
COMMENT ON COLUMN schedules.user_phone IS 'Cached user phone for SMS notifications';
