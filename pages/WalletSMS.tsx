
import React, { useState, useEffect } from 'react';
import { Wallet, MessageSquare, Plus, Trash2, CreditCard, History, Loader2, Check, AlertCircle, Phone, Send, Hash } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
import { SMSTemplate, Language, Madrasah, Transaction } from '../types';
import { t } from '../translations';

interface WalletSMSProps {
  lang: Language;
  madrasah: Madrasah | null;
  triggerRefresh: () => void;
}

const WalletSMS: React.FC<WalletSMSProps> = ({ lang, madrasah, triggerRefresh }) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'recharge'>('templates');
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [saving, setSaving] = useState(false);

  // Recharge State
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [trxId, setTrxId] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [recentTrans, setRecentTrans] = useState<Transaction[]>([]);

  useEffect(() => { 
    if (activeTab === 'templates') fetchTemplates(); 
    if (activeTab === 'recharge') fetchRecentTransactions();
  }, [activeTab]);

  const fetchTemplates = async () => {
    setLoading(true);
    const cached = offlineApi.getCache('sms_templates');
    if (cached) setTemplates(cached);

    if (navigator.onLine) {
      try {
        const { data } = await supabase.from('sms_templates').select('*').order('created_at', { ascending: false });
        if (data) {
          setTemplates(data);
          offlineApi.setCache('sms_templates', data);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    } else { setLoading(false); }
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

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(lang === 'bn' ? 'ইউজার লগইন নেই' : 'Auth user not found');

      if (!madrasah) throw new Error(lang === 'bn' ? 'মাদরাসা প্রোফাইল লোড হয়নি' : 'Madrasah profile not loaded');

      const payload = { madrasah_id: user.id, title: newTitle.trim(), body: newBody.trim() };

      if (navigator.onLine) {
        await supabase.from('sms_templates').insert(payload);
      } else {
        offlineApi.queueAction('sms_templates', 'INSERT', payload);
      }

      setShowModal(false);
      setNewTitle('');
      setNewBody('');
      fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    } finally { setSaving(false); }
  };

  const handleRechargeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargeAmount || !trxId || !madrasah) return;
    
    setRecharging(true);
    try {
      const { error } = await supabase.from('transactions').insert({
        madrasah_id: madrasah.id,
        amount: parseFloat(rechargeAmount),
        transaction_id: trxId.trim(),
        type: 'credit',
        status: 'pending',
        description: `Manual Recharge Request via TrxID: ${trxId}`
      });

      if (error) throw error;
      
      setRechargeAmount('');
      setTrxId('');
      alert(lang === 'bn' ? 'অনুরোধ পাঠানো হয়েছে। অনুমোদনের জন্য অপেক্ষা করুন।' : 'Request sent. Please wait for approval.');
      fetchRecentTransactions();
    } catch (err: any) {
      alert(err.message);
    } finally { setRecharging(false); }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm(t('confirm_delete', lang))) return;
    try {
      if (navigator.onLine) {
        await supabase.from('sms_templates').delete().eq('id', id);
      } else {
        offlineApi.queueAction('sms_templates', 'DELETE', { id });
      }
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex bg-white/10 p-1.5 rounded-3xl border border-white/20 backdrop-blur-xl">
        <button onClick={() => setActiveTab('templates')} className={`flex-1 py-3.5 rounded-[1.4rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'templates' ? 'bg-white text-[#d35132] shadow-xl' : 'text-white/60 hover:text-white'}`}>
          <MessageSquare size={16} /> {t('templates', lang)}
        </button>
        <button onClick={() => setActiveTab('recharge')} className={`flex-1 py-3.5 rounded-[1.4rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'recharge' ? 'bg-white text-[#d35132] shadow-xl' : 'text-white/60 hover:text-white'}`}>
          <CreditCard size={16} /> {t('recharge', lang)}
        </button>
      </div>

      {activeTab === 'templates' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-black text-white font-noto tracking-tight">{lang === 'bn' ? 'সংরক্ষিত টেমপ্লেট' : 'Saved Templates'}</h2>
            <button onClick={() => setShowModal(true)} className="bg-white text-[#d35132] p-2.5 rounded-xl shadow-xl active:scale-95 transition-all">
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
                <div key={tmp.id} className="bg-white/10 backdrop-blur-md p-5 rounded-[2rem] border border-white/15 animate-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-black text-white text-base font-noto">{tmp.title}</h4>
                    <button onClick={() => deleteTemplate(tmp.id)} className="text-white/30 hover:text-red-400 p-1 transition-colors"><Trash2 size={16} /></button>
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
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-[#d35132]/5 rounded-full -mr-16 -mt-16"></div>
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('balance', lang)}</p>
             <h3 className="text-4xl font-black text-[#d35132] flex items-baseline gap-2">{madrasah?.balance || 0} <span className="text-lg font-bold">৳</span></h3>
          </div>

          {/* Recharge Request Form */}
          <div className="bg-white/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/20 shadow-xl space-y-4">
             <h3 className="text-lg font-black text-white font-noto px-1">{t('recharge_request', lang)}</h3>
             <form onSubmit={handleRechargeRequest} className="space-y-4">
                <div>
                   <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1 mb-1 block">{t('amount', lang)}</label>
                   <div className="relative">
                      <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                      <input 
                         required 
                         type="number" 
                         className="w-full pl-11 pr-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-bold text-sm focus:bg-white/20 transition-all" 
                         placeholder="500" 
                         value={rechargeAmount}
                         onChange={(e) => setRechargeAmount(e.target.value)}
                      />
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1 mb-1 block">{t('trx_id', lang)}</label>
                   <div className="relative">
                      <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                      <input 
                         required 
                         type="text" 
                         className="w-full pl-11 pr-5 py-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-white font-bold text-sm focus:bg-white/20 transition-all" 
                         placeholder="TRX12345678" 
                         value={trxId}
                         onChange={(e) => setTrxId(e.target.value)}
                      />
                   </div>
                </div>
                <button type="submit" disabled={recharging} className="w-full py-4 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                   {recharging ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> {lang === 'bn' ? 'অনুরোধ পাঠান' : 'Submit Request'}</>}
                </button>
             </form>
          </div>

          {/* Recent Transactions */}
          <div className="space-y-3">
             <h3 className="text-[11px] font-black text-white/50 uppercase tracking-widest px-2">{t('history', lang)}</h3>
             {recentTrans.length > 0 ? recentTrans.map(tr => (
                <div key={tr.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                   <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-white truncate">{tr.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[9px] text-white/40 font-black uppercase">{new Date(tr.created_at).toLocaleDateString()}</span>
                         <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            tr.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            tr.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                         }`}>
                            {t(tr.status || 'approved', lang)}
                         </span>
                      </div>
                   </div>
                   <span className={`text-sm font-black ${tr.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                      {tr.type === 'credit' ? '+' : '-'}{tr.amount}
                   </span>
                </div>
             )) : (
                <div className="text-center py-10 opacity-40">
                   <p className="text-white text-xs">{t('no_transactions', lang)}</p>
                </div>
             )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[150] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-[#d35132] w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-white/20 animate-in zoom-in-95 relative">
              <h2 className="text-xl font-black text-white mb-6 text-center font-noto">{t('new_template', lang)}</h2>
              <form onSubmit={handleSaveTemplate} className="space-y-5">
                 <div>
                   <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block mb-2 px-1">{t('template_title', lang)}</label>
                   <input required className="w-full px-5 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white outline-none font-bold text-sm focus:bg-white/20 transition-all" placeholder={lang === 'bn' ? 'যেমন: অনুপস্থিত' : 'e.g. Absent Alert'} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block mb-2 px-1">{t('template_body', lang)}</label>
                   <textarea required className="w-full h-32 px-5 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white outline-none font-bold text-sm focus:bg-white/20 transition-all resize-none" placeholder={lang === 'bn' ? 'আজ আপনার সন্তান মাদরাসায় অনুপস্থিত...' : 'Your child is absent today...'} value={newBody} onChange={(e) => setNewBody(e.target.value)} />
                 </div>
                 <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white/10 text-white font-black text-sm rounded-2xl border border-white/10">{t('cancel', lang)}</button>
                    <button type="submit" disabled={saving} className="flex-1 py-4 bg-white text-[#d35132] font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="animate-spin" size={18} /> : t('save', lang)}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default WalletSMS;
