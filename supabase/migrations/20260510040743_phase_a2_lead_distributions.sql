-- =====================================================================
-- Phase A2 — Lead Distributions Table
-- =====================================================================
-- Tracks each lead's journey through the tier-priority cascade.
-- One row per (quote_request, tier) pairing — so a single quote_request
-- may have up to 3 lead_distributions rows (Pro, Basic, Free) as it
-- cascades through tiers.
--
-- Per Messaging Spec v1.1 Section 2 (state machine) and ADR-001
-- Section 3 (cascade logic).
--
-- Supersedes the dormant `public.leads` table (0 rows, no live code refs).
-- `public.leads` will be dropped in a Phase A5 cleanup migration.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.lead_distributions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id         uuid NOT NULL REFERENCES public.quote_requests ON DELETE CASCADE,

  -- Which tier window is this row for
  tier                     text NOT NULL CHECK (tier IN ('pro', 'basic', 'free')),

  -- Cascade state machine
  state                    text NOT NULL CHECK (state IN (
    'pending',           -- Window not yet opened (waiting for previous tier to expire)
    'active',            -- Window is open, pros being notified
    'cascaded',          -- Window closed without acceptance, lead moved to next tier
    'accepted',          -- A pro accepted; cascade halted; lead locked
    'expired',           -- Window closed at last tier (free) with no acceptance — terminal
    'skipped'            -- Dynamic skip: no matching pros at this tier, jumped over
  )) DEFAULT 'pending',

  -- Window timing
  window_started_at        timestamptz,
  window_expires_at        timestamptz,
  window_closed_at         timestamptz,         -- set when state moves to cascaded/accepted/expired/skipped

  -- Notification tracking
  notified_pro_ids         uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  notified_count           integer GENERATED ALWAYS AS (cardinality(notified_pro_ids)) STORED,

  -- Why the window closed (audit/analytics)
  close_reason             text CHECK (close_reason IN (
    'pro_accepted',         -- A pro clicked Accept
    'all_pros_declined',    -- Every notified pro actively declined
    'window_timeout',       -- T+15min for pro, T+30min for basic, T+24h for free
    'no_matching_pros',     -- Dynamic skip
    'customer_cancelled',   -- Customer pulled the request
    'admin_cancelled'       -- Admin intervention
  )),

  -- Round-robin fairness (for A2 we just record the rotation key; A2 enforcement comes in C)
  round_robin_seed         integer,

  -- Timestamps
  created_at               timestamptz DEFAULT now() NOT NULL,
  updated_at               timestamptz DEFAULT now() NOT NULL
);

-- Indexes ----------------------------------------------------------------

-- Fast lookup: "what tier rows exist for this quote_request"
CREATE INDEX IF NOT EXISTS idx_lead_distributions_quote_request
  ON public.lead_distributions (quote_request_id, tier);

-- Cascade timer cron: find all active rows whose window has expired
CREATE INDEX IF NOT EXISTS idx_lead_distributions_active_windows
  ON public.lead_distributions (window_expires_at)
  WHERE state = 'active';

-- Hot path: "which lead distributions are currently open at tier X"
CREATE INDEX IF NOT EXISTS idx_lead_distributions_state_tier
  ON public.lead_distributions (state, tier, window_started_at DESC);

-- Audit/analytics: filter by close reason
CREATE INDEX IF NOT EXISTS idx_lead_distributions_close_reason
  ON public.lead_distributions (close_reason, window_closed_at DESC)
  WHERE close_reason IS NOT NULL;

-- Per-pro reverse lookup: "which leads has this pro been notified about" (uses GIN on uuid array)
CREATE INDEX IF NOT EXISTS idx_lead_distributions_notified_pros_gin
  ON public.lead_distributions USING GIN (notified_pro_ids);

-- Constraints ------------------------------------------------------------

-- A given quote_request can only have one row per tier
ALTER TABLE public.lead_distributions
  DROP CONSTRAINT IF EXISTS lead_distributions_quote_tier_unique;
ALTER TABLE public.lead_distributions
  ADD CONSTRAINT lead_distributions_quote_tier_unique
  UNIQUE (quote_request_id, tier);

-- updated_at trigger -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_lead_distributions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_lead_distributions_updated_at ON public.lead_distributions;
CREATE TRIGGER trg_lead_distributions_updated_at
  BEFORE UPDATE ON public.lead_distributions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_distributions_updated_at();

-- RLS --------------------------------------------------------------------

ALTER TABLE public.lead_distributions ENABLE ROW LEVEL SECURITY;

-- Service role full access (cron jobs, edge functions, server-side code)
DROP POLICY IF EXISTS "service_role_full_access_lead_distributions" ON public.lead_distributions;
CREATE POLICY "service_role_full_access_lead_distributions"
  ON public.lead_distributions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin full access via canonical is_admin() function
DROP POLICY IF EXISTS "admin_full_access_lead_distributions" ON public.lead_distributions;
CREATE POLICY "admin_full_access_lead_distributions"
  ON public.lead_distributions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Pros can SELECT distributions where they are in the notified_pro_ids array
-- (via cleaners.user_id = auth.uid() chain)
DROP POLICY IF EXISTS "pros_read_own_distributions" ON public.lead_distributions;
CREATE POLICY "pros_read_own_distributions"
  ON public.lead_distributions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cleaners c
      WHERE c.user_id = (select auth.uid())
        AND c.id = ANY(public.lead_distributions.notified_pro_ids)
    )
  );

-- Customers can SELECT distributions for their own quote_requests
-- (so they can see "lead is currently in Pro tier window")
DROP POLICY IF EXISTS "customers_read_own_distributions" ON public.lead_distributions;
CREATE POLICY "customers_read_own_distributions"
  ON public.lead_distributions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.quote_requests qr
      WHERE qr.id = public.lead_distributions.quote_request_id
        AND qr.customer_id = (select auth.uid())
    )
  );

-- Comments ---------------------------------------------------------------

COMMENT ON TABLE public.lead_distributions IS
  'Tracks each lead''s journey through the tier-priority cascade. One row per (quote_request, tier) pairing. Supersedes dormant public.leads. Per Messaging Spec v1.1 Section 2.';

COMMENT ON COLUMN public.lead_distributions.tier IS
  'Which tier window: pro ($199/mo, T+0 15min exclusive), basic ($79/mo, T+15 30min), free (T+45 open).';

COMMENT ON COLUMN public.lead_distributions.state IS
  'Cascade state: pending (not yet opened), active (window open), cascaded (closed, moved to next tier), accepted (terminal-success), expired (terminal at last tier, no acceptance), skipped (dynamic skip — no matching pros).';

COMMENT ON COLUMN public.lead_distributions.window_expires_at IS
  'When this tier window auto-cascades to the next tier. Set when state moves to active.';

COMMENT ON COLUMN public.lead_distributions.notified_pro_ids IS
  'Array of cleaner.id values that received notification when this window opened. Used for RLS pro_read_own_distributions and round-robin fairness analytics.';

COMMENT ON COLUMN public.lead_distributions.round_robin_seed IS
  'Rotation seed used to order notifications within tier. Phase C will implement actual round-robin enforcement.';

COMMENT ON COLUMN public.lead_distributions.close_reason IS
  'Why the window closed. Used for analytics and to drive marketplace_events emission.';
