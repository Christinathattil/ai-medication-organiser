#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for cron job
);

// Twilio client
let twilioClient = null;
let smsEnabled = false;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  smsEnabled = true;
  console.log('📱 Twilio configured for SMS reminders');
} else {
  console.log('⚠️  Twilio not configured. Set TWILIO_* env vars to enable SMS.');
  process.exit(0); // Exit gracefully if SMS not configured
}

// Main function to check and send reminders
async function checkAndSendReminders() {
  try {
    console.log('🔍 Checking for medication reminders...');
    
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = now.toISOString().split('T')[0];
    
    console.log(`⏰ Current time: ${currentTime} on ${today}`);

    // Get all schedules for today that match current time
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select(`
        id,
        time,
        frequency,
        food_timing,
        medication_id,
        medications (
          id,
          name,
          dosage,
          form,
          user_id,
          users (
            id,
            email,
            name,
            phone,
            phone_verified
          )
        )
      `)
      .eq('time', currentTime)
      .eq('start_date', today);

    if (error) {
      console.error('❌ Error fetching schedules:', error);
      return;
    }

    if (!schedules || schedules.length === 0) {
      console.log('✅ No reminders to send at this time');
      return;
    }

    console.log(`📋 Found ${schedules.length} schedule(s) to process`);

    // Send SMS for each schedule
    for (const schedule of schedules) {
      try {
        const medication = schedule.medications;
        const user = medication.users;

        if (!user) {
          console.log(`⚠️  No user found for medication ${medication.name}`);
          continue;
        }

        if (!user.phone || !user.phone_verified) {
          console.log(`⚠️  User ${user.email} doesn't have verified phone. Skipping SMS.`);
          continue;
        }

        // Check if we already sent reminder for this schedule today
        const { data: existingReminder } = await supabase
          .from('sms_reminders')
          .select('id')
          .eq('schedule_id', schedule.id)
          .eq('sent_at', today)
          .single();

        if (existingReminder) {
          console.log(`⏭️  Already sent reminder for ${medication.name} to ${user.email}`);
          continue;
        }

        // Compose SMS message
        const foodInstruction = schedule.food_timing !== 'none' 
          ? ` ${schedule.food_timing.replace('_', ' ')}` 
          : '';
        
        const message = `💊 MEDICATION REMINDER\n\n` +
          `Time to take: ${medication.name}\n` +
          `Dosage: ${medication.dosage}\n` +
          `Form: ${medication.form}${foodInstruction}\n\n` +
          `Reply YES to confirm or NO to skip.`;

        // Send SMS via Twilio
        const smsResponse = await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: user.phone
        });

        console.log(`✅ SMS sent to ${user.phone} for ${medication.name}`);
        console.log(`   Message SID: ${smsResponse.sid}`);

        // Log SMS in database
        await supabase
          .from('sms_reminders')
          .insert([{
            schedule_id: schedule.id,
            medication_id: medication.id,
            user_phone: user.phone,
            message_body: message,
            sent_at: now.toISOString(),
            twilio_sid: smsResponse.sid,
            status: 'sent'
          }]);

      } catch (smsError) {
        console.error(`❌ Error sending SMS for schedule ${schedule.id}:`, smsError.message);
      }
    }

    console.log('✅ Reminder check complete');

  } catch (error) {
    console.error('❌ Error in checkAndSendReminders:', error);
  }
}

// Run the function
checkAndSendReminders()
  .then(() => {
    console.log('👋 Cron job finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
