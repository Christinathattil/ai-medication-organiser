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
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
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

// Configure CORS to allow credentials (needed for session cookies)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://ai-medication-organiser.onrender.com'
    : 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // For Twilio webhooks

// Session configuration - Using PostgreSQL for persistent storage
const isProduction = process.env.NODE_ENV === 'production';
const PgSession = connectPgSimple(session);

// PostgreSQL connection pool for sessions
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Test database connection
pgPool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('⚠️  Falling back to memory sessions (data will be lost on restart)');
  } else {
    console.log('✅ PostgreSQL session store connected - sessions persist across restarts');
    console.log('✅ User data is safe and will NOT be deleted automatically');
  }
});

app.use(session({
  store: new PgSession({
    pool: pgPool,
    tableName: 'session', // Table will be auto-created
    createTableIfMissing: true, // Automatically create session table
    pruneSessionInterval: 60 * 15, // Clean up expired sessions every 15 minutes
    errorLog: console.error.bind(console)
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  proxy: isProduction, // Trust proxy in production
  cookie: {
    secure: isProduction, // HTTPS only in production
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax', // Important for OAuth redirects
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
    
    // Check for duplicates (same name and dosage)
    const existingMeds = await db.getMedications({}, userId);
    const duplicate = existingMeds.medications?.find(m => 
      m.name?.toLowerCase() === medicationData.name?.toLowerCase() &&
      m.dosage?.toLowerCase() === medicationData.dosage?.toLowerCase()
    );
    
    if (duplicate) {
      return res.status(409).json({ 
        error: `${medicationData.name} ${medicationData.dosage} already exists in your medication list`,
        duplicate: true 
      });
    }
    
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
    
    // Enhanced medications list for context
    const medsList = medications?.medications || [];
    const medsContext = medsList.length > 0 
      ? `\nYour medications: ${medsList.map(m => `${m.name} (${m.dosage})`).join(', ')}`
      : '';
    
    // Build context for AI
    const systemPrompt = `You are a precise medication management assistant. Be accurate, crisp, and direct.

CURRENT CONTEXT:
- Total medications: ${medCount}
- Active schedules: ${schedCount}
- Today's doses: ${todayCount}${medsContext}

YOUR CAPABILITIES:
1. **Add Medication**: Extract name, dosage, form (tablet/capsule/syrup), purpose, quantity
2. **Add Multiple Medications**: Handle multiple medications in one request (e.g., "Add aspirin 500mg and metformin 850mg")
3. **Create Schedule**: Extract medication, time (HH:MM format), frequency, food timing (before/after food)
4. **Combined Add + Schedule**: Handle adding medication and scheduling together (e.g., "Add aspirin 500mg and schedule at 8am")
5. **Schedule Non-Existent Medication**: If user tries to schedule medication not in system, offer to add it first
6. **View Information**: Show today's schedule, statistics, or refill alerts

CRITICAL RULES:
⚠️ NEVER provide health advice or medical recommendations
⚠️ NEVER suggest what medications to take
⚠️ For health questions, always say: "Please consult your doctor"
⚠️ Only help manage medications the user already has
⚠️ If user asks something unrelated to medication management, politely redirect: "I can only help with managing your medications. Can I help you add, schedule, or view your medications?"

HANDLING COMPLEX SCENARIOS:
**Multiple Medications:**
If user mentions multiple medications (e.g., "Add aspirin paracetamol and vicks"):
- Acknowledge ALL medications mentioned: "I'll add three medications: Aspirin, Paracetamol, and Vicks."
- Process ONE at a time: "First, let's add Aspirin..."
- Ask for missing details for CURRENT medication only (be specific: "What is the dosage of Aspirin?")
- After completing one, move to next: "✅ Aspirin added! Now, what is the dosage of Paracetamol?"
- DO NOT ask about scheduling until ALL medications are added
- Keep track of which medication you're asking about - always name it explicitly
- NEVER try to add all at once
- NEVER skip any medication mentioned
- NEVER confuse scheduling responses (like "8am daily") with medication details

**Combined Add + Schedule:**
If user wants to add AND schedule (e.g., "Add aspirin 500mg and schedule it for 8am"):
- First add the medication
- Then ask for schedule details: "I'll add Aspirin 500mg. For the schedule, should you take it before food, after food, or no specific timing?"
- Create schedule after medication is added

**Schedule Non-Existent Medication:**
If user tries to schedule medication not in system:
- Say: "I don't see [medication name] in your list. Would you like to add it first? Please provide the dosage and form."
- Guide them to add it before scheduling

MANDATORY FIELDS:
**For Adding Medication:**
- Medication name (REQUIRED) - If missing, ask: "What is the medication name?"
- Dosage (REQUIRED) - If missing, ask: "What is the dosage (e.g., 500mg)?"
- Form - tablet/capsule/syrup (Ask if not mentioned: "Is it a tablet, capsule, or syrup?")
- Total Quantity - If NOT mentioned, ask: "How many units do you have? (Default: 30)"

**For Creating Schedule:**
- Medication name (REQUIRED) - Must match existing medication. If missing, ask: "Which medication should I schedule?"
- Time (REQUIRED) - If missing, ask: "What time should you take it?"
- Food timing (REQUIRED) - If missing, ask: "Should you take it before food, after food, or no specific timing?"
- Frequency - Default to "daily" if not mentioned

FOOD TIMING OPTIONS (Required for schedules):
- "before food" - Take 30-60 min before eating
- "after food" - Take 30-60 min after eating  
- "no specific timing" - Can take anytime

RESPONSE GUIDELINES:
✓ 2-3 sentences maximum
✓ Confirm extracted details: "I'll add Aspirin 500mg (30 tablets). Is that correct?"
✓ Ask directly for ONE missing field at a time: "What time should you take it?"
✓ Use natural language, avoid technical jargon
✓ If user provides unrelated input, politely redirect to medication topics
✓ For quantity: If not mentioned, ask "How many units? (I can default to 30 if you'd like)"
✓ If extraction fails, ask user to clarify: "I need the dosage. For example: 500mg"
✓ NEVER say you're having trouble - instead ask specific questions
✓ Keep responses helpful and actionable

INTENT DETECTION:
- Listen carefully for: medication names, dosages (mg/ml), times (8am, 14:00), frequencies (daily/weekly), quantities (30 tablets)
- Recognize variations: "schedule aspirin" = "set reminder for aspirin" = "when should i take aspirin"
- Extract food timing if mentioned: "with meal", "before eating", "after dinner"
- Detect out-of-context: weather, news, recipes, general questions → Redirect

Example interactions:

**Simple Add:**
User: "Add aspirin 500mg for headaches"
You: "I'll add Aspirin 500mg for headaches. Is it a tablet or capsule? How many do you have? (Default: 30)"

**Multiple Medications:**
User: "Add aspirin 500mg and metformin 850mg"
You: "I'll add two medications. First, Aspirin 500mg - is it a tablet or capsule? How many do you have?"

**Combined Add + Schedule:**
User: "Add aspirin 500mg tablet 30 pills and schedule it for 8am daily before food"
You: "I'll add Aspirin 500mg, 30 tablets and schedule it for 8:00 AM daily before food. Correct?"

**Schedule Non-Existent Medication:**
User: "Schedule vitamin D at 9am"
You: "I don't see Vitamin D in your medications. Would you like to add it first? Please provide the dosage and form (e.g., 1000IU capsule)."

**Out of Context:**
User: "What's the weather today?"
You: "I can only help with managing your medications. Can I help you add, schedule, or view your medications?"

**Missing Dosage:**
User: "Add metformin"
You: "I'll add Metformin. What is the dosage (e.g., 500mg, 850mg)?"

Always validate mandatory fields, handle multiple requests, and guide users step by step!`;


    // Build conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    // Call Groq API with retry logic
    let completion;
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      try {
        completion = await Promise.race([
          groqClient.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: messages,
            temperature: 0.7,
            max_tokens: 200, // Reduced for concise responses
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout after 10s')), 10000)
          )
        ]);
        break; // Success, exit retry loop
      } catch (err) {
        lastError = err;
        retries--;
        console.warn(`⚠️ Groq API attempt failed, ${retries} retries left:`, err.message);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }
    }
    
    if (!completion) {
      throw lastError || new Error('Failed to get AI response after retries');
    }

    const aiResponse = completion.choices[0].message.content;

    // Enhanced intent detection and action extraction
    let action = null;
    const lowerMessage = message.toLowerCase().trim();
    const lowerResponse = aiResponse.toLowerCase();
    
    console.log('🔍 Analyzing user intent from:', message);
    console.log('🤖 AI Response:', aiResponse);

    // Check conversation history for context
    const recentHistory = history.slice(-3); // Last 3 messages
    const isFollowUp = recentHistory.some(h => 
      h.role === 'assistant' && (
        h.content.toLowerCase().includes('is it a tablet') ||
        h.content.toLowerCase().includes('how many') ||
        h.content.toLowerCase().includes('what time') ||
        h.content.toLowerCase().includes('dosage') ||
        h.content.toLowerCase().includes('before food') ||
        h.content.toLowerCase().includes('after food')
      )
    );
    
    console.log('📜 Is follow-up response?', isFollowUp);
    if (isFollowUp) {
      console.log('📜 Recent conversation:', recentHistory.map(h => `${h.role}: ${h.content.substring(0, 50)}`));
    }
    
    // Check if AI response indicates action should be taken
    const aiIndicatesAction = lowerResponse.includes('i\'ll add') || 
                              lowerResponse.includes('perfect') ||
                              lowerResponse.includes('great!') ||
                              lowerResponse.includes('setting up') ||
                              lowerResponse.includes('correct?') ||
                              (lowerResponse.includes('add') && lowerResponse.includes('correct'));
    
    console.log('🎯 AI indicates action should be taken?', aiIndicatesAction);

    // Intent detection with improved pattern matching
    
    // 1. MEDICATION ADDITION - Check first as it's most specific
    const addPatterns = [
      /add (a |an |the )?(\w+)/i,
      /new (medication|medicine|drug)/i,
      /start taking (\w+)/i,
      /\b(\w+)\s+\d+\s*(mg|ml|g|mcg|iu|units?)\b/i
    ];
    const hasMedicationPattern = addPatterns.some(pattern => pattern.test(message));
    const hasAddIntent = lowerMessage.includes('add') || lowerMessage.includes('new') || 
                         lowerMessage.includes('start taking') || lowerMessage.includes('i need');
    
    if (hasAddIntent && hasMedicationPattern) {
      console.log('💊 Detected: Add Medication Intent');
      const medicationData = extractMedicationFromText(message);
      if (medicationData.name) {
        action = { type: 'add_medication', data: medicationData };
        console.log('✅ Medication action created:', action);
      }
    }
    
    // 1B. FOLLOW-UP FOR MEDICATION ADDITION
    if (!action && (isFollowUp || aiIndicatesAction)) {
      // Build conversation text ONCE for both medication and schedule extraction
      const conversationText = recentHistory.map(h => h.content).join(' ') + ' ' + message + ' ' + aiResponse;
      
      // Skip if this is clearly a scheduling response
      if (isSchedulingMessage(message)) {
        console.log('⏭️ Skipping medication extraction - detected scheduling message:', message);
        // Don't set action, let it flow to schedule extraction
      } else {
        // First, try extracting from the current message (prioritize latest user input)
        const currentMessageData = extractMedicationFromText(message);
        console.log('🔍 Current message extraction:', currentMessageData);
      
      // Then extract from full conversation for missing fields
      console.log('🔄 Extracting from conversation:', conversationText.substring(0, 200));
      
      const conversationData = extractMedicationFromText(conversationText);
      console.log('💊 Conversation extraction:', conversationData);
      
      // Merge data: prioritize current message over conversation context
      const medicationData = {
        name: currentMessageData.name || conversationData.name,
        dosage: currentMessageData.dosage || conversationData.dosage,
        form: currentMessageData.form || conversationData.form,
        purpose: currentMessageData.purpose || conversationData.purpose,
        total_quantity: currentMessageData.total_quantity || conversationData.total_quantity
      };
        console.log('✅ Merged medication data:', medicationData);
        
        // Check if we have enough data to create action
        if (medicationData.name && medicationData.dosage && medicationData.form) {
          // Set default quantity if not provided
          if (!medicationData.total_quantity) {
            medicationData.total_quantity = 30;
          }
          
          action = { type: 'add_medication', data: medicationData };
          console.log('✅ Follow-up medication action created:', action);
        }
      }  // End of else block for non-scheduling messages
      
      // Check for schedule completion
      const schedMedications = await db.getMedications({});
      const medList = schedMedications?.medications || [];
      const scheduleData = extractScheduleFromText(conversationText, medList);
      console.log('📅 Extracted schedule data from conversation:', scheduleData);
      
      // Schedule action creation - food_timing is MANDATORY
      if (!action && scheduleData.medication_id && scheduleData.time && scheduleData.food_timing) {
        // Food timing must be specified - no defaults
        action = { type: 'add_schedule', data: scheduleData };
        console.log('✅ Follow-up schedule action created:', action);
      } else if (!action && scheduleData.medication_id && scheduleData.time && !scheduleData.food_timing) {
        // Log that food timing is missing
        console.log('⚠️ Food timing missing - AI will ask for it');
      }
    }
    
    // 2. SCHEDULE CREATION - More flexible pattern matching
    const schedulePatterns = [
      /schedule|reminder|set (a )?(time|reminder)/i,
      /take .+ (at|@|around) \d+/i,
      /\d+\s*(am|pm|:\d+)/i,
      /(every|each) (day|morning|evening|night)/i,
      /(daily|weekly|twice)/i
    ];
    const hasSchedulePattern = schedulePatterns.some(pattern => pattern.test(message));
    const hasScheduleIntent = lowerMessage.includes('schedule') || lowerMessage.includes('reminder') ||
                              lowerMessage.includes('set time') || lowerMessage.includes('when should') ||
                              (lowerMessage.includes('take') && (lowerMessage.includes(' at ') || lowerMessage.includes('daily')));
    
    if (!action && (hasScheduleIntent || hasSchedulePattern)) {
      console.log('📅 Detected: Schedule Creation Intent');
      const medList = medications?.medications || [];
      console.log('📋 Available medications for scheduling:', medList.map(m => ({ id: m.id, name: m.name })));
      
      const scheduleData = extractScheduleFromText(message, medList);
      console.log('📅 Extracted schedule data:', scheduleData);
      
      // REQUIRE food_timing - it's mandatory!
      if (scheduleData.medication_id && scheduleData.time && scheduleData.food_timing) {
        action = { type: 'add_schedule', data: scheduleData };
        console.log('✅ Schedule action created:', action);
      } else if (scheduleData.medication_id || scheduleData.time) {
        // Partial data - AI will ask for missing info (including food timing)
        console.log('⚠️ Partial schedule data - AI will prompt for missing info');
        if (!scheduleData.food_timing) {
          console.log('⚠️ Missing REQUIRED field: food_timing');
        }
      }
    }
    
    // 3. VIEW TODAY'S SCHEDULE - Multiple variations
    const todayPatterns = [
      /what.*(do|should|need).*(i|we).*(take|have)/i,
      /today('s)? (schedule|medication|dose)/i,
      /show.*(today|schedule)/i,
      /list.*(today|medication)/i
    ];
    const hasTodayIntent = todayPatterns.some(pattern => pattern.test(message)) ||
                           (lowerMessage.includes('today') && (lowerMessage.includes('take') || lowerMessage.includes('schedule')));
    
    if (!action && hasTodayIntent) {
      console.log('📅 Detected: View Today\'s Schedule');
      action = { type: 'show_schedule' };
    }
    
    // 4. VIEW STATISTICS
    const statsPatterns = [
      /stat(istic)?s?/i,
      /adherence/i,
      /how (am i|are we) doing/i,
      /progress/i,
      /compliance/i
    ];
    const hasStatsIntent = statsPatterns.some(pattern => pattern.test(message)) || 
                           lowerResponse.includes('statistic');
    
    if (!action && hasStatsIntent) {
      console.log('📊 Detected: View Statistics');
      action = { type: 'show_stats' };
    }
    
    // 5. REFILL ALERTS
    const refillPatterns = [
      /refill/i,
      /running (low|out)/i,
      /need more/i,
      /low (on )?stock/i,
      /(almost|nearly) (out|finished)/i
    ];
    const hasRefillIntent = refillPatterns.some(pattern => pattern.test(message));
    
    if (!action && hasRefillIntent) {
      console.log('🔔 Detected: Refill Alerts');
      action = { type: 'show_refills' };
    }
    
    // Log final decision
    if (action) {
      console.log('✅ Final action:', action.type);
    } else {
      console.log('ℹ️ No specific action detected - conversational response');
    }

    res.json({
      response: aiResponse,
      action: action
    });

  } catch (error) {
    console.error('❌ Chat error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack?.substring(0, 500),
      name: error.name
    });
    
    // Determine error type for better user feedback
    let userMessage = "I'm having trouble processing your request. Please try again or rephrase your question.";
    
    if (error.message?.includes('API key')) {
      userMessage = "⚠️ AI service configuration error. Please contact support.";
    } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      userMessage = "⏱️ Request timeout. Please try again in a moment.";
    } else if (error.message?.includes('network') || error.message?.includes('ECONNREFUSED')) {
      userMessage = "🌐 Network error. Please check your connection and try again.";
    } else if (error.message?.includes('rate limit')) {
      userMessage = "⏳ Too many requests. Please wait a moment and try again.";
    }
    
    res.status(500).json({ 
      error: 'Failed to process chat request',
      response: userMessage,
      action: null
    });
  }
});

