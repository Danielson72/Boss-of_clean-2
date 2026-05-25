-- =====================================================================
-- DLD-512 (BOC A4) — Drop quote_requests.contact_* PII columns
-- =====================================================================
-- PII WALL — DATABASE LAYER.
--
-- A3 (DLD-511, merged in PR #51) deleted the legacy /leads pay-per-lead
-- flow that was the last writer/reader of the denormalized contact PII on
-- `quote_requests`. The current quote flow is auth-only: it always sets
-- `customer_id = auth.uid()` and NEVER writes contact_*; the PII reveal
-- for live leads resolves at read-time via the customer_id -> users FK
-- join. This migration removes the dormant PII columns so they can never
-- leak again.
--
-- PRE-FLIGHT (verified read-only on prod before writing this migration):
--   - 5 total rows in quote_requests; exactly 3 carry non-NULL contact_*.
--   - All 3 PII rows have customer_id IS NULL (pre-pivot guest stubs).
--     They are confirmed disposable TEST data (Apopka 32712, names
--     "john doe"/"manny"/"manny alvarez", Daniel's own SOTSVC + music
--     brand emails, a repeated/truncated test phone). HITL gate #1.
--   - No CHECK constraints reference contact_* on the live DB.
--   - One partial index (idx_quote_requests_contact_email) references
--     contact_email; dropped explicitly below (would auto-drop anyway).
--   - No views / rules / RLS policies depend on contact_*.
--   - `git grep -E "contact_(name|email|phone)"` on post-A3 main: the only
--     code reference was the dead getQuoteStatus() (zero callers), removed
--     in the same PR as this migration.
--
-- ROLLBACK NOTE: DROP COLUMN is destructive — the PII data is gone after
-- this runs. That is the intent. Step 1 (NULL) is kept as a deliberate,
-- self-documenting two-step per Daniel's NULL-then-drop discipline so the
-- removal of the row data is explicit in the diff. If you would rather
-- hard-delete the 3 orphan guest stubs entirely instead of leaving
-- contact-less rows, see the commented alternative at the bottom.
--
-- HITL: Daniel reviews/approves this SQL (gate #2) before it is applied
-- via Supabase MCP / migration runner. Do NOT auto-apply.
-- =====================================================================

BEGIN;

-- Step 1 — NULL out the denormalized PII on the legacy guest rows.
UPDATE public.quote_requests
SET contact_name  = NULL,
    contact_email = NULL,
    contact_phone = NULL
WHERE contact_name  IS NOT NULL
   OR contact_email IS NOT NULL
   OR contact_phone IS NOT NULL;

-- Step 2 — Drop the partial index that depends on contact_email.
DROP INDEX IF EXISTS public.idx_quote_requests_contact_email;

-- Step 3 — Drop the PII columns.
ALTER TABLE public.quote_requests
  DROP COLUMN IF EXISTS contact_name,
  DROP COLUMN IF EXISTS contact_email,
  DROP COLUMN IF EXISTS contact_phone;

COMMIT;

-- ---------------------------------------------------------------------
-- ALTERNATIVE (only if Daniel confirms hard-delete of the 3 guest stubs):
-- Replace Step 1 above with the following BEFORE the index/column drops.
-- These 3 rows have customer_id IS NULL and no FK children worth keeping.
--
--   DELETE FROM public.quote_requests
--   WHERE customer_id IS NULL
--     AND (contact_name IS NOT NULL
--      OR  contact_email IS NOT NULL
--      OR  contact_phone IS NOT NULL);
-- ---------------------------------------------------------------------
