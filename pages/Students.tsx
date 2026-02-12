
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Phone, Search, ChevronRight, Hash } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
import { Class, Student, Language } from '../types';
import { t } from '../translations';

interface StudentsProps {
  selectedClass: Class;
  onStudentClick: (student: Student) => void;
  onAddClick: () => void;
  onBack: () => void;
  lang: Language;
  dataVersion: number;
  triggerRefresh: () => void;
}

const Students: React.FC<StudentsProps> = ({ selectedClass, onStudentClick, onAddClick, onBack, lang, dataVersion, triggerRefresh }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const cacheKey = `students_list_${selectedClass.id}`;

  useEffect(() => {
    fetchStudents();
  }, [selectedClass.id, dataVersion]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const lowerQuery = searchQuery.toLowerCase();
    return students.filter(s => s.student_name.toLowerCase().includes(lowerQuery));
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    setLoading(true);
    const cached = offlineApi.getCache(cacheKey);
    if (cached) {
      setStudents(cached);
      setLoading(false);
    }

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*, classes(*)')
          .eq('class_id', selectedClass.id)
          .order('roll', { ascending: true, nullsFirst: false })
          .order('student_name', { ascending: true });
        
        if (error) throw error;
        if (data) {
          setStudents(data);
          offlineApi.setCache(cacheKey, data);
        }
      } catch (err) {
        console.error("Fetch Students Error:", err);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const recordCall = async (student: Student) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { student_id: student.id, guardian_phone: student.guardian_phone, madrasah_id: user.id };
    if (navigator.onLine) await supabase.from('recent_calls').insert(payload);
    else offlineApi.queueAction('recent_calls', 'INSERT', payload);
    triggerRefresh();
  };

  const initiateCall = async (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    await recordCall(student);
    window.location.href = `tel:${student.guardian_phone}`;
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 relative pb-32">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 bg-white/10 rounded-xl text-white active:scale-90 transition-all border border-white/20 backdrop-blur-md">
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-white truncate drop-shadow-sm font-noto">{selectedClass.class_name}</h1>
            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">
              {loading ? '...' : students.length} {t('students_count', lang)}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
          <input
            type="text"
            placeholder={t('search_placeholder', lang)}
            className="w-full pl-11 pr-5 py-3.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl outline-none text-white placeholder:text-white/40 font-bold text-sm focus:bg-white/25 transition-all shadow-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading && students.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-white/10 animate-pulse rounded-[2rem]"></div>)}
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="space-y-3">
          {filteredStudents.map(student => (
            <div 
              key={student.id} 
              onClick={() => onStudentClick(student)}
              className="p-4 rounded-[2rem] bg-white/10 backdrop-blur-md border border-white/15 active:bg-white/20 transition-all animate-in slide-in-from-bottom-2 flex items-center justify-between shadow-lg relative overflow-hidden"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Roll Number Box - Displayed instead of Photo */}
                <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center border shrink-0 bg-white/10 border-white/10 shadow-inner text-white">
                  <span className="text-[7px] font-black opacity-40 uppercase leading-none">Roll</span>
                  <span className="text-lg font-black leading-tight">{student.roll || '-'}</span>
                </div>
                
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-white text-base font-noto truncate pr-1 leading-normal">
                    {student.student_name}
                  </h3>
                  <p className="text-[10px] font-bold text-white/40 truncate">{student.guardian_name || '-'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={(e) => initiateCall(e, student)}
                  className="bg-white text-[#d35132] p-2.5 rounded-xl shadow-xl active:scale-90 transition-all"
                >
                  <Phone size={18} strokeWidth={3} fill="currentColor" />
                </button>
                <ChevronRight size={18} className="text-white/20" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/20">
          <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">{t('no_students', lang)}</p>
        </div>
      )}

      <div className="fixed bottom-28 right-6 z-50 pointer-events-none">
        <button 
          onClick={onAddClick}
          className="pointer-events-auto bg-white text-[#d35132] p-5 rounded-full shadow-2xl active:scale-90 transition-all border-4 border-white/20 flex items-center justify-center hover:bg-white/90"
        >
          <Plus size={32} strokeWidth={3.5} />
        </button>
      </div>
    </div>
  );
};

export default Students;
