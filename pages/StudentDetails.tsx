
import React from 'react';
import { ArrowLeft, Edit3, User as UserIcon, Smartphone, PhoneCall, UserCheck, MessageCircle, Phone } from 'lucide-react';
import { Student, Language } from '../types';

interface StudentDetailsProps {
  student: Student;
  onEdit: () => void;
  onBack: () => void;
  lang: Language;
}

const StudentDetails: React.FC<StudentDetailsProps> = ({ student, onEdit, onBack, lang }) => {
  return (
    <div className="animate-in slide-in-from-right-4 duration-500 pb-24 space-y-8">
      <div className="flex items-center justify-between px-2">
        <button onClick={onBack} className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all border border-white/20 shadow-xl">
          <ArrowLeft size={30} strokeWidth={3} />
        </button>
        <button onClick={onEdit} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#8D30F4] active:scale-90 transition-all border border-white shadow-xl">
          <Edit3 size={28} />
        </button>
      </div>

      <div className="bg-white/95 backdrop-blur-xl rounded-[3.5rem] p-8 border border-white/50 shadow-[0_40px_100px_rgba(46,11,94,0.3)] relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 p-6">
           <div className="px-6 py-2 bg-[#8D30F4] rounded-full shadow-lg border-2 border-white">
              <span className="text-[12px] font-black text-white uppercase tracking-widest">{student.classes?.class_name || 'N/A'}</span>
           </div>
        </div>
        
        <div className="flex flex-col items-center gap-6 mt-4">
           <div className="w-36 h-36 bg-[#F2EBFF] rounded-[3rem] flex items-center justify-center text-[#A179FF] border-4 border-white shadow-2xl overflow-hidden">
             {student.photo_url ? <img src={student.photo_url} className="w-full h-full object-cover" /> : <UserIcon size={60} strokeWidth={2.5} />}
           </div>
           <div>
              <h2 className="text-3xl font-black text-[#2E0B5E] font-noto tracking-tight leading-tight">{student.student_name}</h2>
              <div className="inline-block mt-2 px-5 py-1.5 bg-[#F2EBFF] rounded-xl border border-[#8D30F4]/10">
                <p className="text-[14px] font-black text-[#8D30F4] uppercase tracking-[0.3em]">Roll: {student.roll || '-'}</p>
              </div>
           </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 text-left">
           {/* Guardian Info */}
           <div className="bg-[#F2EBFF]/50 p-5 rounded-[2.2rem] border-2 border-white flex items-center gap-5">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#8D30F4] shrink-0 shadow-md border border-[#8D30F4]/5">
                 <UserCheck size={24} />
              </div>
              <div className="min-w-0">
                 <p className="text-[10px] font-black text-[#A179FF] uppercase tracking-widest leading-none mb-1.5">Guardian Name</p>
                 <p className="text-lg font-black text-[#2E0B5E] truncate font-noto leading-none">{student.guardian_name || 'N/A'}</p>
              </div>
           </div>

           {/* Primary Phone & WhatsApp */}
           <div className="bg-white p-6 rounded-[2.5rem] border-2 border-[#8D30F4]/10 shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5 min-w-0">
                   <div className="w-12 h-12 bg-[#8D30F4]/10 rounded-2xl flex items-center justify-center text-[#8D30F4] shrink-0 border border-[#8D30F4]/5">
                      <Smartphone size={24} />
                   </div>
                   <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Primary Phone</p>
                      <p className="text-xl font-black text-[#2E0B5E] tracking-tight leading-none">{student.guardian_phone}</p>
                   </div>
                </div>
                <button onClick={() => window.location.href = `tel:${student.guardian_phone}`} className="w-14 h-14 premium-btn rounded-[1.2rem] flex items-center justify-center text-white shadow-xl active:scale-90 transition-all border-2 border-white">
                   <Phone size={24} fill="currentColor" />
                </button>
              </div>

              <div className="h-px bg-[#8D30F4]/10 w-full" />

              <div className="flex gap-3">
                <button onClick={() => window.location.href = `https://wa.me/88${student.guardian_phone}`} className="flex-1 py-4 bg-[#25d366] text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/20">
                   <PhoneCall size={20} fill="currentColor" /> Call WhatsApp
                </button>
                <button onClick={() => window.location.href = `https://wa.me/88${student.guardian_phone}?text=আস-সালামু আলাইকুম`} className="flex-1 py-4 bg-[#25d366] text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/20">
                   <MessageCircle size={20} fill="currentColor" /> Message
                </button>
              </div>
           </div>

           {/* Secondary Phone if exists */}
           {student.guardian_phone_2 && (
             <div className="bg-white/60 p-5 rounded-[2.2rem] border border-white flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-5 min-w-0">
                   <div className="w-12 h-12 bg-[#F2EBFF] rounded-2xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                      <Smartphone size={22} />
                   </div>
                   <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Secondary Phone</p>
                      <p className="text-lg font-black text-slate-600 tracking-tight leading-none">{student.guardian_phone_2}</p>
                   </div>
                </div>
                <button onClick={() => window.location.href = `tel:${student.guardian_phone_2}`} className="w-12 h-12 bg-white text-slate-400 rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-all border border-slate-100">
                   <Phone size={20} fill="currentColor" />
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;
