
-- ======================================================
-- DATABASE REPAIR & INITIALIZATION SCRIPT
-- ======================================================

-- ১. ট্রানজ্যাকশন টেবিল চেক এবং হারানো কলাম যোগ করা
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL NOT NULL,
    type TEXT NOT NULL DEFAULT 'credit',
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT,
    sender_phone TEXT,
    transaction_id TEXT,
    sms_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- যদি টেবিল আগে থেকেই থাকে, তাহলে কলামগুলো আলাদাভাবে যোগ করার চেষ্টা করা
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='sender_phone') THEN
        ALTER TABLE public.transactions ADD COLUMN sender_phone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='transaction_id') THEN
        ALTER TABLE public.transactions ADD COLUMN transaction_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='sms_count') THEN
        ALTER TABLE public.transactions ADD COLUMN sms_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- ২. SMS পাঠানোর জন্য RPC ফাংশন তৈরি করা
-- এটি ব্যালেন্স চেক করবে এবং ক্রেডিট কমিয়ে দিবে
CREATE OR REPLACE FUNCTION public.send_bulk_sms_rpc(
    p_madrasah_id UUID,
    p_message TEXT,
    p_student_ids UUID[]
) RETURNS JSON AS $$
DECLARE
    v_cost INTEGER;
    v_balance INTEGER;
BEGIN
    -- কতজন স্টুডেন্টকে পাঠানো হচ্ছে তা গণনা করা
    v_cost := array_length(p_student_ids, 1);
    
    -- বর্তমান SMS ব্যালেন্স চেক করা
    SELECT sms_balance INTO v_balance FROM madrasahs WHERE id = p_madrasah_id;
    
    IF v_balance < v_cost THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient SMS balance');
    END IF;

    -- ব্যালেন্স কমানো
    UPDATE madrasahs SET sms_balance = sms_balance - v_cost WHERE id = p_madrasah_id;

    -- ট্রানজ্যাকশন হিস্টোরিতে লগ রাখা (ডেবিট হিসেবে)
    INSERT INTO transactions (madrasah_id, amount, type, status, description, sms_count)
    VALUES (p_madrasah_id, 0, 'debit', 'approved', 'Bulk SMS sent to ' || v_cost || ' students', v_cost);

    -- এখানে আপনি চাইলে প্রকৃত SMS Gateway API কল করার লজিক বা লগ রাখতে পারেন
    -- আপাতত আমরা সফল হয়েছে বলে রিটার্ন দিচ্ছি
    RETURN json_build_object('success', true, 'count', v_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ৩. RLS পলিসি রিফ্রেশ
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions 
FOR INSERT WITH CHECK (auth.uid() = madrasah_id);

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions 
FOR SELECT USING (auth.uid() = madrasah_id);

-- ৪. সুপাবেস ক্যাশ রিফ্রেশ
NOTIFY pgrst, 'reload schema';
