# Claude Code Prompt — Phase A2: Lead Distributions Table

**For Claude Code CLI:** Read everything below the divider and execute it. This prompt creates the `lead_distributions` table — the first new lead-engine table for v1.0. The legacy `public.leads` table is being SUPERSEDED (it's empty, only referenced in legacy bootstrap SQL).

---

## Task

Create the `public.lead_distributions` table per Messaging Spec v1.1 / ADR-001 Section 3 (tier-priority cascade). This table tracks each lead's journey through the cascade engine — which tier window is currently open, which pros got notified, when each window opens/expires, and the lead's overall state.

The legacy `public.leads` table (per the May 9 audit) has 0 rows and is only referenced in dormant bootstrap SQL. It is being superseded by this new table. **Do NOT touch `leads` in this migration** — it will be dropped in a Phase A5 cleanup migration.

## Project Context

- Project ID: `jisjxdsrflheosvodoxk` (BOC Supabase, PRODUCTION)
- Repo: `/Users/danielalvarez/Boss-of-Clean`
- Phase A1 v1.1 was applied successfully on May 9, 2026 (notification_logs, refund_decisions, marketplace_events, plus 18 new cleaners columns)
- Legacy `subscriptions` table is being KEPT as billing audit log (per May 10 decision); `cleaners.subscription_*` columns are cached current state
- Phase A4 will rename `lead_unlocks` → `lead_acceptances` (per May 10 decision)

## Constraints

1. **Read-only diagnostics first.** Inspect the current state of `public.quote_requests` and confirm the FK target exists. Print a summary before writing.
2. **One atomic migration file.** Place at `supabase/migrations/[timestamp]_phase_a2_lead_distributions.sql` with timestamp following project convention.
3. **Use `is_admin()` for admin RLS** — that's the canonical project pattern (matches A1 v1.1 migration).
4. **Use `(select auth.uid())` subquery pattern** in any RLS policy that references the auth user.
5. **Do NOT apply the migration** — leave it staged for human review. I will apply via Supabase MCP after approval.
6. **Defensive `IF NOT EXISTS`** on every CREATE.
7. **Brand contamination check.** No SOTSVC / Sonz of Thunder / non-BOC references.
8. **Do NOT touch the legacy `leads` table.** Supersede only — drop is a separate Phase A5 cleanup migration.

## Step 1: Diagnostic Pass

Run these queries first and print results:

1. Confirm `public.quote_requests` exists and list its primary key column type (we'll FK against it)
2. Confirm `public.lead_distributions` does NOT already exist
3. List any existing tables/types in `public` that might collide with new names
4. Confirm `public.is_admin()` function exists (used in RLS policies)
5. Project ID confirmation: `jisjxdsrflheosvodoxk`

Stop if any blockers. Otherwise proceed to Step 2.

## Step 2: Write the Migration

Create the migration file with this content:

```sql
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
```

## Step 3: Print the Migration File

After creating the migration file, print its full contents to the terminal so I can review it. **Do NOT apply via `supabase db push` or `apply_migration` — leave that to me.**

## Step 4: Verification Queries

Print verification queries I can run AFTER the migration is applied:

```sql
-- Verify table exists with RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'lead_distributions';

-- Verify all columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lead_distributions'
ORDER BY ordinal_position;

-- Verify indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'lead_distributions'
ORDER BY indexname;

-- Verify RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'lead_distributions'
ORDER BY policyname;

-- Verify FK + UNIQUE constraint
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.lead_distributions'::regclass
ORDER BY conname;

-- Verify trigger
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'lead_distributions';
```

## Output Format

```markdown
# Phase A2 Output — Lead Distributions Table

## Step 1: Diagnostic Summary
- quote_requests table exists: yes/no
- quote_requests primary key type: [type]
- lead_distributions does NOT exist: confirmed/conflict
- is_admin() function exists: yes/no
- Project ID confirmed: jisjxdsrflheosvodoxk
- Conflict check: [list any blockers]

## Step 2: Migration File Created
Path: `supabase/migrations/[timestamp]_phase_a2_lead_distributions.sql`

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

When complete, post the full output. Stop. Do not proceed to Phase A3 until I explicitly approve.
