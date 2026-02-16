
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
import { WifiOff, Loader2, RefreshCw, AlertCircle, Copy, CheckCircle, UserPlus } from 'lucide-react';
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
  const [copiedUid, setCopiedUid] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'bn';
  });

  const APP_VERSION = "2.9.0-REPAIR";

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
        setProfileNotFound(false);
      } else {
        setMadrasah(null);
        setProfileNotFound(true);
      }
    } catch (err) {
      console.error("Profile Fetch Error", err);
      setProfileNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const repairProfile = async () => {
    if (!session?.user?.id) return;
    setIsRepairing(true);
    try {
      // এটি আপনার বর্তমান লগইন করা ID দিয়ে একটি প্রোফাইল রেকর্ড তৈরি করার চেষ্টা করবে
      const { error } = await supabase.from('madrasahs').insert({
        id: session.user.id,
        name: 'নতুন মাদরাসা অ্যাডমিন',
        is_active: true,
        is_super_admin: false // ডিফল্ট হিসেবে false, আপনি পরে SQL দিয়ে Super Admin করতে পারবেন
      });

      if (error) {
        alert("Error creating profile: " + error.message);
      } else {
        await fetchMadrasahProfile(session.user.id);
      }
    } catch (err: any) {
      alert("Failed to repair: " + err.message);
    } finally {
      setIsRepairing(false);
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

  const copyUid = () => {
    if (session?.user?.id) {
      navigator.clipboard.writeText(session.user.id);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#9D50FF] text-white">
        <Loader2 className="animate-spin mb-4 text-white" size={40} />
        <p className="font-black text-[10px] uppercase tracking-[0.2em] opacity-40">System Checking...</p>
      </div>
    );
  }

  // Profile Not Found Screen
  if (profileNotFound && session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#9D50FF] text-white p-8 text-center animate-in fade-in">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 border border-white/30">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-black mb-2 font-noto tracking-tight">প্রোফাইল নেই!</h2>
        <p className="opacity-70 text-sm font-bold mb-6 leading-relaxed font-noto max-w-xs mx-auto">
          আপনার ইমেইল দিয়ে লগইন হয়েছে, কিন্তু ডাটাবেসে প্রোফাইলটি নেই। নিচের বাটনে ক্লিক করে প্রোফাইলটি তৈরি করে নিন।
        </p>
        
        <div className="flex flex-col gap-3 w-full max-w-xs mb-8">
          <button 
            onClick={repairProfile} 
            disabled={isRepairing}
            className="w-full py-5 bg-white text-[#8D30F4] font-black rounded-full shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            {isRepairing ? <Loader2 className="animate-spin" size={24} /> : <><UserPlus size={24} /> প্রোফাইল তৈরি করুন</>}
          </button>
          <button onClick={() => fetchMadrasahProfile(session.user.id)} className="w-full py-4 bg-white/10 text-white font-black rounded-full border border-white/20 flex items-center justify-center gap-2">
            <RefreshCw size={20} /> পুনরায় চেক করুন
          </button>
        </div>

        <div className="w-full max-w-xs bg-black/20 rounded-2xl p-4 mb-4 border border-white/10 flex flex-col items-center gap-2">
           <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Your Session ID</p>
           <div className="flex items-center gap-3 w-full">
              <code className="bg-black/20 px-3 py-2 rounded-lg text-[11px] font-mono flex-1 overflow-hidden truncate">
                {session.user.id}
              </code>
              <button onClick={copyUid} className="p-2 bg-white text-[#8D30F4] rounded-lg active:scale-90 transition-all">
                {copiedUid ? <CheckCircle size={18} /> : <Copy size={18} />}
              </button>
           </div>
        </div>

        <button onClick={logout} className="text-white/40 text-xs font-black uppercase tracking-widest hover:text-white transition-colors">
            লগ আউট
        </button>
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
