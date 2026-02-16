
-- ১. মাদরাসা টেবিলে RLS এনাবল করা
ALTER TABLE IF EXISTS public.madrasahs ENABLE ROW LEVEL SECURITY;

-- ২. প্রোফাইল পড়ার এবং আপডেট করার পলিসি (নিজের ডাটা নিজে দেখা)
DROP POLICY IF EXISTS "Users can view their own madrasah" ON public.madrasahs;
CREATE POLICY "Users can view their own madrasah" ON public.madrasahs 
FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own madrasah" ON public.madrasahs;
CREATE POLICY "Users can update their own madrasah" ON public.madrasahs 
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ৩. অটোমেটিক প্রোফাইল ক্রিয়েশন ট্রিগার (Auth ইউজার তৈরি হলে প্রোফাইল তৈরি হবে)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.madrasahs (id, name, is_active, is_super_admin, sms_balance)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'New Madrasah'), true, false, 0);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ট্রিগার সেটআপ
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ৪. বাল্ক এসএমএস এবং ব্যালেন্স কমানোর RPC ফাংশন
DROP FUNCTION IF EXISTS public.send_bulk_sms_rpc(UUID, UUID[], TEXT);
CREATE OR REPLACE FUNCTION public.send_bulk_sms_rpc(
    p_madrasah_id UUID,
    p_student_ids UUID[],
    p_message TEXT
) RETURNS JSONB AS $$
DECLARE
    v_balance INTEGER;
    v_count INTEGER;
BEGIN
    SELECT sms_balance INTO v_balance FROM public.madrasahs WHERE id = p_madrasah_id;
    v_count := array_length(p_student_ids, 1);
    IF v_balance IS NULL OR v_balance < v_count THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;
    UPDATE public.madrasahs SET sms_balance = sms_balance - v_count WHERE id = p_madrasah_id;
    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
