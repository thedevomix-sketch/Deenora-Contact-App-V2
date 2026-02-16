
-- ১. মাদরাসা টেবিল তৈরি (যদি না থাকে)
CREATE TABLE IF NOT EXISTS public.madrasahs (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'নতুন মাদরাসা',
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

-- ২. RLS এনাবল করা
ALTER TABLE public.madrasahs ENABLE ROW LEVEL SECURITY;

-- ৩. পলিসি সেটআপ (যাতে ইউজাররা তাদের ডাটা দেখতে পারে)
DROP POLICY IF EXISTS "Users can view their own madrasah" ON public.madrasahs;
CREATE POLICY "Users can view their own madrasah" ON public.madrasahs 
FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own madrasah" ON public.madrasahs;
CREATE POLICY "Users can update their own madrasah" ON public.madrasahs 
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ৪. নতুন ইউজার সিঙ্ক ফাংশন
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.madrasahs (id, name, is_active)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'নতুন মাদরাসা'), true)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ট্রিগার সেটআপ
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
