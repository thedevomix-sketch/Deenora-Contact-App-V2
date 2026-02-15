
import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, ShieldCheck, User as UserIcon, Loader2, Save, X, Phone, Key, CheckCircle2, Trash2, Edit3, Smartphone, MessageSquare, Layers, MessageCircle, Shield, Check } from 'lucide-react';
import { supabase } from '../supabase';
import { Teacher, Language, Madrasah } from '../types';

interface TeachersProps {
  lang: Language;
  madrasah: Madrasah | null;
  onBack: () => void;
}

const Teachers: React.FC<TeachersProps> = ({ lang, madrasah, onBack }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form States
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [perms, setPerms] = useState({
    can_manage_students: true,
    can_manage_classes: false,
    can_send_sms: false,
    can_send_free_sms: false
  });

  useEffect(() => {
    fetchTeachers();
  }, [madrasah?.id]);

  const fetchTeachers = async () => {
    if (!madrasah) return;
    try {
      const { data } = await supabase.from('teachers').select('*').eq('madrasah_id', madrasah.id).order('created_at', { ascending: false });
      if (data) setTeachers(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!madrasah || !name || !phone || !code) return;
    setSaving(true);
    try {
      const payload = {
        madrasah_id: madrasah.id,
        name,
        phone,
        login_code: code,
        permissions: perms
      };

      if (editId) {
        await supabase.from('teachers').update(payload).eq('id', editId);
      } else {
        await supabase.from('teachers').insert(payload);
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchTeachers();
    } catch (e: any) { alert(e.message); } finally { setSaving(false); }
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    setPhone('');
    setCode('');
    setPerms({ can_manage_students: true, can_manage_classes: false, can_send_sms: false, can_send_free_sms: false });
  };

  const deleteTeacher = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await supabase.from('teachers').delete().eq('id', id);
      fetchTeachers();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-24">
      <div className="flex items-center gap-4 px-2">
        <button onClick={onBack} className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all border border-white/20 shadow-xl">
          <ArrowLeft size={24} strokeWidth={3} />
        </button>
        <h1 className="text-2xl font-black text-white font-noto drop-shadow-md">Manage Teachers</h1>
      </div>

      <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-full py-6 bg-white rounded-[2.5rem] text-[#8D30F4] font-black flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(46,11,94,0.3)] active:scale-95 transition-all">
        <UserPlus size={24} strokeWidth={3} /> Add New Teacher
      </button>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white" size={40} /></div>
      ) : (
        <div className="space-y-3.5 px-1">
          {teachers.map(t => (
            <div key={t.id} className="bg-white/95 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/50 shadow-xl relative overflow-hidden group">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 bg-[#F2EBFF] text-[#8D30F4] rounded-[1.5rem] flex items-center justify-center border border-[#8D30F4]/10 shadow-inner shrink-0">
                        <UserIcon size={30} />
                     </div>
                     <div className="min-w-0">
                        <h3 className="text-[17px] font-black text-[#2E0B5E] font-noto truncate leading-tight">{t.name}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Phone: {t.phone}</p>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => { setEditId(t.id); setName(t.name); setPhone(t.phone); setCode(t.login_code); setPerms(t.permissions); setIsModalOpen(true); }} className="w-10 h-10 bg-[#F2EBFF] text-[#8D30F4] rounded-xl flex items-center justify-center shadow-sm active:scale-90 transition-all border border-[#8D30F4]/5"><Edit3 size={18} /></button>
                     <button onClick={() => deleteTeacher(t.id)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shadow-sm active:scale-90 transition-all border border-red-100/50"><Trash2 size={18} /></button>
                  </div>
               </div>

               <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-50">
                  <div className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${t.permissions?.can_manage_students ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-300'}`}>
                    <Smartphone size={10} strokeWidth={3} /> Students
                  </div>
                  <div className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${t.permissions?.can_manage_classes ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-300'}`}>
                    <Layers size={10} strokeWidth={3} /> Classes
                  </div>
                  <div className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${t.permissions?.can_send_sms ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-300'}`}>
                    <MessageSquare size={10} strokeWidth={3} /> System SMS
                  </div>
                  <div className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${t.permissions?.can_send_free_sms ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-300'}`}>
                    <MessageCircle size={10} strokeWidth={3} /> Free SMS
                  </div>
               </div>
            </div>
          ))}
          {teachers.length === 0 && (
            <div className="text-center py-24 bg-white/10 rounded-[3rem] border-2 border-dashed border-white/30 backdrop-blur-sm">
               <UserIcon size={40} className="mx-auto text-white/20 mb-4" />
               <p className="text-white/60 font-black text-xs uppercase tracking-[0.2em]">No Teachers Added Yet</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#080A12]/60 backdrop-blur-xl z-[500] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
           {/* Modal Content */}
           <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3.5rem] p-6 sm:p-10 shadow-2xl space-y-6 relative animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 border border-[#8D30F4]/5 max-h-[90vh] overflow-y-auto custom-scrollbar">
              
              {/* Close Handle for Mobile */}
              <div className="sm:hidden w-12 h-1.5 bg-slate-100 rounded-full mx-auto -mt-2 mb-4"></div>
              
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 sm:top-10 right-6 sm:right-10 text-slate-300 hover:text-[#8D30F4] transition-all p-1">
                 <X size={28} strokeWidth={3}/>
              </button>
              
              <div className="flex items-center gap-4 sm:gap-6">
                 <div className="w-14 sm:w-16 h-14 sm:h-16 bg-[#8D30F4]/10 rounded-2xl sm:rounded-[1.8rem] flex items-center justify-center text-[#8D30F4] shrink-0 border border-[#8D30F4]/10 shadow-inner">
                    {/* Fixed Error: Lucide icons do not support tailwind-like responsive props like 'sm:size'. Use fixed size. */}
                    <Shield size={32} />
                 </div>
                 <div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#2E0B5E] font-noto tracking-tight leading-tight">
                      {editId ? 'Edit Teacher' : 'Add New Teacher'}
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Staff Access Credentials</p>
                 </div>
              </div>
              
              <div className="space-y-4">
                 <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                         <UserIcon size={12}/> Teacher Name
                       </label>
                       <div className="relative">
                          <input 
                            type="text" 
                            className="w-full h-[56px] bg-slate-50 rounded-2xl px-5 font-black text-[#2E0B5E] outline-none focus:border-[#8D30F4]/30 focus:bg-white border-2 border-transparent transition-all shadow-inner" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="e.g. Abdur Rahman" 
                          />
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <Phone size={12}/> Mobile Number
                          </label>
                          <input 
                            type="tel" 
                            className="w-full h-[56px] bg-slate-50 rounded-2xl px-5 font-black text-[#2E0B5E] outline-none focus:border-[#8D30F4]/30 focus:bg-white border-2 border-transparent transition-all shadow-inner" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            placeholder="017XXXXXXXX" 
                          />
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <Key size={12}/> Login PIN
                          </label>
                          <input 
                            type="text" 
                            className="w-full h-[56px] bg-slate-50 rounded-2xl px-5 font-black text-[#8D30F4] outline-none focus:border-[#8D30F4]/30 focus:bg-white border-2 border-transparent transition-all shadow-inner" 
                            value={code} 
                            onChange={(e) => setCode(e.target.value)} 
                            placeholder="Secret Code" 
                          />
                       </div>
                    </div>
                 </div>

                 <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between px-1">
                       <p className="text-[10px] font-black text-[#8D30F4] uppercase tracking-[0.2em] flex items-center gap-2">Permissions</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <button 
                         type="button"
                         onClick={() => setPerms({...perms, can_manage_students: !perms.can_manage_students})} 
                         className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all active:scale-[0.95] text-center ${perms.can_manage_students ? 'bg-green-50/50 border-green-200 text-green-700 shadow-sm' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
                       >
                          <Smartphone size={22} className={perms.can_manage_students ? 'text-green-500' : ''} />
                          <span className="text-[10px] font-black uppercase leading-tight">Students</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${perms.can_manage_students ? 'bg-green-500 text-white' : 'bg-slate-200'}`}>
                             {perms.can_manage_students && <Check size={12} strokeWidth={4} />}
                          </div>
                       </button>

                       <button 
                         type="button"
                         onClick={() => setPerms({...perms, can_manage_classes: !perms.can_manage_classes})} 
                         className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all active:scale-[0.95] text-center ${perms.can_manage_classes ? 'bg-blue-50/50 border-blue-200 text-blue-700 shadow-sm' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
                       >
                          <Layers size={22} className={perms.can_manage_classes ? 'text-blue-500' : ''} />
                          <span className="text-[10px] font-black uppercase leading-tight">Classes</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${perms.can_manage_classes ? 'bg-blue-500 text-white' : 'bg-slate-200'}`}>
                             {perms.can_manage_classes && <Check size={12} strokeWidth={4} />}
                          </div>
                       </button>

                       <button 
                         type="button"
                         onClick={() => setPerms({...perms, can_send_sms: !perms.can_send_sms})} 
                         className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all active:scale-[0.95] text-center ${perms.can_send_sms ? 'bg-orange-50/50 border-orange-200 text-orange-700 shadow-sm' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
                       >
                          <MessageSquare size={22} className={perms.can_send_sms ? 'text-orange-500' : ''} />
                          <span className="text-[10px] font-black uppercase leading-tight">System SMS</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${perms.can_send_sms ? 'bg-orange-500 text-white' : 'bg-slate-200'}`}>
                             {perms.can_send_sms && <Check size={12} strokeWidth={4} />}
                          </div>
                       </button>

                       <button 
                         type="button"
                         onClick={() => setPerms({...perms, can_send_free_sms: !perms.can_send_free_sms})} 
                         className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all active:scale-[0.95] text-center ${perms.can_send_free_sms ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-slate-50 border-transparent text-slate-400 opacity-60'}`}
                       >
                          <MessageCircle size={22} className={perms.can_send_free_sms ? 'text-indigo-500' : ''} />
                          <span className="text-[10px] font-black uppercase leading-tight">Free SMS</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${perms.can_send_free_sms ? 'bg-indigo-500 text-white' : 'bg-slate-200'}`}>
                             {perms.can_send_free_sms && <Check size={12} strokeWidth={4} />}
                          </div>
                       </button>
                    </div>
                 </div>
              </div>

              <div className="pt-4">
                 <button 
                   onClick={handleSave} 
                   disabled={saving || !name || !phone || !code} 
                   className="w-full h-16 premium-btn text-white font-black rounded-[2rem] shadow-[0_20px_40px_rgba(141,48,244,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all text-lg font-noto disabled:opacity-30 disabled:grayscale"
                 >
                    {saving ? <Loader2 className="animate-spin" size={24} /> : (
                       <>
                         <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Save size={22} />
                         </div>
                         <span>{editId ? 'Update Teacher' : 'Add Teacher'}</span>
                       </>
                    )}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
