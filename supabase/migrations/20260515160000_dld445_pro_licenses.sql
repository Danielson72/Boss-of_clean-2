-- =====================================================================
-- DLD-445 — public.pro_licenses + admin verification scaffold
-- =====================================================================
-- FL DBPR-licensed trades (plumbing, HVAC, electrical, certain general
-- contractors) require state license verification before they can accept
-- leads on the platform. This migration creates the scaffold:
--
--   1. `pro_licenses` table — one row per (pro, license_type, license_number)
--      tuple. Tracks verification status, issuing authority, document
--      uploads, expiration, and last-checked timestamps for the future
--      automated DBPR API integration.
--   2. RLS policies — pros can read/insert/update their OWN rows (but
--      cannot self-set `verification_status` — that column is guarded by
--      a trigger that resets non-admin updates back to 'pending').
--      Admins (`public.is_admin()`) and `service_role` have full access.
--   3. Indexes on the common admin-queue and cron-sweep predicates.
--   4. `set_updated_at()` trigger for housekeeping.
--
-- DEPENDS ON:
--   - public.pros (renamed from public.cleaners in DLD-444 migration
--     `20260515152653_dld444_rename_cleaners_to_pros.sql`). Timestamp
--     ordering ensures DLD-444 runs first.
--   - public.is_admin() helper (already used by Phase A1 policies).
--   - public.set_updated_at() trigger function (already used elsewhere).
--
-- WHAT THIS MIGRATION INTENTIONALLY DOES NOT DO:
--   - Does NOT block lead acceptance for unverified licensed-trade pros
--     (that's an enforcement layer wired into /api/leads/unlock — separate
--     Phase E ticket).
--   - Does NOT integrate with the FL DBPR public lookup API. `dbpr_status`
--     and `last_checked_at` columns are stubs the future cron will fill.
--   - Does NOT add a "License Verified" badge to the public pro profile
--     (separate Phase C+ UX ticket).
--   - Does NOT add 6-month re-verification cron. `expires_at` exists; the
--     sweep runs in a follow-up.
--
-- Idempotent. All CREATE/ADD use IF NOT EXISTS guards.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PART A: pro_licenses table
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.pro_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id uuid NOT NULL REFERENCES public.pros(id) ON DELETE CASCADE,

  -- Trade category. Free text for now (e.g. 'plumbing', 'hvac',
  -- 'electrical', 'general_contractor'). A future migration may pin this
  -- to a controlled enum once Phase E category taxonomy stabilizes.
  license_type text NOT NULL,
  license_number text NOT NULL,
  issuing_state text NOT NULL DEFAULT 'FL',
  issuing_authority text NOT NULL DEFAULT 'FL_DBPR',

  -- Manual verification workflow ----------------------------------------
  verification_status text NOT NULL DEFAULT 'pending',
  submitted_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  verified_at timestamptz,
  verified_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  rejection_reason text,

  -- Expiration + future automated DBPR lookups --------------------------
  expires_at timestamptz,
  dbpr_status text,
  last_checked_at timestamptz,

  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pro_licenses_verification_status_check
    CHECK (verification_status IN ('pending','verified','rejected','expired'))
);

-- Prevent duplicates: a pro can register a given (license_type, number)
-- exactly once per issuing authority.
CREATE UNIQUE INDEX IF NOT EXISTS pro_licenses_unique_per_pro
  ON public.pro_licenses (pro_id, license_type, license_number, issuing_authority);

-- Admin queue: filter pending rows fast.
CREATE INDEX IF NOT EXISTS idx_pro_licenses_verification_status
  ON public.pro_licenses (verification_status)
  WHERE verification_status IN ('pending','expired');

-- Pro dashboard + lead-eligibility join.
CREATE INDEX IF NOT EXISTS idx_pro_licenses_pro_id
  ON public.pro_licenses (pro_id);

-- Future expiration sweep.
CREATE INDEX IF NOT EXISTS idx_pro_licenses_expires_at
  ON public.pro_licenses (expires_at)
  WHERE expires_at IS NOT NULL AND verification_status = 'verified';

COMMENT ON TABLE public.pro_licenses IS
  'DLD-445. Per-pro license records for FL DBPR-licensed trades (plumbing, HVAC, electrical, general contractor over $ threshold). Verified manually by admins in v1; FL DBPR API integration is a follow-up ticket.';

COMMENT ON COLUMN public.pro_licenses.verification_status IS
  'pending (default on insert) | verified | rejected | expired. Pros cannot self-set this; trigger resets non-admin attempts to ''pending''.';

COMMENT ON COLUMN public.pro_licenses.submitted_documents IS
  'JSON array of supporting document references: [{ "url": "...", "label": "...", "uploaded_at": "..." }, ...]. Storage path lives in the existing documents/ bucket.';

COMMENT ON COLUMN public.pro_licenses.dbpr_status IS
  'Snapshot of the FL DBPR public-lookup response (Active / Expired / Null & Void / Delinquent). Populated by the future automated cron — manually verified rows leave this null.';

COMMENT ON COLUMN public.pro_licenses.last_checked_at IS
  'Last time the automated DBPR cron re-fetched status. Distinct from verified_at (manual admin sign-off).';

-- =====================================================================
-- PART B: updated_at trigger
-- =====================================================================
DROP TRIGGER IF EXISTS set_pro_licenses_updated_at ON public.pro_licenses;
CREATE TRIGGER set_pro_licenses_updated_at
  BEFORE UPDATE ON public.pro_licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- PART C: guard verification_status against pro self-promotion
