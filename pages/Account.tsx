
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
}

const Account: React.FC<AccountProps> = ({ lang, setLang, onProfileUpdate, setView, isSuperAdmin, initialMadrasah }) => {
  const [madrasah, setMadrasah] = useState<Madrasah | null>(initialMadrasah);
  const [saving, setSaving] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Stats States
  const [stats, setStats] = useState({ students: 0, classes: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Profile Form States
  const [newName, setNewName] = useState(initialMadrasah?.name || '');
  const [newPhone, setNewPhone] = useState(initialMadrasah?.phone || '');
  const [newLoginCode, setNewLoginCode] = useState(initialMadrasah?.login_code || '');
  const [logoUrl, setLogoUrl] = useState(initialMadrasah?.logo_url || '');
  
  // Global Settings States (For Super Admin)
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
    if (isSuperAdmin) {
      fetchGlobalSettings();
    }
  }, [isSuperAdmin, initialMadrasah?.id]);

  const fetchStats = async () => {
    if (!initialMadrasah) return;
    try {
      const [stdRes, clsRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('madrasah_id', initialMadrasah.id),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('madrasah_id', initialMadrasah.id)
      ]);
      setStats({ students: stdRes.count || 0, classes: clsRes.count || 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
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
    if (!madrasah) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('madrasahs')
        .update({ 
          name: newName.trim(), 
          phone: newPhone.trim(), 
          login_code: newLoginCode.trim(),
          logo_url: logoUrl
        })
        .eq('id', madrasah.id);
      
      if (error) throw error;
      if (onProfileUpdate) onProfileUpdate();
      setIsEditingProfile(false);
      alert(lang === 'bn' ? 'সব তথ্য আপডেট হয়েছে!' : 'Profile Updated!');
    } catch (err: any) { 
      alert(lang === 'bn' ? 'আপডেট ব্যর্থ হয়েছে' : 'Update Failed: ' + err.message); 
    } finally { 
      setSaving(false); 
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !madrasah) return;
    setSaving(true);
    try {
      const fileName = `logo_${madrasah.id}_${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from('madrasah-assets').upload(`logos/${fileName}`, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('madrasah-assets').getPublicUrl(`logos/${fileName}`);
      setLogoUrl(publicUrl);
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  const handleSaveGlobal = async () => {
    setSavingGlobal(true);
    try {
      const { error } = await supabase.from('system_settings').upsert({
        id: '00000000-0000-0000-0000-000000000001',
        reve_api_key: reveApiKey.trim(),
        reve_secret_key: reveSecretKey.trim(),
        reve_caller_id: reveCallerId.trim(),
        reve_client_id: reveClientId.trim(),
        bkash_number: bkashNumber.trim(),
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      alert(lang === 'bn' ? 'সিস্টেম সেটিংস সফলভাবে সেভ হয়েছে' : 'Global Settings Saved Successfully');
    } catch (err: any) { 
      alert(err.message); 
    } finally { 
      setSavingGlobal(false); 
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
            <p className="text-lg font-black text-[#2E0B5E] leading-none">{madrasah.sms_balance}</p>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">SMS</p>
          </div>
        </div>
      )}

      {/* User Profile Card */}
      <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[3rem] border border-white/50 shadow-2xl space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#8D30F4]/5 rounded-bl-[5rem] -mr-8 -mt-8 blur-2xl"></div>

        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative group">
            <div className="w-28 h-28 bg-white rounded-[2.5rem] border-4 border-slate-50 shadow-2xl flex items-center justify-center overflow-hidden">
               {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : isSuperAdmin ? <ShieldCheck size={45} className="text-[#8D30F4]" /> : <UserIcon size={40} className="text-[#A179FF]" />}
            </div>
            {isEditingProfile && (
              <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#8D30F4] text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
                <Camera size={18} />
              </button>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-black text-[#2E0B5E] font-noto leading-tight">{isEditingProfile ? 'Update Profile' : (newName || madrasah.name)}</h2>
            
            {!isEditingProfile && (
              <div onClick={copyId} className="mt-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2 cursor-pointer active:scale-95 transition-all mx-auto w-fit">
                <Hash size={14} className="text-slate-400" />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[150px]">ID: {madrasah.id}</p>
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-slate-300" />}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {isEditingProfile ? (
            <>
              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-1.5">মাদরাসার নাম</label>
                <input type="text" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-base w-full font-noto" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-1.5">মোবাইল নম্বর</label>
                <input type="tel" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-base w-full" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border-2 border-transparent focus-within:border-[#8D30F4]/30 transition-all shadow-inner">
                <label className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-1.5">পাসওয়ার্ড/লগইন কোড</label>
                <input type="password" title="Login Code" className="bg-transparent border-none outline-none font-black text-[#2E0B5E] text-base w-full" value={newLoginCode} onChange={(e) => setNewLoginCode(e.target.value)} />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-sm">Cancel</button>
                <button onClick={handleUpdate} disabled={saving} className="flex-[2] py-4 bg-[#8D30F4] text-white font-black rounded-2xl text-sm shadow-lg flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Update Info</>}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {!isSuperAdmin && (
                <>
                  <button onClick={() => setView('teachers')} className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-inner"><UserPlus size={20} /></div>
                      <span className="text-md font-black text-[#2E0B5E]">Manage Teachers</span>
                    </div>
                    <ChevronRight size={20} className="text-slate-300" />
                  </button>
                  <button onClick={() => setView('data-management')} className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#8D30F4] shadow-inner"><Database size={20} /></div>
                      <span className="text-md font-black text-[#2E0B5E]">Backup & Restore</span>
                    </div>
                    <ChevronRight size={20} className="text-slate-300" />
                  </button>
                </>
              )}
              
              <button onClick={() => setIsEditingProfile(true)} className="w-full h-16 bg-[#F2EBFF] text-[#8D30F4] font-black rounded-3xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all border border-[#8D30F4]/10">
                <Edit3 size={20} /> Edit Account Info
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global System Configuration (Super Admin Only) */}
      {isSuperAdmin && (
        <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-white space-y-7 animate-in slide-in-from-bottom-5">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#8D30F4]/10 text-[#8D30F4] rounded-2xl flex items-center justify-center shadow-inner"><Globe size={24} /></div>
              <h3 className="text-xl font-black text-slate-800 font-noto">গ্লোবাল সিস্টেম কনফিগারেশন</h3>
           </div>
           
           <div className="space-y-5">
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">গ্লোবাল বিকাশ নম্বর</label>
                <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800" value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} placeholder="017XXXXXXXX" />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">সিস্টেম সেন্ডার আইডি (Caller ID)</label>
                <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800" value={reveCallerId} onChange={(e) => setReveCallerId(e.target.value)} placeholder="Reve Caller ID" />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">সিস্টেম এপিআই কি</label>
                <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800 text-xs" value={reveApiKey} onChange={(e) => setReveApiKey(e.target.value)} placeholder="Reve API Key" />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">সিস্টেম সিক্রেট কি</label>
                <input type="password" title="Secret Key" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800 text-xs" value={reveSecretKey} onChange={(e) => setReveSecretKey(e.target.value)} placeholder="Reve Secret Key" />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">সিস্টেম ক্লায়েন্ট আইডি</label>
                <input type="text" className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-5 font-black text-slate-800 text-xs" value={reveClientId} onChange={(e) => setReveClientId(e.target.value)} placeholder="Reve Client ID" />
              </div>
              
              <button onClick={handleSaveGlobal} disabled={savingGlobal} className="w-full h-16 premium-btn text-white font-black rounded-3xl flex items-center justify-center gap-3 mt-4 shadow-xl active:scale-[0.98] transition-all">
                {savingGlobal ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24} /> গ্লোবাল কনফিগ সেভ করুন</>}
              </button>
           </div>
        </div>
      )}

      {/* Logout Button */}
      <button onClick={() => (supabase.auth as any).signOut()} className="w-full py-6 bg-red-500 text-white font-black rounded-[2.5rem] shadow-xl active:scale-[0.95] transition-all flex items-center justify-center gap-4 text-lg border-2 border-red-400">
        <LogOut size={26} /> {t('logout', lang)}
      </button>
    </div>
  );
};

export default Account;
