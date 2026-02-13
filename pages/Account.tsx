
import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Check, Smartphone, Copy, Camera, Loader2, RefreshCw, Lock, User as UserIcon, BookOpen, ShieldCheck, Database, ChevronDown, Phone, Sparkles } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
import { Madrasah, Language, View } from '../types';
import { t } from '../translations';

interface AccountProps {
  lang: Language;
  setLang: (l: Language) => void;
  onProfileUpdate?: () => void;
  setView: (view: View) => void;
  isSuperAdmin?: boolean;
  initialMadrasah: Madrasah | null;
}

const Account: React.FC<AccountProps> = ({ lang, setLang, onProfileUpdate, setView, isSuperAdmin, initialMadrasah }) => {
  const [madrasah, setMadrasah] = useState<Madrasah | null>(initialMadrasah);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState(initialMadrasah?.name || '');
  const [newPhone, setNewPhone] = useState(initialMadrasah?.phone || '');
  const [newLoginCode, setNewLoginCode] = useState(initialMadrasah?.login_code || '');
  const [showSuccess, setShowSuccess] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialMadrasah) {
      setMadrasah(initialMadrasah);
      setNewName(initialMadrasah.name || '');
      setNewPhone(initialMadrasah.phone || '');
      setNewLoginCode(initialMadrasah.login_code || '');
    }
  }, [initialMadrasah]);

  const forceUpdate = async () => {
    if (confirm(lang === 'bn' ? 'অ্যাপ আপডেট করতে ক্যাশ ক্লিয়ার হবে। নিশ্চিত?' : 'Clear cache and update app?')) {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) await reg.unregister();
      }
      
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      Object.keys(localStorage).forEach(k => { if(k.startsWith('cache_')) localStorage.removeItem(k); });
      window.location.replace(window.location.origin + window.location.pathname);
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

      const { error } = await supabase.from('madrasahs').update(updateData).eq('id', madrasah.id);
      if (error) throw error;

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !madrasah) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${madrasah.id}_${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('madrasah-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('madrasah-assets')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('madrasahs')
        .update({ logo_url: publicUrl })
        .eq('id', madrasah.id);

      if (updateError) throw updateError;

      setMadrasah({ ...madrasah, logo_url: publicUrl });
      if (onProfileUpdate) onProfileUpdate();
      alert(lang === 'bn' ? 'লোগো আপডেট হয়েছে' : 'Logo updated successfully');
    } catch (err: any) {
      console.error(err);
      alert(lang === 'bn' ? 'লোগো আপলোড ব্যর্থ হয়েছে' : 'Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopying(type);
    setTimeout(() => setCopying(null), 2000);
  };

  if (!madrasah) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-white/40">
        <Loader2 className="animate-spin mb-2" />
        <p className="text-xs uppercase font-black">Loading Account...</p>
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

      <div className="bg-white/20 backdrop-blur-xl rounded-[3rem] p-6 border border-white/30 shadow-2xl space-y-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="bg-white/20 w-28 h-28 rounded-[2rem] flex items-center justify-center ring-4 ring-white/10 overflow-hidden border-2 border-white/50 shadow-xl relative transition-transform active:scale-95">
              {uploading ? (
                <Loader2 className="animate-spin text-white" size={32} />
              ) : madrasah.logo_url ? (
                <img src={madrasah.logo_url} className="w-full h-full object-cover" alt="Logo" />
              ) : isSuperAdmin ? (
                <ShieldCheck size={48} className="text-white" />
              ) : (
                <UserIcon size={40} className="text-white/60" />
              )}
              
              {!isSuperAdmin && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                >
                  <Camera size={24} />
                </button>
              )}
            </div>
            
            {!isSuperAdmin && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 bg-white text-[#d35132] p-2 rounded-full shadow-lg border border-white/20 active:scale-90 transition-all"
              >
                <Camera size={16} />
              </button>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleLogoUpload}
            />
          </div>
          
          <div className="text-center">
            <h2 className="text-xl font-black text-white font-noto leading-tight">{madrasah?.name}</h2>
            <div className={`inline-block px-4 py-1.5 rounded-full mt-3 text-[10px] font-black uppercase tracking-widest border ${isSuperAdmin ? 'bg-yellow-400 border-yellow-500 text-slate-900' : 'bg-white/20 border-white/10 text-white'}`}>
              {isSuperAdmin ? 'Super Admin Control' : 'Madrasah Admin Account'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {!isSuperAdmin && (
            <button 
              onClick={() => setView('data-management')}
              className="w-full flex items-center justify-between p-4 bg-white/10 border border-white/20 rounded-2xl hover:bg-white/20 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl text-white group-hover:scale-110 transition-transform">
                  <Database size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-white">{lang === 'bn' ? 'ডাটা ব্যাকআপ ও রিস্টোর' : 'Data Backup & Restore'}</p>
                </div>
              </div>
              <ChevronDown size={18} className="-rotate-90 text-white/30" />
            </button>
          )}

          <button 
            onClick={forceUpdate}
            className="w-full flex items-center justify-between p-4 bg-white/15 border border-white/30 rounded-2xl hover:bg-white/25 transition-all group relative overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-400/20 rounded-xl text-yellow-400 group-hover:scale-110 transition-transform relative">
                <Sparkles size={20} />
                <div className="absolute inset-0 bg-yellow-400/10 blur-md rounded-full animate-pulse"></div>
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-white">{lang === 'bn' ? 'অ্যাপ আপডেট করুন' : 'Update App Version'}</p>
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{lang === 'bn' ? 'ক্যাশ ক্লিয়ার করুন' : 'Clear Cache & Reload'}</p>
              </div>
            </div>
            <RefreshCw size={18} className="text-white/30 active:rotate-180 transition-all" />
          </button>
        </div>

        <div className="space-y-4 pt-2 text-left">
          <div className="space-y-3">
            <div className={`bg-white/5 p-4 rounded-3xl border flex items-center justify-between transition-all ${isSuperAdmin ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-white/5'}`}>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[9px] font-black text-white/30 uppercase mb-1">{t('madrasah_id', lang)} (UUID)</p>
                <p className="text-xs font-mono text-white/70 truncate tracking-tight">{madrasah?.id}</p>
              </div>
              <button onClick={() => copyToClipboard(madrasah?.id || '', 'uuid')} className="p-3 bg-white/10 text-white rounded-2xl active:scale-90 transition-all">
                {copying === 'uuid' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>

            <div className="bg-white/10 p-4 rounded-3xl border border-white/10 focus-within:bg-white/20 transition-all">
              <p className="text-[9px] font-black text-white/30 uppercase mb-1 px-1">{t('madrasah_name', lang)}</p>
              <div className="flex items-center gap-3">
                <BookOpen size={18} className="text-white/30" />
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-transparent border-none outline-none text-white font-black w-full text-base font-noto" />
              </div>
            </div>

            <div className="bg-white/10 p-4 rounded-3xl border border-white/10 focus-within:bg-white/20 transition-all">
              <p className="text-[9px] font-black text-white/30 uppercase mb-1 px-1">{lang === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}</p>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-white/30" />
                <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="017XXXXXXXX" className="bg-transparent border-none outline-none text-white font-black w-full text-base" />
              </div>
            </div>

            <div className="bg-white/10 p-4 rounded-3xl border border-white/10 focus-within:bg-white/20 transition-all">
              <p className="text-[9px] font-black text-white/30 uppercase mb-1 px-1">{lang === 'bn' ? 'লগইন পাসওয়ার্ড' : 'Login Password'}</p>
              <div className="flex items-center gap-3">
                <Lock size={18} className="text-white/30" />
                <input type="text" value={newLoginCode} onChange={(e) => setNewLoginCode(e.target.value)} className="bg-transparent border-none outline-none text-white font-black w-full text-base tracking-widest" />
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleUpdate} disabled={saving} className="w-full py-5 bg-white text-[#d35132] font-black rounded-[2rem] shadow-2xl active:scale-95 transition-all text-sm flex items-center justify-center gap-3 border border-white/50">
          {saving ? <Loader2 className="animate-spin" size={20} /> : showSuccess ? <><Check size={20} /> SAVED</> : <><RefreshCw size={18} /> {t('update_info', lang)}</>}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setLang('bn')} className={`py-4 rounded-[1.8rem] font-black text-sm transition-all border shadow-lg ${lang === 'bn' ? 'bg-white text-[#d35132] border-white' : 'bg-white/10 text-white border-white/20'}`}>বাংলা</button>
        <button onClick={() => setLang('en')} className={`py-4 rounded-[1.8rem] font-black text-sm transition-all border shadow-lg ${lang === 'en' ? 'bg-white text-[#d35132] border-white' : 'bg-white/10 text-white border-white/20'}`}>English</button>
      </div>

      <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-3 py-5 text-white font-black bg-red-600/20 backdrop-blur-md border border-red-500/30 rounded-[2rem] active:scale-95 transition-all shadow-xl mt-4">
        <LogOut size={20} /> {t('logout', lang)}
      </button>
    </div>
  );
};

export default Account;
