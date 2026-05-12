-- =====================================================================
-- Phase A4 — Rename lead_unlocks → lead_acceptances + Extend
-- =====================================================================
-- Per ADR-001 and the May 9 legacy audit decision: RENAME-AND-EXTEND
-- (not supersede) because 24 live code references depend on this table,
-- including the Stripe webhook handler.
--
-- This migration:
--   A. Renames the table public.lead_unlocks → public.lead_acceptances
--   B. Adds v1.1 spec columns (distribution link, tier, capture timing, voids)
--   C. Notes that lead_charges columns are already covered by existing columns
--   D. Updates the status check constraint to v1.1 state machine
--   E. Adds FK from refund_decisions.lead_acceptance_id → lead_acceptances.id
--   F. Adds new indexes for capture cron, distribution lookup, tier analytics
--   G. Rewrites the 3 dependent RPC functions to reference the new table
--      name and new status values (Postgres does NOT auto-rewrite function
--      bodies on ALTER TABLE RENAME — function source is stored as text).
--
-- All wrapped in a single transaction so partial failure rolls back cleanly.
--
-- DIAGNOSTICS NOTE:
--   lead_unlocks: 0 rows — safe to change semantics.
--   lead_charges: 0 rows, columns (stripe_payment_intent_id, amount_cents,
--     status) already mirrored on lead_unlocks. No data to migrate.
--   refund_decisions.lead_acceptance_id: column exists (created in A1) with
--     no FK constraint yet.
--   lead_refund_requests.lead_unlock_id FK: stays pointing at the renamed
--     table (Postgres preserves FK references through RENAME by oid). The
--     constraint name lead_refund_requests_lead_unlock_id_fkey is now
--     cosmetically stale but functional. Will be retired with the table in
--     Phase A5 cleanup.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PART A: Rename lead_unlocks → lead_acceptances
-- =====================================================================
-- Idempotent: only rename if lead_unlocks still exists AND lead_acceptances does not.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='lead_unlocks')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='lead_acceptances')
  THEN
    EXECUTE 'ALTER TABLE public.lead_unlocks RENAME TO lead_acceptances';
  END IF;
END $$;

-- Rename existing indexes to match new table name (cosmetic but useful).
-- IF EXISTS guards make this idempotent.
ALTER INDEX IF EXISTS public.lead_unlocks_pkey
  RENAME TO lead_acceptances_pkey;
ALTER INDEX IF EXISTS public.lead_unlocks_quote_request_id_cleaner_id_key
  RENAME TO lead_acceptances_quote_request_id_cleaner_id_key;
ALTER INDEX IF EXISTS public.idx_lead_unlocks_cleaner
  RENAME TO idx_lead_acceptances_cleaner;
ALTER INDEX IF EXISTS public.idx_lead_unlocks_cleaner_status
  RENAME TO idx_lead_acceptances_cleaner_status;
ALTER INDEX IF EXISTS public.idx_lead_unlocks_quote_request
  RENAME TO idx_lead_acceptances_quote_request;
ALTER INDEX IF EXISTS public.idx_lead_unlocks_quote_status
  RENAME TO idx_lead_acceptances_quote_status;
ALTER INDEX IF EXISTS public.idx_lead_unlocks_status
  RENAME TO idx_lead_acceptances_status;

-- Rename existing FK constraints on lead_acceptances for clarity.
-- (Postgres lets you rename constraints via ALTER TABLE.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='lead_acceptances'
      AND con.conname='lead_unlocks_cleaner_id_fkey'
  ) THEN
    ALTER TABLE public.lead_acceptances
      RENAME CONSTRAINT lead_unlocks_cleaner_id_fkey TO lead_acceptances_cleaner_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='lead_acceptances'
      AND con.conname='lead_unlocks_quote_request_id_fkey'
  ) THEN
    ALTER TABLE public.lead_acceptances
      RENAME CONSTRAINT lead_unlocks_quote_request_id_fkey TO lead_acceptances_quote_request_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='lead_acceptances'
      AND con.conname='lead_unlocks_status_check'
  ) THEN
    ALTER TABLE public.lead_acceptances
      RENAME CONSTRAINT lead_unlocks_status_check TO lead_acceptances_status_check;
  END IF;
