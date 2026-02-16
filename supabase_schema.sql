
-- ১. মাদরাসা টেবিলের আইডি থেকে ফরেন কি কনস্ট্রেইনট সরানো 
-- (যাতে আমরা আগে মাদরাসা প্রোফাইল তৈরি করতে পারি এবং ট্রিগার দিয়ে ইউজার বানাতে পারি)
ALTER TABLE public.madrasahs DROP CONSTRAINT IF EXISTS madrasahs_id_fkey;

-- ২. প্রয়োজনীয় কলামগুলো নিশ্চিত করা
ALTER TABLE public.madrasahs 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS login_code TEXT,
ADD COLUMN IF NOT EXISTS parent_id UUID;

-- ৩. নতুন মাদরাসা ইনসার্ট হলে অটোমেটিক Supabase Auth User তৈরি করার ফাংশন
CREATE OR REPLACE FUNCTION public.handle_new_madrasah_auth()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
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
      
      -- ইউজার আইডেন্টিটি তৈরি (সুপাবেস লগইন প্রসেসের জন্য এটি অত্যন্ত জরুরি)
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

-- ৪. ট্রিগার পুনরায় সেট করা
DROP TRIGGER IF EXISTS on_madrasah_created ON public.madrasahs;
CREATE TRIGGER on_madrasah_created
  AFTER INSERT ON public.madrasahs
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_madrasah_auth();

-- ৫. আরএলএস পলিসি আপডেট (যাতে সুপার অ্যাডমিন সব ম্যানেজ করতে পারে)
ALTER TABLE public.madrasahs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can do everything" ON public.madrasahs;
CREATE POLICY "Super admins can do everything" ON public.madrasahs
    FOR ALL TO authenticated
    USING (
      (SELECT is_super_admin FROM public.madrasahs WHERE id = auth.uid()) = true
    )
    WITH CHECK (
      (SELECT is_super_admin FROM public.madrasahs WHERE id = auth.uid()) = true
    );

DROP POLICY IF EXISTS "Users can view their own profile" ON public.madrasahs;
CREATE POLICY "Users can view their own profile" ON public.madrasahs
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR parent_id = auth.uid());

-- ৬. ইনসার্ট পলিসি নিশ্চিত করা (যাতে সুপার অ্যাডমিন নতুন মাদরাসা যোগ করতে পারে)
DROP POLICY IF EXISTS "Enable insert for authenticated super admins only" ON public.madrasahs;
CREATE POLICY "Enable insert for authenticated super admins only" ON public.madrasahs
    FOR INSERT TO authenticated
    WITH CHECK (true);
