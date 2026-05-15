-- =====================================================================
-- DLD-442 — Expand service_type taxonomy via service_categories lookup
-- =====================================================================
-- BOC is positioning as a Thumbtack/Angi/HomeAdvisor competitor — a
-- marketplace for ANY pro service, residential AND commercial.
--
-- Goal: introduce a canonical lookup table for service categories so
-- that quote_requests / bookings / services_pricing share one source of
-- truth, and so that future tickets (DLD-443 is_commercial flag, DLD-445
-- license verification, DLD-446 lead-fee-tier review) can layer cleanly
-- on top of it.
--
-- Design choice — lookup table, NOT enum:
--   * Live columns (quote_requests.service_type, bookings.service_type,
--     services_pricing.service_type, cleaners.services[]) are already
--     plain text — there is no `service_type` enum in production.
--   * A lookup table lets us evolve fee tiers, display names, license
--     requirements, and the residential/commercial axis without
--     ALTER TYPE ... RENAME VALUE / pg_enum surgery.
--   * FK back to the lookup is added as a soft constraint via
--     a CHECK + trigger pattern in a follow-up; this migration only
--     introduces the lookup so existing data is preserved bit-for-bit.
--
-- Existing slugs already in production (from services_pricing master rows):
--   residential, commercial, deep_cleaning, pressure_washing,
--   window_cleaning, carpet_cleaning, move_in_out, post_construction,
--   maid_service, office_cleaning, mobile_car_detailing, str_turnover,
--   pool_cleaning, landscaping, air_duct_cleaning
--
-- New slugs added per DLD-442:
--   handyman, hvac, plumbing, electrical, pest_control, gutter_cleaning,
--   junk_removal, pool_service, mobile_detailing
--
--   * `mobile_detailing` is added as the canonical board-spec slug; the
--     legacy `mobile_car_detailing` row is preserved and aliased.
--   * `pool_service` is added as the broader board-spec slug; the
--     legacy `pool_cleaning` row is preserved and aliased.
--
-- Fee tier mapping uses the existing public.lead_fee_tier enum:
--   standard | deep_clean | specialty
-- The actual dollar amounts live elsewhere (lead_fee_rules) and are out
-- of scope here — DLD-446 will tune them.
--
-- Wrapped in a single transaction so partial failure rolls back cleanly.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. service_categories lookup table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_categories (
  slug                TEXT PRIMARY KEY,
  display_name        TEXT NOT NULL,
  description         TEXT,
  fee_tier            public.lead_fee_tier NOT NULL DEFAULT 'standard',
  supports_residential BOOLEAN NOT NULL DEFAULT TRUE,
  supports_commercial  BOOLEAN NOT NULL DEFAULT TRUE,
  requires_license_fl  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  alias_for           TEXT REFERENCES public.service_categories(slug),
  priority_order      INTEGER NOT NULL DEFAULT 100,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_categories_slug_lower CHECK (slug = lower(slug))
);

COMMENT ON TABLE  public.service_categories IS
  'Canonical lookup of service category slugs used across quote_requests, bookings, services_pricing, and cleaner profiles. Source of truth for DLD-442 taxonomy expansion.';
COMMENT ON COLUMN public.service_categories.fee_tier IS
  'Lead fee tier mapping (DLD-446 will tune dollar amounts in lead_fee_rules).';
COMMENT ON COLUMN public.service_categories.requires_license_fl IS
  'TRUE for trades that require a Florida professional license (DLD-445 verification).';
COMMENT ON COLUMN public.service_categories.alias_for IS
  'Optional pointer to a canonical slug. Used to keep legacy rows (mobile_car_detailing, pool_cleaning) compatible while the board-spec slugs become canonical.';

CREATE INDEX IF NOT EXISTS idx_service_categories_active
  ON public.service_categories(slug)
  WHERE is_active;

-- updated_at trigger (matches pattern used elsewhere in the codebase)
CREATE OR REPLACE FUNCTION public.tg_service_categories_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_categories_set_updated_at ON public.service_categories;
CREATE TRIGGER service_categories_set_updated_at
BEFORE UPDATE ON public.service_categories
FOR EACH ROW EXECUTE FUNCTION public.tg_service_categories_set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Seed canonical categories
--    Order: legacy slugs first (so alias_for FKs resolve), then new slugs,
--    then aliases.
-- ---------------------------------------------------------------------

-- Legacy / already-in-production slugs (preserve as-is)
INSERT INTO public.service_categories
  (slug, display_name, description, fee_tier, supports_residential, supports_commercial, requires_license_fl, priority_order)
