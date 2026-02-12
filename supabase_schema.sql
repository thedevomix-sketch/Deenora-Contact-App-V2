
-- ======================================================
-- DATABASE REPAIR & INITIALIZATION SCRIPT (V2)
-- ======================================================

-- ১. স্টুডেন্ট টেবিলে 'photo_url' কলাম যোগ করা (যদি না থাকে)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='photo_url') THEN
        ALTER TABLE public.students ADD COLUMN photo_url TEXT;
    END IF;
END $$;

-- ২. স্টোরেজ বাকেট (Bucket) তৈরি করা
-- এটি ছবি আপলোড করার জন্য প্রয়োজনীয়
INSERT INTO storage.buckets (id, name, public)
VALUES ('madrasah-assets', 'madrasah-assets', true)
ON CONFLICT (id) DO NOTHING;

-- ৩. স্টোরেজ পলিসি (যাতে সবাই ছবি দেখতে পারে এবং এডমিন আপলোড করতে পারে)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'madrasah-assets');

DROP POLICY IF EXISTS "Authenticated Users Can Upload" ON storage.objects;
CREATE POLICY "Authenticated Users Can Upload" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'madrasah-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Users Can Update" ON storage.objects;
CREATE POLICY "Authenticated Users Can Update" ON storage.objects 
FOR UPDATE USING (bucket_id = 'madrasah-assets' AND auth.role() = 'authenticated');

-- ৪. ট্রানজ্যাকশন টেবিল ঠিক করা
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL NOT NULL,
    type TEXT NOT NULL DEFAULT 'credit',
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT,
    sender_phone TEXT,
    transaction_id TEXT,
    sms_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ৫. হারানো কলামগুলো চেক করে যোগ করা
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='sender_phone') THEN
        ALTER TABLE public.transactions ADD COLUMN sender_phone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='transaction_id') THEN
        ALTER TABLE public.transactions ADD COLUMN transaction_id TEXT;
    END IF;
END $$;

-- ৬. সুপাবেস ক্যাশ রিফ্রেশ
NOTIFY pgrst, 'reload schema';
