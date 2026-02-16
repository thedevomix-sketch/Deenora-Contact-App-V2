
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
import { WifiOff, Loader2, RefreshCw } from 'lucide-react';
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
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'bn';
  });

  const APP_VERSION = "2.6.0-PREMIUM";

  const triggerRefresh = () => {
    setDataVersion(prev => prev + 1);
  };

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const fetchMadrasahProfile = async (userId: string) => {
    if (!userId) return;
    try {
      // আমরা এখন আর অটোমেটিক প্রোফাইল তৈরি করবো না।
      // শুধুমাত্র ডাটাবেস থেকে তথ্য নিয়ে আসার চেষ্টা করবো।
      const { data, error } = await supabase
        .from('madrasahs')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (data) {
        setMadrasah(data);
        offlineApi.setCache('profile', data);
      } else {
        // প্রোফাইল না থাকলে সেট করা হবে না, অ্যাকাউন্ট পেজে এরর দেখাবে
        setMadrasah(null);
        offlineApi.removeCache('profile');
      }
    } catch (err) {
      console.error("Profile Fetch Error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session: currentSession } } = await (supabase.auth as any).getSession();
      setSession(currentSession);
      if (currentSession) {
        await fetchMadrasahProfile(currentSession.user.id);
      } else {
        const savedTeacher = localStorage.getItem('teacher_session');
        if (savedTeacher) {
          const teacherData = JSON.parse(savedTeacher);
          setTeacher(teacherData);
          setMadrasah({ id: teacherData.madrasah_id, name: 'Teacher Portal', is_active: true } as any);
        }
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session) {
        fetchMadrasahProfile(session.user.id);
      } else {
        if (!localStorage.getItem('teacher_session')) {
          setMadrasah(null);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = () => {
    localStorage.removeItem('teacher_session');
    (supabase.auth as any).signOut();
    setMadrasah(null);
    setSession(null);
    setTeacher(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#9D50FF] text-white">
        <Loader2 className="animate-spin mb-4 text-white" size={40} />
        <p className="font-black text-[10px] uppercase tracking-[0.2em] opacity-40">Loading Profile...</p>
      </div>
    );
  }

  if (!session && !teacher) return <Auth lang={lang} />;

  const isSuperAdmin = madrasah?.is_super_admin === true;

  return (
    <div className="relative h-full w-full bg-transparent">
      <Layout 
        currentView={view} 
        setView={(v) => { triggerRefresh(); setView(v); }} 
        lang={lang} 
        madrasah={madrasah}
        teacher={teacher}
      >
        {view === 'home' && (
          isSuperAdmin ? <AdminPanel lang={lang} currentView="list" /> : 
          <Home 
            onStudentClick={(s) => { setSelectedStudent(s); setView('student-details'); }} 
            lang={lang} 
            dataVersion={dataVersion} 
            triggerRefresh={triggerRefresh}
            madrasahId={madrasah?.id}
          />
        )}
        
        {view === 'classes' && <Classes onClassClick={(cls) => { setSelectedClass(cls); setView('students'); }} lang={lang} madrasah={madrasah} dataVersion={dataVersion} triggerRefresh={triggerRefresh} />}
        {view === 'students' && selectedClass && <Students selectedClass={selectedClass} onStudentClick={(s) => { setSelectedStudent(s); setView('student-details'); }} onAddClick={() => { setSelectedStudent(null); setIsEditing(false); setView('student-form'); }} onBack={() => setView('classes')} lang={lang} dataVersion={dataVersion} triggerRefresh={triggerRefresh} madrasahId={madrasah?.id} />}
        {view === 'student-details' && selectedStudent && <StudentDetails student={selectedStudent} onEdit={() => { setIsEditing(true); setView('student-form'); }} onBack={() => setView('home')} lang={lang} madrasahId={madrasah?.id} triggerRefresh={triggerRefresh} />}
        {view === 'student-form' && <StudentForm student={selectedStudent} madrasah={madrasah} defaultClassId={selectedClass?.id} isEditing={isEditing} onSuccess={() => { triggerRefresh(); setView('home'); }} onCancel={() => setView('home')} lang={lang} />}
        {view === 'wallet-sms' && <WalletSMS lang={lang} madrasah={madrasah} triggerRefresh={triggerRefresh} dataVersion={dataVersion} />}
        {view === 'teachers' && <Teachers lang={lang} madrasah={madrasah} onBack={() => setView('account')} />}
        {view === 'data-management' && <DataManagement lang={lang} madrasah={madrasah} onBack={() => setView('account')} triggerRefresh={triggerRefresh} />}
        {view === 'account' && <Account lang={lang} setLang={setLang} setView={setView} isSuperAdmin={isSuperAdmin} initialMadrasah={madrasah} onLogout={logout} isTeacher={!!teacher} />}
        {isSuperAdmin && view === 'admin-dashboard' && <AdminPanel lang={lang} currentView="dashboard" />}
        {isSuperAdmin && view === 'admin-approvals' && <AdminPanel lang={lang} currentView="approvals" />}
      </Layout>
    </div>
  );
};

export default App;
