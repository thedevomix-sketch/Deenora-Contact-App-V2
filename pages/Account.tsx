
import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Camera, Loader2, User as UserIcon, ShieldCheck, Database, ChevronRight, Check, MessageSquare, Zap, Globe, Smartphone, Save, Users, Layers, Edit3, UserPlus, Languages, Mail, Key, Settings, Fingerprint, Copy, History, Server, CreditCard, Shield, Sliders, Activity, Bell, RefreshCw, X, AlertCircle } from 'lucide-react';
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
  const [localLoading, setLocalLoading] = useState(!initialMadrasah);
  const [saving, setSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
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

  const [copiedId, setCopiedId] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialMadrasah) {
      setMadrasah(initialMadrasah);
      setLocalLoading(false);
      populateForm(initialMadrasah);
    } else {
      attemptLocalFetch();
    }
  }, [initialMadrasah?.id, initialMadrasah?.updated_at]);

  const attemptLocalFetch = async () => {
    try {
      const { data: { session } } = await (supabase.auth as any).getSession();
      if (!session) {
        setLocalLoading(false);
        return;
      }

      const { data } = await supabase
        .from('madrasahs')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (data) {
        setMadrasah(data);
        populateForm(data);
        offlineApi.setCache('profile', data);
      }
    } catch (e) {
      console.error("Local fetch fallback error:", e);
    } finally {
      setLocalLoading(false);
    }
  };

  const populateForm = (data: Madrasah) => {
    setNewName(data.name || '');
    setNewPhone(data.phone || '');
    setNewLoginCode(data.login_code || '');
    setLogoUrl(data.logo_url || '');
    setReveApiKey(data.reve_api_key || '');
    setReveSecretKey(data.reve_secret_key || '');
    setReveCallerId(data.reve_caller_id || '');
    
    fetchStats(data.id);
  };

  const fetchStats = async (mId: string) => {
    if (!mId) return;
    setLoadingStats(true);
    try {
      const [stdRes, clsRes, teaRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('madrasah_id', mId),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('madrasah_id', mId),
        supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('madrasah_id', mId)
      ]);
      setStats({ students: stdRes.count || 0, classes: clsRes.count || 0, teachers: teaRes.count || 0 });
    } catch (e) { console.error(e); } finally { setLoadingStats(false); }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
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
        reve_caller_id: reveCallerId.trim() || null
      }).eq('id', madrasah.id);
      
      if (error) throw error;
      if (onProfileUpdate) onProfileUpdate();
      setIsEditingProfile(false);
      alert(lang === 'bn' ? 'প্রোফাইল আপডেট হয়েছে!' : 'Profile Updated!');
    } catch (err: any) { 
      alert(err.message);
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

  if (localLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6 text-center px-6">
        <Loader2 className="animate-spin text-white" size={36} />
        <h3 className="text-xl font-black text-white font-noto">প্রোফাইল লোড হচ্ছে...</h3>
      </div>
    );
  }

  if (!madrasah) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-8 text-center px-10">
        <AlertCircle size={48} className="text-red-500" />
        <h3 className="text-2xl font-black text-white font-noto">প্রোফাইল পাওয়া যায়নি!</h3>
        <button onClick={onLogout} className="w-full py-5 bg-red-500 text-white font-black rounded-3xl">লগ আউট করুন</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-28">
      {/* Main Profile Card */}
      <div className="bg-white/95 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white shadow-2xl space-y-10 relative overflow-hidden">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-32 h-32 bg-white rounded-[2.8rem] border-[6px] border-slate-50 shadow-xl flex items-center justify-center overflow-hidden">
               {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <UserIcon size={45} className="text-[#8D30F4]" />}
            </div>
            {isEditingProfile && (
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-11 h-11 bg-[#8D30F4] text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white">
                <Camera size={20} />
              </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>

          <div className="text-center space-y-3">
             <h2 className="text-2xl font-black text-[#2E0B5E] font-noto tracking-tight">{madrasah.name}</h2>
             <div onClick={() => copyToClipboard(madrasah.id)} className="bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2 cursor-pointer active:scale-95 transition-all">
                <Fingerprint size={14} className="text-[#8D30F4]" />
                <p className="text-[9px] font-black text-[#8D30F4] uppercase">ID: {madrasah.id.slice(0, 13)}...</p>
                {copiedId ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-slate-300" />}
             </div>
          </div>
        </div>

        {isEditingProfile ? (
          <div className="space-y-5">
             <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Madrasah Name</label>
                <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-black text-slate-800 font-noto" value={newName} onChange={(e) => setNewName(e.target.value)} />
             </div>
             <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Contact Phone</label>
                <input type="tel" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-black text-slate-800" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
             </div>
             
             {/* Admin Gateway Section in Editing mode */}
             {!isSuperAdmin && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-black text-[#8D30F4] uppercase tracking-widest">Gateway Settings</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" className="w-full h-12 bg-slate-50 border rounded-xl px-4 text-xs font-black" value={reveApiKey} onChange={(e) => setReveApiKey(e.target.value)} placeholder="Reve API Key" />
                    <input type="text" className="w-full h-12 bg-slate-50 border rounded-xl px-4 text-xs font-black" value={reveSecretKey} onChange={(e) => setReveSecretKey(e.target.value)} placeholder="Secret Key" />
                  </div>
                  <input type="text" className="w-full h-12 bg-slate-50 border rounded-xl px-4 text-xs font-black" value={reveCallerId} onChange={(e) => setReveCallerId(e.target.value)} placeholder="Sender ID" />
                </div>
             )}

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
             <p className="text-3xl font-black text-emerald-600">{madrasah.sms_balance || 0}</p>
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
