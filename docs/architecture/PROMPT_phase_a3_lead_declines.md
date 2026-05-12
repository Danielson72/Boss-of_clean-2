# Claude Code Prompt — Phase A3: Lead Declines Table

**For Claude Code CLI:** Read everything below the divider and execute it. This prompt creates the `lead_declines` table — a pure greenfield table (no legacy equivalent per the May 9 audit).

---

## Task

Create the `public.lead_declines` table per ADR-001 Section 4c (Decline Lead control / Hole #3) and Messaging Spec v1.1 Section 10c. This table records every time a pro clicks "Decline" on a lead notification, along with the reason picked from the 8-reason controlled list.

This table powers three things:
1. The Decline Lead button in the pro dashboard (marketplace control Hole #3)
2. The cascade trigger when "all eligible pros declined" — used by Phase C cascade engine to skip to next tier immediately
3. Analytics on why pros say no — informs Phase 2 matching algorithm improvements

The legacy audit confirmed there is **no legacy table** for this — `lead_declines` is fully greenfield.

## Project Context

- Project ID: `jisjxdsrflheosvodoxk` (BOC Supabase, PRODUCTION)
- Repo: `/Users/danielalvarez/Boss-of-Clean`
- Phase A1 v1.1 applied successfully on May 9, 2026
- Phase A2 (`lead_distributions`) applied successfully on May 10, 2026
- Phase A4 will rename `lead_unlocks` → `lead_acceptances` (deferred decision per audit)

## Constraints

1. **Read-only diagnostics first.** Inspect current state of `public.cleaners`, `public.lead_distributions`, and `public.quote_requests`. Confirm FK targets exist. Print summary before writing.
2. **One atomic migration file.** Place at `supabase/migrations/[timestamp]_phase_a3_lead_declines.sql` with timestamp following project convention.
3. **Use `is_admin()` for admin RLS** — canonical project pattern.
4. **Use `(select auth.uid())` subquery pattern** in any RLS policy referencing the auth user.
5. **Do NOT apply the migration** — leave staged for human review. Daniel will apply via Supabase MCP after approval.
6. **Defensive `IF NOT EXISTS`** on every CREATE.
7. **Brand contamination check.** No SOTSVC / Sonz of Thunder / non-BOC references.

## Step 1: Diagnostic Pass

Run these queries first and print results:

1. Confirm `public.cleaners` exists and primary key column type
2. Confirm `public.lead_distributions` exists (created in A2) and primary key column type
3. Confirm `public.quote_requests` exists and primary key column type
4. Confirm `public.lead_declines` does NOT already exist
5. Confirm `public.is_admin()` function exists (used in RLS)
6. Project ID: `jisjxdsrflheosvodoxk`

Stop if any blockers. Otherwise proceed to Step 2.

## Step 2: Write the Migration

Create the migration file with this content:

```sql
-- =====================================================================
-- Phase A3 — Lead Declines Table
-- =====================================================================
-- Records every time a pro clicks "Decline" on a lead notification.
-- Used to:
--   1. Power the Decline Lead button (marketplace control Hole #3)
--   2. Trigger immediate cascade when all eligible pros decline
--   3. Provide analytics on why pros say no
--
-- Per ADR-001 Section 4c and Messaging Spec v1.1 Section 10c.
--
-- Pure greenfield — no legacy equivalent (confirmed by May 9 audit).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.lead_declines (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was declined and by whom
  lead_distribution_id     uuid NOT NULL REFERENCES public.lead_distributions ON DELETE CASCADE,
  quote_request_id         uuid NOT NULL REFERENCES public.quote_requests ON DELETE CASCADE,
  cleaner_id               uuid NOT NULL REFERENCES public.cleaners ON DELETE CASCADE,

  -- Tier the pro was at when they declined (denormalized for analytics)
  tier_at_decline          text NOT NULL CHECK (tier_at_decline IN ('pro', 'basic', 'free')),

  -- Why they declined — from the 8-reason controlled list per ADR Section 4c
  reason_code              text NOT NULL CHECK (reason_code IN (
    'too_far',                  -- Too far from my service area
    'too_busy',                 -- Too busy / fully booked
    'wrong_service_type',       -- Wrong service type for my business
    'budget_too_low',           -- Customer budget appears too low
    'duplicate_customer',       -- Duplicate customer (already serviced or in dispute)
    'unsafe_request',           -- Unsafe or suspicious request
    'commercial_only_request',  -- Commercial-only request (I do residential)
    'residential_only_request'  -- Residential-only request (I do commercial)
  )),

  -- Optional pro-provided notes
  notes                    text,

  -- Time-to-decline tracking (analytics: how fast do pros say no?)
  notified_at              timestamptz,           -- When the pro got the SMS/email
  declined_at              timestamptz DEFAULT now() NOT NULL,
  time_to_decline_seconds  integer GENERATED ALWAYS AS (
    CASE
      WHEN notified_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (declined_at - notified_at))::integer
      ELSE NULL
    END
  ) STORED,

  -- Timestamp
  created_at               timestamptz DEFAULT now() NOT NULL
);

-- Indexes ----------------------------------------------------------------

-- Hot path: "did all pros at this tier decline?" (cascade trigger check)
CREATE INDEX IF NOT EXISTS idx_lead_declines_distribution
  ON public.lead_declines (lead_distribution_id);

-- Per-pro lookup: "which leads has this pro declined recently?" (rate-limit/abuse detection)
CREATE INDEX IF NOT EXISTS idx_lead_declines_cleaner_recent
  ON public.lead_declines (cleaner_id, declined_at DESC);

-- Analytics: most common decline reasons over time
CREATE INDEX IF NOT EXISTS idx_lead_declines_reason_time
  ON public.lead_declines (reason_code, declined_at DESC);

-- Quote-request lookup: "show all declines for this lead" (admin debugging)
CREATE INDEX IF NOT EXISTS idx_lead_declines_quote_request
  ON public.lead_declines (quote_request_id, declined_at DESC);

-- Constraints ------------------------------------------------------------

-- A given pro can only decline a given distribution once
ALTER TABLE public.lead_declines
  DROP CONSTRAINT IF EXISTS lead_declines_distribution_cleaner_unique;
ALTER TABLE public.lead_declines
  ADD CONSTRAINT lead_declines_distribution_cleaner_unique
  UNIQUE (lead_distribution_id, cleaner_id);

-- RLS --------------------------------------------------------------------

ALTER TABLE public.lead_declines ENABLE ROW LEVEL SECURITY;

-- Service role full access (cron jobs, edge functions, server-side code)
DROP POLICY IF EXISTS "service_role_full_access_lead_declines" ON public.lead_declines;
CREATE POLICY "service_role_full_access_lead_declines"
  ON public.lead_declines
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin full access via canonical is_admin() function
DROP POLICY IF EXISTS "admin_full_access_lead_declines" ON public.lead_declines;
CREATE POLICY "admin_full_access_lead_declines"
  ON public.lead_declines
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Pros can INSERT declines for themselves only
DROP POLICY IF EXISTS "pros_insert_own_declines" ON public.lead_declines;
CREATE POLICY "pros_insert_own_declines"
  ON public.lead_declines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cleaners c
      WHERE c.id = public.lead_declines.cleaner_id
        AND c.user_id = (select auth.uid())
    )
  );

-- Pros can SELECT their own decline history
DROP POLICY IF EXISTS "pros_read_own_declines" ON public.lead_declines;
CREATE POLICY "pros_read_own_declines"
  ON public.lead_declines
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cleaners c
      WHERE c.id = public.lead_declines.cleaner_id
        AND c.user_id = (select auth.uid())
    )
  );

-- NOTE: customers do NOT see declines. They never need to know which specific pro declined
-- their lead, only that the lead is still being matched. Surface the cascade state via
-- lead_distributions, not lead_declines.

-- Comments ---------------------------------------------------------------

COMMENT ON TABLE public.lead_declines IS
  'Records every Decline click by pros. Powers Hole #3 (Decline Lead), cascade trigger when all pros decline, and analytics on decline reasons. Per ADR-001 Section 4c.';

COMMENT ON COLUMN public.lead_declines.lead_distribution_id IS
  'FK to the lead_distributions row that was declined. ON DELETE CASCADE so declines disappear with the distribution.';

COMMENT ON COLUMN public.lead_declines.tier_at_decline IS
  'Denormalized tier the pro was at when they declined. Useful for analytics without joining lead_distributions.';

COMMENT ON COLUMN public.lead_declines.reason_code IS
  '8 controlled reason codes per ADR Section 4c. UI maps these to human-readable labels in the Decline modal.';

COMMENT ON COLUMN public.lead_declines.time_to_decline_seconds IS
  'Computed: how long after notification did the pro decline? Used for analytics (fast no = wrong vertical match; slow no = considered then declined).';
```

## Step 3: Print the Migration File

After creating the migration file, print its full contents to terminal so Daniel can review. **Do NOT apply via `supabase db push` or `apply_migration` — leave that to Daniel.**

## Step 4: Verification Queries

Print verification queries to run AFTER applying:

```sql
-- Verify table exists with RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'lead_declines';

-- Verify all columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lead_declines'
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'lead_declines'
ORDER BY indexname;

-- Verify RLS policies
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'lead_declines'
ORDER BY policyname;

-- Verify FK constraints
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.lead_declines'::regclass
ORDER BY conname;
```

## Output Format

```markdown
# Phase A3 Output — Lead Declines Table

## Step 1: Diagnostic Summary
- cleaners table exists: yes/no
- lead_distributions table exists: yes/no
- quote_requests table exists: yes/no
- lead_declines does NOT exist: confirmed/conflict
- is_admin() function exists: yes/no
- Project ID confirmed: jisjxdsrflheosvodoxk
- Conflict check: [list any blockers]

## Step 2: Migration File Created
Path: `supabase/migrations/[timestamp]_phase_a3_lead_declines.sql`

## Step 3: Migration Contents
```sql
[full SQL]
```

## Step 4: Post-Apply Verification Queries
```sql
[verification SQL]
```

## Notes / Flags
[Any deviations, concerns, or things to know before applying]

## Ready for Daniel's Review
Migration file is staged but NOT applied. Awaiting approval to apply via Supabase MCP.
```

When complete, post the full output. Stop. Do not proceed to Phase A4 until Daniel explicitly approves.
