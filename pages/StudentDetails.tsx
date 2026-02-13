import React, { useState, useEffect } from 'react';
import { ArrowLeft, Phone, Edit3, Trash2, User as UserIcon, Smartphone, ShieldCheck, Loader2, AlertTriangle, MessageCircle, PhoneCall, UserCheck, MessageSquare } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
import { Student, Language, Madrasah } from '../types';
import { t } from '../translations';

interface StudentDetailsProps {
  student: Student;
  onEdit: () => void;
  onBack: () => void;
  lang: Language;
  triggerRefresh: () => void;
}

const StudentDetails: React.FC<StudentDetailsProps> = ({ student, onEdit, onBack, lang, triggerRefresh }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [madrasah, setMadrasah] = useState<Madrasah | null>(null);

  useEffect(() => {
    fetchMadrasah();
  }, []);

  const fetchMadrasah = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('madrasahs').select('*').eq('id', user.id).single();
      if (data) setMadrasah(data);
    }
  };

  const recordCall = async (phoneNumber: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { student_id: student.id, guardian_phone: phoneNumber, madrasah_id: user.id };
    if (navigator.onLine) await supabase.from('recent_calls').insert(payload);
    else offlineApi.queueAction('recent_calls', 'INSERT', payload);
    triggerRefresh();
  };

  const formatWhatsAppNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return '88' + cleaned;
    }
    return cleaned;
  };

  const openWhatsApp = async (phone: string) => {
    await recordCall(phone);
    const waNumber = formatWhatsAppNumber(phone);
    window.location.href = `https://wa.me/${waNumber}`;
  };

  const performDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      if (navigator.onLine) {
        const { error } = await supabase.from('students').delete().eq('id', student.id);
        if (error) throw error;
      } else {
        offlineApi.queueAction('students', 'DELETE', { id: student.id });
        const cacheKey = `students_list_${student.class_id}`;
        const cached = offlineApi.getCache(cacheKey);
        if (cached) offlineApi.setCache(cacheKey, cached.filter((s: any) => s.id !== student.id));
      }
      triggerRefresh();
      setShowDeleteModal(false);
      onBack();
    } catch (err) {
      alert(lang === 'bn' ? `ডিলিট করা সম্ভব হয়নি` : `Could not delete`);
    } finally {
      setIsDeleting(false);
    }
  };

  const PhoneRow = ({ label, phone }: { label: string, phone: string }) => (
    <div className="space-y-3">
      <label className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] px-1">
        {label}
      </label>
      
      <div className="bg-white p-4 rounded-3xl flex items-center justify-between shadow-xl border-b-4 border-slate-200">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="w-10 h-10 bg-[#d35132]/10 rounded-xl flex items-center justify-center text-[#d35132] shrink-0">
            <Smartphone size={20} />
          </div>
          <span className="text-base font-black text-slate-800 tracking-wider truncate">{phone}</span>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {/* WhatsApp Message Button */}
          <button 
            onClick={() => openWhatsApp(phone)}
            className="p-3 bg-gradient-to-br from-[#25d366] to-[#128c7e] text-white rounded-2xl active:scale-90 transition-all shadow-md border border-white/20"
            title="WhatsApp Message"
          >
            <MessageSquare size={18} fill="currentColor" />
          </button>
          
          {/* WhatsApp Call Button */}
          <button 
            onClick={() => openWhatsApp(phone)}
            className="p-3 bg-gradient-to-br from-[#075E54] to-[#128c7e] text-white rounded-2xl active:scale-90 transition-all shadow-md border border-white/20"
            title="WhatsApp Call"
          >
            <PhoneCall size={18} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-in slide-in-from-right-4 duration-500 pb-10">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="p-2.5 bg-white/10 rounded-xl text-white active:scale-90 transition-all border border-white/20 backdrop-blur-md">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="p-2.5 bg-[#d15031] text-white rounded-xl active:scale-90 transition-all border border-white/20 shadow-lg"
          >
            <Trash2 size={18} />
          </button>
          <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white font-bold rounded-xl border border-white/20 active:scale-90 transition-all text-sm shadow-lg">
            <Edit3 size={16} />
            {t('edit', lang)}
          </button>
        </div>
      </div>

      <div className="bg-white/15 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-white/10 to-transparent p-6 text-center border-b border-white/10 relative">
          <div className="w-24 h-24 bg-white/20 rounded-[2rem] mx-auto flex items-center justify-center border-2 border-white/30 shadow-xl mb-4 text-white overflow-hidden">
            {student.photo_url ? (
              <img src={student.photo_url} className="w-full h-full object-cover" alt={student.student_name} />
            ) : (
              <UserIcon size={40} strokeWidth={1.5} />
            )}
          </div>
          <h2 className="text-xl font-black text-white font-noto tracking-tight drop-shadow-sm truncate px-4 leading-normal">
            {student.student_name}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full mt-2 border border-white/10">
            <ShieldCheck size={12} className="text-white/60" />
            <span className="text-[10px] text-white font-black uppercase tracking-wider">{student.classes?.class_name || 'N/A'}</span>
          </div>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col items-center text-center">
              <span className="text-[9px] text-white/50 font-black uppercase tracking-widest mb-1">{t('roll', lang)}</span>
              <span className="text-lg font-black text-white">{student.roll || '-'}</span>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col items-center text-center">
              <span className="text-[9px] text-white/50 font-black uppercase tracking-widest mb-1">{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</span>
              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                {lang === 'bn' ? 'সক্রিয়' : 'Active'}
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white/70">
              <UserCheck size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] text-white/40 font-black uppercase tracking-widest block mb-0.5">{t('guardian_name', lang)}</span>
              <p className="text-base font-black text-white font-noto truncate leading-tight">
                {student.guardian_name || (lang === 'bn' ? 'অজানা' : 'Unknown')}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <PhoneRow label={t('guardian_phone', lang)} phone={student.guardian_phone} />
            {student.guardian_phone_2 && (
              <PhoneRow label={t('guardian_phone_2', lang)} phone={student.guardian_phone_2} />
            )}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[110] flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-[340px] rounded-[3rem] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] p-8 text-center relative border border-white/20 flex flex-col items-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-500 shadow-inner">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-3 font-noto leading-tight px-2">
              {t('confirm_delete', lang)}
            </h2>
            <div className="flex w-full gap-3 mt-6">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 font-black text-sm rounded-2xl active:bg-slate-100 border border-slate-100"> {t('cancel', lang)} </button>
              <button onClick={performDelete} className="flex-1 py-4 bg-[#f14848] text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"> {isDeleting ? <Loader2 className="animate-spin" size={18} /> : t('delete', lang)} </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetails;
