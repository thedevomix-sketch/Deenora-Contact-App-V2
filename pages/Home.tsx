
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Clock, User as UserIcon, RefreshCw, PhoneCall, X, MessageCircle, Phone } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
import { Student, RecentCall, Language } from '../types';
import { t } from '../translations';

interface HomeProps {
  onStudentClick: (student: Student) => void;
  lang: Language;
  dataVersion: number;
  triggerRefresh: () => void;
  madrasahId?: string;
}

const Home: React.FC<HomeProps> = ({ onStudentClick, lang, dataVersion, triggerRefresh, madrasahId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const fetchRecentCalls = async (isManual = false) => {
    if (!madrasahId) {
      setLoadingRecent(false);
      return;
    }
    
    if (isManual) setLoadingRecent(true);
    
    // Check cache first for instant UI
    const cached = offlineApi.getCache('recent_calls');
    if (cached && !isManual) setRecentCalls(cached);

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('recent_calls')
          .select('*, students(*, classes(*))')
          .eq('madrasah_id', madrasahId)
          .order('called_at', { ascending: false })
          .limit(15);
        
        if (error) {
          console.error("Supabase Fetch Error:", error.message);
          throw error;
        }
        
        if (data) {
          // Filter out calls where student data might be missing due to RLS or deletion
          const validCalls = data.filter(call => call.students);
          setRecentCalls(validCalls);
          offlineApi.setCache('recent_calls', validCalls);
        }
      } catch (err) { 
        console.error("Critical Fetch Error:", err); 
      } finally { 
        setLoadingRecent(false); 
      }
    } else { 
      setLoadingRecent(false); 
    }
  };

  useEffect(() => { 
    fetchRecentCalls(); 
  }, [dataVersion, madrasahId]);

  const recordCall = async (studentId: string) => {
    if (!madrasahId || !studentId) return;
    try {
      const { error } = await supabase.from('recent_calls').insert({
        madrasah_id: madrasahId,
        student_id: studentId,
        called_at: new Date().toISOString()
      });
      
      if (error) {
        console.error("Recording Call Failed:", error.message);
      }
      
      // Force refresh data
      triggerRefresh();
    } catch (e) {
      console.error("Call Recording Exception:", e);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || !madrasahId) { setSearchResults([]); return; }
    
    if (!navigator.onLine) {
      const all = offlineApi.getCache('all_students_search') || [];
      setSearchResults(all.filter((s: Student) => s.student_name.toLowerCase().includes(query.toLowerCase())).slice(0, 10));
      return;
    }
    
    setLoadingSearch(true);
    try {
      const { data } = await supabase
        .from('students')
        .select('*, classes(*)')
        .eq('madrasah_id', madrasahId)
        .ilike('student_name', `%${query}%`)
        .limit(10);
      if (data) setSearchResults(data);
    } catch (err) { console.error(err); } finally { setLoadingSearch(false); }
  }, [madrasahId]);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const initiateNormalCall = (studentId: string, phone: string) => {
    recordCall(studentId);
    window.location.href = `tel:${phone}`;
  };

  const initiateWhatsAppCall = (studentId: string, phone: string) => {
     recordCall(studentId);
     window.location.href = `https://wa.me/88${phone.replace(/\D/g, '')}`;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="relative z-20 group px-1">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#8D30F4] to-[#A179FF] rounded-[2.2rem] blur opacity-10 group-focus-within:opacity-30 transition duration-500"></div>
        <div className="relative flex items-center">
          <div className="absolute left-6 text-[#8D30F4] transition-all duration-300 group-focus-within:scale-110 group-focus-within:rotate-12 z-10">
            <Search size={22} strokeWidth={2.5} />
          </div>
          <input
            type="text"
            placeholder={t('search_placeholder', lang)}
            className="w-full pl-16 pr-14 py-5 bg-white/95 backdrop-blur-2xl border border-white/50 rounded-[2rem] outline-none text-[#2E0B5E] placeholder:text-[#9B6DFF]/60 font-bold text-base shadow-[0_15px_40px_-10px_rgba(46,11,94,0.2)] focus:shadow-[0_20px_60px_-10px_rgba(141,48,244,0.3)] focus:border-[#8D30F4]/30 transition-all duration-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="absolute right-5 p-2 bg-[#F2EBFF] text-[#8D30F4] rounded-2xl hover:bg-[#8D30F4] hover:text-white active:scale-90 transition-all duration-200 shadow-sm flex items-center justify-center z-10"
            >
              <X size={18} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {searchQuery.length > 0 && (
        <div className="space-y-2.5 animate-in slide-in-from-top-3 px-1">
          <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] px-3 drop-shadow-md opacity-80">
            {loadingSearch ? (lang === 'bn' ? 'খোঁজা হচ্ছে...' : 'Searching...') : (lang === 'bn' ? 'সার্চ ফলাফল' : 'Search Results')}
          </h2>
          {searchResults.map(student => (
            <div key={student.id} onClick={() => onStudentClick(student)} className="bg-white/95 p-4 rounded-[1.8rem] border-l-4 border-l-[#8D30F4] border border-white/40 flex items-center justify-between shadow-xl active:scale-[0.98] transition-all group backdrop-blur-lg">
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-[#4B168A] text-[16px] font-noto truncate leading-tight tracking-tight">{student.student_name}</h3>
                <p className="text-[9px] text-[#A179FF] font-black uppercase mt-1 tracking-widest">{student.classes?.class_name || 'N/A'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                 <div onClick={(e) => { e.stopPropagation(); initiateNormalCall(student.id, student.guardian_phone) }} className="w-10 h-10 bg-[#8D30F4]/10 text-[#8D30F4] rounded-xl flex items-center justify-center shadow-sm active:scale-90 transition-all border border-[#8D30F4]/10">
                   <Phone size={20} fill="currentColor" />
                 </div>
                 <div onClick={(e) => { e.stopPropagation(); initiateWhatsAppCall(student.id, student.guardian_phone) }} className="w-10 h-10 bg-[#25d366] text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all border border-white/20">
                   <PhoneCall size={20} fill="currentColor" />
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3.5 px-1">
        <div className="flex items-center justify-between px-3">
          <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em] drop-shadow-md opacity-80">{t('recent_calls', lang)}</h2>
          <button onClick={() => fetchRecentCalls(true)} className="p-2 bg-white/20 rounded-xl text-white backdrop-blur-md active:scale-95 transition-all">
            <RefreshCw size={14} strokeWidth={3} className={loadingRecent ? 'animate-spin' : ''} />
          </button>
        </div>
        
        {loadingRecent && recentCalls.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/30 animate-pulse rounded-[1.8rem]"></div>)}
          </div>
        ) : recentCalls.length > 0 ? (
          <div className="space-y-2.5">
            {recentCalls.map(call => (
              <div key={call.id} onClick={() => call.students && onStudentClick(call.students)} className="bg-white/95 p-4 rounded-[1.8rem] border border-white/40 flex items-center justify-between shadow-xl active:scale-[0.98] transition-all group backdrop-blur-lg">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-11 h-11 bg-gradient-to-br from-[#F2EBFF] to-white rounded-2xl flex items-center justify-center text-[#8D30F4] shrink-0 border border-[#8D30F4]/10 shadow-inner">
                    <UserIcon size={24} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-[#4B168A] text-[16px] font-noto truncate leading-tight tracking-tight">{call.students?.student_name || 'অজানা'}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <Clock size={11} className="text-[#A179FF]" />
                       <span className="text-[9px] font-black text-[#A179FF] uppercase tracking-[0.05em]">
                         {new Date(call.called_at).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                   <div onClick={(e) => { e.stopPropagation(); call.students && initiateNormalCall(call.students.id, call.students.guardian_phone) }} className="w-10 h-10 bg-[#8D30F4]/10 text-[#8D30F4] rounded-xl flex items-center justify-center shadow-sm active:scale-90 transition-all border border-[#8D30F4]/10">
                     <Phone size={20} fill="currentColor" />
                   </div>
                   <div onClick={(e) => { e.stopPropagation(); call.students && initiateWhatsAppCall(call.students.id, call.students.guardian_phone) }} className="w-10 h-10 bg-[#25d366] text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all border border-white/20">
                     <PhoneCall size={20} fill="currentColor" />
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/10 rounded-[3rem] border-2 border-dashed border-white/30 backdrop-blur-sm">
            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-sm">
              No History Found
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
