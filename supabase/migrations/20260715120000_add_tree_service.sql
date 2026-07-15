-- =====================================================================
-- Add "Tree Service" service category
-- =====================================================================
-- Adds a new canonical row to public.service_categories (the DLD-442
-- taxonomy lookup that single-sources the homepage hero dropdown, the
-- services grid, the footer services list, and David's live category
-- knowledge). No schema changes — a single seed INSERT.
--
-- priority_order = 290 sorts it last (current max is 280), a sensible
-- default for a newly added category.
--
-- FLAGS FOR REVIEW (see PR description):
--   * fee_tier = 'standard' (the column default). Tree removal / stump
--     grinding are high-ticket jobs — Daniel may want 'specialty' so the
--     per-lead fee tier matches other trades. Left at 'standard' pending
--     his call.
--   * requires_license_fl = false. Florida has no statewide arborist
--     license, so false is correct as-is; flagged for confirmation.
--
-- slug = 'tree_service' (underscore) to match the existing taxonomy
-- convention — every other slug is snake_case, and the quote form value,
-- pro_categories.category, and canonical_service_slug() all key off it.
--
-- ALREADY APPLIED to production as slug 'tree_service'. This file is kept
-- as the historical record; ON CONFLICT DO NOTHING makes a re-run a no-op.
-- =====================================================================

BEGIN;

INSERT INTO public.service_categories
  (slug, display_name, description, fee_tier, supports_residential, supports_commercial, requires_license_fl, is_active, alias_for, priority_order)
VALUES
  ('tree_service', 'Tree Service', 'Tree trimming, pruning, removal, and stump grinding.', 'standard', TRUE, TRUE, FALSE, TRUE, NULL, 290)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- =====================================================================
-- Post-migration verification (run manually after apply):
--
--   SELECT slug, display_name, fee_tier, priority_order
--   FROM public.service_categories WHERE slug = 'tree_service';
--   -- expect: tree_service | Tree Service | standard | 290
--
--   SELECT count(*) FROM public.service_categories;
--   -- expect: 25 rows (was 24)
-- =====================================================================
