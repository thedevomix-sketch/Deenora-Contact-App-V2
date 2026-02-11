
import React from 'react';
import { Home, User, BookOpen, Wallet, ShieldCheck, BarChart3, Clock } from 'lucide-react';
import { View, Language, Madrasah } from '../types';
import { t } from '../translations';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  setView: (view: View) => void;
  lang: Language;
  madrasah: Madrasah | null;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, lang, madrasah }) => {
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
    <div 
      className="flex flex-col overflow-hidden bg-gradient-to-br from-[#d35132] via-[#e57d4a] to-[#d35132] font-['Hind_Siliguri'] w-full"
      style={{ height: 'var(--app-height, 100%)' }}
    >
      
      {/* Dynamic Header */}
      <header className="flex-none px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-3 flex items-center gap-3 z-50 border-b border-white/10 bg-white/10 backdrop-blur-md">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden border border-white/30 bg-white/20 shadow-lg shrink-0">
          {isSuperAdmin ? (
             <ShieldCheck size={24} className="text-white" />
          ) : madrasah?.logo_url ? (
            <img src={madrasah.logo_url} className="w-full h-full object-cover" alt="Logo" />
          ) : (
            <BookOpen size={22} className="text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-white truncate leading-none tracking-tight font-noto">
            {isSuperAdmin ? (lang === 'bn' ? 'সুপার অ্যাডমিন' : 'Super Admin') : (madrasah?.name || 'মাদরাসা কন্টাক্ট')}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.1em]">
              {isSuperAdmin ? (lang === 'bn' ? 'অ্যাডমিন কন্ট্রোল' : 'Admin Control') : (lang === 'bn' ? 'মাদরাসা অ্যাডমিন' : 'Madrasah Admin')}
            </p>
            {!isSuperAdmin && (
               <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full border border-white/10">
                 <Wallet size={10} className="text-white" />
                 <span className="text-[10px] font-black text-white">
                   {madrasah?.balance || 0} ৳
                 </span>
               </div>
            )}
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24 w-full max-w-md mx-auto no-select scroll-smooth">
        {children}
      </main>

      {/* Refined Navigation */}
      <nav className="flex-none bg-white/10 backdrop-blur-2xl border-t border-white/10 flex justify-around items-center py-2 px-4 pb-[calc(env(safe-area-inset-bottom,12px)+8px)] z-50 shadow-2xl">
        <button 
          onClick={() => setView('home')}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 p-1.5 ${isTabActive('home') ? 'text-white' : 'text-white/40'}`}
        >
          <Home size={22} strokeWidth={isTabActive('home') ? 2.5 : 2} />
          <span className={`text-[10px] font-black uppercase tracking-wider ${isTabActive('home') ? 'opacity-100' : 'opacity-70'}`}>{t('home', lang)}</span>
        </button>
        
        {isSuperAdmin && (
          <>
            <button 
              onClick={() => setView('admin-approvals')}
              className={`flex flex-col items-center gap-1 transition-all active:scale-90 p-1.5 ${isTabActive('approvals') ? 'text-white' : 'text-white/40'}`}
            >
              <Clock size={22} strokeWidth={isTabActive('approvals') ? 2.5 : 2} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${isTabActive('approvals') ? 'opacity-100' : 'opacity-70'}`}>{t('approvals', lang)}</span>
            </button>
            <button 
              onClick={() => setView('admin-dashboard')}
              className={`flex flex-col items-center gap-1 transition-all active:scale-90 p-1.5 ${isTabActive('dashboard') ? 'text-white' : 'text-white/40'}`}
            >
              <BarChart3 size={22} strokeWidth={isTabActive('dashboard') ? 2.5 : 2} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${isTabActive('dashboard') ? 'opacity-100' : 'opacity-70'}`}>{t('dashboard', lang)}</span>
            </button>
          </>
        )}

        {!isSuperAdmin && (
          <>
            <button 
              onClick={() => setView('classes')}
              className={`flex flex-col items-center gap-1 transition-all active:scale-90 p-1.5 ${isTabActive('classes') ? 'text-white' : 'text-white/40'}`}
            >
              <User size={22} strokeWidth={isTabActive('classes') ? 2.5 : 2} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${isTabActive('classes') ? 'opacity-100' : 'opacity-70'}`}>{t('classes', lang)}</span>
            </button>
            <button 
              onClick={() => setView('wallet-sms')}
              className={`flex flex-col items-center gap-1 transition-all active:scale-90 p-1.5 ${isTabActive('wallet') ? 'text-white' : 'text-white/40'}`}
            >
              <Wallet size={22} strokeWidth={isTabActive('wallet') ? 2.5 : 2} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${isTabActive('wallet') ? 'opacity-100' : 'opacity-70'}`}>{t('wallet', lang)}</span>
            </button>
          </>
        )}
        
        <button 
          onClick={() => setView('account')}
          className={`flex flex-col items-center gap-1 transition-all active:scale-90 p-1.5 ${isTabActive('account') ? 'text-white' : 'text-white/40'}`}
        >
          <User size={22} strokeWidth={isTabActive('account') ? 2.5 : 2} />
          <span className={`text-[10px] font-black uppercase tracking-wider ${isTabActive('account') ? 'opacity-100' : 'opacity-70'}`}>{t('account', lang)}</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
