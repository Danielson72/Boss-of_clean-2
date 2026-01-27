-- =============================================
-- DISPUTE TRACKING
-- Tracks Stripe charge disputes and flags cleaners
-- =============================================

-- Disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_dispute_id VARCHAR(255) UNIQUE NOT NULL,
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
    charge_id VARCHAR(255),
    payment_intent_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'usd',
    reason VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'needs_response',
    evidence_due_by TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_disputes_cleaner_id ON public.disputes(cleaner_id);
CREATE INDEX idx_disputes_status ON public.disputes(status);
CREATE INDEX idx_disputes_stripe_dispute_id ON public.disputes(stripe_dispute_id);

-- Add dispute tracking columns to cleaners
ALTER TABLE public.cleaners
    ADD COLUMN IF NOT EXISTS dispute_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dispute_status VARCHAR(50) DEFAULT 'none';

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Admin can see all disputes
CREATE POLICY "Admins can view all disputes" ON public.disputes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Cleaners can see their own disputes
CREATE POLICY "Cleaners can view their own disputes" ON public.disputes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.cleaners c
            WHERE c.id = disputes.cleaner_id AND c.user_id = auth.uid()
        )
    );
