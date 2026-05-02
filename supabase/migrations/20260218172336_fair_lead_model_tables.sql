-- ============================================================
-- Fair Lead Model — Core Tables
-- 6 new tables for Boss of Clean lead marketplace
-- Applied: 2026-02-18 via Supabase MCP
-- ============================================================

-- 1. Create lead_fee_tier enum
DO $$ BEGIN
  CREATE TYPE public.lead_fee_tier AS ENUM ('standard', 'deep_clean', 'specialty');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create lead_refund_reason enum
DO $$ BEGIN
  CREATE TYPE public.lead_refund_reason AS ENUM (
    'wrong_contact_info',
    'outside_service_area',
    'not_a_real_lead',
    'duplicate_lead',
    'customer_cancelled_before_contact',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Create lead_refund_status enum
DO $$ BEGIN
  CREATE TYPE public.lead_refund_status AS ENUM ('pending', 'approved', 'denied');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLE 1: lead_unlocks
-- Tracks paid unlocks + competition cap (max 3 per lead)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  cleaner_id uuid NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
  fee_tier public.lead_fee_tier NOT NULL DEFAULT 'standard',
  amount_cents integer NOT NULL,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'credited')),
  unlocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quote_request_id, cleaner_id)
);

-- Competition cap trigger: max 3 pros per lead
CREATE OR REPLACE FUNCTION public.check_lead_competition_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  unlock_count integer;
BEGIN
  SELECT COUNT(*) INTO unlock_count
  FROM public.lead_unlocks
  WHERE quote_request_id = NEW.quote_request_id
    AND status IN ('paid', 'credited');

  IF unlock_count >= 3 THEN
    RAISE EXCEPTION 'Competition cap reached: maximum 3 pros can unlock this lead'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_lead_competition_cap ON public.lead_unlocks;
CREATE TRIGGER enforce_lead_competition_cap
  BEFORE INSERT ON public.lead_unlocks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_lead_competition_cap();

-- ============================================================
-- TABLE 2: pro_spending_caps
-- Weekly spending limits controlled by pros
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pro_spending_caps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id uuid NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE UNIQUE,
  weekly_cap_cents integer NOT NULL DEFAULT 10000,
  current_week_spent_cents integer NOT NULL DEFAULT 0,
  week_started_at timestamptz NOT NULL DEFAULT date_trunc('week', now()),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 3: customer_credits
-- $10 credits from hire confirmations, 90-day expiry
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL DEFAULT 1000,
  reason text NOT NULL DEFAULT 'hire_confirmation',
  source_hire_confirmation_id uuid,
  redeemed boolean NOT NULL DEFAULT false,
  redeemed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE 4: hire_confirmations
-- Customer confirms which pro they hired
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hire_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cleaner_id uuid NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  credit_issued boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quote_request_id, customer_id)
);

-- FK from customer_credits to hire_confirmations
ALTER TABLE public.customer_credits
  ADD CONSTRAINT fk_customer_credits_hire_confirmation
  FOREIGN KEY (source_hire_confirmation_id)
  REFERENCES public.hire_confirmations(id)
  ON DELETE SET NULL;

-- ============================================================
-- TABLE 5: lead_refund_requests
-- Lead Quality Guarantee refund system
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_unlock_id uuid NOT NULL REFERENCES public.lead_unlocks(id) ON DELETE CASCADE,
  cleaner_id uuid NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
  reason public.lead_refund_reason NOT NULL,
  evidence text,
  status public.lead_refund_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  refund_amount_cents integer,
  stripe_refund_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lead_unlock_id)
);

-- ============================================================
-- TABLE 6: pro_lead_credits
-- Included unlock credits per subscription tier/billing period
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pro_lead_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id uuid NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
  tier public.subscription_tier NOT NULL,
  credits_total integer NOT NULL,
  credits_used integer NOT NULL DEFAULT 0,
  billing_period_start timestamptz NOT NULL,
  billing_period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cleaner_id, billing_period_start)
);
