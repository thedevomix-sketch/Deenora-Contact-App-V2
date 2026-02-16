
import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Camera, Loader2, User as UserIcon, ShieldCheck, Database, ChevronRight, Check, MessageSquare, Zap, Globe, Save, Users, Layers, Edit3, UserPlus, Languages, Mail, Key, Settings, Fingerprint, Copy, History, Server, CreditCard, Shield, Sliders, Activity, Bell, Smartphone, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase, smsApi, offlineApi } from '../supabase';
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
  const [isInternalLoading, setIsInternalLoading] = useState(!initialMadrasah);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [stats, setStats] = useState({ students: 0, classes: 0, teachers: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Form States
  const [newName, setNewName] = useState(initialMadrasah?.name || '');
  const [newPhone, setNewPhone] = useState(initialMadrasah?.phone || '');
  const [newLoginCode, setNewLoginCode] = useState(initialMadrasah?.login_code || '');
  const [logoUrl, setLogoUrl] = useState(initialMadrasah?.logo_url || '');
  
  const [reveApiKey, setReveApiKey] = useState(initialMadrasah?.reve_api_key || '');
  const [reveSecretKey, setReveSecretKey] = useState(initialMadrasah?.reve_secret_key || '');
  const [reveCallerId, setReveCallerId] = useState(initialMadrasah?.reve_caller_id || '');

  const fetchProfileDirectly = async () => {
    setIsInternalLoading(true);
    setLoadError(false);
    try {
      const { data: { session } } = await (supabase.auth as any).getSession();
      if (session) {
        const { data, error } = await supabase
          .from('madrasahs')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (data) {
          setMadrasah(data);
          syncFormStates(data);
          fetchStats(data.id);
        } else {
          setLoadError(true);
        }
      } else if (localStorage.getItem('teacher_session')) {
        const teacherData = JSON.parse(localStorage.getItem('teacher_session') || '{}');
        if (teacherData.madrasah_id) {
            const profile = { id: teacherData.madrasah_id, name: teacherData.madrasahs?.name || 'Portal User', is_active: true } as Madrasah;
            setMadrasah(profile);
            syncFormStates(profile);
        }
      } else {
        setLoadError(true);
      }
    } catch (e) {
      setLoadError(true);
    } finally {
      setIsInternalLoading(false);
    }
  };

  const syncFormStates = (data: Madrasah) => {
    setNewName(data.name || '');
    setNewPhone(data.phone || '');
    setNewLoginCode(data.login_code || '');
    setLogoUrl(data.logo_url || '');
    setReveApiKey(data.reve_api_key || '');
    setReveSecretKey(data.reve_secret_key || '');
    setReveCallerId(data.reve_caller_id || '');
  };

  useEffect(() => {
    if (initialMadrasah) {
      setMadrasah(initialMadrasah);
      syncFormStates(initialMadrasah);
      fetchStats(initialMadrasah.id);
      setIsInternalLoading(false);
    } else {
      fetchProfileDirectly();
    }
  }, [initialMadrasah]);

  const fetchStats = async (id: string) => {
    if (!id) return;
    setLoadingStats(true);
    try {
      const [stdRes, clsRes, teaRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('madrasah_id', id),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('madrasah_id', id),
        supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('madrasah_id', id)
      ]);
      setStats({ students: stdRes.count || 0, classes: clsRes.count || 0, teachers: teaRes.count || 0 });
    } finally { setLoadingStats(false); }
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
        reve_caller_id: reveCallerId.trim() || null
      }).eq('id', madrasah.id);
      
      if (error) throw error;
      if (onProfileUpdate) onProfileUpdate();
      setIsEditingProfile(false);
      alert(lang === 'bn' ? 'সব তথ্য আপডেট হয়েছে!' : 'Profile Updated!');
    } catch (err: any) { 
      alert(err.message);
    } finally { setSaving(false); }
  };

  if (isInternalLoading || (!madrasah && !loadError)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center mb-8 relative overflow-hidden">
           <Loader2 className="animate-spin text-white absolute inset-0 m-auto opacity-40" size={48} />
           <UserIcon size={32} className="text-white relative z-10" />
        </div>
        <h2 className="text-xl font-black text-white font-noto tracking-tight mb-2">প্রোফাইল লোড হচ্ছে...</h2>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">Fetching Account Profile</p>
      </div>
    );
  }

  if (loadError && !madrasah) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-white font-black text-lg mb-6">প্রোফাইল পাওয়া যায়নি</h2>
        <button onClick={onLogout} className="w-full max-w-xs py-5 bg-red-500 text-white font-black rounded-full shadow-xl">
           লগ আউট করুন
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-28">
      {/* Profile Card */}
      <div className="bg-white/95 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white/50 shadow-[0_25px_60px_-15px_rgba(46,11,94,0.1)] space-y-10 relative overflow-hidden">
        <div className="flex flex-col items-center gap-8 relative z-10">
          <div className="w-32 h-32 bg-white rounded-[2.8rem] border-[6px] border-slate-50 shadow-2xl flex items-center justify-center overflow-hidden">
             {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <UserIcon size={45} className="text-[#8D30F4]" />}
          </div>
          <div className="text-center w-full">
             <h2 className="text-3xl font-black text-[#2E0B5E] font-noto tracking-tight">{madrasah?.name}</h2>
             {isTeacher && <div className="mt-2 inline-flex px-4 py-1 bg-[#8D30F4] rounded-full text-[9px] font-black text-white uppercase tracking-[0.3em]">Teacher Mode</div>}
          </div>
        </div>

        <div className="space-y-6">
          {isEditingProfile ? (
            <div className="space-y-5">
              <input type="text" className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-800" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
              <input type="tel" className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-800" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Phone" />
              <div className="flex gap-4">
                <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black">Cancel</button>
                <button onClick={handleUpdate} className="flex-1 py-4 bg-[#8D30F4] text-white rounded-2xl font-black">{saving ? <Loader2 className="animate-spin mx-auto" size={20}/> : 'Save'}</button>
              </div>
            </div>
          ) : (
            <>
              {!isTeacher && (
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => setView('teachers')} className="p-6 bg-slate-50/80 rounded-3xl border border-slate-100 flex items-center justify-between">
                    <span className="font-black text-[#2E0B5E]">Manage Teachers</span>
                    <ChevronRight size={20} className="text-slate-300" />
                  </button>
                  <button onClick={() => setView('data-management')} className="p-6 bg-slate-50/80 rounded-3xl border border-slate-100 flex items-center justify-between">
                    <span className="font-black text-[#2E0B5E]">Data Backup</span>
                    <ChevronRight size={20} className="text-slate-300" />
                  </button>
                  <button onClick={() => setIsEditingProfile(true)} className="w-full h-16 bg-[#F2EBFF] text-[#8D30F4] font-black rounded-3xl flex items-center justify-center gap-2 border-2 border-[#8D30F4]/10">
                    <Edit3 size={20} /> {t('edit_account_info', lang)}
                  </button>
                </div>
              )}
            </>
          )}

          <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">{t('language', lang)}</span>
            <div className="flex p-1 bg-slate-100 rounded-2xl">
              <button onClick={() => setLang('bn')} className={`px-5 py-2 rounded-xl text-[11px] font-black ${lang === 'bn' ? 'bg-white text-[#8D30F4]' : 'text-slate-400'}`}>বাংলা</button>
              <button onClick={() => setLang('en')} className={`px-5 py-2 rounded-xl text-[11px] font-black ${lang === 'en' ? 'bg-white text-[#8D30F4]' : 'text-slate-400'}`}>ENG</button>
            </div>
          </div>
        </div>
      </div>

      {!isSuperAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/95 p-6 rounded-[2.5rem] flex flex-col items-center">
             <Users size={24} className="text-blue-500 mb-2" />
             <p className="text-2xl font-black">{stats.students}</p>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('students', lang)}</p>
          </div>
          <div className="bg-white/95 p-6 rounded-[2.5rem] flex flex-col items-center">
             <Zap size={24} className="text-emerald-500 mb-2" />
             <p className="text-2xl font-black text-emerald-600">{madrasah?.sms_balance || 0}</p>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance</p>
          </div>
        </div>
      )}

      <button onClick={onLogout} className="w-full py-6 bg-red-500 text-white font-black rounded-[2.8rem] shadow-xl flex items-center justify-center gap-4 text-lg">
        <LogOut size={26} /> {t('logout', lang)}
      </button>
    </div>
  );
};

export default Account;
