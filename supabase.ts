
import { createClient } from '@supabase/supabase-js';
import { Student } from './types';

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
 * SMS API UTILITY
 * Handles the backend-like logic for sending SMS
 */
export const smsApi = {
  sendBulk: async (madrasahId: string, students: Student[], message: string) => {
    const phoneNumbers = students.map(s => s.guardian_phone);
    
    try {
      // 1. Simulate calling an actual SMS Gateway API
      // In a real environment, you would use a secret API key from process.env
      // fetch('https://api.sms-provider.com/send', { method: 'POST', body: JSON.stringify({ to: phoneNumbers, msg: message }) });
      console.log(`[SMS GATEWAY SIMULATION] Sending message to ${phoneNumbers.length} recipients...`);
      
      // 2. Call the consolidated PostgreSQL RPC
      // This handles: Credit check, Credit deduction, Transaction logging, and SMS logging
      const { data, error } = await supabase.rpc('send_bulk_sms_rpc', {
        p_madrasah_id: madrasahId,
        p_student_ids: students.map(s => s.id),
        p_message: message
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      return { success: true, count: phoneNumbers.length };
    } catch (err: any) {
      console.error("SMS Sending Error:", err);
      throw err;
    }
  }
};

/**
 * OFFLINE MANAGEMENT SYSTEM
 */

interface PendingAction {
  id: string;
  table: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: number;
}

export const offlineApi = {
  setCache: (key: string, data: any) => {
    localStorage.setItem(`cache_${key}`, JSON.stringify(data));
  },
  getCache: (key: string) => {
    const cached = localStorage.getItem(`cache_${key}`);
    return cached ? JSON.parse(cached) : null;
  },
  removeCache: (key: string) => {
    localStorage.removeItem(`cache_${key}`);
  },
  queueAction: (table: string, type: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => {
    const queue: PendingAction[] = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    queue.push({
      id: Math.random().toString(36).substr(2, 9),
      table,
      type,
      payload,
      timestamp: Date.now()
    });
    localStorage.setItem('sync_queue', JSON.stringify(queue));
    
    if (table === 'students' || table === 'classes') {
      const cacheKey = table;
      const currentCache = offlineApi.getCache(cacheKey) || [];
      if (type === 'INSERT') {
        offlineApi.setCache(cacheKey, [...currentCache, { ...payload, id: 'temp_' + Date.now(), created_at: new Date().toISOString() }]);
      }
    }
  },
  getQueue: (): PendingAction[] => {
    return JSON.parse(localStorage.getItem('sync_queue') || '[]');
  },
  removeFromQueue: (id: string) => {
    const queue: PendingAction[] = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    const newQueue = queue.filter(item => item.id !== id);
    localStorage.setItem('sync_queue', JSON.stringify(newQueue));
  },
  processQueue: async () => {
    const queue = offlineApi.getQueue();
    if (queue.length === 0) return;

    for (const action of queue) {
      try {
        let result;
        if (action.type === 'INSERT') {
          result = await supabase.from(action.table).insert(action.payload);
        } else if (action.type === 'UPDATE') {
          result = await supabase.from(action.table).update(action.payload).eq('id', action.payload.id);
        } else if (action.type === 'DELETE') {
          result = await supabase.from(action.table).delete().eq('id', action.payload.id);
        }

        if (!result?.error) {
          offlineApi.removeFromQueue(action.id);
        }
      } catch (e) {
        console.error("Sync failed for action:", action, e);
      }
    }
  }
};
