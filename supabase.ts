import { createClient } from '@supabase/supabase-js';
import { Student } from './types';

const supabaseUrl = 'https://lowaqxzwjlewnkqjpeoz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxvd2FxeHp3amxld25rcWpwZW96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NTU2NzYsImV4cCI6MjA4NjMzMTY3Nn0.O4Q0pfol014_k-IrmAZjPBRUii4oSL4OphOIzKldeoM';

// Improved client configuration for performance and reliability
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage
  },
  global: {
    headers: { 'x-application-name': 'madrasah-contact-app' },
    // Use standard fetch but handle errors specifically
    // Fix: Explicitly define parameters to avoid spread operator typing issues in fetch override
    fetch: (input, init) => {
      return fetch(input, init).catch(err => {
        console.error("Supabase Network Error (Failed to Fetch):", err);
        throw new Error("Network connectivity issue. Please check your internet.");
      });
    }
  }
});

/**
 * SMS GATEWAY CONFIGURATION
 */
export const smsApi = {
  sendBulk: async (madrasahId: string, students: Student[], message: string) => {
    const phoneNumbers = students.map(s => s.guardian_phone).join(',');
    
    try {
      console.log(`[SMS GATEWAY] Calling API... Recipients: ${phoneNumbers}`);
      
      const { data, error } = await supabase.rpc('send_bulk_sms_rpc', {
        p_madrasah_id: madrasahId,
        p_student_ids: students.map(s => s.id),
        p_message: message
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      return { success: true, count: students.length };
    } catch (err: any) {
      console.error("SMS Sending Error:", err);
      // Ensure "Failed to fetch" is translated to a user-friendly message
      if (err.message?.includes('Failed to fetch')) {
        throw new Error("Network error: Could not reach SMS server.");
      }
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
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn("LocalStorage set failed", e);
    }
  },
  getCache: (key: string) => {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
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
    
    // UI Update Logic for Students specifically
    if (table === 'students') {
      const classId = payload.class_id;
      if (classId) {
        const cacheKey = `students_list_${classId}`;
        const currentCache = offlineApi.getCache(cacheKey) || [];
        
        if (type === 'INSERT') {
          const tempId = 'temp_' + Date.now();
          offlineApi.setCache(cacheKey, [...currentCache, { ...payload, id: tempId, created_at: new Date().toISOString() }]);
        } else if (type === 'UPDATE') {
          offlineApi.setCache(cacheKey, currentCache.map((s: any) => s.id === payload.id ? { ...s, ...payload } : s));
        } else if (type === 'DELETE') {
          offlineApi.setCache(cacheKey, currentCache.filter((s: any) => s.id !== payload.id));
        }
      }
      offlineApi.removeCache('all_students_search');
    }
    
    if (table === 'classes') {
      const cacheKey = 'classes';
      const currentCache = offlineApi.getCache(cacheKey) || [];
      if (type === 'INSERT') {
        offlineApi.setCache(cacheKey, [...currentCache, { ...payload, id: 'temp_' + Date.now(), created_at: new Date().toISOString() }]);
      }
      offlineApi.removeCache('classes_with_counts');
    }
  },
  getQueue: (): PendingAction[] => {
    try {
      return JSON.parse(localStorage.getItem('sync_queue') || '[]');
    } catch (e) {
      return [];
    }
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