
import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Camera, Loader2, Lock, User as UserIcon, ShieldCheck, Database, Phone, ChevronRight, Hash, Copy, Check, MessageSquare, Zap, Globe, Smartphone, Server, Star } from 'lucide-react';
import { supabase, smsApi } from '../supabase';
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
  
  // Form States
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
      alert(lang === 'bn' ? 'সব তথ্য আপডেট হয়েছে!' : 'Profile Updated!');
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

  if (!madrasah) return null;

  const isMaskingActive = !!(madrasah.reve_api_key?.trim() && madrasah.reve_caller_id?.trim());

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex items-center justify-between px-4">
        <h1 className="text-3xl font-black text-white font-noto drop-shadow-md">{t('account', lang)}</h1>
        <div className="bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/30 text-[12px] font-black text-white shadow-xl flex items-center gap-2">
          <Zap size={14} className="text-yellow-300 animate-pulse" />
          SMS: {madrasah?.sms_balance || 0}
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-xl p-10 rounded-[3.5rem] border border-white/50 shadow-2xl space-y-10 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#8D30F4]/5 rounded-bl-[5rem] -mr-8 -mt-8 blur-2xl"></div>

        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="w-32 h-32 bg-white rounded-[2.8rem] border-4 border-slate-50 shadow-2xl flex items-center justify-center overflow-hidden">
             {madrasah.logo_url ? <img src={madrasah.logo_url} className="w-full h-full object-cover" /> : isSuperAdmin ? <ShieldCheck size={55} className="text-[#8D30F4]" /> : <UserIcon size={45} className="text-[#A179FF]" />}
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-[#2E0B5E] font-noto leading-tight">{newName || madrasah.name}</h2>
            
            {/* Gateway Status Badge */}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 shadow-sm transition-all ${isMaskingActive ? 'bg-green-50 border-green-100 text-green-600' : 'bg-[#F2EBFF] border-[#8D30F4]/10 text-[#8D30F4]'}`}>
                {isMaskingActive ? <Star size={12} fill="currentColor" /> : <Server size={12} />}
                <span className="text-[9px] font-black uppercase tracking-wider">
                  {isMaskingActive ? 'Masking Active (Private)' : 'System Gateway (Non-Masking)'}
                </span>
              </div>
            </div>

            <div onClick={copyId} className="mt-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2 cursor-pointer active:scale-95 transition-all mx-auto w-fit">
              <Hash size={14} className="text-slate-400" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[150px]">ID: {madrasah.id}</p>
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-slate-300" />}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">
              <UserIcon size={14} className="text-[#8D30F4]" /> মাদরাসার নাম
            </label>
            <input type="text" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-base w-full font-noto" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">
              <Smartphone size={14} className="text-[#8D30F4]" /> মাদরাসার মোবাইল নম্বর
            </label>
            <input type="tel" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-base w-full" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="017XXXXXXXX" />
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">
              <Lock size={14} className="text-[#8D30F4]" /> লগইন কোড/পাসওয়ার্ড
            </label>
            <input type="password" title="Login Code" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-base w-full" value={newLoginCode} onChange={(e) => setNewLoginCode(e.target.value)} />
          </div>
        </div>

        <div className="pt-4 space-y-4">
           <button onClick={() => setView('data-management')} className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#8D30F4] shadow-inner"><Database size={20} /></div>
                <span className="text-md font-black text-[#2E0B5E]">Backup & Restore</span>
              </div>
              <ChevronRight size={20} className="text-slate-300" />
           </button>
           
           <button onClick={handleUpdate} disabled={saving} className="w-full py-6 premium-btn text-white font-black rounded-[2.2rem] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-xl">
             {saving ? <Loader2 className="animate-spin" size={26} /> : t('update_info', lang)}
           </button>
        </div>
      </div>

      <button onClick={() => supabase.auth.signOut()} className="w-full py-6 bg-red-500 text-white font-black rounded-[2.2rem] shadow-xl active:scale-[0.95] transition-all flex items-center justify-center gap-4 text-lg border-2 border-red-400">
        <LogOut size={26} /> {t('logout', lang)}
      </button>
    </div>
  );
};

export default Account;
