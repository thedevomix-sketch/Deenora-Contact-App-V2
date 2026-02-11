
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Phone, Clock, User as UserIcon, RefreshCw } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
import { Student, RecentCall, Language } from '../types';
import { t } from '../translations';

interface HomeProps {
  onStudentClick: (student: Student) => void;
  lang: Language;
  dataVersion: number;
  triggerRefresh: () => void;
}

const Home: React.FC<HomeProps> = ({ onStudentClick, lang, dataVersion, triggerRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const fetchRecentCalls = async (isManual = false) => {
    if (isManual) setLoadingRecent(true);
    
    // Load from cache first
    const cached = offlineApi.getCache('recent_calls');
    if (cached) setRecentCalls(cached);

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('recent_calls')
          .select('*, students(*, classes(*))')
          .order('called_at', { ascending: false })
          .limit(10);
        
        if (!error && data) {
          setRecentCalls(data);
          offlineApi.setCache('recent_calls', data);
        }
      } catch (err) {
        console.error("Recent calls fetch error:", err);
      } finally {
        setLoadingRecent(false);
      }
    } else {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchRecentCalls();
  }, [dataVersion]);

  // Fix: Corrected syntax error by removing extra parenthesis in catch block
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    // Try offline search from all cached students if possible
    const allStudents = offlineApi.getCache('all_students_search') || [];
    if (!navigator.onLine) {
      setSearchResults(allStudents.filter((s: Student) => 
        s.student_name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10));
      return;
    }

    setLoadingSearch(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, classes(*)')
        .ilike('student_name', `%${query}%`)
        .limit(10);
      
      if (!error && data) {
        setSearchResults(data);
        // Slowly build a master list for offline search
        const currentMaster = offlineApi.getCache('all_students_search') || [];
        const newIds = new Set(data.map(s => s.id));
        const filteredMaster = currentMaster.filter((s: Student) => !newIds.has(s.id));
        offlineApi.setCache('all_students_search', [...filteredMaster, ...data].slice(0, 500));
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const recordCall = async (student: Student) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const payload = {
      student_id: student.id,
      guardian_phone: student.guardian_phone,
      madrasah_id: user.id
    };

    if (navigator.onLine) {
      await supabase.from('recent_calls').insert(payload);
      triggerRefresh();
    } else {
      offlineApi.queueAction('recent_calls', 'INSERT', payload);
      // Manually add to UI for instant feedback
      const newCall: RecentCall = {
        id: 'temp_' + Date.now(),
        student_id: student.id,
        guardian_phone: student.guardian_phone,
        madrasah_id: user.id,
        called_at: new Date().toISOString(),
        students: student
      };
      setRecentCalls(prev => [newCall, ...prev.slice(0, 9)]);
      offlineApi.setCache('recent_calls', [newCall, ...recentCalls.slice(0, 9)]);
    }
  };

  const initiateCall = async (student: Student) => {
    await recordCall(student);
    window.location.href = `tel:${student.guardian_phone}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
        <input
          type="text"
          placeholder={t('search_placeholder', lang)}
          className="w-full pl-11 pr-5 py-3.5 bg-white/15 backdrop-blur-xl border border-white/20 rounded-2xl focus:bg-white/25 outline-none text-white placeholder:text-white/40 font-bold text-base transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {searchQuery.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[11px] font-black text-white/60 uppercase tracking-widest px-2">{lang === 'bn' ? 'অনুসন্ধান ফলাফল' : 'Search Results'}</h2>
          {loadingSearch ? (
            <div className="text-center py-4 text-white/40 text-sm italic">{lang === 'bn' ? 'খোঁজা হচ্ছে...' : 'Searching...'}</div>
          ) : searchResults.length > 0 ? (
            searchResults.map(student => (
              <div 
                key={student.id} 
                className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/15 flex items-center justify-between animate-in slide-in-from-bottom-1"
              >
                <div onClick={() => onStudentClick(student)} className="flex-1 pr-3 min-w-0">
                  <h3 className="font-black text-white text-base font-noto truncate pr-1 leading-normal">
                    {student.student_name}
                  </h3>
                  <p className="text-[10px] text-white/60 font-black uppercase mt-0.5">{student.classes?.class_name || 'N/A'}</p>
                </div>
                <button onClick={() => initiateCall(student)} className="bg-white text-[#d35132] p-3 rounded-2xl active:scale-90 transition-all shadow-lg shrink-0">
                  <Phone size={18} strokeWidth={3} />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-white/40 text-sm">{t('no_students', lang)}</div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[11px] font-black text-white/60 uppercase tracking-widest">{t('recent_calls', lang)}</h2>
          <button onClick={() => fetchRecentCalls(true)} className="text-white/40 active:rotate-180 transition-transform p-1">
             <RefreshCw size={14} />
          </button>
        </div>
        
        {loadingRecent && recentCalls.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-[1.8rem]"></div>)}
          </div>
        ) : recentCalls.length > 0 ? (
          recentCalls.map(call => (
            <div 
              key={call.id} 
              className="bg-white/10 backdrop-blur-md p-3.5 rounded-3xl border border-white/15 flex items-center justify-between active:bg-white/20 transition-all animate-in slide-in-from-bottom-2"
            >
              <div onClick={() => call.students && onStudentClick(call.students)} className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0 pr-2">
                <div className="bg-white/10 p-2.5 rounded-xl text-white/80 shrink-0"><UserIcon size={20} /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-white text-[16px] font-noto truncate leading-normal pr-1 block">
                    {call.students?.student_name || 'Unknown'}
                  </h3>
                  <div className="flex items-center gap-1 text-[9px] text-white/50 mt-1 font-black uppercase">
                    <Clock size={11} />
                    {new Date(call.called_at).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <button onClick={() => call.students && initiateCall(call.students)} className="bg-white text-[#d35132] p-2.5 rounded-xl shrink-0 active:scale-90 transition-transform shadow-md">
                <Phone size={16} strokeWidth={3} />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">{t('no_calls', lang)}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
