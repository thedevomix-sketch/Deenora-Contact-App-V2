
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, ChevronRight, User as UserIcon, Users, Wallet, CheckCircle, XCircle, PlusCircle, RefreshCw, AlertTriangle, Database, TrendingUp, Activity, Smartphone, Phone, MessageSquare, Copy, Check, Info, Globe, ShieldCheck } from 'lucide-react';
import { supabase, smsApi } from '../supabase';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'details' | 'approvals' | 'stock' | 'dashboard' | 'gateway'>(currentView === 'dashboard' ? 'dashboard' : currentView === 'approvals' ? 'approvals' : 'list');
  const [selectedMadrasah, setSelectedMadrasah] = useState<Madrasah | null>(null);
  const [smsToCredit, setSmsToCredit] = useState<{ [key: string]: string }>({});

  // Global Settings Form
  const [reveApiKey, setReveApiKey] = useState('');
  const [reveSecretKey, setReveSecretKey] = useState('');
  const [reveCallerId, setReveCallerId] = useState('');
  const [reveClientId, setReveClientId] = useState('');
  const [savingGateway, setSavingGateway] = useState(false);

  useEffect(() => { initData(); }, [dataVersion]);

  useEffect(() => {
    if (currentView === 'dashboard') setView('dashboard');
    else if (currentView === 'approvals') setView('approvals');
    else setView('list');
  }, [currentView]);

  const initData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAllMadrasahs(), fetchPendingTransactions(), fetchAdminStock(), fetchSystemStats(), fetchGlobalSettings()]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchGlobalSettings = async () => {
    const settings = await smsApi.getGlobalSettings();
    if (settings) {
      setReveApiKey(settings.reve_api_key || '');
      setReveSecretKey(settings.reve_secret_key || '');
      setReveCallerId(settings.reve_caller_id || '');
      setReveClientId(settings.reve_client_id || '');
    }
  };

  const saveGlobalSettings = async () => {
    setSavingGateway(true);
    try {
      const { error } = await supabase.from('system_settings').update({
        reve_api_key: reveApiKey,
        reve_secret_key: reveSecretKey,
        reve_caller_id: reveCallerId,
        reve_client_id: reveClientId,
        updated_at: new Date().toISOString()
      }).eq('id', '00000000-0000-0000-0000-000000000001');
      if (error) throw error;
      alert('SMS Gateway Settings Saved Globally');
    } catch (err: any) { alert(err.message); } finally { setSavingGateway(false); }
  };

  const fetchSystemStats = async () => {
    const { data: mData } = await supabase.from('madrasahs').select('balance, sms_balance, is_active, is_super_admin');
    const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
    if (mData) {
      const filtered = mData.filter(m => !m.is_super_admin);
      setStats({
        totalMadrasahs: filtered.length,
        activeMadrasahs: filtered.filter(m => m.is_active !== false).length,
        totalStudents: sCount || 0,
        totalWalletBalance: filtered.reduce((acc, c) => acc + (c.balance || 0), 0),
        totalSmsBalance: filtered.reduce((acc, c) => acc + (c.sms_balance || 0), 0)
      });
    }
  };

  const fetchAdminStock = async () => {
    const { data } = await supabase.from('admin_sms_stock').select('*').limit(1).maybeSingle();
    if (data) setAdminStock(data);
  };

  const fetchAllMadrasahs = async () => {
    const { data } = await supabase.from('madrasahs').select('*').neq('is_super_admin', true).order('created_at', { ascending: false });
    if (data) setMadrasahs(data);
  };

  const fetchPendingTransactions = async () => {
    const { data } = await supabase.from('transactions').select('*, madrasahs(name)').eq('status', 'pending').order('created_at', { ascending: false });
    if (data) setPendingTrans(data);
  };

  const approveTransaction = async (tr: Transaction) => {
    const sms = Number(smsToCredit[tr.id]);
    if (!sms || sms <= 0) return alert('SMS সংখ্যা লিখুন');
    try {
      await supabase.rpc('approve_payment_with_sms', { t_id: tr.id, m_id: tr.madrasah_id, sms_to_give: sms });
      setPendingTrans(p => p.filter(t => t.id !== tr.id));
      alert('পেমেন্ট সফলভাবে এপ্রুভ হয়েছে এবং SMS ক্রেডিট করা হয়েছে!');
      initData();
    } catch (err) { console.error(err); }
  };

  const filtered = useMemo(() => madrasahs.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())), [madrasahs, searchQuery]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      {/* Admin Tab Switcher */}
      <div className="flex gap-2 overflow-x-auto pb-2 px-1 custom-scrollbar">
         <button onClick={() => setView('list')} className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${view === 'list' ? 'bg-white text-[#8D30F4] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>User List</button>
         <button onClick={() => setView('dashboard')} className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${view === 'dashboard' ? 'bg-white text-[#8D30F4] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>Stats</button>
         <button onClick={() => setView('approvals')} className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${view === 'approvals' ? 'bg-white text-[#8D30F4] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>Payments</button>
         <button onClick={() => setView('gateway')} className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${view === 'gateway' ? 'bg-white text-[#8D30F4] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>SMS API Settings</button>
      </div>

      {view === 'list' && (
        <>
          <div onClick={() => setView('stock')} className="bg-white p-6 rounded-[2.2rem] border border-[#8D30F4]/10 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-[#F2F5FF] text-[#8D30F4] rounded-2xl flex items-center justify-center border border-[#8D30F4]/5">
                <Database size={24} />
              </div>
              <div>
                 <p className="text-xl font-black text-slate-800 leading-none">{adminStock?.remaining_sms || 0}</p>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Global SMS Stock</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-300" />
          </div>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input type="text" placeholder="Search Madrasah..." className="w-full pl-14 pr-6 py-4.5 bg-white border border-[#8D30F4]/5 rounded-[1.8rem] outline-none text-slate-800 font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="space-y-4">
            {filtered.map(m => (
              <div key={m.id} onClick={() => { setSelectedMadrasah(m); setView('details'); }} className="bg-white p-5 rounded-[2.2rem] border border-slate-100 flex items-center justify-between shadow-sm group">
                <div className="flex items-center gap-4 min-w-0 pr-2">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 shrink-0">
                    {m.logo_url ? <img src={m.logo_url} className="w-full h-full object-cover" /> : <UserIcon size={24} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-800 truncate font-noto text-lg group-hover:text-[#8D30F4]">{m.name}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                       <span className="text-[10px] font-bold text-slate-400">SMS: {m.sms_balance || 0}</span>
                       <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${m.is_active !== false ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>{m.is_active !== false ? 'Active' : 'Disabled'}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-200" />
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'gateway' && (
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl space-y-8 animate-in slide-in-from-bottom-5">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#8D30F4]/10 text-[#8D30F4] rounded-2xl flex items-center justify-center"><Globe size={24} /></div>
              <h3 className="text-xl font-black text-slate-800 font-noto">Global SMS Gateway (REVE)</h3>
           </div>
           
           <div className="space-y-5">
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API Key</label>
                <input type="text" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black text-sm" value={reveApiKey} onChange={(e) => setReveApiKey(e.target.value)} />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secret Key</label>
                <input type="password" title="Secret Key" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black text-sm" value={reveSecretKey} onChange={(e) => setReveSecretKey(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4 px-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Caller ID</label>
                  <input type="text" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black text-sm" value={reveCallerId} onChange={(e) => setReveCallerId(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client ID</label>
                  <input type="text" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black text-sm" value={reveClientId} onChange={(e) => setReveClientId(e.target.value)} />
                </div>
              </div>
              <button onClick={saveGlobalSettings} disabled={savingGateway} className="w-full h-16 premium-btn text-white font-black rounded-full flex items-center justify-center gap-3 mt-4">
                {savingGateway ? <Loader2 className="animate-spin" size={24} /> : <><ShieldCheck size={24} /> Save Global Settings</>}
              </button>
           </div>
        </div>
      )}

      {view === 'approvals' && (
        <div className="space-y-6">
          <h1 className="text-xl font-black text-white font-noto px-2 drop-shadow-md">পেমেন্ট রিকোয়েস্ট (অনুমোদন)</h1>
          {pendingTrans.length > 0 ? pendingTrans.map(tr => (
            <div key={tr.id} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-5 animate-in slide-in-from-top-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">মাদরাসা</p>
                  <h4 className="text-lg font-black text-slate-800 font-noto">{tr.madrasahs?.name || 'Unknown'}</h4>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-xl text-right">
                  <p className="text-xl font-black text-[#8D30F4]">{tr.amount} ৳</p>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Phone</p>
                    <p className="text-sm font-black text-slate-700">{tr.sender_phone}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">TrxID</p>
                    <p className="text-sm font-black text-[#8D30F4] tracking-widest">{tr.transaction_id}</p>
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-[#8D30F4] uppercase tracking-widest px-1">কতগুলো SMS দিতে চান?</label>
                 <input type="number" className="w-full px-5 py-4 bg-slate-50 border-2 border-[#8D30F4]/10 rounded-2xl outline-none text-slate-800 font-black text-center text-lg" value={smsToCredit[tr.id] || ''} onChange={(e) => setSmsToCredit({...smsToCredit, [tr.id]: e.target.value})} placeholder="e.g. 500" />
              </div>
              <div className="flex gap-3 pt-2">
                 <button onClick={() => approveTransaction(tr)} className="flex-1 py-4 bg-[#8D30F4] text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2"><CheckCircle size={18} /> Approve</button>
                 <button onClick={async () => { if(confirm('বাতিল করবেন?')) { await supabase.from('transactions').update({ status: 'rejected' }).eq('id', tr.id); initData(); } }} className="flex-1 py-4 bg-red-50 text-red-500 font-black rounded-2xl border border-red-100 flex items-center justify-center gap-2"><XCircle size={18} /> Reject</button>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-white/20 rounded-[3rem] border border-dashed border-white/30">
               <p className="text-white font-black uppercase text-xs tracking-widest">No pending requests</p>
            </div>
          )}
        </div>
      )}

      {view === 'dashboard' && stats && (
         <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[2.5rem] text-center shadow-lg"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Users</p><h2 className="text-3xl font-black text-slate-800">{stats.totalMadrasahs}</h2></div>
            <div className="bg-white p-6 rounded-[2.5rem] text-center shadow-lg"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Active</p><h2 className="text-3xl font-black text-green-500">{stats.activeMadrasahs}</h2></div>
            <div className="bg-white p-6 rounded-[2.5rem] text-center shadow-lg col-span-2"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Students</p><h2 className="text-3xl font-black text-slate-800">{stats.totalStudents}</h2></div>
         </div>
      )}
    </div>
  );
};

export default AdminPanel;
