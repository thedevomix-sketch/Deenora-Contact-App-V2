
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, ChevronRight, User as UserIcon, ShieldCheck, Database, Globe, CheckCircle, XCircle, CreditCard, Save } from 'lucide-react';
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

  // Global Settings Form
  const [reveApiKey, setReveApiKey] = useState('aa407e1c6629da8e');
  const [reveSecretKey, setReveSecretKey] = useState('91051e7e');
  const [reveCallerId, setReveCallerId] = useState('');
  const [reveClientId, setReveClientId] = useState('');
  const [bkashNumber, setBkashNumber] = useState('০১৭৬৬-XXXXXX');
  const [savingGateway, setSavingGateway] = useState(false);

  useEffect(() => { initData(); }, [dataVersion]);

  useEffect(() => {
    if (currentView === 'approvals') setView('approvals');
    else setView('list');
  }, [currentView]);

  const initData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAllMadrasahs(), fetchPendingTransactions(), fetchAdminStock(), fetchGlobalSettings()]);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchGlobalSettings = async () => {
    const settings = await smsApi.getGlobalSettings();
    if (settings) {
      if (settings.reve_api_key) setReveApiKey(settings.reve_api_key);
      if (settings.reve_secret_key) setReveSecretKey(settings.reve_secret_key);
      setReveCallerId(settings.reve_caller_id || '');
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
      alert('Gateway & Payment Settings Saved Globally');
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
    const { data } = await supabase.from('transactions').select('*, madrasahs(name)').eq('status', 'pending').order('created_at', { ascending: false });
    if (data) setPendingTrans(data);
  };

  const approveTransaction = async (tr: Transaction) => {
    const sms = Number(smsToCredit[tr.id]);
    if (!sms || sms <= 0) return alert('SMS সংখ্যা লিখুন');
    try {
      const { error } = await supabase.rpc('approve_payment_with_sms', { t_id: tr.id, m_id: tr.madrasah_id, sms_to_give: sms });
      if (error) throw error;
      setPendingTrans(p => p.filter(t => t.id !== tr.id));
      alert('Approved! SMS Credited.');
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
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">SMS Stock</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input type="text" placeholder="Search..." className="w-full pl-14 pr-6 py-4.5 bg-white border border-[#8D30F4]/5 rounded-[1.8rem] outline-none text-slate-800 font-bold" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          {filtered.map(m => (
            <div key={m.id} className="bg-white p-5 rounded-[2.2rem] border border-slate-100 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                  {m.logo_url ? <img src={m.logo_url} className="w-full h-full object-cover rounded-2xl" /> : <UserIcon size={24} />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-800 truncate font-noto">{m.name}</h3>
                  <p className="text-[10px] font-bold text-[#8D30F4]">SMS: {m.sms_balance || 0}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-200" />
            </div>
          ))}
        </div>
      )}

      {view === 'gateway' && (
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl space-y-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#8D30F4]/10 text-[#8D30F4] rounded-2xl flex items-center justify-center"><Globe size={24} /></div>
              <h3 className="text-xl font-black text-slate-800">System Gateway</h3>
           </div>
           
           <div className="space-y-5">
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">bKash Payment Number</label>
                <input type="text" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black" value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} placeholder="০১৭..." />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">REVE API Key</label>
                <input type="text" className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-black text-sm" value={reveApiKey} onChange={(e) => setReveApiKey(e.target.value)} />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">REVE Secret Key</label>
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
                {savingGateway ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> Save Global Settings</>}
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
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">From: {tr.madrasahs?.name}</p>
                  <h4 className="text-xl font-black text-[#8D30F4]">{tr.amount} ৳</h4>
                </div>
                <CreditCard className="text-slate-200" size={32} />
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4 text-[11px]">
                 <div><p className="text-slate-400 font-black mb-0.5">Phone</p><p className="font-black text-slate-800">{tr.sender_phone}</p></div>
                 <div className="text-right"><p className="text-slate-400 font-black mb-0.5">TrxID</p><p className="font-black text-[#8D30F4]">{tr.transaction_id}</p></div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase px-1">SMS Credit Quantity</label>
                 <input type="number" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center text-lg" value={smsToCredit[tr.id] || ''} onChange={(e) => setSmsToCredit({...smsToCredit, [tr.id]: e.target.value})} placeholder="e.g. 1000" />
              </div>
              <div className="flex gap-3">
                 <button onClick={() => approveTransaction(tr)} className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-200"><CheckCircle size={18} /> Approve</button>
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