-- =====================================================================
-- Pros can update most fields on their own row (e.g. submit new
-- documents, fix a typo in license_number), but they MUST NOT be able
-- to flip verification_status to 'verified' or set verified_at /
-- verified_by themselves. service_role bypasses RLS, and admins go
-- through is_admin(); both legitimate paths therefore skip this guard.
CREATE OR REPLACE FUNCTION public.pro_licenses_guard_verification_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- service_role and admins are allowed to set verification columns.
  -- For anyone else, force these columns back to their pre-update values
  -- (or NULL for verified_at/verified_by on insert path).
  IF current_setting('role', true) = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Self-submissions always start as pending with no audit data.
    NEW.verification_status := 'pending';
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
    NEW.rejection_reason := NULL;
    NEW.dbpr_status := NULL;
    NEW.last_checked_at := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE path: keep audit/verification columns frozen.
  NEW.verification_status := OLD.verification_status;
  NEW.verified_at := OLD.verified_at;
  NEW.verified_by := OLD.verified_by;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.dbpr_status := OLD.dbpr_status;
  NEW.last_checked_at := OLD.last_checked_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pro_licenses_guard_verification_columns
  ON public.pro_licenses;
CREATE TRIGGER pro_licenses_guard_verification_columns
  BEFORE INSERT OR UPDATE ON public.pro_licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.pro_licenses_guard_verification_columns();

-- =====================================================================
-- PART D: RLS
-- =====================================================================
ALTER TABLE public.pro_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_licenses FORCE ROW LEVEL SECURITY;

-- service_role: unrestricted (Edge Functions, server-side cron).
DROP POLICY IF EXISTS "service_role_full_access_pro_licenses"
  ON public.pro_licenses;
CREATE POLICY "service_role_full_access_pro_licenses"
  ON public.pro_licenses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins: full read/write through is_admin().
DROP POLICY IF EXISTS "admin_full_access_pro_licenses"
  ON public.pro_licenses;
CREATE POLICY "admin_full_access_pro_licenses"
  ON public.pro_licenses
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Pros: read their own license rows (ownership via pros.user_id = auth.uid()).
DROP POLICY IF EXISTS "pros_read_own_licenses"
  ON public.pro_licenses;
CREATE POLICY "pros_read_own_licenses"
  ON public.pro_licenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pros p
      WHERE p.id = public.pro_licenses.pro_id
        AND p.user_id = (select auth.uid())
    )
  );

-- Pros: insert their own license rows. The trigger above forces
-- verification_status='pending' regardless of the submitted value.
DROP POLICY IF EXISTS "pros_insert_own_licenses"
  ON public.pro_licenses;
CREATE POLICY "pros_insert_own_licenses"
  ON public.pro_licenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.pros p
      WHERE p.id = public.pro_licenses.pro_id
        AND p.user_id = (select auth.uid())
    )
  );

-- Pros: update their own license rows (e.g. resubmit docs after a
-- rejection). The trigger above freezes verification_status,
-- verified_at, verified_by, rejection_reason, dbpr_status, and
-- last_checked_at so this path cannot self-promote.
DROP POLICY IF EXISTS "pros_update_own_licenses"
  ON public.pro_licenses;
CREATE POLICY "pros_update_own_licenses"
  ON public.pro_licenses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pros p
      WHERE p.id = public.pro_licenses.pro_id
        AND p.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.pros p
      WHERE p.id = public.pro_licenses.pro_id
        AND p.user_id = (select auth.uid())
    )
  );

-- Pros: delete their own license rows (e.g. removed wrong type).
DROP POLICY IF EXISTS "pros_delete_own_licenses"
  ON public.pro_licenses;
CREATE POLICY "pros_delete_own_licenses"
  ON public.pro_licenses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pros p
      WHERE p.id = public.pro_licenses.pro_id
        AND p.user_id = (select auth.uid())
    )
  );

-- =====================================================================
-- PART E: Post-conditions sanity checks
-- =====================================================================
DO $$
DECLARE
  v_policy_count int;
  v_index_count int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='pro_licenses') THEN
    RAISE EXCEPTION 'DLD-445 sanity: public.pro_licenses not created';
  END IF;

  SELECT count(*) INTO v_policy_count
  FROM pg_policies WHERE schemaname='public' AND tablename='pro_licenses';
  IF v_policy_count <> 6 THEN
    RAISE EXCEPTION 'DLD-445 sanity: expected 6 RLS policies on pro_licenses, found %', v_policy_count;
  END IF;

  SELECT count(*) INTO v_index_count
  FROM pg_indexes WHERE schemaname='public' AND tablename='pro_licenses';
  -- 4 explicit indexes + the implicit PK index = 5 total.
  IF v_index_count < 4 THEN
    RAISE EXCEPTION 'DLD-445 sanity: expected at least 4 indexes on pro_licenses, found %', v_index_count;
  END IF;
END$$;

COMMIT;

-- =====================================================================
-- Manual rollback (if ever needed):
-- =====================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS pro_licenses_guard_verification_columns ON public.pro_licenses;
-- DROP FUNCTION IF EXISTS public.pro_licenses_guard_verification_columns();
-- DROP TABLE IF EXISTS public.pro_licenses;
-- COMMIT;
