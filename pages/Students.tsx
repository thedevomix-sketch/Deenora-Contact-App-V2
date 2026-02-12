
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Phone, Search, Loader2, MessageSquare, CheckCircle2, Circle, X, User as UserIcon } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
import { Class, Student, Language, Madrasah } from '../types';
import { t } from '../translations';
import SMSModal from '../components/SMSModal';

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
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [madrasah, setMadrasah] = useState<Madrasah | null>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const cacheKey = `students_list_${selectedClass.id}`;

  useEffect(() => {
    fetchStudents();
    fetchMadrasah();
  }, [selectedClass.id, dataVersion]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const lowerQuery = searchQuery.toLowerCase();
    return students.filter(s => s.student_name.toLowerCase().includes(lowerQuery));
  }, [searchQuery, students]);

  const fetchMadrasah = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('madrasahs').select('*').eq('id', user.id).single();
      if (data) setMadrasah(data);
    }
  };

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
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const toggleStudentSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map(s => s.id)));
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

  const selectedStudentsForSMS = useMemo(() => {
    return students.filter(s => selectedIds.has(s.id));
  }, [students, selectedIds]);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 relative">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2.5 bg-white/10 rounded-xl text-white active:scale-90 transition-all border border-white/20 backdrop-blur-md">
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-white truncate drop-shadow-sm">{selectedClass.class_name}</h1>
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                {isSelectionMode ? `${selectedIds.size} ${t('selected', lang)}` : `${loading ? '...' : students.length} ${t('students_count', lang)}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {students.length > 0 && (
              <button 
                onClick={() => {
                  if (isSelectionMode) {
                    setIsSelectionMode(false);
                    setSelectedIds(new Set());
                  } else {
                    setIsSelectionMode(true);
                  }
                }}
                className={`p-2.5 rounded-xl border backdrop-blur-md flex items-center gap-2 active:scale-95 transition-all text-xs font-black uppercase tracking-wider ${isSelectionMode ? 'bg-white text-[#d35132] border-white' : 'bg-white/10 text-white border-white/20'}`}
              >
                {isSelectionMode ? <X size={16} /> : <MessageSquare size={16} />}
                {isSelectionMode ? t('cancel', lang) : t('bulk_sms', lang)}
              </button>
            )}
          </div>
        </div>

        {!isSelectionMode && (
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
        )}

        {isSelectionMode && (
          <div className="flex items-center justify-between px-2 py-1 bg-white/5 rounded-2xl border border-white/10 animate-in fade-in zoom-in-95">
             <button 
              onClick={toggleSelectAll}
              className="text-[11px] font-black text-white uppercase tracking-widest px-4 py-2 hover:text-yellow-400 transition-colors"
             >
               {selectedIds.size === students.length ? t('deselect_all', lang) : t('select_all', lang)}
             </button>
             <div className="bg-white/20 h-4 w-[1px]"></div>
             <p className="text-[10px] font-black text-white/50 uppercase tracking-widest px-4">
               Total: {students.length}
             </p>
          </div>
        )}
      </div>

      {loading && students.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-white/10 animate-pulse rounded-[2rem]"></div>)}
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="space-y-3 pb-32">
          {filteredStudents.map(student => {
            const isSelected = selectedIds.has(student.id);
            return (
              <div 
                key={student.id} 
                onClick={() => isSelectionMode ? toggleStudentSelection(student.id) : onStudentClick(student)}
                className={`p-4 rounded-[2rem] border transition-all animate-in slide-in-from-bottom-2 flex items-center justify-between shadow-lg relative overflow-hidden transform-gpu ${
                  isSelected ? 'bg-white border-white' : 'bg-white/10 backdrop-blur-md border-white/15 active:bg-white/20'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#d35132]/5 rounded-full -mr-12 -mt-12 pointer-events-none"></div>
                )}
                
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm border shrink-0 transition-all overflow-hidden relative ${
                    isSelected ? 'bg-[#d35132] text-white border-[#d35132]' : 'bg-white/15 text-white/80 border-white/10'
                  }`}>
                    {student.photo_url ? (
                      <img 
                        src={student.photo_url} 
                        className="w-full h-full object-cover" 
                        loading="lazy" 
                        alt="" 
                      />
                    ) : (
                      <span className="relative z-10">{student.roll || '-'}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-black text-base font-noto truncate pr-1 leading-normal transition-colors ${isSelected ? 'text-[#d35132]' : 'text-white'}`}>
                      {student.student_name}
                    </h3>
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'text-[#d35132]/60' : 'text-white/40'}`}>
                      Roll: {student.roll || '-'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {isSelectionMode ? (
                    <div className={isSelected ? 'text-[#d35132]' : 'text-white/20'}>
                      {isSelected ? <CheckCircle2 size={24} fill="currentColor" className="text-white bg-[#d35132] rounded-full" /> : <Circle size={24} />}
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => initiateCall(e, student)}
                      className="bg-white text-[#d35132] p-2.5 rounded-xl shadow-xl active:scale-90 transition-all"
                    >
                      <Phone size={18} strokeWidth={3} fill="currentColor" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/20">
          <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">{t('no_students', lang)}</p>
        </div>
      )}

      <div className="fixed bottom-24 right-6 left-6 flex justify-end gap-3 pointer-events-none">
        {isSelectionMode && selectedIds.size > 0 ? (
          <button 
            onClick={() => setShowSMSModal(true)}
            className="pointer-events-auto bg-white text-[#d35132] px-6 py-4 rounded-[1.8rem] shadow-2xl active:scale-90 transition-all flex items-center gap-3 border border-white/50 animate-in slide-in-from-bottom-5"
          >
            <MessageSquare size={20} strokeWidth={3} />
            <span className="font-black uppercase tracking-widest text-xs">
              {t('send_sms', lang)} ({selectedIds.size})
            </span>
          </button>
        ) : !isSelectionMode && (
          <button 
            onClick={onAddClick}
            className="pointer-events-auto bg-white text-[#d35132] p-5 rounded-full shadow-2xl active:scale-90 transition-all border border-white/50"
          >
            <Plus size={28} strokeWidth={3} />
          </button>
        )}
      </div>

      {showSMSModal && madrasah && (
        <SMSModal 
          students={selectedStudentsForSMS.length > 0 ? selectedStudentsForSMS : students} 
          madrasah={madrasah} 
          lang={lang} 
          onClose={() => setShowSMSModal(false)}
          onSuccess={() => { 
            triggerRefresh(); 
            fetchMadrasah(); 
            setIsSelectionMode(false); 
            setSelectedIds(new Set()); 
          }}
        />
      )}
    </div>
  );
};

export default Students;
