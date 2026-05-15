-- =====================================================================
-- DLD-449 — Pro service category selection (primary + secondary)
-- =====================================================================
-- A pro signs up and must declare which service categories they offer.
-- Lead matching/cascade routes leads to pros whose primary OR secondary
-- category matches `lead.service_type`, weighting primary above secondary.
--
-- This migration introduces:
--   * public.pros.primary_category (nullable FK -> service_categories.slug)
--   * public.pro_categories join table (pro_id, category, is_primary)
--   * RLS policies that mirror public.pros (own profile RW, public can
--     read approved pros' categories, admins all)
--   * Sync trigger on pros.primary_category that keeps pro_categories
--     in lockstep
--   * Backfill from the legacy pros.services[] column for existing rows
--     (primary stays NULL; pros pick on next edit)
--
-- Out of scope (follow-up tickets):
--   * Removing the legacy pros.services[] column (kept populated by the
--     app layer as [primary, ...secondary] for backwards compat with the
--     ~30 codepaths that still read it).
--   * Per-category residential/commercial flag on a pro (board flagged
--     as may-be-follow-up).
--   * Lead-fee-tier overrides per pro (DLD-446).
--
-- Idempotent. Wrapped in a transaction.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PART A: pros.primary_category column
-- ---------------------------------------------------------------------
ALTER TABLE public.pros
  ADD COLUMN IF NOT EXISTS primary_category TEXT
    REFERENCES public.service_categories(slug)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

COMMENT ON COLUMN public.pros.primary_category IS
  'DLD-449. The pro''s primary service category — single FK into service_categories.slug. NULL allowed for legacy rows and mid-onboarding drafts. UI guarantees it is set before approval.';

CREATE INDEX IF NOT EXISTS idx_pros_primary_category
  ON public.pros(primary_category)
  WHERE primary_category IS NOT NULL;

-- ---------------------------------------------------------------------
-- PART B: pro_categories join table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pro_categories (
  pro_id      UUID NOT NULL REFERENCES public.pros(id) ON DELETE CASCADE,
  category    TEXT NOT NULL REFERENCES public.service_categories(slug)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pro_id, category)
);

COMMENT ON TABLE public.pro_categories IS
  'DLD-449. Many-to-many: a pro can offer multiple service categories. Exactly one row per pro may have is_primary=true (enforced by a partial unique index). Kept in sync with pros.primary_category via trigger.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_pro_categories_one_primary_per_pro
  ON public.pro_categories(pro_id)
  WHERE is_primary;

CREATE INDEX IF NOT EXISTS idx_pro_categories_category
  ON public.pro_categories(category);

CREATE INDEX IF NOT EXISTS idx_pro_categories_pro
  ON public.pro_categories(pro_id);

-- ---------------------------------------------------------------------
-- PART C: RLS policies on pro_categories
-- ---------------------------------------------------------------------
ALTER TABLE public.pro_categories ENABLE ROW LEVEL SECURITY;

-- The pro themself: full CRUD on their own rows.
DROP POLICY IF EXISTS pro_categories_owner_select ON public.pro_categories;
CREATE POLICY pro_categories_owner_select
  ON public.pro_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pros p
      WHERE p.id = pro_categories.pro_id
        AND p.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS pro_categories_owner_insert ON public.pro_categories;
CREATE POLICY pro_categories_owner_insert
  ON public.pro_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pros p
      WHERE p.id = pro_categories.pro_id
        AND p.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS pro_categories_owner_update ON public.pro_categories;
CREATE POLICY pro_categories_owner_update
  ON public.pro_categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pros p
      WHERE p.id = pro_categories.pro_id
        AND p.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pros p
      WHERE p.id = pro_categories.pro_id
        AND p.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS pro_categories_owner_delete ON public.pro_categories;
CREATE POLICY pro_categories_owner_delete
  ON public.pro_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.pros p
      WHERE p.id = pro_categories.pro_id
        AND p.user_id = (SELECT auth.uid())
    )
  );

