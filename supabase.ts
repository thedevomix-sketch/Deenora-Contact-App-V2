
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

export const smsApi = {
  getGlobalSettings: async () => {
    const { data } = await supabase.from('system_settings').select('*').eq('id', '00000000-0000-0000-0000-000000000001').maybeSingle();
    return data || { reve_api_key: 'aa407e1c6629da8e', reve_secret_key: '91051e7e', bkash_number: '০১৭৬৬-XXXXXX' };
  },

  sendBulk: async (madrasahId: string, students: Student[], message: string) => {
    // 1. Fetch Madrasah specifics (Balance, CallerID)
    const { data: mData } = await supabase.from('madrasahs').select('sms_balance, reve_caller_id, reve_client_id').eq('id', madrasahId).single();
    if (!mData || (mData.sms_balance || 0) < students.length) {
      throw new Error("Insufficient SMS balance.");
    }

    // 2. Get Global API Keys
    const creds = await smsApi.getGlobalSettings();
    
    // Use Madrasah specific CallerID if set by Admin, otherwise global
    const callerId = mData.reve_caller_id || creds.reve_caller_id;
    if (!callerId) throw new Error("Caller ID is not configured for this user.");

    const phoneList = students.map(s => {
      let p = s.guardian_phone.replace(/\D/g, '');
      return p.startsWith('88') ? p : `88${p}`;
    }).join(',');

    const contentArray = [{
      callerID: callerId,
      toUser: phoneList,
      messageContent: message
    }];

    const apiUrl = `https://smpp.revesms.com:7790/send?apikey=${creds.reve_api_key}&secretkey=${creds.reve_secret_key}&content=${encodeURIComponent(JSON.stringify(contentArray))}`;

    try {
      const response = await fetch(apiUrl);
      const result = await response.json();
      if (result.Status === "0") {
        await supabase.rpc('send_bulk_sms_rpc', {
          p_madrasah_id: madrasahId,
          p_student_ids: students.map(s => s.id),
          p_message: message
        });
        return { success: true };
      } else {
        throw new Error(`Gateway: ${result.Text || 'Error'}`);
      }
    } catch (err: any) {
      throw new Error(err.message || "Failed to connect to SMS Gateway.");
    }
  },

  // Direct send for single notification (used by Admin)
  sendDirect: async (phone: string, message: string, madrasahId?: string) => {
    const creds = await smsApi.getGlobalSettings();
    let callerId = creds.reve_caller_id;

    if (madrasahId) {
      const { data } = await supabase.from('madrasahs').select('reve_caller_id').eq('id', madrasahId).single();
      if (data?.reve_caller_id) callerId = data.reve_caller_id;
    }

    if (!callerId) return;

    const p = phone.replace(/\D/g, '');
    const target = p.startsWith('88') ? p : `88${p}`;
    const content = [{ callerID: callerId, toUser: target, messageContent: message }];
    const apiUrl = `https://smpp.revesms.com:7790/send?apikey=${creds.reve_api_key}&secretkey=${creds.reve_secret_key}&content=${encodeURIComponent(JSON.stringify(content))}`;
    
    try { await fetch(apiUrl); } catch (e) {}
  }
};

export const offlineApi = {
  setCache: (key: string, data: any) => { try { localStorage.setItem(`cache_${key}`, JSON.stringify(data)); } catch (e) {} },
  getCache: (key: string) => { try { const cached = localStorage.getItem(`cache_${key}`); return cached ? JSON.parse(cached) : null; } catch (e) { return null; } },
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
