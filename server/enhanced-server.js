import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import notifier from 'node-notifier';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import Groq from 'groq-sdk';

import { validateMedicationData, validateScheduleData } from './ai-validation.js';
import pg from 'pg';
import passport, { ensureAuthenticated, ensureAuthenticatedHTML } from './auth.js';
import {
  securityHeaders,
  apiLimiter,
  authLimiter,

  parameterPollutionProtection,
  stripSensitiveData,
  secureErrorHandler,
  validateMedication,
  validateMedicationPatch,
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
const allowedOrigins = [
  'http://localhost:8080',
  'https://ai-medication-organiser.onrender.com',
  process.env.RENDER_EXTERNAL_URL, // Render provides this automatically
  process.env.PUBLIC_URL // Custom domain if configured
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration - Using PostgreSQL for persistent storage
const isProduction = process.env.NODE_ENV === 'production';
const PgSession = connectPgSimple(session);

// PostgreSQL connection pool for sessions
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000, // 30 seconds
  max: 10 // Maximum pool size
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
    sameSite: 'lax', // Use 'lax' for OAuth redirects (same-site)
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    domain: isProduction ? undefined : undefined // Let browser set domain automatically
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
  // If already authenticated, redirect to appropriate page
  if (req.isAuthenticated()) {
    console.log('🔄 Already authenticated, redirecting from login to loading');
    return res.redirect('/loading');
  }
  res.sendFile(join(__dirname, '..', 'public', 'login.html'));
});

app.get('/login.html', (req, res) => {
  // If already authenticated, redirect to appropriate page
  if (req.isAuthenticated()) {
    console.log('🔄 Already authenticated, redirecting from login.html to loading');
    return res.redirect('/loading');
  }
  res.sendFile(join(__dirname, '..', 'public', 'login.html'));
});

app.get('/loading', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'loading.html'));
});

app.get('/loading.html', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'loading.html'));
});

app.get('/verify-phone.html', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'verify-phone.html'));
});

// Block direct access to index.html (must be before static middleware)
app.use((req, res, next) => {
  if (req.path === '/index.html' || req.path === '/public/index.html') {
    return res.status(404).send('Not Found');
  }
  next();
});

