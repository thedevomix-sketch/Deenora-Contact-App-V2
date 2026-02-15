
-- ======================================================
-- MADRASAH CONTACT APP COMPLETE SCHEMA (V23 - BALANCE FIX)
-- ======================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- মাদরাসা প্রোফাইল টেবিল
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

-- স্টক ট্র্যাকিং টেবিল (এক রো এর টেবিল)
CREATE TABLE IF NOT EXISTS public.admin_sms_stock (
    id UUID DEFAULT '00000000-0000-0000-0000-000000000001' PRIMARY KEY,
    remaining_sms INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- স্টক রো নিশ্চিত করা
INSERT INTO public.admin_sms_stock (id, remaining_sms) 
SELECT '00000000-0000-0000-0000-000000000001', 0 
WHERE NOT EXISTS (SELECT 1 FROM public.admin_sms_stock);

-- আরপিসি: বাল্ক এসএমএস (ব্যালেন্স কমানোর লজিকসহ)
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
    
    -- ১. বর্তমান ব্যালেন্স চেক
    SELECT COALESCE(sms_balance, 0) INTO v_balance 
    FROM public.madrasahs 
    WHERE id = p_madrasah_id;
    
    IF v_balance IS NULL OR v_balance < v_sms_count THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient SMS balance');
    END IF;

    -- ২. মাদরাসার ব্যালেন্স কমানো (নিশ্চিতভাবে)
    UPDATE public.madrasahs 
    SET sms_balance = sms_balance - v_sms_count 
    WHERE id = p_madrasah_id;

    -- ৩. অ্যাডমিন স্টক কমানো (নিশ্চিতভাবে)
    UPDATE public.admin_sms_stock 
    SET remaining_sms = remaining_sms - v_sms_count,
        updated_at = now();

    -- ৪. লগ ইনসার্ট করা
    INSERT INTO public.sms_logs (madrasah_id, recipient_phone, message, status)
    SELECT p_madrasah_id, guardian_phone, p_message, 'sent'
    FROM public.students
    WHERE id = ANY(p_student_ids);

    RETURN json_build_object('success', true, 'count', v_sms_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- আরপিসি: পেমেন্ট অ্যাপ্রুভ এবং ব্যালেন্স অ্যাড
CREATE OR REPLACE FUNCTION public.approve_payment_with_sms(
  t_id UUID,
  m_id UUID,
  sms_to_give INTEGER
) RETURNS JSON AS $$
BEGIN
    -- ট্রানজ্যাকশন স্ট্যাটাস আপডেট
    UPDATE public.transactions SET status = 'approved' WHERE id = t_id;
    
    -- মাদরাসা ব্যালেন্স বৃদ্ধি
    UPDATE public.madrasahs 
    SET sms_balance = COALESCE(sms_balance, 0) + sms_to_give 
    WHERE id = m_id;
    
    -- অ্যাডমিন স্টক আপডেট (যদি রিচার্জ বাইরে থেকে কেনা হয়ে থাকে)
    -- এখানে স্টক কমানোর লজিক নির্ভর করে আপনার সিস্টেম অ্যাডমিন কীভাবে স্টক ম্যানেজ করেন তার ওপর।
    -- যদি অ্যাডমিনের কেনা স্টক থেকে মাদরাসাকে দেওয়া হয় তবে বিয়োগ হবে:
    UPDATE public.admin_sms_stock 
    SET remaining_sms = remaining_sms - sms_to_give 
    WHERE id IS NOT NULL;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
