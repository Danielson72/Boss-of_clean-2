-- =====================================================
-- SAMPLE DATA FOR BOSS OF CLEAN
-- =====================================================
-- This script adds sample cleaners to populate your directory

-- Note: You'll need to create actual user accounts first through the signup flow
-- Then update the user_id values below to match real user IDs

-- Sample Florida ZIP codes and cities data
INSERT INTO public.service_areas (cleaner_id, zip_code, city, county, travel_fee) VALUES
-- We'll add these after cleaners are created
('00000000-0000-0000-0000-000000000000', '33101', 'Miami', 'Miami-Dade', 0.00),
('00000000-0000-0000-0000-000000000000', '33109', 'Miami Beach', 'Miami-Dade', 15.00),
('00000000-0000-0000-0000-000000000000', '33125', 'Miami', 'Miami-Dade', 10.00),
('00000000-0000-0000-0000-000000000000', '33126', 'Miami', 'Miami-Dade', 10.00)
ON CONFLICT DO NOTHING;

-- Sample reviews (these will be added after you have real cleaners)
-- INSERT INTO public.reviews (cleaner_id, customer_id, rating, title, comment, service_date, verified_booking) VALUES
-- ('cleaner-uuid-here', 'customer-uuid-here', 5, 'Excellent Service!', 'They did an amazing job cleaning my house. Very professional and thorough.', '2024-01-15', true),
-- ('cleaner-uuid-here', 'customer-uuid-here', 4, 'Good cleaning', 'Quality work, arrived on time. Would recommend.', '2024-01-20', true);

-- =====================================================
-- FLORIDA ZIP CODES DATABASE
-- =====================================================
-- Popular Florida ZIP codes for autocomplete

CREATE TABLE IF NOT EXISTS public.florida_zipcodes (
    zip_code TEXT PRIMARY KEY,
    city TEXT NOT NULL,
    county TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    population INTEGER
);

-- Insert popular Florida ZIP codes
INSERT INTO public.florida_zipcodes (zip_code, city, county, latitude, longitude, population) VALUES
-- Miami-Dade County
('33101', 'Miami', 'Miami-Dade', 25.7617, -80.1918, 2500),
('33109', 'Miami Beach', 'Miami-Dade', 25.7907, -80.1300, 12000),
('33125', 'Miami', 'Miami-Dade', 25.7753, -80.2450, 15000),
('33126', 'Miami', 'Miami-Dade', 25.7534, -80.3176, 25000),
('33131', 'Miami', 'Miami-Dade', 25.7663, -80.1918, 8000),
('33132', 'Miami', 'Miami-Dade', 25.7889, -80.1944, 3000),
('33134', 'Miami', 'Miami-Dade', 25.7309, -80.2453, 20000),
('33135', 'Miami', 'Miami-Dade', 25.7545, -80.2192, 18000),
('33137', 'Miami', 'Miami-Dade', 25.8067, -80.2103, 12000),
('33139', 'Miami Beach', 'Miami-Dade', 25.7814, -80.1300, 15000),

-- Orange County (Orlando)
('32801', 'Orlando', 'Orange', 28.5383, -81.3792, 8000),
('32803', 'Orlando', 'Orange', 28.4813, -81.3742, 22000),
('32804', 'Orlando', 'Orange', 28.5731, -81.3409, 15000),
('32806', 'Orlando', 'Orange', 28.4731, -81.4414, 35000),
('32807', 'Orlando', 'Orange', 28.5064, -81.3431, 28000),
('32808', 'Orlando', 'Orange', 28.5431, -81.4264, 45000),
('32809', 'Orlando', 'Orange', 28.4564, -81.3981, 55000),
('32810', 'Orlando', 'Orange', 28.5989, -81.3092, 30000),
('32811', 'Orlando', 'Orange', 28.5531, -81.4264, 25000),
('32812', 'Orlando', 'Orange', 28.5931, -81.3414, 20000),

