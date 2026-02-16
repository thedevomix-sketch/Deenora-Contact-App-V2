
-- ১. প্রোফাইল তৈরির ফাংশন
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.madrasahs (id, name, is_active, is_super_admin, sms_balance)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'নতুন মাদরাসা'),
    true,
    false,
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ২. ট্রিগার তৈরি (Auth ইউজার তৈরি হলে প্রোফাইল তৈরি হবে)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ৩. আরএলএস পলিসি (যাতে ইউজার নিজের ডাটা দেখতে পারে)
ALTER TABLE public.madrasahs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.madrasahs;
CREATE POLICY "Users can view their own profile" ON public.madrasahs
    FOR SELECT TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.madrasahs;
CREATE POLICY "Users can update their own profile" ON public.madrasahs
    FOR UPDATE TO authenticated
    USING (id = auth.uid());
