-- =====================================================================
-- DLD-444 — Rename public.cleaners → public.pros
-- =====================================================================
-- Internal table name `cleaners` is misleading now that BOC supports all
-- professional service categories (handyman, HVAC, plumbing, electrical,
-- pest, landscaping, pool, etc). Rename to `pros` to match Thumbtack-tier
-- positioning and the existing `lead_acceptances` table semantics, which
-- already documents itself as "A pro accepting a distributed lead".
--
-- STRATEGY: Expand-contract with a backwards-compat view.
--   - Rename the table cleaners → pros.
--   - Create an auto-updatable view public.cleaners AS SELECT * FROM pros
--     with security_invoker=on so the view honors RLS defined on pros.
--   - All ~590 existing code references to `cleaners` keep working
--     through the view until a follow-up phase sweeps them to `pros`.
--   - FK constraints, RLS policies, triggers, and indexes all follow the
--     renamed table automatically (Postgres relinks by oid). The cosmetic
--     index/constraint/trigger names (cleaners_*, idx_cleaners_*) remain
--     stale-but-functional and will be renamed in a follow-up cleanup.
--
-- WHAT THIS MIGRATION DOES NOT DO (intentional — follow-up tickets):
--   - Does not rename FK columns like `cleaner_id` on 20 dependent tables.
--   - Does not rename sibling tables (cleaner_documents, cleaner_availability,
--     cleaner_blocked_dates).
--   - Does not rename PL/pgSQL function bodies that reference `cleaners`
--     (they continue working through the view).
--   - Does not touch the codebase (134 files, 590 occurrences).
--
-- ROLLBACK (manual, if needed):
--   BEGIN;
--   DROP VIEW IF EXISTS public.cleaners;
--   ALTER TABLE public.pros RENAME TO cleaners;
--   COMMIT;
--
-- Idempotent: each step is guarded so reruns are safe.
-- =====================================================================

BEGIN;

-- =====================================================================
-- PART A: Rename the table
-- =====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='cleaners')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='pros') THEN
    ALTER TABLE public.cleaners RENAME TO pros;
  END IF;
END$$;

-- =====================================================================
-- PART B: Create the backwards-compat view
-- =====================================================================
-- security_invoker=on (Postgres 15+) makes the view execute with the
-- calling role's privileges, so RLS policies on `pros` apply through the
-- view exactly as they did on `cleaners` pre-rename.
--
-- A simple `SELECT * FROM single_table` view is auto-updatable in Postgres,
-- so INSERT/UPDATE/DELETE through `cleaners` routes to `pros` without
-- INSTEAD OF triggers.
CREATE OR REPLACE VIEW public.cleaners
  WITH (security_invoker = on)
  AS SELECT * FROM public.pros;

COMMENT ON VIEW public.cleaners IS
  'DLD-444 backwards-compat view. Aliases public.pros (renamed from cleaners). '
  'Will be dropped after code sweep migrates all references to public.pros.';

-- =====================================================================
-- PART C: Grants on the view
-- =====================================================================
-- Mirror the grants the underlying table had so PostgREST + Supabase JS
-- can hit `cleaners` from anon/authenticated/service_role exactly like before.
-- RLS still gates row visibility per the policies on pros.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cleaners TO anon, authenticated, service_role;

-- =====================================================================
-- PART D: Post-conditions sanity checks
-- =====================================================================
DO $$
DECLARE
  v_table_exists boolean;
  v_view_exists boolean;
  v_fk_count int;
  v_policy_count int;
BEGIN
  -- pros must exist as a table
  SELECT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='pros')
    INTO v_table_exists;
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'DLD-444 sanity: public.pros table not found after rename';
  END IF;

  -- cleaners must exist as a view
  SELECT EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='cleaners')
    INTO v_view_exists;
  IF NOT v_view_exists THEN
    RAISE EXCEPTION 'DLD-444 sanity: public.cleaners backwards-compat view not created';
  END IF;

  -- FK constraints to pros must equal the count we saw on cleaners pre-rename (20)
  SELECT count(*) INTO v_fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type='FOREIGN KEY'
    AND ccu.table_schema='public' AND ccu.table_name='pros';
  IF v_fk_count <> 20 THEN
    RAISE EXCEPTION 'DLD-444 sanity: expected 20 inbound FKs on pros, found %', v_fk_count;
  END IF;

  -- RLS policies must have moved with the table (5 expected)
  SELECT count(*) INTO v_policy_count
  FROM pg_policies WHERE schemaname='public' AND tablename='pros';
  IF v_policy_count <> 5 THEN
    RAISE EXCEPTION 'DLD-444 sanity: expected 5 RLS policies on pros, found %', v_policy_count;
  END IF;
END$$;

COMMIT;
