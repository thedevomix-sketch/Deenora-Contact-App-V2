
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
  
  // Template Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateIdToDelete, setTemplateIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick Send State
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [quickMessage, setQuickMessage] = useState('');
  const [studentsInClass, setStudentsInClass] = useState<Student[]>([]);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);

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
    } catch (err) { console.error(err); } finally { setFetchingStudents(false); }
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

  const handleOpenTemplateModal = (tmp?: SMSTemplate) => {
    if (tmp) {
      setEditingTemplate(tmp);
      setTemplateTitle(tmp.title);
      setTemplateBody(tmp.body);
    } else {
      setEditingTemplate(null);
      setTemplateTitle('');
      setTemplateBody('');
    }
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTitle.trim() || !templateBody.trim() || !madrasah) return;

    setSavingTemplate(true);
    try {
      const payload = {
        title: templateTitle.trim(),
        body: templateBody.trim(),
        madrasah_id: madrasah.id
      };

      if (navigator.onLine) {
        if (editingTemplate) {
          await supabase.from('sms_templates').update(payload).eq('id', editingTemplate.id);
        } else {
          await supabase.from('sms_templates').insert(payload);
        }
      } else {
        if (editingTemplate) {
          offlineApi.queueAction('sms_templates', 'UPDATE', { ...payload, id: editingTemplate.id });
        } else {
          offlineApi.queueAction('sms_templates', 'INSERT', payload);
        }
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

  const confirmDeleteTemplate = (id: string) => {
    setTemplateIdToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteTemplate = async () => {
    if (!templateIdToDelete) return;

    setIsDeleting(true);
    try {
      if (navigator.onLine) {
        await supabase.from('sms_templates').delete().eq('id', templateIdToDelete);
      } else {
        offlineApi.queueAction('sms_templates', 'DELETE', { id: templateIdToDelete });
      }
      offlineApi.removeCache('sms_templates');
      fetchTemplates();
      triggerRefresh();
      setShowDeleteConfirm(false);
      setTemplateIdToDelete(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchRecentTransactions = async () => {
    if (!madrasah) return;
    try {
      const { data } = await supabase.from('transactions').select('*').eq('madrasah_id', madrasah.id).order('created_at', { ascending: false }).limit(10);
      if (data) setRecentTrans(data);
    } catch (err) { console.error(err); }
  };

  const handleQuickSend = async () => {
    if (!madrasah || studentsInClass.length === 0 || !quickMessage.trim()) return;
    setSendingBulk(true);
    try {
      await smsApi.sendBulk(madrasah.id, studentsInClass, quickMessage);
      alert(lang === 'bn' ? 'এসএমএস সফলভাবে পাঠানো হয়েছে!' : 'SMS sent successfully!');
      setQuickMessage('');
      triggerRefresh();
    } catch (err: any) { 
      const msg = err.message || "Unknown Error";
      alert(lang === 'bn' ? `ব্যর্থ হয়েছে: ${msg}` : `Failed: ${msg}`);
    } finally { setSendingBulk(false); }
  };

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const template = templates.find(t => t.id === id);
    if (template) {
      setQuickMessage(template.body);
    }
  };

  const handleRechargeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!madrasah || !madrasah.id) return;
    
    setRecharging(true);
    try {
      const payload = {
        madrasah_id: madrasah.id,
        amount: parseFloat(rechargeAmount),
        transaction_id: trxId.trim().toUpperCase(),
        sender_phone: senderPhone.trim(),
        type: 'credit' as const,
        status: 'pending' as const,
        description: `bKash Payment for SMS Credits`
      };

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
      const errorMsg = err.message || "Unknown Database Error";
      alert(lang === 'bn' ? `ব্যর্থ হয়েছে: ${errorMsg}\n\n(টিপস: অনুগ্রহ করে SQL Repair Script টি রান করুন)` : `Failed: ${errorMsg}\n\nPlease run the SQL Repair Script.`);
    } finally { setRecharging(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex bg-white/10 p-1 rounded-3xl border border-white/20 backdrop-blur-xl">
        <button 
          onClick={() => setActiveTab('templates')} 
          className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'templates' ? 'bg-white text-[#d35132] shadow-lg' : 'text-white/40'}`}
        >
          <MessageSquare size={14} />
          {t('templates', lang)}
        </button>
        <button 
          onClick={() => setActiveTab('quick-send')} 
          className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'quick-send' ? 'bg-white text-[#d35132] shadow-lg' : 'text-white/40'}`}
        >
          <Send size={14} />
          {t('bulk_sms', lang)}
        </button>
        <button 
          onClick={() => setActiveTab('recharge')} 
          className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'recharge' ? 'bg-white text-[#d35132] shadow-lg' : 'text-white/40'}`}
        >
          <CreditCard size={14} />
          {t('recharge', lang)}
        </button>
      </div>

      {activeTab === 'templates' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-black text-white font-noto">{t('templates', lang)}</h2>
            <button 
              onClick={() => handleOpenTemplateModal()}
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
                <div key={tmp.id} className="bg-white/10 backdrop-blur-md p-5 rounded-[2.2rem] border border-white/15 shadow-xl group">
                   <div className="flex items-center justify-between mb-2">
                     <h3 className="font-black text-white text-base font-noto">{tmp.title}</h3>
                     <div className="flex gap-2">
                       <button 
                        onClick={() => handleOpenTemplateModal(tmp)}
                        className="p-2 bg-white/5 text-white/40 rounded-lg hover:text-white transition-colors"
                       >
                        <Edit3 size={16} />
                       </button>
                       <button 
                        onClick={() => confirmDeleteTemplate(tmp.id)}
                        className="p-2 bg-white/5 text-white/40 rounded-lg hover:text-red-400 transition-colors"
                       >
                        <Trash2 size={16} />
                       </button>
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

      {activeTab === 'quick-send' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-white/15 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 p-6 space-y-5 shadow-2xl">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">ক্লাস নির্বাচন করুন</label>
              <select 
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 text-white font-bold outline-none focus:bg-white/20 transition-all appearance-none"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="" className="text-slate-800">{t('class_choose', lang)}</option>
                {classes.map(c => <option key={c.id} value={c.id} className="text-slate-800">{c.class_name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">টেমপ্লেট নির্বাচন করুন (ঐচ্ছিক)</label>
              <select 
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-4 text-white font-bold outline-none focus:bg-white/20 transition-all appearance-none"
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
              >
                <option value="" className="text-slate-800">{lang === 'bn' ? 'টেমপ্লেট বেছে নিন' : 'Choose Template'}</option>
                {templates.map(t => <option key={t.id} value={t.id} className="text-slate-800">{t.title}</option>)}
              </select>
            </div>

            {selectedClassId && (
              <div className="animate-in fade-in zoom-in-95 bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 p-2 rounded-lg text-white"><Users size={18} /></div>
                  <span className="text-xs font-black text-white">{studentsInClass.length} Students in this class</span>
                </div>
                {fetchingStudents && <Loader2 className="animate-spin text-white/30" size={16} />}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">মেসেজ বডি</label>
              <textarea 
                className="w-full h-32 bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:bg-white/20 transition-all resize-none shadow-inner text-sm"
                placeholder="আপনার বার্তা এখানে লিখুন..."
                value={quickMessage}
                onChange={(e) => setQuickMessage(e.target.value)}
              />
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-white/30">{quickMessage.length} / 160</span>
                <span className="text-[10px] font-black text-yellow-400">Estimated Cost: {studentsInClass.length} SMS</span>
              </div>
            </div>

            <button 
              onClick={handleQuickSend}
              disabled={sendingBulk || !selectedClassId || !quickMessage.trim()}
              className="w-full py-5 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
            >
              {sendingBulk ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> {lang === 'bn' ? 'সবাইকে পাঠান' : 'Send Bulk SMS'}</>}
            </button>
          </div>
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
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                  <input type="number" required placeholder="e.g. 500" className="w-full pl-11 pr-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white font-bold outline-none focus:bg-white/20 transition-all shadow-inner" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">bKash ট্রানজ্যাকশন আইডি</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                  <input type="text" required placeholder="e.g. BKT123XYZ" className="w-full pl-11 pr-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white font-black outline-none focus:bg-white/20 transition-all uppercase shadow-inner" value={trxId} onChange={(e) => setTrxId(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">বিকাশ নম্বর (বিকাশ যেখান থেকে পাঠিয়েছেন)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                  <input type="tel" required placeholder="017XXXXXXXX" className="w-full pl-11 pr-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white font-bold outline-none focus:bg-white/20 transition-all shadow-inner" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={recharging}
                className="w-full py-5 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
              >
                {recharging ? <Loader2 className="animate-spin" size={20} /> : rechargeSuccess ? <><Check size={20} /> পেমেন্ট সাবমিট হয়েছে</> : <><Save size={18} /> রিচার্জ রিকোয়েস্ট পাঠান</>}
              </button>
            </form>
          </div>

          <div className="space-y-3">
            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2 flex items-center gap-2"><History size={12} /> Recent Recharge Requests</h2>
            {recentTrans.length > 0 ? (
              <div className="space-y-2">
                {recentTrans.map(tr => (
                  <div key={tr.id} className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/15 flex items-center justify-between shadow-lg">
                    <div className="min-w-0 pr-3">
                      <p className="text-[11px] font-black text-white truncate">{tr.transaction_id}</p>
                      <p className="text-[9px] text-white/40 font-bold mt-0.5">{new Date(tr.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-white">{tr.amount} ৳</p>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        tr.status === 'approved' ? 'bg-green-500/20 text-green-400' : 
                        tr.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {tr.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-white/20 text-[10px] font-black uppercase">No recent transactions</p>
            )}
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#e57d4a] w-full max-w-sm rounded-[3rem] shadow-2xl p-8 border border-white/30 animate-in zoom-in-95 relative overflow-hidden">
            <button 
              onClick={() => setShowTemplateModal(false)}
              className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-black text-white mb-6 font-noto">
              {editingTemplate ? t('edit_class', lang) : t('new_template', lang)}
            </h2>

            <form onSubmit={handleSaveTemplate} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">{t('template_title', lang)}</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. ছুটির নোটিশ"
                  className="w-full px-5 py-4 bg-white/15 border border-white/20 rounded-2xl text-white font-bold outline-none focus:bg-white/25 transition-all shadow-inner" 
                  value={templateTitle} 
                  onChange={(e) => setTemplateTitle(e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">{t('template_body', lang)}</label>
                <textarea 
                  required 
                  placeholder="মেসেজের মূল অংশ এখানে লিখুন..."
                  className="w-full h-40 px-5 py-4 bg-white/15 border border-white/20 rounded-2xl text-white font-medium outline-none focus:bg-white/25 transition-all resize-none shadow-inner" 
                  value={templateBody} 
                  onChange={(e) => setTemplateBody(e.target.value)} 
                />
              </div>

              <button 
                type="submit" 
                disabled={savingTemplate}
                className="w-full py-5 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
              >
                {savingTemplate ? <Loader2 className="animate-spin" size={20} /> : <><Save size={18} /> {t('save', lang)}</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center relative border border-white/20">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 font-noto">
              {t('confirm_delete', lang)}
            </h2>
            <p className="text-slate-500 text-xs font-bold mb-8 px-2">
              {lang === 'bn' ? 'আপনি কি নিশ্চিতভাবে এই টেমপ্লেটটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this template?'}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTemplateIdToDelete(null);
                }} 
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-black text-sm rounded-2xl active:scale-95 transition-all"
              > 
                {t('cancel', lang)} 
              </button>
              <button 
                onClick={handleDeleteTemplate} 
                className="flex-1 py-4 bg-red-500 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              > 
                {isDeleting ? <Loader2 className="animate-spin" size={18} /> : t('delete', lang)} 
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSMS;
