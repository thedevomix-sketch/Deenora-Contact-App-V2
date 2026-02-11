
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, Smartphone, Shield, ShieldOff, ChevronRight, User as UserIcon, Users, CheckCircle2, Ban, RefreshCw, Copy, Check, Eye, EyeOff, Edit3, GraduationCap, MonitorSmartphone, Clock, AlertTriangle, Tablet, Laptop, Monitor, Hash, PhoneCall, Lock, Calendar } from 'lucide-react';
import { supabase } from '../supabase';
import { Madrasah, Language } from '../types';

interface AdminPanelProps {
  lang: Language;
}

interface DeviceSession {
  id: string;
  device_info: string;
  last_active: string;
  device_id: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ lang }) => {
  const [madrasahs, setMadrasahs] = useState<Madrasah[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [view, setView] = useState<'list' | 'details'>('list');
  const [selectedMadrasah, setSelectedMadrasah] = useState<Madrasah | null>(null);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);

  useEffect(() => {
    fetchAllMadrasahs();
  }, []);

  useEffect(() => {
    if (view === 'details' && selectedMadrasah) {
      fetchMadrasahStats(selectedMadrasah.id);
      setShowPass(false);
    }
  }, [view, selectedMadrasah]);

  const fetchAllMadrasahs = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('madrasahs')
        .select('*')
        .neq('is_super_admin', true) 
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setMadrasahs(data || []);
    } catch (err: any) {
      setError("মাদরাসা তালিকা লোড করা যায়নি।");
    } finally {
      setLoading(false);
    }
  };

  const fetchMadrasahStats = async (madrasahId: string) => {
    setLoadingStats(true);
    try {
      // 1. Fetch Students Count
      const { count, error: studentError } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('madrasah_id', madrasahId);
      
      if (studentError) throw studentError;
      setStudentCount(count || 0);

      // 2. Fetch Devices
      const { data: deviceData, error: deviceError } = await supabase
        .from('device_sessions')
        .select('*')
        .eq('madrasah_id', madrasahId)
        .order('last_active', { ascending: false });
      
      if (deviceError) throw deviceError;
      setDevices(deviceData || []);

    } catch (err: any) {
      console.error("Stats Fetch Error:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const toggleStatus = async (m: Madrasah) => {
    setUpdatingId(m.id);
    const newStatus = m.is_active === false;
    try {
      const { error: upErr } = await supabase.from('madrasahs').update({ is_active: newStatus }).eq('id', m.id);
      if (upErr) throw upErr;
      
      setMadrasahs(prev => prev.map(item => item.id === m.id ? { ...item, is_active: newStatus } : item));
      if (selectedMadrasah?.id === m.id) setSelectedMadrasah({ ...selectedMadrasah, is_active: newStatus });
    } finally {
      setUpdatingId(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopying(key);
    setTimeout(() => setCopying(null), 2000);
  };

  const getDeviceIcon = (info: string) => {
    const lower = info.toLowerCase();
    if (lower.includes('android')) return <Smartphone size={16} />;
    if (lower.includes('iphone') || lower.includes('ios')) return <Smartphone size={16} />;
    if (lower.includes('pc') || lower.includes('windows')) return <Monitor size={16} />;
    return <Smartphone size={16} />;
  };

  const filtered = useMemo(() => {
    return madrasahs.filter(m => 
      (m.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [madrasahs, searchQuery]);

  if (loading) return (
    <div className="py-20 flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-white" size={40} />
      <p className="text-white/60 font-black text-[10px] uppercase tracking-widest">লোড হচ্ছে...</p>
    </div>
  );

  if (view === 'list') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 p-3 rounded-2xl text-center border border-white/10 backdrop-blur-md">
            <Users size={16} className="mx-auto mb-1 text-white/40" />
            <div className="text-xl font-black text-white">{madrasahs.length}</div>
            <div className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Total</div>
          </div>
          <div className="bg-green-500/10 p-3 rounded-2xl text-center border border-green-500/20">
            <CheckCircle2 size={16} className="mx-auto mb-1 text-green-400" />
            <div className="text-xl font-black text-green-400">{madrasahs.filter(m=>m.is_active!==false).length}</div>
            <div className="text-[8px] font-bold text-green-400/40 uppercase tracking-widest mt-1">Active</div>
          </div>
          <div className="bg-red-500/10 p-3 rounded-2xl text-center border border-red-500/20">
            <Ban size={16} className="mx-auto mb-1 text-red-400" />
            <div className="text-xl font-black text-red-400">{madrasahs.filter(m=>m.is_active===false).length}</div>
            <div className="text-[8px] font-bold text-red-400/40 uppercase tracking-widest mt-1">Blocked</div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="মাদরাসা খুঁজুন..."
            className="w-full pl-12 pr-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-bold backdrop-blur-md shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {filtered.map(m => (
            <button key={m.id} onClick={() => { setSelectedMadrasah(m); setView('details'); }} className="w-full bg-white/10 border border-white/10 rounded-[1.8rem] p-4 flex items-center justify-between active:scale-[0.98] transition-all backdrop-blur-md">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                   {m.logo_url ? <img src={m.logo_url} className="w-full h-full object-cover rounded-2xl" /> : <UserIcon size={20} className="text-white/30" />}
                </div>
                <div>
                  <h3 className="font-black text-white truncate text-sm font-noto">{m.name}</h3>
                  <p className="text-[9px] text-white/40 font-bold">{m.phone || 'ফোন নেই'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${m.is_active !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {m.is_active !== false ? 'Active' : 'Blocked'}
                  </span>
                 <ChevronRight className="text-white/20" size={20} />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-right-4 duration-500 pb-20 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => setView('list')} className="p-3 bg-white/10 rounded-xl text-white active:scale-90 transition-all border border-white/20 shadow-lg">
          <ChevronRight className="rotate-180" size={20} />
        </button>
        <h1 className="text-xl font-black text-white font-noto">মাদরাসা ডিটেইলস</h1>
      </div>

      <div className="bg-white/15 backdrop-blur-2xl rounded-[3rem] p-6 border border-white/20 shadow-2xl space-y-8">
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-28 h-28 bg-white/10 rounded-full border-4 border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
            {selectedMadrasah?.logo_url ? <img src={selectedMadrasah.logo_url} className="w-full h-full object-cover" /> : <UserIcon size={48} className="text-white/30" />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-white font-noto leading-tight">{selectedMadrasah?.name}</h2>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Madrasah Profile Information</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 p-5 rounded-[2.2rem] border border-white/10 flex flex-col items-center text-center">
            <GraduationCap className="text-white/40 mb-2" size={24} />
            <div className="text-2xl font-black text-white">
              {loadingStats ? <Loader2 size={20} className="animate-spin text-white/20" /> : studentCount}
            </div>
            <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">Total Students</div>
          </div>
          <div className="bg-white/10 p-5 rounded-[2.2rem] border border-white/10 flex flex-col items-center text-center">
            <MonitorSmartphone className="text-white/40 mb-2" size={24} />
            <div className="text-2xl font-black text-white">
              {loadingStats ? <Loader2 size={20} className="animate-spin text-white/20" /> : devices.length}
            </div>
            <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">Active Devices</div>
          </div>
        </div>

        {/* Core Credentials Section */}
        <div className="space-y-4">
           <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
             <Shield size={12} /> Core Credentials
           </h3>
           
           <div className="space-y-3">
              {/* UUID */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between group">
                 <div className="flex items-center gap-3 min-w-0">
                    <Hash size={16} className="text-white/30 shrink-0" />
                    <div className="min-w-0">
                       <p className="text-[9px] font-black text-white/30 uppercase mb-0.5 tracking-wider">Madrasah UUID</p>
                       <p className="text-xs font-mono text-white/80 truncate">{selectedMadrasah?.id}</p>
                    </div>
                 </div>
                 <button onClick={() => copyToClipboard(selectedMadrasah?.id || '', 'uuid')} className="p-2.5 bg-white/10 text-white rounded-xl active:scale-90 transition-all shrink-0">
                    {copying === 'uuid' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                 </button>
              </div>

              {/* Created Date */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between group">
                 <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-white/30 shrink-0" />
                    <div>
                       <p className="text-[9px] font-black text-white/30 uppercase mb-0.5 tracking-wider">Registration Date</p>
                       <p className="text-sm font-black text-white">
                          {selectedMadrasah?.created_at 
                            ? new Date(selectedMadrasah.created_at).toLocaleString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }) 
                            : 'N/A'}
                       </p>
                    </div>
                 </div>
              </div>

              {/* Phone */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between group">
                 <div className="flex items-center gap-3">
                    <PhoneCall size={16} className="text-white/30 shrink-0" />
                    <div>
                       <p className="text-[9px] font-black text-white/30 uppercase mb-0.5 tracking-wider">Mobile Number</p>
                       <p className="text-sm font-black text-white">{selectedMadrasah?.phone || 'Not provided'}</p>
                    </div>
                 </div>
                 <button onClick={() => selectedMadrasah?.phone && copyToClipboard(selectedMadrasah.phone, 'phone')} className="p-2.5 bg-white/10 text-white rounded-xl active:scale-90 transition-all">
                    {copying === 'phone' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                 </button>
              </div>

              {/* Login Code / Password */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between group">
                 <div className="flex items-center gap-3">
                    <Lock size={16} className="text-white/30 shrink-0" />
                    <div>
                       <p className="text-[9px] font-black text-white/30 uppercase mb-0.5 tracking-wider">Login Code (Password)</p>
                       <p className="text-lg font-black text-white tracking-[0.2em]">{showPass ? selectedMadrasah?.login_code : '••••••'}</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setShowPass(!showPass)} className="p-2.5 bg-white/10 text-white rounded-xl active:scale-90 transition-all">
                       {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button onClick={() => copyToClipboard(selectedMadrasah?.login_code || '', 'pass')} className="p-2.5 bg-white/10 text-white rounded-xl active:scale-90 transition-all">
                       {copying === 'pass' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* Sessions Section */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
             <Smartphone size={12} /> Active Login Sessions
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {loadingStats ? (
              <div className="flex justify-center py-6"><Loader2 className="animate-spin text-white/20" /></div>
            ) : devices.length > 0 ? (
              devices.map(d => (
                <div key={d.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-2.5 rounded-xl text-white/40">
                      {getDeviceIcon(d.device_info)}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">{d.device_info}</p>
                      <div className="flex items-center gap-1.5 text-[9px] text-white/30 font-bold mt-1 uppercase">
                         <Clock size={10} />
                         {new Date(d.last_active).toLocaleString('bn-BD', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">No active sessions found</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10">
          <button onClick={() => selectedMadrasah && toggleStatus(selectedMadrasah)} className={`w-full py-5 rounded-[1.8rem] font-black text-sm uppercase flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${selectedMadrasah?.is_active !== false ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
            {updatingId ? <Loader2 className="animate-spin" size={20} /> : selectedMadrasah?.is_active !== false ? <><ShieldOff size={18} /> Block Madrasah Account</> : <><Shield size={18} /> Activate Madrasah Account</>}
          </button>
          <p className="text-[9px] text-white/20 text-center mt-4 uppercase font-bold tracking-widest">Management System v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