-- Hillsborough County (Tampa)
('33602', 'Tampa', 'Hillsborough', 27.9506, -82.4572, 8000),
('33603', 'Tampa', 'Hillsborough', 28.0031, -82.4431, 12000),
('33604', 'Tampa', 'Hillsborough', 28.0431, -82.5031, 25000),
('33605', 'Tampa', 'Hillsborough', 27.9831, -82.5231, 18000),
('33606', 'Tampa', 'Hillsborough', 27.9931, -82.5431, 22000),
('33607', 'Tampa', 'Hillsborough', 28.0231, -82.5631, 15000),
('33609', 'Tampa', 'Hillsborough', 27.9231, -82.5031, 35000),
('33610', 'Tampa', 'Hillsborough', 28.0631, -82.4231, 28000),
('33611', 'Tampa', 'Hillsborough', 27.8931, -82.4631, 30000),
('33612', 'Tampa', 'Hillsborough', 28.0831, -82.4031, 32000),

-- Duval County (Jacksonville)
('32204', 'Jacksonville', 'Duval', 30.3183, -81.6556, 25000),
('32205', 'Jacksonville', 'Duval', 30.3383, -81.7156, 28000),
('32207', 'Jacksonville', 'Duval', 30.2983, -81.6256, 35000),
('32208', 'Jacksonville', 'Duval', 30.3583, -81.6756, 22000),
('32209', 'Jacksonville', 'Duval', 30.3783, -81.7356, 30000),
('32210', 'Jacksonville', 'Duval', 30.2583, -81.5856, 18000),
('32211', 'Jacksonville', 'Duval', 30.3983, -81.7556, 32000),
('32216', 'Jacksonville', 'Duval', 30.2783, -81.6456, 28000),
('32217', 'Jacksonville', 'Duval', 30.2383, -81.6056, 40000),
('32218', 'Jacksonville', 'Duval', 30.4183, -81.7756, 25000),

-- Broward County (Fort Lauderdale)
('33301', 'Fort Lauderdale', 'Broward', 26.1224, -80.1373, 15000),
('33304', 'Fort Lauderdale', 'Broward', 26.1524, -80.1573, 22000),
('33305', 'Fort Lauderdale', 'Broward', 26.1824, -80.1773, 18000),
('33306', 'Fort Lauderdale', 'Broward', 26.2124, -80.1973, 25000),
('33308', 'Fort Lauderdale', 'Broward', 26.2424, -80.2173, 20000),
('33309', 'Fort Lauderdale', 'Broward', 26.2724, -80.2373, 28000),
('33311', 'Fort Lauderdale', 'Broward', 26.1024, -80.1173, 30000),
('33312', 'Fort Lauderdale', 'Broward', 26.0824, -80.0973, 35000),
('33315', 'Fort Lauderdale', 'Broward', 26.0624, -80.0773, 32000),
('33316', 'Fort Lauderdale', 'Broward', 26.0424, -80.0573, 28000),

-- Leon County (Tallahassee)
('32301', 'Tallahassee', 'Leon', 30.4518, -84.2807, 12000),
('32303', 'Tallahassee', 'Leon', 30.4718, -84.3207, 15000),
('32304', 'Tallahassee', 'Leon', 30.4918, -84.3607, 18000),
('32305', 'Tallahassee', 'Leon', 30.5118, -84.4007, 22000),
('32308', 'Tallahassee', 'Leon', 30.4318, -84.2407, 25000),
('32309', 'Tallahassee', 'Leon', 30.4118, -84.2007, 20000),
('32310', 'Tallahassee', 'Leon', 30.3918, -84.1607, 16000),
('32311', 'Tallahassee', 'Leon', 30.3718, -84.1207, 14000),
('32312', 'Tallahassee', 'Leon', 30.3518, -84.0807, 18000),
('32317', 'Tallahassee', 'Leon', 30.5318, -84.4407, 12000),

