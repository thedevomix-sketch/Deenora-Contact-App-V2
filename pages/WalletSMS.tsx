
import React, { useState, useEffect } from 'react';
import { Wallet, MessageSquare, Plus, Trash2, CreditCard, History, Loader2, Check, AlertCircle, Phone } from 'lucide-react';
import { supabase, offlineApi } from '../supabase';
import { SMSTemplate, Language, Madrasah } from '../types';
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

  useEffect(() => { if (activeTab === 'templates') fetchTemplates(); }, [activeTab]);

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

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(lang === 'bn' ? 'ইউজার লগইন নেই' : 'Auth user not found');

      // Check if madrasah profile exists
      if (!madrasah) throw new Error(lang === 'bn' ? 'মাদরাসা প্রোফাইল লোড হয়নি, কিছুক্ষণ পর চেষ্টা করুন' : 'Madrasah profile not loaded yet');

      const payload = { madrasah_id: user.id, title: newTitle.trim(), body: newBody.trim() };

      if (navigator.onLine) {
        const { error } = await supabase.from('sms_templates').insert(payload);
        if (error) {
          console.error("Template save error:", error);
          throw new Error(error.message);
        }
      } else {
        offlineApi.queueAction('sms_templates', 'INSERT', payload);
      }

      setShowModal(false);
      setNewTitle('');
      setNewBody('');
      fetchTemplates();
    } catch (err: any) {
      alert(lang === 'bn' ? `টেমপ্লেট সেভ করা যায়নি: ${err.message}` : `Save failed: ${err.message}`);
    } finally { setSaving(false); }
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
             <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                   <Check className="text-green-500" size={16} />
                   <span className="text-xs font-bold">{lang === 'bn' ? 'লাইফটাইম মেয়াদ' : 'Lifetime Validity'}</span>
                </div>
                <button className="text-[#d35132] text-xs font-black uppercase tracking-wider flex items-center gap-1.5"><History size={14} /> {t('history', lang)}</button>
             </div>
          </div>
          <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5 text-center">
             <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white/60"><Phone size={24} /></div>
             <p className="text-white text-sm font-bold font-noto mb-2">{lang === 'bn' ? 'রিচার্জ করতে সমস্যা হচ্ছে?' : 'Need help with recharge?'}</p>
             <a href="tel:01700000000" className="inline-block py-3 px-8 bg-white text-[#d35132] font-black rounded-xl shadow-lg text-sm">01700000000</a>
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