END $$;

-- =====================================================================
-- PART B: Add v1.1 fields to lead_acceptances
-- =====================================================================

ALTER TABLE public.lead_acceptances
  ADD COLUMN IF NOT EXISTS lead_distribution_id uuid
    REFERENCES public.lead_distributions ON DELETE CASCADE;

ALTER TABLE public.lead_acceptances
  ADD COLUMN IF NOT EXISTS tier_at_acceptance text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='lead_acceptances_tier_at_acceptance_check'
  ) THEN
    ALTER TABLE public.lead_acceptances
      ADD CONSTRAINT lead_acceptances_tier_at_acceptance_check
      CHECK (tier_at_acceptance IS NULL OR tier_at_acceptance IN ('pro', 'basic', 'free'));
  END IF;
END $$;

ALTER TABLE public.lead_acceptances
  ADD COLUMN IF NOT EXISTS counts_against_cap boolean DEFAULT true NOT NULL;

ALTER TABLE public.lead_acceptances
  ADD COLUMN IF NOT EXISTS founding_pro_perk_used boolean DEFAULT false NOT NULL;

ALTER TABLE public.lead_acceptances
  ADD COLUMN IF NOT EXISTS capture_before timestamptz;

ALTER TABLE public.lead_acceptances
  ADD COLUMN IF NOT EXISTS captured_at timestamptz;

ALTER TABLE public.lead_acceptances
  ADD COLUMN IF NOT EXISTS voided_at timestamptz;

ALTER TABLE public.lead_acceptances
  ADD COLUMN IF NOT EXISTS void_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='lead_acceptances_void_reason_check'
  ) THEN
    ALTER TABLE public.lead_acceptances
      ADD CONSTRAINT lead_acceptances_void_reason_check
      CHECK (
        void_reason IS NULL OR void_reason IN (
          'customer_non_response_48h',
          'customer_silence_7d',
          'duplicate_lead',
          'contact_bounce',
          'admin_cancelled'
        )
      );
  END IF;
END $$;

-- =====================================================================
-- PART C: lead_charges columns — no new columns needed
-- =====================================================================
-- The existing columns stripe_payment_intent_id, amount_cents, and status
-- on lead_acceptances already cover what lead_charges duplicates. No-op.
-- lead_charges will be dropped in a Phase A5 cleanup migration.

-- =====================================================================
-- PART D: Update status check constraint to v1.1 state machine
-- =====================================================================
-- Old: status IN ('pending','paid','refunded','credited')
-- New: status IN ('pending','authorized','captured','voided','refunded')
--
-- Safe because lead_acceptances has 0 rows. Use DROP IF EXISTS / ADD pattern
-- so this migration is re-runnable.

ALTER TABLE public.lead_acceptances
  DROP CONSTRAINT IF EXISTS lead_acceptances_status_check;

ALTER TABLE public.lead_acceptances
  ADD CONSTRAINT lead_acceptances_status_check
  CHECK (status IN ('pending','authorized','captured','voided','refunded'));

-- =====================================================================
-- PART E: Add FK from refund_decisions.lead_acceptance_id
-- =====================================================================
-- A1 v1.1 created refund_decisions.lead_acceptance_id with a comment saying
-- "FK will be added in Phase A4." This is that addition.
-- ON DELETE RESTRICT so we never silently drop a refund decision when its
-- underlying acceptance is removed (admin must reconcile first).

ALTER TABLE public.refund_decisions
  DROP CONSTRAINT IF EXISTS refund_decisions_lead_acceptance_id_fkey;

ALTER TABLE public.refund_decisions
  ADD CONSTRAINT refund_decisions_lead_acceptance_id_fkey
  FOREIGN KEY (lead_acceptance_id)
  REFERENCES public.lead_acceptances(id)
  ON DELETE RESTRICT;

-- =====================================================================
-- PART F: New indexes
-- =====================================================================

