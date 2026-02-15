
-- ... (পূর্বের পলিসিগুলো থাকবে) ...

-- ৩. রিসেন্ট কল (Recent Calls) টেবিলের জন্য রিড ও রাইট পারমিশন
DROP POLICY IF EXISTS "Allow teachers to read recent calls" ON public.recent_calls;
CREATE POLICY "Allow teachers to read recent calls" ON public.recent_calls
    FOR SELECT TO anon
    USING (true);

DROP POLICY IF EXISTS "Allow anyone to insert recent calls" ON public.recent_calls;
CREATE POLICY "Allow anyone to insert recent calls" ON public.recent_calls
    FOR INSERT TO anon
    WITH CHECK (true);

-- ৪. ট্রানজ্যাকশন (Transactions) টেবিলের জন্য রাইট পারমিশন (রিচার্জ রিকোয়েস্টের জন্য)
DROP POLICY IF EXISTS "Allow users to insert transaction requests" ON public.transactions;
CREATE POLICY "Allow users to insert transaction requests" ON public.transactions
    FOR INSERT TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to read own transactions" ON public.transactions;
CREATE POLICY "Allow users to read own transactions" ON public.transactions
    FOR SELECT TO anon
    USING (true);

-- ৫. স্টুডেন্ট টেবিলের জন্য আপডেট পারমিশন (যদি শিক্ষককে এডিট পারমিশন দেওয়া হয়)
DROP POLICY IF EXISTS "Allow updates to students" ON public.students;
CREATE POLICY "Allow updates to students" ON public.students
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);
