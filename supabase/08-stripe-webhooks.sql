-- ================================================================
-- Migration 08: Stripe Webhook Events (Idempotency & Audit Trail)
-- ================================================================
-- This migration adds:
-- 1. stripe_webhook_events table for idempotency and audit logging
-- 2. Additional billing tracking columns on cleaners table
-- ================================================================

-- Create stripe_webhook_events table for idempotency and audit trail
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(255) UNIQUE NOT NULL,  -- Stripe event ID (evt_xxx)
    event_type VARCHAR(100) NOT NULL,

    -- Processing status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
    processed_at TIMESTAMPTZ,

    -- Error tracking for debugging
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMPTZ,

    -- Event payload (for replay/debugging)
    payload JSONB,

    -- Related entities (optional, for quick lookups)
    customer_id TEXT,
    subscription_id TEXT,
    invoice_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.stripe_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON public.stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.stripe_webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.stripe_webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_customer_id ON public.stripe_webhook_events(customer_id);

-- Add billing tracking columns to cleaners table
ALTER TABLE public.cleaners
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_failed_count INTEGER DEFAULT 0;

-- Function to mark webhook event as processed
CREATE OR REPLACE FUNCTION mark_webhook_processed(p_event_id VARCHAR(255))
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.stripe_webhook_events
    SET
        status = 'processed',
        processed_at = NOW(),
        updated_at = NOW()
    WHERE event_id = p_event_id;
END;
$$;

-- Function to mark webhook event as failed with error
CREATE OR REPLACE FUNCTION mark_webhook_failed(
    p_event_id VARCHAR(255),
    p_error_message TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.stripe_webhook_events
    SET
        status = 'failed',
        error_message = p_error_message,
        retry_count = retry_count + 1,
        last_retry_at = NOW(),
        updated_at = NOW()
    WHERE event_id = p_event_id;
END;
$$;

-- Function to check if webhook event already processed (idempotency)
CREATE OR REPLACE FUNCTION is_webhook_processed(p_event_id VARCHAR(255))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status VARCHAR(20);
BEGIN
    SELECT status INTO v_status
    FROM public.stripe_webhook_events
    WHERE event_id = p_event_id;

    RETURN v_status = 'processed';
END;
$$;

-- Function to record webhook event
CREATE OR REPLACE FUNCTION record_webhook_event(
    p_event_id VARCHAR(255),
    p_event_type VARCHAR(100),
    p_payload JSONB DEFAULT NULL,
    p_customer_id TEXT DEFAULT NULL,
    p_subscription_id TEXT DEFAULT NULL,
    p_invoice_id TEXT DEFAULT NULL
)
RETURNS TABLE(is_new BOOLEAN, event_status VARCHAR(20))
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_status VARCHAR(20);
BEGIN
    -- Check if event already exists
    SELECT status INTO v_existing_status
    FROM public.stripe_webhook_events
    WHERE event_id = p_event_id;

    IF v_existing_status IS NOT NULL THEN
        -- Event exists, return existing status
        RETURN QUERY SELECT FALSE, v_existing_status;
    ELSE
        -- Insert new event
        INSERT INTO public.stripe_webhook_events (
            event_id, event_type, status, payload,
            customer_id, subscription_id, invoice_id
        ) VALUES (
            p_event_id, p_event_type, 'processing', p_payload,
            p_customer_id, p_subscription_id, p_invoice_id
        );

        RETURN QUERY SELECT TRUE, 'processing'::VARCHAR(20);
    END IF;
END;
$$;

-- Function to update cleaner billing dates
CREATE OR REPLACE FUNCTION update_cleaner_billing_dates(
    p_cleaner_id UUID,
    p_last_payment_date TIMESTAMPTZ DEFAULT NULL,
    p_next_billing_date TIMESTAMPTZ DEFAULT NULL,
    p_reset_failed_count BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.cleaners
    SET
        last_payment_date = COALESCE(p_last_payment_date, last_payment_date),
        next_billing_date = COALESCE(p_next_billing_date, next_billing_date),
        payment_failed_count = CASE
            WHEN p_reset_failed_count THEN 0
            ELSE payment_failed_count
        END,
        updated_at = NOW()
    WHERE id = p_cleaner_id;
END;
$$;

-- Function to increment payment failed count
CREATE OR REPLACE FUNCTION increment_payment_failed_count(p_cleaner_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_count INTEGER;
BEGIN
    UPDATE public.cleaners
    SET
        payment_failed_count = payment_failed_count + 1,
        updated_at = NOW()
    WHERE id = p_cleaner_id
    RETURNING payment_failed_count INTO v_new_count;

    RETURN v_new_count;
END;
$$;

-- RLS policies for webhook events (admin only)
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for webhook processing)
CREATE POLICY "Service role full access to webhook events"
ON public.stripe_webhook_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view webhook events
CREATE POLICY "Admins can view webhook events"
ON public.stripe_webhook_events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.stripe_webhook_events TO service_role;
GRANT SELECT ON public.stripe_webhook_events TO authenticated;
GRANT EXECUTE ON FUNCTION record_webhook_event TO service_role;
GRANT EXECUTE ON FUNCTION mark_webhook_processed TO service_role;
GRANT EXECUTE ON FUNCTION mark_webhook_failed TO service_role;
GRANT EXECUTE ON FUNCTION is_webhook_processed TO service_role;
GRANT EXECUTE ON FUNCTION update_cleaner_billing_dates TO service_role;
GRANT EXECUTE ON FUNCTION increment_payment_failed_count TO service_role;

-- Comment on table
COMMENT ON TABLE public.stripe_webhook_events IS 'Audit log for Stripe webhook events with idempotency tracking';
