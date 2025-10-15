import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'medications.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database structure
const initDB = () => {
  return {
    medications: [],
    schedules: [],
    logs: [],
    interactions: [],
    nextId: {
      medication: 1,
      schedule: 1,
      log: 1,
      interaction: 1
    }
  };
};

// Load database
const loadDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    const db = initDB();
    saveDB(db);
    return db;
  }
  
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading database:', error);
    return initDB();
  }
};

// Save database
const saveDB = (db) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
};

// Database operations
class Database {
  constructor() {
    this.db = loadDB();
  }

  // Medications
  addMedication(data) {
    const medication = {
      id: this.db.nextId.medication++,
      ...data,
      refill_count: 0,
      remaining_quantity: data.total_quantity || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.db.medications.push(medication);
    saveDB(this.db);
    return medication;
  }

  getMedications(filter = {}) {
    let meds = [...this.db.medications];
    
    if (filter.search) {
      const search = filter.search.toLowerCase();
      meds = meds.filter(m => 
        m.name.toLowerCase().includes(search) || 
        (m.purpose && m.purpose.toLowerCase().includes(search))
      );
    }
    
    if (filter.active_only) {
      meds = meds.filter(m => m.remaining_quantity > 0);
    }
    
    return meds;
  }

  getMedication(id) {
    return this.db.medications.find(m => m.id === parseInt(id));
  }

  updateMedication(id, updates) {
    const index = this.db.medications.findIndex(m => m.id === parseInt(id));
    if (index !== -1) {
      this.db.medications[index] = {
        ...this.db.medications[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      saveDB(this.db);
      return true;
    }
    return false;
  }

  deleteMedication(id) {
    const index = this.db.medications.findIndex(m => m.id === parseInt(id));
    if (index !== -1) {
      this.db.medications.splice(index, 1);
      // Also delete related schedules and logs
      this.db.schedules = this.db.schedules.filter(s => s.medication_id !== parseInt(id));
      this.db.logs = this.db.logs.filter(l => l.medication_id !== parseInt(id));
      saveDB(this.db);
      return true;
    }
    return false;
  }

  // Schedules
  addSchedule(data) {
    const schedule = {
      id: this.db.nextId.schedule++,
      ...data,
      active: true,
      created_at: new Date().toISOString()
    };
    this.db.schedules.push(schedule);
    saveDB(this.db);
    return schedule;
  }

  getSchedules(filter = {}) {
    let schedules = [...this.db.schedules];
    
    if (filter.medication_id) {
      schedules = schedules.filter(s => s.medication_id === parseInt(filter.medication_id));
    }
    
    if (filter.active_only) {
      schedules = schedules.filter(s => s.active);
    }
    
    // Join with medication names
    return schedules.map(s => {
      const med = this.getMedication(s.medication_id);
      return {
        ...s,
        medication_name: med ? med.name : 'Unknown'
      };
    });
  }

  updateSchedule(id, updates) {
    const index = this.db.schedules.findIndex(s => s.id === parseInt(id));
    if (index !== -1) {
      this.db.schedules[index] = {
        ...this.db.schedules[index],
        ...updates
      };
      saveDB(this.db);
      return true;
    }
    return false;
  }

  deleteSchedule(id) {
    const index = this.db.schedules.findIndex(s => s.id === parseInt(id));
    if (index !== -1) {
      this.db.schedules.splice(index, 1);
      saveDB(this.db);
      return true;
    }
    return false;
  }

  // Logs
  addLog(data) {
    const log = {
      id: this.db.nextId.log++,
      ...data,
      taken_at: data.taken_at || new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    this.db.logs.push(log);
    
    // Update quantity if taken
    if (data.status === 'taken') {
      const med = this.getMedication(data.medication_id);
      if (med && med.remaining_quantity > 0) {
        this.updateMedication(data.medication_id, {
          remaining_quantity: med.remaining_quantity - 1
        });
      }
    }
    
    saveDB(this.db);
    return log;
  }

  getLogs(filter = {}) {
    let logs = [...this.db.logs];
    
    if (filter.medication_id) {
      logs = logs.filter(l => l.medication_id === parseInt(filter.medication_id));
    }
    
    if (filter.start_date) {
      logs = logs.filter(l => l.taken_at >= filter.start_date);
    }
    
    if (filter.end_date) {
      logs = logs.filter(l => l.taken_at <= filter.end_date + 'T23:59:59');
    }
    
    // Sort by date descending
    logs.sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at));
    
    // Limit results
    if (filter.limit) {
      logs = logs.slice(0, parseInt(filter.limit));
    }
    
    // Join with medication info
    return logs.map(l => {
      const med = this.getMedication(l.medication_id);
      return {
        ...l,
        medication_name: med ? med.name : 'Unknown',
        dosage: med ? med.dosage : ''
      };
    });
  }

  // Today's Schedule
  getTodaySchedule() {
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    
    const schedules = this.db.schedules.filter(s => {
      if (!s.active) return false;
      if (s.start_date > today) return false;
      if (s.end_date && s.end_date < today) return false;
      if (s.frequency === 'daily') return true;
      if (s.frequency === 'weekly' && s.days_of_week && s.days_of_week.includes(dayOfWeek)) return true;
      return false;
    });
    
    // Check which ones have been logged today
    const todayLogs = this.db.logs.filter(l => l.taken_at.startsWith(today));
    const loggedMap = new Map();
    todayLogs.forEach(log => {
      const key = `${log.medication_id}-${log.schedule_id}`;
      loggedMap.set(key, log.status);
    });
    
    return schedules.map(s => {
      const med = this.getMedication(s.medication_id);
      return {
        ...s,
        name: med ? med.name : 'Unknown',
        dosage: med ? med.dosage : '',
        form: med ? med.form : '',
        remaining_quantity: med ? med.remaining_quantity : 0,
        status: loggedMap.get(`${s.medication_id}-${s.id}`) || 'pending'
      };
    }).sort((a, b) => a.time.localeCompare(b.time));
  }

  // Refill Alerts
  getRefillAlerts(threshold = 7) {
    return this.db.medications.filter(m => 
      m.remaining_quantity !== null && 
      m.remaining_quantity <= threshold && 
      m.remaining_quantity > 0
    ).sort((a, b) => a.remaining_quantity - b.remaining_quantity);
  }

  // Update Quantity
  updateQuantity(id, change, isRefill = false) {
    const med = this.getMedication(id);
    if (med) {
      const updates = {
        remaining_quantity: (med.remaining_quantity || 0) + change
      };
      if (isRefill) {
        updates.refill_count = (med.refill_count || 0) + 1;
      }
      return this.updateMedication(id, updates);
    }
    return false;
  }

  // Adherence Stats
  getAdherenceStats(days = 30, medicationId = null) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    let logs = this.db.logs.filter(l => l.taken_at >= startDateStr);
    
    if (medicationId) {
      logs = logs.filter(l => l.medication_id === parseInt(medicationId));
    }
    
    // Group by medication
    const statsByMed = {};
    logs.forEach(log => {
      if (!statsByMed[log.medication_id]) {
        const med = this.getMedication(log.medication_id);
        statsByMed[log.medication_id] = {
          medication_id: log.medication_id,
          medication_name: med ? med.name : 'Unknown',
          total_logs: 0,
          taken_count: 0,
          missed_count: 0,
          skipped_count: 0
        };
      }
      
      statsByMed[log.medication_id].total_logs++;
      if (log.status === 'taken') statsByMed[log.medication_id].taken_count++;
      if (log.status === 'missed') statsByMed[log.medication_id].missed_count++;
      if (log.status === 'skipped') statsByMed[log.medication_id].skipped_count++;
    });
    
    return Object.values(statsByMed).map(s => ({
      ...s,
      adherence_rate: s.total_logs > 0 ? ((s.taken_count / s.total_logs) * 100).toFixed(2) : 0
    }));
  }

  // Interactions
  addInteraction(data) {
    const interaction = {
      id: this.db.nextId.interaction++,
      ...data,
      created_at: new Date().toISOString()
    };
    this.db.interactions.push(interaction);
    saveDB(this.db);
    return interaction;
  }

  getInteractions(medicationId = null) {
    let interactions = [...this.db.interactions];
    
    if (medicationId) {
      const id = parseInt(medicationId);
      interactions = interactions.filter(i => 
        i.medication1_id === id || i.medication2_id === id
      );
    }
    
    return interactions.map(i => {
      const med1 = this.getMedication(i.medication1_id);
      const med2 = this.getMedication(i.medication2_id);
      return {
        ...i,
        medication1_name: med1 ? med1.name : 'Unknown',
        medication2_name: med2 ? med2.name : 'Unknown'
      };
    });
  }
}

export default new Database();