-- Hot path for the capture cron: find acceptances whose Stripe auth is about
-- to expire and that have not been captured or voided yet.
CREATE INDEX IF NOT EXISTS idx_lead_acceptances_capture_before
  ON public.lead_acceptances (capture_before)
  WHERE captured_at IS NULL AND voided_at IS NULL;

-- Lookup acceptances by distribution (e.g., when a distribution cascades and
-- we need to find which acceptance halted it).
CREATE INDEX IF NOT EXISTS idx_lead_acceptances_distribution
  ON public.lead_acceptances (lead_distribution_id)
  WHERE lead_distribution_id IS NOT NULL;

-- Analytics: tier mix of acceptances over time.
CREATE INDEX IF NOT EXISTS idx_lead_acceptances_tier_recent
  ON public.lead_acceptances (tier_at_acceptance, created_at DESC);

-- =====================================================================
-- PART G: Comments
-- =====================================================================

COMMENT ON TABLE public.lead_acceptances IS
  'A pro accepting a distributed lead. Was lead_unlocks pre-Phase-A4. One row per (quote_request, cleaner) — UNIQUE constraint preserved from the rename. Stripe state machine: pending -> authorized -> captured | voided | refunded. Per Messaging Spec v1.1.';

COMMENT ON COLUMN public.lead_acceptances.lead_distribution_id IS
  'FK to the lead_distributions row this acceptance halted (cascade-stopper). Nullable for backwards compatibility while the cascade engine is being built; will be required once Phase C ships.';

COMMENT ON COLUMN public.lead_acceptances.tier_at_acceptance IS
  'Denormalized tier the cleaner held when they accepted. Useful for analytics and refund-eligibility decisions without joining cleaners.';

COMMENT ON COLUMN public.lead_acceptances.counts_against_cap IS
  'True for Basic/Pro tier acceptances (consume a monthly included lead). False for Free tier — they pay per lead, so no cap.';

COMMENT ON COLUMN public.lead_acceptances.founding_pro_perk_used IS
  'True if this acceptance consumed a Founders Offer perk slot. Per ADR-001 Section 2 Founders Offer.';

COMMENT ON COLUMN public.lead_acceptances.capture_before IS
  'Deadline by which Stripe authorization must be captured or voided. Set when status moves to authorized.';

COMMENT ON COLUMN public.lead_acceptances.captured_at IS
  'When the Stripe charge was actually captured (status -> captured).';

COMMENT ON COLUMN public.lead_acceptances.voided_at IS
  'When the Stripe authorization was voided (status -> voided). Mutually exclusive with captured_at.';

COMMENT ON COLUMN public.lead_acceptances.void_reason IS
  'Why the auth was voided. Controlled list per Messaging Spec v1.1 Section 7.';

-- =====================================================================
-- PART H: Rewrite RPCs to reference the new table name and new statuses
-- =====================================================================
-- Postgres stores function bodies as text and does NOT rewrite them on
-- ALTER TABLE RENAME. Without these rewrites, all 3 RPCs would break the
-- moment Part A applies.
--
-- We also remap the old "completed" status values:
--   old: status IN ('paid', 'credited')      -- a pro had unlocked the lead
--   new: status IN ('authorized', 'captured') -- a pro accepted the lead
-- Both old values are gone (Part D drop). We use authorized + captured
-- because those are the two states where a pro has committed to the lead
-- (auth held or charge taken). 'pending' stays as the in-flight state used
-- by the "already started but not finished" check.

