
import React, { useState, useEffect } from 'react';
import { supabase, offlineApi } from './supabase';
import Auth from './pages/Auth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Classes from './pages/Classes';
import Students from './pages/Students';
import StudentDetails from './pages/StudentDetails';
import StudentForm from './pages/StudentForm';
import Account from './pages/Account';
import AdminPanel from './pages/AdminPanel';
import WalletSMS from './pages/WalletSMS';
import DataManagement from './pages/DataManagement';
import { View, Class, Student, Language, Madrasah } from './types';
import { WifiOff, Loader2, CloudSync, AlertCircle, RefreshCw } from 'lucide-react';
import { t } from './translations';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [view, setView] = useState<View>('home');
  const [madrasah, setMadrasah] = useState<Madrasah | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dataVersion, setDataVersion] = useState(0); 
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'bn';
  });

  const APP_VERSION = "2.1.1-GOLD-SMS";

  const triggerRefresh = () => {
    setDataVersion(prev => prev + 1);
  };

  const handleSync = async () => {
    if (navigator.onLine) {
      setSyncing(true);
      await offlineApi.processQueue();
      setSyncing(false);
      triggerRefresh();
    }
  };

  const forceUpdate = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
    }
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_')) localStorage.removeItem(key);
    });
    window.location.reload();
  };

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); handleSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        fetchMadrasahProfileWithRetry(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchMadrasahProfileWithRetry(session.user.id);
      } else {
        setMadrasah(null);
        setLoading(false);
        setError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchMadrasahProfileWithRetry = async (userId: string, retries = 2) => {
    try {
      await fetchMadrasahProfile(userId);
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchMadrasahProfileWithRetry(userId, retries - 1), 1000);
      } else {
        setError("Network connectivity issue. Please check your internet.");
        setLoading(false);
      }
    }
  };

  const fetchMadrasahProfile = async (userId: string) => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('madrasahs')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (fetchError) throw fetchError;

    if (data) {
      setMadrasah(data);
      offlineApi.setCache('profile', data);
    } else {
      const { data: newData, error: insertError } = await supabase
        .from('madrasahs')
        .insert({ id: userId, name: 'নতুন মাদরাসা', is_active: true, balance: 0 })
        .select()
        .single();
      if (insertError) throw insertError;
      setMadrasah(newData);
    }
    setLoading(false);
  };

  const navigateTo = (newView: View) => {
    triggerRefresh();
    setView(newView);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#d35132] text-white">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-bold text-[10px] uppercase tracking-widest opacity-60">Initializing App...</p>
      </div>
    );
  }

  if (!session) return <Auth lang={lang} />;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#d35132] p-8 text-center">
        <AlertCircle size={60} className="text-white/40 mb-6" />
        <h2 className="text-white text-xl font-black mb-2">Connection Error</h2>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => window.location.reload()} className="bg-white text-[#d35132] px-8 py-4 rounded-full font-black flex items-center justify-center gap-2">
            <RefreshCw size={18} /> Retry Connection
          </button>
          <button onClick={forceUpdate} className="bg-black/20 text-white/70 px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest">
            Force Update & Clear Cache
          </button>
        </div>
      </div>
    );
  }

  const isSuperAdmin = madrasah?.is_super_admin === true;

  return (
    <div className="relative h-full w-full bg-[#d35132]">
      {(!isOnline || syncing) && (
        <div className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-md text-white text-[10px] font-black py-1.5 px-4 z-[60] flex items-center justify-center gap-2 uppercase tracking-widest border-b border-white/10">
          {syncing ? <><CloudSync size={12} className="animate-pulse" /> Syncing...</> : <><WifiOff size={10} /> Offline</>}
        </div>
      )}
      
      <Layout currentView={view} setView={navigateTo} lang={lang} madrasah={madrasah}>
        {view === 'home' && (
          isSuperAdmin ? <AdminPanel lang={lang} currentView="list" /> : 
          <Home onStudentClick={(s) => { setSelectedStudent(s); setView('student-details'); }} lang={lang} dataVersion={dataVersion} triggerRefresh={triggerRefresh} />
        )}
        {view === 'admin-dashboard' && isSuperAdmin && <AdminPanel lang={lang} currentView="dashboard" />}
        {view === 'admin-approvals' && isSuperAdmin && <AdminPanel lang={lang} currentView="approvals" />}
        {view === 'classes' && !isSuperAdmin && <Classes onClassClick={(cls) => { setSelectedClass(cls); setView('students'); }} lang={lang} dataVersion={dataVersion} triggerRefresh={triggerRefresh} />}
        {view === 'wallet-sms' && !isSuperAdmin && <WalletSMS lang={lang} madrasah={madrasah} triggerRefresh={triggerRefresh} dataVersion={dataVersion} />}
        {view === 'data-management' && !isSuperAdmin && <DataManagement lang={lang} madrasah={madrasah} onBack={() => setView('account')} triggerRefresh={triggerRefresh} />}
        {view === 'account' && <Account lang={lang} setLang={(l) => { setLang(l); localStorage.setItem('app_lang', l); }} onProfileUpdate={() => fetchMadrasahProfileWithRetry(session.user.id)} setView={setView} isSuperAdmin={isSuperAdmin} initialMadrasah={madrasah} />}
        {view === 'students' && selectedClass && !isSuperAdmin && (
          <Students selectedClass={selectedClass} onStudentClick={(s) => { setSelectedStudent(s); setView('student-details'); }} onAddClick={() => { setSelectedStudent(null); setIsEditing(false); setView('student-form'); }} onBack={() => setView('classes')} lang={lang} dataVersion={dataVersion} triggerRefresh={triggerRefresh} />
        )}
        {view === 'student-details' && selectedStudent && !isSuperAdmin && <StudentDetails student={selectedStudent} onEdit={() => { setIsEditing(true); setView('student-form'); }} onBack={() => setView(selectedClass ? 'students' : 'home')} lang={lang} triggerRefresh={triggerRefresh} />}
        {view === 'student-form' && !isSuperAdmin && <StudentForm student={selectedStudent} defaultClassId={selectedClass?.id} isEditing={isEditing} onSuccess={() => { triggerRefresh(); setView(selectedClass ? 'students' : 'home'); }} onCancel={() => setView(selectedStudent ? 'student-details' : (selectedClass ? 'students' : 'home'))} lang={lang} />}
        
        <div className="mt-8 mb-4 text-center opacity-20 select-none">
           <span className="text-[9px] font-black text-white uppercase tracking-widest">{APP_VERSION}</span>
        </div>
      </Layout>
    </div>
  );
};

export default App;
