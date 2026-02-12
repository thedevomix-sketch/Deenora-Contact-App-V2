
-- ======================================================
-- DATABASE REPAIR & INITIALIZATION SCRIPT (V3)
-- ======================================================

-- ১. স্টুডেন্ট টেবিলে 'photo_url' কলাম যোগ করা (যদি না থাকে)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='photo_url') THEN
        ALTER TABLE public.students ADD COLUMN photo_url TEXT;
    END IF;
END $$;

-- ২. একই ক্লাসে রোল নম্বর ইউনিক করার জন্য কনস্ট্রেইন যোগ করা
-- এটি নিশ্চিত করবে যে এক ক্লাসে একই রোল দুইজনের হবে না
-- দ্রষ্টব্য: যদি আগে থেকেই ডুপ্লিকেট ডাটা থাকে তবে এই কমান্ডটি এরর দিবে। 
-- সেক্ষেত্রে আগে ডুপ্লিকেট ডাটা ডিলিট বা এডিট করতে হবে।
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_roll_per_class') THEN
        ALTER TABLE public.students ADD CONSTRAINT unique_roll_per_class UNIQUE (class_id, roll);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN others THEN 
        RAISE NOTICE 'Could not add unique constraint. Please check for existing duplicate rolls in your classes.';
END $$;

-- ৩. স্টোরেজ বাকেট এবং পলিসি
INSERT INTO storage.buckets (id, name, public)
VALUES ('madrasah-assets', 'madrasah-assets', true)
ON CONFLICT (id) DO NOTHING;

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

-- ৫. সুপাবেস ক্যাশ রিফ্রেশ
NOTIFY pgrst, 'reload schema';