CREATE OR REPLACE FUNCTION public.check_lead_competition_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  acceptance_count integer;
BEGIN
  SELECT COUNT(*) INTO acceptance_count
  FROM public.lead_acceptances
  WHERE quote_request_id = NEW.quote_request_id
    AND status IN ('authorized', 'captured');

  IF acceptance_count >= 3 THEN
    RAISE EXCEPTION 'Competition cap reached: maximum 3 pros can accept this lead'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_lead_unlock_cap(
  p_quote_request_id uuid,
  p_cleaner_id uuid
)
RETURNS TABLE(unlock_count integer, already_unlocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_already boolean;
BEGIN
  -- Lock existing acceptance rows for this lead to prevent concurrent inserts
  PERFORM 1 FROM lead_acceptances
  WHERE quote_request_id = p_quote_request_id
    AND status IN ('authorized', 'captured')
  FOR UPDATE;

  -- Count active acceptances (authorized or captured)
  SELECT count(*)::integer INTO v_count
  FROM lead_acceptances
  WHERE quote_request_id = p_quote_request_id
    AND status IN ('authorized', 'captured');

  -- Check if this cleaner already has an acceptance (any active status)
  SELECT EXISTS(
    SELECT 1 FROM lead_acceptances
    WHERE quote_request_id = p_quote_request_id
      AND cleaner_id = p_cleaner_id
      AND status IN ('authorized', 'captured', 'pending')
  ) INTO v_already;

  RETURN QUERY SELECT v_count, v_already;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_lead_pros(p_quote_request_id uuid)
RETURNS TABLE(
  cleaner_id uuid,
  business_name text,
  subscription_tier subscription_tier,
  response_rate numeric,
  average_rating numeric,
  distance_miles numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_zip text;
  v_service_type text;
  v_cleaner_id uuid;
  v_lat numeric;
  v_lng numeric;
BEGIN
  -- Get the lead's zip + service_type + cleaner_id
  SELECT qr.zip_code, qr.service_type, qr.cleaner_id
  INTO v_zip, v_service_type, v_cleaner_id
  FROM quote_requests qr
  WHERE qr.id = p_quote_request_id;

  -- If lead not found, return empty
  IF v_zip IS NULL THEN
    RETURN;
  END IF;

  -- If cleaner_id IS NOT NULL, this is a direct request — no matching needed
  IF v_cleaner_id IS NOT NULL THEN
    RETURN;
  END IF;

  -- Get lead zip lat/lng for distance calc
  SELECT fz.latitude, fz.longitude
  INTO v_lat, v_lng
  FROM florida_zipcodes fz
  WHERE fz.zip_code = v_zip;

  RETURN QUERY
  SELECT
    c.id AS cleaner_id,
    c.business_name,
    c.subscription_tier,
    c.response_rate,
    c.average_rating,
    -- Haversine distance in miles (if lat/lng available)
    CASE
      WHEN v_lat IS NOT NULL AND fz2.latitude IS NOT NULL THEN
        ROUND((
          3959 * acos(
            LEAST(1.0,
              cos(radians(v_lat)) * cos(radians(fz2.latitude))
              * cos(radians(fz2.longitude) - radians(v_lng))
              + sin(radians(v_lat)) * sin(radians(fz2.latitude))
            )
          )
        )::numeric, 1)
      ELSE NULL
    END AS distance_miles
  FROM cleaners c
  -- Join through the service_areas table to find cleaners covering this zip
  INNER JOIN service_areas sa ON sa.cleaner_id = c.id AND sa.zip_code = v_zip
  -- Get cleaner's primary zip for distance calculation
  LEFT JOIN service_areas sa_primary
    ON sa_primary.cleaner_id = c.id AND sa_primary.is_primary = true
  LEFT JOIN florida_zipcodes fz2 ON fz2.zip_code = sa_primary.zip_code
  WHERE c.approval_status = 'approved'
    -- Exclude pros who already have an acceptance for this lead
    AND NOT EXISTS (
      SELECT 1 FROM lead_acceptances la
      WHERE la.quote_request_id = p_quote_request_id
        AND la.cleaner_id = c.id
        AND la.status IN ('authorized', 'captured', 'pending')
    )
    -- Enforce competition cap: max 3 active acceptances per lead
    AND (
      SELECT count(*) FROM lead_acceptances la2
      WHERE la2.quote_request_id = p_quote_request_id
        AND la2.status IN ('authorized', 'captured')
    ) < 3
  ORDER BY
    -- Tier priority: enterprise > pro > basic > free
    CASE c.subscription_tier
      WHEN 'enterprise' THEN 1
      WHEN 'pro' THEN 2
      WHEN 'basic' THEN 3
      WHEN 'free' THEN 4
      ELSE 5
    END,
    c.response_rate DESC NULLS LAST,
    c.average_rating DESC NULLS LAST;
END;
$function$;

COMMIT;
