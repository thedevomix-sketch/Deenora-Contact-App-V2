
-- ======================================================
-- MADRASAH CONTACT APP COMPLETE SCHEMA (V24 - AMBIGUITY FIX)
-- ======================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ১. মাদরাসা প্রোফাইল টেবিল
CREATE TABLE IF NOT EXISTS public.madrasahs (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'নতুন মাদরাসা',
    phone TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_super_admin BOOLEAN DEFAULT false,
    balance DECIMAL DEFAULT 0,
    sms_balance INTEGER DEFAULT 0,
    login_code TEXT,
    reve_api_key TEXT,
    reve_secret_key TEXT,
    reve_caller_id TEXT,
    reve_client_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.madrasahs ENABLE ROW LEVEL SECURITY;

-- ২. স্টক ট্র্যাকিং টেবিল (এক রো এর টেবিল)
CREATE TABLE IF NOT EXISTS public.admin_sms_stock (
    id UUID DEFAULT '00000000-0000-0000-0000-000000000001' PRIMARY KEY,
    remaining_sms INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- স্টক রো নিশ্চিত করা
INSERT INTO public.admin_sms_stock (id, remaining_sms) 
SELECT '00000000-0000-0000-0000-000000000001', 0 
WHERE NOT EXISTS (SELECT 1 FROM public.admin_sms_stock);

-- ৩. পুরনো ফাংশনগুলো ডিলেট করা (Ambiguity দূর করার জন্য এটি অত্যন্ত জরুরি)
DROP FUNCTION IF EXISTS public.send_bulk_sms_rpc(UUID, TEXT, UUID[]);
DROP FUNCTION IF EXISTS public.send_bulk_sms_rpc(UUID, UUID[], TEXT);

-- ৪. আরপিসি: বাল্ক এসএমএস (নতুনভাবে তৈরি)
CREATE OR REPLACE FUNCTION public.send_bulk_sms_rpc(
  p_madrasah_id UUID,
  p_student_ids UUID[],
  p_message TEXT
) RETURNS JSON AS $$
DECLARE
    v_sms_count INTEGER;
    v_balance INTEGER;
BEGIN
    v_sms_count := array_length(p_student_ids, 1);
    
    -- বর্তমান ব্যালেন্স চেক
    SELECT COALESCE(sms_balance, 0) INTO v_balance 
    FROM public.madrasahs 
    WHERE id = p_madrasah_id;
    
    IF v_balance IS NULL OR v_balance < v_sms_count THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient SMS balance');
    END IF;

    -- মাদরাসার ব্যালেন্স কমানো
    UPDATE public.madrasahs 
    SET sms_balance = sms_balance - v_sms_count 
    WHERE id = p_madrasah_id;

    -- অ্যাডমিন স্টক কমানো
    UPDATE public.admin_sms_stock 
    SET remaining_sms = remaining_sms - v_sms_count,
        updated_at = now()
    WHERE id = '00000000-0000-0000-0000-000000000001';

    -- লগ ইনসার্ট করা
    INSERT INTO public.sms_logs (madrasah_id, recipient_phone, message, status)
    SELECT p_madrasah_id, guardian_phone, p_message, 'sent'
    FROM public.students
    WHERE id = ANY(p_student_ids);

    RETURN json_build_object('success', true, 'count', v_sms_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ৫. পেমেন্ট অ্যাপ্রুভ ফাংশন
DROP FUNCTION IF EXISTS public.approve_payment_with_sms(UUID, UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.approve_payment_with_sms(
  t_id UUID,
  m_id UUID,
  sms_to_give INTEGER
) RETURNS JSON AS $$
BEGIN
    UPDATE public.transactions SET status = 'approved' WHERE id = t_id;
    
    UPDATE public.madrasahs 
    SET sms_balance = COALESCE(sms_balance, 0) + sms_to_give 
    WHERE id = m_id;
    
    UPDATE public.admin_sms_stock 
    SET remaining_sms = remaining_sms - sms_to_give 
    WHERE id = '00000000-0000-0000-0000-000000000001';
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
