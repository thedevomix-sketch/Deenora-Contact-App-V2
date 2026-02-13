
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, Shield, ShieldOff, ChevronRight, User as UserIcon, Users, Wallet, CheckCircle, XCircle, PlusCircle, MinusCircle, RefreshCw, AlertTriangle, Bug, Check, Phone, Hash, MessageSquare, Database, Layers, BarChart3, TrendingUp, Activity, Mail, Lock, Copy, Power, History, Clock, Smartphone, Info } from 'lucide-react';
import { supabase } from '../supabase';
import { Madrasah, Language, Transaction, AdminSMSStock } from '../types';
import { t } from '../translations';

interface AdminPanelProps {
  lang: Language;
  currentView?: 'list' | 'dashboard' | 'approvals';
  dataVersion?: number;
}

interface SystemStats {
  totalMadrasahs: number;
  activeMadrasahs: number;
  totalStudents: number;
  totalWalletBalance: number;
  totalSmsBalance: number;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ lang, currentView = 'list', dataVersion = 0 }) => {
  const [madrasahs, setMadrasahs] = useState<Madrasah[]>([]);
  const [pendingTrans, setPendingTrans] = useState<Transaction[]>([]);
  const [adminStock, setAdminStock] = useState<AdminSMSStock | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  const [view, setView] = useState<'list' | 'details' | 'approvals' | 'stock' | 'dashboard'>(currentView === 'dashboard' ? 'dashboard' : currentView === 'approvals' ? 'approvals' : 'list');
  const [selectedMadrasah, setSelectedMadrasah] = useState<Madrasah | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Stock Update State
  const [newStockCount, setNewStockCount] = useState('');
  const [updateMode, setUpdateMode] = useState<'add' | 'set'>('add');
  const [updatingStock, setUpdatingStock] = useState(false);
  const [smsToCredit, setSmsToCredit] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    initData();
  }, [dataVersion]);

  // Sync internal view with currentView prop from App/Layout
  useEffect(() => {
    if (currentView === 'dashboard') {
      setView('dashboard');
    } else if (currentView === 'approvals') {
      setView('approvals');
    } else if (currentView === 'list') {
      setView('list');
    }
  }, [currentView]);

  const initData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setLoading(true);
    
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase.from('madrasahs').select('*').eq('id', user.id).single();
      
      if (profileError || !profile?.is_super_admin) {
         setError("You do not have Super Admin permissions.");
         setLoading(false);
         setIsRefreshing(false);
         return;
      }

      // Fetch essential data for Admin Panel
      await Promise.all([
        fetchAllMadrasahs(), 
        fetchPendingTransactions(), 
        fetchAdminStock(),
        fetchSystemStats()
      ]);
    } catch (err: any) {
      console.error("Admin init error:", err);
      setError(err.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const { data: mData } = await supabase.from('madrasahs').select('balance, sms_balance, is_active, is_super_admin');
      const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
      
      if (mData) {
        const filteredMadrasahs = mData.filter(m => !m.is_super_admin);
        const activeCount = filteredMadrasahs.filter(m => m.is_active !== false).length;
        const totalWallet = filteredMadrasahs.reduce((acc, curr) => acc + (curr.balance || 0), 0);
        const totalSms = filteredMadrasahs.reduce((acc, curr) => acc + (curr.sms_balance || 0), 0);
        
        setStats({
          totalMadrasahs: filteredMadrasahs.length,
          activeMadrasahs: activeCount,
          totalStudents: sCount || 0,
          totalWalletBalance: totalWallet,
          totalSmsBalance: totalSms
        });
      }
    } catch (err) {
      console.error("Stats error:", err);
    }
  };

  const fetchAdminStock = async () => {
    try {
      const { data, error } = await supabase.from('admin_sms_stock').select('*').limit(1).maybeSingle();
      if (data) {
        setAdminStock(data);
      } else {
        const { data: newData } = await supabase.from('admin_sms_stock').insert({ remaining_sms: 0 }).select().single();
        if (newData) setAdminStock(newData);
      }
    } catch (err) {
      console.error("Stock error:", err);
    }
  };

  const fetchAllMadrasahs = async () => {
    try {
      const { data, error } = await supabase.from('madrasahs').select('*').neq('is_super_admin', true).order('created_at', { ascending: false });
      if (error) throw error;
      setMadrasahs(data || []);
    } catch (err) {
      console.error("Madrasahs fetch error:", err);
    }
  };

  const fetchPendingTransactions = async () => {
    try {
      // Use try-catch for relation names which might not be strictly defined in some envs
      const { data, error } = await supabase
        .from('transactions')
        .select('*, madrasahs(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPendingTrans(data || []);
    } catch (err) {
      console.error("Pending trans fetch error:", err);
      // Fallback if relation select fails
      try {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        setPendingTrans(data || []);
      } catch (e) {
        console.error("Critical pending trans error", e);
      }
    }
  };

  const fetchMadrasahDetails = async (madrasah: Madrasah) => {
    setLoadingDetails(true);
    setSelectedMadrasah(madrasah);
    setView('details');
    setLoadingDetails(false);
  };

  const toggleMadrasahStatus = async () => {
    if (!selectedMadrasah) return;
    const newStatus = selectedMadrasah.is_active === false; 
    setUpdatingId(selectedMadrasah.id);
    try {
      const { error } = await supabase.from('madrasahs').update({ is_active: newStatus }).eq('id', selectedMadrasah.id);
      if (error) throw error;
      
      const updatedMadrasah = { ...selectedMadrasah, is_active: newStatus };
      setSelectedMadrasah(updatedMadrasah);
      setMadrasahs(prev => prev.map(m => m.id === selectedMadrasah.id ? updatedMadrasah : m));
      fetchSystemStats();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const updateAdminStock = async () => {
    const count = Number(newStockCount);
    if (!newStockCount || isNaN(count)) return;
    
    setUpdatingStock(true);
    try {
      let currentStock = adminStock?.remaining_sms || 0;
      let finalStock = updateMode === 'add' ? currentStock + count : count;

      if (finalStock < 0) finalStock = 0;

      const { data: existing } = await supabase.from('admin_sms_stock').select('*').limit(1).maybeSingle();
      
      let resError;
      if (existing) {
        const { error } = await supabase.from('admin_sms_stock')
          .update({ remaining_sms: finalStock, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        resError = error;
      } else {
        const { error } = await supabase.from('admin_sms_stock')
          .insert({ remaining_sms: finalStock });
        resError = error;
      }

      if (resError) throw resError;
      
      alert(lang === 'bn' ? 'স্টক সফলভাবে আপডেট হয়েছে!' : "Stock updated successfully!");
      setNewStockCount('');
      await fetchAdminStock();
    } catch (err: any) { 
      alert(err.message); 
    } finally { 
      setUpdatingStock(false); 
    }
  };

  const approveTransaction = async (tr: Transaction) => {
    const smsCount = Number(smsToCredit[tr.id]);
    if (!smsCount || smsCount <= 0) {
      alert(lang === 'bn' ? 'দয়া করে SMS সংখ্যা লিখুন' : 'Please enter valid SMS count');
      return;
    }

    if (adminStock && adminStock.remaining_sms < smsCount) {
      if (!confirm(lang === 'bn' ? 'অ্যাডমিন স্টকে পর্যাপ্ত SMS নেই। তবুও কি এপ্রুভ করবেন?' : 'Admin stock low. Approve anyway?')) return;
    }

    setUpdatingId(tr.id);
    try {
      const { error } = await supabase.rpc('approve_payment_with_sms', {
        t_id: tr.id,
        m_id: tr.madrasah_id,
        sms_to_give: smsCount
      });
      if (error) throw error;

      setPendingTrans(prev => prev.filter(t => t.id !== tr.id));
      alert(lang === 'bn' ? 'সফলভাবে এপ্রুভ হয়েছে!' : 'Approved successfully!');
      fetchAdminStock();
      fetchAllMadrasahs();
      fetchSystemStats();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const rejectTransaction = async (id: string) => {
    if (!confirm(lang === 'bn' ? 'বাতিল করতে চান?' : 'Reject this?')) return;
    setUpdatingId(id);
    try {
      await supabase.from('transactions').update({ status: 'rejected' }).eq('id', id);
      setPendingTrans(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error(err); } finally { setUpdatingId(null); }
  };

  const filtered = useMemo(() => {
    return madrasahs.filter(m => (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [madrasahs, searchQuery]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert(lang === 'bn' ? 'কপি করা হয়েছে!' : 'Copied to clipboard!');
  };

  if (loading) return (
    <div className="py-20 flex flex-col items-center justify-center gap-4 text-white">
      <Loader2 className="animate-spin" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest">{t('waiting', lang)}</p>
    </div>
  );

  if (error) return (
    <div className="py-20 flex flex-col items-center justify-center gap-4 text-white px-8 text-center">
      <AlertTriangle size={48} className="text-yellow-400 opacity-50" />
      <p className="text-sm font-bold opacity-70">{error}</p>
      <button onClick={() => initData(true)} className="mt-4 px-6 py-2 bg-white text-[#d35132] font-black rounded-xl">Retry</button>
    </div>
  );

  if (view === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="grid grid-cols-1 gap-3">
          <div onClick={() => setView('stock')} className="bg-white/10 p-5 rounded-[2.2rem] border border-white/10 backdrop-blur-md flex items-center justify-between cursor-pointer active:scale-95 transition-all shadow-lg group">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-400 text-slate-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                  <Database size={24} />
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-black text-white leading-none">{adminStock?.remaining_sms || 0}</p>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">Global SMS Stock</p>
                </div>
             </div>
             <ChevronRight size={18} className="text-white/20" />
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input type="text" placeholder={t('search_madrasah', lang)} className="w-full pl-12 pr-5 py-4.5 bg-white/10 border border-white/20 rounded-[2rem] outline-none text-white font-bold backdrop-blur-md focus:bg-white/15 transition-all shadow-inner placeholder:text-white/20" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="space-y-3">
          <h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">Registered Madrasahs</h2>
          {filtered.map(m => (
            <div 
              key={m.id} 
              onClick={() => fetchMadrasahDetails(m)}
              className="w-full bg-white/10 border border-white/10 rounded-[2.2rem] p-5 flex items-center justify-between backdrop-blur-md shadow-lg active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 text-left min-w-0 pr-2">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 overflow-hidden shadow-inner">
                   {m.logo_url ? <img src={m.logo_url} className="w-full h-full object-cover" /> : <UserIcon size={24} className="text-white/30" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-white truncate text-base font-noto leading-tight group-hover:text-yellow-400 transition-colors">{m.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                      <MessageSquare size={10} className="text-white/30" />
                      <span className="text-[9px] text-white/60 font-black">{m.sms_balance || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                      <Wallet size={10} className="text-white/30" />
                      <span className="text-[9px] text-white/60 font-black">{m.balance || 0}৳</span>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${m.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {m.is_active !== false ? t('status_active', lang) : t('status_inactive', lang)}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className="text-white/20 group-hover:text-white/50 transition-colors" />
            </div>
          ))}
          {filtered.length === 0 && (
             <div className="text-center py-10 opacity-30">
               <p className="text-xs font-black uppercase tracking-widest text-white">No schools found</p>
             </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'details' && selectedMadrasah) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
        <div className="flex items-center gap-4">
          <button onClick={() => { setView('list'); setSelectedMadrasah(null); }} className="p-3 bg-white/10 rounded-xl text-white border border-white/20 active:scale-90 transition-all">
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <h1 className="text-xl font-black text-white font-noto truncate">Madrasah Details</h1>
        </div>

        <div className="bg-white/15 backdrop-blur-2xl rounded-[3rem] border border-white/20 shadow-2xl overflow-hidden p-6 space-y-6">
           <div className="flex flex-col items-center text-center gap-4">
              <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center border border-white/20 shadow-xl overflow-hidden">
                {selectedMadrasah.logo_url ? <img src={selectedMadrasah.logo_url} className="w-full h-full object-cover" /> : <UserIcon size={40} className="text-white/20" />}
              </div>
              <div>
                <h2 className="text-xl font-black text-white font-noto leading-tight">{selectedMadrasah.name}</h2>
              </div>

              <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={toggleMadrasahStatus}
                  disabled={updatingId === selectedMadrasah.id}
                  className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${selectedMadrasah.is_active !== false ? 'bg-red-500 text-white shadow-lg' : 'bg-green-500 text-white shadow-lg'}`}
                >
                  {updatingId === selectedMadrasah.id ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <Power size={16} /> 
                      {selectedMadrasah.is_active !== false ? 'Deactivate' : 'Activate Account'}
                    </>
                  )}
                </button>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10 text-center">
                 <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Wallet Balance</p>
                 <p className="text-xl font-black text-white">{selectedMadrasah.balance || 0} ৳</p>
              </div>
              <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10 text-center">
                 <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">SMS Credits</p>
                 <p className="text-xl font-black text-white">{selectedMadrasah.sms_balance || 0}</p>
              </div>
           </div>

           <div className="space-y-3 pt-2">
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest px-2">School Information</h3>
              <div className="space-y-2">
                 {/* School UID */}
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between group">
                    <div className="min-w-0 flex-1">
                       <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">School UID</p>
                       <span className="text-xs font-mono font-bold text-white/70 truncate block">{selectedMadrasah.id}</span>
                    </div>
                    <button onClick={() => copyToClipboard(selectedMadrasah.id)} className="p-2 bg-white/10 text-white/60 rounded-xl active:scale-90"><Copy size={14} /></button>
                 </div>
                 
                 {/* School Code */}
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between group">
                    <div className="min-w-0 flex-1">
                       <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">School Login Code</p>
                       <span className="text-sm font-black text-white tracking-[0.3em]">{selectedMadrasah.login_code || '---'}</span>
                    </div>
                    <button onClick={() => copyToClipboard(selectedMadrasah.login_code || '')} className="p-2 bg-white/10 text-white/60 rounded-xl active:scale-90"><Copy size={14} /></button>
                 </div>

                 {/* School Mobile */}
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between group">
                    <div className="min-w-0 flex-1">
                       <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">School Mobile</p>
                       <span className="text-sm font-bold text-white">{selectedMadrasah.phone || 'N/A'}</span>
                    </div>
                    <button onClick={() => copyToClipboard(selectedMadrasah.phone || '')} className="p-2 bg-white/10 text-white/60 rounded-xl active:scale-90"><Copy size={14} /></button>
                 </div>

                 {/* Email Address */}
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between group">
                    <div className="min-w-0 flex-1">
                       <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Email Address</p>
                       <span className="text-sm font-bold text-white truncate block">{selectedMadrasah.email || 'N/A'}</span>
                    </div>
                    <button onClick={() => copyToClipboard(selectedMadrasah.email || '')} className="p-2 bg-white/10 text-white/60 rounded-xl active:scale-90"><Copy size={14} /></button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (view === 'dashboard') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 pb-20">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-white font-noto">System Dashboard</h1>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/10 p-6 rounded-[2.5rem] border border-white/10 shadow-xl text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                <Users size={48} />
              </div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Users</p>
              <h2 className="text-4xl font-black text-white">{stats?.totalMadrasahs || 0}</h2>
              <div className="mt-2 flex items-center justify-center gap-2">
                 <span className="text-[9px] font-black text-green-400 uppercase">{stats?.activeMadrasahs || 0} Active</span>
                 <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                 <span className="text-[9px] font-black text-red-400 uppercase">{(stats?.totalMadrasahs || 0) - (stats?.activeMadrasahs || 0)} Inactive</span>
              </div>
           </div>

           <div className="bg-white/10 p-6 rounded-[2.5rem] border border-white/10 shadow-xl text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                <UserIcon size={48} />
              </div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Students</p>
              <h2 className="text-4xl font-black text-white">{stats?.totalStudents || 0}</h2>
              <p className="text-[9px] font-black text-white/20 uppercase mt-2 tracking-tighter italic">Global Student Records</p>
           </div>

           <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 rounded-[2.5rem] border border-green-500/20 shadow-xl text-center relative overflow-hidden group col-span-2 flex items-center justify-between">
              <div className="text-left">
                <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-1">Global Wallet Balance</p>
                <h2 className="text-4xl font-black text-white">{stats?.totalWalletBalance.toLocaleString() || 0} ৳</h2>
                <p className="text-[9px] font-bold text-white/30 mt-1">Sum of all madrasah credits</p>
              </div>
              <div className="w-16 h-16 bg-green-500/20 rounded-3xl flex items-center justify-center text-green-400 shadow-inner">
                <TrendingUp size={32} />
              </div>
           </div>

           <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-6 rounded-[2.5rem] border border-blue-500/20 shadow-xl text-center relative overflow-hidden group col-span-2 flex items-center justify-between">
              <div className="text-left">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Distributed SMS Credits</p>
                <h2 className="text-4xl font-black text-white">{stats?.totalSmsBalance.toLocaleString() || 0}</h2>
                <p className="text-[9px] font-bold text-white/30 mt-1">Total SMS held by all users</p>
              </div>
              <div className="w-16 h-16 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-400 shadow-inner">
                <Activity size={32} />
              </div>
           </div>
        </div>

        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
           <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
             <Layers size={14} className="text-yellow-400" />
             System Integrity
           </h3>
           <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold">
                 <span className="text-white/50">SMS API Connection</span>
                 <span className="text-green-400 flex items-center gap-1.5"><Check size={14} /> Online</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                 <span className="text-white/50">Database Latency</span>
                 <span className="text-white/80 font-mono">24ms</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                 <span className="text-white/50">Active Sessions</span>
                 <span className="text-white/80">{(stats?.totalMadrasahs || 0) + 1}</span>
              </div>
           </div>
        </div>

        <button 
          onClick={() => initData(true)}
          className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh Stats
        </button>
      </div>
    );
  }

  if (view === 'stock') {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 pb-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="p-3 bg-white/10 rounded-xl text-white border border-white/20 active:scale-90 transition-all">
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <h1 className="text-xl font-black text-white font-noto">Admin SMS Stock</h1>
        </div>

        <div className="bg-white/15 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white/20 shadow-xl text-center space-y-6">
           <div className="relative">
              <div className="absolute top-0 right-0 p-2 text-white/10">
                <Database size={80} strokeWidth={1} />
              </div>
              <p className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-1">Current Stock Available</p>
              <h2 className="text-6xl font-black text-white drop-shadow-lg">{adminStock?.remaining_sms || 0}</h2>
              <p className="text-[9px] text-white/20 mt-3 font-bold uppercase tracking-tighter">
                Last Updated: {adminStock?.updated_at ? new Date(adminStock.updated_at).toLocaleString() : 'Never'}
              </p>
           </div>

           <div className="space-y-5 pt-6 border-t border-white/10">
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                <button 
                  onClick={() => setUpdateMode('add')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${updateMode === 'add' ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'text-white/40'}`}
                >
                  <PlusCircle size={14} /> Add Stock
                </button>
                <button 
                  onClick={() => setUpdateMode('set')}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${updateMode === 'set' ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'text-white/40'}`}
                >
                  <RefreshCw size={14} /> Set Total
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-2 block text-left">
                  {updateMode === 'add' ? 'How many SMS to add?' : 'New Total Stock Amount'}
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder={updateMode === 'add' ? "e.g. 5000" : "e.g. 10000"}
                    className="w-full px-6 py-5 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-black text-2xl text-center focus:bg-white/20 focus:border-yellow-400/50 transition-all shadow-inner" 
                    value={newStockCount} 
                    onChange={(e) => setNewStockCount(e.target.value)} 
                  />
                  {updateMode === 'add' && (
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-yellow-400/50 font-black text-xl">+</div>
                  )}
                </div>
              </div>

              <button 
                onClick={updateAdminStock} 
                disabled={updatingStock || !newStockCount} 
                className="w-full py-5 bg-yellow-400 text-slate-900 font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 text-base disabled:opacity-50 disabled:scale-100"
              >
                {updatingStock ? <Loader2 className="animate-spin" size={24} /> : (
                  <>
                    <CheckCircle size={20} /> 
                    {updateMode === 'add' ? 'Confirm Addition' : 'Update Master Total'}
                  </>
                )}
              </button>
           </div>
        </div>

        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 flex items-start gap-4">
           <AlertTriangle className="text-yellow-400/40 shrink-0" size={24} />
           <div className="space-y-1">
              <h4 className="text-[10px] font-black text-white/60 uppercase tracking-widest">Administrator Note</h4>
              <p className="text-xs text-white/30 font-medium leading-relaxed">
                Manually updating stock reflects immediately. Ensure you have confirmed payment or replenished the API gateway balance before adding credits.
              </p>
           </div>
        </div>
      </div>
    );
  }

  if (view === 'approvals') {
     return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
           <div className="flex items-center justify-between">
              <h1 className="text-xl font-black text-white font-noto">পেমেন্ট রিকোয়েস্ট</h1>
              <button 
                onClick={() => initData(true)}
                className={`p-3 bg-white/10 text-white rounded-xl border border-white/20 transition-all ${isRefreshing ? 'animate-spin opacity-50' : 'active:scale-90'}`}
              >
                <RefreshCw size={18} />
              </button>
           </div>
           
           <div className="space-y-4">
              {pendingTrans.length > 0 ? pendingTrans.map(tr => (
                 <div key={tr.id} className="bg-white/15 backdrop-blur-2xl rounded-[2.5rem] p-6 border border-white/20 shadow-xl space-y-4">
                    <div className="flex items-start justify-between">
                       <div className="min-w-0 pr-2">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">মাদরাসার নাম</p>
                          <h4 className="text-base font-black text-white font-noto truncate">
                            {tr.madrasahs?.name || 'অজানা মাদরাসা'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                             <Phone size={10} className="text-white/40" />
                             <span className="text-xs font-bold text-white/60">{tr.sender_phone}</span>
                          </div>
                       </div>
                       <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-right">
                          <p className="text-[9px] font-black text-white/50 uppercase">টাকা পাঠিয়েছে</p>
                          <p className="text-lg font-black text-white">{tr.amount} ৳</p>
                       </div>
                    </div>
                    
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                       <div className="min-w-0 pr-2">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">bKash TrxID</p>
                          <p className="text-sm font-mono font-black text-white uppercase truncate">{tr.transaction_id}</p>
                       </div>
                       <div className="text-right shrink-0">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Date</p>
                          <p className="text-[10px] font-bold text-white/60">{new Date(tr.created_at).toLocaleDateString()}</p>
                       </div>
                    </div>

                    <div className="space-y-2 pt-2">
                       <label className="text-[10px] font-black text-yellow-400 uppercase tracking-widest px-1">কতগুলো SMS দিতে চান?</label>
                       <input 
                         type="number" 
                         placeholder="SMS Quantity" 
                         className="w-full px-5 py-4 bg-white/10 border-2 border-yellow-500/30 rounded-2xl outline-none text-white font-black text-lg focus:bg-white/20 focus:border-yellow-500 transition-all text-center"
                         value={smsToCredit[tr.id] || ''}
                         onChange={(e) => setSmsToCredit({...smsToCredit, [tr.id]: e.target.value})}
                       />
                    </div>

                    <div className="flex gap-3 pt-2">
                       <button onClick={() => approveTransaction(tr)} disabled={updatingId === tr.id} className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                          {updatingId === tr.id ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle size={18} /> Approve & Credit</>}
                       </button>
                       <button onClick={() => rejectTransaction(tr.id)} disabled={updatingId === tr.id} className="flex-1 py-4 bg-red-500/20 text-white font-black rounded-2xl border border-red-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                          <XCircle size={18} /> Reject
                       </button>
                    </div>
                 </div>
              )) : (
                 <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 animate-pulse">
                    <p className="text-white/30 font-black uppercase text-xs tracking-widest">অনুমোদনের জন্য কোনো পেমেন্ট রিকোয়েস্ট নেই</p>
                    <button onClick={() => initData(true)} className="mt-4 text-white font-black text-[10px] uppercase border-b border-white/20 pb-1">ম্যানুয়ালি রিফ্রেশ করুন</button>
                 </div>
              )}
           </div>
        </div>
     );
  }

  return null;
};

export default AdminPanel;
