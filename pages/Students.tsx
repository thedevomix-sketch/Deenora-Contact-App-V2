
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Phone, Search, ChevronRight, Hash, CheckCircle2, MessageSquare, Send, X, BookOpen, ChevronDown, Check, Trash2, LayoutGrid } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
import { Class, Student, Language, SMSTemplate } from '../types';
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

// Default templates to show if no custom ones are found
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

  const cacheKey = `students_list_${selectedClass.id}`;

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

      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('madrasah_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Merge custom templates from "Wallet & SMS" with some standard defaults
      if (data && data.length > 0) {
        setTemplates(data);
      } else {
        setTemplates(STATIC_DEFAULTS);
      }
    } catch (err) {
      console.error("Templates fetch error:", err);
      setTemplates(STATIC_DEFAULTS);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    const cached = offlineApi.getCache(cacheKey);
    if (cached) {
      setStudents(cached);
      setLoading(false);
    }

    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*, classes(*)')
          .eq('class_id', selectedClass.id)
          .order('roll', { ascending: true, nullsFirst: false })
          .order('student_name', { ascending: true });
        
        if (error) throw error;
        if (data) {
          setStudents(data);
          offlineApi.setCache(cacheKey, data);
        }
      } catch (err) {
        console.error("Fetch Students Error:", err);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const sendNativeSMS = () => {
    const selectedStudents = students.filter(s => selectedIds.has(s.id));
    if (selectedStudents.length === 0) return;
    
    const phoneNumbers = selectedStudents.map(s => s.guardian_phone);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? ';' : ',';
    const numbersStr = phoneNumbers.join(separator);
    
    const bodyParam = selectedTemplate ? `${isIOS ? '&' : '?'}body=${encodeURIComponent(selectedTemplate.body)}` : '';
    window.location.href = `sms:${numbersStr}${bodyParam}`;
  };

  const initiateCall = async (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    window.location.href = `tel:${student.guardian_phone}`;
  };

  const selectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 relative min-h-[85vh] pb-80">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} className="p-2.5 bg-white/10 rounded-xl text-white active:scale-90 transition-all border border-white/20 backdrop-blur-md shrink-0">
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-white truncate drop-shadow-sm font-noto leading-tight">{selectedClass.class_name}</h1>
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mt-1">
                {loading ? '...' : students.length} {t('students_count', lang)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) {
                  setSelectedIds(new Set());
                  setSelectedTemplate(null);
                  setShowTemplateMenu(false);
                }
              }}
              className={`shrink-0 p-2.5 rounded-xl transition-all active:scale-95 border ${isSelectionMode ? 'bg-white text-[#d35132] border-white shadow-xl' : 'bg-white/10 text-white border-white/20'}`}
            >
              {isSelectionMode ? <X size={20} /> : <CheckCircle2 size={20} />}
            </button>
            <button 
              onClick={onAddClick} 
              className="shrink-0 bg-white text-[#d35132] px-4 py-2.5 rounded-xl text-[13px] font-black flex items-center gap-2 shadow-xl active:scale-95 transition-all"
            >
              <Plus size={16} strokeWidth={3.5} /> {t('add_student', lang)}
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
          <input
            type="text"
            placeholder={t('search_placeholder', lang)}
            className="w-full pl-11 pr-5 py-3.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl outline-none text-white placeholder:text-white/40 font-bold text-sm focus:bg-white/25 transition-all shadow-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isSelectionMode && filteredStudents.length > 0 && (
          <div className="flex items-center justify-between bg-black/20 p-3 rounded-2xl animate-in fade-in slide-in-from-top-2 border border-white/5">
             <p className="text-[10px] font-black text-white/60 uppercase tracking-widest pl-2">Selection Actions</p>
             <button onClick={selectAll} className="text-[10px] font-black text-white uppercase tracking-widest bg-white/10 px-4 py-2 rounded-lg active:bg-white/20">
               {selectedIds.size === filteredStudents.length ? 'Deselect All' : 'Select All'}
             </button>
          </div>
        )}
      </div>

      {loading && students.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-white/10 animate-pulse rounded-[2rem]"></div>)}
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="space-y-3">
          {filteredStudents.map(student => (
            <div 
              key={student.id} 
              onClick={() => isSelectionMode ? toggleSelection(student.id) : onStudentClick(student)}
              className={`p-4 rounded-[2rem] backdrop-blur-md border transition-all animate-in slide-in-from-bottom-2 flex items-center justify-between shadow-lg relative overflow-hidden ${isSelectionMode && selectedIds.has(student.id) ? 'bg-white/30 border-white shadow-white/10' : 'bg-white/10 border-white/15 active:bg-white/20'}`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {isSelectionMode ? (
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 transition-all ${selectedIds.has(student.id) ? 'bg-white text-[#d35132] border-white' : 'bg-white/5 border-white/20 text-white/20'}`}>
                    <CheckCircle2 size={24} fill={selectedIds.has(student.id) ? "currentColor" : "none"} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center border shrink-0 bg-white/10 border-white/10 shadow-inner text-white">
                    <span className="text-[7px] font-black opacity-40 uppercase leading-none">Roll</span>
                    <span className="text-lg font-black leading-tight">{student.roll || '-'}</span>
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-white text-base font-noto truncate pr-1 leading-normal">
                    {student.student_name}
                  </h3>
                  <p className="text-[10px] font-bold text-white/40 truncate">{student.guardian_name || '-'}</p>
                </div>
              </div>
              
              {!isSelectionMode && (
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={(e) => initiateCall(e, student)}
                    className="bg-white text-[#d35132] p-2.5 rounded-xl shadow-xl active:scale-90 transition-all"
                  >
                    <Phone size={18} strokeWidth={3} fill="currentColor" />
                  </button>
                  <ChevronRight size={18} className="text-white/20" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/20">
          <p className="text-white/40 font-black uppercase tracking-widest text-[10px]">{t('no_students', lang)}</p>
        </div>
      )}

      {/* Floating Action Menu - Source templates from Wallet & SMS section */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+90px)] left-4 right-4 z-[150] animate-in slide-in-from-bottom-10">
          <div className="bg-white rounded-[2.5rem] p-4 shadow-[0_25px_60px_rgba(0,0,0,0.4)] border border-white/20 ring-4 ring-black/5 flex flex-col gap-3">
            
            {/* Template Selector */}
            <div className="relative">
              <button 
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl text-[14px] font-black transition-all border-2 ${selectedTemplate ? 'bg-[#d35132]/5 border-[#d35132] text-[#d35132]' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
              >
                <div className="flex items-center gap-3 truncate">
                  <BookOpen size={20} className={selectedTemplate ? 'text-[#d35132]' : 'text-slate-400'} />
                  <span className="truncate">{selectedTemplate ? selectedTemplate.title : (lang === 'bn' ? '১. টেমপ্লেট বাছাই করুন' : '1. Choose Template')}</span>
                </div>
                <ChevronDown size={22} className={`transition-transform duration-300 ${showTemplateMenu ? 'rotate-180' : ''} ${selectedTemplate ? 'text-[#d35132]' : 'text-slate-400'}`} />
              </button>

              {showTemplateMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-3 bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-h-64 overflow-y-auto z-[160] animate-in slide-in-from-bottom-4 p-2 ring-1 ring-black/5">
                  <div className="px-4 py-3 border-b border-slate-50 mb-1 flex items-center gap-2">
                    <LayoutGrid size={14} className="text-slate-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saved Templates</p>
                  </div>
                  {templates.length > 0 ? templates.map(tmp => (
                    <button 
                      key={tmp.id}
                      onClick={() => { setSelectedTemplate(tmp); setShowTemplateMenu(false); }}
                      className={`w-full text-left px-4 py-4 rounded-xl flex items-center justify-between transition-all ${selectedTemplate?.id === tmp.id ? 'bg-[#d35132] text-white shadow-lg scale-[1.02]' : 'hover:bg-slate-50 text-slate-700 active:bg-slate-100'}`}
                    >
                      <div className="min-w-0 pr-4">
                         <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${tmp.id && typeof tmp.id === 'string' && tmp.id.startsWith('def') ? 'bg-white/20' : 'bg-slate-100'}`}>
                              {tmp.id && typeof tmp.id === 'string' && tmp.id.startsWith('def') ? 'Default' : 'Saved'}
                            </span>
                            <p className="text-xs font-black truncate">{tmp.title}</p>
                         </div>
                         <p className={`text-[10px] truncate opacity-60 font-medium ${selectedTemplate?.id === tmp.id ? 'text-white' : 'text-slate-500'}`}>{tmp.body}</p>
                      </div>
                      {selectedTemplate?.id === tmp.id && <Check size={16} strokeWidth={4} />}
                    </button>
                  )) : (
                    <div className="text-center py-8 text-slate-300 flex flex-col items-center gap-2">
                       <BookOpen size={24} className="opacity-20" />
                       <p className="text-[10px] font-black uppercase tracking-widest">No templates found</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Row */}
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 px-4 py-3 rounded-2xl flex items-center gap-3 min-w-0 flex-1 border border-slate-100">
                <div className="w-8 h-8 bg-[#d35132] rounded-full flex items-center justify-center text-white shadow-md shrink-0">
                  <span className="text-sm font-black">{selectedIds.size}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Selected</p>
                </div>
              </div>
              
              <button 
                onClick={sendNativeSMS}
                className={`flex-[2] py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase shadow-xl active:scale-95 transition-all ${selectedTemplate ? 'bg-[#d35132] text-white active:bg-[#e65c3b]' : 'bg-slate-200 text-slate-400 pointer-events-none cursor-not-allowed'}`}
              >
                <MessageSquare size={18} fill={selectedTemplate ? "white" : "none"} strokeWidth={selectedTemplate ? 1 : 3} />
                {lang === 'bn' ? 'মেসেজ পাঠান' : 'Send SMS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
