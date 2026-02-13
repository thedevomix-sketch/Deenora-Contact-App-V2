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
        <button onClick={onBack} className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-[1rem] flex items-center justify-center text-white active:scale-90 transition-all border border-white/20 shadow-xl">
          <ArrowLeft size={22} strokeWidth={3} />
        </button>
        <button onClick={onEdit} className="w-11 h-11 bg-white rounded-[1rem] flex items-center justify-center text-[#8D30F4] active:scale-90 transition-all border border-white shadow-xl">
          <Edit3 size={22} />
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white shadow-[0_25px_60px_rgba(46,11,94,0.2)] relative overflow-hidden">
        {/* Class Badge */}
        <div className="flex justify-center mb-5">
           <div className="px-5 py-1.5 bg-gradient-to-r from-[#8D30F4] to-[#A179FF] rounded-full shadow-md border border-white flex items-center gap-2">
              <BookOpen size={12} className="text-white" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{student.classes?.class_name || 'N/A'}</span>
           </div>
        </div>
        
        <div className="flex flex-col items-center text-center">
           <div className="w-28 h-28 bg-gradient-to-br from-[#F2EBFF] to-white rounded-[2.2rem] flex items-center justify-center text-[#A179FF] border-4 border-white shadow-xl overflow-hidden mb-4">
             {student.photo_url ? <img src={student.photo_url} className="w-full h-full object-cover" /> : <UserIcon size={48} strokeWidth={2.5} />}
           </div>
           
           <h2 className="text-xl font-black text-[#2E0B5E] font-noto tracking-tight leading-tight mb-2">{student.student_name}</h2>
           
           <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F2EBFF] rounded-lg border border-[#8D30F4]/10">
             <Hash size={12} className="text-[#8D30F4]" />
             <p className="text-[11px] font-black text-[#8D30F4] uppercase tracking-widest leading-none">Roll: {student.roll || '-'}</p>
           </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="mt-8 grid grid-cols-2 gap-3.5">
           <button 
             onClick={() => window.location.href = `https://wa.me/88${student.guardian_phone}`} 
             className="flex flex-col items-center justify-center p-4 bg-[#25d366]/5 border border-[#25d366]/20 rounded-[1.5rem] text-[#25d366] active:scale-95 transition-all group"
           >
              <div className="w-12 h-12 bg-[#25d366] text-white rounded-2xl flex items-center justify-center mb-2.5 shadow-md group-active:scale-90 transition-transform">
                <PhoneCall size={22} fill="currentColor" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest">WA Call</span>
           </button>
           
           <button 
             onClick={() => window.location.href = `https://wa.me/88${student.guardian_phone}?text=${encodeURIComponent('আস-সালামু আলাইকুম')}`} 
             className="flex flex-col items-center justify-center p-4 bg-[#25d366]/5 border border-[#25d366]/20 rounded-[1.5rem] text-[#25d366] active:scale-95 transition-all group"
           >
              <div className="w-12 h-12 bg-[#25d366] text-white rounded-2xl flex items-center justify-center mb-2.5 shadow-md group-active:scale-90 transition-transform">
                <MessageCircle size={22} fill="currentColor" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest">WA Message</span>
           </button>
        </div>

        {/* Info List */}
        <div className="mt-7 space-y-2.5">
           {/* Guardian Info */}
           <div className="flex items-center gap-3.5 p-3.5 bg-[#F2EBFF]/40 rounded-xl border border-white">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-[#8D30F4] shrink-0 shadow-sm border border-[#8D30F4]/5">
                 <UserCheck size={18} />
              </div>
              <div className="min-w-0">
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Guardian Name</p>
                 <p className="text-[14px] font-black text-[#2E0B5E] truncate font-noto">{student.guardian_name || 'N/A'}</p>
              </div>
           </div>

           {/* Phone Info - Strictly Info Only, No Call Buttons Here */}
           <div className="flex items-center gap-3.5 p-3.5 bg-[#F2EBFF]/40 rounded-xl border border-white">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-[#8D30F4] shrink-0 shadow-sm border border-[#8D30F4]/5">
                 <Smartphone size={18} />
              </div>
              <div className="min-w-0">
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Guardian Phone</p>
                 <p className="text-[15px] font-black text-[#2E0B5E] tracking-tight">{student.guardian_phone}</p>
              </div>
           </div>

           {/* Secondary Phone if exists */}
           {student.guardian_phone_2 && (
             <div className="flex items-center gap-3.5 p-3.5 bg-[#F2EBFF]/20 rounded-xl border border-white/50">
                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                   <Smartphone size={16} />
                </div>
                <div className="min-w-0">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Secondary Phone</p>
                   <p className="text-[14px] font-black text-slate-600 tracking-tight">{student.guardian_phone_2}</p>
                </div>
             </div>
           )}
        </div>
      </div>
      
      {/* Bottom Footer Action (Optional) */}
      <div className="px-6 py-3.5 bg-white/10 backdrop-blur-md rounded-[2rem] border border-white/20 flex items-center justify-center gap-2.5 shadow-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
          <p className="text-[9px] font-black text-white uppercase tracking-widest">Active WhatsApp Connection</p>
      </div>
    </div>
  );
};

export default StudentDetails;