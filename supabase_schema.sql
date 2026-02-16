
-- ১. মাদরাসা টেবিল নিশ্চিত করা
CREATE TABLE IF NOT EXISTS public.madrasahs (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'অ্যাডমিন মাদরাসা',
    phone TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_super_admin BOOLEAN DEFAULT false,
    sms_balance INTEGER DEFAULT 0,
    reve_api_key TEXT,
    reve_secret_key TEXT,
    reve_caller_id TEXT,
    reve_client_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ২. আপনার নতুন ইউজারের জন্য ম্যানুয়ালি প্রোফাইল রেকর্ড তৈরি করা
-- এটি আপনার দেওয়া UUID কে সুপার অ্যাডমিন হিসেবে সেট করবে
INSERT INTO public.madrasahs (id, name, is_super_admin, is_active, sms_balance)
VALUES ('2310a484-0df2-479d-bd43-54c964c27d65', 'Super Admin', true, true, 99999)
ON CONFLICT (id) DO UPDATE SET is_super_admin = true, is_active = true;

-- ৩. RLS পলিসি সমুহ (সবার জন্য রিড এক্সেস নিশ্চিত করা যাতে ডাটা শো করে)
ALTER TABLE public.madrasahs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access" ON public.madrasahs;
CREATE POLICY "Public Read Access" ON public.madrasahs 
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.madrasahs;
CREATE POLICY "Users can update own profile" ON public.madrasahs 
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ৪. অটোমেটিক প্রোফাইল ক্রিয়েশন ট্রিগার (ভবিষ্যতের জন্য)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.madrasahs (id, name, is_active)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'নতুন মাদরাসা'), true)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
