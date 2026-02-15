
import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Camera, Loader2, User as UserIcon, ShieldCheck, Database, ChevronRight, Check, MessageSquare, Zap, Globe, Smartphone, Save, Users, Layers, Edit3, UserPlus, Languages, Mail, Key, Settings, Fingerprint, Copy, History, Server } from 'lucide-react';
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
  onLogout: () => void;
  isTeacher?: boolean;
}

const Account: React.FC<AccountProps> = ({ lang, setLang, onProfileUpdate, setView, isSuperAdmin, initialMadrasah, onLogout, isTeacher }) => {
  const [madrasah, setMadrasah] = useState<Madrasah | null>(initialMadrasah);
  const [saving, setSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [stats, setStats] = useState({ students: 0, classes: 0, teachers: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const [newName, setNewName] = useState(initialMadrasah?.name || '');
  const [newPhone, setNewPhone] = useState(initialMadrasah?.phone || '');
  const [newLoginCode, setNewLoginCode] = useState(initialMadrasah?.login_code || '');
  const [logoUrl, setLogoUrl] = useState(initialMadrasah?.logo_url || '');
  
  // Gateway Settings
  const [reveApiKey, setReveApiKey] = useState(initialMadrasah?.reve_api_key || '');
  const [reveSecretKey, setReveSecretKey] = useState(initialMadrasah?.reve_secret_key || '');
  const [reveCallerId, setReveCallerId] = useState(initialMadrasah?.reve_caller_id || '');
  const [reveClientId, setReveClientId] = useState(initialMadrasah?.reve_client_id || '');
  
  const [copiedId, setCopiedId] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialMadrasah?.id) {
      fetchStats();
    }
  }, [initialMadrasah?.id]);

  const fetchStats = async () => {
    if (!initialMadrasah) return;
    setLoadingStats(true);
    try {
      const [stdRes, clsRes, teaRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('madrasah_id', initialMadrasah.id),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('madrasah_id', initialMadrasah.id),
        supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('madrasah_id', initialMadrasah.id)
      ]);

      setStats({ 
        students: stdRes.count || 0, 
        classes: clsRes.count || 0,
        teachers: teaRes.count || 0
      });
    } catch (e) { 
      console.error("Account stats fetch error:", e); 
    } finally { 
      setLoadingStats(false); 
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleUpdate = async () => {
    if (!madrasah || isTeacher) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('madrasahs').update({ 
        name: newName.trim(), 
        phone: newPhone.trim(), 
        login_code: newLoginCode.trim(), 
        logo_url: logoUrl,
        reve_api_key: reveApiKey.trim() || null,
        reve_secret_key: reveSecretKey.trim() || null,
        reve_caller_id: reveCallerId.trim() || null,
        reve_client_id: reveClientId.trim() || null
      }).eq('id', madrasah.id);
      
      if (error) throw error;
      if (onProfileUpdate) onProfileUpdate();
      setIsEditingProfile(false);
      
      setMadrasah(prev => prev ? { 
        ...prev, 
        name: newName.trim(), 
        phone: newPhone.trim(), 
        login_code: newLoginCode.trim(),
        reve_api_key: reveApiKey.trim(),
        reve_secret_key: reveSecretKey.trim(),
        reve_caller_id: reveCallerId.trim(),
        reve_client_id: reveClientId.trim()
      } : null);

      alert(lang === 'bn' ? 'সব তথ্য আপডেট হয়েছে!' : 'Profile Updated!');
    } catch (err: any) { 
      alert(lang === 'bn' ? `এরর: ${err.message}` : `Error: ${err.message}`);
    } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !madrasah || isTeacher) return;
    setSaving(true);
    try {
      const fileName = `logo_${madrasah.id}_${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from('madrasah-assets').upload(`logos/${fileName}`, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('madrasah-assets').getPublicUrl(`logos/${fileName}`);
      setLogoUrl(publicUrl);
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  if (!madrasah) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Stats Summary Area - Cleaner 2x2 Grid */}
      {!isSuperAdmin && (
        <div className="grid grid-cols-2 gap-3 px-1">
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-[2rem] border border-white shadow-xl flex flex-col items-center text-center">
            <div className="w-11 h-11 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
               <Users size={22} />
            </div>
            <p className="text-xl font-black text-[#2E0B5E] leading-none">{loadingStats ? '...' : stats.students}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{t('students', lang)}</p>
          </div>
          
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-[2rem] border border-white shadow-xl flex flex-col items-center text-center">
            <div className="w-11 h-11 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
               <Layers size={22} />
            </div>
            <p className="text-xl font-black text-[#2E0B5E] leading-none">{loadingStats ? '...' : stats.classes}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{t('classes', lang)}</p>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-4 rounded-[2rem] border border-white shadow-xl flex flex-col items-center text-center">
            <div className="w-11 h-11 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
               <UserPlus size={22} />
            </div>
            <p className="text-xl font-black text-[#2E0B5E] leading-none">{loadingStats ? '...' : stats.teachers}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{t('teachers', lang)}</p>
          </div>

          <div className="bg-white/95 backdrop-blur-md p-4 rounded-[2rem] border border-white shadow-xl flex flex-col items-center text-center">
            <div className="w-11 h-11 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
               <Zap size={22} />
            </div>
            <p className="text-xl font-black text-[#2E0B5E] leading-none">{loadingStats ? '...' : (madrasah.sms_balance || 0)}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{lang === 'bn' ? 'ব্যালেন্স' : 'Balance'}</p>
          </div>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[3rem] border border-white/50 shadow-2xl space-y-8 relative overflow-hidden">
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative group">
            <div className="w-28 h-28 bg-white rounded-[2.5rem] border-4 border-slate-50 shadow-2xl flex items-center justify-center overflow-hidden">
               {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" /> : isSuperAdmin ? <ShieldCheck size={45} className="text-[#8D30F4]" /> : <UserIcon size={40} className="text-[#A179FF]" />}
            </div>
            {isEditingProfile && !isTeacher && (
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#8D30F4] text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
                <Camera size={18} />
              </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>

          <div className="text-center w-full px-2">
            <h2 className="text-2xl font-black text-[#2E0B5E] font-noto leading-tight">{madrasah.name}</h2>
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <div 
                onClick={() => copyToClipboard(madrasah.id)}
                className="bg-[#F2EBFF] px-5 py-2.5 rounded-2xl border border-[#8D30F4]/10 inline-flex items-center gap-2.5 active:scale-95 transition-all cursor-pointer group"
              >
                <Fingerprint size={16} className="text-[#8D30F4]" />
                <div className="flex flex-col items-start">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('madrasah_uuid', lang)}</p>
                  <p className="text-[11px] font-black text-[#8D30F4] tracking-tight truncate max-w-[150px]">
                    {madrasah.id}
                  </p>
                </div>
                {copiedId ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-[#8D30F4]/40 group-hover:text-[#8D30F4]" />}
              </div>
            </div>
            {isTeacher && <p className="text-[10px] font-black text-[#8D30F4] uppercase tracking-widest mt-4">{t('teacher_portal', lang)}</p>}
          </div>
        </div>

        {/* Action List / Form */}
        <div className="space-y-4 pt-2">
          {isEditingProfile && !isTeacher ? (
            <div className="space-y-4 animate-in slide-in-from-top-4">
              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{t('madrasah_name', lang)}</label>
                <input type="text" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-base w-full font-noto" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{t('madrasah_phone', lang)}</label>
                <input type="tel" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-base w-full" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{t('madrasah_code_label', lang)}</label>
                <input type="text" className="bg-transparent border-none outline-none font-black text-[#8D30F4] text-base w-full" value={newLoginCode} onChange={(e) => setNewLoginCode(e.target.value)} />
              </div>

              {/* SMS Gateway Section */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                 <h4 className="text-[11px] font-black text-[#8D30F4] uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                    <Server size={14}/> SMS Gateway (REVE)
                 </h4>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">API Key</label>
                       <input type="text" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-xs w-full" value={reveApiKey} onChange={(e) => setReveApiKey(e.target.value)} placeholder="Reve API Key" />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Secret Key</label>
                       <input type="text" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-xs w-full" value={reveSecretKey} onChange={(e) => setReveSecretKey(e.target.value)} placeholder="Secret Key" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Sender ID</label>
                       <input type="text" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-xs w-full" value={reveCallerId} onChange={(e) => setReveCallerId(e.target.value)} placeholder="Masking Name" />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Client ID</label>
                       <input type="text" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-xs w-full" value={reveClientId} onChange={(e) => setReveClientId(e.target.value)} placeholder="Client ID" />
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-sm">{t('cancel', lang)}</button>
                <button onClick={handleUpdate} disabled={saving} className="flex-[2] py-4 bg-[#8D30F4] text-white font-black rounded-2xl text-sm shadow-xl">
                  {saving ? <Loader2 className="animate-spin mx-auto" size={18} /> : t('save_changes', lang)}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {!isSuperAdmin && !isTeacher && (
                <>
                  <button onClick={() => setView('teachers')} className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-inner"><UserPlus size={20} /></div>
                      <span className="text-md font-black text-[#2E0B5E] font-noto">{t('manage_teachers', lang)}</span>
                    </div>
                    <ChevronRight size={20} className="text-slate-300" />
                  </button>
                  <button onClick={() => setView('data-management')} className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#8D30F4] shadow-inner"><Database size={20} /></div>
                      <span className="text-md font-black text-[#2E0B5E] font-noto">{t('backup_restore', lang)}</span>
                    </div>
                    <ChevronRight size={20} className="text-slate-300" />
                  </button>
                  <button onClick={() => setIsEditingProfile(true)} className="w-full h-16 bg-[#F2EBFF] text-[#8D30F4] font-black rounded-3xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all border border-[#8D30F4]/10 mb-6 font-noto">
                    <Edit3 size={20} /> {t('edit_account_info', lang)}
                  </button>
                </>
              )}

              {/* Language Selection Row (Bottom of Card) */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Languages size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('language', lang)}</span>
                  </div>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button 
                      onClick={() => setLang('bn')} 
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${lang === 'bn' ? 'bg-white text-[#8D30F4] shadow-sm' : 'text-slate-400'}`}
                    >
                      বাংলা
                    </button>
                    <button 
                      onClick={() => setLang('en')} 
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${lang === 'en' ? 'bg-white text-[#8D30F4] shadow-sm' : 'text-slate-400'}`}
                    >
                      EN
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button onClick={onLogout} className="w-full py-6 bg-red-500 text-white font-black rounded-[2.5rem] shadow-xl active:scale-[0.95] transition-all flex items-center justify-center gap-4 text-lg border-2 border-red-400 font-noto">
        <LogOut size={26} /> {t('logout', lang)}
      </button>
    </div>
  );
};

export default Account;
