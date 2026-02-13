import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, Send, ChevronDown, BookOpen, Users, CheckCircle2, MessageSquare, Plus, Edit3, Trash2, Smartphone, X, Check, Sparkles, LayoutList, History, Zap, AlertTriangle, Copy, Wallet } from 'lucide-react';
import { supabase, offlineApi, smsApi } from '../supabase';
import { SMSTemplate, Language, Madrasah, Transaction, Class, Student } from '../types';
import { t } from '../translations';
import { sortMadrasahClasses } from './Classes';

interface WalletSMSProps {
  lang: Language;
  madrasah: Madrasah | null;
  triggerRefresh: () => void;
  dataVersion: number;
}

const WalletSMS: React.FC<WalletSMSProps> = ({ lang, madrasah, triggerRefresh, dataVersion }) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'bulk-sms' | 'recharge'>('templates');
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempBody, setTempBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { 
    if (activeTab === 'templates') fetchTemplates(); 
    if (activeTab === 'bulk-sms') { fetchClasses(); fetchTemplates(); }
  }, [activeTab, madrasah?.id, dataVersion]);

  useEffect(() => {
    if (selectedClassId) fetchClassStudents(selectedClassId); else setClassStudents([]);
  }, [selectedClassId]);

  const fetchClasses = async () => {
    if (!madrasah) return;
    const { data } = await supabase.from('classes').select('*').eq('madrasah_id', madrasah.id);
    if (data) setClasses(sortMadrasahClasses(data));
  };

  const fetchClassStudents = async (cid: string) => {
    setLoadingStudents(true);
    const { data } = await supabase.from('students').select('*').eq('class_id', cid);
    if (data) setClassStudents(data);
    setLoadingStudents(false);
  };

  const fetchTemplates = async () => {
    if (!madrasah) return;
    setLoading(true);
    const { data } = await supabase.from('sms_templates').select('*').eq('madrasah_id', madrasah.id).order('created_at', { ascending: false });
    if (data) setTemplates(data);
    setLoading(false);
  };

  const handleSaveTemplate = async () => {
    if (!tempTitle.trim() || !tempBody.trim() || !madrasah) return;
    setIsSaving(true);
    try {
      const payload = { 
        title: tempTitle.trim(), 
        body: tempBody.trim(), 
        madrasah_id: madrasah.id 
      };

      if (editingId) {
        if (navigator.onLine) {
          const { error } = await supabase.from('sms_templates').update(payload).eq('id', editingId);
          if (error) throw error;
        } else {
          offlineApi.queueAction('sms_templates', 'UPDATE', { ...payload, id: editingId });
        }
      } else {
        if (navigator.onLine) {
          const { error } = await supabase.from('sms_templates').insert(payload);
          if (error) throw error;
        } else {
          offlineApi.queueAction('sms_templates', 'INSERT', payload);
        }
      }

      setShowAddModal(false);
      setTempTitle('');
      setTempBody('');
      setEditingId(null);
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    setIsDeleting(true);
    try {
      if (navigator.onLine) {
        await supabase.from('sms_templates').delete().eq('id', id);
      } else {
        offlineApi.queueAction('sms_templates', 'DELETE', { id });
      }
      setShowDeleteTemplateConfirm(null);
      fetchTemplates();
    } catch (err: any) { alert(err.message); } finally { setIsDeleting(false); }
  };

  const handleSendNativeBulk = () => {
    if (!bulkMessage.trim() || classStudents.length === 0) return;
    const phones = classStudents.map(s => s.guardian_phone).join(',');
    const message = encodeURIComponent(bulkMessage);
    const separator = /iPad|iPhone|iPod/.test(navigator.userAgent) ? '&' : '?';
    window.location.href = `sms:${phones}${separator}body=${message}`;
  };

  const handleSendBulk = async () => {
    if (!bulkMessage.trim() || !selectedClassId || classStudents.length === 0 || !madrasah) return;
    setSendingBulk(true);
    try {
      await smsApi.sendBulk(madrasah.id, classStudents, bulkMessage);
      setBulkSuccess(true); 
      setBulkMessage(''); 
      setSelectedClassId('');
      triggerRefresh();
      setTimeout(() => setBulkSuccess(false), 3000);
    } catch (err: any) { 
      alert(lang === 'bn' ? 'ব্যালেন্স শেষ হয়েছে অথবা নেটওয়ার্ক সমস্যা' : err.message); 
    } finally { setSendingBulk(false); }
  };

  const copyMerchantNumber = () => {
    navigator.clipboard.writeText('০১৭৫৬৬৭৭৮৮৯');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSelectedClassName = () => {
    const cls = classes.find(c => c.id === selectedClassId);
    return cls ? cls.class_name : (lang === 'bn' ? 'ক্লাস নির্বাচন করুন' : 'Select Class');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      {/* High-Fidelity Sliding Tab Navigation */}
      <div className="relative p-1.5 bg-white/15 backdrop-blur-3xl rounded-[2.5rem] border border-white/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] flex items-center">
        <div 
          className="absolute h-[calc(100%-12px)] rounded-[2rem] bg-white shadow-[0_8px_20px_-4px_rgba(141,48,244,0.3)] transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0"
          style={{ 
            width: 'calc(33.33% - 8px)',
            left: activeTab === 'templates' ? '6px' : activeTab === 'bulk-sms' ? '33.33%' : '66.66%',
            marginLeft: activeTab === 'templates' ? '0px' : activeTab === 'bulk-sms' ? '4px' : '2px'
          }}
        />
        {(['templates', 'bulk-sms', 'recharge'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`relative flex-1 py-4.5 rounded-[2rem] font-black text-[12px] uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all duration-300 z-10 ${activeTab === tab ? 'text-[#8D30F4]' : 'text-white/70 hover:text-white'}`}
          >
            {tab === 'templates' && <MessageSquare size={18} strokeWidth={2.5} />}
            {tab === 'bulk-sms' && <Send size={18} strokeWidth={2.5} className={activeTab === tab ? 'animate-pulse' : ''} />}
            {tab === 'recharge' && <CreditCard size={18} strokeWidth={2.5} />}
            <span className="truncate">
              {tab === 'templates' ? t('templates', lang) : tab === 'bulk-sms' ? t('bulk_sms', lang) : t('recharge', lang)}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'bulk-sms' && (
        <div className="space-y-5 animate-in slide-in-from-bottom-5 duration-500">
          {/* Enhanced Wallet Header */}
          <div className="bg-gradient-to-br from-[#8D30F4] via-[#9B4DFF] to-[#7A24D4] p-8 rounded-[2.8rem] shadow-[0_25px_60px_-15px_rgba(141,48,244,0.5)] flex flex-col gap-6 text-white relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-white/15 transition-all duration-700"></div>
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#A179FF]/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2"></div>
             
             <div className="flex items-center justify-between relative z-10">
               <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80 flex items-center gap-2">
                   <Wallet size={12} strokeWidth={3} />
                   Current SMS Balance
                 </p>
                 <h3 className="text-5xl font-black tracking-tighter flex items-baseline gap-2">
                   {madrasah?.sms_balance || 0}
                   <span className="text-sm opacity-60 font-noto tracking-normal font-bold">টি</span>
                 </h3>
               </div>
               <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-[1.8rem] flex items-center justify-center border border-white/30 shadow-inner group-hover:scale-110 transition-transform duration-500">
                 <Zap size={32} className="text-white fill-white animate-pulse" />
               </div>
             </div>
             
             <div className="h-[1px] w-full bg-white/10"></div>
             
             <div className="flex items-center gap-4 relative z-10">
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#8D30F4] bg-[#A179FF] flex items-center justify-center text-[10px] font-black">
                       <Users size={14} />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] font-black text-white/70 uppercase tracking-widest">Broadcast Control Panel</p>
             </div>
          </div>

          <div className="bg-white/95 backdrop-blur-2xl p-7 rounded-[3rem] shadow-[0_30px_70px_rgba(46,11,94,0.1)] border border-white/60 space-y-8">
            {/* Step 1: Target Audience */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#8D30F4]/10 rounded-xl flex items-center justify-center text-[#8D30F4] border border-[#8D30F4]/5 shadow-inner">
                    <Users size={18} strokeWidth={2.5} />
                  </div>
                  <h4 className="text-[11px] font-black text-[#2E0B5E] uppercase tracking-widest">১. অডিয়েন্স নির্বাচন</h4>
                </div>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setShowClassDropdown(!showClassDropdown)}
                  className={`w-full px-6 py-5 rounded-[1.8rem] border-2 transition-all flex items-center justify-between group shadow-sm ${selectedClassId ? 'bg-[#F2EBFF] border-[#8D30F4]/30' : 'bg-slate-50 border-slate-100'}`}
                >
                  <div className="flex items-center gap-4">
                    <LayoutList size={22} className={selectedClassId ? 'text-[#8D30F4]' : 'text-slate-300'} />
                    <span className={`text-lg font-black font-noto ${selectedClassId ? 'text-[#2E0B5E]' : 'text-slate-400'}`}>
                      {getSelectedClassName()}
                    </span>
                  </div>
                  <ChevronDown className={`text-slate-300 group-hover:text-[#8D30F4] transition-all duration-300 ${showClassDropdown ? 'rotate-180' : ''}`} size={22} strokeWidth={3} />
                </button>

                {showClassDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] border border-slate-100 z-[100] p-2.5 animate-in slide-in-from-top-4 max-h-72 overflow-y-auto custom-scrollbar">
                    {classes.map(cls => (
                      <button 
                        key={cls.id} 
                        onClick={() => { setSelectedClassId(cls.id); setShowClassDropdown(false); }} 
                        className={`w-full text-left px-6 py-4 rounded-2xl flex items-center justify-between transition-all mb-1.5 ${selectedClassId === cls.id ? 'bg-[#8D30F4] text-white shadow-xl translate-x-1' : 'hover:bg-slate-50 text-[#2E0B5E]'}`}
                      >
                        <span className="font-black font-noto text-base">{cls.class_name}</span>
                        {selectedClassId === cls.id && <CheckCircle2 size={20} fill="currentColor" className="text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedClassId && (
                <div className="bg-[#8D30F4]/5 p-5 rounded-[1.8rem] border-2 border-dashed border-[#8D30F4]/15 flex items-center gap-4 animate-in zoom-in-95">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#8D30F4] shadow-md border border-[#8D30F4]/10">
                      <Users size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-2xl font-black text-[#2E0B5E] leading-tight">
                      {loadingStudents ? <Loader2 className="animate-spin" size={20} /> : classStudents.length} 
                    </p>
                    <span className="text-[10px] text-[#8D30F4] font-black uppercase tracking-[0.2em]">{lang === 'bn' ? 'ছাত্র নির্বাচিত' : 'Students Active'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Message Composition */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <div className="w-9 h-9 bg-[#8D30F4]/10 rounded-xl flex items-center justify-center text-[#8D30F4] border border-[#8D30F4]/5 shadow-inner">
                   <MessageSquare size={18} strokeWidth={2.5} />
                </div>
                <h4 className="text-[11px] font-black text-[#2E0B5E] uppercase tracking-widest">২. মেসেজ কম্পোজ করুন</h4>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setShowTemplateDropdown(!showTemplateDropdown)} 
                  className={`w-full flex items-center justify-between px-6 py-4.5 rounded-[1.5rem] text-sm font-black transition-all border-2 shadow-sm ${bulkMessage ? 'bg-[#F9F7FF] border-[#8D30F4]/20 text-[#8D30F4]' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen size={20} strokeWidth={2.5} className="text-[#8D30F4]" />
                    <span className="truncate font-noto">{bulkMessage ? 'টেমপ্লেট লোড হয়েছে' : 'সংরক্ষিত টেমপ্লেট থেকে বেছে নিন'}</span>
                  </div>
                  <Plus size={20} className={`text-[#8D30F4] transition-transform ${showTemplateDropdown ? 'rotate-45' : ''}`} strokeWidth={3} />
                </button>
                {showTemplateDropdown && (
                  <div className="absolute bottom-full left-0 right-0 mb-3 bg-white rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] border border-slate-100 z-[90] p-2.5 animate-in slide-in-from-bottom-4 max-h-60 overflow-y-auto custom-scrollbar">
                    {templates.map(tmp => (
                      <button key={tmp.id} onClick={() => { setBulkMessage(tmp.body); setShowTemplateDropdown(false); }} className="w-full text-left px-5 py-3.5 rounded-2xl hover:bg-[#F2EBFF] transition-all mb-1.5 group">
                        <p className="text-[9px] font-black text-[#8D30F4] uppercase tracking-[0.2em] mb-1 opacity-60 group-hover:opacity-100">{tmp.title}</p>
                        <p className="text-sm font-bold text-slate-500 truncate font-noto group-hover:text-[#2E0B5E]">{tmp.body}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-2 opacity-50">
                    <Sparkles size={14} className="text-[#8D30F4]" />
                    <span className="text-[10px] font-black text-[#2E0B5E] uppercase tracking-widest">Premium Composer</span>
                  </div>
                  <div className="bg-[#F2EBFF] px-4 py-1 rounded-full shadow-inner border border-[#8D30F4]/5">
                    <span className={`text-xs font-black ${bulkMessage.length > 150 ? 'text-red-500' : 'text-[#8D30F4]'}`}>{bulkMessage.length}</span>
                    <span className="text-[10px] font-black text-[#A179FF]/40 ml-1">/ 160</span>
                  </div>
                </div>
                <textarea 
                  className="w-full h-40 px-6 py-6 bg-slate-50/70 border-2 border-slate-100 rounded-[2.2rem] text-[#2E0B5E] font-bold outline-none focus:border-[#8D30F4]/30 focus:bg-white transition-all shadow-inner leading-relaxed font-noto text-lg resize-none" 
                  placeholder="আপনার মেসেজ এখানে লিখুন..." 
                  value={bulkMessage} 
                  onChange={(e) => setBulkMessage(e.target.value)} 
                  maxLength={160} 
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <button 
                onClick={handleSendBulk} 
                disabled={sendingBulk || !bulkMessage.trim() || !selectedClassId} 
                className="w-full py-6 premium-btn text-white font-black rounded-[2rem] shadow-[0_20px_50px_rgba(141,48,244,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-xl disabled:opacity-30"
              >
                {sendingBulk ? <Loader2 className="animate-spin" size={28} /> : bulkSuccess ? <><CheckCircle2 size={28} strokeWidth={2.5} /> পাঠানো হয়েছে</> : <><Send size={24} strokeWidth={2.5} /> বাল্ক এসএমএস পাঠান</>}
              </button>
              
              <button 
                onClick={handleSendNativeBulk} 
                disabled={sendingBulk || !bulkMessage.trim() || !selectedClassId} 
                className="w-full py-5 bg-[#1A0B2E] text-white font-black rounded-[2rem] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-base border border-white/5 shadow-xl disabled:opacity-30"
              >
                <Smartphone size={20} strokeWidth={2.5} /> {t('native_sms', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
          <div className="flex items-center justify-between px-3 pt-2">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-white font-noto drop-shadow-lg tracking-tight">মেসেজ টেমপ্লেট</h2>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] flex items-center gap-2">
                <Sparkles size={12} />
                Quick Response Library
              </p>
            </div>
            <button 
              onClick={() => { setEditingId(null); setTempTitle(''); setTempBody(''); setShowAddModal(true); }} 
              className="w-16 h-16 bg-white text-[#8D30F4] rounded-[1.8rem] shadow-[0_15px_35px_rgba(0,0,0,0.2)] flex items-center justify-center active:scale-90 transition-all border-4 border-[#8D30F4]/5 hover:rotate-90"
            >
              <Plus size={32} strokeWidth={3.5} />
            </button>
          </div>
          
          {loading ? (
             <div className="space-y-5">
               {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white/15 animate-pulse rounded-[2.5rem] border border-white/10"></div>)}
             </div>
          ) : templates.length > 0 ? (
            <div className="space-y-4">
              {templates.map(tmp => (
                <div key={tmp.id} className="bg-white/95 backdrop-blur-md p-6 rounded-[2.5rem] border border-white shadow-[0_15px_40px_-10px_rgba(46,11,94,0.15)] flex flex-col gap-4 group active:scale-[0.99] transition-all">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-[#F2EBFF] to-white rounded-2xl flex items-center justify-center text-[#8D30F4] shadow-inner border border-[#8D30F4]/10">
                           <MessageSquare size={20} strokeWidth={2.5} />
                        </div>
                        <h3 className="font-black text-[#2E0B5E] text-lg font-noto truncate max-w-[180px] tracking-tight">{tmp.title}</h3>
                     </div>
                     <div className="flex gap-2">
                       <button onClick={() => { setEditingId(tmp.id); setTempTitle(tmp.title); setTempBody(tmp.body); setShowAddModal(true); }} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 active:scale-90 transition-all hover:bg-[#8D30F4] hover:text-white hover:border-[#8D30F4] shadow-sm">
                         <Edit3 size={18} />
                       </button>
                       <button onClick={() => setShowDeleteTemplateConfirm(tmp.id)} className="w-10 h-10 bg-slate-50 text-red-300 rounded-xl flex items-center justify-center border border-slate-100 active:scale-90 transition-all hover:bg-red-500 hover:text-white hover:border-red-500 shadow-sm">
                         <Trash2 size={18} />
                       </button>
                     </div>
                  </div>
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                    <p className="text-[15px] text-slate-600 leading-relaxed font-bold font-noto">{tmp.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-white/10 rounded-[4rem] border-2 border-dashed border-white/20 backdrop-blur-sm">
              <MessageSquare size={60} className="mx-auto text-white/10 mb-6" strokeWidth={1} />
              <p className="text-white/40 font-black text-sm uppercase tracking-[0.4em]">Library is Empty</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recharge' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
           <div className="bg-white/95 backdrop-blur-2xl p-8 rounded-[3.5rem] shadow-[0_35px_80px_-20px_rgba(46,11,94,0.3)] border border-white space-y-9">
              <div className="text-center space-y-4">
                <div className="inline-flex p-4.5 bg-gradient-to-br from-[#8D30F4]/10 to-transparent rounded-[2rem] border border-[#8D30F4]/10 relative">
                   <div className="absolute inset-0 bg-[#8D30F4]/5 animate-pulse rounded-[2rem]"></div>
                   <CreditCard size={40} className="text-[#8D30F4] relative z-10" strokeWidth={2.5} />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-[#2E0B5E] tracking-tight">অ্যাকাউন্ট রিচার্জ</h3>
                   <p className="text-sm font-bold text-slate-400 font-noto mt-1.5 px-4 leading-relaxed">নিচের যেকোনো পেমেন্ট গেটওয়ে ব্যবহার করে সেন্ড মানি করুন</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <button className="p-6 rounded-[2.2rem] bg-gradient-to-br from-[#E2136E] to-[#D12053] text-white flex flex-col items-center justify-center gap-3 shadow-xl active:scale-[0.96] transition-all relative overflow-hidden group">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-1"><Check size={20} strokeWidth={4} className="opacity-0 group-focus:opacity-100 transition-opacity" /></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80">bKash</span>
                    <span className="text-base font-black tracking-tight">Personal</span>
                    <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                 </button>
                 <button className="p-6 rounded-[2.2rem] bg-gradient-to-br from-[#F49124] to-[#E86D23] text-white flex flex-col items-center justify-center gap-3 shadow-xl active:scale-[0.96] transition-all relative overflow-hidden group">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-1"><Check size={20} strokeWidth={4} className="opacity-0 group-focus:opacity-100 transition-opacity" /></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80">Nagad</span>
                    <span className="text-base font-black tracking-tight">Personal</span>
                    <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                 </button>
              </div>

              <div 
                onClick={copyMerchantNumber}
                className="bg-[#F9F7FF] p-6 rounded-[2.5rem] border-2 border-dashed border-[#8D30F4]/20 text-center space-y-2 cursor-pointer active:scale-[0.98] transition-all relative group"
              >
                <p className="text-[10px] font-black text-[#A179FF] uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                  Target Merchant Number
                  {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="opacity-40 group-hover:opacity-100" />}
                </p>
                <h3 className="text-3xl font-black text-[#8D30F4] tracking-tight">০১৭৫৬৬৭৭৮৮৯</h3>
                {copied && <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#2E0B5E] text-white text-[10px] font-black px-4 py-2 rounded-full animate-in slide-in-from-bottom-2">COPIED!</div>}
              </div>

              <div className="space-y-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 block">টাকার পরিমাণ (Amount)</label>
                  <div className="relative">
                    <div className="absolute left-7 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#8D30F4]/10 rounded-xl flex items-center justify-center text-[#8D30F4] font-black text-xl">৳</div>
                    <input type="number" className="w-full pl-20 pr-8 py-5.5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-[#2D3142] font-black text-2xl outline-none focus:border-[#8D30F4]/30 focus:bg-white transition-all shadow-inner" placeholder="000" />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 block">ট্রানজ্যাকশন আইডি (Transaction ID)</label>
                  <div className="relative">
                    <div className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-300"><History size={24} /></div>
                    <input type="text" className="w-full pl-20 pr-8 py-5.5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-[#2D3142] font-black text-xl outline-none focus:border-[#8D30F4]/30 focus:bg-white transition-all uppercase placeholder:normal-case shadow-inner" placeholder="8X23M1B9..." />
                  </div>
                </div>
                <button className="w-full py-6 premium-btn text-white font-black rounded-[2rem] shadow-[0_25px_60px_rgba(141,48,244,0.4)] active:scale-[0.98] transition-all text-xl mt-4 font-noto">রিচার্জ রিকোয়েস্ট পাঠান</button>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2 group cursor-pointer">
                 <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-[#8D30F4] border border-slate-100 group-hover:bg-[#8D30F4] group-hover:text-white transition-all">
                   <History size={16} strokeWidth={2.5} />
                 </div>
                 <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-[#8D30F4] transition-colors">Transaction History</span>
              </div>
           </div>
        </div>
      )}

      {/* Modern Template Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#080A12]/60 backdrop-blur-2xl z-[500] flex items-center justify-center p-8 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3.5rem] p-9 shadow-[0_50px_120px_rgba(0,0,0,0.45)] border border-[#8D30F4]/10 relative animate-in zoom-in-95 duration-500">
              <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-[#8D30F4] transition-all p-2 bg-slate-50 rounded-2xl"><X size={26} strokeWidth={3} /></button>
              
              <div className="flex items-center gap-5 mb-10">
                <div className="w-16 h-16 bg-gradient-to-br from-[#F2EBFF] to-white rounded-[1.8rem] flex items-center justify-center text-[#8D30F4] shadow-inner border border-[#8D30F4]/5">
                   <Plus size={32} strokeWidth={3} className={editingId ? 'rotate-45' : ''} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#2E0B5E] font-noto tracking-tight">
                    {editingId ? 'টেমপ্লেট সংশোধন' : 'নতুন টেমপ্লেট'}
                  </h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure preset responses</p>
                </div>
              </div>
              
              <div className="space-y-7">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-[#A179FF] uppercase tracking-[0.2em] px-3 block">Template Identifier</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-[#2E0B5E] font-black text-lg outline-none focus:border-[#8D30F4]/30 focus:bg-white transition-all shadow-inner" 
                    value={tempTitle} 
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="যেমন: মাসিক ফি"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-[#A179FF] uppercase tracking-[0.2em] px-3 block">Message Content</label>
                  <textarea 
                    className="w-full h-40 px-6 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2.2rem] text-[#2E0B5E] font-bold text-lg outline-none focus:border-[#8D30F4]/30 focus:bg-white transition-all resize-none leading-relaxed font-noto shadow-inner" 
                    value={tempBody} 
                    onChange={(e) => setTempBody(e.target.value)}
                    placeholder="আপনার মেসেজ এখানে টাইপ করুন..."
                  />
                </div>
                
                <button 
                  onClick={handleSaveTemplate} 
                  disabled={isSaving || !tempTitle.trim() || !tempBody.trim()} 
                  className="w-full py-6 premium-btn text-white font-black rounded-[2rem] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-xl disabled:opacity-30 font-noto"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={28} /> : <><CheckCircle2 size={26} strokeWidth={2.5} /> সংরক্ষণ করুন</>}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Custom Delete Template Confirmation Modal */}
      {showDeleteTemplateConfirm && (
        <div className="fixed inset-0 bg-[#080A12]/70 backdrop-blur-2xl z-[600] flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] border-2 border-red-50 text-center space-y-7 animate-in zoom-in-95 duration-500">
             <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-red-100">
                <AlertTriangle size={40} strokeWidth={2.5} className="animate-bounce" />
             </div>
             <div>
                <h3 className="text-2xl font-black text-[#2E0B5E] tracking-tight">{t('confirm_delete', lang)}</h3>
                <p className="text-sm font-bold text-slate-400 mt-2.5 leading-relaxed font-noto px-2">আপনি কি নিশ্চিতভাবে এই টেমপ্লেটটি চিরতরে মুছে ফেলতে চান? এটি আর ফিরে পাওয়া যাবে না।</p>
             </div>
             <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => handleDeleteTemplate(showDeleteTemplateConfirm)} 
                  disabled={isDeleting} 
                  className="w-full py-5 bg-red-500 text-white font-black rounded-[1.8rem] shadow-[0_15px_35px_rgba(239,68,68,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 text-lg"
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={24} /> : 'হ্যাঁ, ডিলিট করুন'}
                </button>
                <button 
                  onClick={() => setShowDeleteTemplateConfirm(null)} 
                  className="w-full py-4 bg-slate-50 text-slate-400 font-black rounded-[1.8rem] active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  বাতিল করুন
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSMS;