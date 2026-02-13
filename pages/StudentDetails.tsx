import React from 'react';
import { ArrowLeft, Edit3, User as UserIcon, Smartphone, PhoneCall, UserCheck, MessageCircle, Hash, BookOpen } from 'lucide-react';
import { Student, Language } from '../types';

interface StudentDetailsProps {
  student: Student;
  onEdit: () => void;
  onBack: () => void;
  lang: Language;
}

const StudentDetails: React.FC<StudentDetailsProps> = ({ student, onEdit, onBack, lang }) => {
  return (
    <div className="animate-in slide-in-from-right-4 duration-500 pb-24 space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between px-2">
        <button onClick={onBack} className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-[1.2rem] flex items-center justify-center text-white active:scale-90 transition-all border border-white/20 shadow-xl">
          <ArrowLeft size={24} strokeWidth={3} />
        </button>
        <button onClick={onEdit} className="w-12 h-12 bg-white rounded-[1.2rem] flex items-center justify-center text-[#8D30F4] active:scale-90 transition-all border border-white shadow-xl">
          <Edit3 size={24} />
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] p-6 border border-white shadow-[0_30px_80px_rgba(46,11,94,0.25)] relative overflow-hidden">
        {/* Class Badge */}
        <div className="flex justify-center mb-6">
           <div className="px-6 py-2 bg-gradient-to-r from-[#8D30F4] to-[#A179FF] rounded-full shadow-lg border-2 border-white flex items-center gap-2">
              <BookOpen size={14} className="text-white" />
              <span className="text-[11px] font-black text-white uppercase tracking-widest">{student.classes?.class_name || 'N/A'}</span>
           </div>
        </div>
        
        <div className="flex flex-col items-center text-center">
           <div className="w-32 h-32 bg-gradient-to-br from-[#F2EBFF] to-white rounded-[2.8rem] flex items-center justify-center text-[#A179FF] border-4 border-white shadow-2xl overflow-hidden mb-5">
             {student.photo_url ? <img src={student.photo_url} className="w-full h-full object-cover" /> : <UserIcon size={55} strokeWidth={2.5} />}
           </div>
           
           <h2 className="text-2xl font-black text-[#2E0B5E] font-noto tracking-tight leading-tight mb-2">{student.student_name}</h2>
           
           <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#F2EBFF] rounded-xl border border-[#8D30F4]/10">
             <Hash size={14} className="text-[#8D30F4]" />
             <p className="text-[12px] font-black text-[#8D30F4] uppercase tracking-widest">Roll: {student.roll || '-'}</p>
           </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="mt-10 grid grid-cols-2 gap-4">
           <button 
             onClick={() => window.location.href = `https://wa.me/88${student.guardian_phone}`} 
             className="flex flex-col items-center justify-center p-5 bg-[#25d366]/5 border-2 border-[#25d366]/10 rounded-[2rem] text-[#25d366] active:scale-95 transition-all group"
           >
              <div className="w-14 h-14 bg-[#25d366] text-white rounded-2xl flex items-center justify-center mb-3 shadow-lg group-active:scale-90 transition-transform">
                <PhoneCall size={26} fill="currentColor" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">WA Call</span>
           </button>
           
           <button 
             onClick={() => window.location.href = `https://wa.me/88${student.guardian_phone}?text=আস-সালামু আলাইকুম`} 
             className="flex flex-col items-center justify-center p-5 bg-[#25d366]/5 border-2 border-[#25d366]/10 rounded-[2rem] text-[#25d366] active:scale-95 transition-all group"
           >
              <div className="w-14 h-14 bg-[#25d366] text-white rounded-2xl flex items-center justify-center mb-3 shadow-lg group-active:scale-90 transition-transform">
                <MessageCircle size={26} fill="currentColor" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">WA Message</span>
           </button>
        </div>

        {/* Info List */}
        <div className="mt-8 space-y-3">
           {/* Guardian Info */}
           <div className="flex items-center gap-4 p-4 bg-[#F2EBFF]/40 rounded-2xl border border-white">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#8D30F4] shrink-0 shadow-sm">
                 <UserCheck size={20} />
              </div>
              <div className="min-w-0">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Guardian Name</p>
                 <p className="text-[15px] font-black text-[#2E0B5E] truncate font-noto">{student.guardian_name || 'N/A'}</p>
              </div>
           </div>

           {/* Phone Info */}
           <div className="flex items-center gap-4 p-4 bg-[#F2EBFF]/40 rounded-2xl border border-white">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#8D30F4] shrink-0 shadow-sm">
                 <Smartphone size={20} />
              </div>
              <div className="min-w-0">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Guardian Phone</p>
                 <p className="text-[16px] font-black text-[#2E0B5E] tracking-tight">{student.guardian_phone}</p>
              </div>
           </div>

           {/* Secondary Phone if exists */}
           {student.guardian_phone_2 && (
             <div className="flex items-center gap-4 p-4 bg-[#F2EBFF]/20 rounded-2xl border border-white/50">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                   <Smartphone size={18} />
                </div>
                <div className="min-w-0">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Secondary Phone</p>
                   <p className="text-[15px] font-black text-slate-600 tracking-tight">{student.guardian_phone_2}</p>
                </div>
             </div>
           )}
        </div>
      </div>
      
      {/* Bottom Footer Action (Optional) */}
      <div className="px-6 py-4 bg-white/10 backdrop-blur-md rounded-[2.5rem] border border-white/20 flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <p className="text-[10px] font-black text-white uppercase tracking-widest">Active Guardian Contact</p>
      </div>
    </div>
  );
};

export default StudentDetails;