
import React, { useState, useEffect, useMemo } from 'react';
// Added Loader2 to the imports
import { ArrowLeft, Plus, Phone, Search, CheckCircle2, MessageSquare, X, BookOpen, ChevronDown, Check, PhoneCall, Smartphone, Loader2 } from 'lucide-react';
import { supabase, offlineApi, smsApi } from '../supabase';
import { Class, Student, Language } from '../types';
import { t } from '../translations';

interface StudentsProps {
  selectedClass: Class;
  onStudentClick: (student: Student) => void;
  onAddClick: () => void;
  onBack: () => void;
  lang: Language;
  dataVersion: number;
  triggerRefresh: () => void;
}

const STATIC_DEFAULTS = [
  { id: 'def-1', title: 'উপস্থিতি (Attendance)', body: 'আস-সালামু আলাইকুম, আজ আপনার সন্তান মাদরাসায় উপস্থিত হয়েছে। ধন্যবাদ।' },
  { id: 'def-2', title: 'অনুপস্থিতি (Absence)', body: 'আস-সালামু আলাইকুম, আজ আপনার সন্তান মাদরাসায় অনুপস্থিত। অনুগ্রহ করে কারণ জানান।' }
];

const Students: React.FC<StudentsProps> = ({ selectedClass, onStudentClick, onAddClick, onBack, lang, dataVersion, triggerRefresh }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchTemplates();
  }, [selectedClass.id, dataVersion]);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      list = list.filter(s => s.student_name.toLowerCase().includes(lowerQuery));
    }
    return list;
  }, [searchQuery, students]);

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('sms_templates').select('*').eq('madrasah_id', user.id).order('created_at', { ascending: false });
      setTemplates(data && data.length > 0 ? data : STATIC_DEFAULTS);
    } catch (err) { setTemplates(STATIC_DEFAULTS); }
  };

  const fetchStudents = async () => {
    setLoading(true);
    if (navigator.onLine) {
      try {
        const { data } = await supabase.from('students').select('*, classes(*)').eq('class_id', selectedClass.id).order('roll', { ascending: true, nullsFirst: false });
        if (data) setStudents(data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    } else { setLoading(false); }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleNativeSMS = () => {
    if (!selectedTemplate || selectedIds.size === 0) return;
    const selectedStudents = students.filter(s => selectedIds.has(s.id));
    const phones = selectedStudents.map(s => s.guardian_phone).join(',');
    const message = encodeURIComponent(selectedTemplate.body);
    
    // Check if it's iOS or Android/Web
    const separator = /iPad|iPhone|iPod/.test(navigator.userAgent) ? '&' : '?';
    window.location.href = `sms:${phones}${separator}body=${message}`;
  };

  const handlePremiumSMS = async () => {
    if (!selectedTemplate || selectedIds.size === 0) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      
      const selectedStudents = students.filter(s => selectedIds.has(s.id));
      await smsApi.sendBulk(user.id, selectedStudents, selectedTemplate.body);
      
      alert(lang === 'bn' ? 'এসএমএস সফলভাবে পাঠানো হয়েছে' : 'SMS sent successfully');
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(lang === 'bn' ? 'ব্যর্থ হয়েছে: ' + err.message : 'Failed: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 min-h-[85vh] pb-80">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-xl text-white active:scale-90 transition-all border border-white/20 shadow-lg flex items-center justify-center">
              <ArrowLeft size={24} strokeWidth={3} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-white truncate font-noto leading-tight drop-shadow-md">{selectedClass.class_name}</h1>
              <p className="text-[11px] font-black text-white/70 uppercase tracking-widest leading-none mt-1">
                {students.length} {t('students_count', lang)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => { setIsSelectionMode(!isSelectionMode); if (isSelectionMode) setSelectedIds(new Set()); }}
              className={`shrink-0 w-11 h-11 rounded-xl transition-all active:scale-95 border flex items-center justify-center ${isSelectionMode ? 'bg-white text-[#8D30F4] border-white shadow-xl' : 'bg-white/20 text-white border-white/20'}`}>
              {isSelectionMode ? <X size={20} strokeWidth={3} /> : <CheckCircle2 size={20} strokeWidth={2.5} />}
            </button>
            <button onClick={onAddClick} className="premium-btn text-white px-5 py-2.5 rounded-xl text-[13px] font-black flex items-center gap-2 shadow-2xl active:scale-95 transition-all border border-white/20">
              <Plus size={16} strokeWidth={3.5} /> {t('add_student', lang)}
            </button>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B168A] group-focus-within:scale-110 transition-transform" size={20} strokeWidth={3} />
          <input type="text" placeholder={t('search_placeholder', lang)}
            className="w-full pl-12 pr-6 py-4.5 bg-white/90 backdrop-blur-md border-2 border-transparent rounded-[1.8rem] outline-none text-[#2D3142] placeholder:text-[#9B6DFF] font-black text-base focus:border-[#8D30F4] shadow-xl transition-all"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {filteredStudents.map(student => (
          <div key={student.id} onClick={() => isSelectionMode ? toggleSelection(student.id) : onStudentClick(student)}
            className={`p-6 rounded-[2.5rem] border backdrop-blur-md transition-all flex items-center justify-between shadow-xl relative overflow-hidden ${isSelectionMode && selectedIds.has(student.id) ? 'bg-white text-[#8D30F4] border-[#8D30F4] scale-105' : 'bg-white/95 border-white/40 active:scale-[0.98]'}`}>
            <div className="flex items-center gap-5 flex-1 min-w-0">
              {isSelectionMode ? (
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-all ${selectedIds.has(student.id) ? 'bg-[#8D30F4] text-white border-[#8D30F4]' : 'bg-slate-50 border-slate-100 text-slate-200'}`}>
                  <CheckCircle2 size={28} fill={selectedIds.has(student.id) ? "white" : "none"} />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 shrink-0 bg-[#F2EBFF] border-[#8D30F4]/10 text-[#8D30F4] shadow-inner">
                  <span className="text-[9px] font-black opacity-40 uppercase leading-none mb-1">Roll</span>
                  <span className="text-xl font-black leading-none">{student.roll || '-'}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-[#2E0B5E] text-[19px] font-noto truncate leading-tight">{student.student_name}</h3>
                <p className="text-[11px] font-black text-[#A179FF] truncate uppercase tracking-widest mt-1.5">{student.guardian_name || '-'}</p>
              </div>
            </div>
            {!isSelectionMode && (
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <button onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${student.guardian_phone}`; }} className="w-12 h-12 bg-[#F2EBFF] text-[#8D30F4] rounded-2xl active:scale-90 transition-all border border-[#8D30F4]/10 flex items-center justify-center shadow-sm">
                  <Phone size={22} fill="currentColor" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); window.location.href = `https://wa.me/88${student.guardian_phone}`; }} className="w-12 h-12 bg-[#25d366] text-white rounded-2xl shadow-lg active:scale-90 transition-all flex items-center justify-center border border-white/20">
                  <PhoneCall size={22} fill="currentColor" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+95px)] left-1/2 -translate-x-1/2 w-[94%] max-w-md z-[150] animate-in slide-in-from-bottom-10">
          <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] p-7 shadow-[0_30px_70px_rgba(46,11,94,0.4)] border border-[#8D30F4]/10 flex flex-col gap-5">
            <button onClick={() => setShowTemplateMenu(!showTemplateMenu)} className={`w-full flex items-center justify-between p-5 rounded-[1.8rem] text-[15px] font-black transition-all border-2 ${selectedTemplate ? 'bg-[#8D30F4]/5 border-[#8D30F4] text-[#8D30F4]' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
              <div className="flex items-center gap-4 truncate">
                <BookOpen size={24} className="text-[#8D30F4]" />
                <span className="truncate">{selectedTemplate ? selectedTemplate.title : (lang === 'bn' ? 'মেসেজ টেমপ্লেট বেছে নিন' : 'Choose Template')}</span>
              </div>
              <ChevronDown size={24} className={`transition-transform duration-300 ${showTemplateMenu ? 'rotate-180' : ''}`} />
            </button>

            {showTemplateMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-4 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-h-72 overflow-y-auto z-[160] p-3 animate-in slide-in-from-bottom-5">
                {templates.map(tmp => (
                  <button key={tmp.id} onClick={() => { setSelectedTemplate(tmp); setShowTemplateMenu(false); }} className={`w-full text-left px-6 py-5 rounded-2xl flex items-center justify-between transition-all mb-1 ${selectedTemplate?.id === tmp.id ? 'bg-[#8D30F4] text-white shadow-xl' : 'hover:bg-slate-50 text-[#2E0B5E]'}`}>
                    <div className="min-w-0"><p className="text-sm font-black truncate">{tmp.title}</p></div>
                    {selectedTemplate?.id === tmp.id && <Check size={20} strokeWidth={4} />}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handlePremiumSMS}
                disabled={sending || !selectedTemplate}
                className={`py-5 rounded-[1.8rem] flex items-center justify-center gap-3 font-black text-xs uppercase shadow-xl transition-all ${selectedTemplate ? 'premium-btn text-white' : 'bg-slate-100 text-slate-300 opacity-50'}`}
              >
                {sending ? <Loader2 className="animate-spin" size={18} /> : <MessageSquare size={18} fill="currentColor" />} 
                {lang === 'bn' ? 'সিস্টেম SMS' : 'Premium SMS'}
              </button>
              
              <button 
                onClick={handleNativeSMS}
                disabled={!selectedTemplate}
                className={`py-5 rounded-[1.8rem] flex items-center justify-center gap-3 font-black text-xs uppercase shadow-xl transition-all ${selectedTemplate ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-300 opacity-50'}`}
              >
                <Smartphone size={18} /> 
                {t('native_sms', lang)}
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#8D30F4]"></div>
                <p className="text-[10px] font-black text-[#8D30F4] uppercase tracking-widest">{selectedIds.size} {t('selected', lang)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;