// Helper function to extract schedule details from text
function extractScheduleFromText(text, medications) {
  const data = {
    medication_id: null,
    medication_name: null, // Store the mentioned medication name even if not found
    time: '',
    frequency: 'daily',
    with_food: false, // Keep for backward compatibility
    food_timing: null, // MUST be specified - no default value
    special_instructions: '',
    start_date: new Date().toISOString().split('T')[0] // Add today's date
  };

  const lowerText = text.toLowerCase();

  // Extract medication name by matching against existing medications
  // Use flexible matching: exact match, partial match, or first word match
  let foundMatch = false;
  if (Array.isArray(medications) && medications.length > 0) {
    for (const med of medications) {
      if (med && med.name) {
        const medNameLower = med.name.toLowerCase();
        const medFirstWord = medNameLower.split(' ')[0]; // e.g., "aspirin" from "aspirin 500mg"
        
        // Try exact match first
        if (lowerText.includes(medNameLower)) {
          data.medication_id = med.id;
          data.medication_name = med.name;
          foundMatch = true;
          break;
        }
        // Try matching first word (handles "aspirin" matching "Aspirin 500mg")
        if (medFirstWord.length > 3 && lowerText.includes(medFirstWord)) {
          data.medication_id = med.id;
          data.medication_name = med.name;
          foundMatch = true;
          break;
        }
      }
    }
  }
  
  // If no match found, try to extract medication name from text
  if (!foundMatch) {
    // Look for "schedule [medication]" pattern
    const scheduleMatch = text.match(/schedule\s+(\w+)/i);
    if (scheduleMatch) {
      data.medication_name = scheduleMatch[1].charAt(0).toUpperCase() + scheduleMatch[1].slice(1).toLowerCase();
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

  // Extract food timing (MANDATORY field - no defaults!)
  if (lowerText.includes('before food') || lowerText.includes('before eating') || 
      lowerText.includes('before meal') || lowerText.includes('empty stomach') ||
      lowerText.includes('before breakfast') || lowerText.includes('before lunch') || 
      lowerText.includes('before dinner')) {
    data.food_timing = 'before_food';
    data.with_food = false;
  } else if (lowerText.includes('after food') || lowerText.includes('after eating') || 
             lowerText.includes('after meal') || lowerText.includes('with meal') ||
             lowerText.includes('after breakfast') || lowerText.includes('after lunch') || 
             lowerText.includes('after dinner')) {
    data.food_timing = 'after_food';
    data.with_food = false;
  } else if (lowerText.includes('with food') || lowerText.includes('during meal')) {
    // Convert old "with food" to "before food" for backward compatibility
    data.food_timing = 'before_food';
    data.with_food = false;
  } else if (lowerText.includes('no timing') || lowerText.includes('no specific') || 
             lowerText.includes('anytime') || lowerText.includes('any time')) {
    data.food_timing = 'none';
    data.with_food = false;
  }
  // If not matched, leave as null - AI MUST ask for it!

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

// Helper function to detect if message is about scheduling (not medication details)
function isSchedulingMessage(text) {
  const lowerText = text.toLowerCase();
  
  // Time patterns: 8am, 10:30pm, 8 am, etc.
  const hasTimePattern = /\b\d{1,2}(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.)\b/i.test(text) ||
                         /\b(morning|afternoon|evening|night|daily|twice|thrice|weekly)\b/i.test(text);
  
  // Food timing patterns
  const hasFoodTiming = /\b(before|after)\s+(food|meal|eating|breakfast|lunch|dinner)\b/i.test(text);
  
  // Frequency patterns
  const hasFrequency = /\b(daily|twice|thrice|once|every|day|week|hour)\b/i.test(text);
  
  // Schedule keywords
  const hasScheduleKeywords = /\b(schedule|reminder|time|when|alarm)\b/i.test(text);
  
  // If message is SHORT (< 15 words) AND has time/scheduling patterns, it's likely a schedule response
  const wordCount = text.split(/\s+/).length;
  const isShortMessage = wordCount < 15;
  
  return isShortMessage && (hasTimePattern || hasFoodTiming) && !(/\b(add|new|medication|medicine|aspirin|paracetamol|drug)\b/i.test(text));
}

// Helper function to extract medication details from text
function extractMedicationFromText(text) {
  const data = {
    name: '',
    dosage: '',
    form: 'tablet',
    purpose: '',
    total_quantity: null // Will be set to 30 as default if not specified
  };

  const lowerText = text.toLowerCase();

  // IMPROVED: Extract dosage with better patterns
  // Matches: 500mg, 500 mg, 2.5mg, 1000IU, 10ml, etc.
  const dosagePatterns = [
    /(\d+\.?\d*)\s*(mg|ml|g|mcg|iu|units?)\b/gi,
    /(\d+\.?\d*)\s*milligram/gi,
    /(\d+\.?\d*)\s*milliliter/gi
  ];
  
  for (const pattern of dosagePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.dosage = match[0].trim();
      break;
    }
  }
  
  // IMPROVED: Extract quantity with multiple patterns
  // Priority 1: "X tablets/pills/capsules"
  const quantityPattern1 = text.match(/(\d+)\s*(tablet|capsule|pill|dose|drop|spray|patch|ml|bottle)s?\b/i);
  if (quantityPattern1) {
    data.total_quantity = parseInt(quantityPattern1[1]);
  } else {
    // Priority 2: Just a number followed by optional "units"
    // But only if it's reasonable (2-200 range) and not a dosage
    const standaloneMatch = text.match(/\b(\d+)\s*(?:units?|count|pieces?)?\b/gi);
    if (standaloneMatch) {
      // Filter out dosage numbers by checking if they have mg/ml/etc nearby
      for (const match of standaloneMatch) {
        const num = parseInt(match);
        if (num >= 1 && num <= 200) {
          // Make sure it's not part of dosage (e.g., not "500" from "500mg")
          const matchIndex = text.toLowerCase().indexOf(match.toLowerCase());
          const surroundingText = text.substring(Math.max(0, matchIndex - 5), matchIndex + match.length + 5);
          if (!surroundingText.match(/\d+\.?\d*\s*(mg|ml|g|mcg|iu)/i)) {
            data.total_quantity = num;
            break;
          }
        }
      }
    }
  }

  // IMPROVED: Extract form with more variants
  const formMappings = {
    'tablet': ['tablet', 'tab', 'pill'],
    'capsule': ['capsule', 'cap'],
    'liquid': ['syrup', 'liquid', 'solution'],  // Changed from 'syrup' to match validator
    'injection': ['injection', 'shot'],
    'drops': ['drops', 'drop'],
    'cream': ['cream', 'ointment', 'gel'],
    'inhaler': ['inhaler', 'puff'],
    'patch': ['patch'],
    'other': ['spray', 'powder', 'suppository']  // Map uncommon forms to 'other'
  };
  
  for (const [formName, variants] of Object.entries(formMappings)) {
    if (variants.some(v => lowerText.includes(v))) {
      data.form = formName;
      break;
    }
  }

  // IMPROVED: Extract purpose
  const purposeKeywords = [
    { keyword: 'for', minWords: 1 },
    { keyword: 'treats', minWords: 1 },
    { keyword: 'treating', minWords: 1 },
    { keyword: 'to treat', minWords: 1 },
    { keyword: 'because', minWords: 2 },
    { keyword: 'to help with', minWords: 1 }
  ];
  
  for (const { keyword, minWords } of purposeKeywords) {
    const index = lowerText.indexOf(keyword);
    if (index !== -1) {
      const afterKeyword = text.substring(index + keyword.length).trim();
      const words = afterKeyword.split(/\s+/).slice(0, 5);
      if (words.length >= minWords) {
        let purpose = words.join(' ').replace(/[.,!?;]$/, '').trim();
        
        // Filter out AI response artifacts and invalid text
        // Skip if contains parentheses (e.g., "m (e.g., tablet...)") or "e.g."
        if (purpose.includes('(') || purpose.includes(')') || 
            purpose.toLowerCase().includes('e.g.') || 
            purpose.toLowerCase().includes('default') ||
            purpose.length < 3) {
          continue;
        }
        
        data.purpose = purpose;
        if (data.purpose.length > 0) break;
      }
    }
  }

  // IMPROVED: Extract medication name with better logic
  // Strategy: Find the first meaningful word after "add" or similar triggers
  const addTriggers = ['add', 'new', 'start', 'begin', 'taking', 'take', 'need', 'have'];
  const skipWords = ['a', 'an', 'the', 'my', 'medication', 'medicine', 'drug', 'med', 'and', 'or', 
                     'tablet', 'tablets', 'capsule', 'capsules', 'pill', 'pills', 'syrup', 'syrups',
                     'unit', 'units', 'dose', 'doses', 'bottle', 'bottles', 'mg', 'ml', 'g', 'mcg', 'iu'];
  
  // Try pattern 1: "add [medication]" or similar
  for (const trigger of addTriggers) {
    const pattern = new RegExp(`\\b${trigger}\\s+([a-z]+)`, 'i');
    const match = text.match(pattern);
    if (match && !skipWords.includes(match[1].toLowerCase())) {
      data.name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      break;
    }
  }
  
  // Try pattern 2: Look for capitalized word or common medication names
  if (!data.name) {
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^a-zA-Z]/g, '');
      if (word.length < 2) continue;
      if (skipWords.includes(word.toLowerCase())) continue;
      if (addTriggers.includes(word.toLowerCase())) continue;
      
      // Check if it's a potential medication name
      // - At least 3 characters
      // - Not a common word
      // - Either capitalized or lowercase (handle both)
      if (word.length >= 3 && word.match(/^[a-zA-Z]+$/)) {
        data.name = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        break;
      }
    }
  }
  
  // Try pattern 3: Extract from compound statements like "aspirin 500mg" or "aspirin paracetamol"
  if (!data.name) {
    const medicationPattern = text.match(/\b([a-z]{3,})\s+(?:\d+|and|or)/i);
    if (medicationPattern && !skipWords.includes(medicationPattern[1].toLowerCase())) {
      data.name = medicationPattern[1].charAt(0).toUpperCase() + medicationPattern[1].slice(1).toLowerCase();
    }
  }

  console.log('🔍 Extracted medication data:', data);
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
  // RENDER_EXTERNAL_URL already includes protocol (https://), so don't add it again
  const baseUrl = isProduction ? (process.env.RENDER_EXTERNAL_URL || 'https://your-app.render.com') : `http://localhost:${PORT}`;

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
