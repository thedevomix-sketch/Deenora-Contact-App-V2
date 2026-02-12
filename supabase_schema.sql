
-- ======================================================
-- DATABASE REPAIR SCRIPT (run this in Supabase SQL Editor)
-- ======================================================

-- ১. ট্রানজ্যাকশন টেবিল কাঠামো নিশ্চিত করা
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL NOT NULL,
    type TEXT NOT NULL DEFAULT 'credit',
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ২. হারানো কলামগুলো জোরপূর্বক যোগ করা (যদি না থাকে)
DO $$ 
BEGIN 
    -- sender_phone কলাম চেক এবং অ্যাড
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='sender_phone') THEN
        ALTER TABLE public.transactions ADD COLUMN sender_phone TEXT;
    END IF;

    -- transaction_id কলাম চেক এবং অ্যাড
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='transaction_id') THEN
        ALTER TABLE public.transactions ADD COLUMN transaction_id TEXT;
    END IF;

    -- sms_count কলাম চেক এবং অ্যাড
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='sms_count') THEN
        ALTER TABLE public.transactions ADD COLUMN sms_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- ৩. আরএলএস পলিসি রিফ্রেশ
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions 
FOR INSERT WITH CHECK (auth.uid() = madrasah_id);

-- ৪. সুপাবেস ক্যাশ রিফ্রেশ (PGRST204 এরর সমাধানের জন্য)
NOTIFY pgrst, 'reload schema';
