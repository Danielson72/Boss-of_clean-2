-- Professional Discovery & Booking System Migration
-- Phase 1: Core tables for search, profiles, and booking

-- Enable PostGIS for geospatial queries (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- 1. CLEANER AVAILABILITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.cleaner_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,

  -- Recurring weekly schedule (JSONB for flexibility)
  weekly_schedule JSONB DEFAULT '{}',
  -- Example format:
  -- {
  --   "monday": [{"start": "09:00", "end": "17:00"}],
  --   "tuesday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "18:00"}]
  -- }

  -- Specific date overrides (for holidays, vacations, etc.)
  date_overrides JSONB DEFAULT '[]',
  -- Example format:
  -- [
  --   {"date": "2025-12-25", "available": false, "reason": "Holiday"},
  --   {"date": "2025-01-15", "slots": [{"start": "10:00", "end": "14:00"}]}
  -- ]

  -- Booking buffer settings
  advance_booking_days INTEGER DEFAULT 30, -- How far in advance bookings are allowed
  minimum_notice_hours INTEGER DEFAULT 24, -- Minimum notice required for bookings
  buffer_time_minutes INTEGER DEFAULT 30, -- Time between bookings

  -- Calendar sync
  external_calendar_url TEXT,
  last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. SERVICES PRICING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.services_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,

  -- Service details
  service_type TEXT NOT NULL,
  service_name TEXT NOT NULL,
  description TEXT,

  -- Pricing structure
  base_price NUMERIC(10,2) NOT NULL,
  price_unit TEXT DEFAULT 'hour', -- 'hour', 'sqft', 'room', 'flat'

  -- Size-based pricing tiers
  pricing_tiers JSONB DEFAULT '[]',
  -- Example format:
  -- [
  --   {"min_sqft": 0, "max_sqft": 1000, "price": 100},
  --   {"min_sqft": 1001, "max_sqft": 2000, "price": 150}
  -- ]

  -- Package deals
  package_deals JSONB DEFAULT '[]',
  -- Example format:
  -- [
  --   {"name": "Weekly Special", "frequency": "weekly", "discount_percent": 15},
  --   {"name": "Monthly Package", "frequency": "monthly", "discount_percent": 20}
  -- ]

  -- Additional options
  add_ons JSONB DEFAULT '[]',
  -- Example format:
  -- [
  --   {"name": "Inside Oven", "price": 25},
  --   {"name": "Inside Refrigerator", "price": 30}
  -- ]

  minimum_charge NUMERIC(10,2),

  -- Availability flags
  is_active BOOLEAN DEFAULT true,
  instant_booking_available BOOLEAN DEFAULT false,

  -- SEO and display
  priority_order INTEGER DEFAULT 100,
  featured BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. ENHANCED PROFESSIONAL PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE UNIQUE,

  -- Enhanced profile information
  tagline TEXT,
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  languages_spoken TEXT[] DEFAULT '{English}',

  -- Certifications and credentials
  certifications JSONB DEFAULT '[]',
  -- Example format:
  -- [
  --   {"name": "IICRC Certified", "issuer": "IICRC", "date": "2024-01-15", "expiry": "2026-01-15", "verified": true}
  -- ]

  -- Insurance details
  insurance_details JSONB DEFAULT '{}',
  -- Example format:
  -- {
  --   "carrier": "State Farm",
  --   "policy_number": "XXX-XXXX",
  --   "coverage_amount": 1000000,
  --   "expiry": "2025-12-31",
  --   "verified": true
  -- }

  -- Portfolio/Gallery
  portfolio_images JSONB DEFAULT '[]',
  -- Example format:
  -- [
  --   {"url": "...", "caption": "Kitchen deep clean", "category": "kitchen", "before_after": true}
  -- ]

  -- Video introduction
  intro_video_url TEXT,

  -- Work preferences
  team_size INTEGER DEFAULT 1,
  brings_supplies BOOLEAN DEFAULT true,
  eco_friendly BOOLEAN DEFAULT false,
  pet_friendly BOOLEAN DEFAULT true,

  -- Response metrics
  response_time_minutes INTEGER,
  acceptance_rate NUMERIC(3,2), -- Percentage of quotes accepted
  on_time_rate NUMERIC(3,2), -- Percentage of on-time arrivals
  completion_rate NUMERIC(3,2), -- Percentage of jobs completed

  -- Badges and achievements
  badges JSONB DEFAULT '[]',
  -- Example format:
  -- ["top_rated", "quick_responder", "100_jobs_completed", "eco_warrior"]

  -- Social proof
  years_on_platform INTEGER DEFAULT 0,
  repeat_customer_rate NUMERIC(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. BOOKING TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.booking_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Core relationships
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,

  -- Booking details
  booking_reference VARCHAR(20) UNIQUE NOT NULL DEFAULT UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)),

  -- Service information
  service_type TEXT NOT NULL,
  service_date DATE NOT NULL,
  service_time TIME NOT NULL,
  duration_hours NUMERIC(3,1) NOT NULL,

  -- Location
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT DEFAULT 'FL',
  zip_code TEXT NOT NULL,

  -- Property details
  property_type TEXT,
  property_size_sqft INTEGER,
  special_instructions TEXT,

  -- Pricing
  base_price NUMERIC(10,2) NOT NULL,
  add_ons JSONB DEFAULT '[]',
  discount_amount NUMERIC(10,2) DEFAULT 0,
  travel_fee NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,

  -- Subscription tier tracking
  customer_tier subscription_tier NOT NULL,
  monthly_booking_count INTEGER DEFAULT 1, -- Track against tier limits

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'

  -- Confirmation
  confirmed_at TIMESTAMPTZ,
  confirmation_code VARCHAR(10),

  -- Execution
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  actual_duration_hours NUMERIC(3,1),

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.users(id),
  cancellation_reason TEXT,
  cancellation_fee NUMERIC(10,2),

  -- Payment
  payment_method TEXT, -- 'stripe', 'cash', 'invoice'
  stripe_payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,

  -- Communication preferences
  reminder_sent_at TIMESTAMPTZ,
  follow_up_sent_at TIMESTAMPTZ,

  -- Metadata
  source TEXT, -- 'web', 'mobile', 'phone', 'recurring'
  device_info JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. FLORIDA ZIPCODES ENHANCEMENT