VALUES
  ('residential',          'Residential Cleaning',       'General house cleaning for Florida homes.',                       'standard',  TRUE,  FALSE, FALSE,  10),
  ('commercial',           'Commercial Cleaning',        'Office, retail, medical, and business space cleaning.',           'standard',  FALSE, TRUE,  FALSE,  20),
  ('deep_cleaning',        'Deep Cleaning',              'Top-to-bottom detailed sanitization.',                            'deep_clean',TRUE,  TRUE,  FALSE,  30),
  ('maid_service',         'Maid Service',               'Recurring weekly / biweekly / monthly housekeeping.',             'standard',  TRUE,  FALSE, FALSE,  40),
  ('office_cleaning',      'Office Cleaning',            'Daily / weekly office janitorial.',                               'standard',  FALSE, TRUE,  FALSE,  50),
  ('move_in_out',          'Move In / Out Cleaning',     'Comprehensive move-in or move-out cleaning.',                     'deep_clean',TRUE,  TRUE,  FALSE,  60),
  ('post_construction',    'Post-Construction Cleaning', 'Cleanup after renovation or new build.',                          'specialty', TRUE,  TRUE,  FALSE,  70),
  ('str_turnover',         'STR Turnover Cleaning',      'Same-day turnover for Airbnb, VRBO, vacation rentals.',           'standard',  TRUE,  TRUE,  FALSE,  80),
  ('window_cleaning',      'Window Cleaning',            'Interior / exterior window, screen, and track cleaning.',         'standard',  TRUE,  TRUE,  FALSE,  90),
  ('carpet_cleaning',      'Carpet Cleaning',            'Hot water extraction, stain removal, deodorizing.',               'specialty', TRUE,  TRUE,  FALSE, 100),
  ('pressure_washing',     'Pressure Washing',           'Driveways, patios, decks, sidewalks, building exteriors.',        'specialty', TRUE,  TRUE,  FALSE, 110),
  ('air_duct_cleaning',    'Air Duct Cleaning',          'HVAC duct cleaning, mold/dust/allergen removal.',                 'specialty', TRUE,  TRUE,  FALSE, 120),
  ('pool_cleaning',        'Pool Cleaning',              'Pool maintenance, chemical balancing, equipment inspection.',     'specialty', TRUE,  TRUE,  FALSE, 130),
  ('mobile_car_detailing', 'Mobile Car Detailing',       'On-site auto detailing — wash, wax, interior, leather.',          'specialty', TRUE,  TRUE,  FALSE, 140),
  ('landscaping',          'Landscaping',                'Lawn care, garden maintenance, hedge trimming, mulching.',        'standard',  TRUE,  TRUE,  FALSE, 150)
ON CONFLICT (slug) DO NOTHING;

-- New slugs added for DLD-442 board spec
INSERT INTO public.service_categories
  (slug, display_name, description, fee_tier, supports_residential, supports_commercial, requires_license_fl, priority_order)
VALUES
  ('handyman',         'Handyman Services',  'General home repairs, mounting, assembly, drywall, small fixes.',                     'specialty', TRUE,  TRUE,  FALSE, 200),
  ('hvac',             'HVAC',               'Heating, ventilation, and A/C install, repair, and maintenance.',                     'specialty', TRUE,  TRUE,  TRUE,  210),
  ('plumbing',         'Plumbing',           'Leak repair, drain cleaning, fixture install, water heater service.',                 'specialty', TRUE,  TRUE,  TRUE,  220),
  ('electrical',       'Electrical',         'Wiring, panel upgrades, lighting, outlet install, troubleshooting.',                  'specialty', TRUE,  TRUE,  TRUE,  230),
  ('pest_control',     'Pest Control',       'Termite, rodent, roach, mosquito treatment and prevention.',                          'specialty', TRUE,  TRUE,  TRUE,  240),
  ('gutter_cleaning',  'Gutter Cleaning',    'Gutter clear-out, downspout flush, optional guard install.',                          'specialty', TRUE,  TRUE,  FALSE, 250),
  ('junk_removal',     'Junk Removal',       'Bulk haul-away — furniture, appliances, yard waste, construction debris.',            'standard',  TRUE,  TRUE,  FALSE, 260),
  ('pool_service',     'Pool Service',       'Full pool service — cleaning, chemicals, equipment repair, leak detection.',          'specialty', TRUE,  TRUE,  FALSE, 270),
  ('mobile_detailing', 'Mobile Detailing',   'On-site detailing for cars, boats, RVs, motorcycles.',                                'specialty', TRUE,  TRUE,  FALSE, 280)
ON CONFLICT (slug) DO NOTHING;

-- Aliases — preserve legacy slugs while making board-spec slugs canonical
UPDATE public.service_categories SET alias_for = 'mobile_detailing' WHERE slug = 'mobile_car_detailing';
UPDATE public.service_categories SET alias_for = 'pool_service'     WHERE slug = 'pool_cleaning';

-- ---------------------------------------------------------------------
-- 3. RLS — public read of active categories, no public writes
-- ---------------------------------------------------------------------
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_categories: anyone reads active rows" ON public.service_categories;
CREATE POLICY "service_categories: anyone reads active rows"
  ON public.service_categories
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "service_categories: admin reads all" ON public.service_categories;
CREATE POLICY "service_categories: admin reads all"
  ON public.service_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "service_categories: admin writes" ON public.service_categories;
CREATE POLICY "service_categories: admin writes"
  ON public.service_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

GRANT SELECT ON public.service_categories TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Resolver helper — canonicalize a service slug through alias_for
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.canonical_service_slug(p_slug TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(alias_for, slug)
  FROM public.service_categories
  WHERE slug = lower(p_slug);
$$;

COMMENT ON FUNCTION public.canonical_service_slug(TEXT) IS
  'Returns the canonical service slug for a given input slug, following alias_for. Returns NULL if slug is not registered.';

GRANT EXECUTE ON FUNCTION public.canonical_service_slug(TEXT) TO anon, authenticated;

COMMIT;

-- =====================================================================
-- Post-migration verification (run manually after apply):
--
--   SELECT count(*) FROM public.service_categories;
--   -- expect: 24 rows (15 legacy + 9 new)
--
--   SELECT slug, fee_tier, alias_for FROM public.service_categories
--   WHERE alias_for IS NOT NULL;
--   -- expect:
--   --   mobile_car_detailing -> mobile_detailing
--   --   pool_cleaning        -> pool_service
--
--   SELECT public.canonical_service_slug('pool_cleaning');
--   -- expect: pool_service
--
--   SELECT public.canonical_service_slug('handyman');
--   -- expect: handyman
-- =====================================================================
