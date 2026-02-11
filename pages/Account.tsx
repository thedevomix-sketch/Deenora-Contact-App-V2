
import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Check, Smartphone, Copy, Camera, Loader2, Hash, AlertCircle, RefreshCw, Lock, WifiOff, History, CreditCard, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
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
  const [madrasah, setMadrasah] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLoginCode, setNewLoginCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTrans, setLoadingTrans] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchTransactions();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const cachedProfile = offlineApi.getCache('profile');
    if (cachedProfile) {
      setMadrasah(cachedProfile);
      setNewName(cachedProfile.name || '');
      setNewPhone(cachedProfile.phone || '');
      setNewLoginCode(cachedProfile.login_code || '');
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && navigator.onLine) {
        const { data } = await supabase.from('madrasahs').select('*').eq('id', session.user.id).single();
        if (data) {
          setMadrasah(data);
          setNewName(data.name || '');
          setNewPhone(data.phone || '');
          setNewLoginCode(data.login_code || '');
          offlineApi.setCache('profile', data);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchTransactions = async () => {
    setLoadingTrans(true);
    try {
      const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(5);
      if (data) setTransactions(data);
    } catch (err) { console.error(err); }
    finally { setLoadingTrans(false); }
  };

  const handleUpdate = async () => {
    if (!madrasah) return;
    setSaving(true);
    try {
      const updateData = { name: newName.trim(), phone: newPhone.trim(), login_code: newLoginCode.trim() };
      if (navigator.onLine) await supabase.from('madrasahs').update(updateData).eq('id', madrasah.id);
      else offlineApi.queueAction('madrasahs', 'UPDATE', { ...updateData, id: madrasah.id });
      const updatedProfile = { ...madrasah, ...updateData };
      setMadrasah(updatedProfile);
      offlineApi.setCache('profile', updatedProfile);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-black text-white drop-shadow-sm">{t('account', lang)}</h1>
        <div className="bg-white/15 px-3 py-1.5 rounded-2xl border border-white/20 backdrop-blur-md flex items-center gap-2">
           <span className="text-[10px] font-black text-white/60 uppercase">{t('balance', lang)}</span>
           <span className="text-sm font-black text-white">{madrasah?.balance || 0} ৳</span>
        </div>
      </div>

      <div className="bg-white/20 backdrop-blur-xl rounded-[3rem] p-6 border border-white/30 shadow-2xl space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative cursor-pointer group" onClick={() => !uploading && fileInputRef.current?.click()}>
            <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center ring-4 ring-white/10 overflow-hidden border-2 border-white/50 shadow-xl">
              {uploading ? <Loader2 className="animate-spin text-white" size={24} /> : madrasah?.logo_url ? <img src={madrasah.logo_url} className="w-full h-full object-cover" alt="Logo" /> : <Camera size={32} className="text-white/60" />}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={() => {}} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-white font-noto leading-tight">{madrasah?.name}</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button className="bg-white/10 p-4 rounded-2xl border border-white/10 flex flex-col items-center gap-1 active:scale-95 transition-all">
            <CreditCard size={20} className="text-white/60" />
            <span className="text-[10px] font-black text-white uppercase tracking-wider">{t('recharge', lang)}</span>
          </button>
          <button className="bg-white/10 p-4 rounded-2xl border border-white/10 flex flex-col items-center gap-1 active:scale-95 transition-all">
            <History size={20} className="text-white/60" />
            <span className="text-[10px] font-black text-white uppercase tracking-wider">{t('history', lang)}</span>
          </button>
        </div>

        <div className="space-y-4">
           <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">{t('recent_calls', lang)} / {t('history', lang)}</h3>
           <div className="space-y-2">
             {loadingTrans ? (
               <div className="py-4 text-center"><Loader2 size={16} className="animate-spin text-white/20 mx-auto" /></div>
             ) : transactions.length > 0 ? (
               transactions.map(tr => (
                 <div key={tr.id} className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg ${tr.type === 'credit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {tr.type === 'credit' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                       </div>
                       <div>
                          <p className="text-xs font-bold text-white leading-none">{tr.description}</p>
                          <p className="text-[8px] text-white/30 font-bold uppercase mt-1">{new Date(tr.created_at).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <span className={`text-xs font-black ${tr.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                       {tr.type === 'credit' ? '+' : '-'}{tr.amount}
                    </span>
                 </div>
               ))
             ) : (
               <p className="text-center py-4 text-white/20 text-[10px] font-black uppercase tracking-widest">No recent transactions</p>
             )}
           </div>
        </div>

        <div className="pt-2">
          <button onClick={handleUpdate} disabled={saving} className="w-full py-4 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={20} /> : showSuccess ? <Check size={20} /> : t('update_info', lang)}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setLang('bn')} className={`py-4 rounded-2xl font-black text-sm transition-all border ${lang === 'bn' ? 'bg-white text-[#d35132] border-white' : 'bg-white/10 text-white border-white/20'}`}>বাংলা</button>
        <button onClick={() => setLang('en')} className={`py-4 rounded-2xl font-black text-sm transition-all border ${lang === 'en' ? 'bg-white text-[#d35132] border-white' : 'bg-white/10 text-white border-white/20'}`}>English</button>
      </div>

      <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-3 py-5 text-white font-black bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-2xl active:scale-95 transition-all">
        <LogOut size={20} />
        {t('logout', lang)}
      </button>
    </div>
  );
};

export default Account;
