
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, Loader2, User as UserIcon, AlertCircle, Phone, Hash } from 'lucide-react';
import { Language } from '../types';
import { t } from '../translations';

interface AuthProps {
  lang: Language;
}

const Auth: React.FC<AuthProps> = ({ lang }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [brandInfo, setBrandInfo] = useState({ name: 'মাদরাসা কন্টাক্ট অ্যাপ' });

  useEffect(() => {
    const name = localStorage.getItem('m_name');
    if (name) setBrandInfo({ name });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: code 
      });
      if (error) throw error;
      if (data.user) {
        const { data: profile } = await supabase.from('madrasahs').select('name').eq('id', data.user.id).single();
        if (profile) localStorage.setItem('m_name', profile.name);
      }
    } catch (err: any) { 
      setError(t('login_error', lang)); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f27441] via-[#e5683b] to-[#d35132] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Shapes */}
      <div className="absolute bottom-0 left-0 right-0 opacity-20 pointer-events-none select-none">
        <svg viewBox="0 0 1440 320" className="w-full h-auto">
          <path fill="#000000" d="M0,224L120,208C240,192,480,160,720,170.7C960,181,1200,235,1320,261.3L1440,288L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z"></path>
        </svg>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center z-10 space-y-8">
        
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white tracking-wide">Welcome to</h2>
          <h1 className="text-[28px] font-black text-white font-noto leading-tight drop-shadow-lg">
            {brandInfo.name}
          </h1>
          <p className="text-white/80 font-medium text-sm">{lang === 'bn' ? 'লগইন করুন' : 'Please sign in'}</p>
        </div>

        <div className="relative">
          <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center p-3">
             <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-2xl relative">
                <div className="text-[#d35132] flex flex-col items-center">
                  <UserIcon size={56} strokeWidth={1.2} />
                </div>
                <div className="absolute top-2 right-2 bg-[#69d9a0] w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                  <Phone size={14} className="text-white" fill="currentColor" />
                </div>
             </div>
          </div>
        </div>

        <form onSubmit={handleAuth} className="w-full space-y-5">
          {error && (
            <div className="bg-red-500/20 backdrop-blur-md border border-red-500/50 p-3 rounded-2xl flex items-center gap-3 text-white font-bold text-xs animate-shake">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/90 ml-2 uppercase tracking-widest">
              {t('login_phone', lang)}
            </label>
            <div className="relative">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#bd4341] w-10 h-10 rounded-full flex items-center justify-center text-white z-10 shadow-md">
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                placeholder="example@gmail.com"
                className="w-full pl-14 pr-6 py-4 bg-white/30 border border-white/40 rounded-full outline-none text-white placeholder:text-white/40 font-bold text-sm focus:bg-white/40 transition-all backdrop-blur-md shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/90 ml-2 uppercase tracking-widest">
              {t('madrasah_code', lang)}
            </label>
            <div className="relative">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 bg-[#bd4341] w-10 h-10 rounded-full flex items-center justify-center text-white z-10 shadow-md">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                placeholder="••••••"
                className="w-full pl-14 pr-6 py-4 bg-white/30 border border-white/40 rounded-full outline-none text-white placeholder:text-white/40 font-bold text-sm focus:bg-white/40 transition-all backdrop-blur-md shadow-inner"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-white text-[#d35132] font-black rounded-full shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg font-noto mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : t('login_btn', lang)}
          </button>
        </form>

        <div className="pt-8 text-center">
          <p className="text-white/50 text-[9px] font-black tracking-widest uppercase px-4 leading-relaxed">
            © 2026 Deenora app by KM IBRAHIM
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
