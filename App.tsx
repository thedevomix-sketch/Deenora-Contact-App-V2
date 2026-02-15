
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
import Teachers from './pages/Teachers';
import { View, Class, Student, Language, Madrasah, Teacher } from './types';
import { WifiOff, Loader2, AlertCircle, RefreshCw, X, Sparkles, Zap, ShieldAlert } from 'lucide-react';
import { t } from './translations';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
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
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'bn';
  });

  const APP_VERSION = "2.4.0-PREMIUM";

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
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_') || key === 'sync_queue') {
          localStorage.removeItem(key);
        }
      });
      window.location.replace(window.location.origin + window.location.pathname + '?v=' + Date.now());
    } catch (err) {
      window.location.reload();
    }
  };

  useEffect(() => {
    // Check for Teacher session first
    const savedTeacher = localStorage.getItem('teacher_session');
    if (savedTeacher) {
      const teacherData = JSON.parse(savedTeacher);
      setTeacher(teacherData);
      setMadrasah({ id: teacherData.madrasah_id, name: teacherData.madrasahs.name, logo_url: teacherData.madrasahs.logo_url } as any);
      setLoading(false);
      return;
    }

    // Otherwise check Supabase Auth
    (supabase.auth as any).getSession().then(({ data: { session: currentSession } }: any) => {
      setSession(currentSession);
      if (currentSession) {
        fetchMadrasahProfileWithRetry(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) {
        fetchMadrasahProfileWithRetry(session.user.id);
      } else {
        setMadrasah(null);
        setLoading(false);
        setError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchMadrasahProfileWithRetry = async (userId: string, retries = 2) => {
    try {
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
        const { data: newData } = await supabase
          .from('madrasahs')
          .insert({ id: userId, name: 'নতুন মাদরাসা', is_active: true, balance: 0 })
          .select()
          .single();
        setMadrasah(newData);
      }
      setLoading(false);
    } catch (err) {
      if (retries > 0) setTimeout(() => fetchMadrasahProfileWithRetry(userId, retries - 1), 1000);
      else { setError("Connectivity issue"); setLoading(false); }
    }
  };

  const logout = () => {
    if (teacher) {
      localStorage.removeItem('teacher_session');
      window.location.reload();
    } else {
      (supabase.auth as any).signOut();
    }
  };

  const navigateTo = (newView: View) => {
    // Teacher permission checks
    if (teacher) {
      if (newView === 'classes' && !teacher.permissions.can_manage_classes && !teacher.permissions.can_manage_students) return;
      if (newView === 'wallet-sms' && !teacher.permissions.can_send_sms) return;
      if (newView === 'admin-panel' || newView === 'admin-dashboard' || newView === 'admin-approvals') return;
    }
    triggerRefresh();
    setView(newView);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#9D50FF] text-white">
        <Loader2 className="animate-spin mb-4 text-white" size={40} />
        <p className="font-black text-[10px] uppercase tracking-[0.2em] opacity-40">Loading Portal...</p>
      </div>
    );
  }

  if (!session && !teacher) return <Auth lang={lang} />;

  const isSuperAdmin = madrasah?.is_super_admin === true;

  return (
    <div className="relative h-full w-full bg-transparent">
      {(!isOnline || syncing) && (
        <div className="absolute top-0 left-0 right-0 bg-white/60 backdrop-blur-md text-[#2E0B5E] text-[10px] font-black py-1.5 px-4 z-[60] flex items-center justify-center gap-2 uppercase tracking-widest border-b border-[#8D30F4]/10">
          {syncing ? <><RefreshCw size={12} className="animate-spin text-[#8D30F4]" /> Syncing...</> : <><WifiOff size={10} className="text-red-400" /> Offline Mode</>}
        </div>
      )}
      
      <Layout 
        currentView={view} 
        setView={navigateTo} 
        lang={lang} 
        madrasah={madrasah} 
        onUpdateClick={() => setShowUpdateModal(true)}
        isTeacher={!!teacher}
      >
        {view === 'home' && (
          isSuperAdmin ? <AdminPanel lang={lang} currentView="list" /> : 
          <Home onStudentClick={(s) => { setSelectedStudent(s); setView('student-details'); }} lang={lang} dataVersion={dataVersion} triggerRefresh={triggerRefresh} />
        )}
        
        {view === 'classes' && (
          <Classes onClassClick={(cls) => { setSelectedClass(cls); setView('students'); }} lang={lang} madrasah={madrasah} dataVersion={dataVersion} triggerRefresh={triggerRefresh} readOnly={teacher && !teacher.permissions.can_manage_classes} />
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
            canAdd={!teacher || (teacher && teacher.permissions.can_manage_students)}
            canSendSMS={!teacher || (teacher && teacher.permissions.can_send_sms)}
          />
        )}

        {view === 'student-details' && selectedStudent && <StudentDetails student={selectedStudent} onEdit={() => { setIsEditing(true); setView('student-form'); }} onBack={() => setView(selectedClass ? 'students' : 'home')} lang={lang} readOnly={teacher && !teacher.permissions.can_manage_students} />}
        {view === 'student-form' && <StudentForm student={selectedStudent} madrasah={madrasah} defaultClassId={selectedClass?.id} isEditing={isEditing} onSuccess={() => { triggerRefresh(); setView(selectedClass ? 'students' : 'home'); }} onCancel={() => setView(selectedStudent ? 'student-details' : (selectedClass ? 'students' : 'home'))} lang={lang} />}
        {view === 'wallet-sms' && <WalletSMS lang={lang} madrasah={madrasah} triggerRefresh={triggerRefresh} dataVersion={dataVersion} />}
        {view === 'teachers' && <Teachers lang={lang} madrasah={madrasah} onBack={() => setView('account')} />}
        {view === 'data-management' && <DataManagement lang={lang} madrasah={madrasah} onBack={() => setView('account')} triggerRefresh={triggerRefresh} />}
        
        {view === 'account' && (
          <Account 
            lang={lang} 
            setLang={(l) => { setLang(l); localStorage.setItem('app_lang', l); }} 
            onProfileUpdate={() => triggerRefresh()} 
            setView={setView} 
            isSuperAdmin={isSuperAdmin} 
            initialMadrasah={madrasah} 
            onLogout={logout}
            isTeacher={!!teacher}
          />
        )}

        {isSuperAdmin && view === 'admin-dashboard' && <AdminPanel lang={lang} currentView="dashboard" />}
        {isSuperAdmin && view === 'admin-approvals' && <AdminPanel lang={lang} currentView="approvals" />}
        
        <div className="mt-8 mb-4 text-center opacity-30 select-none">
           <span className="text-[9px] font-black text-white uppercase tracking-widest">{APP_VERSION}</span>
        </div>
      </Layout>
    </div>
  );
};

export default App;
