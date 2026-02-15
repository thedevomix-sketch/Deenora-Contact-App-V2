
-- ... (পূর্বের টেবিলগুলো অপরিবর্তিত থাকবে) ...

-- ১. ক্লাস (Classes) টেবিলের জন্য রিড পারমিশন (শিক্ষকদের জন্য)
DROP POLICY IF EXISTS "Allow teachers to read classes" ON public.classes;
CREATE POLICY "Allow teachers to read classes" ON public.classes
    FOR SELECT TO anon
    USING (true); -- অ্যাপ লেভেলে মাদরাসা আইডি দিয়ে ফিল্টার করা হচ্ছে

-- ২. ছাত্র (Students) টেবিলের জন্য রিড পারমিশন (শিক্ষকদের জন্য)
DROP POLICY IF EXISTS "Allow teachers to read students" ON public.students;
CREATE POLICY "Allow teachers to read students" ON public.students
    FOR SELECT TO anon
    USING (true);

-- ৩. রিসেন্ট কল (Recent Calls) টেবিলের জন্য রিড পারমিশন
DROP POLICY IF EXISTS "Allow teachers to read recent calls" ON public.recent_calls;
CREATE POLICY "Allow teachers to read recent calls" ON public.recent_calls
    FOR SELECT TO anon
    USING (true);

-- ৪. শিক্ষক (Teacher) টেবিলের পলিসি আপডেট
DROP POLICY IF EXISTS "Allow teacher login check" ON public.teachers;
CREATE POLICY "Allow teacher login check" ON public.teachers
    FOR SELECT TO anon
    USING (is_active = true);

-- ৫. মাদরাসা (Madrasahs) টেবিলের বেসিক রিড (লোগো ও নামের জন্য)
DROP POLICY IF EXISTS "Allow public to see madrasah basic info" ON public.madrasahs;
CREATE POLICY "Allow public to see madrasah basic info" ON public.madrasahs
    FOR SELECT TO anon
    USING (is_active = true);
