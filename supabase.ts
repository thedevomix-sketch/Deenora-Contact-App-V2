
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ulgjljnnimilqtfgohjc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZ2psam5uaW1pbHF0ZmdvaGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDE3MDUsImV4cCI6MjA4NTUxNzcwNX0.18TM-hXror0oBhZYzH-7Y3zfdCCxEJDMuBrdhgNCGTw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage
  }
});

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
  // Cache a query result
  setCache: (key: string, data: any) => {
    localStorage.setItem(`cache_${key}`, JSON.stringify(data));
  },

  // Get cached query result
  getCache: (key: string) => {
    const cached = localStorage.getItem(`cache_${key}`);
    return cached ? JSON.parse(cached) : null;
  },

  // Remove a specific cache
  removeCache: (key: string) => {
    localStorage.removeItem(`cache_${key}`);
  },

  // Queue a mutation for sync later
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
    
    // Also update relevant local cache optimistically
    if (table === 'students' || table === 'classes') {
      const cacheKey = table;
      const currentCache = offlineApi.getCache(cacheKey) || [];
      if (type === 'INSERT') {
        offlineApi.setCache(cacheKey, [...currentCache, { ...payload, id: 'temp_' + Date.now(), created_at: new Date().toISOString() }]);
      }
    }
  },

  // Get pending actions
  getQueue: (): PendingAction[] => {
    return JSON.parse(localStorage.getItem('sync_queue') || '[]');
  },

  // Clear or remove handled item from queue
  removeFromQueue: (id: string) => {
    const queue: PendingAction[] = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    const newQueue = queue.filter(item => item.id !== id);
    localStorage.setItem('sync_queue', JSON.stringify(newQueue));
  },

  // Sync engine
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
