
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
 * SMS GATEWAY CONFIGURATION
 * আপনার গেটওয়ে সার্ভিস থেকে পাওয়া তথ্যগুলো এখানে বসান
 */
const SMS_CONFIG = {
  API_URL: 'https://bulksmsbd.net/api/smsapi', // উদাহরণ হিসেবে BulkSMSBD এর URL
  API_KEY: 'YOUR_API_KEY_HERE',               // আপনার গেটওয়ে থেকে পাওয়া API Key
  SENDER_ID: '88018XXXXXXXX',                 // আপনার অনুমোদিত Sender ID বা Masking
};

/**
 * SMS API UTILITY
 * Handles the backend-like logic for sending SMS
 */
export const smsApi = {
  sendBulk: async (madrasahId: string, students: Student[], message: string) => {
    const phoneNumbers = students.map(s => s.guardian_phone).join(',');
    
    try {
      // ১. আসল SMS Gateway-তে মেসেজ পাঠানো (Real API Integration)
      // বাংলাদেশের বেশিরভাগ গেটওয়ে সাধারণত GET বা POST মেথড সাপোর্ট করে
      
      /* 
      // উদাহরণস্বরূপ BulkSMSBD বা সিমিলার গেটওয়ের জন্য কোড:
      const gatewayResponse = await fetch(`${SMS_CONFIG.API_URL}?api_key=${SMS_CONFIG.API_KEY}&type=text&number=${phoneNumbers}&senderid=${SMS_CONFIG.SENDER_ID}&message=${encodeURIComponent(message)}`);
      const result = await gatewayResponse.json();
      
      if (result.response_code !== 202) { // ২০২ সাধারণত সফলতার কোড
        throw new Error(result.error_message || "Gateway Error");
      }
      */

      // সিমুলেশন লগ (যতক্ষণ আসল এপিআই কানেক্ট করছেন না)
      console.log(`[SMS GATEWAY] Calling API with Key: ${SMS_CONFIG.API_KEY.substring(0, 5)}...`);
      console.log(`[SMS GATEWAY] Recipients: ${phoneNumbers}`);
      
      // ২. সুপাবেস ডাটাবেজের ক্রেডিট আপডেট করা
      // এটি ব্যালেন্স চেক করবে এবং ক্রেডিট কমিয়ে দেবে
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
