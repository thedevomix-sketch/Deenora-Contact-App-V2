
import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, Send, ChevronDown, BookOpen, Users, CheckCircle2, MessageSquare, Plus, Edit3, Trash2, Smartphone, X, Check, Sparkles, LayoutList, History, Zap, AlertTriangle, IndianRupee } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'templates' | 'bulk-sms' | 'recharge'>('bulk-sms');
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

  // Recharge Form States
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeTrx, setRechargeTrx] = useState('');
  const [rechargePhone, setRechargePhone] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

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

  const handleRechargeRequest = async () => {
    if (!rechargeAmount || !rechargeTrx || !madrasah) return;
    setRequesting(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        madrasah_id: madrasah.id,
        amount: parseInt(rechargeAmount),
        transaction_id: rechargeTrx.trim().toUpperCase(),
        sender_phone: rechargePhone.trim(),
        description: 'SMS Recharge Request',
        type: 'credit',
        status: 'pending'
      });
      if (error) throw error;
      setRequestSuccess(true);
      setRechargeAmount('');
      setRechargeTrx('');
      setRechargePhone('');
      setTimeout(() => setRequestSuccess(false), 5000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRequesting(false);
    }
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
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      {/* Tab Navigation */}
      <div className="relative p-1.5 bg-white/10 backdrop-blur-3xl rounded-[3rem] border border-white/20 shadow-xl flex items-center h-16 mb-2">
        <div 
          className="absolute h-[calc(100%-12px)] rounded-[2.5rem] bg-white shadow-md transition-all duration-500 z-0"
          style={{ 
            width: 'calc((100% - 12px) / 3)',
            left: activeTab === 'templates' ? '6px' : activeTab === 'bulk-sms' ? 'calc(6px + (100% - 12px) / 3)' : 'calc(6px + 2 * (100% - 12px) / 3)',
          }}
        />
        {(['templates', 'bulk-sms', 'recharge'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`relative flex-1 h-full rounded-[2.5rem] font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all z-10 ${activeTab === tab ? 'text-[#8D30F4]' : 'text-white/70'}`}
          >
            {tab === 'templates' && <MessageSquare size={16} />}
            {tab === 'bulk-sms' && <Send size={16} />}
            {tab === 'recharge' && <CreditCard size={16} />}
            <span className="font-noto">
              {tab === 'templates' ? t('templates', lang) : tab === 'bulk-sms' ? t('bulk_sms', lang) : t('recharge', lang)}
            </span>
          </button>
        ))}
      </div>

      {activeTab === 'bulk-sms' && (
        <div className="space-y-5 animate-in slide-in-from-bottom-5">
          <div className="bg-gradient-to-br from-[#8D30F4] to-[#A179FF] p-6 rounded-[2.2rem] shadow-xl border border-white/20 flex items-center justify-between text-white overflow-hidden relative">
             <div className="relative z-10">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Available SMS Balance</p>
               <h3 className="text-4xl font-black flex items-baseline gap-2">
                 {madrasah?.sms_balance || 0}
                 <span className="text-xs opacity-60 font-noto tracking-normal">টি এসএমএস</span>
               </h3>
             </div>
             <Zap size={40} className="text-white opacity-20" />
          </div>

          <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl border border-white/50 space-y-7">
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <Users size={16} className="text-[#8D30F4]" />
                <h4 className="text-[11px] font-black text-[#2E0B5E] uppercase tracking-widest">১. অডিয়েন্স নির্বাচন</h4>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowClassDropdown(!showClassDropdown)}
                  className="w-full h-[60px] px-6 rounded-[1.5rem] border-2 bg-slate-50 border-slate-100 transition-all flex items-center justify-between"
                >
                  <span className="text-base font-black font-noto text-[#2E0B5E]">{getSelectedClassName()}</span>
                  <ChevronDown className={`text-slate-300 transition-all ${showClassDropdown ? 'rotate-180' : ''}`} size={20} />
                </button>
                {showClassDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] shadow-2xl border border-slate-100 z-[100] p-2 max-h-60 overflow-y-auto">
                    {classes.map(cls => (
                      <button key={cls.id} onClick={() => { setSelectedClassId(cls.id); setShowClassDropdown(false); }} className={`w-full text-left px-5 py-3.5 rounded-xl mb-1 ${selectedClassId === cls.id ? 'bg-[#8D30F4] text-white' : 'hover:bg-slate-50 text-[#2E0B5E]'}`}>
                        <span className="font-black font-noto">{cls.class_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <MessageSquare size={16} className="text-[#8D30F4]" />
                <h4 className="text-[11px] font-black text-[#2E0B5E] uppercase tracking-widest">২. মেসেজ কম্পোজ করুন</h4>
              </div>
              <textarea 
                className="w-full h-32 px-5 py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] text-[#2E0B5E] font-bold outline-none focus:border-[#8D30F4]/20 transition-all font-noto resize-none" 
                placeholder="আপনার মেসেজ এখানে লিখুন..." 
                value={bulkMessage} 
                onChange={(e) => setBulkMessage(e.target.value)} 
                maxLength={160} 
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={handleSendBulk} 
                disabled={sendingBulk || !bulkMessage.trim() || !selectedClassId} 
                className="w-full h-[64px] premium-btn text-white font-black rounded-full shadow-lg flex items-center justify-center gap-3 text-lg disabled:opacity-40"
              >
                {sendingBulk ? <Loader2 className="animate-spin" size={24} /> : bulkSuccess ? 'পাঠানো হয়েছে' : 'বাল্ক এসএমএস পাঠান'}
              </button>
              <button 
                onClick={handleSendNativeBulk} 
                disabled={sendingBulk || !bulkMessage.trim() || !selectedClassId} 
                className="w-full h-[48px] bg-slate-800 text-white font-black rounded-full flex items-center justify-center gap-2 text-sm disabled:opacity-40"
              >
                <Smartphone size={18} /> SIM SMS (FREE)
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-5 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between px-3">
            <h2 className="text-[20px] font-black text-white font-noto">মেসেজ টেমপ্লেট</h2>
            <button onClick={() => { setEditingId(null); setTempTitle(''); setTempBody(''); setShowAddModal(true); }} className="w-12 h-12 bg-white text-[#8D30F4] rounded-[1.2rem] shadow-xl flex items-center justify-center active:scale-90 transition-all">
              <Plus size={24} strokeWidth={3} />
            </button>
          </div>
          
          <div className="space-y-4">
            {templates.map(tmp => (
              <div key={tmp.id} className="bg-white/95 p-5 rounded-[2rem] border border-white shadow-lg flex flex-col gap-3">
                <div className="flex items-center justify-between">
                   <h3 className="font-black text-[#2E0B5E] font-noto">{tmp.title}</h3>
                   <div className="flex gap-2">
                     <button onClick={() => { setEditingId(tmp.id); setTempTitle(tmp.title); setTempBody(tmp.body); setShowAddModal(true); }} className="p-2 bg-slate-50 text-slate-400 rounded-lg"><Edit3 size={14} /></button>
                     <button onClick={() => setShowDeleteTemplateConfirm(tmp.id)} className="p-2 bg-red-50 text-red-300 rounded-lg"><Trash2 size={14} /></button>
                   </div>
                </div>
                <p className="text-[13px] text-slate-500 font-bold font-noto">{tmp.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'recharge' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
           <div className="bg-white/95 p-8 rounded-[3rem] shadow-2xl border border-white space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 bg-[#8D30F4]/10 rounded-2xl text-[#8D30F4] mb-2"><CreditCard size={32} /></div>
                <h3 className="text-xl font-black text-[#2E0B5E]">রিচার্জ অনুরোধ</h3>
                <p className="text-xs font-bold text-slate-400 font-noto">নিচের নম্বরে বিকাশ/নগদ সেন্ড মানি করে রিকোয়েস্ট পাঠান</p>
              </div>

              <div className="bg-[#F2EBFF] p-5 rounded-[2rem] text-center border border-[#8D30F4]/10">
                <p className="text-[9px] font-black text-[#8D30F4] uppercase tracking-widest mb-1">Payment Number (bKash/Nagad)</p>
                <h3 className="text-2xl font-black text-[#2E0B5E]">০১৭৬৬-XXXXXX</h3>
              </div>

              <div className="space-y-4">
                {requestSuccess && (
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-3 text-green-600 text-sm font-black animate-in slide-in-from-top-2">
                     <CheckCircle2 size={20} /> রিকোয়েস্ট সফল হয়েছে! অ্যাডমিন এপ্রুভ করলে SMS যোগ হবে।
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">পরিমাণ (BDT)</label>
                  <input type="number" className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-full font-black text-lg outline-none focus:border-[#8D30F4]/20" placeholder="0.00" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">বিকাশ/নগদ নম্বর</label>
                  <input type="tel" className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-full font-black text-lg outline-none focus:border-[#8D30F4]/20" placeholder="017XXXXXXXX" value={rechargePhone} onChange={(e) => setRechargePhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">ট্রানজ্যাকশন আইডি (TrxID)</label>
                  <input type="text" className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-full font-black text-lg outline-none focus:border-[#8D30F4]/20 uppercase" placeholder="8X23M1..." value={rechargeTrx} onChange={(e) => setRechargeTrx(e.target.value)} />
                </div>
                <button onClick={handleRechargeRequest} disabled={requesting || !rechargeAmount || !rechargeTrx} className="w-full h-16 premium-btn text-white font-black rounded-full shadow-xl flex items-center justify-center gap-3 text-lg disabled:opacity-40 mt-4">
                  {requesting ? <Loader2 className="animate-spin" size={24} /> : 'রিচার্জ রিকোয়েস্ট পাঠান'}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Template Modal and Delete confirmation remained the same as previous version but kept for context */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[500] flex items-center justify-center p-8">
           <div className="bg-white w-full max-w-md rounded-[2.8rem] p-8 shadow-2xl relative">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-[#8D30F4] transition-all"><X size={26} /></button>
              <h2 className="text-xl font-black text-[#2E0B5E] mb-8 font-noto">মেসেজ টেমপ্লেট</h2>
              <div className="space-y-6">
                <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black" placeholder="টেমপ্লেট নাম" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} />
                <textarea className="w-full h-32 px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" placeholder="মেসেজ টেক্সট" value={tempBody} onChange={(e) => setTempBody(e.target.value)} />
                <button onClick={handleSaveTemplate} disabled={isSaving} className="w-full py-5 premium-btn text-white font-black rounded-2xl flex items-center justify-center gap-3">
                  {isSaving ? <Loader2 className="animate-spin" size={24} /> : 'টেমপ্লেট সেভ করুন'}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default WalletSMS;
