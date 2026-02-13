
import React, { useState, useEffect } from 'react';
import { Wallet, MessageSquare, Plus, Trash2, CreditCard, Loader2, Check, Save, Edit3, Send, ChevronDown, BookOpen, Users, CheckCircle2, AlertCircle, History, Smartphone, X, Type } from 'lucide-react';
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
  
  // Bulk SMS State
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(false);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  // Template Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Recharge State
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [trxId, setTrxId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [rechargeSuccess, setRechargeSuccess] = useState(false);
  const [recentTrans, setRecentTrans] = useState<Transaction[]>([]);

  useEffect(() => { 
    if (activeTab === 'templates') fetchTemplates(); 
    if (activeTab === 'recharge') fetchRecentTransactions();
    if (activeTab === 'bulk-sms') {
      fetchClasses();
      fetchTemplates();
    }
  }, [activeTab, madrasah?.id, dataVersion]);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassStudents(selectedClassId);
    } else {
      setClassStudents([]);
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    const cached = offlineApi.getCache('classes');
    if (cached) setClasses(sortMadrasahClasses(cached));
    if (navigator.onLine) {
      const { data } = await supabase.from('classes').select('*');
      if (data) {
        const sorted = sortMadrasahClasses(data);
        setClasses(sorted);
        offlineApi.setCache('classes', sorted);
      }
    }
  };

  const fetchClassStudents = async (cid: string) => {
    setLoadingStudents(true);
    try {
      const { data } = await supabase.from('students').select('*').eq('class_id', cid);
      if (data) setClassStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    const cached = offlineApi.getCache('sms_templates');
    if (cached) setTemplates(cached);
    if (navigator.onLine && madrasah?.id) {
      try {
        const { data } = await supabase.from('sms_templates').select('*').eq('madrasah_id', madrasah.id).order('created_at', { ascending: false });
        if (data) { setTemplates(data); offlineApi.setCache('sms_templates', data); }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    } else { setLoading(false); }
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
      alert(err.message);
    } finally {
      setSendingBulk(false);
    }
  };

  const handleNativeBulk = () => {
    if (!bulkMessage.trim() || classStudents.length === 0) return;
    
    const phoneNumbers = classStudents.map(s => s.guardian_phone.replace(/\D/g, ''));
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? ';' : ',';
    const numbersStr = phoneNumbers.join(separator);
    
    const bodyParam = `${isIOS ? '&' : '?'}body=${encodeURIComponent(bulkMessage)}`;
    window.location.href = `sms:${numbersStr}${bodyParam}`;
  };

  const selectTemplate = (tmp: SMSTemplate) => {
    setBulkMessage(tmp.body);
    setShowTemplateDropdown(false);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTitle.trim() || !templateBody.trim() || !madrasah) return;
    setSavingTemplate(true);
    try {
      const payload = { title: templateTitle.trim(), body: templateBody.trim(), madrasah_id: madrasah.id };
      if (navigator.onLine) {
        if (editingTemplate) await supabase.from('sms_templates').update(payload).eq('id', editingTemplate.id);
        else await supabase.from('sms_templates').insert(payload);
      } else {
        if (editingTemplate) offlineApi.queueAction('sms_templates', 'UPDATE', { ...payload, id: editingTemplate.id });
        else offlineApi.queueAction('sms_templates', 'INSERT', payload);
      }
      offlineApi.removeCache('sms_templates');
      setShowTemplateModal(false);
      fetchTemplates();
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const fetchRecentTransactions = async () => {
    if (!madrasah) return;
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('madrasah_id', madrasah.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (data) setRecentTrans(data);
    } catch (err) { console.error(err); }
  };

  const handleRechargeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!madrasah || !madrasah.id) return;
    setRecharging(true);
    try {
      const payload = { madrasah_id: madrasah.id, amount: parseFloat(rechargeAmount), transaction_id: trxId.trim().toUpperCase(), sender_phone: senderPhone.trim(), type: 'credit' as const, status: 'pending' as const, description: `bKash Payment for SMS Credits` };
      const { error } = await supabase.from('transactions').insert(payload);
      if (error) throw error;
      setRechargeSuccess(true);
      setRechargeAmount('');
      setTrxId('');
      setSenderPhone('');
      setTimeout(() => setRechargeSuccess(false), 3000);
      fetchRecentTransactions();
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRecharging(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex bg-white/10 p-1 rounded-3xl border border-white/20 backdrop-blur-xl">
        <button 
          onClick={() => setActiveTab('bulk-sms')} 
          className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'bulk-sms' ? 'bg-white text-[#d35132] shadow-lg' : 'text-white/40'}`}
        >
          <Send size={14} />
          {t('bulk_sms', lang)}
        </button>
        <button 
          onClick={() => setActiveTab('templates')} 
          className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'templates' ? 'bg-white text-[#d35132] shadow-lg' : 'text-white/40'}`}
        >
          <MessageSquare size={14} />
          {t('templates', lang)}
        </button>
        <button 
          onClick={() => setActiveTab('recharge')} 
          className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'recharge' ? 'bg-white text-[#d35132] shadow-lg' : 'text-white/40'}`}
        >
          <CreditCard size={14} />
          {t('recharge', lang)}
        </button>
      </div>

      {activeTab === 'bulk-sms' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white/15 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 p-6 space-y-6 shadow-2xl">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">{t('class_select', lang)}</label>
                <div className="relative">
                  <select 
                    className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white font-bold outline-none focus:bg-white/20 transition-all appearance-none"
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                  >
                    <option value="" className="text-slate-800">{t('class_choose', lang)}</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id} className="text-slate-800">{cls.class_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                </div>
              </div>

              {selectedClassId && (
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 animate-in fade-in">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white"><Users size={20} /></div>
                  <div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Total Students</p>
                    <p className="text-base font-black text-white">{loadingStudents ? '...' : classStudents.length} {t('students_count', lang)}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1 mb-2 block">টেমপ্লেট থেকে বাছাই করুন</label>
                <button 
                  onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white/80 text-xs font-bold active:bg-white/20 transition-all"
                >
                  <div className="flex items-center gap-2 truncate text-white/80">
                    <BookOpen size={14} className="text-yellow-400" />
                    <span>{lang === 'bn' ? 'সংরক্ষিত টেমপ্লেট' : 'Select Template'}</span>
                  </div>
                  <ChevronDown size={16} className={`transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showTemplateDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-white/30 z-[60] max-h-56 overflow-y-auto animate-in slide-in-from-top-2">
                    {templates.length > 0 ? templates.map(tmp => (
                      <button 
                        key={tmp.id}
                        onClick={() => selectTemplate(tmp)}
                        className="w-full text-left px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-[10px] font-black text-[#d35132] uppercase mb-0.5">{tmp.title}</p>
                        <p className="text-xs font-bold text-slate-600 truncate">{tmp.body}</p>
                      </button>
                    )) : (
                      <p className="text-center py-5 text-slate-400 text-xs font-bold">কোনো টেমপ্লেট নেই</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">মেসেজ বক্স</label>
                <textarea 
                  className="w-full h-32 px-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white font-medium outline-none focus:bg-white/20 transition-all resize-none shadow-inner" 
                  placeholder="আপনার বার্তা এখানে লিখুন..."
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  maxLength={160}
                />
                <div className="flex justify-between px-1">
                  <span className="text-[10px] font-black text-white/30 uppercase">{bulkMessage.length} / 160</span>
                  {classStudents.length > 0 && (
                    <span className="text-[10px] font-black text-white/50 uppercase">Cost: {classStudents.length} SMS</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={handleSendBulk}
                  disabled={sendingBulk || !bulkMessage.trim() || !selectedClassId || classStudents.length === 0}
                  className="w-full py-4 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
                >
                  {sendingBulk ? <Loader2 className="animate-spin" size={20} /> : bulkSuccess ? <><CheckCircle2 size={20} /> সফল হয়েছে</> : <><Send size={18} /> {t('send_sms', lang)}</>}
                </button>
                
                <button 
                  onClick={handleNativeBulk}
                  disabled={!bulkMessage.trim() || classStudents.length === 0}
                  className="w-full py-4 bg-white/10 border border-white/20 text-white font-black rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm uppercase tracking-wider"
                >
                  <Smartphone size={18} /> {t('native_sms', lang)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-black text-white font-noto">{t('templates', lang)}</h2>
            <button 
              onClick={() => { setEditingTemplate(null); setTemplateTitle(''); setTemplateBody(''); setShowTemplateModal(true); }}
              className="bg-white text-[#d35132] p-2 rounded-xl active:scale-90 transition-all shadow-lg"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>
          
          {loading && templates.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 animate-pulse rounded-[2rem]"></div>)}
            </div>
          ) : templates.length > 0 ? (
            <div className="space-y-3">
              {templates.map(tmp => (
                <div key={tmp.id} className="bg-white/10 backdrop-blur-md p-5 rounded-[2.2rem] border border-white/15 shadow-xl">
                   <div className="flex items-center justify-between mb-2">
                     <h3 className="font-black text-white text-base font-noto">{tmp.title}</h3>
                     <div className="flex gap-2">
                       <button onClick={() => { setEditingTemplate(tmp); setTemplateTitle(tmp.title); setTemplateBody(tmp.body); setShowTemplateModal(true); }} className="p-2 bg-white/5 text-white/40 rounded-lg"><Edit3 size={16} /></button>
                       <button onClick={async () => { if(confirm('Delete?')) { await supabase.from('sms_templates').delete().eq('id', tmp.id); fetchTemplates(); } }} className="p-2 bg-white/5 text-white/40 rounded-lg"><Trash2 size={16} /></button>
                     </div>
                   </div>
                   <p className="text-xs text-white/70 leading-relaxed font-medium">{tmp.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
              <p className="text-white/30 text-xs font-black uppercase tracking-widest">{lang === 'bn' ? 'কোনো টেমপ্লেট নেই' : 'No templates found'}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'recharge' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white/15 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 p-6 space-y-6 shadow-2xl">
            <div className="text-center bg-white/5 p-5 rounded-[2rem] border border-white/10">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">bKash Personal Number</p>
              <h3 className="text-xl font-black text-white tracking-widest">017XXXXXXXX</h3>
              <p className="text-[9px] text-white/30 mt-2">Send Money করুন এবং নিচের ফর্মটি পূরণ করুন</p>
            </div>

            <form onSubmit={handleRechargeRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">টাকার পরিমাণ (BDT)</label>
                <input type="number" required placeholder="e.g. 500" className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white font-bold outline-none focus:bg-white/20 transition-all shadow-inner" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">bKash ট্রানজ্যাকশন আইডি</label>
                <input type="text" required placeholder="e.g. BKT123XYZ" className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white font-black outline-none focus:bg-white/20 transition-all uppercase shadow-inner" value={trxId} onChange={(e) => setTrxId(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">বিকাশ নম্বর</label>
                <input type="tel" required placeholder="017XXXXXXXX" className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white font-bold outline-none focus:bg-white/20 transition-all shadow-inner" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} />
              </div>
              <button type="submit" disabled={recharging} className="w-full py-5 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base">
                {recharging ? <Loader2 className="animate-spin" size={20} /> : rechargeSuccess ? <><Check size={20} /> পেমেন্ট সাবমিট হয়েছে</> : <><Wallet size={18} /> রিচার্জ রিকোয়েস্ট পাঠান</>}
              </button>
            </form>
          </div>

          {recentTrans.length > 0 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                <History size={12} /> {t('history', lang)}
              </h3>
              <div className="space-y-2">
                {recentTrans.map(tr => (
                  <div key={tr.id} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between text-white transition-all shadow-lg">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-xs font-black truncate block font-noto leading-tight">{tr.description}</p>
                      <p className="text-[9px] font-bold text-white/30 block mt-1">{new Date(tr.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-black whitespace-nowrap ${tr.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                        {tr.type === 'credit' ? '+' : '-'}{tr.amount} ৳
                      </span>
                      {tr.status === 'pending' && (
                        <p className="text-[8px] font-black text-yellow-400 uppercase mt-0.5 tracking-tighter italic">Pending Approval</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modern High-End Template Editor - Fixed Backdrop and Contrast */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xl z-[400] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#d35132] w-full max-w-md rounded-[3rem] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden flex flex-col relative animate-in zoom-in-95">
            {/* Header */}
            <div className="px-8 py-6 flex items-center justify-between bg-white/10 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shadow-inner">
                  <MessageSquare size={24} />
                </div>
                <h2 className="text-xl font-black text-white font-noto tracking-tight">
                  {editingTemplate ? t('edit_class', lang) : t('new_template', lang)}
                </h2>
              </div>
              <button 
                onClick={() => setShowTemplateModal(false)} 
                className="p-3 bg-white/15 rounded-2xl text-white active:scale-90 transition-all border border-white/10 hover:bg-white/25"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Editor Content */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <form onSubmit={handleSaveTemplate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                    <Type size={12} /> {t('template_title', lang)}
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. ছুটির নোটিশ" 
                    className="w-full px-6 py-4.5 bg-white/15 border border-white/20 rounded-2xl text-white font-bold outline-none focus:bg-white/25 focus:border-white/40 transition-all shadow-inner text-base font-noto placeholder:text-white/30" 
                    value={templateTitle} 
                    onChange={(e) => setTemplateTitle(e.target.value)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em] flex items-center gap-2">
                      <BookOpen size={12} /> {t('template_body', lang)}
                    </label>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${templateBody.length > 160 ? 'text-yellow-400' : 'text-white/30'}`}>
                      {templateBody.length} / 160
                    </span>
                  </div>
                  <textarea 
                    required 
                    placeholder="মেসেজের মূল অংশ এখানে লিখুন..." 
                    className="w-full h-48 px-6 py-5 bg-white/15 border border-white/20 rounded-[2rem] text-white font-medium outline-none focus:bg-white/25 focus:border-white/40 transition-all resize-none shadow-inner leading-relaxed text-sm font-noto placeholder:text-white/30" 
                    value={templateBody} 
                    onChange={(e) => setTemplateBody(e.target.value)} 
                  />
                </div>
                
                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    type="submit" 
                    disabled={savingTemplate} 
                    className="w-full py-5 bg-white text-[#d35132] font-black rounded-2xl shadow-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50"
                  >
                    {savingTemplate ? <Loader2 className="animate-spin" size={24} /> : <><Save size={22} /> {t('save', lang)}</>}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowTemplateModal(false)}
                    className="w-full py-4 text-white/60 font-black uppercase tracking-[0.2em] text-[11px] active:text-white transition-colors"
                  >
                    {t('cancel', lang)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSMS;
