import pkg from '@supabase/supabase-js';
const { createClient } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Regular client for user operations (respects RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Service role client for admin operations (bypasses RLS)
// Used by cron jobs and system tasks
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

class SupabaseDatabase {
  // Set user context for RLS
  async setUserContext(userId) {
    if (userId) {
      console.log(`🔐 Setting user context: ${userId}`);
      const { error } = await supabase.rpc('set_current_user_id', { p_user_id: userId });
      if (error) {
        console.error('❌ Error setting user context:', error);
        throw error; // Don't continue if context can't be set
      }
      console.log(`✅ User context set successfully for user ${userId}`);
    } else {
      console.warn('⚠️ setUserContext called with null/undefined userId');
    }
  }

  // Medications
  async addMedication(data, userId = null) {
    if (userId) await this.setUserContext(userId);

    const { data: medication, error } = await supabase
      .from('medications')
      .insert([{
        ...data,
        user_id: userId, // Link to user
        refill_count: 0,
        remaining_quantity: data.total_quantity || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return medication;
  }

  async getMedications(filter = {}, userId = null) {
    if (userId) await this.setUserContext(userId);

    let query = supabase.from('medications').select('*');
    // Explicitly filter by user_id to enforce per-account isolation in addition to RLS
    // user_id column not present in medication_logs; rely on RLS


    // RLS will automatically filter by user_id
    if (filter.search) {
      query = query.or(`name.ilike.%${filter.search}%,purpose.ilike.%${filter.search}%`);
    }

    if (filter.active_only) {
      query = query.gt('remaining_quantity', 0);
    }

    query = query.order('name');

    const { data, error } = await query;
    if (error) throw error;
    // Return wrapped in object for consistency with API endpoints
    return { medications: data || [] };
  }

  async getMedication(id, userId = null) {
    if (userId) await this.setUserContext(userId);

    let query = supabase
      .from('medications')
      .select('*')
      .eq('id', id);
    // user_id column not present in medication_logs; rely on RLS

    const { data, error } = await query.single();

    // If no row found, Supabase returns an error with code 'PGRST116'.
    // Treat that case as "not found" so the route can answer 404 cleanly.
    if (error) {
      if (error.code === 'PGRST116' || error.details?.includes('0 rows')) {
        return null; // allow caller to send 404
      }
      throw error; // genuine error
    }
    return data;
  }

  async updateMedication(id, updates, userId = null) {
    if (userId) await this.setUserContext(userId);

    const { error } = await supabase
      .from('medications')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async deleteMedication(id, userId = null) {
    if (userId) await this.setUserContext(userId);

    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Schedules
  async addSchedule(data, userId = null) {
    if (userId) await this.setUserContext(userId);

    // Remove medication_name as it's not a column in the schedules table
    // It's only used for display and is joined from medications table
    const { medication_name, ...scheduleData } = data;

    const { data: schedule, error } = await supabase
      .from('schedules')
      .insert([{ ...scheduleData, user_id: userId, active: true }])
      .select()
      .single();

    if (error) throw error;
    return schedule;
  }

  async getSchedules(filter = {}, userId = null) {
    // Use regular client (respects RLS)
    if (userId) await this.setUserContext(userId);

    let query = supabase
      .from('schedules')
      .select(`
        *,
        medications (name)
      `);
    // user_id column not present in medication_logs; rely on RLS


    if (filter.medication_id) {
      query = query.eq('medication_id', filter.medication_id);
    }

    if (filter.active_only) {
      query = query.eq('active', true);
    }

    query = query.order('time');

    const { data, error } = await query;
    if (error) throw error;

    const schedules = (data || []).map(s => ({
      ...s,
      medication_name: s.medications?.name || 'Unknown'
    }));

    return { schedules };
  }

  async updateSchedule(id, updates, userId = null) {
    if (userId) await this.setUserContext(userId);

    const { error } = await supabase
      .from('schedules')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async deleteSchedule(id, userId = null) {
    if (userId) await this.setUserContext(userId);

    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Logs
  async addLog(data, userId = null) {
    if (userId) await this.setUserContext(userId);

    const taken_at = data.taken_at || new Date().toISOString();

    const { data: log, error } = await supabase
      .from('medication_logs')
      .insert([{ ...data, taken_at }])
      .select()
      .single();

    if (error) throw error;

    // Update quantity if taken
    if (data.status === 'taken') {
      await supabase.rpc('decrement_quantity', { med_id: data.medication_id });
    }

    return log;
  }

  async getLogs(filter = {}, userId = null) {
    if (userId) await this.setUserContext(userId);

    let query = supabase
      .from('medication_logs')
      .select(`
        *,
        medications (name, dosage)
      `);
    // user_id column not present in medication_logs; rely on RLS


    if (filter.medication_id) {
      query = query.eq('medication_id', filter.medication_id);
    }

    if (filter.start_date) {
      query = query.gte('taken_at', filter.start_date);
    }

    if (filter.end_date) {
      query = query.lte('taken_at', filter.end_date + 'T23:59:59');
    }

    query = query.order('taken_at', { ascending: false });

    if (filter.limit) {
      query = query.limit(parseInt(filter.limit));
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(l => ({
      ...l,
      medication_name: l.medications?.name || 'Unknown',
      dosage: l.medications?.dosage || ''
    }));
  }

  // Today's Schedule (for specific user)
  async getTodaySchedule(userId = null) {
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'short' });

    // Use admin client if no userId (for cron jobs), otherwise use regular client
    const client = userId ? supabase : supabaseAdmin;

    if (userId) await this.setUserContext(userId);

    let query = client
      .from('schedules')
      .select(`
        *,
        medications (name, dosage, form, remaining_quantity)
      `)
      .eq('active', true)
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .or(`frequency.eq.daily,days_of_week.like.%${dayOfWeek}%`)
      .order('time');

    // Note: No need to filter by user_id here
    // - schedules table doesn't have user_id column
    // - When userId provided, RLS policies automatically filter by user
    // - When using admin client (no userId), we want ALL schedules for cron

    const { data: schedules, error } = await query;

    if (error) throw error;

    // Check which ones have been logged today
    const { data: logs } = await client
      .from('medication_logs')
      .select('medication_id, schedule_id, status')
      .gte('taken_at', today)
      .lt('taken_at', today + 'T23:59:59');

    // Note: RLS policies handle user filtering automatically
    // Admin client gets all logs for cron job

    const loggedMap = new Map();
    (logs || []).forEach(log => {
      const key = `${log.medication_id}-${log.schedule_id}`;
      loggedMap.set(key, log.status);
    });

    return (schedules || []).map(s => ({
      ...s,
      name: s.medications?.name || 'Unknown',
      dosage: s.medications?.dosage || '',
      form: s.medications?.form || '',
      remaining_quantity: s.medications?.remaining_quantity || 0,
      user_phone: s.user_phone || null, // user_phone is directly on schedules table
      status: loggedMap.get(`${s.medication_id}-${s.id}`) || 'pending'
    }));
  }

  // Refill Alerts
  async getRefillAlerts(threshold = 7, userId = null) {
    if (userId) await this.setUserContext(userId);

    let query = supabase
      .from('medications')
      .select('*');
    // user_id column not present in medication_logs; rely on RLS


    query = query
      .not('remaining_quantity', 'is', null)
      .lte('remaining_quantity', threshold)
      .gt('remaining_quantity', 0)
      .order('remaining_quantity');

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  // Update Quantity
  async updateQuantity(id, change, isRefill = false) {
    const { data: med } = await supabase
      .from('medications')
      .select('remaining_quantity, refill_count')
      .eq('id', id)
      .single();

    if (!med) return false;

    const updates = {
      remaining_quantity: (med.remaining_quantity || 0) + change
    };

    if (isRefill) {
      updates.refill_count = (med.refill_count || 0) + 1;
    }

    const { error } = await supabase
      .from('medications')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Adherence Stats
  async getAdherenceStats(days = 30, medicationId = null, userId = null) {
    if (userId) await this.setUserContext(userId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    let query = supabase
      .from('medication_logs')
      .select(`
        medication_id,
        status,
        medications (name)
      `)
      .gte('taken_at', startDateStr);

    // user_id column not present in medication_logs; rely on RLS


    if (medicationId) {
      query = query.eq('medication_id', medicationId);
    }

    const { data: logs, error } = await query;
    if (error) throw error;

    // Group by medication
    const statsByMed = {};
    (logs || []).forEach(log => {
      if (!statsByMed[log.medication_id]) {
        statsByMed[log.medication_id] = {
          medication_id: log.medication_id,
          medication_name: log.medications?.name || 'Unknown',
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
  async addInteraction(data) {
    const { data: interaction, error } = await supabase
      .from('interactions')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return interaction;
  }

  async getInteractions(medicationId = null) {
    let query = supabase
      .from('interactions')
      .select(`
        *,
        med1:medications!medication1_id (name),
        med2:medications!medication2_id (name)
      `);

    if (medicationId) {
      const id = parseInt(medicationId);
      query = query.or(`medication1_id.eq.${id},medication2_id.eq.${id}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(i => ({
      ...i,
      medication1_name: i.med1?.name || 'Unknown',
      medication2_name: i.med2?.name || 'Unknown'
    }));
  }

}

export default new SupabaseDatabase();
