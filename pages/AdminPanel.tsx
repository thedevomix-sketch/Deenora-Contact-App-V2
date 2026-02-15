
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, ChevronRight, User as UserIcon, ShieldCheck, Database, Globe, CheckCircle, XCircle, CreditCard, Save, X, Settings, Smartphone, MessageSquare, Key, Shield, ArrowLeft, Copy, Check, Calendar, Users, Layers, MonitorSmartphone, Server, BarChart3, TrendingUp } from 'lucide-react';
import { supabase, smsApi } from '../supabase';
import { Madrasah, Language, Transaction, AdminSMSStock } from '../types';

interface AdminPanelProps {
  lang: Language;
  currentView?: 'list' | 'dashboard' | 'approvals';
  dataVersion?: number;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ lang, currentView = 'list', dataVersion = 0 }) => {
  const [madrasahs, setMadrasahs] = useState<Madrasah[]>([]);
  const [pendingTrans, setPendingTrans] = useState<Transaction[]>([]);
  const [adminStock, setAdminStock] = useState<AdminSMSStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'approvals' | 'gateway' | 'details'>(currentView === 'approvals' ? 'approvals' : 'list');
  const [smsToCredit, setSmsToCredit] = useState<{ [key: string]: string }>({});

  // Selected User Detail Management
  const [selectedUser, setSelectedUser] = useState<Madrasah | null>(null);
  const [userStats, setUserStats] = useState({ students: 0, classes: 0 });
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLoginCode, setEditLoginCode] = useState('');
  const [editActive, setEditActive] = useState(true);
  
  // Madrasah Specific Gateway (Masking)
  const [editReveApiKey, setEditReveApiKey] = useState('');
  const [editReveSecretKey, setEditReveSecretKey] = useState('');
  const [editReveCallerId, setEditReveCallerId] = useState('');
  const [editReveClientId, setEditReveClientId] = useState('');

  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [copied, setCopied] = useState(false);

  // Global Settings
  const [reveApiKey, setReveApiKey] = useState('');
  const [reveSecretKey, setReveSecretKey] = useState('');
  const [reveCallerId, setReveCallerId] = useState('');
  const [reveClientId, setReveClientId] = useState('');
  const [bkashNumber, setBkashNumber] = useState('');
  const [savingGateway, setSavingGateway] = useState(false);

  useEffect(() => { initData(); }, [dataVersion]);

  const initData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAllMadrasahs(), fetchPendingTransactions(), fetchAdminStock(), fetchGlobalSettings()]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchGlobalSettings = async () => {
    const settings = await smsApi.getGlobalSettings();
    if (settings) {
      setReveApiKey(settings.reve_api_key || '');
      setReveSecretKey(settings.reve_secret_key || '');
      setReveCallerId(settings.reve_caller_id || '');
      setReveClientId(settings.reve_client_id || '');
      setBkashNumber(settings.bkash_number || '');
    }
  };

  const saveGlobalSettings = async () => {
    setSavingGateway(true);
    try {
      const { error } = await supabase.from('system_settings').upsert({
        id: '00000000-0000-0000-0000-000000000001',
        reve_api_key: reveApiKey,
        reve_secret_key: reveSecretKey,
        reve_caller_id: reveCallerId,
        reve_client_id: reveClientId,
        bkash_number: bkashNumber,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      alert('Global Settings Saved Successfully');
    } catch (err: any) { alert(err.message); } finally { setSavingGateway(false); }
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
    const { data } = await supabase.from('transactions').select('*, madrasahs(*)').eq('status', 'pending').order('created_at', { ascending: false });
    if (data) setPendingTrans(data);
  };

  const totalDistributedSms = useMemo(() => {
    return madrasahs.reduce((acc, curr) => acc + (curr.sms_balance || 0), 0);
  }, [madrasahs]);

  const handleUserClick = async (m: Madrasah) => {
    setSelectedUser(m);
    setEditName(m.name || '');
    setEditPhone(m.phone || '');
    setEditLoginCode(m.login_code || '');
    setEditActive(m.is_active !== false);
    
    setEditReveApiKey(m.reve_api_key || '');
    setEditReveSecretKey(m.reve_secret_key || '');
    setEditReveCallerId(m.reve_caller_id || '');
    setEditReveClientId(m.reve_client_id || '');
    
    setView('details');

    const [studentsRes, classesRes] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('madrasah_id', m.id),
      supabase.from('classes').select('*', { count: 'exact', head: true }).eq('madrasah_id', m.id)
    ]);
    setUserStats({
      students: studentsRes.count || 0,
      classes: classesRes.count || 0
    });
  };

  const updateUserProfile = async () => {
    if (!selectedUser) return;
    setIsUpdatingUser(true);
    try {
      const { error } = await supabase.from('madrasahs').update({
        name: editName.trim(),
        phone: editPhone.trim(),
        login_code: editLoginCode.trim(),
        is_active: editActive,
        reve_api_key: editReveApiKey.trim() || null,
        reve_secret_key: editReveSecretKey.trim() || null,
        reve_caller_id: editReveCallerId.trim() || null,
        reve_client_id: editReveClientId.trim() || null
      }).eq('id', selectedUser.id);
      
      if (error) throw error;
      
      alert('User Settings Updated Successfully');
      await fetchAllMadrasahs();
      setView('list');
      setSelectedUser(null);
    } catch (err: any) { 
      alert('Update Error: ' + err.message); 
    } finally { 
      setIsUpdatingUser(false); 
    }
  };

  const approveTransaction = async (tr: Transaction) => {
    const sms = Number(smsToCredit[tr.id]);
    if (!sms || sms <= 0) return alert('SMS সংখ্যা লিখুন');
    try {
      const { error } = await supabase.rpc('approve_payment_with_sms', { t_id: tr.id, m_id: tr.madrasah_id, sms_to_give: sms });
      if (error) throw error;
      
      if (tr.madrasahs?.phone) {
        const msg = `আস-সালামু আলাইকুম, আপনার ${tr.amount} টাকার রিচার্জ সফল হয়েছে এবং ${sms} টি SMS ক্রেডিট করা হয়েছে। ধন্যবাদ।`;
        await smsApi.sendDirect(tr.madrasahs.phone, msg, tr.madrasah_id);
      }

      setPendingTrans(p => p.filter(t => t.id !== tr.id));
      alert('Approved Successfully!');
      initData();
    } catch (err: any) { alert(err.message); }
  };

  const filtered = useMemo(() => madrasahs.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())), [madrasahs, searchQuery]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSubscriptionDates = (createdAt: string) => {
    const start = new Date(createdAt);
    const end = new Date(createdAt);
    end.setFullYear(start.getFullYear() + 1);
    return {
      start: start.toLocaleDateString('bn-BD'),
      end: end.toLocaleDateString('bn-BD')
    };
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      {view !== 'details' && (
        <div className="flex gap-2 overflow-x-auto pb-2 px-1 custom-scrollbar">
           <button onClick={() => setView('list')} className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${view === 'list' ? 'bg-white text-[#8D30F4] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>User List</button>
           <button onClick={() => setView('approvals')} className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${view === 'approvals' ? 'bg-white text-[#8D30F4] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>Payments</button>
           <button onClick={() => setView('gateway')} className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${view === 'gateway' ? 'bg-white text-[#8D30F4] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>Settings</button>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-6">
          {/* Header Global Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-white/40 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-[#F2F5FF] text-[#8D30F4] rounded-2xl flex items-center justify-center mb-2 shadow-inner">
                <Database size={20} />
              </div>
              <p className="text-lg font-black text-slate-800 leading-none">{adminStock?.remaining_sms || 0}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Global Stock</p>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-white/40 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
                <TrendingUp size={20} />
              </div>
              <p className="text-lg font-black text-slate-800 leading-none">{totalDistributedSms}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Distributed</p>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-white/40 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
                <Users size={20} />
              </div>
              <p className="text-lg font-black text-slate-800 leading-none">{madrasahs.length}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Users</p>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#8D30F4] transition-colors" size={18} />
            <input type="text" placeholder="Search Madrasah..." className="w-full pl-14 pr-6 py-4 bg-white border border-[#8D30F4]/5 rounded-[1.8rem] outline-none text-slate-800 font-bold shadow-sm focus:border-[#8D30F4]/20 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          <div className="space-y-3">
            {filtered.map(m => (
              <div key={m.id} onClick={() => handleUserClick(m)} className="bg-white/95 backdrop-blur-md p-5 rounded-[2.2rem] border border-white/50 flex items-center justify-between shadow-lg active:scale-[0.98] transition-all cursor-pointer group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 shadow-inner overflow-hidden shrink-0">
                    {m.logo_url ? <img src={m.logo_url} className="w-full h-full object-cover" /> : <UserIcon size={24} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-800 truncate font-noto text-lg">{m.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${m.is_active !== false ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {m.is_active !== false ? 'Active' : 'Blocked'}
                      </p>
                      <span className="text-[10px] text-slate-300">•</span>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.phone || 'No Phone'}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shadow-inner flex flex-col items-center justify-center">
                   <p className="text-lg font-black text-[#8D30F4] leading-none">{m.sms_balance || 0}</p>
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter mt-1">SMS LEFT</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'details' && selectedUser && (
        <div className="animate-in slide-in-from-right-5 duration-300 space-y-6">
           <div className="flex items-center gap-4 px-2">
              <button onClick={() => setView('list')} className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-[1rem] flex items-center justify-center text-white active:scale-90 transition-all border border-white/20 shadow-xl">
                <ArrowLeft size={22} strokeWidth={3} />
              </button>
              <h1 className="text-xl font-black text-white font-noto drop-shadow-md">User Details</h1>
           </div>

           <div className="bg-white/95 backdrop-blur-xl rounded-[2.8rem] p-8 border border-white shadow-2xl space-y-8 relative overflow-hidden">
              <div className="flex flex-col items-center text-center">
                 <div className="w-24 h-24 bg-slate-50 rounded-[2.2rem] flex items-center justify-center text-slate-300 border-4 border-white shadow-xl overflow-hidden mb-4">
                    {selectedUser.logo_url ? <img src={selectedUser.logo_url} className="w-full h-full object-cover" /> : <UserIcon size={40} />}
                 </div>
                 <h2 className="text-2xl font-black text-slate-800 font-noto tracking-tight">{selectedUser.name}</h2>
                 <div onClick={() => copyToClipboard(selectedUser.id)} className="mt-3 bg-[#F2EBFF] px-4 py-1.5 rounded-xl border border-[#8D30F4]/10 flex items-center gap-2 cursor-pointer active:scale-95 transition-all">
                    <Shield size={12} className="text-[#8D30F4]" />
                    <p className="text-[9px] font-black text-[#8D30F4] uppercase tracking-widest">ID: {selectedUser.id}</p>
                    {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-[#8D30F4]/40" />}
                 </div>
              </div>

              {/* Stat Grid */}
              <div className="grid grid-cols-3 gap-3">
                 <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100">
                    <Users size={18} className="mx-auto text-[#8D30F4] mb-2" />
                    <p className="text-lg font-black text-slate-800 leading-none">{userStats.students}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Students</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100">
                    <Layers size={18} className="mx-auto text-[#8D30F4] mb-2" />
                    <p className="text-lg font-black text-slate-800 leading-none">{userStats.classes}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Classes</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-3xl text-center border border-slate-100">
                    <MonitorSmartphone size={18} className="mx-auto text-[#8D30F4] mb-2" />
                    <p className="text-lg font-black text-slate-800 leading-none">1</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Devices</p>
                 </div>
              </div>

              {/* Subscription Card */}
              <div className="bg-gradient-to-br from-[#8D30F4] to-[#A179FF] p-6 rounded-[2.2rem] text-white shadow-xl relative overflow-hidden">
                 <Calendar className="absolute -right-4 -bottom-4 opacity-10" size={100} />
                 <div className="relative z-10 flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Subscription Status</p>
                       <h4 className="text-xl font-black mt-1">1 Year Premium</h4>
                    </div>
                    <div className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Active</div>
                 </div>
                 <div className="mt-5 pt-5 border-t border-white/20 flex justify-between">
                    <div>
                       <p className="text-[8px] font-black uppercase opacity-60">Start Date</p>
                       <p className="text-xs font-black">{getSubscriptionDates(selectedUser.created_at).start}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-black uppercase opacity-60">End Date</p>
                       <p className="text-xs font-black">{getSubscriptionDates(selectedUser.created_at).end}</p>
                    </div>
                 </div>
              </div>

              {/* Basic Info Form */}
              <div className="space-y-4">
                 <h4 className="text-[11px] font-black text-[#8D30F4] uppercase tracking-[0.2em] px-1 flex items-center gap-2"><UserIcon size={14}/> Basic Information</h4>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Madrasah Name</label>
                    <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800 font-noto" value={editName} onChange={(e) => setEditName(e.target.value)} />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mobile Number</label>
                    <input type="tel" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Madrasah Login Code</label>
                    <div className="relative">
                       <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-[#8D30F4]" value={editLoginCode} onChange={(e) => setEditLoginCode(e.target.value)} />
                       <Key size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                    </div>
                 </div>
              </div>

              {/* SMS Gateway Settings (Masking) */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                 <h4 className="text-[11px] font-black text-[#8D30F4] uppercase tracking-[0.2em] px-1 flex items-center gap-2"><Server size={14}/> SMS Gateway (Masking)</h4>
                 <p className="text-[9px] text-slate-400 font-bold px-1 -mt-2 italic">খালি রাখলে গ্লোবাল গেটওয়ে (Non-Masking) ব্যবহৃত হবে।</p>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">API Key</label>
                       <input type="text" className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-black text-slate-700 text-xs" value={editReveApiKey} onChange={(e) => setEditReveApiKey(e.target.value)} placeholder="Reve API Key" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Secret Key</label>
                       <input type="text" className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-black text-slate-700 text-xs" value={editReveSecretKey} onChange={(e) => setEditReveSecretKey(e.target.value)} placeholder="Secret Key" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Sender ID</label>
                       <input type="text" className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-black text-slate-700 text-xs" value={editReveCallerId} onChange={(e) => setEditReveCallerId(e.target.value)} placeholder="Masking Name" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Client ID</label>
                       <input type="text" className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-black text-slate-700 text-xs" value={editReveClientId} onChange={(e) => setEditReveClientId(e.target.value)} placeholder="Client ID" />
                    </div>
                 </div>
              </div>
                 
              <div className="flex items-center justify-between bg-slate-50 p-5 rounded-[1.8rem] border border-slate-100">
                 <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${editActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-black text-slate-700">Account Access</span>
                 </div>
                 <button onClick={() => setEditActive(!editActive)} className={`w-14 h-8 rounded-full transition-all relative ${editActive ? 'bg-green-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${editActive ? 'right-1' : 'left-1'}`} />
                 </button>
              </div>

              <button onClick={updateUserProfile} disabled={isUpdatingUser} className="w-full h-16 premium-btn text-white font-black rounded-[2rem] flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all">
                 {isUpdatingUser ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> Save User Settings</>}
              </button>
           </div>
        </div>
      )}

      {view === 'gateway' && (
        <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-white space-y-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#8D30F4]/10 text-[#8D30F4] rounded-2xl flex items-center justify-center shadow-inner"><Globe size={24} /></div>
              <h3 className="text-xl font-black text-slate-800">Global System Config</h3>
           </div>
           
           <div className="space-y-5">
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global bKash Number</label>
                <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800" value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Non-Masking Sender ID</label>
                <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800" value={reveCallerId} onChange={(e) => setReveCallerId(e.target.value)} />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System API Key</label>
                <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800 text-xs" value={reveApiKey} onChange={(e) => setReveApiKey(e.target.value)} />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Secret Key</label>
                <input type="password" title="Secret Key" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800 text-xs" value={reveSecretKey} onChange={(e) => setReveSecretKey(e.target.value)} />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Client ID</label>
                <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800 text-xs" value={reveClientId} onChange={(e) => setReveClientId(e.target.value)} />
              </div>
              <button onClick={saveGlobalSettings} disabled={savingGateway} className="w-full h-16 premium-btn text-white font-black rounded-[2rem] flex items-center justify-center gap-3 mt-4 shadow-xl active:scale-[0.98] transition-all">
                {savingGateway ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> Save Global Config</>}
              </button>
           </div>
        </div>
      )}

      {view === 'approvals' && (
        <div className="space-y-5">
          {pendingTrans.length > 0 ? pendingTrans.map(tr => (
            <div key={tr.id} className="bg-white/95 backdrop-blur-md p-7 rounded-[2.8rem] border border-white shadow-2xl space-y-6">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-[#8D30F4] uppercase mb-1 tracking-widest truncate">{tr.madrasahs?.name}</p>
                  <h4 className="text-3xl font-black text-slate-800">{tr.amount} ৳</h4>
                </div>
                <div className="w-14 h-14 bg-[#F2EBFF] text-[#8D30F4] rounded-2xl flex items-center justify-center border border-[#8D30F4]/10 shadow-inner shrink-0">
                   <CreditCard size={28} />
                </div>
              </div>
              <div className="bg-slate-50 p-5 rounded-[1.8rem] border border-slate-100 grid grid-cols-2 gap-4 text-[11px]">
                 <div><p className="text-slate-400 font-black mb-1">Sender</p><p className="font-black text-slate-800 text-sm">{tr.sender_phone}</p></div>
                 <div className="text-right"><p className="text-slate-400 font-black mb-1">TrxID</p><p className="font-black text-[#8D30F4] text-sm uppercase">{tr.transaction_id}</p></div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Give SMS Credits</label>
                 <input type="number" className="w-full px-6 py-4.5 bg-slate-50 border-2 border-[#8D30F4]/10 rounded-2xl font-black text-center text-xl outline-none focus:border-[#8D30F4]/30 transition-all" value={smsToCredit[tr.id] || ''} onChange={(e) => setSmsToCredit({...smsToCredit, [tr.id]: e.target.value})} placeholder="e.g. 500" />
              </div>
              <div className="flex gap-3 pt-2">
                 <button onClick={() => approveTransaction(tr)} className="flex-2 py-4.5 bg-green-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-200 flex-1 transition-all active:scale-95"><CheckCircle size={18} /> Approve</button>
                 <button onClick={async () => { if(confirm('Reject?')) { await supabase.from('transactions').update({ status: 'rejected' }).eq('id', tr.id); initData(); } }} className="py-4.5 bg-red-50 text-red-500 font-black rounded-2xl flex items-center justify-center gap-2 px-6 transition-all active:scale-95"><XCircle size={18} /></button>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-white/10 rounded-[3rem] border-2 border-dashed border-white/30 backdrop-blur-sm">
               <p className="text-white font-black uppercase text-[10px] tracking-[0.2em] drop-shadow-sm">No pending requests</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
