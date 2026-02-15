
import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Camera, Loader2, Lock, User as UserIcon, ShieldCheck, Database, Phone, ChevronRight, Hash, Copy, Check, MessageSquare, Zap, Globe, Smartphone, Server, Star, Save, Users, Layers, Edit3, X, UserPlus } from 'lucide-react';
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
  
  const [stats, setStats] = useState({ students: 0, classes: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const [newName, setNewName] = useState(initialMadrasah?.name || '');
  const [newPhone, setNewPhone] = useState(initialMadrasah?.phone || '');
  const [newLoginCode, setNewLoginCode] = useState(initialMadrasah?.login_code || '');
  const [logoUrl, setLogoUrl] = useState(initialMadrasah?.logo_url || '');
  
  const [reveApiKey, setReveApiKey] = useState('');
  const [reveSecretKey, setReveSecretKey] = useState('');
  const [reveCallerId, setReveCallerId] = useState('');
  const [reveClientId, setReveClientId] = useState('');
  const [bkashNumber, setBkashNumber] = useState('');
  const [savingGlobal, setSavingGlobal] = useState(false);

  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats();
    if (isSuperAdmin) fetchGlobalSettings();
  }, [isSuperAdmin, initialMadrasah?.id]);

  const fetchStats = async () => {
    if (!initialMadrasah) return;
    try {
      const [stdRes, clsRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('madrasah_id', initialMadrasah.id),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('madrasah_id', initialMadrasah.id)
      ]);
      setStats({ students: stdRes.count || 0, classes: clsRes.count || 0 });
    } catch (e) { console.error(e); } finally { setLoadingStats(false); }
  };

  const fetchGlobalSettings = async () => {
    const settings = await smsApi.getGlobalSettings();
    if (settings) {
      setReveApiKey(settings.reve_api_key || '');
      setReveSecretKey(settings.reve_secret_key || '');
      setReveCallerId(settings.reve_caller_id || '');
      setReveClientId(settings.reve_client_id || '');
      setBkashNumber(settings.bkash_number || '');
    }
  };

  const handleUpdate = async () => {
    if (!madrasah || isTeacher) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('madrasahs').update({ name: newName.trim(), phone: newPhone.trim(), login_code: newLoginCode.trim(), logo_url: logoUrl }).eq('id', madrasah.id);
      if (error) throw error;
      if (onProfileUpdate) onProfileUpdate();
      setIsEditingProfile(false);
      alert(lang === 'bn' ? 'সব তথ্য আপডেট হয়েছে!' : 'Profile Updated!');
    } catch (err: any) { alert(err.message); } finally { setSaving(false); }
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
      {/* Premium Stats Grid */}
      {!isSuperAdmin && (
        <div className="grid grid-cols-3 gap-3 px-1">
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-white shadow-xl flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
               <Users size={20} />
            </div>
            <p className="text-lg font-black text-[#2E0B5E] leading-none">{loadingStats ? '...' : stats.students}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Students</p>
          </div>
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-white shadow-xl flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
               <Layers size={20} />
            </div>
            <p className="text-lg font-black text-[#2E0B5E] leading-none">{loadingStats ? '...' : stats.classes}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Classes</p>
          </div>
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-white shadow-xl flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
               <Zap size={20} />
            </div>
            <p className="text-lg font-black text-[#2E0B5E] leading-none">{madrasah.sms_balance || 0}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">SMS</p>
          </div>
        </div>
      )}

      <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[3rem] border border-white/50 shadow-2xl space-y-8 relative overflow-hidden">
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative group">
            <div className="w-28 h-28 bg-white rounded-[2.5rem] border-4 border-slate-50 shadow-2xl flex items-center justify-center overflow-hidden">
               {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : isSuperAdmin ? <ShieldCheck size={45} className="text-[#8D30F4]" /> : <UserIcon size={40} className="text-[#A179FF]" />}
            </div>
            {isEditingProfile && !isTeacher && (
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#8D30F4] text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
                <Camera size={18} />
              </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-black text-[#2E0B5E] font-noto leading-tight">{madrasah.name}</h2>
            {isTeacher && <p className="text-[10px] font-black text-[#8D30F4] uppercase tracking-widest mt-2">Logged in as Teacher</p>}
          </div>
        </div>

        <div className="space-y-4">
          {isEditingProfile && !isTeacher ? (
            <>
              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">মাদরাসার নাম</label>
                <input type="text" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-base w-full font-noto" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">মোবাইল নম্বর</label>
                <input type="tel" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-base w-full" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-sm">Cancel</button>
                <button onClick={handleUpdate} disabled={saving} className="flex-[2] py-4 bg-[#8D30F4] text-white font-black rounded-2xl text-sm shadow-lg">
                  {saving ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Update Info'}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {!isSuperAdmin && !isTeacher && (
                <>
                  <button onClick={() => setView('teachers')} className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-inner"><UserPlus size={20} /></div>
                      <span className="text-md font-black text-[#2E0B5E]">Manage Teachers</span>
                    </div>
                    <ChevronRight size={20} className="text-slate-300" />
                  </button>
                  <button onClick={() => setView('data-management')} className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#8D30F4] shadow-inner"><Database size={20} /></div>
                      <span className="text-md font-black text-[#2E0B5E]">Backup & Restore</span>
                    </div>
                    <ChevronRight size={20} className="text-slate-300" />
                  </button>
                  <button onClick={() => setIsEditingProfile(true)} className="w-full h-16 bg-[#F2EBFF] text-[#8D30F4] font-black rounded-3xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all border border-[#8D30F4]/10">
                    <Edit3 size={20} /> Edit Account Info
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <button onClick={onLogout} className="w-full py-6 bg-red-500 text-white font-black rounded-[2.5rem] shadow-xl active:scale-[0.95] transition-all flex items-center justify-center gap-4 text-lg border-2 border-red-400">
        <LogOut size={26} /> {t('logout', lang)}
      </button>
    </div>
  );
};

export default Account;
