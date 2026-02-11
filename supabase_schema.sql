
-- ১. মাদরাসা টেবিল আপডেট (sms_balance যোগ করা হয়েছে)
ALTER TABLE public.madrasahs ADD COLUMN IF NOT EXISTS sms_balance INTEGER DEFAULT 0;

-- ২. ট্রানজ্যাকশন টেবিল আপডেট (sms_count যোগ করা হয়েছে)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sms_count INTEGER DEFAULT 0;

-- ৩. এসএমএস স্টক টেবিল রিসেট/আপডেট
DROP TABLE IF EXISTS public.admin_sms_stock;
CREATE TABLE public.admin_sms_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    remaining_sms INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ইনিশিয়াল ডাটা যদি না থাকে
INSERT INTO public.admin_sms_stock (remaining_sms) 
SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM public.admin_sms_stock);

-- ৪. আরএলএস পলিসি
ALTER TABLE public.admin_sms_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone view stock" ON public.admin_sms_stock FOR SELECT USING (true);
CREATE POLICY "Super admin update stock" ON public.admin_sms_stock FOR ALL USING (public.is_super_admin_secure());

-- ৫. পেমেন্ট এপ্রুভাল এবং এসএমএস ক্রেডিট করার ফাংশন
CREATE OR REPLACE FUNCTION public.approve_payment_with_sms(
    t_id UUID, 
    m_id UUID, 
    sms_to_give INTEGER
)
RETURNS VOID AS $$
DECLARE
    admin_stock_id UUID;
BEGIN
    -- ১. ট্রানজ্যাকশন স্ট্যাটাস আপডেট
    UPDATE public.transactions 
    SET status = 'approved', sms_count = sms_to_give 
    WHERE id = t_id;

    -- ২. ইউজারের এসএমএস ব্যালেন্স আপডেট
    UPDATE public.madrasahs 
    SET sms_balance = sms_balance + sms_to_give 
    WHERE id = m_id;

    -- ৩. অ্যাডমিনের মেইন স্টক থেকে এসএমএস কমানো
    SELECT id INTO admin_stock_id FROM public.admin_sms_stock LIMIT 1;
    UPDATE public.admin_sms_stock 
    SET remaining_sms = remaining_sms - sms_to_give, 
        updated_at = now() 
    WHERE id = admin_stock_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ৬. এসএমএস বিলিং ফাংশন আপডেট (টাকার বদলে এসএমএস ক্রেডিট কাটবে)
CREATE OR REPLACE FUNCTION public.process_sms_billing_credits(
    m_id UUID, 
    sms_needed INTEGER, 
    campaign_reason TEXT
)
RETURNS JSON AS $$
DECLARE
    current_bal INTEGER;
BEGIN
    SELECT sms_balance INTO current_bal FROM public.madrasahs WHERE id = m_id;
    
    IF current_bal < sms_needed THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient SMS balance');
    END IF;

    -- ব্যালেন্স কমানো
    UPDATE public.madrasahs SET sms_balance = sms_balance - sms_needed WHERE id = m_id;
    
    -- লগ এন্ট্রি
    INSERT INTO public.transactions (madrasah_id, amount, type, description, status, sms_count)
    VALUES (m_id, 0, 'debit', campaign_reason, 'approved', sms_needed);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
