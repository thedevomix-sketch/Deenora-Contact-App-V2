
import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, Send, ChevronDown, BookOpen, Users, CheckCircle2, MessageSquare, Plus, Edit3, Trash2, Smartphone, X, Check, AlertCircle } from 'lucide-react';
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
  
  // New Template States
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex bg-white/20 backdrop-blur-md p-2 rounded-[2.5rem] shadow-xl border border-white/20">
        {(['bulk-sms', 'templates', 'recharge'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} 
            className={`flex-1 py-4 rounded-[1.8rem] font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === tab ? 'bg-white text-[#8D30F4] shadow-2xl scale-105' : 'text-white/80'}`}>
            {tab === 'bulk-sms' && <Send size={16} />}
            {tab === 'templates' && <MessageSquare size={16} />}
            {tab === 'recharge' && <CreditCard size={16} />}
            {tab === 'bulk-sms' ? t('bulk_sms', lang) : tab === 'templates' ? t('templates', lang) : t('recharge', lang)}
          </button>
        ))}
      </div>

      {activeTab === 'bulk-sms' && (
        <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[3rem] shadow-[0_30px_80px_rgba(46,11,94,0.3)] border border-white/50 space-y-8 animate-in slide-in-from-bottom-5">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-[#4B168A] uppercase tracking-widest px-2">ক্লাস নির্বাচন করুন</label>
              <div className="relative">
                <select className="w-full px-6 py-5 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.5rem] text-[#2D3142] font-black text-lg outline-none focus:border-[#8D30F4] transition-all appearance-none"
                  value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                  <option value="">ক্লাস বেছে নিন</option>
                  {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.class_name}</option>)}
                </select>
                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-[#8D30F4] pointer-events-none" size={24} />
              </div>
            </div>

            {selectedClassId && (
              <div className="flex items-center gap-5 bg-[#8D30F4]/5 p-5 rounded-2xl border-2 border-[#8D30F4]/10 animate-in zoom-in-95">
                <div className="w-14 h-14 bg-[#8D30F4] rounded-[1.2rem] flex items-center justify-center text-white shadow-xl"><Users size={28} /></div>
                <div>
                  <p className="text-[11px] font-black text-[#A179FF] uppercase tracking-widest leading-none">Target Audience</p>
                  <p className="text-2xl font-black text-[#2E0B5E] mt-1.5">{loadingStudents ? '...' : classStudents.length} Students</p>
                </div>
              </div>
            )}

            <div className="space-y-2 relative">
              <label className="text-[11px] font-black text-[#4B168A] uppercase tracking-widest px-2">টেমপ্লেট বাছাই করুন</label>
              <button onClick={() => setShowTemplateDropdown(!showTemplateDropdown)} className="w-full flex items-center justify-between px-6 py-5 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.5rem] text-[#2D3142] font-black text-lg active:scale-[0.98] transition-all">
                <div className="flex items-center gap-4"><BookOpen size={24} className="text-[#8D30F4]" /><span>Select Template</span></div>
                <ChevronDown size={24} className={`text-[#8D30F4] transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showTemplateDropdown && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 z-[60] p-3 animate-in slide-in-from-top-4">
                  {templates.map(tmp => (
                    <button key={tmp.id} onClick={() => { setBulkMessage(tmp.body); setShowTemplateDropdown(false); }} className="w-full text-left px-6 py-5 rounded-2xl border-b border-slate-50 last:border-0 hover:bg-[#F2EBFF] transition-colors">
                      <p className="text-[11px] font-black text-[#8D30F4] uppercase mb-1">{tmp.title}</p>
                      <p className="text-sm font-bold text-slate-500 truncate">{tmp.body}</p>
                    </button>
                  ))}
                  {templates.length === 0 && (
                    <div className="p-8 text-center text-slate-400 font-bold text-sm">কোনো টেমপ্লেট নেই</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between px-2"><label className="text-[11px] font-black text-[#4B168A] uppercase tracking-widest">মেসেজ বক্স</label><span className="text-[11px] font-black text-[#8D30F4] uppercase">{bulkMessage.length}/160</span></div>
              <textarea className="w-full h-44 px-6 py-6 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[2.2rem] text-[#2D3142] font-black outline-none focus:border-[#8D30F4] transition-all resize-none shadow-inner leading-relaxed" placeholder="এখানে মেসেজ লিখুন..." value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} maxLength={160} />
            </div>

            <button onClick={handleSendBulk} disabled={sendingBulk || !bulkMessage.trim() || !selectedClassId} className="w-full py-6 premium-btn text-white font-black rounded-[2.2rem] shadow-[0_20px_50px_rgba(141,48,244,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-4 text-xl font-noto disabled:opacity-30">
              {sendingBulk ? <Loader2 className="animate-spin" size={28} /> : bulkSuccess ? <><CheckCircle2 size={28} /> Sent Successfully</> : <><Send size={26} /> {t('send_sms', lang)}</>}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-5 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-2xl font-black text-white font-noto drop-shadow-md">{t('templates', lang)}</h2>
            <button onClick={() => { setEditingId(null); setTempTitle(''); setTempBody(''); setShowAddModal(true); }} className="premium-btn text-white p-3.5 rounded-[1.2rem] shadow-xl border border-white/20 active:scale-95 transition-all">
              <Plus size={24} strokeWidth={4} />
            </button>
          </div>
          
          {loading ? (
             <div className="space-y-4">
               {[1, 2].map(i => <div key={i} className="h-32 bg-white/20 animate-pulse rounded-[2.8rem]"></div>)}
             </div>
          ) : templates.map(tmp => (
            <div key={tmp.id} className="bg-white/95 backdrop-blur-md p-7 rounded-[2.8rem] border border-white shadow-xl space-y-4 relative overflow-hidden group">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                 <h3 className="font-black text-[#2E0B5E] text-[20px] font-noto truncate pr-4">{tmp.title}</h3>
                 <div className="flex gap-2">
                   <button onClick={() => { setEditingId(tmp.id); setTempTitle(tmp.title); setTempBody(tmp.body); setShowAddModal(true); }} className="w-11 h-11 bg-[#F2EBFF] text-[#8D30F4] rounded-xl flex items-center justify-center border border-[#8D30F4]/10 active:scale-90 transition-all shadow-sm">
                     <Edit3 size={18} />
                   </button>
                   <button onClick={() => handleDeleteTemplate(tmp.id)} className="w-11 h-11 bg-red-50 text-red-400 rounded-xl flex items-center justify-center border border-red-100 active:scale-90 transition-all shadow-sm">
                     <Trash2 size={18} />
                   </button>
                 </div>
              </div>
              <p className="text-[15px] text-slate-600 leading-relaxed font-bold font-noto line-clamp-3">{tmp.body}</p>
            </div>
          ))}

          {templates.length === 0 && !loading && (
             <div className="py-24 text-center bg-white/10 rounded-[3rem] border-2 border-dashed border-white/30 backdrop-blur-sm">
               <p className="text-white font-black text-sm uppercase tracking-widest">No templates created</p>
             </div>
          )}
        </div>
      )}

      {activeTab === 'recharge' && (
        <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-white space-y-8 text-center animate-in slide-in-from-bottom-5">
          <div className="bg-[#8D30F4]/5 p-8 rounded-[2.5rem] border-2 border-dashed border-[#8D30F4]/20">
            <Smartphone size={40} className="mx-auto text-[#8D30F4] mb-4" />
            <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-2">Send Money (bKash/Nagad)</p>
            <h3 className="text-3xl font-black text-[#2E0B5E] tracking-tighter">017XXXXXXXX</h3>
          </div>
          <div className="space-y-6 text-left">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-[#4B168A] uppercase tracking-widest px-2">টাকার পরিমাণ</label>
              <input type="number" className="w-full px-6 py-5 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.5rem] text-[#2D3142] font-black text-xl outline-none focus:border-[#8D30F4]" placeholder="Amount (৳)" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-[#4B168A] uppercase tracking-widest px-2">TrxID</label>
              <input type="text" className="w-full px-6 py-5 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-[1.5rem] text-[#2D3142] font-black text-xl outline-none focus:border-[#8D30F4] uppercase" placeholder="8X23M1..." />
            </div>
            <button className="w-full py-6 premium-btn text-white font-black rounded-[2.2rem] shadow-2xl active:scale-[0.98] transition-all text-xl">রিচার্জ রিকোয়েস্ট পাঠান</button>
          </div>
        </div>
      )}

      {/* Add/Edit Template Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[500] flex items-center justify-center p-8 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.3)] border-2 border-[#8D30F4]/10 relative animate-in zoom-in-95">
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-slate-300 hover:text-[#8D30F4] transition-all p-1"><X size={26} strokeWidth={3} /></button>
              <h2 className="text-2xl font-black text-[#2E0B5E] mb-8 font-noto tracking-tight">
                {editingId ? 'টেমপ্লেট এডিট' : 'নতুন টেমপ্লেট'}
              </h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t('template_title', lang)}</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-4.5 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-2xl text-[#2E0B5E] font-black text-lg outline-none focus:border-[#8D30F4] transition-all" 
                    value={tempTitle} 
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="যেমন: মাসিক ফি"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t('template_body', lang)}</label>
                  <textarea 
                    className="w-full h-32 px-6 py-5 bg-[#F2EBFF] border-2 border-[#8D30F4]/10 rounded-2xl text-[#2E0B5E] font-bold text-sm outline-none focus:border-[#8D30F4] transition-all resize-none leading-relaxed" 
                    value={tempBody} 
                    onChange={(e) => setTempBody(e.target.value)}
                    placeholder="মেসেজের মূল অংশ এখানে লিখুন..."
                  />
                </div>
                
                <button 
                  onClick={handleSaveTemplate} 
                  disabled={isSaving || !tempTitle.trim() || !tempBody.trim()} 
                  className="w-full py-5 premium-btn text-white font-black rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-40"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={24} /> : <><Check size={24} strokeWidth={4} /> {t('save', lang)}</>}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default WalletSMS;
