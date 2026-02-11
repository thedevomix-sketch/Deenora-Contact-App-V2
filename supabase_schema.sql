
-- ১. এক্সটেনশন
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ২. মাদরাসা টেবিল
CREATE TABLE IF NOT EXISTS public.madrasahs (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'নতুন মাদরাসা',
    phone TEXT,
    logo_url TEXT,
    login_code TEXT, 
    balance NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_super_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ৩. ক্লাস টেবিল
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    class_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ৪. ছাত্র টেবিল
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    student_name TEXT NOT NULL,
    guardian_name TEXT,
    roll INTEGER,
    guardian_phone TEXT NOT NULL,
    guardian_phone_2 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ৫. এসএমএস টেমপ্লেট টেবিল
CREATE TABLE IF NOT EXISTS public.sms_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ৬. ট্রানজ্যাকশন টেবিল
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    type TEXT CHECK (type IN ('credit', 'debit')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ৭. এসএমএস লগ টেবিল
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    recipient_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    cost NUMERIC(10, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ৮. আরএলএস পলিসি
ALTER TABLE public.madrasahs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- ৯. ফাংশন: অ্যাডমিন ব্যালেন্স আপডেট (RPC)
CREATE OR REPLACE FUNCTION public.admin_update_balance(m_id UUID, amount_change NUMERIC, trx_desc TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.madrasahs SET balance = balance + amount_change WHERE id = m_id;
  INSERT INTO public.transactions (madrasah_id, amount, type, description)
  VALUES (m_id, ABS(amount_change), CASE WHEN amount_change >= 0 THEN 'credit' ELSE 'debit' END, trx_desc);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ১০. ফাংশন: বাল্ক এসএমএস কস্ট ক্যালকুলেশন
CREATE OR REPLACE FUNCTION public.calculate_bulk_sms_cost(total_numbers INTEGER, per_sms_rate NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  RETURN total_numbers * per_sms_rate;
END;
$$ LANGUAGE plpgsql;

-- ১১. ফাংশন: এসএমএস বিলিং প্রসেস
CREATE OR REPLACE FUNCTION public.process_sms_billing(m_id UUID, total_cost NUMERIC, campaign_reason TEXT)
RETURNS JSONB AS $$
DECLARE
  current_bal NUMERIC;
BEGIN
  SELECT balance INTO current_bal FROM public.madrasahs WHERE id = m_id;
  IF current_bal < total_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  UPDATE public.madrasahs SET balance = balance - total_cost WHERE id = m_id;
  INSERT INTO public.transactions (madrasah_id, amount, type, description)
  VALUES (m_id, total_cost, 'debit', campaign_reason);
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
