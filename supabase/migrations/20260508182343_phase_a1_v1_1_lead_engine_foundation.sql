-- =====================================================================
-- Phase A1 (v1.1) — Lead Engine Foundation
-- =====================================================================
-- Extends public.cleaners with subscription, marketplace control, and
-- Founders Offer fields. Creates notification_logs, refund_decisions,
-- and marketplace_events.
--
-- Migration is idempotent: every CREATE/ADD uses IF NOT EXISTS.
-- Backwards compatible: every new cleaners column is nullable or has a
-- safe default.
--
-- DEVIATIONS FROM SPEC (flagged for Daniel — see notes in response):
--   1. subscription_tier already exists on cleaners as enum
--      `subscription_tier` (free, basic, pro, enterprise). The spec
--      requested a text column with CHECK. We DO NOT redefine it; the
--      existing enum already covers the required values.
--   2. stripe_customer_id and stripe_subscription_id already exist on
--      cleaners. IF NOT EXISTS makes the spec's ADD COLUMN no-ops.
--   3. RLS admin policies use the existing public.is_admin() function
--      (already used by cleaners.admin_full_access policy) instead of
--      a fresh subquery against users.role. is_admin() is SECURITY
--      DEFINER and matches project conventions; it also avoids
--      recursive RLS on the users table.
--   4. lead_acceptances does not exist yet (Phase A4). The
--      refund_decisions.lead_acceptance_id FK is intentionally omitted
--      and will be added by Phase A4.
-- =====================================================================

-- =====================================================================
-- PART A: Extend public.cleaners
-- =====================================================================

-- Subscription state fields ------------------------------------------------
-- subscription_tier: already exists as enum (free, basic, pro, enterprise).
-- We do NOT add it again. The existing enum satisfies the spec's intent.

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS subscription_status text
    DEFAULT 'active' NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cleaners_subscription_status_check'
  ) THEN
    ALTER TABLE public.cleaners
      ADD CONSTRAINT cleaners_subscription_status_check
      CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'paused'));
  END IF;
END $$;

-- stripe_customer_id and stripe_subscription_id already exist on cleaners.
-- IF NOT EXISTS ensures these are no-ops.
ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS stripe_default_payment_method_id text;

-- Marketplace control fields (the three holes) -----------------------------
ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS leads_paused boolean DEFAULT false NOT NULL;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS leads_paused_until timestamptz;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS monthly_lead_cap_override integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cleaners_monthly_lead_cap_override_check'
  ) THEN
    ALTER TABLE public.cleaners
      ADD CONSTRAINT cleaners_monthly_lead_cap_override_check
      CHECK (monthly_lead_cap_override IS NULL OR monthly_lead_cap_override >= 0);
  END IF;
END $$;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS monthly_accepted_lead_count integer DEFAULT 0 NOT NULL;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS monthly_lead_count_resets_at timestamptz;

-- Founders Offer tracking --------------------------------------------------
ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS is_founding_pro boolean DEFAULT false NOT NULL;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS founding_pro_discount_ends_at timestamptz;

-- Opt-in compliance fields (Messaging Spec v1.1 Section 12) ----------------
ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS sms_opted_in boolean DEFAULT false NOT NULL;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS sms_opted_in_at timestamptz;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS sms_opt_out_keyword text;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS sms_opted_out_at timestamptz;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS email_opted_in boolean DEFAULT true NOT NULL;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS email_opted_out_at timestamptz;

ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS email_opt_out_token text;

