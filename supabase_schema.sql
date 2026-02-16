
-- ১. মাদরাসা টেবিলে এসএমএস ব্যালেন্স কলাম নিশ্চিত করা
ALTER TABLE IF EXISTS public.madrasahs 
ADD COLUMN IF NOT EXISTS sms_balance INTEGER DEFAULT 0;

-- ২. রিসেন্ট কল টেবিল তৈরি
CREATE TABLE IF NOT EXISTS public.recent_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    called_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ৩. বাল্ক এসএমএস এবং ব্যালেন্স কমানোর RPC ফাংশন
-- এরর এড়াতে আগের ফাংশনটি থাকলে ডিলিট করে নেওয়া হচ্ছে
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
    -- বর্তমান ব্যালেন্স চেক
    SELECT sms_balance INTO v_balance FROM public.madrasahs WHERE id = p_madrasah_id;
    v_count := array_length(p_student_ids, 1);

    IF v_balance IS NULL OR v_balance < v_count THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- ব্যালেন্স আপডেট
    UPDATE public.madrasahs 
    SET sms_balance = sms_balance - v_count 
    WHERE id = p_madrasah_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ৪. RLS পলিসি সমুহ
ALTER TABLE public.recent_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- পলিসি রিফ্রেশ
DROP POLICY IF EXISTS "Allow anyone to read recent calls" ON public.recent_calls;
CREATE POLICY "Allow anyone to read recent calls" ON public.recent_calls FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anyone to insert recent calls" ON public.recent_calls;
CREATE POLICY "Allow anyone to insert recent calls" ON public.recent_calls FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anyone to read students" ON public.students;
CREATE POLICY "Allow anyone to read students" ON public.students FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anyone to read classes" ON public.classes;
CREATE POLICY "Allow anyone to read classes" ON public.classes FOR SELECT TO anon, authenticated USING (true);
