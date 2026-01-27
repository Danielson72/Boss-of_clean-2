-- =============================================
-- LEAD CREDIT TRACKING
-- Tracks lead credit usage per billing cycle
-- =============================================

-- Add lead credit tracking columns to cleaners
ALTER TABLE public.cleaners
    ADD COLUMN IF NOT EXISTS lead_credits_used INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lead_credits_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Function to atomically claim a lead with credit check
CREATE OR REPLACE FUNCTION public.claim_lead_with_credit(
    p_cleaner_id UUID,
    p_lead_id UUID,
    p_tier TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_credits_used INTEGER;
    v_credit_limit INTEGER;
    v_reset_at TIMESTAMPTZ;
BEGIN
    -- Determine credit limit based on tier
    CASE p_tier
        WHEN 'free' THEN v_credit_limit := 5;
        WHEN 'basic' THEN v_credit_limit := 20;
        WHEN 'pro' THEN v_credit_limit := -1;  -- unlimited
        WHEN 'enterprise' THEN v_credit_limit := -1;  -- unlimited
        ELSE v_credit_limit := 5;
    END CASE;

    -- Get current credit usage (with row lock)
    SELECT lead_credits_used, lead_credits_reset_at
    INTO v_credits_used, v_reset_at
    FROM public.cleaners
    WHERE id = p_cleaner_id
    FOR UPDATE;

    -- Auto-reset if reset date has passed (monthly cycle)
    IF v_reset_at IS NULL OR v_reset_at < date_trunc('month', NOW()) THEN
        v_credits_used := 0;
        UPDATE public.cleaners
        SET lead_credits_used = 0,
            lead_credits_reset_at = date_trunc('month', NOW()) + INTERVAL '1 month'
        WHERE id = p_cleaner_id;
    END IF;

    -- Check credit limit (skip for unlimited tiers)
    IF v_credit_limit > 0 AND v_credits_used >= v_credit_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No lead credits remaining. Upgrade your plan for more leads.',
            'credits_used', v_credits_used,
            'credit_limit', v_credit_limit
        );
    END IF;

    -- Verify lead is still available
    IF NOT EXISTS (
        SELECT 1 FROM public.quote_requests
        WHERE id = p_lead_id AND cleaner_id IS NULL AND status = 'pending'
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'This lead has already been claimed by another cleaner.'
        );
    END IF;

    -- Claim the lead
    UPDATE public.quote_requests
    SET cleaner_id = p_cleaner_id,
        status = 'responded',
        updated_at = NOW()
    WHERE id = p_lead_id AND cleaner_id IS NULL AND status = 'pending';

    -- Increment credit usage
    UPDATE public.cleaners
    SET lead_credits_used = lead_credits_used + 1
    WHERE id = p_cleaner_id;

    RETURN jsonb_build_object(
        'success', true,
        'credits_used', v_credits_used + 1,
        'credit_limit', v_credit_limit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
