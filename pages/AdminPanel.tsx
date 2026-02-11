
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, Shield, ShieldOff, ChevronRight, User as UserIcon, Users, Wallet, CheckCircle, XCircle, PlusCircle, MinusCircle, RefreshCw, AlertTriangle, Bug, Check, Phone, Hash, MessageSquare, Database } from 'lucide-react';
import { supabase } from '../supabase';
import { Madrasah, Language, Transaction, AdminSMSStock } from '../types';
import { t } from '../translations';

interface AdminPanelProps {
  lang: Language;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ lang }) => {
  const [madrasahs, setMadrasahs] = useState<Madrasah[]>([]);
  const [pendingTrans, setPendingTrans] = useState<Transaction[]>([]);
  const [adminStock, setAdminStock] = useState<AdminSMSStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  const [view, setView] = useState<'list' | 'details' | 'approvals' | 'stock'>('list');
  const [selectedMadrasah, setSelectedMadrasah] = useState<Madrasah | null>(null);
  
  // SMS Credit State for Approval
  const [smsToCredit, setSmsToCredit] = useState<{ [key: string]: string }>({});
  
  // Stock Update State
  const [newStockCount, setNewStockCount] = useState('');
  const [updatingStock, setUpdatingStock] = useState(false);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('madrasahs').select('*').eq('id', user?.id).single();
      
      if (!profile?.is_super_admin) {
         setError("You do not have Super Admin permissions.");
         setLoading(false);
         return;
      }
      await Promise.all([fetchAllMadrasahs(), fetchPendingTransactions(), fetchAdminStock()]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStock = async () => {
    const { data } = await supabase.from('admin_sms_stock').select('*').limit(1).single();
    if (data) setAdminStock(data);
  };

  const fetchAllMadrasahs = async () => {
    const { data } = await supabase.from('madrasahs').select('*').neq('is_super_admin', true).order('created_at', { ascending: false });
    setMadrasahs(data || []);
  };

  const fetchPendingTransactions = async () => {
    const { data } = await supabase.from('transactions').select('*, madrasahs(name)').eq('status', 'pending').order('created_at', { ascending: false });
    setPendingTrans(data || []);
  };

  const updateAdminStock = async () => {
    if (!newStockCount || isNaN(Number(newStockCount))) return;
    setUpdatingStock(true);
    try {
      const { data } = await supabase.from('admin_sms_stock').select('*').limit(1).single();
      if (data) {
        const { error } = await supabase.from('admin_sms_stock').update({ 
          remaining_sms: Number(newStockCount), 
          updated_at: new Date().toISOString() 
        }).eq('id', data.id);
        if (error) throw error;
        setAdminStock({ ...data, remaining_sms: Number(newStockCount) });
        setNewStockCount('');
        alert("Stock updated!");
      }
    } catch (err: any) { alert(err.message); } finally { setUpdatingStock(false); }
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

  if (loading) return (
    <div className="py-20 flex flex-col items-center justify-center gap-4 text-white">
      <Loader2 className="animate-spin" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest">{t('waiting', lang)}</p>
    </div>
  );

  if (view === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="grid grid-cols-2 gap-3">
          <div onClick={() => setView('stock')} className="bg-white/10 p-4 rounded-3xl border border-white/10 backdrop-blur-md flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all">
             <Database size={20} className="text-yellow-400 mb-1" />
             <span className="text-xl font-black text-white">{adminStock?.remaining_sms || 0}</span>
             <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Admin SMS Stock</span>
          </div>
          <div onClick={() => setView('approvals')} className={`p-4 rounded-3xl border backdrop-blur-md flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all ${pendingTrans.length > 0 ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-white/10 border-white/10'}`}>
             <Wallet size={20} className={`${pendingTrans.length > 0 ? 'text-yellow-400' : 'text-white/40'} mb-1`} />
             <span className={`text-xl font-black ${pendingTrans.length > 0 ? 'text-yellow-400' : 'text-white'}`}>{pendingTrans.length}</span>
             <span className={`text-[8px] font-black uppercase tracking-widest ${pendingTrans.length > 0 ? 'text-yellow-400/60' : 'text-white/30'}`}>Pending Payment</span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input type="text" placeholder={t('search_madrasah', lang)} className="w-full pl-12 pr-5 py-4 bg-white/10 border border-white/20 rounded-3xl outline-none text-white font-bold backdrop-blur-md" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="space-y-3">
          {filtered.map(m => (
            <div key={m.id} className="w-full bg-white/10 border border-white/10 rounded-[2rem] p-4 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-4 text-left min-w-0 pr-2">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                   {m.logo_url ? <img src={m.logo_url} className="w-full h-full object-cover" /> : <UserIcon size={20} className="text-white/30" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-white truncate text-sm font-noto leading-tight">{m.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-white/60 font-black"><MessageSquare size={10} className="inline mr-1" />{m.sms_balance || 0} SMS</span>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${m.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {m.is_active !== false ? t('status_active', lang) : t('status_inactive', lang)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
           <div>
              <p className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-1">Current Stock</p>
              <h2 className="text-5xl font-black text-white">{adminStock?.remaining_sms || 0}</h2>
              <p className="text-[9px] text-white/20 mt-2 font-bold uppercase">Last Updated: {adminStock ? new Date(adminStock.updated_at).toLocaleString() : 'Never'}</p>
           </div>

           <div className="space-y-4 pt-4 border-t border-white/10">
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest text-left px-2">Purchase/Update Stock</p>
              <input type="number" placeholder="Enter Total SMS Stock" className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-black text-center focus:bg-white/20 transition-all" value={newStockCount} onChange={(e) => setNewStockCount(e.target.value)} />
              <button onClick={updateAdminStock} disabled={updatingStock} className="w-full py-5 bg-yellow-400 text-slate-900 font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                 {updatingStock ? <Loader2 className="animate-spin" size={20} /> : <><RefreshCw size={20} /> Update Master Stock</>}
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (view === 'approvals') {
     return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
           <div className="flex items-center gap-4">
              <button onClick={() => setView('list')} className="p-3 bg-white/10 rounded-xl text-white border border-white/20 active:scale-90 transition-all">
                <ChevronRight className="rotate-180" size={20} />
              </button>
              <h1 className="text-xl font-black text-white font-noto">পেমেন্ট রিকোয়েস্ট</h1>
           </div>
           
           <div className="space-y-4">
              {pendingTrans.length > 0 ? pendingTrans.map(tr => (
                 <div key={tr.id} className="bg-white/15 backdrop-blur-2xl rounded-[2.5rem] p-6 border border-white/20 shadow-xl space-y-4">
                    <div className="flex items-start justify-between">
                       <div className="min-w-0 pr-2">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">মাদরাসার নাম</p>
                          <h4 className="text-base font-black text-white font-noto truncate">{tr.madrasahs?.name}</h4>
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
                       <div>
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">bKash TrxID</p>
                          <p className="text-sm font-mono font-black text-white uppercase">{tr.transaction_id}</p>
                       </div>
                       <div className="text-right">
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
                       <button onClick={() => approveTransaction(tr)} disabled={updatingId === tr.id} className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-sm">
                          {updatingId === tr.id ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle size={18} /> Approve & Credit</>}
                       </button>
                       <button onClick={() => rejectTransaction(tr.id)} disabled={updatingId === tr.id} className="flex-1 py-4 bg-red-500/20 text-white font-black rounded-2xl border border-red-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm">
                          <XCircle size={18} /> Reject
                       </button>
                    </div>
                 </div>
              )) : (
                 <div className="text-center py-20 opacity-40">
                    <p className="text-white font-bold">অনুমোদনের জন্য কোনো পেমেন্ট রিকোয়েস্ট নেই</p>
                 </div>
              )}
           </div>
        </div>
     );
  }

  return null;
};

export default AdminPanel;