-- Palm Beach County
('33401', 'West Palm Beach', 'Palm Beach', 26.7153, -80.0534, 20000),
('33405', 'West Palm Beach', 'Palm Beach', 26.7453, -80.0834, 25000),
('33406', 'West Palm Beach', 'Palm Beach', 26.7753, -80.1134, 22000),
('33407', 'West Palm Beach', 'Palm Beach', 26.8053, -80.1434, 28000),
('33409', 'West Palm Beach', 'Palm Beach', 26.6853, -80.0234, 18000),
('33411', 'West Palm Beach', 'Palm Beach', 26.6653, -79.9934, 30000),
('33412', 'West Palm Beach', 'Palm Beach', 26.6453, -79.9634, 32000),
('33413', 'West Palm Beach', 'Palm Beach', 26.6253, -79.9334, 35000),
('33414', 'West Palm Beach', 'Palm Beach', 26.6053, -79.9034, 28000),
('33415', 'West Palm Beach', 'Palm Beach', 26.5853, -79.8734, 25000),

-- Collier County (Naples)
('34102', 'Naples', 'Collier', 26.1420, -81.7948, 8000),
('34103', 'Naples', 'Collier', 26.1620, -81.8148, 12000),
('34104', 'Naples', 'Collier', 26.1820, -81.8348, 15000),
('34105', 'Naples', 'Collier', 26.2020, -81.8548, 18000),
('34108', 'Naples', 'Collier', 26.2220, -81.8748, 22000),
('34109', 'Naples', 'Collier', 26.2420, -81.8948, 25000),
('34110', 'Naples', 'Collier', 26.1220, -81.7748, 20000),
('34112', 'Naples', 'Collier', 26.1020, -81.7548, 16000),
('34113', 'Naples', 'Collier', 26.0820, -81.7348, 14000),
('34114', 'Naples', 'Collier', 26.0620, -81.7148, 18000),

-- Lee County (Fort Myers)
('33990', 'Fort Myers', 'Lee', 26.6406, -81.8723, 25000),
('33991', 'Fort Myers', 'Lee', 26.6606, -81.8923, 22000),
('33993', 'Fort Myers', 'Lee', 26.6806, -81.9123, 28000),
('33994', 'Fort Myers', 'Lee', 26.7006, -81.9323, 30000)
ON CONFLICT (zip_code) DO NOTHING;

-- Create index for ZIP code lookups
CREATE INDEX IF NOT EXISTS idx_florida_zipcodes_city ON public.florida_zipcodes(city);
CREATE INDEX IF NOT EXISTS idx_florida_zipcodes_county ON public.florida_zipcodes(county);

-- =====================================================
-- SAMPLE CLEANER CREATION SCRIPT
-- =====================================================
-- Run this AFTER you have created some user accounts

/*
-- Example of how to create sample cleaners (replace UUIDs with real ones):

INSERT INTO public.cleaners (
    user_id,
    business_name,
    business_description,
    business_phone,
    business_email,
    services,
    service_areas,
    hourly_rate,
    minimum_hours,
    years_experience,
    insurance_verified,
    license_verified,
    approval_status,
    average_rating,
    total_reviews,
    subscription_tier
) VALUES 
(
    'YOUR-USER-UUID-HERE',
    'Miami Sparkle Cleaning',
    'Professional residential and commercial cleaning services in Miami-Dade area. We use eco-friendly products and guarantee satisfaction.',
    '305-555-0123',
    'info@miamisparkle.com',
    ARRAY['residential', 'commercial', 'deep_cleaning', 'move_in_out'],
    ARRAY['33101', '33109', '33125', '33126', '33131', '33134'],
    75.00,
    3,
    12,
    true,
    true,
    'approved',
    4.9,
    234,
    'pro'
),
(
    'YOUR-USER-UUID-HERE-2',
    'Orlando Clean Team',
    'Trusted cleaning professionals serving Central Florida. Family-owned business with 8+ years of experience.',
    '407-555-0456',
    'hello@orlandocleanteam.com',
    ARRAY['residential', 'deep_cleaning', 'window_cleaning'],
    ARRAY['32801', '32803', '32804', '32806', '32807', '32808'],
    60.00,
    2,
    8,
    true,
    false,
    'approved',
    4.7,
    156,
    'basic'
);
*/