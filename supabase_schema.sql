
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

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- পলিসি: মাদরাসা অ্যাডমিন তার নিজের শিক্ষক দেখতে ও ম্যানেজ করতে পারবেন
CREATE POLICY "Admins can manage their own teachers" ON public.teachers
    FOR ALL USING (madrasah_id = auth.uid());
