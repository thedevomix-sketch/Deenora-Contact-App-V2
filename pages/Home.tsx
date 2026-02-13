
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
      } catch (err) { console.error(err); } finally { setLoadingRecent(false); }
    } else { setLoadingRecent(false); }
  };

  useEffect(() => { fetchRecentCalls(); }, [dataVersion]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    if (!navigator.onLine) {
      const all = offlineApi.getCache('all_students_search') || [];
      setSearchResults(all.filter((s: Student) => s.student_name.toLowerCase().includes(query.toLowerCase())).slice(0, 10));
      return;
    }
    setLoadingSearch(true);
    try {
      const { data } = await supabase.from('students').select('*, classes(*)').ilike('student_name', `%${query}%`).limit(10);
      if (data) setSearchResults(data);
    } catch (err) { console.error(err); } finally { setLoadingSearch(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const initiateCall = (phone: string) => {
     window.location.href = `tel:${phone.replace(/\D/g, '')}`;
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Premium Search Input - Vibrant Theme */}
      <div className="relative group">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#4B168A] group-focus-within:scale-110 transition-transform">
          <Search size={22} strokeWidth={3} />
        </div>
        <input
          type="text"
          placeholder={t('search_placeholder', lang)}
          className="w-full pl-16 pr-6 py-5 bg-white/90 border-2 border-[#8D30F4]/20 rounded-[2.2rem] outline-none text-[#2D3142] placeholder:text-[#9B6DFF] font-black text-base focus:border-[#8D30F4] shadow-xl transition-all backdrop-blur-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {searchQuery.length > 0 && (
        <div className="space-y-4 animate-in slide-in-from-top-4">
          <h2 className="text-[12px] font-black text-white uppercase tracking-[0.2em] px-4 drop-shadow-md">সার্চ ফলাফল</h2>
          {searchResults.map(student => (
            <div key={student.id} onClick={() => onStudentClick(student)} className="bg-white/95 p-6 rounded-[2.2rem] border-l-8 border-l-[#8D30F4] border border-white/20 flex items-center justify-between shadow-xl active:scale-[0.98] transition-transform">
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-[#4B168A] text-[20px] font-noto truncate leading-tight">{student.student_name}</h3>
                <p className="text-[11px] text-[#A179FF] font-black uppercase mt-1 tracking-widest">{student.classes?.class_name || 'N/A'}</p>
              </div>
              <div className="w-12 h-12 bg-[#8D30F4] rounded-2xl flex items-center justify-center text-white shadow-lg">
                <Phone size={22} fill="currentColor" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-[12px] font-black text-white uppercase tracking-[0.3em] drop-shadow-md">{t('recent_calls', lang)}</h2>
          <button onClick={() => fetchRecentCalls(true)} className="p-2.5 bg-white/20 rounded-xl text-white backdrop-blur-md active:scale-95 transition-all">
            <RefreshCw size={18} strokeWidth={3} className={loadingRecent ? 'animate-spin' : ''} />
          </button>
        </div>
        
        {loadingRecent && recentCalls.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white/30 animate-pulse rounded-[2.5rem] border border-white/10"></div>)}
          </div>
        ) : recentCalls.length > 0 ? (
          <div className="space-y-4">
            {recentCalls.map(call => (
              <div key={call.id} onClick={() => call.students && onStudentClick(call.students)} className="bg-white/95 p-6 rounded-[2.5rem] border border-white/40 flex items-center justify-between shadow-xl active:scale-[0.98] transition-all group backdrop-blur-lg">
                <div className="flex items-center gap-5 min-w-0 flex-1">
                  <div className="w-16 h-16 bg-[#F2EBFF] rounded-[1.5rem] flex items-center justify-center text-[#8D30F4] shrink-0 border border-[#8D30F4]/10 shadow-inner">
                    <UserIcon size={30} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-[#4B168A] text-[19px] font-noto truncate leading-tight tracking-tight">{call.students?.student_name || 'অজানা'}</h3>
                    <div className="flex items-center gap-2 mt-2">
                       <Clock size={14} className="text-[#A179FF]" />
                       <span className="text-[11px] font-black text-[#A179FF] uppercase tracking-[0.1em]">
                         {new Date(call.called_at).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                   <div onClick={(e) => { e.stopPropagation(); call.students && initiateCall(call.students.guardian_phone) }} className="w-14 h-14 premium-btn text-white rounded-[1.2rem] flex items-center justify-center shadow-lg active:scale-90 transition-all">
                     <Phone size={24} fill="currentColor" />
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white/10 rounded-[3rem] border-2 border-dashed border-white/30 backdrop-blur-sm">
            <p className="text-white/60 text-sm font-black uppercase tracking-[0.2em] leading-relaxed drop-shadow-sm">
              No History<br/>Found
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
