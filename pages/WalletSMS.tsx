import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, Send, ChevronDown, BookOpen, Users, CheckCircle2, MessageSquare, Plus, Edit3, Trash2, Smartphone, X, Check, Sparkles, LayoutList, History, Zap, AlertTriangle } from 'lucide-react';
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

  const getSelectedClassName = () => {
    const cls = classes.find(c => c.id === selectedClassId);
    return cls ? cls.class_name : (lang === 'bn' ? 'ক্লাস নির্বাচন করুন' : 'Select Class');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Enhanced Large Sliding Tab Navigation - Fixed Overflow & Alignment */}
      <div className="relative p-1.5 bg-white/10 backdrop-blur-3xl rounded-[3rem] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center h-16 sm:h-20">
        <div 
          className="absolute h-[calc(100%-12px)] rounded-[2.5rem] bg-white shadow-[0_8px_30px_rgba(141,48,244,0.3)] transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) z-0"
          style={{ 
            width: 'calc((100% - 12px) / 3)',
            left: activeTab === 'templates' ? '6px' : activeTab === 'bulk-sms' ? 'calc(6px + (100% - 12px) / 3)' : 'calc(6px + 2 * (100% - 12px) / 3)',
          }}
        />
        {(['templates', 'bulk-sms', 'recharge'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`relative flex-1 h-full rounded-[2.5rem] font-black text-[11px] sm:text-[13px] uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-3 transition-all duration-300 z-10 px-1 ${activeTab === tab ? 'text-[#8D30F4]' : 'text-white/70 hover:text-white'}`}
          >
            {tab === 'templates' && <MessageSquare size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />}
            {tab === 'bulk-sms' && <Send size={18} className={`sm:w-[22px] sm:h-[22px] ${activeTab === tab ? 'animate-bounce' : ''}`} strokeWidth={2.5} />}
            {tab === 'recharge' && <CreditCard size={18} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />}
            <span className="truncate font-noto">
              {tab === 'templates' ? t('templates', lang) : tab === 'bulk-sms' ? t('bulk_sms', lang) : t('recharge', lang)}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'bulk-sms' && (
        <div className="space-y-5 animate-in slide-in-from-bottom-5">
          {/* Wallet Header Card */}
          <div className="bg-gradient-to-br from-[#8D30F4] to-[#A179FF] p-6 rounded-[2.2rem] shadow-xl border border-white/20 flex items-center justify-between text-white relative overflow-hidden">
             <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
             <div className="relative z-10">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Available SMS Balance</p>
               <h3 className="text-4xl font-black flex items-baseline gap-2">
                 {madrasah?.sms_balance || 0}
                 <span className="text-xs opacity-60 font-noto tracking-normal">টি এসএমএস</span>
               </h3>
             </div>
             <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
               <Zap size={28} className="text-white fill-white/20" />
             </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl border border-white/50 space-y-7">
            {/* Step 1: Target Audience Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-1 px-1">
                <div className="w-8 h-8 bg-[#8D30F4]/10 rounded-xl flex items-center justify-center text-[#8D30F4]">
                   <Users size={16} />
                </div>
                <h4 className="text-[11px] font-black text-[#2E0B5E] uppercase tracking-widest">১. অডিয়েন্স নির্বাচন</h4>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setShowClassDropdown(!showClassDropdown)}
                  className={`w-full h-[60px] px-6 rounded-[1.5rem] border-2 transition-all flex items-center justify-between group ${selectedClassId ? 'bg-[#8D30F4]/5 border-[#8D30F4]/30' : 'bg-slate-50 border-slate-100'}`}
                >
                  <div className="flex items-center gap-4">
                    <LayoutList size={20} className={selectedClassId ? 'text-[#8D30F4]' : 'text-slate-300'} />
                    <span className={`text-base font-black font-noto ${selectedClassId ? 'text-[#2E0B5E]' : 'text-slate-400'}`}>
                      {getSelectedClassName()}
                    </span>
                  </div>
                  <ChevronDown className={`text-slate-300 group-hover:text-[#8D30F4] transition-all duration-300 ${showClassDropdown ? 'rotate-180' : ''}`} size={20} />
                </button>

                {showClassDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] shadow-[0_30px_80px_rgba(0,0,0,0.15)] border border-slate-100 z-[100] p-2 animate-in slide-in-from-top-4 max-h-60 overflow-y-auto">
                    {classes.map(cls => (
                      <button 
                        key={cls.id} 
                        onClick={() => { setSelectedClassId(cls.id); setShowClassDropdown(false); }} 
                        className={`w-full text-left px-5 py-3.5 rounded-xl flex items-center justify-between transition-all mb-1 ${selectedClassId === cls.id ? 'bg-[#8D30F4] text-white shadow-md' : 'hover:bg-slate-50 text-[#2E0B5E]'}`}
                      >
                        <span className="font-black font-noto text-md">{cls.class_name}</span>
                        {selectedClassId === cls.id && <Check size={18} strokeWidth={4} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedClassId && (
                <div className="bg-[#8D30F4]/5 p-4 rounded-2xl border border-[#8D30F4]/10 flex items-center gap-4 animate-in zoom-in-95">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#8D30F4] shadow-sm">
                      <Users size={20} />
                  </div>
                  <div>
                    <p className="text-[14px] font-black text-[#2E0B5E]">
                      {loadingStudents ? <Loader2 className="animate-spin" size={16} /> : classStudents.length} 
                      <span className="text-[10px] text-[#8D30F4]/60 font-noto uppercase tracking-widest ml-1">{lang === 'bn' ? 'জন ছাত্র সিলেক্টেড' : 'Students Selected'}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Message Composition */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-1 px-1">
                <div className="w-8 h-8 bg-[#8D30F4]/10 rounded-xl flex items-center justify-center text-[#8D30F4]">
                   <MessageSquare size={16} />
                </div>
                <h4 className="text-[11px] font-black text-[#2E0B5E] uppercase tracking-widest">২. মেসেজ কম্পোজ করুন</h4>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setShowTemplateDropdown(!showTemplateDropdown)} 
                  className={`w-full h-[60px] flex items-center justify-between px-6 rounded-[1.2rem] text-sm font-black transition-all border-2 ${bulkMessage ? 'bg-[#F2EBFF] border-[#8D30F4]/20 text-[#2E0B5E]' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen size={18} className="text-[#8D30F4]" />
                    <span className="truncate">{bulkMessage ? 'টেমপ্লেট লোড হয়েছে' : 'টেমপ্লেট থেকে বাছাই করুন'}</span>
                  </div>
                  <ChevronDown size={18} className={`text-slate-300 transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showTemplateDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 z-[90] p-2 animate-in slide-in-from-top-4 max-h-52 overflow-y-auto">
                    {templates.map(tmp => (
                      <button key={tmp.id} onClick={() => { setBulkMessage(tmp.body); setShowTemplateDropdown(false); }} className="w-full text-left px-5 py-3 rounded-xl hover:bg-slate-50 transition-all mb-1">
                        <p className="text-[9px] font-black text-[#8D30F4] uppercase tracking-wider mb-0.5">{tmp.title}</p>
                        <p className="text-xs font-bold text-slate-500 truncate font-noto">{tmp.body}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-1.5 opacity-40">
                    <Sparkles size={12} className="text-[#8D30F4]" />
                    <span className="text-[9px] font-black text-[#2E0B5E] uppercase tracking-widest">Composer</span>
                  </div>
                  <div className="bg-[#F2EBFF] px-3 py-0.5 rounded-full">
                    <span className={`text-[10px] font-black ${bulkMessage.length > 150 ? 'text-orange-500' : 'text-[#8D30F4]'}`}>{bulkMessage.length}</span>
                    <span className="text-[10px] font-black text-[#A179FF]/40"> / 160</span>
                  </div>
                </div>
                <textarea 
                  className="w-full h-32 px-5 py-5 bg-slate-50/50 border-2 border-slate-100 rounded-[1.8rem] text-[#2E0B5E] font-bold outline-none focus:border-[#8D30F4]/20 focus:bg-white transition-all shadow-inner leading-relaxed font-noto text-md resize-none" 
                  placeholder="আপনার মেসেজ এখানে লিখুন..." 
                  value={bulkMessage} 
                  onChange={(e) => setBulkMessage(e.target.value)} 
                  maxLength={160} 
                />
              </div>
            </div>

            <div className="flex flex-col gap-3.5 pt-2">
              <button 
                onClick={handleSendBulk} 
                disabled={sendingBulk || !bulkMessage.trim() || !selectedClassId} 
                className="w-full py-5 premium-btn text-white font-black rounded-[1.8rem] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-40"
              >
                {sendingBulk ? <Loader2 className="animate-spin" size={24} /> : bulkSuccess ? <><CheckCircle2 size={24} /> পাঠানো হয়েছে</> : <><Send size={20} /> বাল্ক এসএমএস পাঠান</>}
              </button>
              
              <button 
                onClick={handleSendNativeBulk} 
                disabled={sendingBulk || !bulkMessage.trim() || !selectedClassId} 
                className="w-full py-4.5 bg-[#2E0B5E] text-white font-black rounded-[1.8rem] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-base border border-white/10 disabled:opacity-40"
              >
                <Smartphone size={20} /> {t('native_sms', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between px-3">
            <div>
              <h2 className="text-2xl font-black text-white font-noto drop-shadow-md">মেসেজ টেমপ্লেট</h2>
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mt-1">Manage saved responses</p>
            </div>
            <button onClick={() => { setEditingId(null); setTempTitle(''); setTempBody(''); setShowAddModal(true); }} className="w-14 h-14 bg-white text-[#8D30F4] rounded-[1.5rem] shadow-2xl flex items-center justify-center active:scale-90 transition-all border-4 border-[#8D30F4]/10">
              <Plus size={28} strokeWidth={3} />
            </button>
          </div>
          
          {loading ? (
             <div className="space-y-4">
               {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/20 animate-pulse rounded-[2rem]"></div>)}
             </div>
          ) : templates.length > 0 ? (
            <div className="space-y-4">
              {templates.map(tmp => (
                <div key={tmp.id} className="bg-white/95 backdrop-blur-md p-5 rounded-[2rem] border border-white shadow-xl flex flex-col gap-3 group">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#F2EBFF] rounded-lg flex items-center justify-center text-[#8D30F4]">
                           <MessageSquare size={16} />
                        </div>
                        <h3 className="font-black text-[#2E0B5E] text-[16px] font-noto truncate max-w-[180px]">{tmp.title}</h3>
                     </div>
                     <div className="flex gap-2">
                       <button onClick={() => { setEditingId(tmp.id); setTempTitle(tmp.title); setTempBody(tmp.body); setShowAddModal(true); }} className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 active:scale-90 transition-all hover:bg-[#8D30F4] hover:text-white hover:border-[#8D30F4]">
                         <Edit3 size={16} />
                       </button>
                       <button onClick={() => setShowDeleteTemplateConfirm(tmp.id)} className="w-9 h-9 bg-slate-50 text-red-300 rounded-xl flex items-center justify-center border border-slate-100 active:scale-90 transition-all hover:bg-red-500 hover:text-white hover:border-red-500">
                         <Trash2 size={16} />
                       </button>
                     </div>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed font-bold font-noto px-1">{tmp.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/10 rounded-[3rem] border-2 border-dashed border-white/30 backdrop-blur-sm">
              <p className="text-white/60 font-black text-[11px] uppercase tracking-widest">No templates found</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recharge' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
           <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-white space-y-8">
              <div className="text-center space-y-4">
                <div className="inline-flex p-3.5 bg-[#8D30F4]/5 rounded-[1.8rem] border border-[#8D30F4]/10">
                   <Smartphone size={32} className="text-[#8D30F4]" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-[#2E0B5E]">রিচার্জ করুন</h3>
                   <p className="text-xs font-bold text-slate-400 font-noto mt-1">নিচের নম্বরে সেন্ড মানি করে রিকোয়েস্ট পাঠান</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-5 rounded-[1.8rem] bg-gradient-to-br from-[#E2136E] to-[#D12053] text-white flex flex-col items-center justify-center gap-2 shadow-lg relative overflow-hidden group">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">bKash</span>
                    <span className="text-sm font-black">Personal</span>
                    <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-white/10 rounded-full"></div>
                 </div>
                 <div className="p-5 rounded-[1.8rem] bg-gradient-to-br from-[#F49124] to-[#E86D23] text-white flex flex-col items-center justify-center gap-2 shadow-lg relative overflow-hidden group">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Nagad</span>
                    <span className="text-sm font-black">Personal</span>
                    <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-white/10 rounded-full"></div>
                 </div>
              </div>

              <div className="bg-[#F2EBFF]/60 p-5 rounded-[2rem] border border-[#8D30F4]/10 text-center space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Number</p>
                <h3 className="text-2xl font-black text-[#8D30F4] tracking-tighter">০১৭৫৬৬৭৭৮৮৯</h3>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">টাকার পরিমাণ</label>
                  <div className="relative">
                    <input type="number" className="w-full px-6 py-4.5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-[#2D3142] font-black text-xl outline-none focus:border-[#8D30F4]/20 transition-all pl-12" placeholder="000" />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-[#8D30F4] text-xl">৳</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">ট্রানজ্যাকশন আইডি (TrxID)</label>
                  <input type="text" className="w-full px-6 py-4.5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-[#2D3142] font-black text-lg outline-none focus:border-[#8D30F4]/20 transition-all uppercase placeholder:normal-case" placeholder="যেমন: 8X23M1..." />
                </div>
                <button className="w-full py-5.5 premium-btn text-white font-black rounded-[1.8rem] shadow-2xl active:scale-[0.98] transition-all text-xl mt-2">রিচার্জ রিকোয়েস্ট পাঠান</button>
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-4">
                 <History size={16} className="text-[#8D30F4]" />
                 <span className="text-[11px] font-black text-[#8D30F4] uppercase tracking-widest">View History</span>
              </div>
           </div>
        </div>
      )}

      {/* Template Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[500] flex items-center justify-center p-8 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[2.8rem] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.4)] border border-[#8D30F4]/10 relative animate-in zoom-in-95">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-[#8D30F4] transition-all p-2"><X size={26} strokeWidth={3} /></button>
              <h2 className="text-xl font-black text-[#2E0B5E] mb-8 font-noto tracking-tight flex items-center gap-3">
                <Edit3 className="text-[#8D30F4]" size={22} />
                {editingId ? 'টেমপ্লেট সংশোধন' : 'নতুন টেমপ্লেট'}
              </h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">টেমপ্লেট নাম</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[#2E0B5E] font-black text-lg outline-none focus:border-[#8D30F4]/20 transition-all shadow-inner" 
                    value={tempTitle} 
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="যেমন: উপস্থিতি"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">মেসেজ টেক্সট</label>
                  <textarea 
                    className="w-full h-32 px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[#2E0B5E] font-bold text-md outline-none focus:border-[#8D30F4]/20 transition-all resize-none leading-relaxed font-noto shadow-inner" 
                    value={tempBody} 
                    onChange={(e) => setTempBody(e.target.value)}
                    placeholder="মেসেজ লিখুন..."
                  />
                </div>
                
                <button 
                  onClick={handleSaveTemplate} 
                  disabled={isSaving || !tempTitle.trim() || !tempBody.trim()} 
                  className="w-full py-5 premium-btn text-white font-black rounded-[1.5rem] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-40"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={24} /> : <><Check size={22} strokeWidth={4} /> টেমপ্লেট সেভ করুন</>}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Template Confirmation Modal */}
      {showDeleteTemplateConfirm && (
        <div className="fixed inset-0 bg-red-900/40 backdrop-blur-xl z-[600] flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border-2 border-red-50 text-center space-y-6 animate-in zoom-in-95">
             <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle size={32} />
             </div>
             <div>
                <h3 className="text-lg font-black text-[#2E0B5E]">{t('confirm_delete', lang)}</h3>
                <p className="text-xs font-bold text-slate-400 mt-2.5 leading-relaxed">এই টেমপ্লেটটি মুছে ফেললে পরে আর ফিরে পাওয়া যাবে না। আপনি কি নিশ্চিত?</p>
             </div>
             <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowDeleteTemplateConfirm(null)} 
                  className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl active:scale-95 transition-all text-sm"
                >
                  বাতিল
                </button>
                <button 
                  onClick={() => handleDeleteTemplate(showDeleteTemplateConfirm)} 
                  disabled={isDeleting} 
                  className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center text-sm"
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={18} /> : 'ডিলিট করুন'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSMS;
