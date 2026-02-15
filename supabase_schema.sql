
-- ======================================================
-- MADRASAH CONTACT APP COMPLETE SCHEMA (V17 - ROBUST FIX)
-- ======================================================

-- Enable UUID extension
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

-- সিকিউরিটি ডিফাইনার ফাংশন
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.madrasahs 
    WHERE id = user_id AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Madrasahs Policies
DROP POLICY IF EXISTS "madrasah_select_policy" ON public.madrasahs;
DROP POLICY IF EXISTS "madrasah_update_own" ON public.madrasahs;
DROP POLICY IF EXISTS "madrasah_admin_policy" ON public.madrasahs;

CREATE POLICY "madrasah_select_policy" ON public.madrasahs FOR SELECT USING (true);
CREATE POLICY "madrasah_update_own" ON public.madrasahs FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "madrasah_admin_policy" ON public.madrasahs FOR ALL USING (public.is_admin(auth.uid()));

-- ২. ক্লাস টেবিল
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    class_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_select_policy" ON public.classes;
DROP POLICY IF EXISTS "class_manage_policy" ON public.classes;

CREATE POLICY "class_select_policy" ON public.classes FOR SELECT USING (auth.uid() = madrasah_id OR public.is_admin(auth.uid()));
CREATE POLICY "class_manage_policy" ON public.classes FOR ALL USING (auth.uid() = madrasah_id OR public.is_admin(auth.uid()));

-- ৩. স্টুডেন্ট টেবিল
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    student_name TEXT NOT NULL,
    guardian_name TEXT,
    roll INTEGER,
    guardian_phone TEXT NOT NULL,
    guardian_phone_2 TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_roll_per_class UNIQUE (class_id, roll)
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_select_policy" ON public.students;
DROP POLICY IF EXISTS "student_manage_policy" ON public.students;

CREATE POLICY "student_select_policy" ON public.students FOR SELECT USING (auth.uid() = madrasah_id OR public.is_admin(auth.uid()));
CREATE POLICY "student_manage_policy" ON public.students FOR ALL USING (auth.uid() = madrasah_id OR public.is_admin(auth.uid()));

-- ৪. ট্রানজ্যাকশন টেবিল
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL NOT NULL,
    type TEXT NOT NULL DEFAULT 'credit',
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT,
    sender_phone TEXT,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trans_select_policy" ON public.transactions;
DROP POLICY IF EXISTS "trans_insert_policy" ON public.transactions;
DROP POLICY IF EXISTS "trans_admin_policy" ON public.transactions;

CREATE POLICY "trans_select_policy" ON public.transactions FOR SELECT USING (auth.uid() = madrasah_id OR public.is_admin(auth.uid()));
CREATE POLICY "trans_insert_policy" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = madrasah_id);
CREATE POLICY "trans_admin_policy" ON public.transactions FOR ALL USING (public.is_admin(auth.uid()));

-- ৫. এসএমএস টেমপ্লেট ও লগ
CREATE TABLE IF NOT EXISTS public.sms_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    recipient_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "template_policy" ON public.sms_templates;
DROP POLICY IF EXISTS "logs_policy" ON public.sms_logs;

CREATE POLICY "template_policy" ON public.sms_templates FOR ALL USING (auth.uid() = madrasah_id OR public.is_admin(auth.uid()));
CREATE POLICY "logs_policy" ON public.sms_logs FOR ALL USING (auth.uid() = madrasah_id OR public.is_admin(auth.uid()));

-- ৬. অ্যাডমিন এসএমএস স্টক টেবিল
CREATE TABLE IF NOT EXISTS public.admin_sms_stock (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    remaining_sms INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.admin_sms_stock (remaining_sms) 
SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM public.admin_sms_stock);

-- ৭. সিস্টেম সেটিংস টেবিল
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    reve_api_key TEXT,
    reve_secret_key TEXT,
    reve_caller_id TEXT,
    reve_client_id TEXT,
    bkash_number TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO public.system_settings (id, bkash_number) 
SELECT '00000000-0000-0000-0000-000000000001', '017XXXXXXXX' 
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE id = '00000000-0000-0000-0000-000000000001');

-- ৮. বাল্ক এসএমএস আরপিসি
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
    
    -- ইউজার ব্যালেন্স চেক
    SELECT COALESCE(sms_balance, 0) INTO v_balance FROM public.madrasahs WHERE id = p_madrasah_id;
    
    IF v_balance < v_sms_count THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient SMS balance');
    END IF;

    -- ১. ইউজারের ব্যালেন্স কমানো
    UPDATE public.madrasahs 
    SET sms_balance = COALESCE(sms_balance, 0) - v_sms_count 
    WHERE id = p_madrasah_id;

    -- ২. অ্যাডমিন স্টক থেকেও কমানো
    UPDATE public.admin_sms_stock 
    SET remaining_sms = COALESCE(remaining_sms, 0) - v_sms_count 
    WHERE id IS NOT NULL;

    -- ৩. লগ ইনসার্ট করা
    INSERT INTO public.sms_logs (madrasah_id, recipient_phone, message, status)
    SELECT p_madrasah_id, guardian_phone, p_message, 'sent'
    FROM public.students
    WHERE id = ANY(p_student_ids);

    RETURN json_build_object('success', true, 'count', v_sms_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ৯. পেমেন্ট এপ্রুভাল আরপিসি
CREATE OR REPLACE FUNCTION public.approve_payment_with_sms(
  t_id UUID,
  m_id UUID,
  sms_to_give INTEGER
) RETURNS JSON AS $$
BEGIN
    UPDATE public.transactions SET status = 'approved' WHERE id = t_id;
    UPDATE public.madrasahs SET sms_balance = COALESCE(sms_balance, 0) + sms_to_give WHERE id = m_id;
    UPDATE public.admin_sms_stock SET remaining_sms = COALESCE(remaining_sms, 0) - sms_to_give WHERE id IS NOT NULL;
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
