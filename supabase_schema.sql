
-- ১. মাদরাসা টেবিল আপডেট (sms_balance যোগ করা হয়েছে)
ALTER TABLE public.madrasahs ADD COLUMN IF NOT EXISTS sms_balance INTEGER DEFAULT 0;

-- ২. ট্রানজ্যাকশন টেবিল আপডেট (sms_count যোগ করা হয়েছে)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sms_count INTEGER DEFAULT 0;

-- ৩. এসএমএস স্টক টেবিল
CREATE TABLE IF NOT EXISTS public.admin_sms_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    remaining_sms INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ৪. এসএমএস লগ টেবিল (Update: Ensure student_id exists)
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE SET NULL;

-- ৫. এসএমএস টেমপ্লেট টেবিল (New: Added for template feature)
CREATE TABLE IF NOT EXISTS public.sms_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ৬. পেমেন্ট এপ্রুভাল এবং এসএমএস ক্রেডিট করার ফাংশন
CREATE OR REPLACE FUNCTION public.approve_payment_with_sms(
    t_id UUID, 
    m_id UUID, 
    sms_to_give INTEGER
)
RETURNS VOID AS $$
DECLARE
    admin_stock_id UUID;
BEGIN
    UPDATE public.transactions 
    SET status = 'approved', sms_count = sms_to_give 
    WHERE id = t_id;

    UPDATE public.madrasahs 
    SET sms_balance = sms_balance + sms_to_give 
    WHERE id = m_id;

    SELECT id INTO admin_stock_id FROM public.admin_sms_stock LIMIT 1;
    UPDATE public.admin_sms_stock 
    SET remaining_sms = remaining_sms - sms_to_give, 
        updated_at = now() 
    WHERE id = admin_stock_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ৭. এসএমএস বিলিং ফাংশন (Internal Helper)
CREATE OR REPLACE FUNCTION public.process_sms_billing_credits(
    m_id UUID, 
    sms_needed INTEGER, 
    campaign_reason TEXT
)
RETURNS JSON AS $$
DECLARE
    current_bal INTEGER;
BEGIN
    SELECT sms_balance INTO current_bal FROM public.madrasahs WHERE id = m_id;
    
    IF current_bal < sms_needed THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient SMS balance');
    END IF;

    UPDATE public.madrasahs SET sms_balance = sms_balance - sms_needed WHERE id = m_id;
    
    INSERT INTO public.transactions (madrasah_id, amount, type, description, status, sms_count)
    VALUES (m_id, 0, 'debit', campaign_reason, 'approved', sms_needed);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ৮. নিউ ব্যাকএন্ড ফাংশন: সেন্ড বাল্ক এসএমএস (Consolidated RPC)
CREATE OR REPLACE FUNCTION public.send_bulk_sms_rpc(
    p_madrasah_id UUID,
    p_student_ids UUID[],
    p_message TEXT
)
RETURNS JSON AS $$
DECLARE
    v_sms_count INTEGER;
    v_billing_result JSON;
    v_student_record RECORD;
BEGIN
    v_sms_count := array_length(p_student_ids, 1);
    
    v_billing_result := public.process_sms_billing_credits(
        p_madrasah_id, 
        v_sms_count, 
        'Bulk SMS to ' || v_sms_count || ' recipients'
    );
    
    IF NOT (v_billing_result->>'success')::BOOLEAN THEN
        RETURN v_billing_result;
    END IF;

    FOR v_student_record IN 
        SELECT id, guardian_phone FROM public.students WHERE id = ANY(p_student_ids)
    LOOP
        INSERT INTO public.sms_logs (madrasah_id, student_id, recipient_phone, message, cost, status)
        VALUES (p_madrasah_id, v_student_record.id, v_student_record.guardian_phone, p_message, 1, 'sent');
    END LOOP;

    RETURN json_build_object('success', true, 'count', v_sms_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ৯. আরএলএস পলিসি (sms_templates এর জন্য)
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Madrasah access own templates" ON public.sms_templates FOR ALL USING (auth.uid() = madrasah_id);
