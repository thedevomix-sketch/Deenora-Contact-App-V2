
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, User as UserIcon, Phone, List, Hash, Loader2, ChevronDown, Camera, X, Check, UserCheck } from 'lucide-react';
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
  const [photoUrl, setPhotoUrl] = useState(student?.photo_url || '');
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!navigator.onLine) {
      setErrorModal({ show: true, message: lang === 'bn' ? 'ছবি আপলোড করতে ইন্টারনেটে যুক্ত থাকুন' : 'Stay online to upload photo' });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired. Please login again.");

      const fileExt = file.name.split('.').pop();
      const fileName = `std_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `students/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('madrasah-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('madrasah-assets')
        .getPublicUrl(filePath);

      setPhotoUrl(publicUrl);
    } catch (err: any) {
      setErrorModal({ show: true, message: lang === 'bn' ? `ব্যর্থ হয়েছে: ${err.message}` : `Upload failed: ${err.message}` });
    } finally {
      setUploading(false);
    }
  };

  const getSelectedClassName = () => {
    const cls = classes.find(c => c.id === classId);
    return cls ? cls.class_name : t('class_choose', lang);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !classId) {
      setErrorModal({ show: true, message: lang === 'bn' ? 'সব তথ্য পূরণ করুন' : 'Fill required fields' });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired");

      const payload = {
        student_name: name.trim(),
        guardian_name: guardianName.trim(),
        roll: roll ? parseInt(roll) : null,
        guardian_phone: phone.trim(),
        guardian_phone_2: phone2.trim() || null,
        photo_url: photoUrl || null,
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
        offlineApi.queueAction('students', isEditing ? 'UPDATE' : 'INSERT', isEditing ? { ...payload, id: student?.id } : payload);
      }
      onSuccess();
    } catch (err: any) { 
      setErrorModal({ show: true, message: err.message });
    } finally { setLoading(false); }
  };

  return (
    <div className="animate-in slide-in-from-bottom-6 duration-500 pb-24 space-y-8">
      <div className="flex items-center gap-5">
        <button onClick={onCancel} className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all border border-white/20 shadow-xl">
          <ArrowLeft size={28} strokeWidth={3} />
        </button>
        <h1 className="text-2xl font-black text-white font-noto drop-shadow-md">
          {isEditing ? t('edit_student', lang) : t('add_student', lang)}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[3rem] border-2 border-[#8D30F4]/10 shadow-2xl space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div onClick={() => fileInputRef.current?.click()} className="w-28 h-28 rounded-[2rem] bg-[#F2EBFF] border-4 border-dashed border-[#8D30F4]/30 flex items-center justify-center text-[#8D30F4]/40 overflow-hidden relative active:scale-95 transition-all shadow-inner">
              {uploading ? <Loader2 className="animate-spin text-[#8D30F4]" /> : photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <Camera size={35} />}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            <p className="text-[11px] font-black text-[#8D30F4] uppercase tracking-widest">{photoUrl ? 'Change Photo' : 'Add Photo'}</p>
          </div>

          <div className="space-y-5">
             {/* Student Name */}
             <div className="space-y-2">
               <label className="flex items-center gap-2 text-[10px] font-black text-[#4B168A] uppercase tracking-widest px-2"><UserIcon size={14} className="text-[#8D30F4]" /> {t('student_name', lang)}</label>
               <input type="text" required className="w-full px-5 py-4 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.2rem] outline-none text-[#2D3142] font-black text-lg focus:border-[#8D30F4] transition-all" value={name} onChange={(e) => setName(e.target.value)} />
             </div>

             {/* Guardian Name */}
             <div className="space-y-2">
               <label className="flex items-center gap-2 text-[10px] font-black text-[#4B168A] uppercase tracking-widest px-2"><UserCheck size={14} className="text-[#8D30F4]" /> {t('guardian_name', lang)}</label>
               <input type="text" className="w-full px-5 py-4 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.2rem] outline-none text-[#2D3142] font-black text-lg focus:border-[#8D30F4] transition-all" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                {/* Roll */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-[#4B168A] uppercase tracking-widest px-2"><Hash size={14} className="text-[#8D30F4]" /> Roll</label>
                  <input type="number" className="w-full px-5 py-4 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.2rem] text-[#2D3142] font-black text-xl outline-none text-center focus:border-[#8D30F4] transition-all" value={roll} onChange={(e) => setRoll(e.target.value)} />
                </div>
                {/* Class Select */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-[#4B168A] uppercase tracking-widest px-2"><List size={14} className="text-[#8D30F4]" /> Class</label>
                  <div onClick={() => setShowClassModal(true)} className="w-full px-5 py-4 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.2rem] flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all">
                    <span className="font-black text-[#2D3142] truncate text-sm">{getSelectedClassName()}</span>
                    <ChevronDown size={18} className="text-[#8D30F4] shrink-0" />
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                {/* Phone 1 */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-[#4B168A] uppercase tracking-widest px-2"><Phone size={14} className="text-[#8D30F4]" /> Primary Phone</label>
                  <input type="tel" required className="w-full px-5 py-4 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.2rem] text-[#2D3142] font-black text-sm outline-none focus:border-[#8D30F4] transition-all" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
                </div>
                {/* Phone 2 */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-[#4B168A] uppercase tracking-widest px-2"><Phone size={14} className="text-[#8D30F4]" /> Phone 2</label>
                  <input type="tel" className="w-full px-5 py-4 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.2rem] text-[#2D3142] font-black text-sm outline-none focus:border-[#8D30F4] transition-all" value={phone2} onChange={(e) => setPhone2(e.target.value.replace(/\D/g, ''))} />
                </div>
             </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full py-6 premium-btn text-white font-black rounded-[2.5rem] shadow-[0_20px_50px_rgba(141,48,244,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-xl font-noto">
          {loading ? <Loader2 className="animate-spin" size={28} /> : <><Save size={28} /> {t('save', lang)}</>}
        </button>
      </form>

      {showClassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[500] flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border-2 border-[#8D30F4]/10 relative">
            <button onClick={() => setShowClassModal(false)} className="absolute top-6 right-6 text-[#8D30F4] hover:scale-110 transition-all"><X size={26} strokeWidth={3} /></button>
            <h2 className="text-xl font-black text-[#4B168A] mb-6 font-noto tracking-tight">ক্লাস বাছাই করুন</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
               {classes.map(cls => (
                 <button key={cls.id} onClick={() => { setClassId(cls.id); setShowClassModal(false); }} className={`w-full p-4 rounded-2xl font-black transition-all flex items-center justify-between ${classId === cls.id ? 'bg-[#8D30F4] text-white shadow-xl' : 'bg-[#F2EBFF] text-[#4B168A] border border-[#8D30F4]/10'}`}>
                    <span>{cls.class_name}</span>
                    {classId === cls.id && <Check size={20} strokeWidth={4} />}
                 </button>
               ))}
            </div>
          </div>
        </div>
      )}

      {errorModal.show && (
         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[600] flex items-center justify-center p-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center space-y-4">
               <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto"><X size={32} /></div>
               <p className="font-black text-slate-800">{errorModal.message}</p>
               <button onClick={() => setErrorModal({show: false, message: ''})} className="px-8 py-3 bg-slate-100 rounded-full font-black text-slate-600">ঠিক আছে</button>
            </div>
         </div>
      )}
    </div>
  );
};

export default StudentForm;
