-- ================================================================
-- Migration 09: Quote Request System
-- ================================================================
-- This migration adds:
-- 1. quote_requests table for customer quote submissions
-- 2. lead_matches junction table for cleaner-quote matching
-- 3. Lead credit tracking on cleaners table
-- 4. Functions for lead matching and response handling
-- ================================================================

-- Create enum for quote request status
DO $$ BEGIN
    CREATE TYPE quote_status AS ENUM ('pending', 'matched', 'completed', 'expired', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for lead match status
DO $$ BEGIN
    CREATE TYPE lead_match_status AS ENUM ('pending', 'viewed', 'responded', 'declined', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for property type
DO $$ BEGIN
    CREATE TYPE property_type AS ENUM ('home', 'condo', 'apartment', 'office', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Quote requests from customers (no auth required)
CREATE TABLE IF NOT EXISTS public.quote_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Service details
    service_type TEXT NOT NULL,
    property_type property_type NOT NULL DEFAULT 'home',
    sqft_estimate INTEGER,
    bedrooms INTEGER,
    bathrooms INTEGER,

    -- Location
    zip_code TEXT NOT NULL,
    city TEXT,
    state TEXT DEFAULT 'FL',

    -- Scheduling
    preferred_date DATE,
    flexibility TEXT DEFAULT 'flexible', -- exact, flexible, asap

    -- Contact info (public submission, no auth)
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    notes TEXT,

    -- Status tracking
    status quote_status DEFAULT 'pending',
    match_count INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

    -- Constraints
    CONSTRAINT valid_email CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_zip CHECK (zip_code ~ '^\d{5}(-\d{4})?$')
);

-- Lead matches junction table
CREATE TABLE IF NOT EXISTS public.lead_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,

    -- Match metadata
    match_score DECIMAL(5,2) DEFAULT 0.00,
    distance_miles DECIMAL(5,1),

    -- Response status
    status lead_match_status DEFAULT 'pending',
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,

    -- Cleaner's quote response
    quote_amount DECIMAL(10,2),
    availability_date DATE,
    response_message TEXT,

    -- Lead credit tracking
    lead_credit_deducted BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',

    -- Prevent duplicate matches
    CONSTRAINT unique_quote_cleaner UNIQUE(quote_request_id, cleaner_id)
);

-- Add lead credits tracking to cleaners table
ALTER TABLE public.cleaners
ADD COLUMN IF NOT EXISTS lead_credits_remaining INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS lead_credits_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lead_credits_reset_date TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 month';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quote_requests_zip_code ON public.quote_requests(zip_code);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON public.quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON public.quote_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_expires_at ON public.quote_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_quote_requests_service_type ON public.quote_requests(service_type);

CREATE INDEX IF NOT EXISTS idx_lead_matches_cleaner_id ON public.lead_matches(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_lead_matches_quote_request_id ON public.lead_matches(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_lead_matches_status ON public.lead_matches(status);
CREATE INDEX IF NOT EXISTS idx_lead_matches_created_at ON public.lead_matches(created_at DESC);

-- Function to match quote to eligible cleaners
CREATE OR REPLACE FUNCTION match_quote_to_cleaners(
    p_quote_id UUID,
    p_max_matches INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quote RECORD;
    v_cleaner RECORD;
    v_match_count INTEGER := 0;
    v_match_score DECIMAL(5,2);
BEGIN
    -- Get the quote request
    SELECT * INTO v_quote FROM public.quote_requests WHERE id = p_quote_id;

    IF v_quote IS NULL THEN
        RAISE EXCEPTION 'Quote request not found';
    END IF;

    -- Find eligible cleaners
    FOR v_cleaner IN
        SELECT DISTINCT c.id, c.average_rating, c.total_reviews, c.subscription_tier
        FROM public.cleaners c
        INNER JOIN public.service_areas sa ON sa.cleaner_id = c.id
        WHERE c.approval_status = 'approved'
          AND sa.zip_code = v_quote.zip_code
          AND (
              v_quote.service_type = ANY(c.services)
              OR 'residential' = ANY(c.services) -- Default to residential if no exact match
          )
          AND (
              c.subscription_tier IN ('basic', 'pro', 'enterprise')
              OR (c.subscription_tier = 'free' AND c.lead_credits_remaining > 0)
          )
        ORDER BY
            c.average_rating DESC NULLS LAST,
            c.total_reviews DESC NULLS LAST
        LIMIT p_max_matches
    LOOP
        -- Calculate match score (0-100)
        v_match_score := 50.0; -- Base score

        -- Bonus for rating
        IF v_cleaner.average_rating IS NOT NULL THEN
            v_match_score := v_match_score + (v_cleaner.average_rating * 5);
        END IF;

        -- Bonus for reviews
        IF v_cleaner.total_reviews > 10 THEN
            v_match_score := v_match_score + 10;
        ELSIF v_cleaner.total_reviews > 5 THEN
            v_match_score := v_match_score + 5;
        END IF;

        -- Bonus for paid subscription
        IF v_cleaner.subscription_tier IN ('pro', 'enterprise') THEN
            v_match_score := v_match_score + 15;
        ELSIF v_cleaner.subscription_tier = 'basic' THEN
            v_match_score := v_match_score + 10;
        END IF;

        -- Cap at 100
        v_match_score := LEAST(v_match_score, 100.0);

        -- Create lead match
        INSERT INTO public.lead_matches (
            quote_request_id,
            cleaner_id,
            match_score,
            status
        ) VALUES (
            p_quote_id,
            v_cleaner.id,
            v_match_score,
            'pending'
        )
        ON CONFLICT (quote_request_id, cleaner_id) DO NOTHING;

        v_match_count := v_match_count + 1;
    END LOOP;

    -- Update quote request with match count
    UPDATE public.quote_requests
    SET
        match_count = v_match_count,
        status = CASE WHEN v_match_count > 0 THEN 'matched'::quote_status ELSE 'pending'::quote_status END,
        updated_at = NOW()
    WHERE id = p_quote_id;

    RETURN v_match_count;
END;
$$;

-- Function for cleaner to respond to a lead
CREATE OR REPLACE FUNCTION respond_to_lead(
    p_match_id UUID,
    p_cleaner_id UUID,
    p_quote_amount DECIMAL(10,2),
    p_availability_date DATE,
    p_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match RECORD;
    v_cleaner RECORD;
BEGIN
    -- Get the lead match
    SELECT * INTO v_match
    FROM public.lead_matches
    WHERE id = p_match_id AND cleaner_id = p_cleaner_id;

    IF v_match IS NULL THEN
        RAISE EXCEPTION 'Lead match not found or unauthorized';
    END IF;

    IF v_match.status NOT IN ('pending', 'viewed') THEN
        RAISE EXCEPTION 'Lead already responded to or expired';
    END IF;

    -- Get cleaner info for credit check
    SELECT * INTO v_cleaner FROM public.cleaners WHERE id = p_cleaner_id;

    -- Check lead credits for free tier
    IF v_cleaner.subscription_tier = 'free' AND v_cleaner.lead_credits_remaining <= 0 THEN
        RAISE EXCEPTION 'No lead credits remaining. Upgrade to respond to more leads.';
    END IF;

    -- Update the lead match with response
    UPDATE public.lead_matches
    SET
        status = 'responded',
        responded_at = NOW(),
        quote_amount = p_quote_amount,
        availability_date = p_availability_date,
        response_message = p_message,
        lead_credit_deducted = TRUE,
        updated_at = NOW()
    WHERE id = p_match_id;

    -- Deduct lead credit for free tier
    IF v_cleaner.subscription_tier = 'free' THEN
        UPDATE public.cleaners
        SET
            lead_credits_remaining = lead_credits_remaining - 1,
            lead_credits_used_this_month = lead_credits_used_this_month + 1,
            updated_at = NOW()
        WHERE id = p_cleaner_id;
    END IF;

    -- Update quote request response count
    UPDATE public.quote_requests
    SET
        response_count = response_count + 1,
        updated_at = NOW()
    WHERE id = v_match.quote_request_id;

    RETURN TRUE;
END;
$$;

-- Function to mark lead as viewed
CREATE OR REPLACE FUNCTION mark_lead_viewed(
    p_match_id UUID,
    p_cleaner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.lead_matches
    SET
        status = CASE WHEN status = 'pending' THEN 'viewed'::lead_match_status ELSE status END,
        viewed_at = COALESCE(viewed_at, NOW()),
        updated_at = NOW()
    WHERE id = p_match_id AND cleaner_id = p_cleaner_id;

    RETURN FOUND;
END;
$$;

-- Function to decline a lead
CREATE OR REPLACE FUNCTION decline_lead(
    p_match_id UUID,
    p_cleaner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.lead_matches
    SET
        status = 'declined',
        updated_at = NOW()
    WHERE id = p_match_id
      AND cleaner_id = p_cleaner_id
      AND status IN ('pending', 'viewed');

    RETURN FOUND;
END;
$$;

-- Function to reset monthly lead credits
CREATE OR REPLACE FUNCTION reset_monthly_lead_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.cleaners
    SET
        lead_credits_remaining = 5,
        lead_credits_used_this_month = 0,
        lead_credits_reset_date = NOW() + INTERVAL '1 month',
        updated_at = NOW()
    WHERE subscription_tier = 'free'
      AND lead_credits_reset_date <= NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Function to expire old quote requests and lead matches
CREATE OR REPLACE FUNCTION expire_old_quotes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quote_count INTEGER;
    v_match_count INTEGER;
BEGIN
    -- Expire quote requests
    UPDATE public.quote_requests
    SET status = 'expired', updated_at = NOW()
    WHERE status IN ('pending', 'matched')
      AND expires_at <= NOW();

    GET DIAGNOSTICS v_quote_count = ROW_COUNT;

    -- Expire unresponded lead matches
    UPDATE public.lead_matches
    SET status = 'expired', updated_at = NOW()
    WHERE status IN ('pending', 'viewed')
      AND expires_at <= NOW();

    GET DIAGNOSTICS v_match_count = ROW_COUNT;

    RETURN v_quote_count + v_match_count;
END;
$$;

-- RLS Policies

-- Quote requests: public insert, service role full access
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create quote requests"
ON public.quote_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Service role full access to quote requests"
ON public.quote_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Customers can view their own quotes by email (handled in application layer)

-- Lead matches: cleaners can see their own matches
ALTER TABLE public.lead_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cleaners can view their lead matches"
ON public.lead_matches
FOR SELECT
TO authenticated
USING (
    cleaner_id IN (
        SELECT id FROM public.cleaners WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Cleaners can update their lead matches"
ON public.lead_matches
FOR UPDATE
TO authenticated
USING (
    cleaner_id IN (
        SELECT id FROM public.cleaners WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    cleaner_id IN (
        SELECT id FROM public.cleaners WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Service role full access to lead matches"
ON public.lead_matches
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT INSERT ON public.quote_requests TO anon;
GRANT INSERT ON public.quote_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quote_requests TO service_role;
GRANT SELECT, UPDATE ON public.lead_matches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_matches TO service_role;

GRANT EXECUTE ON FUNCTION match_quote_to_cleaners TO service_role;
GRANT EXECUTE ON FUNCTION respond_to_lead TO authenticated;
GRANT EXECUTE ON FUNCTION mark_lead_viewed TO authenticated;
GRANT EXECUTE ON FUNCTION decline_lead TO authenticated;
GRANT EXECUTE ON FUNCTION reset_monthly_lead_credits TO service_role;
GRANT EXECUTE ON FUNCTION expire_old_quotes TO service_role;

-- Comments
COMMENT ON TABLE public.quote_requests IS 'Customer quote requests for cleaning services';
COMMENT ON TABLE public.lead_matches IS 'Junction table matching quote requests to eligible cleaners';
COMMENT ON FUNCTION match_quote_to_cleaners IS 'Matches a quote request to up to N eligible cleaners based on location, services, and subscription';
COMMENT ON FUNCTION respond_to_lead IS 'Allows a cleaner to respond to a matched lead with a quote';