-- ============================================
-- Add PostGIS geometry column for geospatial queries
ALTER TABLE public.florida_zipcodes
  ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

-- Update geometry from lat/lon if not exists
UPDATE public.florida_zipcodes
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE geom IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_florida_zipcodes_geom
  ON public.florida_zipcodes USING GIST(geom);

-- ============================================
-- 6. SEARCH OPTIMIZATION VIEWS
-- ============================================

-- Materialized view for fast cleaner search
CREATE MATERIALIZED VIEW IF NOT EXISTS public.cleaner_search_index AS
SELECT
  c.id,
  c.user_id,
  c.business_name,
  c.business_slug,
  c.business_description,
  c.services,
  c.hourly_rate,
  c.minimum_hours,
  c.average_rating,
  c.total_reviews,
  c.total_jobs,
  c.response_time_hours,
  c.instant_booking,
  c.subscription_tier,
  c.profile_image_url,
  pp.tagline,
  pp.specialties,
  pp.badges,
  pp.response_time_minutes,
  pp.acceptance_rate,
  pp.on_time_rate,
  pp.brings_supplies,
  pp.eco_friendly,
  pp.pet_friendly,
  array_agg(DISTINCT sa.zip_code) AS service_zips,
  array_agg(DISTINCT sa.city) AS service_cities,
  -- Calculate next available slot
  (
    SELECT MIN(available_date)
    FROM generate_series(
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      '1 day'::INTERVAL
    ) AS available_date
    WHERE EXTRACT(DOW FROM available_date) IN (1,2,3,4,5,6) -- Mon-Sat
  ) AS next_available_date
FROM public.cleaners c
LEFT JOIN public.professional_profiles pp ON c.id = pp.cleaner_id
LEFT JOIN public.service_areas sa ON c.id = sa.cleaner_id
WHERE c.approval_status = 'approved'
GROUP BY
  c.id, c.user_id, c.business_name, c.business_slug, c.business_description,
  c.services, c.hourly_rate, c.minimum_hours, c.average_rating, c.total_reviews,
  c.total_jobs, c.response_time_hours, c.instant_booking, c.subscription_tier,
  c.profile_image_url, pp.tagline, pp.specialties, pp.badges, pp.response_time_minutes,
  pp.acceptance_rate, pp.on_time_rate, pp.brings_supplies, pp.eco_friendly, pp.pet_friendly;

