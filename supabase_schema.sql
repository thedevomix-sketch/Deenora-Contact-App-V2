
-- ... (existing tables) ...

-- ৬. শিক্ষক (Teacher) টেবিল
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    login_code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{"can_manage_students": true, "can_manage_classes": false, "can_send_sms": false}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS সচল করা
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.madrasahs ENABLE ROW LEVEL SECURITY;

-- পলিসি ১: মাদরাসা অ্যাডমিন তার নিজের শিক্ষক ম্যানেজ করতে পারবেন
DROP POLICY IF EXISTS "Admins can manage their own teachers" ON public.teachers;
CREATE POLICY "Admins can manage their own teachers" ON public.teachers
    FOR ALL USING (madrasah_id = auth.uid());

-- পলিসি ২: শিক্ষক লগইনের সময় ডাটা খুঁজে পেতে পাবলিক রিড পারমিশন (শুধুমাত্র সিলেক্টিভ)
DROP POLICY IF EXISTS "Allow teacher login check" ON public.teachers;
CREATE POLICY "Allow teacher login check" ON public.teachers
    FOR SELECT TO anon
    USING (is_active = true);

-- পলিসি ৩: মাদরাসা টেবিল থেকে নাম ও লোগো শিক্ষক দেখতে পারবেন
DROP POLICY IF EXISTS "Allow public to see madrasah basic info" ON public.madrasahs;
CREATE POLICY "Allow public to see madrasah basic info" ON public.madrasahs
    FOR SELECT TO anon
    USING (is_active = true);

-- পলিসি ৪: অ্যাডমিন নিজের প্রোফাইল ম্যানেজ করতে পারবেন
DROP POLICY IF EXISTS "Admins can manage own profile" ON public.madrasahs;
CREATE POLICY "Admins can manage own profile" ON public.madrasahs
    FOR ALL USING (id = auth.uid());
