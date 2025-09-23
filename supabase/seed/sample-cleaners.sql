-- =====================================================
-- SAMPLE CLEANER DATA FOR BOSS OF CLEAN
-- Populate the database with realistic Florida cleaners
-- =====================================================

-- First, ensure we have some sample users for cleaners
INSERT INTO public.users (id, email, full_name, phone, role, email_verified, city, state, zip_code)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'maria.sparkle@email.com', 'Maria Rodriguez', '(407) 555-0101', 'cleaner', true, 'Orlando', 'FL', '32801'),
  ('550e8400-e29b-41d4-a716-446655440002', 'clean.crew@email.com', 'James Thompson', '(305) 555-0102', 'cleaner', true, 'Miami', 'FL', '33101'),
  ('550e8400-e29b-41d4-a716-446655440003', 'tampa.clean@email.com', 'Sarah Johnson', '(813) 555-0103', 'cleaner', true, 'Tampa', 'FL', '33602'),
  ('550e8400-e29b-41d4-a716-446655440004', 'pristine.pros@email.com', 'Michael Chen', '(904) 555-0104', 'cleaner', true, 'Jacksonville', 'FL', '32202'),
  ('550e8400-e29b-41d4-a716-446655440005', 'sunshine.cleaning@email.com', 'Lisa Williams', '(954) 555-0105', 'cleaner', true, 'Fort Lauderdale', 'FL', '33301')
ON CONFLICT (id) DO NOTHING;

-- Insert cleaner business profiles
INSERT INTO public.cleaners (
  id, user_id, business_name, business_description, business_phone, business_email,
  services, service_areas, hourly_rate, minimum_hours, years_experience, employees_count,
  insurance_verified, license_verified, background_check, approval_status,
  subscription_tier, average_rating, total_reviews, total_jobs, response_rate,
  profile_image_url, business_slug, seo_keywords, marketing_message,
  instant_booking, response_time_hours
)
VALUES 
  -- Orlando Premium Cleaner
  (
    '650e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    'Sparkle & Shine Orlando',
    'Professional residential and commercial cleaning services in Orlando. Family-owned business with 8+ years of experience. We use eco-friendly products and provide satisfaction guarantee.',
    '(407) 555-0101',
    'maria@sparkleshinesolutions.com',
    ARRAY['residential', 'deep_cleaning', 'move_in_out', 'office_cleaning']::service_type[],
    ARRAY['32801', '32803', '32804', '32805', '32806', '32807', '32808', '32809', '32810', '32811'],
    45.00,
    2,
    8,
    3,
    true,
    true,
    true,
    'approved',
    'pro',
    4.8,
    127,
    89,
    0.95,
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop',
    'sparkle-shine-orlando',
    ARRAY['orlando cleaning', 'house cleaning orlando', 'residential cleaning', 'eco-friendly cleaning'],
    'Your Orlando home deserves the Sparkle & Shine treatment! Book now and get 10% off your first cleaning.',
    true,
    2
  ),
  
  -- Miami Luxury Service
  (
    '650e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440002',
    'Miami Elite Cleaning Crew',
    'Luxury cleaning services for high-end residential and commercial properties in Miami-Dade. Bonded, insured, and background-checked team members.',
    '(305) 555-0102',
    'contact@miamielitecleaning.com',
    ARRAY['residential', 'commercial', 'deep_cleaning', 'pressure_washing', 'window_cleaning']::service_type[],
    ARRAY['33101', '33102', '33109', '33139', '33140', '33141', '33154', '33155', '33156', '33160'],
    65.00,
    3,
    12,
    8,
    true,
    true,
    true,
    'approved',
    'enterprise',
    4.9,
    203,
    156,
    0.98,
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
    'miami-elite-cleaning',
    ARRAY['miami cleaning service', 'luxury cleaning miami', 'commercial cleaning miami', 'pressure washing'],
    'Miami''s premier luxury cleaning service. Available 24/7 for your convenience.',
    true,
    1
  ),
  
  -- Tampa Family Business
  (
    '650e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440003',
    'Johnson Family Cleaning',
    'Family-owned cleaning business serving Tampa Bay area for over 15 years. Specializing in move-in/out cleaning and post-construction cleanup.',
    '(813) 555-0103',
    'sarah@johnsonfamilycleaning.com',
    ARRAY['residential', 'deep_cleaning', 'move_in_out', 'post_construction', 'carpet_cleaning']::service_type[],
    ARRAY['33602', '33603', '33604', '33605', '33606', '33607', '33609', '33610', '33612', '33613'],
    38.00,
    2,
    15,
    5,
    true,
    true,
    true,
    'approved',
    'basic',
    4.7,
    89,
    134,
    0.92,
    'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&h=400&fit=crop',
    'johnson-family-cleaning-tampa',
    ARRAY['tampa cleaning', 'move in cleaning tampa', 'post construction cleaning', 'family business'],
    'Trusted by Tampa families for over 15 years. Your satisfaction is our guarantee!',
    false,
    4
  ),
  
  -- Jacksonville Commercial Specialist
  (
    '650e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440004',
    'Pristine Pro Services',
    'Commercial cleaning specialists serving Jacksonville and surrounding areas. Expert in office buildings, medical facilities, and retail spaces.',
    '(904) 555-0104',
    'info@pristineproservices.com',
    ARRAY['commercial', 'office_cleaning', 'deep_cleaning', 'window_cleaning', 'carpet_cleaning']::service_type[],
    ARRAY['32202', '32204', '32205', '32207', '32208', '32209', '32210', '32211', '32216', '32217'],
    42.00,
    4,
    10,
    12,
    true,
    true,
    true,
    'approved',
    'pro',
    4.6,
    156,
    98,
    0.89,
    'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400&h=400&fit=crop',
    'pristine-pro-jacksonville',
    ARRAY['jacksonville commercial cleaning', 'office cleaning jacksonville', 'medical facility cleaning'],
    'Professional commercial cleaning you can trust. Licensed and insured with 10+ years experience.',
    false,
    6
  ),
  
  -- Fort Lauderdale Eco-Friendly
  (
    '650e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440005',
    'Sunshine Eco Cleaning',
    'Eco-friendly cleaning services using only green, non-toxic products. Perfect for families with children and pets. Serving Broward County.',
    '(954) 555-0105',
    'hello@sunshineecoclean.com',
    ARRAY['residential', 'deep_cleaning', 'move_in_out', 'maid_service']::service_type[],
    ARRAY['33301', '33304', '33308', '33309', '33312', '33315', '33316', '33317', '33319', '33321'],
    48.00,
    2,
    6,
    4,
    true,
    false,
    true,
    'approved',
    'basic',
    4.5,
    72,
    63,
    0.88,
    'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=400&fit=crop',
    'sunshine-eco-cleaning-fort-lauderdale',
    ARRAY['eco-friendly cleaning', 'green cleaning fort lauderdale', 'non-toxic cleaning', 'pet safe cleaning'],
    'Clean your home the natural way! 100% eco-friendly products, safe for kids and pets.',
    true,
    3
  )
