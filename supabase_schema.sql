
-- ১. মাদরাসা টেবিল নিশ্চিত করা
CREATE TABLE IF NOT EXISTS public.madrasahs (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name TEXT NOT NULL,
    phone TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_super_admin BOOLEAN DEFAULT false,
    balance DECIMAL DEFAULT 0,
    sms_balance INTEGER DEFAULT 0,
    email TEXT,
    login_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ২. ট্রানজ্যাকশন টেবিল কাঠামো নিশ্চিত করা
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL NOT NULL,
    type TEXT NOT NULL DEFAULT 'credit',
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- অত্যন্ত গুরুত্বপূর্ণ: বিদ্যমান টেবিলে হারানো কলামগুলো যোগ করা
-- এই অংশটি PGRST204 এরর সমাধান করবে
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='sender_phone') THEN
        ALTER TABLE public.transactions ADD COLUMN sender_phone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='transaction_id') THEN
        ALTER TABLE public.transactions ADD COLUMN transaction_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='sms_count') THEN
        ALTER TABLE public.transactions ADD COLUMN sms_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- ৩. আরএলএস পলিসি (transactions)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Super admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Super admins can update all transactions" ON public.transactions;

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = madrasah_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = madrasah_id);
CREATE POLICY "Super admins can view all transactions" ON public.transactions FOR SELECT USING (EXISTS (SELECT 1 FROM public.madrasahs WHERE id = auth.uid() AND is_super_admin = true));
CREATE POLICY "Super admins can update all transactions" ON public.transactions FOR UPDATE USING (EXISTS (SELECT 1 FROM public.madrasahs WHERE id = auth.uid() AND is_super_admin = true));
