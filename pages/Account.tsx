
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
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLoginCode, setNewLoginCode] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);
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
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchTransactions = async () => {
    if (isSuperAdmin) return;
    setLoadingTrans(true);
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setTransactions(data);
    } catch (err) { 
      console.error(err); 
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
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-white" size={40} />
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
              <div className="absolute bottom-0 right-0 bg-yellow-400 p-1 rounded-full border border-white shadow-lg">
                <ShieldCheck size={14} className="text-slate-800" />
              </div>
            )}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-white font-noto leading-tight">{madrasah?.name}</h2>
            <div className={`inline-block px-3 py-1 rounded-full mt-2 text-[10px] font-black uppercase tracking-widest ${isSuperAdmin ? 'bg-yellow-400 text-slate-900' : 'bg-white/20 text-white'}`}>
              {isSuperAdmin ? 'Super Admin Account' : 'Madrasah Admin Account'}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">
            {lang === 'bn' ? 'অ্যাকাউন্ট তথ্য' : 'Account Details'}
          </h3>
          
          <div className="space-y-3">
            <div className={`bg-white/5 p-4 rounded-2xl border flex items-center justify-between ${isSuperAdmin ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-white/5'}`}>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[9px] font-black text-white/30 uppercase mb-1">{t('madrasah_id', lang)} (UUID)</p>
                <p className="text-xs font-mono text-white/70 truncate">{madrasah?.id}</p>
                <p className="text-[8px] text-yellow-400/60 mt-1 font-bold">Use this ID for database updates</p>
              </div>
              <button onClick={() => copyToClipboard(madrasah?.id || '', 'uuid')} className="p-2.5 bg-white/10 text-white rounded-xl active:scale-90 transition-all">
                {copying === 'uuid' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-white/30 uppercase mb-1">{t('madrasah_name', lang)}</p>
              <div className="flex items-center gap-3">
                <BookOpen size={16} className="text-white/30" />
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-transparent border-none outline-none text-white font-bold w-full text-sm font-noto" />
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-white/30 uppercase mb-1">{lang === 'bn' ? 'লগইন কোড' : 'Login Code'}</p>
              <div className="flex items-center gap-3">
                <Lock size={16} className="text-white/30" />
                <input type="text" value={newLoginCode} onChange={(e) => setNewLoginCode(e.target.value)} className="bg-transparent border-none outline-none text-white font-bold w-full text-sm" />
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleUpdate} disabled={saving} className="w-full py-4 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
          {saving ? <Loader2 className="animate-spin" size={20} /> : showSuccess ? <><Check size={20} /> Updated</> : t('update_info', lang)}
        </button>

        {!isSuperAdmin && transactions.length > 0 && (
           <div className="space-y-3">
             <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2">{t('history', lang)}</h3>
             {transactions.map(tr => (
               <div key={tr.id} className="bg-white/5 p-3 rounded-2xl border border-white/5 flex items-center justify-between text-white">
                  <span className="text-xs font-bold truncate pr-2">{tr.description}</span>
                  <span className={`text-xs font-black ${tr.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>{tr.type === 'credit' ? '+' : '-'}{tr.amount}</span>
               </div>
             ))}
           </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setLang('bn')} className={`py-4 rounded-2xl font-black text-sm transition-all border ${lang === 'bn' ? 'bg-white text-[#d35132] border-white' : 'bg-white/10 text-white border-white/20'}`}>বাংলা</button>
        <button onClick={() => setLang('en')} className={`py-4 rounded-2xl font-black text-sm transition-all border ${lang === 'en' ? 'bg-white text-[#d35132] border-white' : 'bg-white/10 text-white border-white/20'}`}>English</button>
      </div>

      <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-3 py-5 text-white font-black bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-2xl active:scale-95 transition-all">
        <LogOut size={20} /> {t('logout', lang)}
      </button>
    </div>
  );
};

export default Account;
