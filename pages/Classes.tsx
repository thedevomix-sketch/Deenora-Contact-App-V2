
import React, { useState, useEffect } from 'react';
// Added AlertTriangle to the imports from lucide-react
import { Plus, ChevronRight, BookOpen, Users, Edit3, Trash2, X, Check, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
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
  const [modalLoading, setModalLoading] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Class | null>(null);

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

  const handleSaveClass = async () => {
    if (!newClassName.trim()) return;
    setModalLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired");

      if (editingClass) {
        if (navigator.onLine) {
          await supabase.from('classes').update({ class_name: newClassName.trim() }).eq('id', editingClass.id);
        } else {
          offlineApi.queueAction('classes', 'UPDATE', { id: editingClass.id, class_name: newClassName.trim() });
        }
      } else {
        const payload = { class_name: newClassName.trim(), madrasah_id: user.id };
        if (navigator.onLine) {
          await supabase.from('classes').insert(payload);
        } else {
          offlineApi.queueAction('classes', 'INSERT', payload);
        }
      }
      setShowModal(false);
      setNewClassName('');
      setEditingClass(null);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!showDeleteConfirm) return;
    setModalLoading(true);
    try {
      if (navigator.onLine) {
        await supabase.from('classes').delete().eq('id', showDeleteConfirm.id);
      } else {
        offlineApi.queueAction('classes', 'DELETE', { id: showDeleteConfirm.id });
      }
      setShowDeleteConfirm(null);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex items-center justify-between px-2">
        <h1 className="text-2xl font-noto font-black text-white drop-shadow-md">{t('classes_title', lang)}</h1>
        <button onClick={() => { setNewClassName(''); setEditingClass(null); setShowModal(true); }} className="premium-btn text-white px-5 py-3 rounded-[1.2rem] text-[13px] font-black flex items-center gap-2 active:scale-95 transition-all border border-white/20">
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
            <div key={cls.id} onClick={() => onClassClick(cls)} className="bg-white/95 backdrop-blur-md p-5 rounded-[2.5rem] border border-white/40 flex items-center justify-between active:scale-[0.98] transition-all group shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-14 h-14 bg-[#8D30F4]/10 rounded-[1.2rem] flex items-center justify-center text-[#8D30F4] shrink-0 border border-[#8D30F4]/10 shadow-inner">
                  <BookOpen size={28} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-[#2E0B5E] text-[19px] font-noto truncate leading-tight tracking-tight">{cls.class_name}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Users size={14} className="text-[#8D30F4]/60" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{cls.student_count || 0} {t('students_count', lang)}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button onClick={(e) => { e.stopPropagation(); setNewClassName(cls.class_name); setEditingClass(cls); setShowModal(true); }} 
                  className="w-10 h-10 bg-[#F2EBFF] text-[#8D30F4] rounded-xl flex items-center justify-center border border-[#8D30F4]/10 active:scale-90 transition-all shadow-sm">
                  <Edit3 size={18} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(cls); }} 
                  className="w-10 h-10 bg-red-50 text-red-400 rounded-xl flex items-center justify-center border border-red-100 active:scale-90 transition-all shadow-sm">
                  <Trash2 size={18} />
                </button>
                <ChevronRight className="text-[#A179FF]/40 group-hover:text-[#8D30F4] transition-colors ml-1" size={24} strokeWidth={3} />
              </div>
            </div>
          ))}

          {classes.length === 0 && (
            <div className="py-24 text-center bg-white/10 rounded-[3rem] border-2 border-dashed border-white/30 backdrop-blur-sm">
              <p className="text-white font-black text-sm uppercase tracking-widest">{t('no_classes', lang)}</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[500] flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border-2 border-[#8D30F4]/10 relative animate-in zoom-in-95">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-300 hover:text-[#8D30F4] transition-all"><X size={26} strokeWidth={3} /></button>
            <h2 className="text-xl font-black text-[#2E0B5E] mb-6 font-noto tracking-tight">
              {editingClass ? t('edit_class', lang) : t('new_class', lang)}
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t('class_name_label', lang)}</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full px-6 py-5 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-2xl text-[#2E0B5E] font-black text-lg outline-none focus:border-[#8D30F4] transition-all" 
                  value={newClassName} 
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="যেমন: হিফয বিভাগ"
                />
              </div>
              <button onClick={handleSaveClass} disabled={modalLoading || !newClassName.trim()} className="w-full py-5 premium-btn text-white font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg">
                {modalLoading ? <Loader2 className="animate-spin" size={24} /> : <><Check size={24} strokeWidth={4} /> {t('save', lang)}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-red-900/40 backdrop-blur-xl z-[600] flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl border-2 border-red-50 text-center space-y-6 animate-in zoom-in-95">
             <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                {/* Fixed: AlertTriangle was not imported from lucide-react */}
                <AlertTriangle size={40} />
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-800">{t('confirm_delete', lang)}</h3>
                <p className="text-sm font-bold text-slate-400 mt-2">"{showDeleteConfirm.class_name}" শ্রেণির সকল ছাত্রের তথ্য মুছে যাবে।</p>
             </div>
             <div className="flex gap-4 pt-2">
                <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl active:scale-95 transition-all">বাতিল</button>
                <button onClick={handleDeleteClass} disabled={modalLoading} className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center">
                  {modalLoading ? <Loader2 className="animate-spin" size={20} /> : 'ডিলিট করুন'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
