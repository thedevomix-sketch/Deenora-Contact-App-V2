
-- ১. এসএমএস খরচ গণনার ফাংশন
CREATE OR REPLACE FUNCTION public.calculate_bulk_sms_cost(total_numbers INTEGER, per_sms_rate NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
    IF total_numbers <= 0 THEN
        RAISE EXCEPTION 'Total numbers must be greater than zero';
    END IF;
    
    RETURN total_numbers * per_sms_rate;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ২. এসএমএস পেমেন্ট প্রসেস করার ফাংশন (Atomic)
CREATE OR REPLACE FUNCTION public.process_sms_billing(m_id UUID, total_cost NUMERIC, campaign_reason TEXT)
RETURNS JSON AS $$
DECLARE
    current_bal NUMERIC;
BEGIN
    -- ১. বর্তমান ব্যালেন্স চেক
    SELECT balance INTO current_bal FROM public.madrasahs WHERE id = m_id FOR UPDATE;

    IF current_bal < total_cost THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- ২. ব্যালেন্স কর্তন
    UPDATE public.madrasahs
    SET balance = balance - total_cost
    WHERE id = m_id;

    -- ৩. লেনদেন লগ করা
    INSERT INTO public.transactions (madrasah_id, amount, type, description)
    VALUES (m_id, total_cost, 'debit', campaign_reason);

    RETURN json_build_object('success', true, 'new_balance', current_bal - total_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ৩. ক্যাম্পেইন টেবিল (ঐচ্ছিক, বিস্তারিত লগের জন্য)
CREATE TABLE IF NOT EXISTS public.sms_campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    madrasah_id UUID REFERENCES public.madrasahs(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    total_recipients INTEGER NOT NULL,
    total_cost NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campaigns: User View" ON public.sms_campaigns FOR ALL USING (auth.uid() = madrasah_id);
