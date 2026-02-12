
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, User as UserIcon, Phone, List, Hash, Loader2, UserCheck, AlertCircle, X, Check, ChevronDown, BookOpen } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
import { Student, Class, Language } from '../types';
import { t } from '../translations';
import { sortMadrasahClasses } from './Classes';

interface StudentFormProps {
  student?: Student | null;
  defaultClassId?: string;
  isEditing: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  lang: Language;
}

const StudentForm: React.FC<StudentFormProps> = ({ student, defaultClassId, isEditing, onSuccess, onCancel, lang }) => {
  const [name, setName] = useState(student?.student_name || '');
  const [guardianName, setGuardianName] = useState(student?.guardian_name || '');
  const [roll, setRoll] = useState(student?.roll?.toString() || '');
  const [phone, setPhone] = useState(student?.guardian_phone || '');
  const [phone2, setPhone2] = useState(student?.guardian_phone_2 || '');
  const [classId, setClassId] = useState(student?.class_id || defaultClassId || '');
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  
  // Custom Alert State
  const [errorModal, setErrorModal] = useState<{show: boolean, message: string}>({show: false, message: ''});

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    const cached = offlineApi.getCache('classes');
    if (cached) setClasses(sortMadrasahClasses(cached));

    if (navigator.onLine) {
      const { data } = await supabase.from('classes').select('*');
      if (data) {
        const sorted = sortMadrasahClasses(data);
        setClasses(sorted);
        offlineApi.setCache('classes', sorted);
      }
    }
  };

  const getSelectedClassName = () => {
    const cls = classes.find(c => c.id === classId);
    return cls ? cls.class_name : t('class_choose', lang);
  };

  const checkDuplicateRoll = async (targetRoll: number, targetClassId: string) => {
    const cacheKey = `students_list_${targetClassId}`;
    const cachedStudents = offlineApi.getCache(cacheKey) as Student[] | null;
    
    if (cachedStudents) {
      const isDuplicate = cachedStudents.some(s => 
        s.roll === targetRoll && (!isEditing || s.id !== student?.id)
      );
      if (isDuplicate) return true;
    }

    if (navigator.onLine) {
      let query = supabase
        .from('students')
        .select('id')
        .eq('class_id', targetClassId)
        .eq('roll', targetRoll);
      
      if (isEditing && student) {
        query = query.neq('id', student.id);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) return true;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !classId) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (roll) {
        const rollNum = parseInt(roll);
        const isDuplicate = await checkDuplicateRoll(rollNum, classId);
        if (isDuplicate) {
          setErrorModal({ show: true, message: t('duplicate_roll', lang) });
          setLoading(false);
          return;
        }
      }
      
      const payload = {
        student_name: name.trim(),
        guardian_name: guardianName.trim(),
        roll: roll ? parseInt(roll) : null,
        guardian_phone: phone.trim(),
        guardian_phone_2: phone2.trim() || null,
        class_id: classId,
        madrasah_id: user.id
      };

      if (navigator.onLine) {
        if (isEditing && student) {
          await supabase.from('students').update(payload).eq('id', student.id);
        } else {
          await supabase.from('students').insert(payload);
        }
      } else {
        if (isEditing && student) {
          offlineApi.queueAction('students', 'UPDATE', { ...payload, id: student.id });
        } else {
          offlineApi.queueAction('students', 'INSERT', payload);
        }
      }

      offlineApi.removeCache(`students_list_${classId}`);
      offlineApi.removeCache(`all_students_search`);
      offlineApi.removeCache(`recent_calls`);
      
      onSuccess();
    } catch (err) { 
      console.error(err); 
      setErrorModal({ show: true, message: lang === 'bn' ? 'তথ্য সংরক্ষণ করা সম্ভব হয়নি' : 'Could not save data' });
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom-6 duration-500 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2.5 bg-white/10 rounded-xl text-white active:scale-90 transition-all border border-white/20 backdrop-blur-md">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-xl font-black text-white">
          {isEditing ? t('edit_student', lang) : t('add_student', lang)}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[2rem] border border-white/20 shadow-xl space-y-5">
          {!navigator.onLine && (
            <p className="text-[10px] bg-yellow-400/20 text-yellow-200 p-2 rounded-lg font-bold text-center">
              {lang === 'bn' ? 'আপনি অফলাইনে আছেন। ডাটা পরে সেভ হবে।' : 'You are offline. Data will sync later.'}
            </p>
          )}
          
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-black text-white/50 uppercase tracking-widest px-1">
              <UserIcon size={12} />
              {t('student_name', lang)}
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-4 bg-white/10 border border-white/15 rounded-xl outline-none text-white font-bold focus:bg-white/20 transition-all text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-black text-white/50 uppercase tracking-widest px-1">
              <UserCheck size={12} />
              {t('guardian_name', lang)}
            </label>
            <input
              type="text"
              className="w-full px-4 py-4 bg-white/10 border border-white/15 rounded-xl outline-none text-white font-bold focus:bg-white/20 transition-all text-sm"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] font-black text-white/50 uppercase tracking-widest px-1">
                <Hash size={12} />
                {t('roll', lang)}
              </label>
              <input
                type="number"
                className="w-full px-4 py-4 bg-white/10 border border-white/15 rounded-xl outline-none text-white font-bold focus:bg-white/20 transition-all text-center text-sm"
                value={roll}
                onChange={(e) => setRoll(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] font-black text-white/50 uppercase tracking-widest px-1">
                <Phone size={12} />
                {t('guardian_phone', lang)} {lang === 'bn' ? '(হোয়াটসঅ্যাপ)' : '(WhatsApp)'}
              </label>
              <input
                type="tel"
                required
                maxLength={11}
                className="w-full px-4 py-4 bg-white/10 border border-white/15 rounded-xl outline-none text-white font-bold focus:bg-white/20 transition-all tracking-wider text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-black text-white/50 uppercase tracking-widest px-1">
              <Phone size={12} />
              {t('guardian_phone_2', lang)}
            </label>
            <input
              type="tel"
              maxLength={11}
              className="w-full px-4 py-4 bg-white/10 border border-white/15 rounded-xl outline-none text-white font-bold focus:bg-white/20 transition-all tracking-wider text-sm"
              value={phone2}
              onChange={(e) => setPhone2(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder={lang === 'bn' ? 'ঐচ্ছিক' : 'Optional'}
            />
          </div>

          {/* New Enhanced Class Selector Design */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-[10px] font-black text-white/50 uppercase tracking-widest px-1">
              <List size={12} />
              {t('class_select', lang)}
            </label>
            <div 
              onClick={() => setShowClassModal(true)}
              className={`w-full px-5 py-4 bg-white/10 border border-white/15 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all ${!classId ? 'text-white/40' : 'text-white'}`}
            >
              <span className="font-bold text-sm truncate">{getSelectedClassName()}</span>
              <ChevronDown size={18} className="text-white/30" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all text-base flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> {t('save', lang)}</>}
        </button>
      </form>

      {/* Modern Class Selection Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-[#d35132] w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-6 border-t sm:border border-white/20 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-10">
            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
                  <BookOpen size={20} />
                </div>
                <h2 className="text-xl font-black text-white font-noto">{t('class_select', lang)}</h2>
              </div>
              <button 
                onClick={() => setShowClassModal(false)}
                className="p-2 bg-white/10 text-white rounded-full active:scale-90 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 px-1 custom-scrollbar pb-6">
              {classes.length > 0 ? (
                classes.map((cls) => (
                  <div
                    key={cls.id}
                    onClick={() => {
                      setClassId(cls.id);
                      setShowClassModal(false);
                    }}
                    className={`p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] ${
                      classId === cls.id 
                        ? 'bg-white text-[#d35132] shadow-xl' 
                        : 'bg-white/10 text-white border border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${classId === cls.id ? 'bg-[#d35132]/10' : 'bg-white/5'}`}>
                        <Hash size={14} />
                      </div>
                      <span className="font-bold font-noto">{cls.class_name}</span>
                    </div>
                    {classId === cls.id && (
                      <div className="bg-[#d35132] text-white p-1 rounded-full">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 opacity-40">
                  <p className="font-bold text-sm text-white">{t('no_classes', lang)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Beautiful Custom Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 text-center border border-white/20">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-500 shadow-sm">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-3 font-noto">
              {lang === 'bn' ? 'দুঃখিত!' : 'Sorry!'}
            </h2>
            <p className="text-slate-600 text-sm font-bold mb-8 font-noto leading-relaxed px-2">
              {errorModal.message}
            </p>
            <button
              onClick={() => setErrorModal({ show: false, message: '' })}
              className="w-full py-4 bg-[#d35132] text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {lang === 'bn' ? 'ঠিক আছে' : 'OK'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentForm;
