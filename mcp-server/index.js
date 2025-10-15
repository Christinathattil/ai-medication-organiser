#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple JSON database
const DATA_DIR = join(__dirname, '..', 'data');
const DB_FILE = join(DATA_DIR, 'medications.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const loadDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    return { medications: [], schedules: [], logs: [], interactions: [], nextId: { medication: 1, schedule: 1, log: 1, interaction: 1 } };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

const saveDB = (db) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

const server = new Server(
  {
    name: 'medication-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'add_medication',
        description: 'Add a new medication to the system',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Medication name' },
            dosage: { type: 'string', description: 'Dosage amount (e.g., 500mg, 10ml)' },
            form: { type: 'string', description: 'Form (tablet, capsule, syrup, injection, etc.)' },
            purpose: { type: 'string', description: 'Purpose or condition being treated' },
            prescribing_doctor: { type: 'string', description: 'Doctor who prescribed' },
            prescription_date: { type: 'string', description: 'Date prescribed (YYYY-MM-DD)' },
            total_quantity: { type: 'number', description: 'Total quantity prescribed' },
            side_effects: { type: 'string', description: 'Known side effects' },
            notes: { type: 'string', description: 'Additional notes' },
          },
          required: ['name', 'dosage', 'form'],
        },
      },
      {
        name: 'list_medications',
        description: 'List all medications with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            active_only: { type: 'boolean', description: 'Show only active medications' },
            search: { type: 'string', description: 'Search by name or purpose' },
          },
        },
      },
      {
        name: 'get_medication',
        description: 'Get detailed information about a specific medication',
        inputSchema: {
          type: 'object',
          properties: {
            medication_id: { type: 'number', description: 'Medication ID' },
          },
          required: ['medication_id'],
        },
      },
      {
        name: 'update_medication',
        description: 'Update medication details',
        inputSchema: {
          type: 'object',
          properties: {
            medication_id: { type: 'number', description: 'Medication ID' },
            name: { type: 'string' },
            dosage: { type: 'string' },
            remaining_quantity: { type: 'number' },
            notes: { type: 'string' },
          },
          required: ['medication_id'],
        },
      },
      {
        name: 'delete_medication',
        description: 'Delete a medication from the system',
        inputSchema: {
          type: 'object',
          properties: {
            medication_id: { type: 'number', description: 'Medication ID' },
          },
          required: ['medication_id'],
        },
      },
      {
        name: 'add_schedule',
        description: 'Add a medication schedule',
        inputSchema: {
          type: 'object',
          properties: {
            medication_id: { type: 'number', description: 'Medication ID' },
            time: { type: 'string', description: 'Time to take (HH:MM format)' },
            frequency: { type: 'string', description: 'Frequency (daily, weekly, as_needed)' },
            days_of_week: { type: 'string', description: 'Comma-separated days (Mon,Wed,Fri)' },
            start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            with_food: { type: 'boolean', description: 'Take with food' },
            special_instructions: { type: 'string', description: 'Special instructions' },
          },
          required: ['medication_id', 'time', 'frequency', 'start_date'],
        },
      },
      {
        name: 'list_schedules',
        description: 'List medication schedules',
        inputSchema: {
          type: 'object',
          properties: {
            medication_id: { type: 'number', description: 'Filter by medication ID' },
            active_only: { type: 'boolean', description: 'Show only active schedules' },
          },
        },
      },
      {
        name: 'log_medication',
        description: 'Log that a medication was taken or missed',
        inputSchema: {
          type: 'object',
          properties: {
            medication_id: { type: 'number', description: 'Medication ID' },
            schedule_id: { type: 'number', description: 'Schedule ID (optional)' },
            status: { type: 'string', description: 'Status: taken, missed, skipped' },
            notes: { type: 'string', description: 'Additional notes' },
          },
          required: ['medication_id', 'status'],
        },
      },
      {
        name: 'get_medication_history',
        description: 'Get medication history/logs',
        inputSchema: {
          type: 'object',
          properties: {
            medication_id: { type: 'number', description: 'Filter by medication ID' },
            limit: { type: 'number', description: 'Limit results (default 50)' },
          },
        },
      },
      {
        name: 'get_todays_schedule',
        description: 'Get today\'s medication schedule',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_refill_alerts',
        description: 'Get medications that need refilling soon',
        inputSchema: {
          type: 'object',
          properties: {
            threshold: { type: 'number', description: 'Alert when quantity below this (default 7)' },
          },
        },
      },
      {
        name: 'get_adherence_stats',
        description: 'Get medication adherence statistics',
        inputSchema: {
          type: 'object',
          properties: {
            days: { type: 'number', description: 'Number of days to analyze (default 30)' },
          },
        },
      },
    ],
  };
});

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const db = loadDB();

  try {
    switch (name) {
      case 'add_medication': {
        const medication = {
          id: db.nextId.medication++,
          ...args,
          refill_count: 0,
          remaining_quantity: args.total_quantity || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        db.medications.push(medication);
        saveDB(db);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, medication_id: medication.id, message: `Medication "${args.name}" added successfully` }, null, 2),
          }],
        };
      }

      case 'list_medications': {
        let meds = db.medications;
        if (args.search) {
          const search = args.search.toLowerCase();
          meds = meds.filter(m => m.name.toLowerCase().includes(search) || (m.purpose && m.purpose.toLowerCase().includes(search)));
        }
        if (args.active_only) {
          meds = meds.filter(m => m.remaining_quantity > 0);
        }
        return {
          content: [{ type: 'text', text: JSON.stringify({ medications: meds }, null, 2) }],
        };
      }

      case 'get_medication': {
        const med = db.medications.find(m => m.id === args.medication_id);
        if (!med) throw new Error('Medication not found');
        const schedules = db.schedules.filter(s => s.medication_id === args.medication_id);
        const logs = db.logs.filter(l => l.medication_id === args.medication_id).slice(0, 10);
        return {
          content: [{ type: 'text', text: JSON.stringify({ medication: med, schedules, recent_logs: logs }, null, 2) }],
        };
      }

      case 'update_medication': {
        const index = db.medications.findIndex(m => m.id === args.medication_id);
        if (index === -1) throw new Error('Medication not found');
        db.medications[index] = { ...db.medications[index], ...args, updated_at: new Date().toISOString() };
        saveDB(db);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Medication updated' }, null, 2) }],
        };
      }

      case 'delete_medication': {
        db.medications = db.medications.filter(m => m.id !== args.medication_id);
        db.schedules = db.schedules.filter(s => s.medication_id !== args.medication_id);
        db.logs = db.logs.filter(l => l.medication_id !== args.medication_id);
        saveDB(db);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Medication deleted' }, null, 2) }],
        };
      }

      case 'add_schedule': {
        const schedule = {
          id: db.nextId.schedule++,
          ...args,
          active: true,
          created_at: new Date().toISOString()
        };
        db.schedules.push(schedule);
        saveDB(db);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, schedule_id: schedule.id }, null, 2) }],
        };
      }

      case 'list_schedules': {
        let schedules = db.schedules;
        if (args.medication_id) {
          schedules = schedules.filter(s => s.medication_id === args.medication_id);
        }
        if (args.active_only) {
          schedules = schedules.filter(s => s.active);
        }
        return {
          content: [{ type: 'text', text: JSON.stringify({ schedules }, null, 2) }],
        };
      }

      case 'log_medication': {
        const log = {
          id: db.nextId.log++,
          ...args,
          taken_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        db.logs.push(log);
        if (args.status === 'taken') {
          const med = db.medications.find(m => m.id === args.medication_id);
          if (med && med.remaining_quantity > 0) {
            med.remaining_quantity--;
          }
        }
        saveDB(db);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, log_id: log.id }, null, 2) }],
        };
      }

      case 'get_medication_history': {
        let logs = db.logs;
        if (args.medication_id) {
          logs = logs.filter(l => l.medication_id === args.medication_id);
        }
        logs = logs.slice(0, args.limit || 50);
        return {
          content: [{ type: 'text', text: JSON.stringify({ history: logs }, null, 2) }],
        };
      }

      case 'get_todays_schedule': {
        const today = new Date().toISOString().split('T')[0];
        const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'short' });
        const schedules = db.schedules.filter(s => {
          if (!s.active) return false;
          if (s.start_date > today) return false;
          if (s.end_date && s.end_date < today) return false;
          if (s.frequency === 'daily') return true;
          if (s.frequency === 'weekly' && s.days_of_week && s.days_of_week.includes(dayOfWeek)) return true;
          return false;
        });
        return {
          content: [{ type: 'text', text: JSON.stringify({ date: today, schedules }, null, 2) }],
        };
      }

      case 'get_refill_alerts': {
        const threshold = args.threshold || 7;
        const meds = db.medications.filter(m => m.remaining_quantity !== null && m.remaining_quantity <= threshold && m.remaining_quantity > 0);
        return {
          content: [{ type: 'text', text: JSON.stringify({ threshold, medications_needing_refill: meds }, null, 2) }],
        };
      }

      case 'get_adherence_stats': {
        const days = args.days || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        const logs = db.logs.filter(l => l.taken_at >= startDateStr);
        const statsByMed = {};
        logs.forEach(log => {
          if (!statsByMed[log.medication_id]) {
            statsByMed[log.medication_id] = { medication_id: log.medication_id, total_logs: 0, taken_count: 0, missed_count: 0, skipped_count: 0 };
          }
          statsByMed[log.medication_id].total_logs++;
          if (log.status === 'taken') statsByMed[log.medication_id].taken_count++;
          if (log.status === 'missed') statsByMed[log.medication_id].missed_count++;
          if (log.status === 'skipped') statsByMed[log.medication_id].skipped_count++;
        });
        
        const stats = Object.values(statsByMed).map(s => ({
          ...s,
          adherence_rate: s.total_logs > 0 ? ((s.taken_count / s.total_logs) * 100).toFixed(2) : 0
        }));
        
        return {
          content: [{ type: 'text', text: JSON.stringify({ period_days: days, start_date: startDateStr, statistics: stats }, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: error.message }, null, 2) }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Medication Manager MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
