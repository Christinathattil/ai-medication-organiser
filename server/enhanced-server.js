import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import notifier from 'node-notifier';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import session from 'express-session';
import passport, { ensureAuthenticated, ensureAuthenticatedHTML } from './auth.js';
import {
  securityHeaders,
  apiLimiter,
  authLimiter,
  smsLimiter,
  parameterPollutionProtection,
  stripSensitiveData,
  secureErrorHandler,
  validateMedication,
  validateSchedule,
  validateId,
  validateLog
} from './security.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy - Required for Render, Railway, Heroku, etc.
// Enables Express to correctly read X-Forwarded-* headers
app.set('trust proxy', 1);

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
app.use(express.urlencoded({ extended: false })); // For Twilio webhooks

// Session configuration - Using memory store for now (simpler, works immediately)
// For production with persistence, add DATABASE_URL later
console.log('📝 Using memory sessions (simple, works immediately)');
console.log('⚠️  Note: Sessions will reset on server restart');

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// ========================================
// Security Middleware
// ========================================
app.use(securityHeaders); // Security headers
app.use(parameterPollutionProtection); // HPP protection
app.use(stripSensitiveData); // Strip sensitive data from responses
app.use('/api/', apiLimiter); // Rate limiting for API routes

// Public routes (before auth)
// Serve specific public files that don't require authentication
app.get('/login', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'login.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'login.html'));
});

app.get('/loading', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'loading.html'));
});

app.get('/loading.html', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'loading.html'));
});

// Serve static assets (CSS, JS, images, manifest) but NOT index.html
app.use(express.static(join(__dirname, '..', 'public'), {
  index: false, // Don't serve index.html automatically
  setHeaders: (res, path) => {
    // Only allow certain file types
    if (!path.endsWith('index.html')) {
      return;
    }
    // Block direct access to index.html
    res.status(404).send('Not found');
  }
}));

app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

// Import database (will use Supabase if configured, otherwise JSON)
let db;
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  const { default: supabaseDB } = await import('./supabase-db.js');
  db = supabaseDB;
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
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

// Groq AI setup
let groqClient = null;
if (process.env.GROQ_API_KEY) {
  const Groq = await import('groq-sdk');
  groqClient = new Groq.default({ apiKey: process.env.GROQ_API_KEY });
  console.log('✅ Groq AI enabled');
} else {
  console.log('⚠️  Groq not configured. AI chatbot will use fallback mode.');
}

// Helper function to send SMS with database tracking
async function sendSMS(to, message, metadata = {}) {
  if (!twilioClient) return { success: false, error: 'Twilio not configured' };
  
  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    console.log('✅ SMS sent:', result.sid);
    
    // Track SMS in database if metadata provided
    if (metadata.medication_id && metadata.schedule_id && db.addSMSReminder) {
      try {
        await db.addSMSReminder({
          medication_id: metadata.medication_id,
          schedule_id: metadata.schedule_id,
          phone_number: to,
          reminder_message: message,
          twilio_message_sid: result.sid,
          status: 'sent'
        });
        console.log('✅ SMS tracked in database');
      } catch (dbError) {
        console.error('⚠️  Failed to track SMS in database:', dbError.message);
      }
    }
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('❌ SMS error:', error.message);
    console.error('   Error code:', error.code);
    console.error('   More info:', error.moreInfo);
    return { success: false, error: error.message, code: error.code, moreInfo: error.moreInfo };
  }
}

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// ========================================
// Authentication Routes (with rate limiting)
// ========================================

// Google OAuth login
app.get('/auth/google',
  authLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback with error handling
app.get('/auth/google/callback',
  authLimiter,
  (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
      if (err) {
        console.error('❌ OAuth error:', err);
        return res.redirect('/login?error=auth_failed');
      }
      
      if (!user) {
        console.error('❌ No user returned from OAuth');
        return res.redirect('/login?error=no_user');
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('❌ Login error:', loginErr);
          return res.redirect('/login?error=login_failed');
        }
        
        console.log('✅ User authenticated:', user.email);
        return res.redirect('/loading');
      });
    })(req, res, next);
  }
);

// Logout
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.redirect('/login');
  });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Get current user
