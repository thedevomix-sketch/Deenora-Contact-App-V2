
-- ======================================================
-- MADRASAH CONTACT APP COMPLETE SCHEMA (V12 - ADMIN ACCESS FIX)
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
    -- REVE SMS Columns for Masking
    reve_api_key TEXT,
    reve_secret_key TEXT,
    reve_caller_id TEXT,
    reve_client_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.madrasahs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select for validation" ON public.madrasahs FOR SELECT USING (true);
CREATE POLICY "Allow individual update" ON public.madrasahs FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super Admin Full Access" ON public.madrasahs FOR ALL USING (
    (SELECT is_super_admin FROM public.madrasahs WHERE id = auth.uid()) = true
);

-- ২. ক্লাস টেবিল
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    class_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own classes" ON public.classes FOR SELECT USING (auth.uid() = madrasah_id);
CREATE POLICY "Users can manage own classes" ON public.classes FOR ALL USING (auth.uid() = madrasah_id);
CREATE POLICY "Super Admin View All Classes" ON public.classes FOR SELECT USING (
    (SELECT is_super_admin FROM public.madrasahs WHERE id = auth.uid()) = true
);

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

CREATE POLICY "Users can see own students" ON public.students FOR SELECT USING (auth.uid() = madrasah_id);
CREATE POLICY "Users can manage own students" ON public.students FOR ALL USING (auth.uid() = madrasah_id);
CREATE POLICY "Super Admin View All Students" ON public.students FOR SELECT USING (
    (SELECT is_super_admin FROM public.madrasahs WHERE id = auth.uid()) = true
);

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

CREATE POLICY "Users can see own transactions" ON public.transactions FOR SELECT USING (auth.uid() = madrasah_id);
CREATE POLICY "Users can request recharge" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = madrasah_id);
CREATE POLICY "Super Admin Manage Transactions" ON public.transactions FOR ALL USING (
    (SELECT is_super_admin FROM public.madrasahs WHERE id = auth.uid()) = true
);

-- ৫. এসএমএস টেমপ্লেট ও লগ (RLS Enabled)
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Template access" ON public.sms_templates FOR ALL USING (auth.uid() = madrasah_id);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs access" ON public.sms_logs FOR ALL USING (auth.uid() = madrasah_id);

-- ৬. অ্যাডমিন এসএমএস স্টক টেবিল
CREATE TABLE IF NOT EXISTS public.admin_sms_stock (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    remaining_sms INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
    SELECT sms_balance INTO v_balance FROM public.madrasahs WHERE id = p_madrasah_id;
    
    IF v_balance IS NULL OR v_balance < v_sms_count THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient SMS balance');
    END IF;

    UPDATE public.madrasahs 
    SET sms_balance = sms_balance - v_sms_count 
    WHERE id = p_madrasah_id;

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
