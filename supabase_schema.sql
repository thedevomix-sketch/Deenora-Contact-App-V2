
-- ১. parent_id কলাম যোগ করা (যাতে বোঝা যায় কে কার আন্ডারে মাদরাসা তৈরি করেছে)
ALTER TABLE public.madrasahs 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.madrasahs(id) ON DELETE SET NULL;

-- ২. নতুন মাদরাসা ইনসার্ট হলে অটোমেটিক Auth User তৈরি করার ফাংশন
-- এটি অ্যাডমিনকে অন্য ইউজার ক্রিয়েট করতে সাহায্য করবে সেশন রিফ্রেশ করা ছাড়াই
CREATE OR REPLACE FUNCTION public.handle_new_madrasah_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- যদি ইমেইল এবং লগইন কোড থাকে তবেই Auth এ ইউজার তৈরি হবে
  IF NEW.email IS NOT NULL AND NEW.login_code IS NOT NULL THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token)
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
      ''
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ট্রিগার তৈরি
DROP TRIGGER IF EXISTS on_madrasah_created ON public.madrasahs;
CREATE TRIGGER on_madrasah_created
  AFTER INSERT ON public.madrasahs
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_madrasah_auth();

-- ৩. পলিসি আপডেট: অ্যাডমিন যাতে তার তৈরি করা মাদরাসা দেখতে পারে
DROP POLICY IF EXISTS "Admins can view their created madrasahs" ON public.madrasahs;
CREATE POLICY "Admins can view their created madrasahs" ON public.madrasahs
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR parent_id = auth.uid() OR is_super_admin = true);

DROP POLICY IF EXISTS "Admins can insert new madrasahs" ON public.madrasahs;
CREATE POLICY "Admins can insert new madrasahs" ON public.madrasahs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ৪. Transactions টেবিলের জন্য সুপার অ্যাডমিন পলিসি
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage all transactions" ON public.transactions;
CREATE POLICY "Super admins can manage all transactions" ON public.transactions
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.madrasahs 
        WHERE id = auth.uid() AND is_super_admin = true
      )
    );

DROP POLICY IF EXISTS "Madrasahs can view their own transactions" ON public.transactions;
CREATE POLICY "Madrasahs can view their own transactions" ON public.transactions
    FOR SELECT TO authenticated
    USING (madrasah_id = auth.uid());

-- ৫. Admin SMS Stock টেবিলের জন্য পলিসি
ALTER TABLE public.admin_sms_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage admin stock" ON public.admin_sms_stock;
CREATE POLICY "Super admins can manage admin stock" ON public.admin_sms_stock
    FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.madrasahs 
        WHERE id = auth.uid() AND is_super_admin = true
      )
    );

DROP POLICY IF EXISTS "Authenticated can view admin stock" ON public.admin_sms_stock;
CREATE POLICY "Authenticated can view admin stock" ON public.admin_sms_stock
    FOR SELECT TO authenticated
    USING (true);
