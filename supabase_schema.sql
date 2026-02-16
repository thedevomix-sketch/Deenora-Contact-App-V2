
-- ১. প্রয়োজনীয় কলামগুলো চেক করে যুক্ত করা (যদি না থাকে)
ALTER TABLE public.madrasahs 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS login_code TEXT,
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.madrasahs(id) ON DELETE SET NULL;

-- ২. নতুন মাদরাসা ইনসার্ট হলে অটোমেটিক Supabase Auth User তৈরি করার ফাংশন
-- এটি অ্যাডমিনের সেশন নষ্ট না করে নতুন একাউন্ট তৈরি নিশ্চিত করবে
CREATE OR REPLACE FUNCTION public.handle_new_madrasah_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- যদি ইমেইল এবং লগইন কোড থাকে তবেই Auth এ ইউজার তৈরি হবে
  IF NEW.email IS NOT NULL AND NEW.login_code IS NOT NULL THEN
    -- চেক করা হচ্ছে ইউজার অলরেডি আছে কি না
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = NEW.email) THEN
      INSERT INTO auth.users (
        id, 
        email, 
        encrypted_password, 
        email_confirmed_at, 
        raw_app_meta_data, 
        raw_user_meta_data, 
        created_at, 
        updated_at, 
        role, 
        aud,
        confirmation_token
      )
      VALUES (
        NEW.id,
        NEW.email,
        crypt(NEW.login_code, gen_salt('bf')), -- লগইন কোড পাসওয়ার্ড হিসেবে ব্যবহৃত হবে
        now(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('name', NEW.name),
        now(),
        now(),
        'authenticated',
        'authenticated',
        ''
      );
      
      -- ইউজার আইডেন্টিটি তৈরি (সুপাবেস সঠিক লগইন নিশ্চিত করার জন্য এটি প্রয়োজন)
      INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        NEW.id,
        jsonb_build_object('sub', NEW.id, 'email', NEW.email),
        'email',
        now(),
        now(),
        now()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ৩. ট্রিগার পুনরায় সেট করা
DROP TRIGGER IF EXISTS on_madrasah_created ON public.madrasahs;
CREATE TRIGGER on_madrasah_created
  AFTER INSERT ON public.madrasahs
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_madrasah_auth();

-- ৪. আরএলএস পলিসি রিফ্রেশ (যাতে অ্যাডমিন তার ইনসার্ট করা ডাটা দেখতে পায়)
ALTER TABLE public.madrasahs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage madrasahs" ON public.madrasahs;
CREATE POLICY "Admins can manage madrasahs" ON public.madrasahs
    FOR ALL TO authenticated
    USING (id = auth.uid() OR parent_id = auth.uid() OR is_super_admin = true);

-- ৫. সুপাবেস ক্যাশ রিফ্রেশ করার জন্য কমান্ড (dashboard এ রান করলে কাজ করবে)
-- NOTIFY pgrst, 'reload schema';
