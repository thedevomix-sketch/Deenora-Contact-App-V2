
import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, Send, ChevronDown, BookOpen, Users, CheckCircle2, MessageSquare, Plus, Edit3, Trash2, Smartphone, X, Check, History, Zap, AlertTriangle } from 'lucide-react';
import { supabase, smsApi } from '../supabase';
import { SMSTemplate, Language, Madrasah, Class, Student } from '../types';
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
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempBody, setTempBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Recharge Form States
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeTrx, setRechargeTrx] = useState('');
  const [rechargePhone, setRechargePhone] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [adminBkash, setAdminBkash] = useState('০১৭৬৬-XXXXXX');

  useEffect(() => { 
    if (activeTab === 'templates') fetchTemplates(); 
    if (activeTab === 'bulk-sms') { fetchClasses(); fetchTemplates(); }
    if (activeTab === 'recharge') fetchSystemSettings();
  }, [activeTab, madrasah?.id, dataVersion]);

  useEffect(() => {
    if (selectedClassId) fetchClassStudents(selectedClassId); else setClassStudents([]);
  }, [selectedClassId]);

  const fetchSystemSettings = async () => {
    const settings = await smsApi.getGlobalSettings();
    if (settings.bkash_number) setAdminBkash(settings.bkash_number);
  };

  const fetchClasses = async () => {
    if (!madrasah) return;
    const { data } = await supabase.from('classes').select('*').eq('madrasah_id', madrasah.id);
    if (data) setClasses(sortMadrasahClasses(data));
  };

  const fetchClassStudents = async (cid: string) => {
    const { data } = await supabase.from('students').select('*').eq('class_id', cid);
    if (data) setClassStudents(data);
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
    } finally { setSendingBulk(false); }
  };

  const getSelectedClassName = () => {
    const cls = classes.find(c => c.id === selectedClassId);
    return cls ? cls.class_name : (lang === 'bn' ? 'ক্লাস নির্বাচন করুন' : 'Select Class');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <div className="relative p-1.5 bg-white/10 backdrop-blur-3xl rounded-[3rem] border border-white/20 shadow-xl flex items-center h-16 mb-2">
        <div 
          className="absolute h-[calc(100%-12px)] rounded-[2.5rem] bg-white shadow-md transition-all duration-500 z-0"
          style={{ 
            width: 'calc((100% - 12px) / 3)',
            left: activeTab === 'templates' ? '6px' : activeTab === 'bulk-sms' ? 'calc(6px + (100% - 12px) / 3)' : 'calc(6px + 2 * (100% - 12px) / 3)',
          }}
        />
        {(['templates', 'bulk-sms', 'recharge'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`relative flex-1 h-full rounded-[2.5rem] font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all z-10 ${activeTab === tab ? 'text-[#8D30F4]' : 'text-white/70'}`}>
            {tab === 'templates' ? <MessageSquare size={16} /> : tab === 'bulk-sms' ? <Send size={16} /> : <CreditCard size={16} />}
            <span className="font-noto">{tab === 'templates' ? t('templates', lang) : tab === 'bulk-sms' ? t('bulk_sms', lang) : t('recharge', lang)}</span>
          </button>
        ))}
      </div>

      {activeTab === 'bulk-sms' && (
        <div className="space-y-5 animate-in slide-in-from-bottom-5">
          <div className="bg-gradient-to-br from-[#8D30F4] to-[#A179FF] p-6 rounded-[2.2rem] shadow-xl border border-white/20 flex items-center justify-between text-white relative">
             <div className="relative z-10">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Available SMS</p>
               <h3 className="text-4xl font-black flex items-baseline gap-2">{madrasah?.sms_balance || 0}</h3>
             </div>
             <Zap size={40} className="text-white opacity-20" />
          </div>

          <div className="bg-white/95 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl border border-white/50 space-y-7">
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-[#2E0B5E] uppercase tracking-widest px-1">১. ক্লাস নির্বাচন</h4>
              <div className="relative">
                <button onClick={() => setShowClassDropdown(!showClassDropdown)} className="w-full h-[60px] px-6 rounded-[1.5rem] border-2 bg-slate-50 border-slate-100 flex items-center justify-between">
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
              <h4 className="text-[11px] font-black text-[#2E0B5E] uppercase tracking-widest px-1">২. বার্তা লিখুন</h4>
              <textarea className="w-full h-32 px-5 py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] text-[#2E0B5E] font-bold outline-none font-noto resize-none" placeholder="বার্তা..." value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} maxLength={160} />
            </div>

            <button onClick={handleSendBulk} disabled={sendingBulk || !bulkMessage.trim() || !selectedClassId} className="w-full h-[64px] premium-btn text-white font-black rounded-full shadow-lg flex items-center justify-center gap-3 text-lg disabled:opacity-40">
              {sendingBulk ? <Loader2 className="animate-spin" size={24} /> : bulkSuccess ? 'সফল!' : 'বাল্ক এসএমএস পাঠান'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'recharge' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
           <div className="bg-white/95 p-8 rounded-[3rem] shadow-2xl border border-white space-y-6">
              <div className="text-center">
                <div className="inline-flex p-3 bg-[#8D30F4]/10 rounded-2xl text-[#8D30F4] mb-3"><CreditCard size={32} /></div>
                <h3 className="text-xl font-black text-[#2E0B5E]">রিচার্জ রিকোয়েস্ট</h3>
                <p className="text-xs font-bold text-slate-400 font-noto">বিকাশ/নগদ সেন্ড মানি করে রিকোয়েস্ট পাঠান</p>
              </div>

              <div className="bg-[#F2EBFF] p-6 rounded-[2.2rem] text-center border border-[#8D30F4]/10">
                <p className="text-[9px] font-black text-[#8D30F4] uppercase tracking-widest mb-1">bKash/Nagad Number</p>
                <h3 className="text-2xl font-black text-[#2E0B5E]">{adminBkash}</h3>
              </div>

              <div className="space-y-4">
                {requestSuccess && (
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-3 text-green-600 text-sm font-black animate-in slide-in-from-top-2">
                     <CheckCircle2 size={20} /> রিকোয়েস্ট সফল! অ্যাডমিন অনুমোদন করলে SMS যোগ হবে।
                  </div>
                )}
                <div className="space-y-1.5 px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">টাকার পরিমাণ</label>
                  <input type="number" className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-full font-black text-lg" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1.5 px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">বিকাশ নম্বর</label>
                  <input type="tel" className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-full font-black text-lg" value={rechargePhone} onChange={(e) => setRechargePhone(e.target.value)} placeholder="017XXXXXXXX" />
                </div>
                <div className="space-y-1.5 px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TrxID</label>
                  <input type="text" className="w-full h-14 px-6 bg-slate-50 border-2 border-slate-100 rounded-full font-black text-lg uppercase" value={rechargeTrx} onChange={(e) => setRechargeTrx(e.target.value)} placeholder="8X23M1..." />
                </div>
                <button onClick={handleRechargeRequest} disabled={requesting || !rechargeAmount || !rechargeTrx} className="w-full h-16 premium-btn text-white font-black rounded-full flex items-center justify-center gap-3 text-lg mt-4 disabled:opacity-40">
                  {requesting ? <Loader2 className="animate-spin" size={24} /> : 'রিকোয়েস্ট পাঠান'}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default WalletSMS;
