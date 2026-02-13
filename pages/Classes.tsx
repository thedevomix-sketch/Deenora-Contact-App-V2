
import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, BookOpen, Loader2, Edit2, X } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
import { Class, Language } from '../types';
import { t } from '../translations';

interface ClassesProps {
  onClassClick: (cls: Class) => void;
  lang: Language;
  dataVersion: number;
  triggerRefresh: () => void;
}

export const sortMadrasahClasses = (classes: any[]) => {
  const priorityMap: Record<string, number> = {
    'প্লে': 1, 'play': 1, 'নার্সারী': 2, 'nursery': 2, 'কেজি': 3, 'kg': 3,
    'প্রথম': 4, 'one': 4, '১ম': 4, 'দ্বিতীয়': 5, 'two': 5, '২য়': 5,
    'তৃতীয়': 6, 'three': 6, '৩য়': 6, 'চতুর্থ': 7, 'four': 7, '৪র্থ': 7,
    'পঞ্চম': 8, 'five': 8, '৫ম': 8, 'ষষ্ঠ': 9, 'six': 9, '৬ষ্ঠ': 9,
    'সপ্তম': 10, 'seven': 10, '৭ম': 10, 'অষ্টম': 11, 'eight': 11, '৮ম': 11,
    'নবম': 12, 'nine': 12, '৯ম': 12, 'দশম': 13, 'ten': 13, '১০ম': 13
  };

  const getPriority = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('হিফজ') || lowerName.includes('hifz')) return 1000;
    for (const [key, value] of Object.entries(priorityMap)) {
      if (lowerName.includes(key)) return value;
    }
    return 500;
  };

  return [...classes].sort((a, b) => {
    const pA = getPriority(a.class_name);
    const pB = getPriority(b.class_name);
    if (pA !== pB) return pA - pB;
    return a.class_name.localeCompare(b.class_name, 'bn');
  });
};

const Classes: React.FC<ClassesProps> = ({ onClassClick, lang, dataVersion, triggerRefresh }) => {
  const [classes, setClasses] = useState<(Class & { student_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchClasses(); }, [dataVersion]);

  const fetchClasses = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = offlineApi.getCache('classes_with_counts');
      if (cached) { setClasses(sortMadrasahClasses(cached)); setLoading(false); }
    } else { setLoading(true); }

    if (navigator.onLine) {
      try {
        const { data: classesData } = await supabase.from('classes').select('*');
        if (classesData) {
          const classesWithCounts = await Promise.all(
            classesData.map(async (cls) => {
              const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('class_id', cls.id);
              return { ...cls, student_count: count || 0 };
            })
          );
          const sorted = sortMadrasahClasses(classesWithCounts);
          setClasses(sorted);
          offlineApi.setCache('classes_with_counts', sorted);
          offlineApi.setCache('classes', sorted);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    } else { setLoading(false); }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(lang === 'bn' ? 'লগইন তথ্য পাওয়া যায়নি' : 'Auth user not found');
      
      const payload = { class_name: newClassName.trim(), madrasah_id: user.id };

      if (navigator.onLine) {
        const { error } = editingClass 
          ? await supabase.from('classes').update({ class_name: payload.class_name }).eq('id', editingClass.id)
          : await supabase.from('classes').insert(payload);
        
        if (error) {
          console.error("Save error:", error);
          throw new Error(error.message);
        }
      } else {
        editingClass 
          ? offlineApi.queueAction('classes', 'UPDATE', { ...payload, id: editingClass.id })
          : offlineApi.queueAction('classes', 'INSERT', payload);
      }
      
      offlineApi.removeCache('classes_with_counts');
      offlineApi.removeCache('classes');
      setShowModal(false);
      setNewClassName('');
      triggerRefresh();
      fetchClasses(true);
    } catch (err: any) {
      alert(lang === 'bn' ? `ক্লাস সেভ করা যায়নি: ${err.message}` : `Save failed: ${err.message}`);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-black text-white drop-shadow-lg font-noto">{t('classes_title', lang)}</h1>
        <button onClick={() => { setEditingClass(null); setNewClassName(''); setShowModal(true); }} className="bg-white text-[#d35132] px-4 py-2.5 rounded-xl text-[13px] font-black flex items-center gap-2 shadow-2xl active:scale-95 transition-all">
          <Plus size={16} strokeWidth={3.5} /> {t('new_class', lang)}
        </button>
      </div>

      {loading && classes.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/10 animate-pulse rounded-[2.2rem]"></div>)}
        </div>
      ) : classes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {classes.map(cls => (
            <div key={cls.id} onClick={() => onClassClick(cls)} className="bg-white/15 backdrop-blur-lg p-5 rounded-[2.2rem] border border-white/30 shadow-2xl flex items-center justify-between active:bg-white/30 transition-all text-left group overflow-hidden">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="bg-white/20 text-white p-3.5 rounded-[1.2rem] shrink-0">
                  <BookOpen size={24} strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-white text-[20px] leading-tight font-noto tracking-tight truncate">{cls.class_name}</h3>
                    <span className="bg-white/10 px-2 py-0.5 rounded-lg text-[9px] text-white/80 font-black shrink-0">({cls.student_count || 0} {t('students_count', lang)})</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); setEditingClass(cls); setNewClassName(cls.class_name); setShowModal(true); }} className="p-3 bg-white/10 text-white rounded-2xl transition-all active:scale-90">
                  <Edit2 size={16} />
                </button>
                <ChevronRight className="text-white/40" size={20} strokeWidth={3} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/20">
          <BookOpen className="mx-auto text-white/10 mb-5" size={60} />
          <p className="text-white/60 font-black text-lg">{t('no_classes', lang)}</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6">
          <div className="bg-[#e57d4a] w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-white/30 animate-in zoom-in-95 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-white/60 hover:text-white"><X size={24} /></button>
            <h2 className="text-2xl font-black text-white mb-6 text-center font-noto">{editingClass ? t('edit_class', lang) : t('new_class', lang)}</h2>
            <form onSubmit={handleSaveClass} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-3 px-1">{t('class_name_label', lang)}</label>
                <input type="text" required placeholder={lang === 'bn' ? '১ম শ্রেণি' : 'e.g. Class 1'} className="w-full px-6 py-4 bg-white/20 border border-white/30 rounded-2xl outline-none text-white font-black text-lg focus:bg-white/30 transition-all shadow-inner" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} autoFocus />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white/10 text-white font-black text-sm rounded-xl border border-white/20">{t('cancel', lang)}</button>
                <button type="submit" disabled={saving} className="flex-1 py-4 bg-white text-[#d35132] font-black text-sm rounded-xl shadow-2xl flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : t('save', lang)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
