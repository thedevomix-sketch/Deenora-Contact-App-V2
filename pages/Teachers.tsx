
import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, ShieldCheck, User as UserIcon, Loader2, Save, X, Phone, Key, CheckCircle2, Trash2, Edit3, Smartphone, MessageSquare, Layers } from 'lucide-react';
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
    can_send_sms: false
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
    setPerms({ can_manage_students: true, can_manage_classes: false, can_send_sms: false });
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

      <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-full py-5 bg-white rounded-[2rem] text-[#8D30F4] font-black flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
        <UserPlus size={22} strokeWidth={3} /> Add New Teacher
      </button>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-white" size={40} /></div>
      ) : (
        <div className="space-y-3">
          {teachers.map(t => (
            <div key={t.id} className="bg-white/95 backdrop-blur-md p-5 rounded-[2.2rem] border border-white/50 shadow-lg relative overflow-hidden group">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-[#F2EBFF] text-[#8D30F4] rounded-2xl flex items-center justify-center border border-[#8D30F4]/10 shadow-inner">
                        <UserIcon size={28} />
                     </div>
                     <div>
                        <h3 className="text-lg font-black text-[#2E0B5E] font-noto">{t.name}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone: {t.phone}</p>
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => { setEditId(t.id); setName(t.name); setPhone(t.phone); setCode(t.login_code); setPerms(t.permissions); setIsModalOpen(true); }} className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shadow-sm"><Edit3 size={18} /></button>
                     <button onClick={() => deleteTeacher(t.id)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shadow-sm"><Trash2 size={18} /></button>
                  </div>
               </div>

               <div className="flex gap-2 pt-3 border-t border-slate-50">
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${t.permissions.can_manage_students ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-300'}`}>
                    <Smartphone size={10} /> Students
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${t.permissions.can_manage_classes ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-300'}`}>
                    <Layers size={10} /> Classes
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${t.permissions.can_send_sms ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-300'}`}>
                    <MessageSquare size={10} /> SMS
                  </div>
               </div>
            </div>
          ))}
          {teachers.length === 0 && (
            <div className="text-center py-20 bg-white/10 rounded-[3rem] border-2 border-dashed border-white/30 backdrop-blur-sm">
               <p className="text-white/60 font-black text-xs uppercase tracking-widest">No Teachers Added Yet</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[500] flex items-center justify-center p-6 animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl space-y-6 relative overflow-hidden">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-300"><X size={26} strokeWidth={3}/></button>
              <h2 className="text-xl font-black text-[#2E0B5E] font-noto tracking-tight">{editId ? 'Edit Teacher' : 'Add New Teacher'}</h2>
              
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1"><UserIcon size={12}/> Teacher Name</label>
                    <input type="text" className="w-full h-14 bg-slate-50 rounded-2xl px-5 font-black text-[#2E0B5E] outline-none focus:border-[#8D30F4] border-2 border-transparent" value={name} onChange={(e) => setName(e.target.value)} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1"><Phone size={12}/> Phone Number</label>
                    <input type="tel" className="w-full h-14 bg-slate-50 rounded-2xl px-5 font-black text-[#2E0B5E] outline-none focus:border-[#8D30F4] border-2 border-transparent" value={phone} onChange={(e) => setPhone(e.target.value)} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1"><Key size={12}/> Login Code (PIN)</label>
                    <input type="text" className="w-full h-14 bg-slate-50 rounded-2xl px-5 font-black text-[#8D30F4] outline-none focus:border-[#8D30F4] border-2 border-transparent" value={code} onChange={(e) => setCode(e.target.value)} />
                 </div>

                 <div className="pt-2 space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Permissions</p>
                    <div className="space-y-2">
                       <button onClick={() => setPerms({...perms, can_manage_students: !perms.can_manage_students})} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${perms.can_manage_students ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                          <div className="flex items-center gap-3"><Smartphone size={18}/> <span className="text-sm font-black">Manage Students</span></div>
                          {perms.can_manage_students && <CheckCircle2 size={18} />}
                       </button>
                       <button onClick={() => setPerms({...perms, can_manage_classes: !perms.can_manage_classes})} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${perms.can_manage_classes ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                          <div className="flex items-center gap-3"><Layers size={18}/> <span className="text-sm font-black">Manage Classes</span></div>
                          {perms.can_manage_classes && <CheckCircle2 size={18} />}
                       </button>
                       <button onClick={() => setPerms({...perms, can_send_sms: !perms.can_send_sms})} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${perms.can_send_sms ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                          <div className="flex items-center gap-3"><MessageSquare size={18}/> <span className="text-sm font-black">Send SMS</span></div>
                          {perms.can_send_sms && <CheckCircle2 size={18} />}
                       </button>
                    </div>
                 </div>
              </div>

              <button onClick={handleSave} disabled={saving} className="w-full h-16 premium-btn text-white font-black rounded-3xl shadow-xl flex items-center justify-center gap-3 mt-4">
                 {saving ? <Loader2 className="animate-spin" size={24} /> : <><Save size={24}/> {editId ? 'Update Teacher' : 'Add Teacher'}</>}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
