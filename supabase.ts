
import { createClient } from '@supabase/supabase-js';
import { Student, Madrasah } from './types';

const supabaseUrl = 'https://lowaqxzwjlewnkqjpeoz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvd2FxeHp3amxld25rcWpwZW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NTU2NzYsImV4cCI6MjA4NjMzMTY3Nn0.O4Q0pfol014_k-IrmAZjPBRUii4oSL4OphOIzKldeoM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage
  }
});

/**
 * REVE SMS GATEWAY INTEGRATION (Global Admin Controlled)
 */
export const smsApi = {
  // Fetch Global Gateway Credentials
  getGlobalSettings: async () => {
    const { data } = await supabase.from('system_settings').select('*').eq('id', '00000000-0000-0000-0000-000000000001').single();
    return data || {};
  },

  // Send SMS via REVE (Uses Global Settings)
  sendBulk: async (madrasahId: string, students: Student[], message: string) => {
    // 1. Check Madrasah Balance First
    const { data: mData } = await supabase.from('madrasahs').select('sms_balance').eq('id', madrasahId).single();
    if (!mData || (mData.sms_balance || 0) < students.length) {
      throw new Error("Insufficient local SMS balance. Please recharge.");
    }

    // 2. Get Global Gateway Credentials
    const creds = await smsApi.getGlobalSettings();
    if (!creds.reve_api_key || !creds.reve_secret_key || !creds.reve_caller_id) {
      throw new Error("SMS Gateway is not configured by the administrator.");
    }

    // REVE Bulk endpoint uses a JSON content array
    const content = [{
      callerID: creds.reve_caller_id,
      toUser: students.map(s => {
        let p = s.guardian_phone.replace(/\D/g, '');
        return p.startsWith('88') ? p : `88${p}`;
      }).join(','),
      messageContent: message
    }];

    const apiUrl = `https://smpp.revesms.com:7790/send?apikey=${creds.reve_api_key}&secretkey=${creds.reve_secret_key}&content=${encodeURIComponent(JSON.stringify(content))}`;

    try {
      const response = await fetch(apiUrl);
      const result = await response.json();

      if (result.Status === "0") {
        // Update local balance via RPC
        await supabase.rpc('send_bulk_sms_rpc', {
          p_madrasah_id: madrasahId,
          p_student_ids: students.map(s => s.id),
          p_message: message
        });
        return { success: true, count: students.length };
      } else {
        throw new Error(`Gateway: ${result.Text || 'Unknown Error'}`);
      }
    } catch (err: any) {
      console.error("SMS Error:", err);
      throw new Error(err.message || "Gateway Communication Failed");
    }
  }
};

/**
 * OFFLINE MANAGEMENT SYSTEM
 */
export const offlineApi = {
  setCache: (key: string, data: any) => {
    try { localStorage.setItem(`cache_${key}`, JSON.stringify(data)); } catch (e) {}
  },
  getCache: (key: string) => {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (e) { return null; }
  },
  removeCache: (key: string) => localStorage.removeItem(`cache_${key}`),
  queueAction: (table: string, type: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    queue.push({ id: Math.random().toString(36).substr(2, 9), table, type, payload, timestamp: Date.now() });
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  },
  getQueue: () => JSON.parse(localStorage.getItem('sync_queue') || '[]'),
  removeFromQueue: (id: string) => {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    localStorage.setItem('sync_queue', JSON.stringify(queue.filter((item: any) => item.id !== id)));
  },
  processQueue: async () => {
    const queue = offlineApi.getQueue();
    if (queue.length === 0) return;
    for (const action of queue) {
      try {
        if (action.type === 'INSERT') await supabase.from(action.table).insert(action.payload);
        else if (action.type === 'UPDATE') await supabase.from(action.table).update(action.payload).eq('id', action.payload.id);
        else if (action.type === 'DELETE') await supabase.from(action.table).delete().eq('id', action.payload.id);
        offlineApi.removeFromQueue(action.id);
      } catch (e) {}
    }
  }
};
