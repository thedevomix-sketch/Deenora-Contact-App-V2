
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
import { WifiOff, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { t } from './translations';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('home');
  const [madrasah, setMadrasah] = useState<Madrasah | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dataVersion, setDataVersion] = useState(0); 
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'bn';
  });

  const APP_VERSION = "2.7.0-PREMIUM";

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
    setLoading(true);
    setProfileNotFound(false);
    try {
      const { data, error } = await supabase
        .from('madrasahs')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (data) {
        setMadrasah(data);
        offlineApi.setCache('profile', data);
      } else {
        setMadrasah(null);
        setProfileNotFound(true);
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
        setMadrasah(null);
        setTeacher(null);
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
    setProfileNotFound(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#9D50FF] text-white">
        <Loader2 className="animate-spin mb-4 text-white" size={40} />
        <p className="font-black text-[10px] uppercase tracking-[0.2em] opacity-40">Portal Initializing...</p>
      </div>
    );
  }

  // Profile Not Found Screen (গ্রেসফুল হ্যান্ডলিং)
  if (profileNotFound && session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#9D50FF] text-white p-8 text-center">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 border border-white/30">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-black mb-2 font-noto tracking-tight">প্রোফাইল পাওয়া যায়নি</h2>
        <p className="opacity-70 text-sm font-bold mb-8 leading-relaxed font-noto">
          আপনার ইমেইল দিয়ে ইউজার তৈরি করা হয়েছে, কিন্তু ডাটাবেসে কোনো রেকর্ড নেই। দয়া করে এডমিনের মাধ্যমে আপনার প্রোফাইল তৈরি করিয়ে নিন।
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={() => fetchMadrasahProfile(session.user.id)} className="w-full py-5 bg-white text-[#8D30F4] font-black rounded-full shadow-xl flex items-center justify-center gap-2">
            <RefreshCw size={20} /> পুনরায় চেষ্টা করুন
          </button>
          <button onClick={logout} className="w-full py-4 bg-white/10 text-white font-black rounded-full border border-white/20">
            লগ আউট
          </button>
        </div>
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