// Serve static assets (CSS, JS, images, manifest)
app.use(express.static(join(__dirname, '..', 'public'), {
  index: false // Don't serve index.html automatically
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




// Google Gemini AI setup
import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let geminiModel = null;

if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  console.log('✅ Using Google Gemini AI for chatbot (gemini-1.5-flash)');
} else {
  console.log('⚠️  GEMINI_API_KEY not configured. Chatbot will not work.');
  console.log('   Get your free API key from: https://aistudio.google.com/app/apikey');
}

// Gemini AI caller helper with retry logic
async function callAI(messages) {
  if (!geminiModel) {
    throw new Error('GEMINI_API_KEY missing. Get one from: https://aistudio.google.com/app/apikey');
  }

  try {
    // Convert messages to Gemini format
    // Gemini uses a simpler format: system instruction + user/model alternating messages
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Build the prompt with system context
    let prompt = '';
    if (systemMessage) {
      prompt = `${systemMessage.content}\n\n`;
    }

    // Add conversation history
    conversationMessages.forEach(msg => {
      if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Assistant: ${msg.content}\n`;
      }
    });

    // Add final prompt
    prompt += '\nAssistant:';

    // Call Gemini API with retry logic
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text) {
          throw new Error('Empty response from Gemini');
        }

        return text;
      } catch (error) {
        lastError = error;
        console.error(`Gemini API attempt ${attempt} failed:`, error.message);

        // Don't retry on quota errors
        if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
          throw new Error('Gemini API quota exceeded. Please try again later or upgrade to a paid plan.');
        }

        // Wait before retry (exponential backoff)
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // All retries failed
    throw new Error(`Gemini API failed after 3 attempts: ${lastError?.message || 'Unknown error'}`);
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    throw error;
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
        console.log('📱 Phone verified status:', user.phone_verified || false);
        console.log('🔐 Session ID:', req.sessionID);

        // Save session explicitly before redirect
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error('❌ Session save error:', saveErr);
            return res.redirect('/login?error=session_failed');
          }
          console.log('✅ Session saved successfully');
          return res.redirect('/loading');
        });
      });
    })(req, res, next);
  }
);

// Logout – add full session destroy to prevent stale data between accounts
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    // Destroy the entire session so no data bleeds into the next login
    req.session.destroy(() => {
      /* Explicitly clear cookie – some browsers cache aggressively */
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });
  });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
  console.log('🔍 Auth status check:');
  console.log('  - Session ID:', req.sessionID);
  console.log('  - Session exists:', !!req.session);
  console.log('  - User in session:', !!req.user);
  console.log('  - Is authenticated:', req.isAuthenticated());

  if (req.isAuthenticated()) {
    console.log('  ✅ User authenticated:', req.user.email);
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
    console.log('  ❌ Not authenticated');
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
  // Check if phone verification is required (can be disabled for testing)

  console.log(`✅ Root route: User ${req.user?.email} accessing dashboard`);
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

// PATCH – partial update
app.patch('/api/medications/:id', ensureAuthenticated, validateId, upload.single('photo'), validateMedicationPatch, async (req, res) => {
  try {
    const userId = req.user?.id;
    const updates = { ...req.body };
    if (req.file) {
      updates.photo_url = `/uploads/${req.file.filename}`;
    }
    await db.updateMedication(req.params.id, updates, userId);
    res.json({ success: true });
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

    await db.updateMedication(req.params.id, updates, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/medications/:id', ensureAuthenticated, validateId, async (req, res) => {
  try {
    const userId = req.user?.id;
    await db.deleteMedication(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schedules
app.get('/api/schedules', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await db.getSchedules(req.query, userId);
    res.json(result); // Already wrapped with { schedules: [...] }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/schedules', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const schedule = await db.addSchedule(req.body, userId);
    res.json({ success: true, schedule_id: schedule.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/schedules/:id', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    await db.updateSchedule(req.params.id, req.body, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/schedules/:id', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    await db.deleteSchedule(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Medication Logs
app.post('/api/logs', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const log = await db.addLog(req.body, userId);
    res.json({ success: true, log_id: log.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const history = await db.getLogs(req.query, userId);
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Today's Schedule
app.get('/api/schedules/today', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const today = new Date().toISOString().split('T')[0];
    const schedules = await db.getTodaySchedule(userId);
    res.json({ date: today, schedules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refill Alerts
app.get('/api/refill-alerts', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const threshold = parseInt(req.query.threshold) || 7;
    const medications = await db.getRefillAlerts(threshold, userId);
    res.json({ threshold, medications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Quantity
app.post('/api/medications/:id/quantity', ensureAuthenticated, async (req, res) => {
  try {
    const { quantity_change, is_refill } = req.body;
    await db.updateQuantity(req.params.id, quantity_change, is_refill);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adherence Stats
app.get('/api/stats/adherence', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const days = parseInt(req.query.days) || 30;
    const medication_id = req.query.medication_id;
    const statistics = await db.getAdherenceStats(days, medication_id, userId);
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
app.get('/api/interactions', ensureAuthenticated, async (req, res) => {
  try {
    const interactions = await db.getInteractions(req.query.medication_id);
    res.json({ interactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/interactions', ensureAuthenticated, async (req, res) => {
  try {
    const interaction = await db.addInteraction(req.body);
    res.json({ success: true, interaction_id: interaction.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




// AI Chat endpoint with Groq
app.post('/api/chat', ensureAuthenticated, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        response: "Please log in to use the AI assistant.",
        action: null
      });
    }


    // Get current medication context with userId
    console.log('🔍 Fetching medications for chat context...');
    const medications = await db.getMedications({}, userId);
    console.log('📋 Medications fetched:', medications);
    console.log('📊 Medications count:', medications?.medications?.length || 0);

    const schedules = await db.getSchedules({}, userId);
    const todaySchedule = await db.getTodaySchedule(userId);

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
3. **Delete Medication**: Remove medications by name (e.g., "delete aspirin", "remove vicks")
4. **Edit/Update Medication**: Modify medication details (e.g., "update aspirin dosage to 500mg", "change paracetamol quantity to 50")
5. **Create Schedule**: Extract medication, time (HH:MM format), frequency, food timing (before/after food)
6. **Delete Schedule**: Remove schedules for specific medications (e.g., "delete schedule for aspirin", "remove reminder for vicks")
7. **Edit/Update Schedule**: Modify schedule timing or settings (e.g., "change aspirin time to 9am", "update vicks to after food")
8. **Combined Add + Schedule**: Handle adding medication and scheduling together (e.g., "Add aspirin 500mg and schedule at 8am")
9. **Schedule Non-Existent Medication**: If user tries to schedule medication not in system, offer to add it first
10. **View Information**: Show today's schedule, statistics, or refill alerts

CRITICAL RULES:
⚠️ NEVER provide health advice or medical recommendations
⚠️ NEVER suggest what medications to take
⚠️ For health questions, always say: "Please consult your doctor"
⚠️ Only help manage medications the user already has
⚠️ If user asks something unrelated to medication management, politely redirect: "I can only help with managing your medications. Can I help you add, schedule, or view your medications?"

IMPORTANT: EXTRACT ALL AVAILABLE INFORMATION IN ONE PASS
When the user provides medication or schedule details in their message:
- Extract EVERY piece of information mentioned (name, dosage, form, quantity, purpose, time, frequency, food timing, etc.)
- Do NOT ask for information that was already provided
- Only ask for MISSING required fields
- When all required fields are present, the system will automatically open a pre-filled form for the user to review
- The user will see the form with all details you extracted, can modify anything, and click submit to confirm
- Your job is to extract as much as possible so the form is well-populated for easy user review

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

**Delete/Remove Operations:**
If user wants to delete medications or schedules:
- For deleting medications: "delete vicks" → Confirm: "I'll delete Vicks (5 ml, tablet). Are you sure?"
- For multiple deletions: "delete all vicks" → List all matches and confirm
- Always confirm before deleting to prevent accidents
- After deletion, confirm: "✅ Vicks has been deleted from your medications."

**Edit/Update Operations:**
If user wants to edit/update medications:
- Identify what field to update: dosage, quantity, form, etc.
- For dosage: "update aspirin dosage to 500mg" → "I'll update Aspirin dosage to 500mg. Correct?"
- For quantity: "change paracetamol to 50 tablets" → "I'll update Paracetamol quantity to 50. Correct?"
- Always confirm the change before applying

**Combined Add + Schedule:**
If user wants to add AND schedule (e.g., "Add aspirin 500mg tablet 30 pills and schedule it for 8am before food"):
- Extract BOTH medication details AND schedule details from the message
- If all required fields for both are present, the form will be pre-filled
- If any required field is missing, ask for it specifically
- Example: "I've extracted Aspirin 500mg tablet, 30 pills, scheduled for 8:00 AM before food. Opening the form for you to review..."

**Schedule Non-Existent Medication:**
If user tries to schedule medication not in system:
- Say: "I don't see [medication name] in your list. Would you like to add it first? Please provide the dosage and form."
- Guide them to add it before scheduling

MANDATORY FIELDS:
**For Adding Medication:**
- Medication name (REQUIRED) - If missing, ask: "What is the medication name?"
- Dosage (REQUIRED) - If missing, ask: "What is the dosage (e.g., 500mg)?"
- Form (REQUIRED) - If missing, ask: "What form is it? Options: tablet, capsule, liquid, injection, cream, inhaler, drops, patch, or other."
- Total Quantity - If NOT mentioned, ask: "How many units do you have? (I can default to 30 if you'd like)"

**Optional Fields (ask ONLY if user seems to want to provide them):**
- Purpose (optional) - Generally provided by user if relevant
- Prescribing Doctor (optional) - Only if user mentions
- Prescription Date (optional) - Only if user mentions
- Side Effects (optional) - Only if user mentions
- Notes (optional) - Only if user mentions

DO NOT ask for optional fields unless the user indicates they want to provide them.

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
✓ Confirm extracted details when complete: "I've extracted Aspirin 500mg tablet (30 units). Opening the form for you to review..."
✓ Ask directly for ONE missing field at a time: "What time should you take it?"
✓ When asking for fields with LIMITED OPTIONS, ALWAYS list the options:
  - Form: "What form is it? Options: tablet, capsule, liquid, injection, cream, inhaler, drops, patch, or other."
  - Food timing: "Should you take it before food, after food, or no specific timing?"
✓ Use natural language, avoid technical jargon
✓ If user provides unrelated input, politely redirect to medication topics
✓ For quantity: If not mentioned, ask "How many units? (I can default to 30 if you'd like)"
✓ If extraction fails, ask user to clarify: "I need the dosage. For example: 500mg"
✓ NEVER say you're having trouble - instead ask specific questions
✓ Keep responses helpful and actionable
✓ When all required info is collected, say "Opening the form for you to review..." - the system will handle the rest

INTENT DETECTION:
- Listen carefully for: medication names, dosages (mg/ml), times (8am, 14:00), frequencies (daily/weekly), quantities (30 tablets)
- Recognize variations: "schedule aspirin" = "set reminder for aspirin" = "when should i take aspirin"
- Extract food timing if mentioned: "with meal", "before eating", "after dinner"
- Detect out-of-context: weather, news, recipes, general questions → Redirect

Example interactions:

**Simple Add:**
User: "Add aspirin 500mg tablet for headaches"
You: "I've extracted Aspirin 500mg tablet for headaches. How many do you have? (Default: 30)"

**Complete Add:**
User: "Add aspirin 500mg tablet 30 pills for headaches"
You: "I've extracted Aspirin 500mg tablet, 30 pills for headaches. Opening the form for you to review..."

**Multiple Medications:**
User: "Add aspirin 500mg and metformin 850mg"
You: "I'll add two medications. First, Aspirin 500mg - is it a tablet or capsule? How many do you have?"

**Combined Add + Schedule:**
User: "Add aspirin 500mg tablet 30 pills and schedule it for 8am daily before food"
You: "I've extracted Aspirin 500mg tablet (30 pills) and schedule for 8:00 AM daily before food. Opening the form for you to review..."

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

    // Obtain AI response from Fireworks
    const aiResponse = await callAI(messages);

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
      console.log('🔍 Extracted medication data:', medicationData);

      // Validate extracted medication data
      const validation = validateMedicationData(medicationData);

      if (!validation.valid) {
        console.log('⚠️ Validation errors:', validation.errors);
        // Log validation errors for monitoring
        // The AI will naturally ask for missing/invalid fields based on the conversation
      } else {
        console.log('✅ Medication data validated successfully');
      }

      // Only create action if we have REQUIRED fields and validation passes
      // Use sanitized data from validation if valid, otherwise use raw data (AI will ask for corrections)
      const dataToUse = validation.valid ? validation.sanitized : medicationData;

      if (dataToUse.name && dataToUse.dosage && validation.valid) {
        action = { type: 'add_medication', data: dataToUse };
        console.log('✅ Medication action created with validated data:', action);
      } else if (medicationData.name) {
        console.log('⚠️ Incomplete or invalid data - name found but missing/invalid dosage or other fields. AI will ask for it.');
      }
    }

    // 1B. FOLLOW-UP FOR MEDICATION ADDITION
    // Check if a medication was just added - define this early so it's available everywhere
    const recentlyAddedMed = recentHistory.find(h =>
      h.role === 'assistant' && h.content.toLowerCase().includes('successfully added')
    );
    let recentlyAddedName = null;
    if (recentlyAddedMed) {
      const addedMatch = recentlyAddedMed.content.match(/successfully added\s+([a-zA-Z]+)/i);
      if (addedMatch) {
        recentlyAddedName = addedMatch[1].toLowerCase();
        console.log(`⚠️ Recently added medication: ${recentlyAddedName} - will use for scheduling`);
      }
    }

    if (!action && (isFollowUp || aiIndicatesAction)) {
      // Build conversation text ONCE for both medication and schedule extraction
      // IMPORTANT: Use ONLY user messages to avoid AI artifact words (e.g., "I've extracted ...")
      const historyUserText = recentHistory
        .filter(h => h.role === 'user')
        .map(h => h.content)
        .join(' ');
      const conversationText = `${historyUserText} ${message}`.trim();

      // Skip if this is clearly a scheduling response
      // BUT: If message contains form/quantity keywords, it's likely medication details, not scheduling
      const hasMedicationKeywords = /\b(tablet|capsule|pill|syrup|liquid|inhaler|cream|drops|units?|mg|ml)\b/i.test(message);
      const isSchedulingMsg = isSchedulingMessage(message);

      if (isSchedulingMsg && !hasMedicationKeywords) {
        console.log('⏭️ Skipping medication extraction - detected scheduling message:', message);
        // Don't set action, let it flow to schedule extraction
      } else {
        if (hasMedicationKeywords) {
          console.log('✅ Detected medication keywords, treating as medication details even if scheduling context');
        }
        // First, try extracting from the current message (prioritize latest user input)
        const currentMessageData = extractMedicationFromText(message);
        console.log('🔍 Current message extraction:', currentMessageData);

        // Then extract from full conversation for missing fields
        console.log('🔄 Extracting from conversation:', conversationText.substring(0, 200));

        const conversationData = extractMedicationFromText(conversationText);
        console.log('💊 Conversation extraction:', conversationData);

        // Merge data: prioritize current message over conversation context
        // BUT: Never override name if current message extracted a common word
        const commonWords = ['inhaler', 'tablet', 'capsule', 'dosage', 'form', 'quantity', 'unit', 'units', 'mg', 'ml'];
        const isCommonWord = currentMessageData.name && commonWords.includes(currentMessageData.name.toLowerCase());

        // recentlyAddedName is already defined above - use it to exclude from extraction
        // If conversation name matches recently added med, don't use it
        let conversationName = conversationData.name;
        if (conversationName && recentlyAddedName && conversationName.toLowerCase() === recentlyAddedName) {
          console.log(`⚠️ Skipping ${conversationName} - it was just added`);
          conversationName = null;

          // Try to find the NEXT medication name in the original message
          // Look for patterns like "add X and Y" where X was just added
          const multiMedPattern = new RegExp(`and\\s+([a-zA-Z]+)`, 'i');
          const originalMessage = recentHistory.find(h => h.role === 'user' && h.content.toLowerCase().includes('add'));
          if (originalMessage) {
            const nextMedMatch = originalMessage.content.match(multiMedPattern);
            if (nextMedMatch && nextMedMatch[1].toLowerCase() !== recentlyAddedName) {
              conversationName = nextMedMatch[1].charAt(0).toUpperCase() + nextMedMatch[1].slice(1).toLowerCase();
              console.log(`✅ Found next medication to add: ${conversationName}`);
            }
          }
        }

        const medicationData = {
          name: (currentMessageData.name && !isCommonWord) ? currentMessageData.name : conversationName,
          // For dosage: prioritize current message, but fall back to conversation if missing
          // This handles follow-up responses like just "capsule" where dosage was given earlier
          dosage: currentMessageData.dosage || conversationData.dosage || '',
          form: currentMessageData.form || conversationData.form,
          // NEVER use purpose from conversation - it includes AI responses with medication descriptions
          purpose: currentMessageData.purpose || '',
          // For quantity: prioritize current message, fall back to conversation
          total_quantity: currentMessageData.total_quantity || conversationData.total_quantity || null
        };
        console.log('✅ Merged medication data:', medicationData);

        // Check if we have enough data to create action
        if (medicationData.name && medicationData.dosage && medicationData.form) {
          // Set default quantity if not provided
          if (!medicationData.total_quantity) {
            medicationData.total_quantity = 30;
          }

          // Check if this medication was just successfully added in previous turn
          // Look for success confirmation in recent history
          const wasJustAdded = recentHistory.some(h =>
            h.role === 'assistant' &&
            h.content.toLowerCase().includes('successfully added') &&
            h.content.toLowerCase().includes(medicationData.name.toLowerCase())
          );

          if (wasJustAdded) {
            console.log(`⚠️ ${medicationData.name} was just added in previous turn - skipping duplicate`);
            // Don't create medication action, but check for schedule
            const schedMedications = await db.getMedications({}, userId);
            const medList = schedMedications?.medications || [];
            const scheduleData = extractScheduleFromText(message, medList, medicationData.name);

            if (scheduleData.medication_id && scheduleData.time && scheduleData.food_timing) {
              action = { type: 'add_schedule', data: scheduleData };
              console.log('✅ Schedule-only action created for existing medication:', action);
            }
          } else {
            // Check if schedule info is also present in the message
            const schedMedications = await db.getMedications({}, userId);
            const medList = schedMedications?.medications || [];
            const scheduleData = extractScheduleFromText(message, medList, medicationData.name);
            console.log('📅 Checking for schedule data alongside medication:', scheduleData);

            // If schedule data is present with required fields, create combined action
            if (scheduleData.time && scheduleData.food_timing) {
              action = {
                type: 'add_medication_and_schedule',
                data: {
                  medication: medicationData,
                  schedule: scheduleData
                }
              };
              console.log('✅ Combined medication+schedule action created:', action);
            } else {
              action = { type: 'add_medication', data: medicationData };
              console.log('✅ Follow-up medication action created:', action);
            }
          }
        }
      }  // End of else block for non-scheduling messages

      // Check for schedule completion (only if no action yet)
      if (!action) {
        const schedMedications = await db.getMedications({}, userId);
        const medList = schedMedications?.medications || [];
        // CRITICAL: Extract from CURRENT message only, not conversation
        // Conversation includes AI responses like "8am daily before food" which contaminates extraction
        const scheduleData = extractScheduleFromText(message, medList, recentlyAddedName);
        console.log('📅 Extracted schedule data from current message:', scheduleData);

        // Validate schedule data
        const scheduleValidation = validateScheduleData(scheduleData);

        if (!scheduleValidation.valid) {
          console.log('⚠️ Schedule validation errors:', scheduleValidation.errors);
        } else {
          console.log('✅ Schedule data validated successfully');
        }

        // Use sanitized data if validation passes
        const schedDataToUse = scheduleValidation.valid ? scheduleValidation.sanitized : scheduleData;

        // Schedule action creation - food_timing is MANDATORY and must be valid
        if (schedDataToUse.medication_id && schedDataToUse.time && schedDataToUse.food_timing && scheduleValidation.valid) {
          // Food timing must be specified and valid
          action = { type: 'add_schedule', data: schedDataToUse };
          console.log('✅ Follow-up schedule action created with validated data:', action);
        } else if (scheduleData.medication_id && scheduleData.time && !scheduleData.food_timing) {
          // Log that food timing is missing
          console.log('⚠️ Food timing missing - AI will ask for it');
        } else if (!scheduleValidation.valid) {
          console.log('⚠️ Schedule data invalid - AI will ask for corrections');
        }
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

      // Check for recently added medication to use as fallback
      let lastAddedName = null;
      const recentlyAdded = recentHistory.find(h =>
        h.role === 'assistant' && h.content.toLowerCase().includes('successfully added')
      );
      if (recentlyAdded) {
        const addedMatch = recentlyAdded.content.match(/successfully added\s+([a-zA-Z]+)/i);
        if (addedMatch) {
          lastAddedName = addedMatch[1];
        }
      }

      const scheduleData = extractScheduleFromText(message, medList, lastAddedName);
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

    // 6. DELETE MEDICATION
    const deletePatterns = [
      /delete|remove|get rid of|erase/i
    ];
    const hasDeleteIntent = deletePatterns.some(pattern => pattern.test(lowerMessage));

    if (!action && hasDeleteIntent && !lowerMessage.includes('schedule')) {
      console.log('🗑️ Detected: Delete Medication Intent');

      // Check if user wants to delete ALL medications
      const deleteAllPatterns = /\b(all|every|everything|entire|complete)\b/i;
      const wantsDeleteAll = deleteAllPatterns.test(message);

      if (wantsDeleteAll) {
        console.log('🗑️ User wants to delete ALL medications');
        action = {
          type: 'delete_all_medications',
          data: { medications: medsList }
        };
        console.log('✅ Delete all medications action created');
      } else {
        const deleteData = findMedicationByName(message, medsList);
        console.log('🔍 Found medication to delete:', deleteData);

        if (deleteData.matches.length > 0) {
          // If multiple matches, return all for confirmation
          action = {
            type: 'delete_medication',
            data: deleteData.matches.length === 1
              ? { medication_id: deleteData.matches[0].id, medication_name: deleteData.matches[0].name }
              : { multiple: true, medications: deleteData.matches }
          };
          console.log('✅ Delete medication action created:', action);
        } else {
          console.log('⚠️ No medication found to delete');
        }
      }
    }

    // 7. DELETE SCHEDULE
    if (!action && hasDeleteIntent && lowerMessage.includes('schedule')) {
      console.log('🗑️ Detected: Delete Schedule Intent');
      const deleteData = findMedicationByName(message, medsList);
      console.log('🔍 Found medication schedule to delete:', deleteData);

      if (deleteData.matches.length > 0) {
        action = {
          type: 'delete_schedule',
          data: { medication_id: deleteData.matches[0].id, medication_name: deleteData.matches[0].name }
        };
        console.log('✅ Delete schedule action created:', action);
      }
    }

    // 8. UPDATE/EDIT MEDICATION
    const updatePatterns = [
      /update|edit|change|modify|set/i
    ];
    const hasUpdateIntent = updatePatterns.some(pattern => pattern.test(lowerMessage));

    if (!action && hasUpdateIntent && !lowerMessage.includes('schedule')) {
      console.log('✏️ Detected: Update Medication Intent');
      const medicationData = findMedicationByName(message, medsList);

      if (medicationData.matches.length > 0) {
        const medication = medicationData.matches[0];
        const updates = extractUpdateDetails(message);

        if (Object.keys(updates).length > 0) {
          action = {
            type: 'update_medication',
            data: {
              medication_id: medication.id,
              medication_name: medication.name,
              updates
            }
          };
          console.log('✅ Update medication action created:', action);
        }
      }
    }

    // 9. UPDATE/EDIT SCHEDULE
    if (!action && hasUpdateIntent && lowerMessage.includes('schedule')) {
      console.log('✏️ Detected: Update Schedule Intent');
      const medicationData = findMedicationByName(message, medsList);

      if (medicationData.matches.length > 0) {
        const medication = medicationData.matches[0];
        const scheduleUpdates = extractScheduleFromText(message, medsList);

        action = {
          type: 'update_schedule',
          data: {
            medication_id: medication.id,
            medication_name: medication.name,
            updates: scheduleUpdates
          }
        };
        console.log('✅ Update schedule action created:', action);
      }
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
      name: error.name,
      code: error.code,
      details: error.details
    });

    // Check for specific error types and provide fallback
    let errorResponse = "I'm having trouble processing your request. Please try again or rephrase your question.";
    let fallbackAction = null;

    // Rate limit errors
    if (error.message?.includes('rate limit') || error.code === 'rate_limit_exceeded' || error.status === 429) {
      console.log('🚨 Rate limit detected - providing fallback to manual forms');
      errorResponse = "I'm experiencing high demand right now. Let me open the manual form for you - it's quick and easy!";
      fallbackAction = { type: 'fallback_to_manual_forms' };
    }
    // Network/timeout errors
    else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      console.log('🚨 Network error detected');
      errorResponse = 'Connection issue detected. Please try again or use the manual forms.';
      fallbackAction = { type: 'fallback_to_manual_forms' };
    }
    // API key errors
    else if (error.message?.includes('API key') || error.status === 401) {
      console.log('🚨 API key error');
      errorResponse = 'AI service authentication issue. Please use the manual forms.';
      fallbackAction = { type: 'fallback_to_manual_forms' };
    }

    res.status(500).json({
      error: error.message,
      response: errorResponse,
      action: fallbackAction,
      fallback: !!fallbackAction
    });
  }
});

// Helper function to extract schedule details from text
function extractScheduleFromText(text, medications, lastAddedMedicationName = null) {
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

  // If no match found in text, try lastAddedMedicationName (contextual fallback)
  if (!foundMatch && lastAddedMedicationName) {
    console.log(`🔍 No medication mentioned in text, checking lastAddedMedication: ${lastAddedMedicationName}`);
    // Find the medication by name
    if (Array.isArray(medications) && medications.length > 0) {
      const lastAddedMed = medications.find(med =>
        med && med.name && med.name.toLowerCase() === lastAddedMedicationName.toLowerCase()
      );
      if (lastAddedMed) {
        data.medication_id = lastAddedMed.id;
        data.medication_name = lastAddedMed.name;
        foundMatch = true;
        console.log(`✅ Using lastAddedMedication: ${lastAddedMed.name} (ID: ${lastAddedMed.id})`);
      }
    }
  }

  // If still no match found, try to extract medication name from text
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

  // Try HH:MM am/pm format first (e.g., "4:30 pm")
  timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    minute = parseInt(timeMatch[2]);
    period = timeMatch[3];
  } else {
    // Try H MM am/pm format with space (e.g., "4 30 pm")
    timeMatch = text.match(/(\d{1,2})\s+(\d{2})\s*(am|pm)/i);
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = parseInt(timeMatch[2]);
      period = timeMatch[3];
    } else {
      // Try H am/pm format (no minutes, e.g., "4 pm")
      timeMatch = text.match(/(\d{1,2})\s*(am|pm)/i);
      if (timeMatch) {
        hour = parseInt(timeMatch[1]);
        minute = 0;
        period = timeMatch[2];
      }
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
    lowerText.includes('after meal') ||
    lowerText.includes('after breakfast') || lowerText.includes('after lunch') ||
    lowerText.includes('after dinner')) {
    data.food_timing = 'after_food';
    data.with_food = true;
  } else if (lowerText.includes('with food') || lowerText.includes('with meal') || lowerText.includes('during meal')) {
    // "with food" means take during/after eating
    data.food_timing = 'with_food';
    data.with_food = true;
  } else if (lowerText.includes('no timing') || lowerText.includes('no specific') ||
    lowerText.includes('anytime') || lowerText.includes('any time')) {
    data.food_timing = 'none';
    data.with_food = false;
  }
  // If not matched, default to 'none' so schedule can still be created
  if (!data.food_timing) {
    data.food_timing = 'none';
    data.with_food = false;
  }
  // If not matched, leave as 'none'

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

// Helper function to find medication by name in user's medication list
function findMedicationByName(text, medications) {
  const matches = [];
  const lowerText = text.toLowerCase();

  if (!Array.isArray(medications) || medications.length === 0) {
    return { matches: [], searchTerm: text };
  }

  // Try to find medication name in text
  for (const med of medications) {
    if (med && med.name) {
      const medNameLower = med.name.toLowerCase();
      const medFirstWord = medNameLower.split(' ')[0];

      // Exact match
      if (lowerText.includes(medNameLower)) {
        matches.push(med);
        continue;
      }

      // First word match (e.g., "aspirin" matches "Aspirin 500mg")
      if (medFirstWord.length > 3 && lowerText.includes(medFirstWord)) {
        matches.push(med);
      }
    }
  }

  console.log(`🔍 Found ${matches.length} medication matches:`, matches.map(m => m.name));
  return { matches, searchTerm: text };
}

// Helper function to extract update details from text
function extractUpdateDetails(text) {
  const updates = {};
  const lowerText = text.toLowerCase();

  // Extract dosage update
  const dosageMatch = text.match(/(dosage|dose)\s+(to|is)?\s*([\d.]+\s*(?:mg|ml|g|mcg|iu))/i);
  if (dosageMatch) {
    updates.dosage = dosageMatch[3].trim();
  }

  // Extract quantity update
  const quantityMatch = text.match(/(quantity|amount|count)\s+(to|is)?\s*(\d+)/i);
  if (quantityMatch) {
    updates.total_quantity = parseInt(quantityMatch[3]);
    updates.remaining_quantity = parseInt(quantityMatch[3]);
  } else {
    // Try standalone number (e.g., "change to 50")
    const numberMatch = text.match(/(?:to|is)\s+(\d+)\s+(tablet|capsule|pill|unit)s?/i);
    if (numberMatch) {
      updates.total_quantity = parseInt(numberMatch[1]);
      updates.remaining_quantity = parseInt(numberMatch[1]);
    }
  }

  // Extract form update
  const formMappings = {
    'tablet': ['tablet', 'tab', 'pill'],
    'capsule': ['capsule', 'cap'],
    'liquid': ['syrup', 'liquid', 'solution'],
    'injection': ['injection', 'shot'],
    'drops': ['drops', 'drop'],
    'cream': ['cream', 'ointment', 'gel'],
    'inhaler': ['inhaler', 'puff'],
    'patch': ['patch'],
    'other': ['spray', 'powder', 'suppository']
  };

  for (const [formName, variants] of Object.entries(formMappings)) {
    if (variants.some(v => lowerText.includes(v))) {
      updates.form = formName;
      break;
    }
  }

  // Extract purpose update
  const purposeMatch = text.match(/(?:purpose|for|treats?)\s+(?:to|is)?\s+(.+?)(?:\.|$)/i);
  if (purposeMatch) {
    updates.purpose = purposeMatch[1].trim();
  }

  console.log('🔍 Extracted update details:', updates);
  return updates;
}

// Helper function to extract medication details from text
function extractMedicationFromText(text) {
  const data = {
    name: '',
    dosage: '',
    form: '', // No default - user must explicitly provide
    purpose: '',
    total_quantity: null // Will be set to 30 as default if not specified
  };

  const lowerText = text.toLowerCase();

  // IMPROVED: Extract dosage with better patterns
  // Matches: 500mg, 500 mg, 2.5mg, 1000IU, 10ml, etc.
  // NOTE: Removed 'units?' - units are for QUANTITY, not dosage
  const dosagePatterns = [
    /(\d+\.?\d*)\s*(mg|ml|g|mcg|iu)\b/gi,
    /(\d+\.?\d*)\s*milligram/gi,
    /(\d+\.?\d*)\s*milliliter/gi
  ];

  for (const pattern of dosagePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.dosage = match[0].trim();

      // If dosage contains 'ml', set form to liquid (unless explicitly stated otherwise)
      if (match[0].toLowerCase().includes('ml') && !lowerText.match(/\b(tablet|capsule|pill|injection|cream|inhaler|drops|patch)\b/)) {
        data.form = 'liquid';
      }
      break;
    }
  }

  // IMPROVED: Extract quantity with multiple patterns
  // Priority 1: Standalone "X units" or just "X" when it's clearly quantity
  const standaloneUnitsMatch = text.match(/\b(\d+)\s*units?\b/i);
  if (standaloneUnitsMatch) {
    data.total_quantity = parseInt(standaloneUnitsMatch[1]);
  } else {
    // Priority 2: "X tablets/pills/capsules"
    const quantityPattern1 = text.match(/(\d+)\s*(tablet|capsule|pill|dose|drop|spray|patch|bottle)s?\b/i);
    if (quantityPattern1) {
      data.total_quantity = parseInt(quantityPattern1[1]);
    } else {
      // Priority 3: Just a standalone number (if short message and reasonable range)
      // This handles cases like user just saying "20" or "30"
      const wordCount = text.trim().split(/\s+/).length;
      if (wordCount <= 3) {
        const simpleNumberMatch = text.match(/\b(\d+)\b/);
        if (simpleNumberMatch) {
          const num = parseInt(simpleNumberMatch[1]);
          if (num >= 1 && num <= 1000) {
            // Make sure it's not part of dosage (e.g., not "500" from "500mg")
            if (!text.match(/\d+\.?\d*\s*(mg|ml|g|mcg|iu)/i)) {
              data.total_quantity = num;
            }
          }
        }
      }
    }
  }

  // IMPROVED: Extract form with more variants
  // Check for explicit form statements first ("it is a syrup", "form is tablet")
  const explicitFormMatch = text.match(/(?:it (?:is|'s) a?|form (?:is|:)?|type (?:is|:)?)\s*(tablet|capsule|pill|syrup|liquid|injection|shot|drops?|cream|ointment|gel|inhaler|puff|patch|spray|powder|suppository)/i);
  if (explicitFormMatch) {
    const formWord = explicitFormMatch[1].toLowerCase();
    // Map to standard form names
    if (['tablet', 'tab', 'pill'].includes(formWord)) data.form = 'tablet';
    else if (['capsule', 'cap'].includes(formWord)) data.form = 'capsule';
    else if (['syrup', 'liquid', 'solution'].includes(formWord)) data.form = 'liquid';
    else if (['injection', 'shot'].includes(formWord)) data.form = 'injection';
    else if (['drops', 'drop'].includes(formWord)) data.form = 'drops';
    else if (['cream', 'ointment', 'gel'].includes(formWord)) data.form = 'cream';
    else if (['inhaler', 'puff'].includes(formWord)) data.form = 'inhaler';
    else if (['patch'].includes(formWord)) data.form = 'patch';
    else if (['spray', 'powder', 'suppository'].includes(formWord)) data.form = 'other';
  } else {
    // Otherwise use standard keyword matching
    const formMappings = {
      'tablet': ['tablet', 'tab', 'pill'],
      'capsule': ['capsule', 'cap'],
      'liquid': ['syrup', 'liquid', 'solution'],
      'injection': ['injection', 'shot'],
      'drops': ['drops', 'drop'],
      'cream': ['cream', 'ointment', 'gel'],
      'inhaler': ['inhaler', 'puff'],
      'patch': ['patch'],
      'other': ['spray', 'powder', 'suppository']
    };

    for (const [formName, variants] of Object.entries(formMappings)) {
      if (variants.some(v => lowerText.includes(v))) {
        data.form = formName;
        break;
      }
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
        // Skip if contains medication names or dosages (AI response artifacts)
        const invalidPatterns = [
          /\(/,  // parentheses
          /\)/,
          /e\.g\./i,
          /default/i,
          /\d+\s*(mg|ml|g|mcg|iu)/i,  // dosage patterns like "500mg"
          /include/i,  // "Your medications now include..."
          /correct/i,  // "Is that correct?"
          /inhaler|tablet|capsule/i,  // medication forms
          /unit/i  // "1 unit", "14 units"
        ];

        const isInvalid = invalidPatterns.some(pattern => pattern.test(purpose)) || purpose.length < 3;

        if (isInvalid) {
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
    'unit', 'units', 'dose', 'doses', 'bottle', 'bottles', 'mg', 'ml', 'g', 'mcg', 'iu',
    'inhaler', 'inhalers', 'cream', 'creams', 'drops', 'drop', 'patch', 'patches',
    'injection', 'injections', 'liquid', 'liquids', 'spray', 'sprays',
    'dosage', 'form', 'quantity', 'amount', 'total',
    'anytime', 'daily', 'weekly', 'morning', 'evening', 'night', 'afternoon',
    'before', 'after', 'with', 'food', 'meal', 'schedule', 'time'];

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
    // Additional words to skip (numbers as words, common phrases)
    const additionalSkipWords = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'default', 'like', 'you', 'your', 'have', 'many', 'how', 'what', 'when', 'where',
      'would', 'should', 'could', 'can', 'will', 'it', 'is', 'be', 'to', 'for', 'that',
      'this', 'these', 'those', 'if', 'also', 'previously', 'noted', 'mentioned', 'extracted'];

    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^a-zA-Z]/g, '');
      if (word.length < 3) continue;  // Increased from 2 to 3
      if (skipWords.includes(word.toLowerCase())) continue;
      if (additionalSkipWords.includes(word.toLowerCase())) continue;
      if (addTriggers.includes(word.toLowerCase())) continue;

      // Check if it's a potential medication name
      // - At least 4 characters for safety (filters out "Two", "One", etc.)
      // - Not a common word
      // - Either capitalized or lowercase (handle both)
      if (word.length >= 4 && word.match(/^[a-zA-Z]+$/)) {
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
          wait: false
        });
        console.log(`\u2705 Browser notification sent`);
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



  if (process.env.GEMINI_API_KEY) {
    console.log('🤖 AI Chatbot: Enabled (Google Gemini 1.5 Flash)');
  } else {
    console.log('⚠️  AI Chatbot: Not configured (GEMINI_API_KEY missing)');
    console.log('   Get your free API key: https://aistudio.google.com/app/apikey');
  }

  console.log(`\n🚀 Server ready!`);
});
