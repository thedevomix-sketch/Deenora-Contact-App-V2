import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, Send, ChevronDown, BookOpen, Users, CheckCircle2, MessageSquare, Plus, Edit3, Trash2, Smartphone, X, Check, AlertCircle, Sparkles, LayoutList } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'bulk-sms' | 'templates' | 'recharge'>('bulk-sms');
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
  const [isSaving, setIsSaving] = useState(false);
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
    if (!confirm(t('confirm_delete', lang))) return;
    try {
      if (navigator.onLine) {
        await supabase.from('sms_templates').delete().eq('id', id);
      } else {
        offlineApi.queueAction('sms_templates', 'DELETE', { id });
      }
      fetchTemplates();
    } catch (err: any) { alert(err.message); }
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      {/* Premium Dynamic Tab Switcher */}
      <div className="flex bg-white/10 backdrop-blur-xl p-2 rounded-[2.5rem] shadow-[0_15px_40px_rgba(46,11,94,0.15)] border border-white/20">
        {(['bulk-sms', 'templates', 'recharge'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} 
            className={`flex-1 py-4.5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2.5 transition-all duration-300 ${activeTab === tab ? 'bg-white text-[#8D30F4] shadow-2xl scale-[1.02]' : 'text-white/80 hover:text-white'}`}>
            {tab === 'bulk-sms' && <Send size={16} />}
            {tab === 'templates' && <MessageSquare size={16} />}
            {tab === 'recharge' && <CreditCard size={16} />}
            {tab === 'bulk-sms' ? t('bulk_sms', lang) : tab === 'templates' ? t('templates', lang) : t('recharge', lang)}
          </button>
        ))}
      </div>

      {activeTab === 'bulk-sms' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
          <div className="bg-white/95 backdrop-blur-xl p-10 rounded-[3.5rem] shadow-[0_50px_120px_rgba(46,11,94,0.35)] border border-white/50 space-y-10">
            {/* Step 1: Target Audience */}
            <div className="space-y-5">
              <label className="text-[11px] font-black text-[#8D30F4] uppercase tracking-[0.25em] px-1 opacity-80">১. অডিয়েন্স (Target Audience)</label>
              <div className="relative">
                <button 
                  onClick={() => setShowClassDropdown(!showClassDropdown)}
                  className={`w-full px-7 py-6 rounded-[2.2rem] border-2 transition-all flex items-center justify-between group ${selectedClassId ? 'bg-[#8D30F4]/5 border-[#8D30F4]/30 shadow-inner' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedClassId ? 'bg-[#8D30F4] text-white shadow-xl' : 'bg-white text-[#8D30F4] shadow-md border border-slate-100'}`}>
                      <LayoutList size={26} />
                    </div>
                    <span className={`text-xl font-black transition-colors ${selectedClassId ? 'text-[#2E0B5E]' : 'text-slate-400'}`}>
                      {getSelectedClassName()}
                    </span>
                  </div>
                  <ChevronDown className={`text-[#8D30F4]/40 group-hover:text-[#8D30F4] transition-all duration-300 ${showClassDropdown ? 'rotate-180' : ''}`} size={28} />
                </button>

                {showClassDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[3rem] shadow-[0_30px_80px_rgba(0,0,0,0.25)] border border-slate-100 z-[100] p-4 animate-in slide-in-from-top-4 max-h-72 overflow-y-auto custom-scrollbar">
                    {classes.map(cls => (
                      <button 
                        key={cls.id} 
                        onClick={() => { setSelectedClassId(cls.id); setShowClassDropdown(false); }} 
                        className={`w-full text-left px-7 py-5 rounded-2xl flex items-center justify-between transition-all mb-2 ${selectedClassId === cls.id ? 'bg-[#8D30F4] text-white shadow-xl scale-[1.02]' : 'hover:bg-[#F2EBFF] text-[#2E0B5E]'}`}
                      >
                        <span className="font-black font-noto text-xl">{cls.class_name}</span>
                        {selectedClassId === cls.id && <Check size={24} strokeWidth={4} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedClassId && (
                <div className="flex items-center gap-6 bg-gradient-to-r from-[#8D30F4]/10 to-transparent p-7 rounded-[2.5rem] border-2 border-[#8D30F4]/20 animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center text-[#8D30F4] shadow-xl border border-[#8D30F4]/10 relative">
                      <Users size={32} />
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-[#A179FF] uppercase tracking-[0.2em] leading-none mb-2">Selected Batch</p>
                    <p className="text-3xl font-black text-[#2E0B5E] flex items-center gap-2">
                      {loadingStudents ? <Loader2 className="animate-spin" size={24} /> : classStudents.length} 
                      <span className="text-sm text-[#8D30F4]/60 font-noto">{lang === 'bn' ? 'জন ছাত্র' : 'Students'}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Composition */}
            <div className="space-y-6">
              <label className="text-[11px] font-black text-[#8D30F4] uppercase tracking-[0.25em] px-1 opacity-80">২. মেসেজ কম্পোজিশন (Composition)</label>
              
              <div className="relative">
                <button 
                  onClick={() => setShowTemplateDropdown(!showTemplateDropdown)} 
                  className={`w-full flex items-center justify-between px-8 py-6 rounded-[2.2rem] text-md font-black active:scale-[0.99] transition-all border-2 ${bulkMessage ? 'bg-[#F2EBFF] border-[#8D30F4]/30 text-[#2E0B5E]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                >
                  <div className="flex items-center gap-5">
                    <BookOpen size={24} className="text-[#8D30F4]" />
                    <span>{bulkMessage ? (lang === 'bn' ? 'টেমপ্লেট পরিবর্তন' : 'Change Template') : (lang === 'bn' ? 'টেমপ্লেট বাছাই করুন' : 'Pick a Template')}</span>
                  </div>
                  <ChevronDown size={24} className={`text-[#8D30F4]/40 transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showTemplateDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[3rem] shadow-[0_30px_80px_rgba(0,0,0,0.25)] border border-slate-100 z-[90] p-4 animate-in slide-in-from-top-4 max-h-64 overflow-y-auto">
                    {templates.map(tmp => (
                      <button key={tmp.id} onClick={() => { setBulkMessage(tmp.body); setShowTemplateDropdown(false); }} className="w-full text-left px-7 py-6 rounded-3xl border-b border-slate-50 last:border-0 hover:bg-[#F2EBFF] transition-all mb-2">
                        <p className="text-[11px] font-black text-[#8D30F4] uppercase mb-1.5 tracking-wider">{tmp.title}</p>
                        <p className="text-md font-bold text-slate-500 truncate font-noto">{tmp.body}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end px-3">
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={16} className="text-[#8D30F4]" />
                    <span className="text-[11px] font-black text-[#2E0B5E] uppercase tracking-widest">Compose SMS</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#8D30F4]/10 px-4 py-1.5 rounded-full border border-[#8D30F4]/5">
                    <span className={`text-[11px] font-black ${bulkMessage.length > 150 ? 'text-orange-500' : 'text-[#8D30F4]'}`}>{bulkMessage.length}</span>
                    <span className="text-[11px] font-black text-[#A179FF]/50">/ 160</span>
                  </div>
                </div>
                <textarea 
                  className="w-full h-48 px-8 py-8 bg-[#F2EBFF]/40 border-2 border-transparent rounded-[2.8rem] text-[#2E0B5E] font-bold outline-none focus:border-[#8D30F4]/30 focus:bg-white transition-all shadow-inner leading-relaxed font-noto text-lg" 
                  placeholder="আপনার মেসেজ এখানে লিখুন..." 
                  value={bulkMessage} 
                  onChange={(e) => setBulkMessage(e.target.value)} 
                  maxLength={160} 
                />
              </div>
            </div>

            <div className="flex flex-col gap-5 pt-6">
              <button 
                onClick={handleSendBulk} 
                disabled={sendingBulk || !bulkMessage.trim() || !selectedClassId} 
                className="w-full py-7 premium-btn text-white font-black rounded-[2.5rem] shadow-[0_30px_70px_rgba(141,48,244,0.45)] active:scale-[0.98] transition-all flex items-center justify-center gap-5 text-2xl font-noto disabled:opacity-30"
              >
                {sendingBulk ? <Loader2 className="animate-spin" size={32} /> : bulkSuccess ? <><CheckCircle2 size={32} /> Sent Successfully</> : <><Send size={28} /> {t('send_sms', lang)}</>}
              </button>
              
              <button 
                onClick={handleSendNativeBulk} 
                disabled={sendingBulk || !bulkMessage.trim() || !selectedClassId} 
                className="w-full py-6 bg-[#2E0B5E] text-white font-black rounded-[2.5rem] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-5 text-xl font-noto disabled:opacity-30 border border-white/10"
              >
                <Smartphone size={28} /> {t('native_sms', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-3xl font-black text-white font-noto drop-shadow-md">{t('templates', lang)}</h2>
            <button onClick={() => { setEditingId(null); setTempTitle(''); setTempBody(''); setShowAddModal(true); }} className="premium-btn text-white p-4 rounded-2xl shadow-xl border border-white/20 active:scale-95 transition-all">
              <Plus size={28} strokeWidth={4} />
            </button>
          </div>
          
          {loading ? (
             <div className="space-y-5">
               {[1, 2].map(i => <div key={i} className="h-40 bg-white/20 animate-pulse rounded-[3rem]"></div>)}
             </div>
          ) : templates.map(tmp => (
            <div key={tmp.id} className="bg-white/95 backdrop-blur-md p-8 rounded-[3rem] border border-white shadow-xl space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                 <h3 className="font-black text-[#2E0B5E] text-2xl font-noto truncate pr-6">{tmp.title}</h3>
                 <div className="flex gap-3">
                   <button onClick={() => { setEditingId(tmp.id); setTempTitle(tmp.title); setTempBody(tmp.body); setShowAddModal(true); }} className="w-12 h-12 bg-[#F2EBFF] text-[#8D30F4] rounded-2xl flex items-center justify-center border border-[#8D30F4]/10 active:scale-90 transition-all shadow-sm">
                     <Edit3 size={20} />
                   </button>
                   <button onClick={() => handleDeleteTemplate(tmp.id)} className="w-12 h-12 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center border border-red-100 active:scale-90 transition-all shadow-sm">
                     <Trash2 size={20} />
                   </button>
                 </div>
              </div>
              <p className="text-lg text-slate-600 leading-relaxed font-bold font-noto line-clamp-3">{tmp.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recharge Tab */}
      {activeTab === 'recharge' && (
        <div className="bg-white/95 backdrop-blur-xl p-10 rounded-[3.5rem] shadow-2xl border border-white space-y-10 text-center animate-in slide-in-from-bottom-5">
          <div className="bg-[#8D30F4]/5 p-10 rounded-[3rem] border-2 border-dashed border-[#8D30F4]/20">
            <Smartphone size={45} className="mx-auto text-[#8D30F4] mb-6" />
            <p className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-3">Send Money (bKash/Nagad)</p>
            <h3 className="text-3xl font-black text-[#2E0B5E] tracking-tighter">017XXXXXXXX</h3>
          </div>
          <div className="space-y-8 text-left">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-[#4B168A] uppercase tracking-widest px-2">টাকার পরিমাণ</label>
              <input type="number" className="w-full px-7 py-5 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.8rem] text-[#2D3142] font-black text-2xl outline-none focus:border-[#8D30F4]" placeholder="Amount (৳)" />
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black text-[#4B168A] uppercase tracking-widest px-2">TrxID</label>
              <input type="text" className="w-full px-7 py-5 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.8rem] text-[#2D3142] font-black text-2xl outline-none focus:border-[#8D30F4] uppercase" placeholder="8X23M1..." />
            </div>
            <button className="w-full py-7 premium-btn text-white font-black rounded-[2.5rem] shadow-2xl active:scale-[0.98] transition-all text-2xl">রিচার্জ রিকোয়েস্ট পাঠান</button>
          </div>
        </div>
      )}

      {/* Add/Edit Template Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[500] flex items-center justify-center p-8 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3.5rem] p-12 shadow-[0_50px_120px_rgba(0,0,0,0.4)] border-2 border-[#8D30F4]/10 relative animate-in zoom-in-95">
              <button onClick={() => setShowAddModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-[#8D30F4] transition-all p-2"><X size={32} strokeWidth={3} /></button>
              <h2 className="text-3xl font-black text-[#2E0B5E] mb-10 font-noto tracking-tight">
                {editingId ? 'টেমপ্লেট এডিট' : 'নতুন টেমপ্লেট'}
              </h2>
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Template Title</label>
                  <input 
                    type="text" 
                    className="w-full px-7 py-5 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.5rem] text-[#2E0B5E] font-black text-xl outline-none focus:border-[#8D30F4] transition-all" 
                    value={tempTitle} 
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="e.g. Attendance"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Message Content</label>
                  <textarea 
                    className="w-full h-40 px-7 py-6 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.5rem] text-[#2E0B5E] font-bold text-lg outline-none focus:border-[#8D30F4] transition-all resize-none leading-relaxed font-noto" 
                    value={tempBody} 
                    onChange={(e) => setTempBody(e.target.value)}
                    placeholder="Enter message body..."
                  />
                </div>
                
                <button 
                  onClick={handleSaveTemplate} 
                  disabled={isSaving || !tempTitle.trim() || !tempBody.trim()} 
                  className="w-full py-6 premium-btn text-white font-black rounded-[2rem] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-2xl disabled:opacity-40"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={32} /> : <><Check size={32} strokeWidth={4} /> {t('save', lang)}</>}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default WalletSMS;