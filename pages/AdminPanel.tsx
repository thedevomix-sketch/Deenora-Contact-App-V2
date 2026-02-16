
import React, { useState, useEffect, useMemo } from 'react';
// Added Hash to the lucide-react imports
import { Loader2, Search, ChevronRight, User as UserIcon, RefreshCcw, Clock, Zap, Activity, Users2, AlertCircle, BarChart, Smartphone, CreditCard, CheckCircle2, XCircle, TrendingUp, BarChart3, ArrowLeft, Shield, Check, Copy, Save, Server, Key, Users, Layers, Hash } from 'lucide-react';
import { supabase, smsApi } from '../supabase';
import { Madrasah, Language, Transaction, AdminSMSStock } from '../types';

interface MadrasahWithStats extends Madrasah {
  student_count?: number;
  class_count?: number;
  total_sms_sent?: number;
}

interface AdminPanelProps {
  lang: Language;
  currentView?: 'list' | 'dashboard' | 'approvals';
  dataVersion?: number;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ lang, currentView = 'list', dataVersion = 0 }) => {
  const [madrasahs, setMadrasahs] = useState<MadrasahWithStats[]>([]);
  const [pendingTrans, setPendingTrans] = useState<Transaction[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'approvals' | 'details' | 'dashboard'>(
    currentView === 'approvals' ? 'approvals' : currentView === 'dashboard' ? 'dashboard' : 'list'
  );

  const [smsToCredit, setSmsToCredit] = useState<{ [key: string]: string }>({});
  const [totalGlobalUsage, setTotalGlobalUsage] = useState(0);

  // Status Modal State
  const [statusModal, setStatusModal] = useState<{show: boolean, type: 'success' | 'error', title: string, message: string}>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Selected User Detail Management
  const [selectedUser, setSelectedUser] = useState<MadrasahWithStats | null>(null);
  const [userStats, setUserStats] = useState({ students: 0, classes: 0, used_sms: 0 });
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editActive, setEditActive] = useState(true);
  
  const [editReveApiKey, setEditReveApiKey] = useState('');
  const [editReveSecretKey, setEditReveSecretKey] = useState('');
  const [editReveCallerId, setEditReveCallerId] = useState('');

  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { initData(); }, [dataVersion, currentView]);

  useEffect(() => {
    if (currentView === 'approvals') setView('approvals');
    else if (currentView === 'dashboard') setView('dashboard');
    else if (currentView === 'list') setView('list');
  }, [currentView]);

  const initData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAllMadrasahs(), 
        fetchPendingTransactions(), 
        fetchTransactionHistory(),
        fetchTotalSmsUsage()
      ]);
    } catch (err) { 
      console.error("AdminPanel Init Error:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchTotalSmsUsage = async () => {
    try {
      const { count } = await supabase.from('sms_logs').select('*', { count: 'exact', head: true });
      if (count !== null) setTotalGlobalUsage(count);
    } catch (e) { console.warn("Usage fetch error:", e); }
  };

  const showStatus = (type: 'success' | 'error', title: string, message: string) => {
    setStatusModal({ show: true, type, title, message });
    if (type === 'success') {
      setTimeout(() => setStatusModal(prev => ({ ...prev, show: false })), 4000);
    }
  };

  const fetchAllMadrasahs = async () => {
    setListLoading(true);
    const { data, error } = await supabase.from('madrasahs').select('*').neq('is_super_admin', true).order('created_at', { ascending: false });
    if (error) { setListLoading(false); return; }
    
    if (data) {
      const withStats = await Promise.all(data.map(async (m) => {
        try {
          const [stdCount, clsCount] = await Promise.all([
            supabase.from('students').select('*', { count: 'exact', head: true }).eq('madrasah_id', m.id),
            supabase.from('classes').select('*', { count: 'exact', head: true }).eq('madrasah_id', m.id)
          ]);
          return { ...m, student_count: stdCount.count || 0, class_count: clsCount.count || 0 };
        } catch (e) {
          return { ...m, student_count: 0, class_count: 0 };
        }
      }));
      setMadrasahs(withStats);
    }
    setListLoading(false);
  };

  const fetchPendingTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, madrasahs(name, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setPendingTrans(data);
  };

  const fetchTransactionHistory = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, madrasahs(name, phone)')
      .neq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setTransactionHistory(data);
  };

  const fetchDynamicStats = async (madrasahId: string) => {
    setIsRefreshingStats(true);
    try {
      const [studentsRes, classesRes, usageRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('madrasah_id', madrasahId),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('madrasah_id', madrasahId),
        supabase.from('sms_logs').select('*', { count: 'exact', head: true }).eq('madrasah_id', madrasahId)
      ]);
      setUserStats({ students: studentsRes.count || 0, classes: classesRes.count || 0, used_sms: (usageRes as any).count || 0 });
    } catch (err) { console.error("Stats Fetch Error:", err); } finally { setIsRefreshingStats(false); }
  };

  const handleUserClick = async (m: MadrasahWithStats) => {
    setSelectedUser(m);
    setEditName(m.name || '');
    setEditPhone(m.phone || '');
    setEditActive(m.is_active !== false);
    setEditReveApiKey(m.reve_api_key || '');
    setEditReveSecretKey(m.reve_secret_key || '');
    setEditReveCallerId(m.reve_caller_id || '');
    setView('details');
    await fetchDynamicStats(m.id);
  };

  const updateUserProfile = async () => {
    if (!selectedUser) return;
    setIsUpdatingUser(true);
    try {
      const { error: updateError } = await supabase.from('madrasahs').update({
        name: editName.trim(), phone: editPhone.trim(), is_active: editActive,
        reve_api_key: editReveApiKey.trim() || null, reve_secret_key: editReveSecretKey.trim() || null, reve_caller_id: editReveCallerId.trim() || null
      }).eq('id', selectedUser.id);
      if (updateError) throw updateError;
      showStatus('success', 'সফল হয়েছে!', 'ব্যবহারকারীর তথ্য সফলভাবে আপডেট করা হয়েছে।');
      await initData(); setView('list'); setSelectedUser(null);
    } catch (err: any) { showStatus('error', 'ব্যর্থ হয়েছে!', err.message); } finally { setIsUpdatingUser(false); }
  };

  const approveTransaction = async (tr: Transaction) => {
    const sms = Number(smsToCredit[tr.id]);
    if (!sms || sms <= 0) return showStatus('error', 'সতর্কতা!', 'অনুগ্রহ করে সঠিক SMS সংখ্যা লিখুন');
    try {
      const { error } = await supabase.rpc('approve_payment_with_sms', { t_id: tr.id, m_id: tr.madrasah_id, sms_to_give: sms });
      if (error) throw error;
      showStatus('success', 'অনুমোদিত!', 'লেনদেনটি সফলভাবে অনুমোদন করা হয়েছে।');
      initData();
    } catch (err: any) { showStatus('error', 'ভুল হয়েছে!', err.message); }
  };

  const filtered = useMemo(() => madrasahs.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())), [madrasahs, searchQuery]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      {view === 'dashboard' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/95 p-6 rounded-[2.5rem] shadow-xl flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-3">
                   <Users2 size={24} />
                </div>
                <h4 className="text-3xl font-black text-[#2E0B5E]">{loading ? '...' : madrasahs.length}</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Total Madrasahs</p>
              </div>
              <div className="bg-white/95 p-6 rounded-[2.5rem] shadow-xl flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-3">
                   <BarChart size={24} />
                </div>
                <h4 className="text-3xl font-black text-[#2E0B5E]">{loading ? '...' : totalGlobalUsage}</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Global SMS Usage</p>
              </div>
           </div>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-6">
          <div className="relative px-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input type="text" placeholder="মাদরাসা খুঁজুন..." className="w-full pl-14 pr-14 py-5 bg-white border border-slate-100 rounded-[2rem] outline-none text-slate-800 font-bold shadow-xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <button onClick={initData} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8D30F4] p-2">
               <RefreshCcw size={20} className={loading || listLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="space-y-3">
            {filtered.map(m => (
              <div key={m.id} onClick={() => handleUserClick(m)} className="bg-white/95 p-5 rounded-[2.2rem] border border-white/50 flex flex-col shadow-lg active:scale-[0.98] transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 shrink-0">
                      {m.logo_url ? <img src={m.logo_url} className="w-full h-full object-cover rounded-2xl" /> : <UserIcon size={24} />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-800 truncate font-noto text-lg">{m.name}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.phone || 'No Phone'}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 bg-[#F2F5FF] px-4 py-2 rounded-2xl">
                     <p className="text-lg font-black text-[#8D30F4] leading-none">{m.sms_balance || 0}</p>
                     <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-1">SMS</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'details' && selectedUser && (
        <div className="animate-in slide-in-from-right-5 duration-300 space-y-6">
           <div className="flex items-center gap-4 px-2">
              <button onClick={() => setView('list')} className="w-11 h-11 bg-white/20 rounded-[1rem] flex items-center justify-center text-white border border-white/20 shadow-xl">
                <ArrowLeft size={22} strokeWidth={3} />
              </button>
              <h1 className="text-xl font-black text-white font-noto drop-shadow-md">User Details</h1>
           </div>

           <div className="bg-white/95 rounded-[2.8rem] p-8 border border-white shadow-2xl space-y-8">
              <div className="flex flex-col items-center text-center">
                 <div className="w-24 h-24 bg-slate-50 rounded-[2.2rem] flex items-center justify-center text-slate-300 border-4 border-white shadow-xl overflow-hidden mb-4">
                    {selectedUser.logo_url ? <img src={selectedUser.logo_url} className="w-full h-full object-cover" /> : <UserIcon size={40} />}
                 </div>
                 <h2 className="text-2xl font-black text-slate-800 font-noto">{selectedUser.name}</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-slate-50 p-4 rounded-3xl text-center">
                    <Users size={18} className="mx-auto text-[#8D30F4] mb-2" />
                    <p className="text-lg font-black text-slate-800">{userStats.students}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Students</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-3xl text-center">
                    <Zap size={18} className="mx-auto text-orange-500 mb-2" />
                    <p className="text-lg font-black text-slate-800">{userStats.used_sms}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">SMS Used</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Madrasah Name</label>
                    <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800 font-noto" value={editName} onChange={(e) => setEditName(e.target.value)} />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mobile Number</label>
                    <input type="tel" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                 </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-5 rounded-[1.8rem]">
                 <span className="text-sm font-black text-slate-700">Account Active</span>
                 <button onClick={() => setEditActive(!editActive)} className={`w-14 h-8 rounded-full transition-all relative ${editActive ? 'bg-green-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${editActive ? 'right-1' : 'left-1'}`} />
                 </button>
              </div>

              <button onClick={updateUserProfile} disabled={isUpdatingUser} className="w-full h-16 premium-btn text-white font-black rounded-[2rem] flex items-center justify-center gap-3 shadow-xl">
                 {isUpdatingUser ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> Save User Settings</>}
              </button>
           </div>
        </div>
      )}

      {view === 'approvals' && (
        <div className="space-y-8 px-1">
          <div className="space-y-4">
            {pendingTrans.length > 0 ? pendingTrans.map(tr => (
              <div key={tr.id} className="bg-white p-5 rounded-[2rem] border border-white shadow-xl space-y-4 animate-in slide-in-from-bottom-3">
                <div className="flex items-center justify-between">
                  <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[14px] font-black border border-green-100">
                    {tr.amount} ৳
                  </div>
                  <div className="text-[11px] font-black text-slate-400">
                    {new Date(tr.created_at).toLocaleDateString('bn-BD')}
                  </div>
                </div>

                <div className="px-1">
                  <p className="text-[14px] font-black text-slate-800 font-noto">{(tr as any).madrasahs?.name || 'Loading...'}</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Sender</p>
                    <p className="text-[11px] font-black text-slate-700 truncate">{tr.sender_phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase">TrxID</p>
                    <p className="text-[11px] font-black text-[#8D30F4] truncate">{tr.transaction_id}</p>
                  </div>
                </div>

                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input 
                    type="number" 
                    className="w-full h-12 pl-10 pr-5 bg-slate-50 border border-slate-100 rounded-xl font-black text-sm outline-none" 
                    value={smsToCredit[tr.id] || ''} 
                    onChange={(e) => setSmsToCredit({...smsToCredit, [tr.id]: e.target.value})} 
                    placeholder="এসএমএস সংখ্যা লিখুন" 
                  />
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => approveTransaction(tr)} 
                    className="flex-[2] h-12 bg-green-500 text-white font-black rounded-xl text-xs active:scale-95 transition-all"
                  >
                    অনুমোদন দিন
                  </button>
                  <button 
                    onClick={async () => { if(confirm('বাতিল করবেন?')) { await supabase.from('transactions').update({ status: 'rejected' }).eq('id', tr.id); initData(); } }} 
                    className="flex-1 h-12 bg-red-50 text-red-500 font-black rounded-xl text-xs active:scale-95 transition-all"
                  >
                    বাতিল
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 bg-white/10 rounded-[2.5rem] border-2 border-dashed border-white/30 backdrop-blur-sm">
                <p className="text-white font-black uppercase text-[10px]">No pending requests</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATUS MODAL */}
      {statusModal.show && (
        <div className="fixed inset-0 bg-[#080A12]/40 backdrop-blur-2xl z-[1000] flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className={`bg-white w-full max-w-sm rounded-[3.5rem] p-12 text-center shadow-2xl animate-in zoom-in-95 duration-300`}>
             <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ${statusModal.type === 'success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                {statusModal.type === 'success' ? <CheckCircle2 size={56} strokeWidth={2.5} /> : <AlertCircle size={56} strokeWidth={2.5} />}
             </div>
             <h3 className="text-2xl font-black text-slate-800 font-noto">{statusModal.title}</h3>
             <p className="text-[13px] font-bold text-slate-400 mt-4 font-noto">{statusModal.message}</p>
             <button onClick={() => setStatusModal(prev => ({ ...prev, show: false }))} className={`w-full mt-10 py-5 font-black rounded-full text-white ${statusModal.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>ঠিক আছে</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
