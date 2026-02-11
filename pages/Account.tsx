
import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Check, Smartphone, Copy, Camera, Loader2, Hash, AlertCircle, RefreshCw, Lock, WifiOff, History, CreditCard, ArrowUpRight, ArrowDownLeft, User as UserIcon, BookOpen, ShieldCheck } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
import { Madrasah, Language, View, Transaction } from '../types';
import { t } from '../translations';

interface AccountProps {
  lang: Language;
  setLang: (l: Language) => void;
  onProfileUpdate?: () => void;
  setView: (view: View) => void;
  isSuperAdmin?: boolean;
}

const Account: React.FC<AccountProps> = ({ lang, setLang, onProfileUpdate, setView, isSuperAdmin }) => {
  const [madrasah, setMadrasah] = useState<Madrasah | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLoginCode, setNewLoginCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTrans, setLoadingTrans] = useState(false);

  useEffect(() => {
    fetchProfile();
    if (!isSuperAdmin) fetchTransactions();
  }, [isSuperAdmin]);

  const fetchProfile = async () => {
    // Use cached first for zero-latency UI
    const cachedProfile = offlineApi.getCache('profile');
    if (cachedProfile) {
      updateLocalState(cachedProfile);
      setLoading(false);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && navigator.onLine) {
        const { data, error } = await supabase.from('madrasahs').select('*').eq('id', session.user.id).maybeSingle();
        if (data && !error) {
          updateLocalState(data);
          offlineApi.setCache('profile', data);
        }
      }
    } catch (err) { 
      console.error("Profile fetch error in Account:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  const updateLocalState = (data: Madrasah) => {
    setMadrasah(data);
    setNewName(data.name || '');
    setNewPhone(data.phone || '');
    setNewLoginCode(data.login_code || '');
  };

  const fetchTransactions = async () => {
    setLoadingTrans(true);
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setTransactions(data);
    } catch (err) { 
      console.error("Trans fetch error:", err); 
    } finally { 
      setLoadingTrans(false); 
    }
  };

  const handleUpdate = async () => {
    if (!madrasah) return;
    setSaving(true);
    try {
      const updateData = { 
        name: newName.trim(), 
        phone: newPhone.trim(), 
        login_code: newLoginCode.trim() 
      };

      if (navigator.onLine) {
        const { error } = await supabase.from('madrasahs').update(updateData).eq('id', madrasah.id);
        if (error) throw error;
      } else {
        offlineApi.queueAction('madrasahs', 'UPDATE', { ...updateData, id: madrasah.id });
      }

      const updatedProfile = { ...madrasah, ...updateData };
      setMadrasah(updatedProfile);
      offlineApi.setCache('profile', updatedProfile);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) { 
      console.error(err); 
      alert(lang === 'bn' ? 'আপডেট করা সম্ভব হয়নি' : 'Update failed');
    } finally { 
      setSaving(false); 
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopying(type);
    setTimeout(() => setCopying(null), 2000);
  };

  if (loading && !madrasah) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4 animate-pulse">
        <Loader2 className="animate-spin text-white/40" size={40} />
        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-black text-white drop-shadow-sm font-noto">{t('account', lang)}</h1>
        {!isSuperAdmin && (
          <div className="bg-white/15 px-3 py-1.5 rounded-2xl border border-white/20 backdrop-blur-md flex items-center gap-2">
             <span className="text-[10px] font-black text-white/60 uppercase">{t('balance', lang)}</span>
             <span className="text-sm font-black text-white">{madrasah?.balance || 0} ৳</span>
          </div>
        )}
      </div>

      <div className="bg-white/20 backdrop-blur-xl rounded-[3rem] p-6 border border-white/30 shadow-2xl space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center ring-4 ring-white/10 overflow-hidden border-2 border-white/50 shadow-xl relative">
            {madrasah?.logo_url ? (
              <img src={madrasah.logo_url} className="w-full h-full object-cover" alt="Logo" />
            ) : isSuperAdmin ? (
               <ShieldCheck size={48} className="text-white" />
            ) : (
              <UserIcon size={40} className="text-white/60" />
            )}
            {isSuperAdmin && (
              <div className="absolute bottom-0 right-0 bg-yellow-400 p-1.5 rounded-full border-2 border-[#d35132] shadow-lg">
                <ShieldCheck size={14} className="text-slate-800" />
              </div>
            )}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-white font-noto leading-tight">{madrasah?.name}</h2>
            <div className={`inline-block px-4 py-1.5 rounded-full mt-3 text-[10px] font-black uppercase tracking-widest border ${isSuperAdmin ? 'bg-yellow-400 border-yellow-500 text-slate-900' : 'bg-white/20 border-white/10 text-white'}`}>
              {isSuperAdmin ? 'Super Admin System' : 'Madrasah Admin Account'}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
            <UserIcon size={12} /> {lang === 'bn' ? 'অ্যাকাউন্ট প্রোফাইল' : 'Account Profile'}
          </h3>
          
          <div className="space-y-3">
            <div className={`bg-white/5 p-4 rounded-3xl border flex items-center justify-between transition-all ${isSuperAdmin ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-white/5'}`}>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[9px] font-black text-white/30 uppercase mb-1">{t('madrasah_id', lang)} (UUID)</p>
                <p className="text-xs font-mono text-white/70 truncate tracking-tight">{madrasah?.id}</p>
                {isSuperAdmin && <p className="text-[8px] text-yellow-400/60 mt-1 font-bold">SYSTEM CONTROL AUTHORIZED</p>}
              </div>
              <button onClick={() => copyToClipboard(madrasah?.id || '', 'uuid')} className="p-3 bg-white/10 text-white rounded-2xl active:scale-90 transition-all shadow-lg border border-white/10">
                {copying === 'uuid' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>

            <div className="bg-white/10 p-4 rounded-3xl border border-white/10 focus-within:bg-white/20 transition-all">
              <p className="text-[9px] font-black text-white/30 uppercase mb-1 px-1">{t('madrasah_name', lang)}</p>
              <div className="flex items-center gap-3">
                <BookOpen size={18} className="text-white/30" />
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-transparent border-none outline-none text-white font-black w-full text-base font-noto placeholder:text-white/20" placeholder="Madrasah Name" />
              </div>
            </div>

            <div className="bg-white/10 p-4 rounded-3xl border border-white/10 focus-within:bg-white/20 transition-all">
              <p className="text-[9px] font-black text-white/30 uppercase mb-1 px-1">{lang === 'bn' ? 'লগইন পাসওয়ার্ড' : 'Login Password'}</p>
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-white/30" />
                <input type="text" value={newLoginCode} onChange={(e) => setNewLoginCode(e.target.value)} className="bg-transparent border-none outline-none text-white font-black w-full text-base tracking-widest placeholder:text-white/20" placeholder="••••••" />
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleUpdate} disabled={saving} className="w-full py-5 bg-white text-[#d35132] font-black rounded-[2rem] shadow-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-3 border border-white/50">
          {saving ? <Loader2 className="animate-spin" size={20} /> : showSuccess ? <><Check size={20} /> PROFILE UPDATED</> : <><RefreshCw size={18} /> {t('update_info', lang)}</>}
        </button>

        {!isSuperAdmin && transactions.length > 0 && (
           <div className="space-y-3 pt-4 border-t border-white/10">
             <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
               <History size={12} /> {t('history', lang)}
             </h3>
             {transactions.map(tr => (
               <div key={tr.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between text-white transition-all active:bg-white/10">
                  <div className="min-w-0 flex-1 pr-3">
                    <span className="text-xs font-black truncate block font-noto">{tr.description}</span>
                    <span className="text-[9px] font-bold text-white/30 block mt-0.5">{new Date(tr.created_at).toLocaleDateString()}</span>
                  </div>
                  <span className={`text-sm font-black whitespace-nowrap ${tr.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                    {tr.type === 'credit' ? '+' : '-'}{tr.amount} ৳
                  </span>
               </div>
             ))}
           </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setLang('bn')} className={`py-4 rounded-[1.8rem] font-black text-sm transition-all border shadow-lg ${lang === 'bn' ? 'bg-white text-[#d35132] border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>বাংলা</button>
        <button onClick={() => setLang('en')} className={`py-4 rounded-[1.8rem] font-black text-sm transition-all border shadow-lg ${lang === 'en' ? 'bg-white text-[#d35132] border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>English</button>
      </div>

      <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-3 py-5 text-white font-black bg-red-600/20 backdrop-blur-md border border-red-500/30 rounded-[2rem] active:scale-95 transition-all shadow-xl mt-4">
        <LogOut size={20} /> {t('logout', lang)}
      </button>
    </div>
  );
};

export default Account;
