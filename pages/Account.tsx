
import React, { useState, useRef, useEffect } from 'react';
// Added X to imports from lucide-react
import { LogOut, Camera, Loader2, User as UserIcon, ShieldCheck, Database, ChevronRight, Check, MessageSquare, Zap, Globe, Smartphone, Save, Users, Layers, Edit3, UserPlus, Languages, Mail, Key, Settings, Fingerprint, Copy, History, Server, CreditCard, Shield, Sliders, Activity, Bell, RefreshCw, X } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingGlobal, setIsEditingGlobal] = useState(false);
  
  const [stats, setStats] = useState({ students: 0, classes: 0, teachers: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Form states
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newLoginCode, setNewLoginCode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  // Gateway settings
  const [reveApiKey, setReveApiKey] = useState('');
  const [reveSecretKey, setReveSecretKey] = useState('');
  const [reveCallerId, setReveCallerId] = useState('');

  // Global settings for Super Admin
  const [globalSettings, setGlobalSettings] = useState({
    reve_api_key: '',
    reve_secret_key: '',
    reve_caller_id: '',
    bkash_number: ''
  });
  
  const [copiedId, setCopiedId] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when data arrives
  useEffect(() => {
    if (initialMadrasah) {
      setNewName(initialMadrasah.name || '');
      setNewPhone(initialMadrasah.phone || '');
      setNewLoginCode(initialMadrasah.login_code || '');
      setLogoUrl(initialMadrasah.logo_url || '');
      setReveApiKey(initialMadrasah.reve_api_key || '');
      setReveSecretKey(initialMadrasah.reve_secret_key || '');
      setReveCallerId(initialMadrasah.reve_caller_id || '');
      
      fetchStats();
      if (isSuperAdmin) fetchGlobalSettings();
    }
  }, [initialMadrasah?.id, initialMadrasah?.updated_at]); // Trigger on ID or updated_at change

  const fetchStats = async () => {
    if (!initialMadrasah?.id) return;
    setLoadingStats(true);
    try {
      const [stdRes, clsRes, teaRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('madrasah_id', initialMadrasah.id),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('madrasah_id', initialMadrasah.id),
        supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('madrasah_id', initialMadrasah.id)
      ]);
      setStats({ students: stdRes.count || 0, classes: clsRes.count || 0, teachers: teaRes.count || 0 });
    } catch (e) { console.error(e); } finally { setLoadingStats(false); }
  };

  const fetchGlobalSettings = async () => {
    try {
      const settings = await smsApi.getGlobalSettings();
      setGlobalSettings({
        reve_api_key: settings.reve_api_key || '',
        reve_secret_key: settings.reve_secret_key || '',
        reve_caller_id: settings.reve_caller_id || '',
        bkash_number: settings.bkash_number || ''
      });
    } catch (e) { console.error(e); }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleUpdate = async () => {
    if (!initialMadrasah || isTeacher) return;
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
      }).eq('id', initialMadrasah.id);
      
      if (error) throw error;
      if (onProfileUpdate) onProfileUpdate();
      setIsEditingProfile(false);
      alert(lang === 'bn' ? 'প্রোফাইল আপডেট হয়েছে!' : 'Profile Updated!');
    } catch (err: any) { 
      alert(err.message);
    } finally { setSaving(false); }
  };

  const handleSaveGlobalSettings = async () => {
    if (!isSuperAdmin) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('system_settings').update({
        reve_api_key: globalSettings.reve_api_key.trim(),
        reve_secret_key: globalSettings.reve_secret_key.trim(),
        reve_caller_id: globalSettings.reve_caller_id.trim(),
        bkash_number: globalSettings.bkash_number.trim()
      }).eq('id', '00000000-0000-0000-0000-000000000001');
      if (error) throw error;
      alert('Global Settings Updated!');
      setIsEditingGlobal(false);
    } catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initialMadrasah || isTeacher) return;
    setSaving(true);
    try {
      const fileName = `logo_${initialMadrasah.id}_${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from('madrasah-assets').upload(`logos/${fileName}`, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('madrasah-assets').getPublicUrl(`logos/${fileName}`);
      setLogoUrl(publicUrl);
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  // Resilient Loading View
  if (!initialMadrasah) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6 text-center px-6">
        <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center animate-pulse border border-white/20">
          <Loader2 className="animate-spin text-white" size={32} />
        </div>
        <div className="space-y-2">
           <h3 className="text-xl font-black text-white font-noto">প্রোফাইল লোড হচ্ছে...</h3>
           <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Fetching Account Data</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs pt-4">
           <button onClick={() => window.location.reload()} className="w-full py-4 bg-white/20 text-white font-black rounded-2xl flex items-center justify-center gap-2 border border-white/20">
              <RefreshCw size={18} /> রিলোড করুন
           </button>
           <button onClick={onLogout} className="w-full py-4 bg-red-500 text-white font-black rounded-2xl flex items-center justify-center gap-2">
              <LogOut size={18} /> লগ আউট
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-28">
      {/* Super Admin Global Config */}
      {isSuperAdmin && (
        <div className="bg-white/95 backdrop-blur-3xl p-8 rounded-[3.5rem] border border-white shadow-xl space-y-8 overflow-hidden group">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Settings size={22} />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-[#2E0B5E] font-noto">System Gateway</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global SMS & Payment</p>
                 </div>
              </div>
              <button onClick={() => setIsEditingGlobal(!isEditingGlobal)} className="w-10 h-10 bg-slate-50 text-indigo-600 rounded-xl flex items-center justify-center border border-slate-100 active:scale-90 transition-all">
                {isEditingGlobal ? <X size={20} /> : <Edit3 size={18} />}
              </button>
           </div>

           {isEditingGlobal ? (
             <div className="space-y-5 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-1">Global API Key</label>
                      <input type="text" className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-black" value={globalSettings.reve_api_key} onChange={(e) => setGlobalSettings({...globalSettings, reve_api_key: e.target.value})} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase px-1">Global Secret Key</label>
                      <input type="text" className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-black" value={globalSettings.reve_secret_key} onChange={(e) => setGlobalSettings({...globalSettings, reve_secret_key: e.target.value})} />
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase px-1">bKash Number</label>
                   <input type="text" className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 font-black text-sm" value={globalSettings.bkash_number} onChange={(e) => setGlobalSettings({...globalSettings, bkash_number: e.target.value})} />
                </div>
                <button onClick={handleSaveGlobalSettings} disabled={saving} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2">
                   {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={18} />} Save Global Config
                </button>
             </div>
           ) : (
             <div className="bg-indigo-50/50 p-5 rounded-[2rem] border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <Smartphone className="text-indigo-600" size={20} />
                   <div>
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Payment Support</p>
                      <p className="text-sm font-black text-indigo-900">{globalSettings.bkash_number || 'Not Set'}</p>
                   </div>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-200"></div>
             </div>
           )}
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white/95 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white shadow-2xl space-y-10 relative overflow-hidden">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-32 h-32 bg-white rounded-[2.8rem] border-[6px] border-slate-50 shadow-xl flex items-center justify-center overflow-hidden">
               {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <UserIcon size={45} className="text-[#8D30F4]" />}
            </div>
            {isEditingProfile && (
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-11 h-11 bg-[#8D30F4] text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white active:scale-90 transition-all">
                <Camera size={20} />
              </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>

          <div className="text-center space-y-3">
             <h2 className="text-2xl font-black text-[#2E0B5E] font-noto tracking-tight">{initialMadrasah.name}</h2>
             <div onClick={() => copyToClipboard(initialMadrasah.id)} className="bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2 cursor-pointer active:scale-95 transition-all">
                <Fingerprint size={14} className="text-[#8D30F4]" />
                <p className="text-[9px] font-black text-[#8D30F4] uppercase tracking-widest">ID: {initialMadrasah.id.slice(0, 13)}...</p>
                {copiedId ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-slate-300" />}
             </div>
          </div>
        </div>

        {isEditingProfile ? (
          <div className="space-y-5 animate-in slide-in-from-top-4">
             <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Madrasah Name</label>
                <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-black text-slate-800 font-noto" value={newName} onChange={(e) => setNewName(e.target.value)} />
             </div>
             <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Contact Phone</label>
                <input type="tel" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-black text-slate-800" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
             </div>
             <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Login PIN</label>
                <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-black text-[#8D30F4] tracking-widest" value={newLoginCode} onChange={(e) => setNewLoginCode(e.target.value)} />
             </div>

             <div className="flex gap-3 pt-4">
                <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-3xl">Cancel</button>
                <button onClick={handleUpdate} disabled={saving} className="flex-[2] py-5 bg-[#8D30F4] text-white font-black rounded-3xl flex items-center justify-center gap-2 shadow-lg">
                   {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Update
                </button>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!isTeacher && (
              <div className="grid grid-cols-1 gap-3">
                 <button onClick={() => setView('teachers')} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm"><UserPlus size={22} /></div>
                       <span className="font-black text-[#2E0B5E] font-noto">Manage Teachers</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                 </button>
                 <button onClick={() => setView('data-management')} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-purple-600 shadow-sm"><Database size={22} /></div>
                       <span className="font-black text-[#2E0B5E] font-noto">Data Operations</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                 </button>
                 <button onClick={() => setIsEditingProfile(true)} className="w-full h-16 bg-[#F2EBFF] text-[#8D30F4] font-black rounded-[2rem] flex items-center justify-center gap-3 active:scale-95 transition-all mt-2">
                    <Edit3 size={20} /> Account Settings
                 </button>
              </div>
            )}

            <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Languages size={18} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('language', lang)}</span>
               </div>
               <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button onClick={() => setLang('bn')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${lang === 'bn' ? 'bg-white text-[#8D30F4] shadow-sm' : 'text-slate-400'}`}>বাংলা</button>
                  <button onClick={() => setLang('en')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${lang === 'en' ? 'bg-white text-[#8D30F4] shadow-sm' : 'text-slate-400'}`}>ENG</button>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Section */}
      {!isEditingProfile && (
        <div className="grid grid-cols-2 gap-4 px-2">
          <div className="bg-white/95 p-6 rounded-[2.5rem] shadow-xl flex flex-col items-center text-center">
             <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-3"><Users size={22} /></div>
             <p className="text-3xl font-black text-[#2E0B5E]">{loadingStats ? '...' : stats.students}</p>
             <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Students</p>
          </div>
          <div className="bg-white/95 p-6 rounded-[2.5rem] shadow-xl flex flex-col items-center text-center">
             <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-3"><Zap size={22} /></div>
             <p className="text-3xl font-black text-emerald-600">{initialMadrasah.sms_balance || 0}</p>
             <p className="text-[9px] font-black text-slate-400 uppercase mt-1">SMS Balance</p>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="px-2 pt-4">
        <button onClick={onLogout} className="w-full py-6 bg-red-500 text-white font-black rounded-[2.5rem] shadow-lg flex items-center justify-center gap-4 text-lg active:scale-95 transition-all">
          <LogOut size={24} /> {t('logout', lang)}
        </button>
      </div>
    </div>
  );
};

export default Account;
