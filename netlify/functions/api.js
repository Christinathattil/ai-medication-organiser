// Netlify serverless function for API
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple in-memory database for serverless (will reset on cold starts)
// For production, you'd want to use a database service
let db = {
  medications: [],
  schedules: [],
  logs: [],
  interactions: [],
  nextId: { medication: 1, schedule: 1, log: 1, interaction: 1 }
};

// Helper to get medication by ID
const getMedById = (id) => db.medications.find(m => m.id === parseInt(id));

// Helper to get today's date
const getToday = () => new Date().toISOString().split('T')[0];

export const handler = async (event, context) => {
  const { httpMethod, path: urlPath, body, queryStringParameters } = event;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS for CORS
  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const parsedBody = body ? JSON.parse(body) : {};
    const pathParts = urlPath.replace('/.netlify/functions/api', '').split('/').filter(Boolean);
    
    // Route handling
    if (pathParts[0] === 'medications') {
      if (httpMethod === 'GET' && !pathParts[1]) {
        // List medications
        let meds = [...db.medications];
        if (queryStringParameters?.search) {
          const search = queryStringParameters.search.toLowerCase();
          meds = meds.filter(m => 
            m.name.toLowerCase().includes(search) || 
            (m.purpose && m.purpose.toLowerCase().includes(search))
          );
        }
        if (queryStringParameters?.active_only === 'true') {
          meds = meds.filter(m => m.remaining_quantity > 0);
        }
        return { statusCode: 200, headers, body: JSON.stringify({ medications: meds }) };
      }
      
      if (httpMethod === 'GET' && pathParts[1]) {
        // Get single medication
        const med = getMedById(pathParts[1]);
        if (!med) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
        }
        const schedules = db.schedules.filter(s => s.medication_id === parseInt(pathParts[1]));
        const logs = db.logs.filter(l => l.medication_id === parseInt(pathParts[1])).slice(0, 10);
        return { statusCode: 200, headers, body: JSON.stringify({ medication: med, schedules, recent_logs: logs }) };
      }
      
      if (httpMethod === 'POST' && !pathParts[1]) {
        // Add medication
        const medication = {
          id: db.nextId.medication++,
          ...parsedBody,
          refill_count: 0,
          remaining_quantity: parsedBody.total_quantity || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db.medications.push(medication);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, medication_id: medication.id }) };
      }
      
      if (httpMethod === 'PUT' && pathParts[1]) {
        // Update medication
        const index = db.medications.findIndex(m => m.id === parseInt(pathParts[1]));
        if (index !== -1) {
          db.medications[index] = { ...db.medications[index], ...parsedBody, updated_at: new Date().toISOString() };
          return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      }
      
      if (httpMethod === 'DELETE' && pathParts[1]) {
        // Delete medication
        db.medications = db.medications.filter(m => m.id !== parseInt(pathParts[1]));
        db.schedules = db.schedules.filter(s => s.medication_id !== parseInt(pathParts[1]));
        db.logs = db.logs.filter(l => l.medication_id !== parseInt(pathParts[1]));
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }
      
      if (httpMethod === 'POST' && pathParts[1] && pathParts[2] === 'quantity') {
        // Update quantity
        const med = getMedById(pathParts[1]);
        if (med) {
          med.remaining_quantity = (med.remaining_quantity || 0) + parsedBody.quantity_change;
          if (parsedBody.is_refill) {
            med.refill_count = (med.refill_count || 0) + 1;
          }
          return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      }
    }
    
    if (pathParts[0] === 'schedules') {
      if (httpMethod === 'GET') {
        let schedules = db.schedules.map(s => {
          const med = getMedById(s.medication_id);
          return { ...s, medication_name: med ? med.name : 'Unknown' };
        });
        if (queryStringParameters?.medication_id) {
          schedules = schedules.filter(s => s.medication_id === parseInt(queryStringParameters.medication_id));
        }
        if (queryStringParameters?.active_only === 'true') {
          schedules = schedules.filter(s => s.active);
        }
        return { statusCode: 200, headers, body: JSON.stringify({ schedules }) };
      }
      
      if (httpMethod === 'POST') {
        const schedule = {
          id: db.nextId.schedule++,
          ...parsedBody,
          active: true,
          created_at: new Date().toISOString()
        };
        db.schedules.push(schedule);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, schedule_id: schedule.id }) };
      }
      
      if (httpMethod === 'PUT' && pathParts[1]) {
        const index = db.schedules.findIndex(s => s.id === parseInt(pathParts[1]));
        if (index !== -1) {
          db.schedules[index] = { ...db.schedules[index], ...parsedBody };
          return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      }
      
      if (httpMethod === 'DELETE' && pathParts[1]) {
        db.schedules = db.schedules.filter(s => s.id !== parseInt(pathParts[1]));
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }
    }
    
    if (pathParts[0] === 'schedule' && pathParts[1] === 'today') {
      const today = getToday();
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'short' });
      
      const schedules = db.schedules.filter(s => {
        if (!s.active) return false;
        if (s.start_date > today) return false;
        if (s.end_date && s.end_date < today) return false;
        if (s.frequency === 'daily') return true;
        if (s.frequency === 'weekly' && s.days_of_week && s.days_of_week.includes(dayOfWeek)) return true;
        return false;
      }).map(s => {
        const med = getMedById(s.medication_id);
        const todayLogs = db.logs.filter(l => l.taken_at.startsWith(today) && l.medication_id === s.medication_id && l.schedule_id === s.id);
        return {
          ...s,
          name: med ? med.name : 'Unknown',
          dosage: med ? med.dosage : '',
          form: med ? med.form : '',
          remaining_quantity: med ? med.remaining_quantity : 0,
          status: todayLogs.length > 0 ? todayLogs[0].status : 'pending'
        };
      });
      
      return { statusCode: 200, headers, body: JSON.stringify({ date: today, schedules }) };
    }
    
    if (pathParts[0] === 'logs') {
      if (httpMethod === 'GET') {
        let logs = db.logs.map(l => {
          const med = getMedById(l.medication_id);
          return { ...l, medication_name: med ? med.name : 'Unknown', dosage: med ? med.dosage : '' };
        });
        if (queryStringParameters?.medication_id) {
          logs = logs.filter(l => l.medication_id === parseInt(queryStringParameters.medication_id));
        }
        logs = logs.slice(0, parseInt(queryStringParameters?.limit || 50));
        return { statusCode: 200, headers, body: JSON.stringify({ history: logs }) };
      }
      
      if (httpMethod === 'POST') {
        const log = {
          id: db.nextId.log++,
          ...parsedBody,
          taken_at: parsedBody.taken_at || new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        db.logs.push(log);
        
        if (parsedBody.status === 'taken') {
          const med = getMedById(parsedBody.medication_id);
          if (med && med.remaining_quantity > 0) {
            med.remaining_quantity--;
          }
        }
        
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, log_id: log.id }) };
      }
    }
    
    if (pathParts[0] === 'refill-alerts') {
      const threshold = parseInt(queryStringParameters?.threshold || 7);
      const medications = db.medications.filter(m => 
        m.remaining_quantity !== null && 
        m.remaining_quantity <= threshold && 
        m.remaining_quantity > 0
      );
      return { statusCode: 200, headers, body: JSON.stringify({ threshold, medications }) };
    }
    
    if (pathParts[0] === 'stats' && pathParts[1] === 'adherence') {
      const days = parseInt(queryStringParameters?.days || 30);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      const logs = db.logs.filter(l => l.taken_at >= startDateStr);
      const statsByMed = {};
      
      logs.forEach(log => {
        if (!statsByMed[log.medication_id]) {
          const med = getMedById(log.medication_id);
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
      
      const statistics = Object.values(statsByMed).map(s => ({
        ...s,
        adherence_rate: s.total_logs > 0 ? ((s.taken_count / s.total_logs) * 100).toFixed(2) : 0
      }));
      
      return { statusCode: 200, headers, body: JSON.stringify({ period_days: days, start_date: startDateStr, statistics }) };
    }
    
    if (pathParts[0] === 'interactions') {
      if (httpMethod === 'GET') {
        let interactions = db.interactions.map(i => {
          const med1 = getMedById(i.medication1_id);
          const med2 = getMedById(i.medication2_id);
          return { ...i, medication1_name: med1 ? med1.name : 'Unknown', medication2_name: med2 ? med2.name : 'Unknown' };
        });
        if (queryStringParameters?.medication_id) {
          const id = parseInt(queryStringParameters.medication_id);
          interactions = interactions.filter(i => i.medication1_id === id || i.medication2_id === id);
        }
        return { statusCode: 200, headers, body: JSON.stringify({ interactions }) };
      }
      
      if (httpMethod === 'POST') {
        const interaction = {
          id: db.nextId.interaction++,
          ...parsedBody,
          created_at: new Date().toISOString()
        };
        db.interactions.push(interaction);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, interaction_id: interaction.id }) };
      }
    }
    
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
    
  } catch (error) {
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
