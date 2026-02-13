
import React, { useState, useEffect, useMemo } from 'react';
// Added Loader2 to the imports
import { ArrowLeft, Plus, Phone, Search, CheckCircle2, MessageSquare, X, BookOpen, ChevronDown, Check, PhoneCall, Smartphone, Loader2, ListChecks } from 'lucide-react';
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

  const allFilteredSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every(s => selectedIds.has(s.id));
  }, [filteredStudents, selectedIds]);

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

  const toggleSelectAll = () => {
    const newSelected = new Set(selectedIds);
    if (allFilteredSelected) {
      // Unselect all currently filtered students
      filteredStudents.forEach(s => newSelected.delete(s.id));
    } else {
      // Select all currently filtered students
      filteredStudents.forEach(s => newSelected.add(s.id));
    }
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
    <div className="space-y-5 animate-in slide-in-from-right-4 duration-300 min-h-[85vh] pb-80">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl text-white active:scale-90 transition-all border border-white/20 shadow-lg flex items-center justify-center">
              <ArrowLeft size={22} strokeWidth={3} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-white truncate font-noto leading-tight drop-shadow-md">{selectedClass.class_name}</h1>
              <p className="text-[10px] font-black text-white/70 uppercase tracking-widest leading-none mt-1">
                {students.length} {t('students_count', lang)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isSelectionMode && (
              <button onClick={toggleSelectAll}
                className={`shrink-0 h-10 px-3 rounded-xl transition-all active:scale-95 border flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-wider ${allFilteredSelected ? 'bg-white text-[#8D30F4] border-white shadow-xl' : 'bg-white/20 text-white border-white/20'}`}>
                <ListChecks size={18} strokeWidth={3} />
                {allFilteredSelected ? (lang === 'bn' ? 'সব মুছুন' : 'Clear All') : (lang === 'bn' ? 'সব নির্বাচন' : 'Select All')}
              </button>
            )}
            <button onClick={() => { setIsSelectionMode(!isSelectionMode); if (isSelectionMode) setSelectedIds(new Set()); }}
              className={`shrink-0 w-10 h-10 rounded-xl transition-all active:scale-95 border flex items-center justify-center ${isSelectionMode ? 'bg-white text-[#8D30F4] border-white shadow-xl' : 'bg-white/20 text-white border-white/20'}`}>
              {isSelectionMode ? <X size={18} strokeWidth={3} /> : <CheckCircle2 size={18} strokeWidth={2.5} />}
            </button>
            {!isSelectionMode && (
              <button onClick={onAddClick} className="premium-btn text-white px-4 py-2 rounded-xl text-[12px] font-black flex items-center gap-2 shadow-xl active:scale-95 transition-all border border-white/20">
                <Plus size={14} strokeWidth={3.5} /> {t('add_student', lang)}
              </button>
            )}
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B168A] group-focus-within:scale-110 transition-transform" size={18} strokeWidth={3} />
          <input type="text" placeholder={t('search_placeholder', lang)}
            className="w-full pl-11 pr-5 py-3.5 bg-white/90 backdrop-blur-md border-2 border-transparent rounded-[1.5rem] outline-none text-[#2D3142] placeholder:text-[#9B6DFF] font-black text-sm focus:border-[#8D30F4] shadow-lg transition-all"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="space-y-3">
        {filteredStudents.map(student => (
          <div key={student.id} onClick={() => isSelectionMode ? toggleSelection(student.id) : onStudentClick(student)}
            className={`p-4 rounded-3xl border backdrop-blur-md transition-all flex items-center justify-between shadow-lg relative overflow-hidden ${isSelectionMode && selectedIds.has(student.id) ? 'bg-white text-[#8D30F4] border-[#8D30F4] scale-102' : 'bg-white/95 border-white/40 active:scale-[0.98]'}`}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {isSelectionMode ? (
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-all ${selectedIds.has(student.id) ? 'bg-[#8D30F4] text-white border-[#8D30F4]' : 'bg-slate-50 border-slate-100 text-slate-200'}`}>
                  <CheckCircle2 size={24} fill={selectedIds.has(student.id) ? "white" : "none"} />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center border-2 shrink-0 bg-[#F2EBFF] border-[#8D30F4]/10 text-[#8D30F4] shadow-inner">
                  <span className="text-[8px] font-black opacity-40 uppercase leading-none mb-0.5">Roll</span>
                  <span className="text-lg font-black leading-none">{student.roll || '-'}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-[#2E0B5E] text-[17px] font-noto truncate leading-tight">{student.student_name}</h3>
                <p className="text-[10px] font-black text-[#A179FF] truncate uppercase tracking-widest mt-1">{student.guardian_name || '-'}</p>
              </div>
            </div>
            {!isSelectionMode && (
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${student.guardian_phone}`; }} className="w-11 h-11 bg-[#F2EBFF] text-[#8D30F4] rounded-2xl active:scale-90 transition-all border border-[#8D30F4]/10 flex items-center justify-center shadow-sm">
                  <Phone size={20} fill="currentColor" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); window.location.href = `https://wa.me/88${student.guardian_phone}`; }} className="w-11 h-11 bg-[#25d366] text-white rounded-2xl shadow-lg active:scale-90 transition-all flex items-center justify-center border border-white/20">
                  <PhoneCall size={20} fill="currentColor" />
                </button>
              </div>
            )}
          </div>
        ))}
        {filteredStudents.length === 0 && !loading && (
          <div className="py-20 text-center bg-white/10 rounded-[2rem] border-2 border-dashed border-white/30 backdrop-blur-sm">
            <p className="text-white font-black text-[11px] uppercase tracking-widest">{t('no_students', lang)}</p>
          </div>
        )}
      </div>

      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+95px)] left-1/2 -translate-x-1/2 w-[94%] max-w-md z-[150] animate-in slide-in-from-bottom-10">
          <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-5 shadow-[0_25px_60px_rgba(46,11,94,0.4)] border border-[#8D30F4]/10 flex flex-col gap-4">
            <button onClick={() => setShowTemplateMenu(!showTemplateMenu)} className={`w-full flex items-center justify-between p-4 rounded-[1.5rem] text-sm font-black transition-all border-2 ${selectedTemplate ? 'bg-[#8D30F4]/5 border-[#8D30F4] text-[#8D30F4]' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
              <div className="flex items-center gap-3 truncate">
                <BookOpen size={20} className="text-[#8D30F4]" />
                <span className="truncate">{selectedTemplate ? selectedTemplate.title : (lang === 'bn' ? 'মেসেজ টেমপ্লেট বেছে নিন' : 'Choose Template')}</span>
              </div>
              <ChevronDown size={20} className={`transition-transform duration-300 ${showTemplateMenu ? 'rotate-180' : ''}`} />
            </button>

            {showTemplateMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-3 bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-h-64 overflow-y-auto z-[160] p-2 animate-in slide-in-from-bottom-5">
                {templates.map(tmp => (
                  <button key={tmp.id} onClick={() => { setSelectedTemplate(tmp); setShowTemplateMenu(false); }} className={`w-full text-left px-5 py-4 rounded-xl flex items-center justify-between transition-all mb-1 ${selectedTemplate?.id === tmp.id ? 'bg-[#8D30F4] text-white shadow-xl' : 'hover:bg-slate-50 text-[#2E0B5E]'}`}>
                    <div className="min-w-0"><p className="text-xs font-black truncate">{tmp.title}</p></div>
                    {selectedTemplate?.id === tmp.id && <Check size={18} strokeWidth={4} />}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handlePremiumSMS}
                disabled={sending || !selectedTemplate}
                className={`py-4 rounded-[1.5rem] flex items-center justify-center gap-2 font-black text-[11px] uppercase shadow-lg transition-all ${selectedTemplate ? 'premium-btn text-white' : 'bg-slate-100 text-slate-300 opacity-50'}`}
              >
                {sending ? <Loader2 className="animate-spin" size={16} /> : <MessageSquare size={16} fill="currentColor" />} 
                {lang === 'bn' ? 'সিস্টেম SMS' : 'Premium SMS'}
              </button>
              
              <button 
                onClick={handleNativeSMS}
                disabled={!selectedTemplate}
                className={`py-4 rounded-[1.5rem] flex items-center justify-center gap-2 font-black text-[11px] uppercase shadow-lg transition-all ${selectedTemplate ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-300 opacity-50'}`}
              >
                <Smartphone size={16} /> 
                {t('native_sms', lang)}
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8D30F4]"></div>
                <p className="text-[9px] font-black text-[#8D30F4] uppercase tracking-widest">{selectedIds.size} {t('selected', lang)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
