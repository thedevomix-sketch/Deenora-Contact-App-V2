
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Phone, Search, ChevronRight, Hash, CheckCircle2, MessageSquare, Send, X, BookOpen, ChevronDown } from 'lucide-react';
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

const Students: React.FC<StudentsProps> = ({ selectedClass, onStudentClick, onAddClick, onBack, lang, dataVersion, triggerRefresh }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplate | null>(null);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const cached = offlineApi.getCache('sms_templates');
    if (cached) setTemplates(cached);

    if (navigator.onLine) {
      const { data } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('madrasah_id', user.id)
        .order('created_at', { ascending: false });
      if (data) {
        setTemplates(data);
        offlineApi.setCache('sms_templates', data);
      }
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
    
    // Multi-recipient SMS URI Logic
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? ';' : ',';
    const numbersStr = phoneNumbers.join(separator);
    
    // Body encoding
    const bodyParam = selectedTemplate ? `${isIOS ? '&' : '?'}body=${encodeURIComponent(selectedTemplate.body)}` : '';
    
    // Open system SMS app
    window.location.href = `sms:${numbersStr}${bodyParam}`;
  };

  const recordCall = async (student: Student) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = { student_id: student.id, guardian_phone: student.guardian_phone, madrasah_id: user.id };
    if (navigator.onLine) await supabase.from('recent_calls').insert(payload);
    else offlineApi.queueAction('recent_calls', 'INSERT', payload);
    triggerRefresh();
  };

  const initiateCall = async (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    await recordCall(student);
    window.location.href = `tel:${student.guardian_phone}`;
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 relative pb-40">
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
                }
              }}
              className={`shrink-0 p-2.5 rounded-xl transition-all active:scale-95 border ${isSelectionMode ? 'bg-white text-[#d35132] border-white' : 'bg-white/10 text-white border-white/20'}`}
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

      {/* Multi-Selection Footer Action Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-4 right-4 animate-in slide-in-from-bottom-10 z-[70]">
          <div className="bg-white rounded-[2.2rem] p-4 flex flex-col gap-3 shadow-2xl border border-white/20 ring-1 ring-black/5">
            
            {/* Template Selector for Native SMS */}
            <div className="relative">
              <button 
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100 rounded-xl text-slate-700 text-xs font-bold"
              >
                <div className="flex items-center gap-2 truncate">
                  <BookOpen size={14} className="text-[#d35132]" />
                  <span className="truncate">{selectedTemplate ? selectedTemplate.title : (lang === 'bn' ? 'টেমপ্লেট বাছাই করুন' : 'Select Template')}</span>
                </div>
                <ChevronDown size={16} className={`transition-transform ${showTemplateMenu ? 'rotate-180' : ''}`} />
              </button>

              {showTemplateMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-40 overflow-y-auto animate-in slide-in-from-bottom-2">
                  {templates.length > 0 ? templates.map(tmp => (
                    <button 
                      key={tmp.id}
                      onClick={() => { setSelectedTemplate(tmp); setShowTemplateMenu(false); }}
                      className="w-full text-left px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 text-xs font-bold text-slate-600"
                    >
                      {tmp.title}
                    </button>
                  )) : (
                    <p className="text-center py-4 text-slate-400 text-[10px]">{lang === 'bn' ? 'কোনো টেমপ্লেট নেই' : 'No templates'}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 pl-2">
                <div className="w-10 h-10 bg-[#d35132]/10 rounded-full flex items-center justify-center text-[#d35132]">
                  <span className="text-lg font-black">{selectedIds.size}</span>
                </div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-widest">{t('selected', lang)}</p>
              </div>
              
              <button 
                onClick={sendNativeSMS}
                className="bg-[#d35132] text-white px-6 py-3.5 rounded-2xl flex items-center gap-2 font-black text-xs uppercase shadow-xl active:scale-95 transition-all"
              >
                <MessageSquare size={16} fill="white" />
                {t('native_sms', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
