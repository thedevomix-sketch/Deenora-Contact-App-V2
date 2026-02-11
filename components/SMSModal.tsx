
import React, { useState } from 'react';
import { X, Send, MessageSquare, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { t } from '../translations';
import { Language, Student, Madrasah } from '../types';
import { supabase } from '../supabase';

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

  // Use the logic requested: calculate cost
  const totalCost = students.length * SMS_COST_PER_MSG;
  const isBulk = students.length > 1;

  const handleSend = async () => {
    if (!message.trim()) return;
    if (students.length === 0) return;

    setSending(true);
    try {
      // 1. Calculate cost via Backend Function (RPC) for validation
      const { data: validatedCost, error: calcError } = await supabase.rpc('calculate_bulk_sms_cost', {
        total_numbers: students.length,
        per_sms_rate: SMS_COST_PER_MSG
      });

      if (calcError) throw calcError;

      // 2. Process Billing via Backend Function (Atomic Check & Deduct)
      const { data: billingResult, error: billingError } = await supabase.rpc('process_sms_billing', {
        m_id: madrasah.id,
        total_cost: validatedCost,
        campaign_reason: `Bulk SMS to ${students.length} students: ${message.substring(0, 20)}...`
      });

      if (billingError) throw billingError;
      if (!billingResult.success) {
        setStatus('error');
        setErrorMsg(billingResult.error === 'Insufficient balance' ? t('insufficient_balance', lang) : billingResult.error);
        setSending(false);
        return;
      }

      // 3. Trigger SMS Gateway (Simulated)
      // In a real production app, this would be a call to an external API like Twilio/BulksmsBD
      // Or a Supabase Edge Function that handles the HTTP request securely.
      console.log(`Sending SMS to ${students.length} numbers via Gateway...`);
      
      // 4. Log Individual SMS Records
      const { error: logError } = await supabase.from('sms_logs').insert(
        students.map(s => ({
          madrasah_id: madrasah.id,
          student_id: s.id,
          recipient_phone: s.guardian_phone,
          message: message,
          cost: SMS_COST_PER_MSG,
          status: 'sent'
        }))
      );

      if (logError) console.error("Log Error:", logError);

      setStatus('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || (lang === 'bn' ? 'এসএমএস পাঠানো ব্যর্থ হয়েছে' : 'SMS sending failed'));
    } finally {
      setSending(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in zoom-in-95">
        <div className="bg-white rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-2xl border border-green-100">
           <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} />
           </div>
           <h2 className="text-2xl font-black text-slate-800 mb-2 font-noto">{t('sms_success', lang)}</h2>
           <p className="text-slate-500 font-bold">{lang === 'bn' ? 'ধন্যবাদ' : 'Thank you'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-[#e57d4a] w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-white/30 animate-in zoom-in-95 relative overflow-hidden">
        <button onClick={onClose} className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shadow-inner">
            <MessageSquare size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white font-noto leading-tight">
              {isBulk ? t('bulk_sms', lang) : t('send_sms', lang)}
            </h2>
            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-0.5">
              {students.length} {t('students_count', lang)}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <textarea
              className="w-full h-32 px-5 py-4 bg-white/15 border border-white/25 rounded-2xl outline-none text-white placeholder:text-white/40 font-bold text-sm focus:bg-white/25 transition-all resize-none shadow-inner"
              placeholder={lang === 'bn' ? 'আপনার বার্তা এখানে লিখুন...' : 'Type your message here...'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={160}
            ></textarea>
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                {message.length} / 160
              </span>
              <div className="flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                <span className="text-[9px] font-black text-white/60 uppercase">{t('sms_cost', lang)}:</span>
                <span className="text-[10px] font-black text-white">{totalCost.toFixed(2)} ৳</span>
              </div>
            </div>
          </div>

          {status === 'error' && (
            <div className="bg-red-500/20 border border-red-500/40 p-3 rounded-xl flex items-center gap-3 text-white text-xs font-bold animate-shake">
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="w-full py-4 bg-white text-[#d35132] font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? <Loader2 className="animate-spin" size={20} /> : <><Send size={18} /> {t('send_sms', lang)}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SMSModal;
