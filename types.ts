
export type Language = 'bn' | 'en';

export interface Madrasah {
  id: string;
  name: string;
  phone?: string;
  logo_url?: string;
  is_active: boolean;
  is_super_admin: boolean;
  created_at: string;
  email?: string;
  login_code?: string;
  balance: number;
  sms_balance: number; // Added
}

export interface AdminSMSStock {
  id: string;
  remaining_sms: number;
  updated_at: string;
}

export interface Class {
  id: string;
  class_name: string;
  madrasah_id: string;
  created_at: string;
}

export interface Student {
  id: string;
  student_name: string;
  guardian_name?: string;
  roll?: number;
  guardian_phone: string;
  guardian_phone_2?: string;
  class_id: string;
  madrasah_id: string;
  created_at: string;
  classes?: Class;
}

export interface Transaction {
  id: string;
  madrasah_id: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'pending' | 'approved' | 'rejected';
  transaction_id?: string;
  sender_phone?: string;
  description: string;
  sms_count?: number; // Added
  created_at: string;
  madrasahs?: Madrasah;
}

export interface SMSTemplate {
  id: string;
  madrasah_id: string;
  title: string;
  body: string;
  created_at: string;
}

export interface SMSLog {
  id: string;
  madrasah_id: string;
  student_id?: string;
  recipient_phone: string;
  message: string;
  cost: number;
  status: 'sent' | 'failed';
  created_at: string;
}

export interface RecentCall {
  id: string;
  student_id: string;
  guardian_phone: string;
  madrasah_id: string;
  called_at: string;
  students?: Student;
}

export type View = 'home' | 'classes' | 'account' | 'students' | 'student-details' | 'student-form' | 'class-form' | 'admin-panel' | 'transactions' | 'wallet-sms' | 'admin-dashboard' | 'admin-approvals';

export interface AppState {
  currentView: View;
  selectedClassId?: string;
  selectedStudent?: Student;
  isEditing?: boolean;
}