-- Create indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_cleaner_search_rating
  ON public.cleaner_search_index(average_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_cleaner_search_reviews
  ON public.cleaner_search_index(total_reviews DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_cleaner_search_tier
  ON public.cleaner_search_index(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_cleaner_search_services
  ON public.cleaner_search_index USING GIN(services);
CREATE INDEX IF NOT EXISTS idx_cleaner_search_zips
  ON public.cleaner_search_index USING GIN(service_zips);

-- ============================================
-- 7. STORED PROCEDURES
-- ============================================

-- Function to search cleaners by ZIP code with radius
CREATE OR REPLACE FUNCTION search_cleaners_by_location(
  p_zip_code TEXT,
  p_radius_miles INTEGER DEFAULT 10,
  p_service_type TEXT DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT 0,
  p_max_price NUMERIC DEFAULT NULL,
  p_instant_booking BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  cleaner_id UUID,
  business_name TEXT,
  business_slug TEXT,
  tagline TEXT,
  average_rating NUMERIC,
  total_reviews INTEGER,
  hourly_rate NUMERIC,
  distance_miles NUMERIC,
  response_time_minutes INTEGER,
  instant_booking BOOLEAN,
  subscription_tier subscription_tier,
  next_available_date DATE,
  badges JSONB
) AS $$
DECLARE
  center_point GEOMETRY;
BEGIN
  -- Get the center point for the search ZIP code
  SELECT geom INTO center_point
  FROM public.florida_zipcodes
  WHERE zip_code = p_zip_code;

  IF center_point IS NULL THEN
    RAISE EXCEPTION 'ZIP code % not found', p_zip_code;
  END IF;

  RETURN QUERY
  SELECT
    csi.id,
    csi.business_name,
    csi.business_slug,
    csi.tagline,
    csi.average_rating,
    csi.total_reviews,
    csi.hourly_rate,
    ROUND(
      ST_Distance(center_point, fz.geom::geography) / 1609.344
    )::NUMERIC AS distance_miles,
    csi.response_time_minutes,
    csi.instant_booking,
    csi.subscription_tier,
    csi.next_available_date,
    csi.badges
  FROM public.cleaner_search_index csi
  JOIN public.service_areas sa ON sa.cleaner_id = csi.id
  JOIN public.florida_zipcodes fz ON fz.zip_code = sa.zip_code
  WHERE
    -- Location filter
    ST_DWithin(center_point::geography, fz.geom::geography, p_radius_miles * 1609.344)
    -- Service type filter
    AND (p_service_type IS NULL OR p_service_type = ANY(csi.services))
    -- Rating filter
    AND csi.average_rating >= p_min_rating
    -- Price filter
    AND (p_max_price IS NULL OR csi.hourly_rate <= p_max_price)
    -- Instant booking filter
    AND (p_instant_booking IS NULL OR csi.instant_booking = p_instant_booking)
  ORDER BY
    -- Premium tier cleaners first
    CASE
      WHEN csi.subscription_tier = 'enterprise' THEN 1
      WHEN csi.subscription_tier = 'pro' THEN 2
      WHEN csi.subscription_tier = 'basic' THEN 3
      ELSE 4
    END,
    -- Then by rating and distance
    csi.average_rating DESC NULLS LAST,
    distance_miles ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to check booking limits based on subscription tier
CREATE OR REPLACE FUNCTION check_booking_tier_limit(
  p_customer_id UUID,
  p_tier subscription_tier
)
RETURNS BOOLEAN AS $$
DECLARE
  current_month_count INTEGER;
  tier_limit INTEGER;
BEGIN
  -- Count bookings in current month
  SELECT COUNT(*)
  INTO current_month_count
  FROM public.booking_transactions
  WHERE
    customer_id = p_customer_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
    AND status NOT IN ('cancelled');

  -- Determine tier limit
  tier_limit := CASE p_tier
    WHEN 'free' THEN 1
    WHEN 'basic' THEN 5
    WHEN 'pro' THEN 15
    WHEN 'enterprise' THEN 999999 -- Effectively unlimited
    ELSE 0
  END;

  RETURN current_month_count < tier_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get cleaner availability for a date range
CREATE OR REPLACE FUNCTION get_cleaner_availability(
  p_cleaner_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  available_date DATE,
  available_slots JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::INTERVAL)::DATE AS check_date
  ),
  bookings AS (
    SELECT
      service_date,
      service_time,
      duration_hours
    FROM public.booking_transactions
    WHERE
      cleaner_id = p_cleaner_id
      AND service_date BETWEEN p_start_date AND p_end_date
      AND status NOT IN ('cancelled')
  ),
  availability AS (
    SELECT
      ds.check_date,
      ca.weekly_schedule,
      ca.date_overrides
    FROM date_series ds
    CROSS JOIN public.cleaner_availability ca
    WHERE ca.cleaner_id = p_cleaner_id
  )
  SELECT
    a.check_date AS available_date,
    jsonb_build_object(
      'day_of_week', TO_CHAR(a.check_date, 'day'),
      'is_available', true, -- Simplified, would check against schedule
      'slots', '[]'::JSONB -- Would calculate available time slots
    ) AS available_slots
  FROM availability a
  LEFT JOIN bookings b ON b.service_date = a.check_date
  ORDER BY a.check_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. INDEXES
-- ============================================

-- Cleaner availability indexes
CREATE INDEX IF NOT EXISTS idx_cleaner_availability_cleaner
  ON public.cleaner_availability(cleaner_id);

-- Services pricing indexes
CREATE INDEX IF NOT EXISTS idx_services_pricing_cleaner
  ON public.services_pricing(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_services_pricing_type
  ON public.services_pricing(service_type);
CREATE INDEX IF NOT EXISTS idx_services_pricing_active
  ON public.services_pricing(is_active) WHERE is_active = true;

-- Professional profiles indexes
CREATE INDEX IF NOT EXISTS idx_professional_profiles_cleaner
  ON public.professional_profiles(cleaner_id);

-- Booking transactions indexes
CREATE INDEX IF NOT EXISTS idx_booking_transactions_customer
  ON public.booking_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_transactions_cleaner
  ON public.booking_transactions(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_booking_transactions_date
  ON public.booking_transactions(service_date);
CREATE INDEX IF NOT EXISTS idx_booking_transactions_status
  ON public.booking_transactions(status);
CREATE INDEX IF NOT EXISTS idx_booking_transactions_reference
  ON public.booking_transactions(booking_reference);
CREATE INDEX IF NOT EXISTS idx_booking_transactions_month
  ON public.booking_transactions(DATE_TRUNC('month', created_at));

-- ============================================
-- 9. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.cleaner_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_transactions ENABLE ROW LEVEL SECURITY;

-- Cleaner availability policies
CREATE POLICY "Cleaners can manage their availability"
  ON public.cleaner_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = cleaner_availability.cleaner_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view availability"
  ON public.cleaner_availability
  FOR SELECT
  USING (true);

-- Services pricing policies
CREATE POLICY "Cleaners can manage their pricing"
  ON public.services_pricing
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = services_pricing.cleaner_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view active pricing"
  ON public.services_pricing
  FOR SELECT
  USING (is_active = true);

-- Professional profiles policies
CREATE POLICY "Cleaners can manage their profiles"
  ON public.professional_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = professional_profiles.cleaner_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view profiles"
  ON public.professional_profiles
  FOR SELECT
  USING (true);

-- Booking transactions policies
CREATE POLICY "Customers can view their bookings"
  ON public.booking_transactions
  FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "Cleaners can view their bookings"
  ON public.booking_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = booking_transactions.cleaner_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create bookings"
  ON public.booking_transactions
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Booking participants can update"
  ON public.booking_transactions
  FOR UPDATE
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = booking_transactions.cleaner_id
      AND c.user_id = auth.uid()
    )
  );

-- ============================================
-- 10. TRIGGERS
-- ============================================

-- Trigger to update cleaner stats after booking completion
CREATE OR REPLACE FUNCTION update_cleaner_stats_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.cleaners
    SET
      total_jobs = total_jobs + 1,
      updated_at = NOW()
    WHERE id = NEW.cleaner_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cleaner_stats
  AFTER UPDATE ON public.booking_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_cleaner_stats_on_booking();

-- Trigger to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_cleaner_search_index()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.cleaner_search_index;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh search index when relevant data changes
CREATE TRIGGER trigger_refresh_search_on_cleaner_update
  AFTER UPDATE ON public.cleaners
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_cleaner_search_index();

CREATE TRIGGER trigger_refresh_search_on_profile_update
  AFTER INSERT OR UPDATE OR DELETE ON public.professional_profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_cleaner_search_index();

-- ============================================
-- 11. INITIAL DATA & REFRESH
-- ============================================

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW public.cleaner_search_index;

-- Add sample Florida ZIP codes if they don't exist
INSERT INTO public.florida_zipcodes (zip_code, city, county, latitude, longitude)
VALUES
  ('33139', 'Miami Beach', 'Miami-Dade', 25.7906, -80.1395),
  ('32789', 'Winter Park', 'Orange', 28.6000, -81.3392),
  ('33426', 'Boynton Beach', 'Palm Beach', 26.5318, -80.0905),
  ('34236', 'Sarasota', 'Sarasota', 27.3364, -82.5307),
  ('32960', 'Vero Beach', 'Indian River', 27.6386, -80.3973)
ON CONFLICT (zip_code) DO NOTHING;

-- Update geometry for new ZIP codes
UPDATE public.florida_zipcodes
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE geom IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL;