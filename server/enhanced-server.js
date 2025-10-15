import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import notifier from 'node-notifier';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'med-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

// Import database (will use Supabase if configured, otherwise JSON)
let db;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  const { default: supabaseDB } = await import('./supabase-db.js');
  db = supabaseDB;
  console.log('✅ Using Supabase (persistent storage)');
} else {
  const { default: jsonDB } = await import('./database.js');
  db = jsonDB;
  console.log('⚠️  Using JSON storage (temporary). Setup Supabase for persistence!');
}

// Twilio SMS setup (optional)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const twilio = await import('twilio');
  twilioClient = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log('✅ Twilio SMS enabled');
} else {
  console.log('⚠️  Twilio not configured. SMS notifications disabled.');
}

// Helper function to send SMS
async function sendSMS(to, message) {
  if (!twilioClient) return false;
  
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    return true;
  } catch (error) {
    console.error('SMS error:', error.message);
    return false;
  }
}

// API Routes

// Medications
app.get('/api/medications', async (req, res) => {
  try {
    const medications = await db.getMedications(req.query);
    res.json({ medications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/medications/:id', async (req, res) => {
  try {
    const medication = await db.getMedication(req.params.id);
    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    const schedules = await db.getSchedules({ medication_id: req.params.id });
    const logs = await db.getLogs({ medication_id: req.params.id, limit: 10 });

    res.json({ medication, schedules, recent_logs: logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/medications', upload.single('photo'), async (req, res) => {
  try {
    const medicationData = { ...req.body };
    
    // Add photo URL if uploaded
    if (req.file) {
      medicationData.photo_url = `/uploads/${req.file.filename}`;
    }
    
    const medication = await db.addMedication(medicationData);
    res.json({ success: true, medication_id: medication.id, medication });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/medications/:id', upload.single('photo'), async (req, res) => {
  try {
    const updates = { ...req.body };
    
    // Add photo URL if uploaded
    if (req.file) {
      updates.photo_url = `/uploads/${req.file.filename}`;
    }
    
    await db.updateMedication(req.params.id, updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/medications/:id', async (req, res) => {
  try {
    await db.deleteMedication(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedules
app.get('/api/schedules', async (req, res) => {
  try {
    const schedules = await db.getSchedules(req.query);
    res.json({ schedules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/schedules', async (req, res) => {
  try {
    const schedule = await db.addSchedule(req.body);
    res.json({ success: true, schedule_id: schedule.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/schedules/:id', async (req, res) => {
  try {
    await db.updateSchedule(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    await db.deleteSchedule(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Medication Logs
app.post('/api/logs', async (req, res) => {
  try {
    const log = await db.addLog(req.body);
    res.json({ success: true, log_id: log.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const history = await db.getLogs(req.query);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Today's Schedule
app.get('/api/schedule/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const schedules = await db.getTodaySchedule();
    res.json({ date: today, schedules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refill Alerts
app.get('/api/refill-alerts', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 7;
    const medications = await db.getRefillAlerts(threshold);
    res.json({ threshold, medications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Quantity
app.post('/api/medications/:id/quantity', async (req, res) => {
  try {
    const { quantity_change, is_refill } = req.body;
    await db.updateQuantity(req.params.id, quantity_change, is_refill);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adherence Stats
app.get('/api/stats/adherence', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const medication_id = req.query.medication_id;
    const statistics = await db.getAdherenceStats(days, medication_id);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    res.json({ 
      period_days: days, 
      start_date: startDate.toISOString().split('T')[0], 
      statistics 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Interactions
app.get('/api/interactions', async (req, res) => {
  try {
    const interactions = await db.getInteractions(req.query.medication_id);
    res.json({ interactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/interactions', async (req, res) => {
  try {
    const interaction = await db.addInteraction(req.body);
    res.json({ success: true, interaction_id: interaction.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SMS Notification endpoint
app.post('/api/send-sms', async (req, res) => {
  try {
    const { phone, message } = req.body;
    const sent = await sendSMS(phone, message);
    res.json({ success: sent, message: sent ? 'SMS sent' : 'SMS not configured' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reminder System - Check every minute
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = now.toISOString().split('T')[0];
  
  console.log(`⏰ Checking schedules at ${currentTime}...`);
  
  try {
    const schedules = await db.getTodaySchedule();
    console.log(`📋 Found ${schedules.length} schedules for today`);
    
    let notificationsSent = 0;
    
    for (const schedule of schedules) {
      console.log(`   - ${schedule.name} at ${schedule.time} (status: ${schedule.status})`);
      
      if (schedule.time === currentTime && schedule.status === 'pending') {
        console.log(`   ✅ SENDING NOTIFICATION for ${schedule.name}!`);
        
        // Desktop notification
        notifier.notify({
          title: '💊 Medication Reminder',
          message: `Time to take ${schedule.name} (${schedule.dosage})`,
          sound: true,
          wait: false,
        });
        
        notificationsSent++;
      }
    }
    
    if (notificationsSent > 0) {
      console.log(`✅ Sent ${notificationsSent} notification(s)`);
    }
  } catch (error) {
    console.error('❌ Reminder error:', error);
  }
});

app.listen(PORT, () => {
  console.log(`\n🏥 Medication Manager Server running at http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔔 Reminders: Active`);
  console.log(`📸 Photo uploads: Enabled`);
  
  if (process.env.SUPABASE_URL) {
    console.log(`💾 Database: Supabase (persistent)`);
  } else {
    console.log(`⚠️  Database: JSON (temporary - setup Supabase!)`);
  }
  
  if (twilioClient) {
    console.log(`📱 SMS: Enabled`);
  } else {
    console.log(`⚠️  SMS: Not configured`);
  }
  
  console.log(`\n`);
});
