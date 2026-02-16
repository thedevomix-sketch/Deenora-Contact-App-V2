
-- ১. মাদরাসা টেবিলের আরএলএস পলিসি আপডেট
ALTER TABLE public.madrasahs ENABLE ROW LEVEL SECURITY;

-- ২. সুপার অ্যাডমিন পলিসি (যদি থাকে)
DROP POLICY IF EXISTS "Super admins can do everything" ON public.madrasahs;
CREATE POLICY "Super admins can do everything" ON public.madrasahs
    FOR ALL TO authenticated
    USING (
      (SELECT is_super_admin FROM public.madrasahs WHERE id = auth.uid()) = true
    );

-- ৩. সাধারণ ইউজারদের জন্য পলিসি
DROP POLICY IF EXISTS "Users can view their own profile" ON public.madrasahs;
CREATE POLICY "Users can view their own profile" ON public.madrasahs
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- ৪. অপ্রয়োজনীয় ট্রিগার এবং ফাংশন মুছে ফেলা (Reverting the previous version)
DROP TRIGGER IF EXISTS on_madrasah_created ON public.madrasahs;
DROP FUNCTION IF EXISTS public.handle_new_madrasah_auth();