-- Public read access for approved pros' categories (mirrors
-- public_can_view_approved_cleaners on pros).
DROP POLICY IF EXISTS pro_categories_public_view_approved ON public.pro_categories;
CREATE POLICY pro_categories_public_view_approved
  ON public.pro_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pros p
      WHERE p.id = pro_categories.pro_id
        AND p.approval_status = 'approved'
    )
  );

-- Admins: full access.
DROP POLICY IF EXISTS pro_categories_admin_all ON public.pro_categories;
CREATE POLICY pro_categories_admin_all
  ON public.pro_categories
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- PART D: Sync trigger — pros.primary_category -> pro_categories.is_primary
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_pros_primary_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canonical TEXT;
BEGIN
  -- No-op when primary_category did not change.
  IF TG_OP = 'UPDATE' AND NEW.primary_category IS NOT DISTINCT FROM OLD.primary_category THEN
    RETURN NEW;
  END IF;

  IF NEW.primary_category IS NULL THEN
    -- Clear any existing primary flag.
    UPDATE public.pro_categories
       SET is_primary = FALSE,
           updated_at = now()
     WHERE pro_id = NEW.id
       AND is_primary = TRUE;
    RETURN NEW;
  END IF;

  -- Resolve to canonical slug (collapses legacy aliases like
  -- pool_cleaning -> pool_service).
  v_canonical := public.canonical_service_slug(NEW.primary_category);
  IF v_canonical IS NULL THEN
    RAISE EXCEPTION 'DLD-449: primary_category % is not a known service category', NEW.primary_category;
  END IF;

  -- Demote everyone else first to satisfy the partial unique index.
  UPDATE public.pro_categories
     SET is_primary = FALSE,
         updated_at = now()
   WHERE pro_id = NEW.id
     AND is_primary = TRUE
     AND category <> v_canonical;

  -- Upsert the chosen primary row.
  INSERT INTO public.pro_categories (pro_id, category, is_primary)
       VALUES (NEW.id, v_canonical, TRUE)
  ON CONFLICT (pro_id, category)
  DO UPDATE SET is_primary = TRUE,
                updated_at = now();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_pros_primary_category IS
  'DLD-449. Mirrors pros.primary_category into pro_categories.is_primary so the join table is the single matching source for lead distribution.';

DROP TRIGGER IF EXISTS trg_sync_pros_primary_category ON public.pros;
CREATE TRIGGER trg_sync_pros_primary_category
  AFTER INSERT OR UPDATE OF primary_category ON public.pros
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_pros_primary_category();

-- ---------------------------------------------------------------------
-- PART E: Backfill from legacy pros.services[]
-- ---------------------------------------------------------------------
-- Resolve each legacy slug through canonical_service_slug() so aliases
-- collapse. Skip any slug that doesn't resolve (defensive — should not
-- happen given the current 4 rows, but protects forward-compat).
INSERT INTO public.pro_categories (pro_id, category, is_primary)
SELECT
  p.id,
  public.canonical_service_slug(s.slug) AS category,
  FALSE
FROM public.pros p
CROSS JOIN LATERAL UNNEST(COALESCE(p.services, ARRAY[]::TEXT[])) AS s(slug)
WHERE public.canonical_service_slug(s.slug) IS NOT NULL
ON CONFLICT (pro_id, category) DO NOTHING;

-- ---------------------------------------------------------------------
-- PART F: Sanity checks
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_column_exists boolean;
  v_table_exists boolean;
  v_trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pros'
      AND column_name = 'primary_category'
  ) INTO v_column_exists;
  IF NOT v_column_exists THEN
    RAISE EXCEPTION 'DLD-449 sanity: public.pros.primary_category missing';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'pro_categories'
  ) INTO v_table_exists;
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'DLD-449 sanity: public.pro_categories missing';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_pros_primary_category'
  ) INTO v_trigger_exists;
  IF NOT v_trigger_exists THEN
    RAISE EXCEPTION 'DLD-449 sanity: sync trigger missing';
  END IF;
END$$;

COMMIT;
