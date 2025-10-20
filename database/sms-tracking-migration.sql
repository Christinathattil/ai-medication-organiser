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
