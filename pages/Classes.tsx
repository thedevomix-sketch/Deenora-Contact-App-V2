
import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, BookOpen, Users } from 'lucide-react';
import { supabase } from '../supabase';
import { Class, Language } from '../types';
import { t } from '../translations';

export const sortMadrasahClasses = (classes: any[]) => {
  if (!classes || !Array.isArray(classes)) return [];
  return [...classes].sort((a, b) => 
    (a.class_name || '').localeCompare((b.class_name || ''), 'bn', { numeric: true })
  );
};

interface ClassesProps {
  onClassClick: (cls: Class) => void;
  lang: Language;
  dataVersion: number;
  triggerRefresh: () => void;
}

const Classes: React.FC<ClassesProps> = ({ onClassClick, lang, dataVersion, triggerRefresh }) => {
  const [classes, setClasses] = useState<(Class & { student_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => { fetchClasses(); }, [dataVersion]);

  const fetchClasses = async () => {
    setLoading(true);
    const { data: classesData } = await supabase.from('classes').select('*');
    if (classesData) {
      const withCounts = await Promise.all(classesData.map(async (cls) => {
        const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('class_id', cls.id);
        return { ...cls, student_count: count || 0 };
      }));
      setClasses(sortMadrasahClasses(withCounts));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex items-center justify-between px-2">
        <h1 className="text-2xl font-black text-white font-noto drop-shadow-md">{t('classes_title', lang)}</h1>
        <button onClick={() => { setNewClassName(''); setShowModal(true); }} className="premium-btn text-white px-5 py-3 rounded-[1.2rem] text-[13px] font-black flex items-center gap-2 active:scale-95 transition-all border border-white/20">
          <Plus size={18} strokeWidth={4} /> {t('new_class', lang)}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white/20 animate-pulse rounded-[2.2rem] border border-white/10"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {classes.map(cls => (
            <div key={cls.id} onClick={() => onClassClick(cls)} className="bg-white/90 backdrop-blur-md p-6 rounded-[2.2rem] border border-white/40 flex items-center justify-between active:scale-[0.98] transition-all group shadow-xl">
              <div className="flex items-center gap-5 min-w-0">
                <div className="w-14 h-14 bg-[#8D30F4]/10 rounded-[1.2rem] flex items-center justify-center text-[#8D30F4] shrink-0 border border-[#8D30F4]/20 shadow-inner">
                  <BookOpen size={28} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-[#2E0B5E] text-[20px] font-noto truncate leading-tight tracking-tight">{cls.class_name}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Users size={14} className="text-[#8D30F4]" />
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">{cls.student_count || 0} {t('students_count', lang)}</p>
                  </div>
                </div>
              </div>
              <ChevronRight className="text-[#A179FF] group-hover:text-[#8D30F4] transition-colors" size={26} strokeWidth={3} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Classes;