-- Indexes ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cleaners_stripe_customer_id
  ON public.cleaners (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cleaners_stripe_subscription_id
  ON public.cleaners (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cleaners_lead_eligibility
  ON public.cleaners (subscription_tier, subscription_status, leads_paused)
  WHERE subscription_status = 'active' AND leads_paused = false;

CREATE INDEX IF NOT EXISTS idx_cleaners_email_opt_out_token
  ON public.cleaners (email_opt_out_token)
  WHERE email_opt_out_token IS NOT NULL;

-- Column comments ----------------------------------------------------------
COMMENT ON COLUMN public.cleaners.subscription_status IS
  'Subscription status: active, past_due, canceled, paused. Per ADR-001 Section 2.';

COMMENT ON COLUMN public.cleaners.leads_paused IS
  'Pause Leads toggle. When true, cleaner is excluded from lead notification rotation but subscription continues billing. Per ADR-001 Section 4a.';

COMMENT ON COLUMN public.cleaners.monthly_lead_cap_override IS
  'Optional per-cleaner cap below the tier default. Null = use tier default (30 pro, 10 basic, 0 free). Per ADR-001 Section 4b.';

COMMENT ON COLUMN public.cleaners.monthly_accepted_lead_count IS
  'Counter incremented on each lead acceptance. Resets at start of each billing cycle.';

COMMENT ON COLUMN public.cleaners.is_founding_pro IS
  'True for first 100 Pro tier signups. Per ADR-001 Section 2 Founders Offer.';

COMMENT ON COLUMN public.cleaners.sms_opted_in IS
  'TCPA-compliant SMS opt-in flag. MUST be true to receive any SMS. Per Messaging Spec v1.1 Section 12.';

COMMENT ON COLUMN public.cleaners.email_opted_in IS
  'CAN-SPAM compliant email opt-in. Default true for transactional emails. Per Messaging Spec v1.1 Section 12.';

-- =====================================================================
-- PART B: public.notification_logs (Messaging Spec v1.1 Section 5e)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                 uuid NOT NULL UNIQUE,
  event_type               text NOT NULL,
  quote_request_id         uuid REFERENCES public.quote_requests ON DELETE SET NULL,
  recipient_id             uuid NOT NULL,
  recipient_role           text NOT NULL CHECK (recipient_role IN ('cleaner', 'customer', 'admin')),
  recipient_channel        text NOT NULL CHECK (recipient_channel IN ('sms', 'email')),
  recipient_address        text NOT NULL,
  dedupe_hash              text NOT NULL,
  bucket_window_iso        timestamptz NOT NULL,
  provider                 text NOT NULL CHECK (provider IN ('twilio', 'resend')),
  provider_message_id      text,
  provider_response_raw    jsonb,
  delivery_state           text NOT NULL CHECK (delivery_state IN (
    'queued', 'dispatched', 'accepted', 'delivered',
    'failed', 'bounced', 'unsubscribed', 'rate_limited',
    'quiet_hours', 'duplicate'
  )) DEFAULT 'queued',
  retry_count              integer DEFAULT 0 NOT NULL,
  last_retry_at            timestamptz,
  next_retry_at            timestamptz,
  created_at               timestamptz DEFAULT now() NOT NULL,
  dispatched_at            timestamptz,
  delivered_at             timestamptz,
  failed_at                timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient
  ON public.notification_logs (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_dedupe
  ON public.notification_logs (dedupe_hash, bucket_window_iso);

CREATE INDEX IF NOT EXISTS idx_notification_logs_event_type_state
  ON public.notification_logs (event_type, delivery_state);

CREATE INDEX IF NOT EXISTS idx_notification_logs_retry
  ON public.notification_logs (next_retry_at)
  WHERE delivery_state IN ('failed', 'rate_limited', 'quiet_hours');

CREATE INDEX IF NOT EXISTS idx_notification_logs_provider_msg_id
  ON public.notification_logs (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_notification_logs" ON public.notification_logs;
CREATE POLICY "service_role_full_access_notification_logs"
  ON public.notification_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_read_notification_logs" ON public.notification_logs;
CREATE POLICY "admin_read_notification_logs"
  ON public.notification_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

COMMENT ON TABLE public.notification_logs IS
  'Every SMS and email dispatched by the platform. Tracks idempotency, delivery state, and retry policy. Per Messaging Spec v1.1 Section 5e.';

-- =====================================================================
-- PART C: public.refund_decisions (Messaging Spec v1.1 Section 7)
-- =====================================================================
-- Note: lead_acceptance_id FK to public.lead_acceptances will be added in
-- Phase A4 when that table is created.
CREATE TABLE IF NOT EXISTS public.refund_decisions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_acceptance_id       uuid NOT NULL UNIQUE,
  state                    text NOT NULL CHECK (state IN (
    'pending', 'auto_approved', 'auto_denied',
    'manual_review', 'approved', 'denied',
    'escalated', 'admin_override_approved', 'admin_override_denied'
  )) DEFAULT 'pending',
  trigger_reason           text NOT NULL,
  initial_state_reason     text,
  reviewer_id              uuid,
  reviewer_notes           text,
  refund_amount_cents      integer,
  stripe_refund_id         text,
  stripe_action            text CHECK (stripe_action IN (
    'void_authorization', 'refund_payment', 'no_action'
  )),
  state_history            jsonb DEFAULT '[]'::jsonb NOT NULL,
  sla_breached             boolean DEFAULT false NOT NULL,
  created_at               timestamptz DEFAULT now() NOT NULL,
  decided_at               timestamptz
);

CREATE INDEX IF NOT EXISTS idx_refund_decisions_state
  ON public.refund_decisions (state, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refund_decisions_pending_review
  ON public.refund_decisions (state, created_at)
  WHERE state IN ('manual_review', 'escalated');

CREATE INDEX IF NOT EXISTS idx_refund_decisions_reviewer
  ON public.refund_decisions (reviewer_id)
  WHERE reviewer_id IS NOT NULL;

ALTER TABLE public.refund_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_refund_decisions" ON public.refund_decisions;
CREATE POLICY "service_role_full_access_refund_decisions"
  ON public.refund_decisions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_full_access_refund_decisions" ON public.refund_decisions;
CREATE POLICY "admin_full_access_refund_decisions"
  ON public.refund_decisions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE public.refund_decisions IS
  'Refund decision state machine: pending -> auto_approved/auto_denied/manual_review -> approved/denied/escalated -> admin_override. Per Messaging Spec v1.1 Section 7.';

COMMENT ON COLUMN public.refund_decisions.lead_acceptance_id IS
  'FK to lead_acceptances table. Constraint will be added in Phase A4 when lead_acceptances exists.';

-- =====================================================================
-- PART D: public.marketplace_events (Messaging Spec v1.1 Section 16)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.marketplace_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name          text NOT NULL,
  event_category      text NOT NULL CHECK (event_category IN (
    'lifecycle', 'monetization', 'trust', 'notification', 'admin'
  )),
  actor_id            uuid,
  actor_role          text CHECK (actor_role IN (
    'cleaner', 'customer', 'admin', 'system'
  )),
  subject_id          uuid,
  subject_type        text,
  properties          jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at          timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketplace_events_name_time
  ON public.marketplace_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_events_actor
  ON public.marketplace_events (actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_events_subject
  ON public.marketplace_events (subject_id, created_at DESC)
  WHERE subject_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_events_category
  ON public.marketplace_events (event_category, created_at DESC);

ALTER TABLE public.marketplace_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_marketplace_events" ON public.marketplace_events;
CREATE POLICY "service_role_full_access_marketplace_events"
  ON public.marketplace_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_read_marketplace_events" ON public.marketplace_events;
CREATE POLICY "admin_read_marketplace_events"
  ON public.marketplace_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

COMMENT ON TABLE public.marketplace_events IS
  'Append-only event log for analytics. Captures lead.submitted, lead.accepted, booking.confirmed, refund.issued, etc. Per Messaging Spec v1.1 Section 16.';
