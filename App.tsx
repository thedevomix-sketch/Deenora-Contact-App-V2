
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
import { WifiOff, Loader2, CloudSync } from 'lucide-react';
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
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'bn';
  });

  const triggerRefresh = () => {
    setDataVersion(prev => prev + 1);
  };

  const registerDevice = async (userId: string) => {
    if (!navigator.onLine) return;
    try {
      let deviceId = localStorage.getItem('app_device_id');
      if (!deviceId) {
        deviceId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('app_device_id', deviceId);
      }
      const userAgent = navigator.userAgent;
      let deviceInfo = 'PC/Browser';
      if (/android/i.test(userAgent)) deviceInfo = 'Android Device';
      else if (/iPhone|iPad|iPod/i.test(userAgent)) deviceInfo = 'iOS Device';

      await supabase.from('device_sessions').upsert({
        madrasah_id: userId,
        device_id: deviceId,
        device_info: deviceInfo,
        last_active: new Date().toISOString()
      }, { onConflict: 'madrasah_id, device_id' });
    } catch (e) {
      console.warn("Device registration failed (check if table exists):", e);
    }
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
        registerDevice(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchMadrasahProfile(session.user.id);
        registerDevice(session.user.id);
      } else {
        setMadrasah(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchMadrasahProfile = async (userId: string) => {
    try {
      const cached = offlineApi.getCache('profile');
      if (cached) setMadrasah(cached);

      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('madrasahs')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error && (error.code === 'PGRST116' || error.message.includes('not found'))) {
          // Profile not found, create it automatically
          const { data: newProfile, error: createError } = await supabase
            .from('madrasahs')
            .insert({ id: userId, name: 'আমার মাদরাসা', balance: 0 })
            .select()
            .single();
          
          if (!createError && newProfile) {
            setMadrasah(newProfile);
            offlineApi.setCache('profile', newProfile);
          }
        } else if (data) {
          if (data.is_active === false && !data.is_super_admin) {
            alert(t('account_disabled', lang));
            await supabase.auth.signOut();
            return;
          }
          setMadrasah(data);
          offlineApi.setCache('profile', data);
        }
      }
    } catch (e) {
      console.error("Profile load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (newView: View) => {
    triggerRefresh();
    setView(newView);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#d35132] text-white">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-bold text-[10px] uppercase tracking-widest opacity-60">System Initializing...</p>
      </div>
    );
  }

  if (!session) return <Auth lang={lang} />;

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
        
        {view === 'classes' && (
          <Classes 
            onClassClick={(cls) => { setSelectedClass(cls); setView('students'); }} 
            lang={lang} 
            dataVersion={dataVersion} 
            triggerRefresh={triggerRefresh} 
          />
        )}

        {view === 'wallet-sms' && (
          <WalletSMS 
            lang={lang} 
            madrasah={madrasah} 
            triggerRefresh={triggerRefresh} 
          />
        )}
        
        {view === 'students' && selectedClass && (
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

        {view === 'student-details' && selectedStudent && (
          <StudentDetails 
            student={selectedStudent} 
            onEdit={() => { setIsEditing(true); setView('student-form'); }}
            onBack={() => setView(selectedClass ? 'students' : 'home')}
            lang={lang}
            triggerRefresh={triggerRefresh}
          />
        )}

        {view === 'student-form' && (
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
