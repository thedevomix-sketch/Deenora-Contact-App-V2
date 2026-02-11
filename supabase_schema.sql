
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

-- ৫. আরএলএস পলিসি এনাবল করা
ALTER TABLE public.madrasahs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- লুপ এড়াতে সিকিউরিটি ফাংশন
CREATE OR REPLACE FUNCTION public.is_super_admin_secure()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.madrasahs 
    WHERE id = auth.uid() AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- মাদরাসা আরএলএস (Fixed Recursion)
CREATE POLICY "View own profile" ON public.madrasahs FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Super admin view all" ON public.madrasahs FOR SELECT USING (public.is_super_admin_secure());
CREATE POLICY "Update own profile" ON public.madrasahs FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Insert own profile" ON public.madrasahs FOR INSERT WITH CHECK (auth.uid() = id);

-- অন্যান্য পলিসি
CREATE POLICY "Madrasah access own rows" ON public.classes FOR ALL USING (auth.uid() = madrasah_id OR public.is_super_admin_secure());
CREATE POLICY "Madrasah access own students" ON public.students FOR ALL USING (auth.uid() = madrasah_id OR public.is_super_admin_secure());

-- ফাংশন: অ্যাডমিন ব্যালেন্স আপডেট (RPC)
CREATE OR REPLACE FUNCTION public.admin_update_balance(m_id UUID, amount_change NUMERIC, trx_desc TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.madrasahs SET balance = balance + amount_change WHERE id = m_id;
  INSERT INTO public.transactions (madrasah_id, amount, type, description, status)
  VALUES (m_id, ABS(amount_change), CASE WHEN amount_change >= 0 THEN 'credit' ELSE 'debit' END, trx_desc, 'approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
