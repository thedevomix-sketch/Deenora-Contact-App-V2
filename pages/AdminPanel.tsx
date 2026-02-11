
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, Shield, ShieldOff, ChevronRight, User as UserIcon, Users, CheckCircle2, Ban, Copy, Check, Eye, EyeOff, Lock, Wallet, CheckCircle, XCircle, PlusCircle, MinusCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { Madrasah, Language, Transaction } from '../types';
import { t } from '../translations';

interface AdminPanelProps {
  lang: Language;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ lang }) => {
  const [madrasahs, setMadrasahs] = useState<Madrasah[]>([]);
  const [pendingTrans, setPendingTrans] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  const [view, setView] = useState<'list' | 'details' | 'approvals'>('list');
  const [selectedMadrasah, setSelectedMadrasah] = useState<Madrasah | null>(null);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);

  // Recharge State
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [isRecharging, setIsRecharging] = useState(false);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchAllMadrasahs(), fetchPendingTransactions()]);
    setLoading(false);
  };

  const fetchAllMadrasahs = async () => {
    try {
      const { data } = await supabase
        .from('madrasahs')
        .select('*')
        .neq('is_super_admin', true) 
        .order('created_at', { ascending: false });
      setMadrasahs(data || []);
    } catch (err) { console.error(err); }
  };

  const fetchPendingTransactions = async () => {
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*, madrasahs(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setPendingTrans(data || []);
    } catch (err) { console.error(err); }
  };

  const fetchMadrasahStats = async (madrasahId: string) => {
    setLoadingStats(true);
    try {
      const { count } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('madrasah_id', madrasahId);
      setStudentCount(count || 0);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleRecharge = async (isAdd: boolean) => {
    if (!selectedMadrasah || !rechargeAmount || isNaN(Number(rechargeAmount))) return;
    
    setIsRecharging(true);
    const amount = Number(rechargeAmount) * (isAdd ? 1 : -1);
    const desc = isAdd ? `Admin Manual Recharge: +${rechargeAmount} ৳` : `Admin Manual Deduction: -${rechargeAmount} ৳`;

    try {
      const { error: rpcError } = await supabase.rpc('admin_update_balance', {
        m_id: selectedMadrasah.id,
        amount_change: amount,
        trx_desc: desc
      });

      if (rpcError) throw rpcError;

      const newBalance = (selectedMadrasah.balance || 0) + amount;
      setSelectedMadrasah({ ...selectedMadrasah, balance: newBalance });
      setMadrasahs(prev => prev.map(m => m.id === selectedMadrasah.id ? { ...m, balance: newBalance } : m));
      setRechargeAmount('');
      alert(lang === 'bn' ? 'ব্য্যালেন্স সফলভাবে আপডেট হয়েছে!' : 'Balance updated successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsRecharging(false);
    }
  };

  const approveTransaction = async (tr: Transaction) => {
    setUpdatingId(tr.id);
    try {
      const { error: trError } = await supabase.from('transactions').update({ status: 'approved' }).eq('id', tr.id);
      if (trError) throw trError;

      const { error: mError } = await supabase.rpc('admin_update_balance', {
        m_id: tr.madrasah_id,
        amount_change: tr.amount,
        trx_desc: `Recharge Approved: TRX ${tr.transaction_id}`
      });
      if (mError) throw mError;

      setPendingTrans(prev => prev.filter(t => t.id !== tr.id));
      alert(lang === 'bn' ? 'অনুমোদিত হয়েছে!' : 'Approved successfully!');
      fetchAllMadrasahs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const rejectTransaction = async (id: string) => {
    if (!confirm(lang === 'bn' ? 'বাতিল করতে চান?' : 'Are you sure?')) return;
    setUpdatingId(id);
    try {
      await supabase.from('transactions').update({ status: 'rejected' }).eq('id', id);
      setPendingTrans(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error(err); } finally { setUpdatingId(null); }
  };

  const toggleStatus = async (m: Madrasah) => {
    setUpdatingId(m.id);
    const newStatus = m.is_active === false;
    try {
      await supabase.from('madrasahs').update({ is_active: newStatus }).eq('id', m.id);
      setMadrasahs(prev => prev.map(item => item.id === m.id ? { ...item, is_active: newStatus } : item));
      if (selectedMadrasah?.id === m.id) setSelectedMadrasah({ ...selectedMadrasah, is_active: newStatus });
    } finally {
      setUpdatingId(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopying(key);
    setTimeout(() => setCopying(null), 2000);
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
          <div className="bg-white/10 p-4 rounded-3xl border border-white/10 backdrop-blur-md flex flex-col items-center text-center">
             <Users size={20} className="text-white/40 mb-1" />
             <span className="text-2xl font-black text-white">{madrasahs.length}</span>
             <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{t('total_users', lang)}</span>
          </div>
          <div 
            onClick={() => setView('approvals')}
            className={`p-4 rounded-3xl border backdrop-blur-md flex flex-col items-center text-center cursor-pointer active:scale-95 transition-all ${
               pendingTrans.length > 0 ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-white/10 border-white/10'
            }`}
          >
             <Wallet size={20} className={`${pendingTrans.length > 0 ? 'text-yellow-400' : 'text-white/40'} mb-1`} />
             <span className={`text-2xl font-black ${pendingTrans.length > 0 ? 'text-yellow-400' : 'text-white'}`}>{pendingTrans.length}</span>
             <span className={`text-[8px] font-black uppercase tracking-widest ${pendingTrans.length > 0 ? 'text-yellow-400/60' : 'text-white/30'}`}>{t('pending_approvals', lang)}</span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder={t('search_madrasah', lang)}
            className="w-full pl-12 pr-5 py-4 bg-white/10 border border-white/20 rounded-3xl outline-none text-white font-bold backdrop-blur-md shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {filtered.length > 0 ? filtered.map(m => (
            <div key={m.id} onClick={() => { setSelectedMadrasah(m); setView('details'); fetchMadrasahStats(m.id); }} className="w-full bg-white/10 border border-white/10 rounded-[2rem] p-4 flex items-center justify-between active:scale-[0.98] transition-all backdrop-blur-md cursor-pointer">
              <div className="flex items-center gap-4 text-left min-w-0 pr-2">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                   {m.logo_url ? <img src={m.logo_url} className="w-full h-full object-cover" /> : <UserIcon size={20} className="text-white/30" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-white truncate text-sm font-noto leading-tight">{m.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-white/60 font-black">{m.balance || 0} ৳</span>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${m.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {m.is_active !== false ? t('status_active', lang) : t('status_inactive', lang)}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="text-white/20 shrink-0" size={20} />
            </div>
          )) : (
            <div className="text-center py-20 opacity-40">
               <p className="text-white text-sm font-bold font-noto">কোনো মাদরাসা পাওয়া যায়নি</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'approvals') {
     return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
           <div className="flex items-center gap-4">
              <button onClick={() => setView('list')} className="p-3 bg-white/10 rounded-xl text-white border border-white/20 shadow-lg active:scale-90 transition-all">
                <ChevronRight className="rotate-180" size={20} />
              </button>
              <h1 className="text-xl font-black text-white font-noto">{t('pending_approvals', lang)}</h1>
           </div>
           <div className="space-y-4">
              {pendingTrans.length > 0 ? pendingTrans.map(tr => (
                 <div key={tr.id} className="bg-white/15 backdrop-blur-2xl rounded-[2.5rem] p-6 border border-white/20 shadow-xl space-y-4">
                    <div className="flex items-start justify-between">
                       <div className="min-w-0 pr-2">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Madrasah</p>
                          <h4 className="text-base font-black text-white font-noto">{tr.madrasahs?.name}</h4>
                       </div>
                       <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-right">
                          <p className="text-[9px] font-black text-white/50 uppercase">Amount</p>
                          <p className="text-lg font-black text-white">{tr.amount} ৳</p>
                       </div>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                       <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">{t('trx_id', lang)}</p>
                       <p className="text-base font-mono font-black text-white tracking-wider">{tr.transaction_id}</p>
                    </div>
                    <div className="flex gap-3">
                       <button onClick={() => approveTransaction(tr)} disabled={updatingId === tr.id} className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-sm">
                          {updatingId === tr.id ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle size={18} /> {t('approve', lang)}</>}
                       </button>
                       <button onClick={() => rejectTransaction(tr.id)} disabled={updatingId === tr.id} className="flex-1 py-4 bg-red-500/20 text-white font-black rounded-2xl border border-red-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm">
                          <XCircle size={18} /> {t('reject', lang)}
                       </button>
                    </div>
                 </div>
              )) : (
                 <div className="text-center py-20 opacity-40">
                    <p className="text-white font-bold">{lang === 'bn' ? 'অনুমোদনের জন্য কিছু নেই' : 'Nothing to approve'}</p>
                 </div>
              )}
           </div>
        </div>
     );
  }

  return (
    <div className="animate-in slide-in-from-right-4 duration-500 pb-20 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setView('list')} className="p-3 bg-white/10 rounded-xl text-white active:scale-90 transition-all border border-white/20 shadow-lg">
          <ChevronRight className="rotate-180" size={20} />
        </button>
        <h1 className="text-xl font-black text-white font-noto">মাদরাসা প্রোফাইল</h1>
      </div>

      <div className="bg-white/15 backdrop-blur-2xl rounded-[3rem] p-6 border border-white/20 shadow-2xl space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-24 h-24 bg-white/10 rounded-full border-4 border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
            {selectedMadrasah?.logo_url ? <img src={selectedMadrasah.logo_url} className="w-full h-full object-cover" /> : <UserIcon size={40} className="text-white/30" />}
          </div>
          <div className="px-4">
            <h2 className="text-xl font-black text-white font-noto leading-tight">{selectedMadrasah?.name}</h2>
            <div className="bg-white/10 px-4 py-2 rounded-full mt-3 border border-white/10 flex items-center gap-2 justify-center">
               <Wallet size={14} className="text-white/60" />
               <span className="text-lg font-black text-white">{selectedMadrasah?.balance || 0} ৳</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 p-5 rounded-[2.2rem] border border-white/10 space-y-4 shadow-inner">
           <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
             <PlusCircle size={14} /> Balance Management
           </h3>
           <div className="flex flex-col gap-3">
              <input type="number" placeholder="Amount (৳)" className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-black text-lg text-center focus:bg-white/20 transition-all shadow-inner" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} />
              <div className="flex gap-2">
                 <button onClick={() => handleRecharge(true)} disabled={isRecharging || !rechargeAmount} className="flex-1 py-4 bg-green-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                   {isRecharging ? <Loader2 className="animate-spin" size={18} /> : <PlusCircle size={18} />} Add
                 </button>
                 <button onClick={() => handleRecharge(false)} disabled={isRecharging || !rechargeAmount} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                   {isRecharging ? <Loader2 className="animate-spin" size={18} /> : <MinusCircle size={18} />} Deduct
                 </button>
              </div>
           </div>
        </div>

        <div className="space-y-3">
           <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                 <p className="text-[9px] font-black text-white/30 uppercase mb-0.5">Madrasah UUID</p>
                 <p className="text-[11px] font-mono text-white/90 truncate font-black tracking-tight">{selectedMadrasah?.id}</p>
              </div>
              <button onClick={() => copyToClipboard(selectedMadrasah?.id || '', 'uuid')} className="p-2.5 bg-white/10 text-white rounded-xl active:scale-90 transition-all shrink-0">
                 {copying === 'uuid' ? <Check size={14} /> : <Copy size={14} />}
              </button>
           </div>
           
           <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <Lock size={16} className="text-white/30" />
                 <div>
                    <p className="text-[9px] font-black text-white/30 uppercase mb-0.5">Login Code</p>
                    <p className="text-base font-black text-white tracking-[0.2em]">{showPass ? selectedMadrasah?.login_code : '••••••'}</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => selectedMadrasah?.login_code && copyToClipboard(selectedMadrasah.login_code, 'code')} className="p-2.5 bg-white/10 text-white rounded-xl active:scale-90 transition-all">
                   {copying === 'code' ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button onClick={() => setShowPass(!showPass)} className="p-2.5 bg-white/10 text-white rounded-xl active:scale-90 transition-all">
                   {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
           </div>
        </div>

        <button onClick={() => selectedMadrasah && toggleStatus(selectedMadrasah)} className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${selectedMadrasah?.is_active !== false ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {updatingId ? <Loader2 className="animate-spin" size={20} /> : selectedMadrasah?.is_active !== false ? <><ShieldOff size={18} /> Block Account</> : <><Shield size={18} /> Activate Account</>}
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
