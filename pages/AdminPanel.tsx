
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, ChevronRight, User as UserIcon, ShieldCheck, Database, Globe, CheckCircle, XCircle, CreditCard, Save, X, Settings, Smartphone, MessageSquare, Key, Shield } from 'lucide-react';
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
  const [view, setView] = useState<'list' | 'approvals' | 'gateway'>(currentView === 'approvals' ? 'approvals' : 'list');
  const [smsToCredit, setSmsToCredit] = useState<{ [key: string]: string }>({});

  // Selected User Management (Masking)
  const [selectedUser, setSelectedUser] = useState<Madrasah | null>(null);
  const [editCallerId, setEditCallerId] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [editSecretKey, setEditSecretKey] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Global Settings Form (Non-Masking)
  const [reveApiKey, setReveApiKey] = useState('aa407e1c6629da8e');
  const [reveSecretKey, setReveSecretKey] = useState('91051e7e');
  const [reveCallerId, setReveCallerId] = useState('1234');
  const [reveClientId, setReveClientId] = useState('');
  const [bkashNumber, setBkashNumber] = useState('০১৭৬৬-XXXXXX');
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
      setReveApiKey(settings.reve_api_key || 'aa407e1c6629da8e');
      setReveSecretKey(settings.reve_secret_key || '91051e7e');
      setReveCallerId(settings.reve_caller_id || '1234');
      setReveClientId(settings.reve_client_id || '');
      setBkashNumber(settings.bkash_number || '০১৭৬৬-XXXXXX');
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
      alert('Non-Masking Settings Saved Globally');
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

  const handleUserClick = (m: Madrasah) => {
    setSelectedUser(m);
    setEditCallerId(m.reve_caller_id || '');
    setEditClientId(m.reve_client_id || '');
    setEditApiKey(m.reve_api_key || '');
    setEditSecretKey(m.reve_secret_key || '');
    setEditActive(m.is_active !== false);
  };

  const updateUserProfile = async () => {
    if (!selectedUser) return;
    setIsUpdatingUser(true);
    try {
      const { error } = await supabase.from('madrasahs').update({
        reve_caller_id: editCallerId.trim(),
        reve_client_id: editClientId.trim(),
        reve_api_key: editApiKey.trim(),
        reve_secret_key: editSecretKey.trim(),
        is_active: editActive
      }).eq('id', selectedUser.id);
      if (error) throw error;
      alert('User Settings Updated');
      setSelectedUser(null);
      fetchAllMadrasahs();
    } catch (err: any) { alert(err.message); } finally { setIsUpdatingUser(false); }
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

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      <div className="flex gap-2 overflow-x-auto pb-2 px-1 custom-scrollbar">
         <button onClick={() => setView('list')} className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${view === 'list' ? 'bg-white text-[#8D30F4] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>User List</button>
         <button onClick={() => setView('approvals')} className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${view === 'approvals' ? 'bg-white text-[#8D30F4] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>Payments</button>
         <button onClick={() => setView('gateway')} className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${view === 'gateway' ? 'bg-white text-[#8D30F4] shadow-md' : 'bg-white/10 text-white hover:bg-white/20'}`}>Settings</button>
      </div>

      {view === 'list' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-[2.2rem] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-[#F2F5FF] text-[#8D30F4] rounded-2xl flex items-center justify-center border border-[#8D30F4]/5">
                <Database size={24} />
              </div>
              <div>
                 <p className="text-xl font-black text-slate-800 leading-none">{adminStock?.remaining_sms || 0}</p>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Global Stock</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input type="text" placeholder="Search Madrasah..." className="w-full pl-14 pr-6 py-4.5 bg-white border border-[#8D30F4]/5 rounded-[1.8rem] outline-none text-slate-800 font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          {filtered.map(m => (
            <div key={m.id} onClick={() => handleUserClick(m)} className="bg-white p-5 rounded-[2.2rem] border border-slate-100 flex items-center justify-between shadow-sm active:scale-95 transition-all cursor-pointer">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                  {m.logo_url ? <img src={m.logo_url} className="w-full h-full object-cover rounded-2xl" /> : <UserIcon size={24} />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-800 truncate font-noto">{m.name}</h3>
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] font-bold text-[#8D30F4]">SMS: {m.sms_balance || 0}</p>
                    <p className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${m.is_active !== false ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>{m.is_active !== false ? 'Active' : 'Blocked'}</p>
                  </div>
                </div>
              </div>
              <Settings size={20} className="text-slate-200" />
            </div>
          ))}
        </div>
      )}

      {/* User Edit Modal - Optimized for Masking Config */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[500] flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl space-y-6 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setSelectedUser(null)} className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-all"><X size={26} /></button>
            <div className="text-center space-y-2">
               <h2 className="text-xl font-black text-slate-800 font-noto">{selectedUser.name}</h2>
               <p className="text-[10px] font-black text-[#8D30F4] uppercase tracking-widest">User Masking Config</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-2">
                 <p className="text-[10px] font-bold text-amber-700 leading-relaxed font-noto">
                   মস্কিং ব্যবহারের জন্য নিচের ঘরগুলো পূরণ করুন। খালি রাখলে গ্লোবাল সেটিংস কাজ করবে।
                 </p>
              </div>

              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Caller ID (Sender Name)</label>
                <input type="text" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black uppercase text-sm" value={editCallerId} onChange={(e) => setEditCallerId(e.target.value)} placeholder="e.g. MYMADRASAH" />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Masking API Key</label>
                <input type="text" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black text-xs" value={editApiKey} onChange={(e) => setEditApiKey(e.target.value)} />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Masking Secret Key</label>
                <input type="text" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black text-xs" value={editSecretKey} onChange={(e) => setEditSecretKey(e.target.value)} />
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-sm font-black text-slate-700">Account Access</span>
                <button onClick={() => setEditActive(!editActive)} className={`w-14 h-8 rounded-full transition-all relative ${editActive ? 'bg-green-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${editActive ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <button onClick={updateUserProfile} disabled={isUpdatingUser} className="w-full h-16 premium-btn text-white font-black rounded-full flex items-center justify-center gap-3 shadow-xl">
               {isUpdatingUser ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> Update Madrasah Config</>}
            </button>
          </div>
        </div>
      )}

      {view === 'gateway' && (
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl space-y-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#8D30F4]/10 text-[#8D30F4] rounded-2xl flex items-center justify-center"><Globe size={24} /></div>
              <h3 className="text-xl font-black text-slate-800">Global Non-Masking Config</h3>
           </div>
           
           <div className="space-y-5">
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global bKash Number</label>
                <input type="text" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black" value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Non-Masking Sender ID</label>
                <input type="text" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black" value={reveCallerId} onChange={(e) => setReveCallerId(e.target.value)} placeholder="1234" />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System API Key</label>
                <input type="text" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black text-sm" value={reveApiKey} onChange={(e) => setReveApiKey(e.target.value)} />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Secret Key</label>
                <input type="password" title="Secret Key" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black text-sm" value={reveSecretKey} onChange={(e) => setReveSecretKey(e.target.value)} />
              </div>
              <button onClick={saveGlobalSettings} disabled={savingGateway} className="w-full h-16 premium-btn text-white font-black rounded-full flex items-center justify-center gap-3 mt-4">
                {savingGateway ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> Save Global Config</>}
              </button>
           </div>
        </div>
      )}

      {view === 'approvals' && (
        <div className="space-y-5">
          {pendingTrans.length > 0 ? pendingTrans.map(tr => (
            <div key={tr.id} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black text-[#8D30F4] uppercase mb-1">{tr.madrasahs?.name}</p>
                  <h4 className="text-2xl font-black text-slate-800">{tr.amount} ৳</h4>
                </div>
                <CreditCard className="text-slate-200" size={32} />
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4 text-[11px]">
                 <div><p className="text-slate-400 font-black mb-0.5">Sender</p><p className="font-black text-slate-800">{tr.sender_phone}</p></div>
                 <div className="text-right"><p className="text-slate-400 font-black mb-0.5">TrxID</p><p className="font-black text-[#8D30F4]">{tr.transaction_id}</p></div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase px-1">Give SMS Credits</label>
                 <input type="number" className="w-full px-5 py-4 bg-slate-50 border-2 border-[#8D30F4]/10 rounded-2xl font-black text-center text-lg outline-none" value={smsToCredit[tr.id] || ''} onChange={(e) => setSmsToCredit({...smsToCredit, [tr.id]: e.target.value})} placeholder="e.g. 500" />
              </div>
              <div className="flex gap-3">
                 <button onClick={() => approveTransaction(tr)} className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-100"><CheckCircle size={18} /> Approve</button>
                 <button onClick={async () => { if(confirm('Reject?')) { await supabase.from('transactions').update({ status: 'rejected' }).eq('id', tr.id); initData(); } }} className="flex-1 py-4 bg-red-50 text-red-500 font-black rounded-2xl flex items-center justify-center gap-2"><XCircle size={18} /> Reject</button>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-white/20 rounded-[3rem] border-2 border-dashed border-white/30">
               <p className="text-white font-black uppercase text-xs tracking-widest">No pending requests</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