ON CONFLICT (id) DO NOTHING;

-- Insert cleaner service areas (normalized table if exists)
INSERT INTO public.cleaner_service_areas (cleaner_id, zip_code, city, county)
SELECT 
  c.id as cleaner_id,
  unnest(c.service_areas) as zip_code,
  CASE 
    WHEN c.business_name LIKE '%Orlando%' THEN 'Orlando'
    WHEN c.business_name LIKE '%Miami%' THEN 'Miami'
    WHEN c.business_name LIKE '%Tampa%' OR c.business_name LIKE '%Johnson%' THEN 'Tampa'
    WHEN c.business_name LIKE '%Jacksonville%' OR c.business_name LIKE '%Pristine%' THEN 'Jacksonville'
    WHEN c.business_name LIKE '%Fort Lauderdale%' OR c.business_name LIKE '%Sunshine%' THEN 'Fort Lauderdale'
  END as city,
  CASE 
    WHEN c.business_name LIKE '%Orlando%' THEN 'Orange'
    WHEN c.business_name LIKE '%Miami%' THEN 'Miami-Dade'
    WHEN c.business_name LIKE '%Tampa%' OR c.business_name LIKE '%Johnson%' THEN 'Hillsborough'
    WHEN c.business_name LIKE '%Jacksonville%' OR c.business_name LIKE '%Pristine%' THEN 'Duval'
    WHEN c.business_name LIKE '%Fort Lauderdale%' OR c.business_name LIKE '%Sunshine%' THEN 'Broward'
  END as county
FROM public.cleaners c
WHERE c.id IN (
  '650e8400-e29b-41d4-a716-446655440001',
  '650e8400-e29b-41d4-a716-446655440002',
  '650e8400-e29b-41d4-a716-446655440003',
  '650e8400-e29b-41d4-a716-446655440004',
  '650e8400-e29b-41d4-a716-446655440005'
)
ON CONFLICT (cleaner_id, zip_code) DO NOTHING;

