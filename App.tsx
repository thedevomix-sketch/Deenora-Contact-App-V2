
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

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); handleSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        fetchMadrasahProfile(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        offlineApi.removeCache('profile');
        fetchMadrasahProfile(session.user.id);
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

  const fetchMadrasahProfile = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      if (navigator.onLine) {
        const { data, error: fetchError } = await supabase
          .from('madrasahs')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (fetchError) {
          if (fetchError.message?.includes('infinite recursion')) {
            throw new Error("Database Configuration Error: Infinite recursion detected in RLS policies. Please apply the latest SQL schema updates.");
          }
          throw fetchError;
        }

        if (data) {
          setMadrasah(data);
          offlineApi.setCache('profile', data);
          // Auto-navigate to home (which shows AdminPanel if super admin)
          setView('home');
        } else {
          console.warn("Profile missing. Attempting to create default...");
          const { data: newData, error: insertError } = await supabase
            .from('madrasahs')
            .insert({ id: userId, name: 'New Madrasah', is_active: true, balance: 0 })
            .select()
            .single();
          
          if (insertError) throw insertError;
          if (newData) {
            setMadrasah(newData);
            offlineApi.setCache('profile', newData);
            setView('home');
          }
        }
      } else {
        const cached = offlineApi.getCache('profile');
        if (cached && cached.id === userId) {
          setMadrasah(cached);
          setView('home');
        } else {
          setError(lang === 'bn' ? 'অফলাইনে প্রোফাইল পাওয়া যায়নি' : 'Profile not found offline');
        }
      }
    } catch (e: any) {
      console.error("Profile fetch error:", e);
      setError(e.message || "Unknown error occurred while fetching profile.");
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (newView: View) => {
    if (newView === 'account' && session) fetchMadrasahProfile(session.user.id);
    triggerRefresh();
    setView(newView);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#d35132] text-white">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-bold text-[10px] uppercase tracking-widest opacity-60">Initializing Profile...</p>
      </div>
    );
  }

  if (!session) return <Auth lang={lang} />;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#d35132] p-8 text-center">
        <AlertCircle size={60} className="text-white/40 mb-6" />
        <h2 className="text-white text-xl font-black font-noto mb-2">
          {error.includes('recursion') ? (lang === 'bn' ? 'ডাটাবেস কনফিগারেশন এরর' : 'Database Configuration Error') : (lang === 'bn' ? 'প্রোফাইল লোড করা যায়নি' : 'Profile Load Error')}
        </h2>
        <p className="text-white/60 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
          {error}
        </p>
        <button 
          onClick={() => session && fetchMadrasahProfile(session.user.id)} 
          className="bg-white text-[#d35132] px-8 py-4 rounded-full font-black flex items-center gap-2 mx-auto active:scale-95 transition-all shadow-xl"
        >
          <RefreshCw size={18} /> {lang === 'bn' ? 'পুনরায় চেষ্টা করুন' : 'Retry'}
        </button>
      </div>
    );
  }

  const isSuperAdmin = madrasah?.is_super_admin === true;

  return (
    <div className="relative h-full w-full bg-[#d35132]">
      {(!isOnline || syncing) && (
        <div className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-md text-white text-[10px] font-black py-1.5 px-4 z-[60] flex items-center justify-center gap-2 uppercase tracking-widest border-b border-white/10">
          {syncing ? (
            <><CloudSync size={12} className="animate-pulse" /> {lang === 'bn' ? 'ডাটা সিঙ্ক হচ্ছে...' : 'Syncing Data...'}</>
          ) : (
            <><WifiOff size={10} /> {lang === 'bn' ? 'অফলাইন মোড' : 'Offline Mode'}</>
          )}
        </div>
      )}
      
      <Layout currentView={view} setView={navigateTo} lang={lang} madrasah={madrasah}>
        {view === 'home' && (
          isSuperAdmin ? <AdminPanel lang={lang} /> : 
          <Home 
            onStudentClick={(s) => { setSelectedStudent(s); setView('student-details'); }} 
            lang={lang} 
            dataVersion={dataVersion}
            triggerRefresh={triggerRefresh}
          />
        )}
        
        {view === 'classes' && !isSuperAdmin && (
          <Classes 
            onClassClick={(cls) => { setSelectedClass(cls); setView('students'); }} 
            lang={lang} 
            dataVersion={dataVersion} 
            triggerRefresh={triggerRefresh} 
          />
        )}

        {view === 'wallet-sms' && !isSuperAdmin && (
          <WalletSMS 
            lang={lang} 
            madrasah={madrasah} 
            triggerRefresh={triggerRefresh} 
          />
        )}
        
        {view === 'students' && selectedClass && !isSuperAdmin && (
          <Students 
            selectedClass={selectedClass} 
            onStudentClick={(s) => { setSelectedStudent(s); setView('student-details'); }} 
            onAddClick={() => { setSelectedStudent(null); setIsEditing(false); setView('student-form'); }}
            onBack={() => setView('classes')}
            lang={lang}
            dataVersion={dataVersion}
            triggerRefresh={triggerRefresh}
          />
        )}

        {view === 'student-details' && selectedStudent && !isSuperAdmin && (
          <StudentDetails 
            student={selectedStudent} 
            onEdit={() => { setIsEditing(true); setView('student-form'); }}
            onBack={() => setView(selectedClass ? 'students' : 'home')}
            lang={lang}
            triggerRefresh={triggerRefresh}
          />
        )}

        {view === 'student-form' && !isSuperAdmin && (
          <StudentForm 
            student={selectedStudent} 
            defaultClassId={selectedClass?.id}
            isEditing={isEditing} 
            onSuccess={() => { triggerRefresh(); setView(selectedClass ? 'students' : 'home'); }}
            onCancel={() => setView(selectedStudent ? 'student-details' : (selectedClass ? 'students' : 'home'))}
            lang={lang}
          />
        )}

        {view === 'account' && (
          <Account 
            lang={lang} 
            setLang={(l) => { setLang(l); localStorage.setItem('app_lang', l); }} 
            onProfileUpdate={() => session && fetchMadrasahProfile(session.user.id)}
            setView={setView}
            isSuperAdmin={isSuperAdmin}
          />
        )}
      </Layout>
    </div>
  );
};

export default App;
