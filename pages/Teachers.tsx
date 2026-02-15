
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
        <div className="fixed inset-0 bg-[#080A12]/40 backdrop-blur-2xl z-[500] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 shadow-[0_40px_100px_rgba(141,48,244,0.2)] space-y-8 relative animate-in zoom-in-95 duration-300 border border-[#8D30F4]/5">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-300 hover:text-[#8D30F4] transition-all"><X size={28} strokeWidth={3}/></button>
              
              <div className="flex items-center gap-5">
                 <div className="w-16 h-16 bg-[#8D30F4]/10 rounded-[1.8rem] flex items-center justify-center text-[#8D30F4] shrink-0 border border-[#8D30F4]/10 shadow-inner">
                    <Shield size={32} />
                 </div>
                 <div>
                    <h2 className="text-xl font-black text-[#2E0B5E] font-noto tracking-tight leading-tight">{editId ? 'Edit Teacher' : 'Add New Teacher'}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Staff Credentials</p>
                 </div>
              </div>
              
              <div className="space-y-5">
                 <div className="space-y-2 px-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><UserIcon size={12}/> Teacher Name</label>
                    <input type="text" className="w-full h-[60px] bg-slate-50 rounded-[1.5rem] px-6 font-black text-[#2E0B5E] outline-none focus:border-[#8D30F4]/30 focus:bg-white border-2 border-slate-50 transition-all shadow-inner" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" />
                 </div>
                 <div className="space-y-2 px-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Phone size={12}/> Phone Number</label>
                    <input type="tel" className="w-full h-[60px] bg-slate-50 rounded-[1.5rem] px-6 font-black text-[#2E0B5E] outline-none focus:border-[#8D30F4]/30 focus:bg-white border-2 border-slate-50 transition-all shadow-inner" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="017XXXXXXXX" />
                 </div>
                 <div className="space-y-2 px-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Key size={12}/> Login Code (PIN)</label>
                    <input type="text" className="w-full h-[60px] bg-slate-50 rounded-[1.5rem] px-6 font-black text-[#8D30F4] outline-none focus:border-[#8D30F4]/30 focus:bg-white border-2 border-slate-50 transition-all shadow-inner" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Secret PIN" />
                 </div>

                 <div className="pt-2 space-y-4">
                    <p className="text-[10px] font-black text-[#8D30F4] uppercase tracking-[0.2em] px-2 flex items-center gap-2">Permissions</p>
                    <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                       <button onClick={() => setPerms({...perms, can_manage_students: !perms.can_manage_students})} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-[0.98] ${perms.can_manage_students ? 'bg-green-50/50 border-green-200 text-green-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                          <div className="flex items-center gap-3"><Smartphone size={18}/> <span className="text-[13px] font-black uppercase tracking-tight">Manage Students</span></div>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${perms.can_manage_students ? 'bg-green-500 text-white' : 'bg-slate-200'}`}>
                             {perms.can_manage_students && <Check size={12} strokeWidth={4} />}
                          </div>
                       </button>
                       <button onClick={() => setPerms({...perms, can_manage_classes: !perms.can_manage_classes})} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-[0.98] ${perms.can_manage_classes ? 'bg-blue-50/50 border-blue-200 text-blue-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                          <div className="flex items-center gap-3"><Layers size={18}/> <span className="text-[13px] font-black uppercase tracking-tight">Manage Classes</span></div>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${perms.can_manage_classes ? 'bg-blue-500 text-white' : 'bg-slate-200'}`}>
                             {perms.can_manage_classes && <Check size={12} strokeWidth={4} />}
                          </div>
                       </button>
                       <button onClick={() => setPerms({...perms, can_send_sms: !perms.can_send_sms})} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-[0.98] ${perms.can_send_sms ? 'bg-orange-50/50 border-orange-200 text-orange-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                          <div className="flex items-center gap-3"><MessageSquare size={18}/> <span className="text-[13px] font-black uppercase tracking-tight">System SMS</span></div>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${perms.can_send_sms ? 'bg-orange-500 text-white' : 'bg-slate-200'}`}>
                             {perms.can_send_sms && <Check size={12} strokeWidth={4} />}
                          </div>
                       </button>
                       <button onClick={() => setPerms({...perms, can_send_free_sms: !perms.can_send_free_sms})} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all active:scale-[0.98] ${perms.can_send_free_sms ? 'bg-indigo-50/50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                          <div className="flex items-center gap-3"><MessageCircle size={18}/> <span className="text-[13px] font-black uppercase tracking-tight">Free SIM SMS</span></div>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${perms.can_send_free_sms ? 'bg-indigo-500 text-white' : 'bg-slate-200'}`}>
                             {perms.can_send_free_sms && <Check size={12} strokeWidth={4} />}
                          </div>
                       </button>
                    </div>
                 </div>
              </div>

              <button onClick={handleSave} disabled={saving} className="w-full h-16 premium-btn text-white font-black rounded-full shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all text-lg">
                 {saving ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24}/> {editId ? 'Update Profile' : 'Add Teacher'}</>}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
