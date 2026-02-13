
import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Camera, Loader2, Lock, User as UserIcon, ShieldCheck, Database, Phone, ChevronRight, Hash, RefreshCw, Copy, Check } from 'lucide-react';
import { supabase } from '../supabase';
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
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdate = async () => {
    if (!madrasah) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('madrasahs')
        .update({ 
          name: newName.trim(), 
          phone: newPhone.trim(), 
          login_code: newLoginCode.trim() 
        })
        .eq('id', madrasah.id);
      
      if (error) throw error;
      
      if (onProfileUpdate) onProfileUpdate();
      alert(lang === 'bn' ? 'তথ্য আপডেট হয়েছে!' : 'Profile Updated!');
    } catch (err: any) { 
      alert(lang === 'bn' ? 'আপডেট ব্যর্থ হয়েছে' : 'Update Failed: ' + err.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const copyId = () => {
    if (madrasah?.id) {
      navigator.clipboard.writeText(madrasah.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleForceUpdate = () => {
    if (confirm(lang === 'bn' ? 'আপনি কি অ্যাপটি রিফ্রেশ করতে চান?' : 'Do you want to force update the app?')) {
      // Access the forceUpdate logic indirectly by reloading with a cache buster
      window.location.replace(window.location.origin + window.location.pathname + '?v=' + Date.now());
    }
  };

  if (!madrasah) return (
    <div className="py-24 text-center text-white font-black animate-pulse">
      Loading Account...
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex items-center justify-between px-4">
        <h1 className="text-3xl font-black text-white font-noto drop-shadow-md">
          {t('account', lang)}
        </h1>
        <div className="bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/30 text-[12px] font-black text-white">
          SMS: {madrasah?.sms_balance || 0}
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-xl p-10 rounded-[3.5rem] border border-white/50 shadow-[0_40px_100px_rgba(46,11,94,0.4)] text-center space-y-10">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-32 h-32 bg-[#F2EBFF] rounded-[2.8rem] border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden">
               {uploading ? <Loader2 className="animate-spin text-[#8D30F4]" /> : madrasah.logo_url ? <img src={madrasah.logo_url} className="w-full h-full object-cover" /> : isSuperAdmin ? <ShieldCheck size={55} className="text-[#8D30F4]" /> : <UserIcon size={45} className="text-[#A179FF]" />}
            </div>
            {!isSuperAdmin && (
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-12 h-12 bg-[#8D30F4] text-white rounded-[1.2rem] shadow-2xl border-4 border-white flex items-center justify-center active:scale-90 transition-all">
                <Camera size={22} />
              </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#2E0B5E] font-noto leading-tight">{madrasah.name}</h2>
            <div onClick={copyId} className="mt-3 flex items-center justify-center gap-2 cursor-pointer group">
              <Hash size={12} className="text-[#A179FF]" />
              <p className="text-[10px] font-black text-[#A179FF] uppercase tracking-widest truncate max-w-[200px]">
                ID: {madrasah.id}
              </p>
              {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-[#A179FF] opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
          </div>
        </div>

        <div className="space-y-4 text-left">
           {!isSuperAdmin && (
             <button onClick={() => setView('data-management')} className="w-full bg-[#F2EBFF] p-6 rounded-[2.2rem] border-2 border-[#8D30F4]/5 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#8D30F4] shadow-md border border-[#8D30F4]/10"><Database size={24} /></div>
                  <span className="text-lg font-black text-[#2E0B5E]">Backup & Restore</span>
                </div>
                <ChevronRight size={24} className="text-[#8D30F4]/40 group-hover:translate-x-2 transition-transform" />
             </button>
           )}

           <button onClick={handleForceUpdate} className="w-full bg-[#F2EBFF] p-6 rounded-[2.2rem] border-2 border-[#8D30F4]/5 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#8D30F4] shadow-md border border-[#8D30F4]/10"><RefreshCw size={24} /></div>
                  <span className="text-lg font-black text-[#2E0B5E]">{lang === 'bn' ? 'অ্যাপ আপডেট চেক' : 'Check for Updates'}</span>
                </div>
                <ChevronRight size={24} className="text-[#8D30F4]/40 group-hover:translate-x-2 transition-transform" />
           </button>

           <div className="space-y-4">
              <div className="bg-[#F2EBFF] p-6 rounded-[2rem] border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">{t('madrasah_code', lang)}</label>
                <div className="flex items-center gap-4">
                  <Lock size={22} className="text-[#8D30F4]" />
                  <input type="text" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-lg tracking-[0.2em] w-full" value={newLoginCode} onChange={(e) => setNewLoginCode(e.target.value)} />
                </div>
              </div>
              <div className="bg-[#F2EBFF] p-6 rounded-[2rem] border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">{t('madrasah_phone', lang)}</label>
                <div className="flex items-center gap-4">
                  <Phone size={22} className="text-[#8D30F4]" />
                  <input type="tel" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-lg w-full" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                </div>
              </div>
           </div>
        </div>

        <button onClick={handleUpdate} disabled={saving} className="w-full py-6 premium-btn text-white font-black rounded-[2.2rem] shadow-[0_25px_60px_rgba(141,48,244,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-xl">
           {saving ? <Loader2 className="animate-spin" size={26} /> : t('update_info', lang)}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <button onClick={() => setLang('bn')} className={`py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-widest transition-all ${lang === 'bn' ? 'bg-white text-[#8D30F4] shadow-2xl scale-105' : 'bg-white/20 text-white border border-white/30'}`}>Bengali</button>
         <button onClick={() => setLang('en')} className={`py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-widest transition-all ${lang === 'en' ? 'bg-white text-[#8D30F4] shadow-2xl scale-105' : 'bg-white/20 text-white border border-white/30'}`}>English</button>
      </div>

      <button onClick={() => supabase.auth.signOut()} className="w-full py-6 bg-red-500 text-white font-black rounded-[2.2rem] shadow-xl active:scale-[0.95] transition-all flex items-center justify-center gap-4 text-lg border-2 border-red-400">
        <LogOut size={26} /> {t('logout', lang)}
      </button>
    </div>
  );
};

export default Account;
