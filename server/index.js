import express from 'express';
import cors from 'cors';
import db from './database.js';
import cron from 'node-cron';
import notifier from 'node-notifier';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

// API Routes

// Medications
app.get('/api/medications', (req, res) => {
  try {
    const medications = db.getMedications(req.query);
    res.json({ medications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/medications/:id', (req, res) => {
  try {
    const medication = db.getMedication(req.params.id);
    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    const schedules = db.getSchedules({ medication_id: req.params.id });
    const logs = db.getLogs({ medication_id: req.params.id, limit: 10 });

    res.json({ medication, schedules, recent_logs: logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/medications', (req, res) => {
  try {
    const medication = db.addMedication(req.body);
    res.json({ success: true, medication_id: medication.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/medications/:id', (req, res) => {
  try {
    db.updateMedication(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/medications/:id', (req, res) => {
  try {
    db.deleteMedication(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedules
app.get('/api/schedules', (req, res) => {
  try {
    const schedules = db.getSchedules(req.query);
    res.json({ schedules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/schedules', (req, res) => {
  try {
    const schedule = db.addSchedule(req.body);
    res.json({ success: true, schedule_id: schedule.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/schedules/:id', (req, res) => {
  try {
    db.updateSchedule(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/schedules/:id', (req, res) => {
  try {
    db.deleteSchedule(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Medication Logs
app.post('/api/logs', (req, res) => {
  try {
    const log = db.addLog(req.body);
    res.json({ success: true, log_id: log.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs', (req, res) => {
  try {
    const history = db.getLogs(req.query);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Today's Schedule
app.get('/api/schedule/today', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const schedules = db.getTodaySchedule();
    res.json({ date: today, schedules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refill Alerts
app.get('/api/refill-alerts', (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 7;
    const medications = db.getRefillAlerts(threshold);
    res.json({ threshold, medications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Quantity
app.post('/api/medications/:id/quantity', (req, res) => {
  try {
    const { quantity_change, is_refill } = req.body;
    db.updateQuantity(req.params.id, quantity_change, is_refill);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adherence Stats
app.get('/api/stats/adherence', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const medication_id = req.query.medication_id;
    const statistics = db.getAdherenceStats(days, medication_id);
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
app.get('/api/interactions', (req, res) => {
  try {
    const interactions = db.getInteractions(req.query.medication_id);
    res.json({ interactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/interactions', (req, res) => {
  try {
    const interaction = db.addInteraction(req.body);
    res.json({ success: true, interaction_id: interaction.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reminder System - Check every minute
cron.schedule('* * * * *', () => {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const today = now.toISOString().split('T')[0];
  
  const schedules = db.getTodaySchedule();
  
  schedules.forEach(schedule => {
    if (schedule.time === currentTime && schedule.status === 'pending') {
      notifier.notify({
        title: '💊 Medication Reminder',
        message: `Time to take ${schedule.name} (${schedule.dosage})`,
        sound: true,
        wait: false,
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`\n🏥 Medication Manager Server running at http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔔 Reminders: Active\n`);
});
