
import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare, Loader2, AlertCircle, CheckCircle2, ChevronDown, BookOpen } from 'lucide-react';
import { t } from '../translations';
import { Language, Student, Madrasah, SMSTemplate } from '../types';
import { supabase, offlineApi } from '../supabase';

interface SMSModalProps {
  students: Student[];
  madrasah: Madrasah;
  lang: Language;
  onClose: () => void;
  onSuccess: () => void;
}

const SMS_COST_PER_MSG = 0.40;

const SMSModal: React.FC<SMSModalProps> = ({ students, madrasah, lang, onClose, onSuccess }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const cached = offlineApi.getCache('sms_templates');
    if (cached) setTemplates(cached);

    if (navigator.onLine) {
      const { data } = await supabase.from('sms_templates').select('*').order('created_at', { ascending: false });
      if (data) {
        setTemplates(data);
        offlineApi.setCache('sms_templates', data);
      }
    }
  };

  const totalCost = students.length * SMS_COST_PER_MSG;
  const isBulk = students.length > 1;

  const handleSend = async () => {
    if (!message.trim() || students.length === 0) return;

    setSending(true);
    try {
      // 1. Validate Cost & Balance via RPC
      const { data: billingResult, error: billingError } = await supabase.rpc('process_sms_billing', {
        m_id: madrasah.id,
        total_cost: totalCost,
        campaign_reason: `Campaign to ${students.length} recipients: ${message.substring(0, 20)}...`
      });

      if (billingError) throw billingError;
      if (!billingResult.success) {
        setStatus('error');
        setErrorMsg(billingResult.error === 'Insufficient balance' ? t('insufficient_balance', lang) : billingResult.error);
        setSending(false);
        return;
      }

      // 2. TODO: SMS Gateway API Call Integration
      // example: fetch('https://api.bulksmsbd.com/sms', { method: 'POST', body: ... })
      console.log(`Sending to numbers: ${students.map(s => s.guardian_phone).join(',')}`);
      console.log(`Message: ${message}`);

      // 3. Log Records
      await supabase.from('sms_logs').insert(
        students.map(s => ({
          madrasah_id: madrasah.id,
          student_id: s.id,
          recipient_phone: s.guardian_phone,
          message: message,
          cost: SMS_COST_PER_MSG,
          status: 'sent'
        }))
      );

      setStatus('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || (lang === 'bn' ? 'ব্যর্থ হয়েছে' : 'Failed'));
    } finally {
      setSending(false);
    }
  };

  const selectTemplate = (tmp: SMSTemplate) => {
    setMessage(tmp.body);
    setShowTemplateDropdown(false);
  };

  if (status === 'success') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
        <div className="bg-white rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl border border-green-100">
           <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} />
           </div>
           <h2 className="text-2xl font-black text-slate-800 mb-2 font-noto">{t('sms_success', lang)}</h2>
           <p className="text-slate-400 font-bold">{lang === 'bn' ? 'সফলভাবে পাঠানো হয়েছে' : 'Sent successfully'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-[#e57d4a] w-full max-w-sm rounded-[3rem] shadow-2xl p-8 border border-white/30 animate-in zoom-in-95 relative overflow-hidden">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-white/20 rounded-[1.2rem] flex items-center justify-center text-white shadow-inner">
            <MessageSquare size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white font-noto leading-tight">
              {isBulk ? t('bulk_sms', lang) : t('send_sms', lang)}
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
               <span className="bg-white/10 px-2 py-0.5 rounded-lg text-[9px] font-black text-white/70 uppercase tracking-widest border border-white/10">
                 {students.length} Students
               </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Template Selector */}
          <div className="relative">
            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1 mb-2 block">{t('templates', lang)}</label>
            <button 
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-white/15 border border-white/20 rounded-xl text-white text-sm font-bold backdrop-blur-md active:bg-white/25 transition-all"
            >
              <div className="flex items-center gap-2 truncate">
                <BookOpen size={16} className="text-white/40" />
                <span className="truncate">{lang === 'bn' ? 'টেমপ্লেট সিলেক্ট করুন' : 'Select Template'}</span>
              </div>
              <ChevronDown size={18} className={`text-white/40 transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showTemplateDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 z-10 max-h-48 overflow-y-auto overflow-x-hidden animate-in slide-in-from-top-2">
                {templates.length > 0 ? (
                  templates.map(tmp => (
                    <button 
                      key={tmp.id} 
                      onClick={() => selectTemplate(tmp)}
                      className="w-full text-left px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <p className="text-[10px] font-black text-[#d35132] uppercase mb-0.5">{tmp.title}</p>
                      <p className="text-xs font-bold text-slate-600 truncate">{tmp.body}</p>
                    </button>
                  ))
                ) : (
                  <div className="p-5 text-center text-slate-400 text-xs font-bold">{lang === 'bn' ? 'কোনো টেমপ্লেট নেই' : 'No templates found'}</div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1 mb-2 block">{lang === 'bn' ? 'মেসেজ বক্স' : 'Message Box'}</label>
            <textarea
              className="w-full h-32 px-5 py-4 bg-white/15 border border-white/25 rounded-2xl outline-none text-white placeholder:text-white/40 font-bold text-sm focus:bg-white/25 transition-all resize-none shadow-inner"
              placeholder={lang === 'bn' ? 'আপনার বার্তা...' : 'Your message...'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={160}
            ></textarea>
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                {message.length} / 160
              </span>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                <span className="text-[9px] font-black text-white/60 uppercase">{t('sms_cost', lang)}:</span>
                <span className="text-[10px] font-black text-white">{totalCost.toFixed(2)} ৳</span>
              </div>
            </div>
          </div>

          {status === 'error' && (
            <div className="bg-red-500/20 border border-red-500/40 p-3 rounded-xl flex items-center gap-3 text-white text-[11px] font-black animate-shake">
              <AlertCircle size={14} className="shrink-0" />
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="w-full py-5 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
          >
            {sending ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> {t('send_sms', lang)}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SMSModal;
