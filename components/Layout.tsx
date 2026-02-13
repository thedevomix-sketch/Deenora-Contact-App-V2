
import React from 'react';
import { Home, User, BookOpen, Wallet, ShieldCheck, BarChart3, Clock, RefreshCw, Smartphone } from 'lucide-react';
import { View, Language, Madrasah } from '../types';
import { t } from '../translations';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  setView: (view: View) => void;
  lang: Language;
  madrasah: Madrasah | null;
  onUpdateClick?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, lang, madrasah, onUpdateClick }) => {
  const isSuperAdmin = madrasah?.is_super_admin === true;

  const isTabActive = (tab: string) => {
    if (tab === 'home' && currentView === 'home') return true;
    if (tab === 'account' && currentView === 'account') return true;
    if (tab === 'dashboard' && currentView === 'admin-dashboard') return true;
    if (tab === 'approvals' && currentView === 'admin-approvals') return true;
    if (!isSuperAdmin) {
        if (tab === 'classes' && (currentView === 'classes' || currentView === 'students' || currentView === 'student-details' || currentView === 'student-form')) return true;
        if (tab === 'wallet' && currentView === 'wallet-sms') return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col overflow-hidden w-full relative" style={{ height: 'var(--app-height, 100%)' }}>
      {/* Soft Header */}
      <header className="flex-none px-6 pt-[calc(env(safe-area-inset-top)+12px)] pb-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1.2rem] flex items-center justify-center bg-white shadow-sm border border-[#8D30F4]/10 shrink-0 overflow-hidden">
            {isSuperAdmin ? (
               <ShieldCheck size={26} className="text-[#8D30F4]" />
            ) : madrasah?.logo_url ? (
              <img src={madrasah.logo_url} className="w-full h-full object-cover" alt="Logo" />
            ) : (
              <BookOpen size={24} className="text-[#8D30F4]" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-[18px] font-black text-slate-800 truncate leading-none tracking-tight font-noto">
              {isSuperAdmin ? (lang === 'bn' ? 'সুপার অ্যাডমিন' : 'Super Admin') : (madrasah?.name || 'মাদরাসা কন্টাক্ট')}
            </h1>
            <p className="text-[9px] font-black text-[#8D30F4]/60 uppercase tracking-[0.2em] mt-1.5">
              Portal Access
            </p>
          </div>
        </div>
        
        <button onClick={onUpdateClick} className="p-3 bg-white rounded-[1.2rem] text-[#8D30F4] active:scale-95 transition-all border border-[#8D30F4]/10 shadow-sm">
          <RefreshCw size={20} />
        </button>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto px-5 pt-4 pb-32 w-full max-w-md mx-auto scroll-smooth relative z-10">
        {children}
      </main>

      {/* Floating Modern Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[100]">
        <nav className="bg-white/90 backdrop-blur-[25px] border border-[#8D30F4]/10 flex justify-around items-center py-4 px-3 rounded-[2.2rem] shadow-[0_20px_50px_-10px_rgba(141,48,244,0.2)]">
          <button onClick={() => setView('home')} className={`relative flex flex-col items-center gap-1 group transition-all ${isTabActive('home') ? 'text-[#8D30F4]' : 'text-slate-400'}`}>
            <Home size={26} strokeWidth={isTabActive('home') ? 3 : 2} />
            {isTabActive('home') && <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[#8D30F4]"></div>}
          </button>
          
          {isSuperAdmin ? (
            <>
              <button onClick={() => setView('admin-approvals')} className={`relative flex flex-col items-center gap-1 transition-all ${isTabActive('approvals') ? 'text-[#8D30F4]' : 'text-slate-400'}`}>
                <Clock size={26} strokeWidth={isTabActive('approvals') ? 3 : 2} />
                {isTabActive('approvals') && <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[#8D30F4]"></div>}
              </button>
              <button onClick={() => setView('admin-dashboard')} className={`relative flex flex-col items-center gap-1 transition-all ${isTabActive('dashboard') ? 'text-[#8D30F4]' : 'text-slate-400'}`}>
                <BarChart3 size={26} strokeWidth={isTabActive('dashboard') ? 3 : 2} />
                {isTabActive('dashboard') && <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[#8D30F4]"></div>}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setView('classes')} className={`relative flex flex-col items-center gap-1 transition-all ${isTabActive('classes') ? 'text-[#8D30F4]' : 'text-slate-400'}`}>
                <Smartphone size={26} strokeWidth={isTabActive('classes') ? 3 : 2} />
                {isTabActive('classes') && <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[#8D30F4]"></div>}
              </button>
              <button onClick={() => setView('wallet-sms')} className={`relative flex flex-col items-center gap-1 transition-all ${isTabActive('wallet') ? 'text-[#8D30F4]' : 'text-slate-400'}`}>
                <Wallet size={26} strokeWidth={isTabActive('wallet') ? 3 : 2} />
                {isTabActive('wallet') && <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[#8D30F4]"></div>}
              </button>
            </>
          )}
          
          <button onClick={() => setView('account')} className={`relative flex flex-col items-center gap-1 transition-all ${isTabActive('account') ? 'text-[#8D30F4]' : 'text-slate-400'}`}>
            <User size={26} strokeWidth={isTabActive('account') ? 3 : 2} />
            {isTabActive('account') && <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-[#8D30F4]"></div>}
          </button>
        </nav>
      </div>
    </div>
  );
};

export default Layout;
