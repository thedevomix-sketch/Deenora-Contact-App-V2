
import React, { useState, useEffect } from 'react';
import { supabase, offlineApi } from '../supabase';
import { Mail, Lock, Loader2, BookOpen, AlertCircle } from 'lucide-react';
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
  const [brandInfo, setBrandInfo] = useState({ name: 'মাদরাসা কন্টাক্ট' });

  useEffect(() => {
    const name = localStorage.getItem('m_name');
    if (name) setBrandInfo({ name });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: code 
      });
      if (signInError) throw signInError;
      if (data.user) {
        offlineApi.removeCache('profile');
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
    <div className="min-h-screen bg-[#A179FF] flex flex-col items-center justify-center p-8 relative overflow-hidden mesh-bg-vibrant">
      <div className="w-full max-w-sm flex flex-col items-center z-10 space-y-12">
        <div className="text-center space-y-6">
          <div className="w-28 h-28 bg-white/95 rounded-[2.5rem] mx-auto flex items-center justify-center border-4 border-[#8D30F4]/20 shadow-[0_25px_60px_rgba(75,22,138,0.3)] animate-bounce duration-[3s] backdrop-blur-md">
            <BookOpen size={55} strokeWidth={2.5} className="text-[#8D30F4]" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white font-noto leading-tight drop-shadow-xl">
              {brandInfo.name}
            </h1>
            <p className="text-white font-black text-[12px] uppercase tracking-[0.5em] mt-3 opacity-90 drop-shadow-md">Secure Portal Login</p>
          </div>
        </div>

        <form onSubmit={handleAuth} className="w-full space-y-6">
          {error && (
            <div className="bg-white/90 backdrop-blur-md border-l-8 border-l-red-500 p-5 rounded-2xl flex items-center gap-4 text-red-600 font-black text-sm animate-in slide-in-from-top-2 shadow-xl">
              <AlertCircle size={22} strokeWidth={3} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#4B168A]">
                <Mail size={24} strokeWidth={2.5} />
              </div>
              <input
                type="email"
                required
                placeholder="ইমেইল এড্রেস"
                className="w-full pl-16 pr-8 py-6 bg-white border-2 border-transparent rounded-[2rem] outline-none text-[#2D3142] placeholder:text-[#9B6DFF] font-black text-base focus:border-[#8D30F4] shadow-2xl transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#4B168A]">
                <Lock size={24} strokeWidth={2.5} />
              </div>
              <input
                type="password"
                required
                placeholder="পাসওয়ার্ড"
                className="w-full pl-16 pr-8 py-6 bg-white border-2 border-transparent rounded-[2rem] outline-none text-[#2D3142] placeholder:text-[#9B6DFF] font-black text-base focus:border-[#8D30F4] shadow-2xl transition-all"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-6 premium-btn text-white font-black rounded-[2rem] active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-xl font-noto shadow-[0_25px_50px_-10px_rgba(75,22,138,0.5)] border-2 border-white/20"
          >
            {loading ? <Loader2 className="animate-spin" size={28} /> : 'লগইন করুন'}
          </button>
        </form>

        <p className="text-white/70 text-[11px] font-black tracking-[0.3em] uppercase drop-shadow-md">
          Powered by Deenora Tech
        </p>
      </div>
    </div>
  );
};

export default Auth;