app.get('/api/auth/user', ensureAuthenticated, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    picture: req.user.picture,
    last_login: req.user.last_login
  });
});

// Protect the main app (redirect to login if not authenticated)
app.get('/', ensureAuthenticatedHTML, (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

// ========================================
// API Routes (Protected)
// ========================================

// Medications (Protected & Validated)
app.get('/api/medications', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await db.getMedications(req.query, userId);
    res.json(result); // Already wrapped with { medications: [...] }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/medications/:id', ensureAuthenticated, validateId, async (req, res) => {
  try {
    const userId = req.user?.id;
    const medication = await db.getMedication(req.params.id, userId);
    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    const schedules = await db.getSchedules({ medication_id: req.params.id }, userId);
    const logs = await db.getLogs({ medication_id: req.params.id, limit: 10 }, userId);

    res.json({ medication, schedules, recent_logs: logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/medications', ensureAuthenticated, upload.single('photo'), validateMedication, async (req, res) => {
  try {
    const userId = req.user?.id;
    const medicationData = { ...req.body };
    
    // Add photo URL if uploaded
    if (req.file) {
      medicationData.photo_url = `/uploads/${req.file.filename}`;
    }
    
    const medication = await db.addMedication(medicationData, userId);
    res.json({ success: true, medication_id: medication.id, medication });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/medications/:id', ensureAuthenticated, validateId, upload.single('photo'), validateMedication, async (req, res) => {
  try {
    const userId = req.user?.id;
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
    const result = await db.getSchedules(req.query);
    res.json(result); // Already wrapped with { schedules: [...] }
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
    const result = await sendSMS(phone, message);
    res.json({ success: result.success, message: result.success ? 'SMS sent' : result.error || 'SMS not configured' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test SMS endpoint - diagnostic tool
app.get('/api/test-sms', async (req, res) => {
  try {
    const diagnostics = {
      twilioConfigured: !!twilioClient,
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing',
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing',
      twilioPhone: process.env.TWILIO_PHONE_NUMBER || '❌ Missing',
      userPhone: process.env.USER_PHONE_NUMBER || '❌ Missing'
    };
    
    if (!twilioClient) {
      return res.json({ 
        success: false, 
        message: 'Twilio not configured',
        diagnostics 
      });
    }
    
    if (!process.env.USER_PHONE_NUMBER) {
      return res.json({ 
        success: false, 
        message: 'USER_PHONE_NUMBER not set in .env',
        diagnostics 
      });
    }
    
    // Send test SMS
    const testMessage = '🧪 Test SMS from Medication Manager - Your Twilio setup is working! 💊';
    const result = await sendSMS(process.env.USER_PHONE_NUMBER, testMessage);
    
    res.json({ 
      success: result.success, 
      message: result.success ? 'Test SMS sent successfully!' : `Failed: ${result.error}`,
      sentTo: process.env.USER_PHONE_NUMBER,
      twilioError: result.error || null,
      twilioErrorCode: result.code || null,
      twilioMoreInfo: result.moreInfo || null,
      diagnostics
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
});

// Twilio webhook endpoint to receive SMS responses
app.post('/api/sms/webhook', async (req, res) => {
  try {
    const { From: phoneNumber, Body: messageBody, MessageSid } = req.body;
    
    console.log(`📱 Received SMS from ${phoneNumber}: "${messageBody}"`);
    
    // Parse the response
    const response = messageBody.trim().toUpperCase();
    let status = null;
    let replyMessage = '';
    
    if (response === 'YES' || response === 'Y' || response === '1') {
      status = 'taken';
      replyMessage = '✅ Great! Marked as taken. Stay healthy! 💊';
    } else if (response === 'NO' || response === 'N' || response === '0') {
      status = 'skipped';
      replyMessage = '⏭️ Noted. Marked as skipped. Remember to take it when you can!';
    } else {
      // Unknown response
      replyMessage = 'Please reply with YES if you took your medication, or NO if you skipped it.';
      
      // Send TwiML response
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyMessage}</Message>
</Response>`);
      return;
    }
    
    // Find the most recent SMS reminder for this phone number
    try {
      // Look for any recent reminder from this phone number (within last 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      const { data: recentReminders, error } = await supabase
        .from('sms_reminders')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('response_received', false)
        .gte('sent_at', twoHoursAgo)
        .order('sent_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (recentReminders && recentReminders.length > 0) {
        const reminder = recentReminders[0];
        
        // Update the SMS reminder
        await db.updateSMSReminder(reminder.id, {
          response_received: true,
          response_text: messageBody,
          response_at: new Date().toISOString(),
          status: status === 'taken' ? 'responded_yes' : 'responded_no'
        });
        
        // Log the medication
        await db.logMedicationFromSMS(
          reminder.id,
          reminder.medication_id,
          reminder.schedule_id,
          status
        );
        
        console.log(`✅ Logged medication ${status} for reminder ${reminder.id} via SMS`);
      } else {
        console.log('⚠️  No matching recent reminder found');
        replyMessage = 'No recent medication reminder found. Please use the app to log your medication.';
      }
    } catch (dbError) {
      console.error('❌ Database error processing SMS response:', dbError);
      replyMessage = 'Sorry, there was an error processing your response. Please try again or use the app.';
    }
    
    // Send TwiML response
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyMessage}</Message>
</Response>`);
    
  } catch (error) {
    console.error('❌ Error processing SMS webhook:', error);
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Sorry, there was an error. Please try again later.</Message>
</Response>`);
  }
});

// AI Chat endpoint with Groq
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    
    if (!groqClient) {
      // Return error if Groq is not configured
      console.error('❌ Groq API not configured - GROQ_API_KEY missing');
      return res.status(500).json({
        error: 'AI service not configured',
        response: "⚠️ AI Assistant is not configured. Please ensure GROQ_API_KEY is set in your environment variables.",
        action: null
      });
    }

    // Get current medication context
    console.log('🔍 Fetching medications for chat context...');
    const medications = await db.getMedications({});
    console.log('📋 Medications fetched:', medications);
    console.log('📊 Medications count:', medications?.medications?.length || 0);
    
    const schedules = await db.getSchedules({});
    const todaySchedule = await db.getTodaySchedule();
    
    // Safely get counts with fallbacks
    const medCount = medications?.medications?.length || 0;
    const schedCount = schedules?.schedules?.length || 0;
    const todayCount = Array.isArray(todaySchedule) ? todaySchedule.length : 0;
    
    console.log(`📈 Context: ${medCount} meds, ${schedCount} schedules, ${todayCount} today`);
    
    // Build context for AI
    const systemPrompt = `You are a medication management assistant. Be concise, accurate, and direct.

Context: ${medCount} medications, ${schedCount} schedules, ${todayCount} doses today.

Capabilities:
1. Add medications: Extract name, dosage, form, purpose
2. Create schedules: Extract time, frequency, instructions
3. Show schedule, stats, or refills

IMPORTANT RULES:
- NEVER provide health advice, medical recommendations, or suggest medications
- For any health-related questions, always direct the user to consult their doctor
- Only help with managing existing medications that the user already has

Response format:
- Keep responses under 2-3 sentences
- Confirm extracted details clearly
- Ask for missing info directly
- No verbose explanations

When detecting intent, state what you understood and the action to be taken.`;


    // Build conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    // Call Groq API
    const completion = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Updated to supported model
      messages: messages,
      temperature: 0.7,
      max_tokens: 200, // Reduced for concise responses
    });

    const aiResponse = completion.choices[0].message.content;

    // Detect intent and extract action
    let action = null;
    const lowerMessage = message.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();

    // Intent detection with priority order
    
    // 1. Check for schedule creation intent (e.g., "schedule X at Y" or "schedule X for Y")
    if ((lowerMessage.includes('schedule') && (lowerMessage.includes(' at ') || lowerMessage.includes(' for ') || lowerMessage.includes('daily') || lowerMessage.includes('time') || lowerMessage.match(/\d+\s*(am|pm)/i))) ||
        (lowerMessage.includes('take') && (lowerMessage.includes(' at ') || lowerMessage.includes(' for ')))) {
      const medList = medications?.medications || [];
      console.log('📋 Available medications for scheduling:', medList.map(m => ({ id: m.id, name: m.name })));
      
      const scheduleData = extractScheduleFromText(message, medList);
      console.log('📅 Extracted schedule data:', scheduleData);
      
      if (scheduleData.medication_id && scheduleData.time) {
        action = { type: 'add_schedule', data: scheduleData };
        console.log('✅ Schedule action created:', action);
      } else {
        console.log('⚠️ Missing required fields - medication_id:', scheduleData.medication_id, 'time:', scheduleData.time);
      }
    }
    // 2. Check for medication addition intent
    else if ((lowerMessage.includes('add') || lowerMessage.includes('need to add') || lowerMessage.includes('start taking')) && 
             (lowerMessage.includes('medication') || lowerMessage.includes('medicine') || lowerMessage.includes('drug') || 
              lowerMessage.match(/\d+\s*(mg|ml|g|mcg|iu|units?)/i))) {
      const medicationData = extractMedicationFromText(message);
      if (medicationData.name) {
        action = { type: 'add_medication', data: medicationData };
      }
    }
    // 3. Check for viewing today's schedule
    else if ((lowerMessage.includes('today') && lowerMessage.includes('schedule')) || 
             lowerMessage.includes('what do i need to take') ||
             lowerMessage.includes('what should i take')) {
      action = { type: 'show_schedule' };
    }
    // 4. Check for stats
    else if (lowerMessage.includes('stat') || lowerMessage.includes('adherence') || 
             lowerMessage.includes('how am i doing') || lowerResponse.includes('statistic')) {
      action = { type: 'show_stats' };
    }
    // 5. Check for refills
    else if (lowerMessage.includes('refill') || lowerMessage.includes('low') || 
             lowerMessage.includes('running out') || lowerMessage.includes('need more')) {
      action = { type: 'show_refills' };
    }

    res.json({
      response: aiResponse,
      action: action
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat request',
      response: "I'm having trouble processing your request. Please try again or rephrase your question.",
      action: null
    });
  }
});

// Helper function to extract schedule details from text
function extractScheduleFromText(text, medications) {
  const data = {
    medication_id: null,
    time: '',
    frequency: 'daily',
    with_food: false,
    special_instructions: '',
    start_date: new Date().toISOString().split('T')[0] // Add today's date
  };

  const lowerText = text.toLowerCase();

  // Extract medication name by matching against existing medications
  // Use flexible matching: exact match, partial match, or first word match
  if (Array.isArray(medications) && medications.length > 0) {
    for (const med of medications) {
      if (med && med.name) {
        const medNameLower = med.name.toLowerCase();
        const medFirstWord = medNameLower.split(' ')[0]; // e.g., "aspirin" from "aspirin 500mg"
        
        // Try exact match first
        if (lowerText.includes(medNameLower)) {
          data.medication_id = med.id;
          break;
        }
        // Try matching first word (handles "aspirin" matching "Aspirin 500mg")
        if (medFirstWord.length > 3 && lowerText.includes(medFirstWord)) {
          data.medication_id = med.id;
          break;
        }
      }
    }
  }

  // Extract time with proper minute/period detection
  let timeMatch = null;
  let hour = 0;
  let minute = 0;
  let period = null;
  
  // Try HH:MM am/pm format first
  timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    minute = parseInt(timeMatch[2]);
    period = timeMatch[3];
  } else {
    // Try H am/pm format (no minutes)
    timeMatch = text.match(/(\d{1,2})\s*(am|pm)/i);
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = 0;
      period = timeMatch[2];
    }
  }
  
  if (timeMatch) {
    // Convert to 24-hour format
    if (period && period.toLowerCase() === 'pm' && hour < 12) {
      hour += 12;
    } else if (period && period.toLowerCase() === 'am' && hour === 12) {
      hour = 0;
    }
    
    data.time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  // Extract frequency
  if (lowerText.includes('daily') || lowerText.includes('every day')) {
    data.frequency = 'daily';
  } else if (lowerText.includes('weekly') || lowerText.includes('once a week')) {
    data.frequency = 'weekly';
  } else if (lowerText.includes('as needed') || lowerText.includes('when needed') || lowerText.includes('prn')) {
    data.frequency = 'as_needed';
  }

  // Check for food requirement
  if (lowerText.includes('with food') || lowerText.includes('after eating') || lowerText.includes('with meal')) {
    data.with_food = true;
  }

  // Extract special instructions
  const instructionKeywords = ['before bed', 'before sleep', 'in the morning', 'with water', 'on empty stomach'];
  for (const keyword of instructionKeywords) {
    if (lowerText.includes(keyword)) {
      data.special_instructions = keyword.charAt(0).toUpperCase() + keyword.slice(1);
      break;
    }
  }

  return data;
}

// Helper function to extract medication details from text
function extractMedicationFromText(text) {
  const data = {
    name: '',
    dosage: '',
    form: 'tablet',
    purpose: ''
  };

  // Extract dosage (e.g., 500mg, 10ml, 2.5mg)
  const dosageMatch = text.match(/(\d+\.?\d*)\s*(mg|ml|g|mcg|iu|units?)/i);
  if (dosageMatch) {
    data.dosage = dosageMatch[0];
  }

  // Extract form
  const forms = ['tablet', 'capsule', 'syrup', 'injection', 'drops', 'cream', 'inhaler', 'patch', 'spray'];
  for (const form of forms) {
    if (text.toLowerCase().includes(form)) {
      data.form = form;
      break;
    }
  }

  // Extract purpose
  const purposeKeywords = ['for', 'treats', 'treating', 'to treat', 'because'];
  for (const keyword of purposeKeywords) {
    const index = text.toLowerCase().indexOf(keyword);
    if (index !== -1) {
      const afterKeyword = text.substring(index + keyword.length).trim();
      const words = afterKeyword.split(' ').slice(0, 5);
      data.purpose = words.join(' ').replace(/[.,!?]$/, '');
      break;
    }
  }

  // Extract medication name (look for capitalized words or common patterns)
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Skip common words
    if (['add', 'my', 'the', 'a', 'an', 'medication', 'medicine', 'drug', 'take', 'taking'].includes(word.toLowerCase())) {
      continue;
    }
    // Look for medication name (usually comes after "add" or before dosage)
    if (word.match(/^[A-Za-z]+$/) && word.length > 3) {
      data.name = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      break;
    }
  }

  return data;
}

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
        
        // SMS notification (if configured)
        if (twilioClient && process.env.USER_PHONE_NUMBER) {
          // Enhanced SMS message with YES/NO response instructions
          let smsMessage = `💊 Medication Reminder: Time to take ${schedule.name} (${schedule.dosage})`;
          if (schedule.with_food) {
            smsMessage += ' - Take with food';
          }
          if (schedule.special_instructions) {
            smsMessage += ` - ${schedule.special_instructions}`;
          }
          smsMessage += '\n\nReply YES when taken or NO if skipped.';
          
          // Send SMS with tracking metadata
          const smsResult = await sendSMS(
            process.env.USER_PHONE_NUMBER, 
            smsMessage,
            {
              medication_id: schedule.medication_id,
              schedule_id: schedule.id
            }
          );
          
          if (smsResult.success) {
            console.log(`   📱 SMS sent to ${process.env.USER_PHONE_NUMBER}`);
          } else {
            console.error(`   ❌ SMS failed: ${smsResult.error}`);
          }
        }
        
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

// ========================================
// Error Handling Middleware (must be last)
// ========================================
app.use(secureErrorHandler);

// Production error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = isProduction ? `https://${process.env.RENDER_EXTERNAL_URL || 'your-app.render.com'}` : `http://localhost:${PORT}`;

  console.log(`\n🏥 Medication Manager Server running`);
  console.log(`🌐 Public URL: ${baseUrl}`);
  console.log(`📊 Dashboard: ${baseUrl}`);
  console.log(`❤️  Health Check: ${baseUrl}/health`);
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

  if (groqClient) {
    console.log(`🤖 AI Chatbot: Enabled`);
  } else {
    console.log(`⚠️  AI Chatbot: Not configured (GROQ_API_KEY needed)`);
  }

  console.log(`\n🚀 Server ready!`);
});
