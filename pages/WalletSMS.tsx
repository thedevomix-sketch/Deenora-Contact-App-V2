
import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, MessageSquare, Plus, Trash2, CreditCard, History, Loader2, Check, AlertCircle, Phone, Send, Hash, X, Save, Edit3, Users, BookOpen, ChevronDown, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'templates' | 'recharge' | 'quick-send'>('templates');
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Quick Send State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [quickMessage, setQuickMessage] = useState('');
  const [studentsInClass, setStudentsInClass] = useState<Student[]>([]);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);

  // Template Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Custom Delete Confirmation State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (activeTab === 'quick-send') {
      fetchTemplates();
      fetchClasses();
    }
  }, [activeTab, madrasah?.id, dataVersion]);

  useEffect(() => {
    if (selectedClassId) fetchStudentsOfClass(selectedClassId);
    else setStudentsInClass([]);
  }, [selectedClassId]);

  const fetchClasses = async () => {
    const cached = offlineApi.getCache('classes');
    if (cached) setClasses(sortMadrasahClasses(cached));

    if (navigator.onLine && madrasah?.id) {
      const { data } = await supabase.from('classes').select('*').eq('madrasah_id', madrasah.id);
      if (data) {
        const sorted = sortMadrasahClasses(data);
        setClasses(sorted);
        offlineApi.setCache('classes', sorted);
      }
    }
  };

  const fetchStudentsOfClass = async (id: string) => {
    setFetchingStudents(true);
    try {
      const { data } = await supabase.from('students').select('*').eq('class_id', id);
      setStudentsInClass(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingStudents(false);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    const cached = offlineApi.getCache('sms_templates');
    if (cached) setTemplates(cached);

    if (navigator.onLine && madrasah?.id) {
      try {
        const { data } = await supabase
          .from('sms_templates')
          .select('*')
          .eq('madrasah_id', madrasah.id)
          .order('created_at', { ascending: false });
        
        if (data) {
          setTemplates(data);
          offlineApi.setCache('sms_templates', data);
        }
      } catch (err) { 
        console.error("Template fetch error:", err); 
      } finally { 
        setLoading(false); 
      }
    } else { 
      setLoading(false); 
    }
  };

  const fetchRecentTransactions = async () => {
    if (!madrasah) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('madrasah_id', madrasah.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      if (data) setRecentTrans(data);
    } catch (err) { console.error("Fetch transactions error:", err); }
  };

  const handleQuickSend = async () => {
    if (!madrasah || studentsInClass.length === 0 || !quickMessage.trim()) return;
    
    setSendingBulk(true);
    try {
      await smsApi.sendBulk(madrasah.id, studentsInClass, quickMessage);
      alert(lang === 'bn' ? 'এসএমএস সফলভাবে পাঠানো হয়েছে!' : 'SMS sent successfully!');
      setSelectedClassId('');
      setSelectedTemplateId('');
      setQuickMessage('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingBulk(false);
    }
  };

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplateId(id);
    const tmp = templates.find(t => t.id === id);
    if (tmp) setQuickMessage(tmp.body);
    else setQuickMessage('');
  };

  const openAddModal = () => {
    setEditingTemplate(null);
    setNewTitle('');
    setNewBody('');
    setShowModal(true);
  };

  const openEditModal = (e: React.MouseEvent, tmp: SMSTemplate) => {
    e.stopPropagation();
    setEditingTemplate(tmp);
    setNewTitle(tmp.title);
    setNewBody(tmp.body);
    setShowModal(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim() || !madrasah) return;
    
    setSaving(true);
    try {
      const payload = { 
        madrasah_id: madrasah.id, 
        title: newTitle.trim(), 
        body: newBody.trim() 
      };

      if (navigator.onLine) {
        if (editingTemplate) {
          const { error } = await supabase
            .from('sms_templates')
            .update({ title: payload.title, body: payload.body })
            .eq('id', editingTemplate.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('sms_templates')
            .insert(payload);
          if (error) throw error;
        }
      } else {
        if (editingTemplate) {
          offlineApi.queueAction('sms_templates', 'UPDATE', { ...payload, id: editingTemplate.id });
        } else {
          offlineApi.queueAction('sms_templates', 'INSERT', payload);
        }
      }

      setShowModal(false);
      triggerRefresh();
    } catch (err: any) {
      alert(lang === 'bn' ? `সেভ করা যায়নি: ${err.message}` : `Save failed: ${err.message}`);
    } finally { 
      setSaving(false); 
    }
  };

  const initiateDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const performDelete = async () => {
    if (!confirmDeleteId) return;
    
    setIsDeleting(true);
    try {
      // Immediate UI update for speed
      const updatedList = templates.filter(t => t.id !== confirmDeleteId);
      setTemplates(updatedList);
      offlineApi.setCache('sms_templates', updatedList);

      if (navigator.onLine) {
        const { error } = await supabase.from('sms_templates').delete().eq('id', confirmDeleteId);
        if (error) throw error;
      } else {
        offlineApi.queueAction('sms_templates', 'DELETE', { id: confirmDeleteId });
      }
      
      triggerRefresh();
      setConfirmDeleteId(null);
    } catch (err: any) { 
      console.error("Delete template error:", err); 
      fetchTemplates(); // Revert on error
      alert(lang === 'bn' ? 'ডিলিট করা যায়নি' : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRechargeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!madrasah) {
       alert(lang === 'bn' ? 'মাদরাসা প্রোফাইল লোড হয়নি!' : 'Madrasah profile not loaded!');
       return;
    }
    if (!rechargeAmount || !trxId || !senderPhone) return;
    
    setRecharging(true);
    try {
      const payload = {
        madrasah_id: madrasah.id,
        amount: parseFloat(rechargeAmount),
        transaction_id: trxId.trim().toUpperCase(), // Always uppercase for TrxID
        sender_phone: senderPhone.trim(),
        type: 'credit' as const,
        status: 'pending' as const,
        description: `bKash Payment for SMS Credits`
      };

      // Optimistic update
      const tempId = 'temp-' + Date.now();
      const optimisticTr: Transaction = {
        id: tempId,
        created_at: new Date().toISOString(),
        ...payload
      };
      setRecentTrans(prev => [optimisticTr, ...prev]);

      const { error } = await supabase.from('transactions').insert(payload);

      if (error) {
        setRecentTrans(prev => prev.filter(t => t.id !== tempId));
        throw error;
      }
      
      setRechargeSuccess(true);
      setRechargeAmount('');
      setTrxId('');
      setSenderPhone('');
      
      setTimeout(() => setRechargeSuccess(false), 3000);
      fetchRecentTransactions();
      triggerRefresh();
    } catch (err: any) {
      console.error("Payment Request Error Detail:", err);
      // Detail error to help user understand it's a schema issue
      const errorMsg = err.message || "Unknown error";
      if (errorMsg.includes("sender_phone")) {
         alert(lang === 'bn' ? 'ডাটাবেজ এরর: sender_phone কলাম পাওয়া যায়নি। দয়া করে SQL রান করুন।' : 'Database error: sender_phone column not found. Please run the provided SQL script.');
      } else {
         alert(lang === 'bn' ? 'অনুরোধ পাঠানো ব্যর্থ হয়েছে। ইন্টারনেট কানেকশন চেক করুন।' : 'Failed to submit request. Please check your internet connection.');
      }
    } finally { 
      setRecharging(false); 
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex bg-white/10 p-1 rounded-3xl border border-white/20 backdrop-blur-xl">
        <button onClick={() => setActiveTab('templates')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${activeTab === 'templates' ? 'bg-white text-[#d35132] shadow-xl' : 'text-white/60'}`}>
          <MessageSquare size={14} /> {t('templates', lang)}
        </button>
        <button onClick={() => setActiveTab('quick-send')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${activeTab === 'quick-send' ? 'bg-white text-[#d35132] shadow-xl' : 'text-white/60'}`}>
          <Send size={14} /> {lang === 'bn' ? 'কুইক সেন্ড' : 'Quick Send'}
        </button>
        <button onClick={() => setActiveTab('recharge')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${activeTab === 'recharge' ? 'bg-white text-[#d35132] shadow-xl' : 'text-white/60'}`}>
          <CreditCard size={14} /> {t('recharge', lang)}
        </button>
      </div>

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-black text-white font-noto tracking-tight">{lang === 'bn' ? 'সংরক্ষিত টেমপ্লেট' : 'Saved Templates'}</h2>
            <button onClick={openAddModal} className="bg-white text-[#d35132] p-2.5 rounded-xl shadow-xl active:scale-95 transition-all">
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>

          {loading && templates.length === 0 ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 bg-white/10 animate-pulse rounded-3xl"></div>)}
            </div>
          ) : templates.length > 0 ? (
            <div className="space-y-3">
              {templates.map(tmp => (
                <div key={tmp.id} className="bg-white/10 backdrop-blur-md p-5 rounded-[2rem] border border-white/15 animate-in slide-in-from-bottom-2 group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-black text-white text-base font-noto truncate pr-2">{tmp.title}</h4>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={(e) => openEditModal(e, tmp)} className="p-2.5 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"><Edit3 size={16} /></button>
                      <button type="button" onClick={(e) => initiateDelete(e, tmp.id)} className="p-2.5 bg-white/5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm font-bold font-noto leading-relaxed">{tmp.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/20">
              <MessageSquare className="mx-auto text-white/10 mb-4" size={48} />
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">{lang === 'bn' ? 'কোনো টেমপ্লেট নেই' : 'No templates found'}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'quick-send' && (
        <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/20 shadow-xl space-y-6">
              <div className="flex items-center gap-3 px-1">
                 <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white"><Send size={20} /></div>
                 <h3 className="text-lg font-black text-white font-noto">{lang === 'bn' ? 'দ্রুত এসএমএস পাঠান' : 'Quick SMS Send'}</h3>
              </div>
              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1 block">{lang === 'bn' ? 'ক্লাস সিলেক্ট করুন' : 'Select Class'}</label>
                    <div className="relative">
                      <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                      <select className="w-full pl-11 pr-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-black text-sm appearance-none focus:bg-white/20 transition-all" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                        <option value="" className="text-slate-900">{lang === 'bn' ? 'ক্লাস বেছে নিন' : 'Choose a class'}</option>
                        {classes.map(cls => <option key={cls.id} value={cls.id} className="text-slate-900">{cls.class_name}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1 block">{lang === 'bn' ? 'টেমপ্লেট সিলেক্ট করুন' : 'Select Template'}</label>
                    <div className="relative">
                      <BookOpen size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                      <select className="w-full pl-11 pr-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-black text-sm appearance-none focus:bg-white/20 transition-all" value={selectedTemplateId} onChange={(e) => handleTemplateSelect(e.target.value)}>
                        <option value="" className="text-slate-900">{lang === 'bn' ? 'টেমপ্লেট বেছে নিন' : 'Choose a template'}</option>
                        {templates.map(tmp => <option key={tmp.id} value={tmp.id} className="text-slate-900">{tmp.title}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1 block flex items-center gap-1.5"><Eye size={12} /> {lang === 'bn' ? 'মেসেজ প্রিভিউ' : 'Message Preview'}</label>
                    <div className="w-full min-h-[6.5rem] px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white/90 font-bold text-sm italic leading-relaxed shadow-inner">
                      {quickMessage || (lang === 'bn' ? 'টেমপ্লেট বেছে নিন মেসেজ দেখার জন্য...' : 'Select a template to preview message...')}
                    </div>
                 </div>
                 <button type="button" onClick={handleQuickSend} disabled={sendingBulk || !selectedClassId || !quickMessage.trim() || studentsInClass.length === 0} className="w-full py-5 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50">
                   {sendingBulk ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> {lang === 'bn' ? 'এসএমএস পাঠান' : 'Send SMS'}</>}
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'recharge' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-center">
             <div className="absolute top-0 right-0 w-32 h-32 bg-[#d35132]/5 rounded-full -mr-16 -mt-16"></div>
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">SMS Credit Balance</p>
             <h3 className="text-5xl font-black text-[#d35132] flex items-center justify-center gap-2">
                {madrasah?.sms_balance || 0} 
                <span className="text-base font-bold uppercase text-slate-400">SMS</span>
             </h3>
          </div>

          <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/20 shadow-xl space-y-4">
             <div className="flex items-center gap-3 px-1 mb-2">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white"><CreditCard size={20} /></div>
                <h3 className="text-lg font-black text-white font-noto">পেমেন্ট রিকোয়েস্ট</h3>
             </div>
             
             {rechargeSuccess ? (
                <div className="bg-green-500/20 border border-green-500/30 p-8 rounded-3xl flex flex-col items-center text-center animate-in zoom-in duration-300">
                   <div className="w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center mb-4 shadow-lg"><CheckCircle2 size={32} /></div>
                   <h4 className="text-white font-black text-base font-noto mb-1">অনুরোধ পাঠানো হয়েছে!</h4>
                   <p className="text-green-400/80 text-[11px] font-bold">অ্যাডমিন এটি অ্যাপ্রুভ করলে ক্রেডিট যোগ হবে।</p>
                </div>
             ) : (
                <form onSubmit={handleRechargeRequest} className="space-y-4">
                   <div>
                      <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1 mb-1 block">{lang === 'bn' ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'}</label>
                      <input required type="number" className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-black text-sm focus:bg-white/20 transition-all" placeholder="যেমন: ৫০০" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1 mb-1 block">{lang === 'bn' ? 'বিকাশ নম্বর' : 'bKash Mobile Number'}</label>
                      <div className="relative">
                         <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                         <input required type="tel" maxLength={11} className="w-full pl-11 pr-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-black text-sm focus:bg-white/20 transition-all" placeholder="017XXXXXXXX" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value.replace(/\D/g, ''))} />
                      </div>
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1 mb-1 block">{t('trx_id', lang)}</label>
                      <div className="relative">
                         <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                         <input required type="text" className="w-full pl-11 pr-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-black text-sm focus:bg-white/20 transition-all uppercase" placeholder="TRX12345678" value={trxId} onChange={(e) => setTrxId(e.target.value)} />
                      </div>
                   </div>
                   <button type="submit" disabled={recharging} className="w-full py-5 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-base">
                      {recharging ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> {lang === 'bn' ? 'অনুরোধ পাঠান' : 'Submit Request'}</>}
                   </button>
                </form>
             )}
          </div>

          <div className="space-y-3">
             <h3 className="text-[11px] font-black text-white/50 uppercase tracking-widest px-2">{t('history', lang)}</h3>
             {recentTrans.length > 0 ? recentTrans.map(tr => (
                <div key={tr.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between animate-in slide-in-from-left duration-500">
                   <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-white truncate">{tr.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[9px] text-white/40 font-black uppercase">{new Date(tr.created_at).toLocaleDateString()}</span>
                         <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            tr.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            tr.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 shadow-inner animate-pulse' : 'bg-red-500/20 text-red-400'
                         }`}>{t(tr.status || 'approved', lang)}</span>
                      </div>
                   </div>
                   <div className="text-right">
                      {tr.sms_count ? <span className="text-xs font-black text-green-400 block">+{tr.sms_count} SMS</span> : null}
                      <span className={`text-[10px] font-bold text-white/40 block`}>{tr.amount} ৳</span>
                   </div>
                </div>
             )) : (
                <div className="text-center py-10 opacity-40"><p className="text-white text-xs">{t('no_transactions', lang)}</p></div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSMS;
