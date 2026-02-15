
-- ১. রিসেন্ট কল (Recent Calls) টেবিলের জন্য পলিসি
DROP POLICY IF EXISTS "Allow anyone to read recent calls" ON public.recent_calls;
CREATE POLICY "Allow anyone to read recent calls" ON public.recent_calls
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anyone to insert recent calls" ON public.recent_calls;
CREATE POLICY "Allow anyone to insert recent calls" ON public.recent_calls
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- ২. স্টুডেন্ট (Students) টেবিলের জন্য রিড পলিসি (হিস্ট্রি দেখানোর জন্য জরুরি)
DROP POLICY IF EXISTS "Allow anyone to read students" ON public.students;
CREATE POLICY "Allow anyone to read students" ON public.students
    FOR SELECT TO anon, authenticated
    USING (true);

-- ৩. ক্লাস (Classes) টেবিলের জন্য রিড পলিসি
DROP POLICY IF EXISTS "Allow anyone to read classes" ON public.classes;
CREATE POLICY "Allow anyone to read classes" ON public.classes
    FOR SELECT TO anon, authenticated
    USING (true);

-- ৪. ট্রানজ্যাকশন ও অন্যান্য (পূর্বের মতো)
DROP POLICY IF EXISTS "Allow users to insert transaction requests" ON public.transactions;
CREATE POLICY "Allow users to insert transaction requests" ON public.transactions FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to read own transactions" ON public.transactions;
CREATE POLICY "Allow users to read own transactions" ON public.transactions FOR SELECT TO anon, authenticated USING (true);