-- Add some sample reviews
INSERT INTO public.reviews (
  id, quote_request_id, customer_id, cleaner_id, rating, title, comment,
  is_published, created_at, updated_at
)
VALUES 
  (
    uuid_generate_v4(),
    NULL, -- We'll handle quote requests separately
    '550e8400-e29b-41d4-a716-446655440001',
    '650e8400-e29b-41d4-a716-446655440001',
    5,
    'Absolutely Amazing Service!',
    'Maria and her team did an incredible job cleaning our house. Every corner was spotless and they used eco-friendly products as promised. Will definitely book again!',
    true,
    NOW() - INTERVAL '2 weeks',
    NOW() - INTERVAL '2 weeks'
  ),
  (
    uuid_generate_v4(),
    NULL,
    '550e8400-e29b-41d4-a716-446655440002',
    '650e8400-e29b-41d4-a716-446655440002',
    5,
    'Professional and Thorough',
    'The Miami Elite team exceeded our expectations. They were punctual, professional, and left our office building immaculate. Highly recommended!',
    true,
    NOW() - INTERVAL '1 week',
    NOW() - INTERVAL '1 week'
  ),
  (
    uuid_generate_v4(),
    NULL,
    '550e8400-e29b-41d4-a716-446655440003',
    '650e8400-e29b-41d4-a716-446655440003',
    4,
    'Great Job on Move-Out Cleaning',
    'Johnson Family Cleaning helped us get our security deposit back with their thorough move-out cleaning. Very reasonably priced too!',
    true,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Add Florida ZIP codes for search functionality
INSERT INTO public.florida_zip_codes (zip_code, city, county, region)
VALUES 
  -- Orlando Area
  ('32801', 'Orlando', 'Orange', 'Central Florida'),
  ('32803', 'Orlando', 'Orange', 'Central Florida'),
  ('32804', 'Orlando', 'Orange', 'Central Florida'),
  ('32805', 'Orlando', 'Orange', 'Central Florida'),
  ('32806', 'Orlando', 'Orange', 'Central Florida'),
  ('32807', 'Orlando', 'Orange', 'Central Florida'),
  ('32808', 'Orlando', 'Orange', 'Central Florida'),
  ('32809', 'Orlando', 'Orange', 'Central Florida'),
  ('32810', 'Orlando', 'Orange', 'Central Florida'),
  ('32811', 'Orlando', 'Orange', 'Central Florida'),
  
  -- Miami Area
  ('33101', 'Miami', 'Miami-Dade', 'South Florida'),
  ('33102', 'Miami', 'Miami-Dade', 'South Florida'),
  ('33109', 'Miami Beach', 'Miami-Dade', 'South Florida'),
  ('33139', 'Miami Beach', 'Miami-Dade', 'South Florida'),
  ('33140', 'Miami Beach', 'Miami-Dade', 'South Florida'),
  ('33141', 'Miami', 'Miami-Dade', 'South Florida'),
  ('33154', 'Miami', 'Miami-Dade', 'South Florida'),
  ('33155', 'Miami', 'Miami-Dade', 'South Florida'),
  ('33156', 'Miami', 'Miami-Dade', 'South Florida'),
  ('33160', 'North Miami Beach', 'Miami-Dade', 'South Florida'),
  
  -- Tampa Area
  ('33602', 'Tampa', 'Hillsborough', 'West Coast Florida'),
  ('33603', 'Tampa', 'Hillsborough', 'West Coast Florida'),
  ('33604', 'Tampa', 'Hillsborough', 'West Coast Florida'),
  ('33605', 'Tampa', 'Hillsborough', 'West Coast Florida'),
  ('33606', 'Tampa', 'Hillsborough', 'West Coast Florida'),
  ('33607', 'Tampa', 'Hillsborough', 'West Coast Florida'),
  ('33609', 'Tampa', 'Hillsborough', 'West Coast Florida'),
  ('33610', 'Tampa', 'Hillsborough', 'West Coast Florida'),
  ('33612', 'Tampa', 'Hillsborough', 'West Coast Florida'),
  ('33613', 'Tampa', 'Hillsborough', 'West Coast Florida'),
  
  -- Jacksonville Area
  ('32202', 'Jacksonville', 'Duval', 'Northeast Florida'),
  ('32204', 'Jacksonville', 'Duval', 'Northeast Florida'),
  ('32205', 'Jacksonville', 'Duval', 'Northeast Florida'),
  ('32207', 'Jacksonville', 'Duval', 'Northeast Florida'),
  ('32208', 'Jacksonville', 'Duval', 'Northeast Florida'),
  ('32209', 'Jacksonville', 'Duval', 'Northeast Florida'),
  ('32210', 'Jacksonville', 'Duval', 'Northeast Florida'),
  ('32211', 'Jacksonville', 'Duval', 'Northeast Florida'),
  ('32216', 'Jacksonville', 'Duval', 'Northeast Florida'),
  ('32217', 'Jacksonville', 'Duval', 'Northeast Florida'),
  
  -- Fort Lauderdale Area
  ('33301', 'Fort Lauderdale', 'Broward', 'South Florida'),
  ('33304', 'Fort Lauderdale', 'Broward', 'South Florida'),
  ('33308', 'Fort Lauderdale', 'Broward', 'South Florida'),
  ('33309', 'Fort Lauderdale', 'Broward', 'South Florida'),
  ('33312', 'Fort Lauderdale', 'Broward', 'South Florida'),
  ('33315', 'Fort Lauderdale', 'Broward', 'South Florida'),
  ('33316', 'Fort Lauderdale', 'Broward', 'South Florida'),
  ('33317', 'Fort Lauderdale', 'Broward', 'South Florida'),
  ('33319', 'Fort Lauderdale', 'Broward', 'South Florida'),
  ('33321', 'Fort Lauderdale', 'Broward', 'South Florida')
ON CONFLICT (zip_code) DO NOTHING;