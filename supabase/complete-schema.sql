-- =============================================
-- BOSS OF CLEAN - COMPLETE DATABASE SCHEMA
-- Revenue-generating cleaning directory for Florida
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('customer', 'cleaner', 'admin');
CREATE TYPE service_type AS ENUM (
  'residential', 
  'commercial', 
  'deep_cleaning', 
  'pressure_washing', 
  'window_cleaning', 
  'carpet_cleaning',
  'move_in_out',
  'post_construction',
  'maid_service',
  'office_cleaning'
);
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'pro', 'enterprise');
CREATE TYPE quote_status AS ENUM ('pending', 'responded', 'accepted', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'cancelled', 'refunded');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- =============================================
-- USERS TABLE (extends Supabase auth.users)
-- =============================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role user_role DEFAULT 'customer',
  email_verified BOOLEAN DEFAULT FALSE,
  profile_image_url VARCHAR(500),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2) DEFAULT 'FL',
  zip_code VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (id)
);

-- =============================================
-- CLEANERS BUSINESS PROFILES
-- =============================================
CREATE TABLE public.cleaners (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  business_description TEXT,
  website_url VARCHAR(500),
  business_phone VARCHAR(20),
  business_email VARCHAR(255),
  services service_type[] DEFAULT '{}',
  service_areas VARCHAR(255)[] DEFAULT '{}', -- ZIP codes they serve
  hourly_rate DECIMAL(10,2),
  minimum_hours INTEGER DEFAULT 2,
  years_experience INTEGER,
  employees_count INTEGER DEFAULT 1,
  
  -- Verification status
  insurance_verified BOOLEAN DEFAULT FALSE,
  license_verified BOOLEAN DEFAULT FALSE,
  background_check BOOLEAN DEFAULT FALSE,
  approval_status approval_status DEFAULT 'pending',
  
  -- Subscription & Business Metrics
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  
  -- Performance metrics
  average_rating DECIMAL(2,1) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  response_rate DECIMAL(3,2) DEFAULT 0.0, -- percentage
  
  -- Media and visibility
  profile_image_url VARCHAR(500),
  business_images VARCHAR(500)[] DEFAULT '{}',
  featured_image_url VARCHAR(500),
  business_hours JSONB, -- Store weekly schedule
  instant_booking BOOLEAN DEFAULT FALSE,
  response_time_hours INTEGER DEFAULT 24,
  
  -- SEO and marketing
  business_slug VARCHAR(255) UNIQUE, -- For SEO-friendly URLs
  seo_keywords VARCHAR(500)[] DEFAULT '{}',
  marketing_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- =============================================
-- SUBSCRIPTIONS TABLE (Stripe Integration)
-- =============================================
CREATE TABLE public.subscriptions (
  id UUID DEFAULT uuid_generate_v4(),
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  tier subscription_tier NOT NULL,
  status VARCHAR(50), -- active, cancelled, past_due, etc.
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  monthly_price DECIMAL(10,2),
  features JSONB, -- Store tier-specific features
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- =============================================
-- QUOTE REQUESTS TABLE
-- =============================================
CREATE TABLE public.quote_requests (
  id UUID DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE SET NULL,
  
  -- Service details
  service_type service_type NOT NULL,
  property_size VARCHAR(50), -- e.g., "1br", "2br", "3000sqft", "small office"
  property_type VARCHAR(50), -- e.g., "apartment", "house", "office"
  frequency VARCHAR(50), -- e.g., "one-time", "weekly", "bi-weekly", "monthly"
  
  -- Scheduling
  preferred_date DATE,
  preferred_time VARCHAR(20),
  flexible_scheduling BOOLEAN DEFAULT FALSE,
  
  -- Location
  zip_code VARCHAR(10) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  
  -- Details and pricing
  special_instructions TEXT,
  estimated_hours INTEGER,
  budget_range VARCHAR(50), -- e.g., "$100-200", "$200-300"
  
  -- Status and communication
  status quote_status DEFAULT 'pending',
  customer_message TEXT,
  cleaner_response TEXT,
  quoted_price DECIMAL(10,2),
  
  -- Contact preferences
  contact_method VARCHAR(20) DEFAULT 'email', -- email, phone, both
  urgent BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  PRIMARY KEY (id)
);

-- =============================================
-- REVIEWS TABLE
-- =============================================
CREATE TABLE public.reviews (
  id UUID DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE,
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  
  -- Rating and feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  photos VARCHAR(500)[] DEFAULT '{}',
  
  -- Specific ratings
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  
  -- Engagement
  helpful_count INTEGER DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- =============================================
-- PAYMENTS TABLE (Stripe Webhooks)
-- =============================================
CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4(),
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status payment_status DEFAULT 'pending',
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- =============================================
-- CLEANER SERVICE AREAS (for better search)
-- =============================================
CREATE TABLE public.cleaner_service_areas (
  id UUID DEFAULT uuid_generate_v4(),
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE,
  zip_code VARCHAR(10) NOT NULL,
  city VARCHAR(100),
  county VARCHAR(100),
  travel_fee DECIMAL(10,2) DEFAULT 0.00,
  max_travel_distance INTEGER DEFAULT 25, -- miles
  priority INTEGER DEFAULT 1, -- 1 = highest priority area
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- =============================================
-- FLORIDA ZIP CODES REFERENCE TABLE
-- =============================================
CREATE TABLE public.florida_zip_codes (
  zip_code VARCHAR(10) PRIMARY KEY,
  city VARCHAR(100) NOT NULL,
  county VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  population INTEGER,
  median_income DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- EMAIL TEMPLATES TABLE
-- =============================================
CREATE TABLE public.email_templates (
  id UUID DEFAULT uuid_generate_v4(),
  template_name VARCHAR(100) UNIQUE NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB, -- Template variables like {name}, {business_name}
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- =============================================
-- ANALYTICS TABLE (for tracking user behavior)
-- =============================================
CREATE TABLE public.analytics_events (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_name VARCHAR(100) NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  referrer VARCHAR(500),
  page_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_zip_code ON public.users(zip_code);

-- Cleaners indexes
CREATE INDEX idx_cleaners_user_id ON public.cleaners(user_id);
CREATE INDEX idx_cleaners_services ON public.cleaners USING GIN(services);
CREATE INDEX idx_cleaners_service_areas ON public.cleaners USING GIN(service_areas);
CREATE INDEX idx_cleaners_subscription_tier ON public.cleaners(subscription_tier);
CREATE INDEX idx_cleaners_rating ON public.cleaners(average_rating DESC);
CREATE INDEX idx_cleaners_approval ON public.cleaners(approval_status);
CREATE INDEX idx_cleaners_slug ON public.cleaners(business_slug);
CREATE INDEX idx_cleaners_city ON public.cleaners USING GIN(to_tsvector('english', business_name));

-- Quote requests indexes
CREATE INDEX idx_quote_requests_customer_id ON public.quote_requests(customer_id);
CREATE INDEX idx_quote_requests_cleaner_id ON public.quote_requests(cleaner_id);
CREATE INDEX idx_quote_requests_zip_code ON public.quote_requests(zip_code);
CREATE INDEX idx_quote_requests_service_type ON public.quote_requests(service_type);
CREATE INDEX idx_quote_requests_status ON public.quote_requests(status);
CREATE INDEX idx_quote_requests_created_at ON public.quote_requests(created_at DESC);

-- Reviews indexes
CREATE INDEX idx_reviews_cleaner_id ON public.reviews(cleaner_id);
CREATE INDEX idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);

-- Service areas indexes
CREATE INDEX idx_cleaner_service_areas_zip ON public.cleaner_service_areas(zip_code);
CREATE INDEX idx_cleaner_service_areas_cleaner_id ON public.cleaner_service_areas(cleaner_id);
CREATE INDEX idx_cleaner_service_areas_priority ON public.cleaner_service_areas(priority);

-- Florida ZIP codes indexes
CREATE INDEX idx_florida_zip_codes_city ON public.florida_zip_codes(city);
CREATE INDEX idx_florida_zip_codes_county ON public.florida_zip_codes(county);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_cleaner_id ON public.subscriptions(cleaner_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

-- Analytics indexes
CREATE INDEX idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);

-- =============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Cleaners policies
CREATE POLICY "Anyone can view approved cleaner profiles" ON public.cleaners
  FOR SELECT USING (
    approval_status = 'approved' AND 
    (subscription_tier != 'free' OR subscription_expires_at > NOW())
  );

CREATE POLICY "Cleaners can manage their own profile" ON public.cleaners
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all cleaner profiles" ON public.cleaners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Quote requests policies
CREATE POLICY "Customers can manage their own quotes" ON public.quote_requests
  FOR ALL USING (auth.uid() = customer_id);

CREATE POLICY "Cleaners can view quotes in their service areas" ON public.quote_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cleaner_service_areas csa
      JOIN public.cleaners c ON c.id = csa.cleaner_id
      WHERE c.user_id = auth.uid() AND csa.zip_code = quote_requests.zip_code
    )
  );

CREATE POLICY "Cleaners can respond to quotes" ON public.quote_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.cleaner_service_areas csa
      JOIN public.cleaners c ON c.id = csa.cleaner_id
      WHERE c.user_id = auth.uid() AND csa.zip_code = quote_requests.zip_code
    )
  );

-- Reviews policies
CREATE POLICY "Anyone can read reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Customers can create reviews for their completed jobs" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Review authors can update their own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = customer_id);

-- Subscriptions policies
CREATE POLICY "Cleaners can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c 
      WHERE c.id = subscriptions.cleaner_id AND c.user_id = auth.uid()
    )
  );

-- Service areas policies
CREATE POLICY "Anyone can view service areas" ON public.cleaner_service_areas
  FOR SELECT USING (true);

CREATE POLICY "Cleaners can manage their service areas" ON public.cleaner_service_areas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c 
      WHERE c.id = cleaner_service_areas.cleaner_id AND c.user_id = auth.uid()
    )
  );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update cleaner ratings automatically
CREATE OR REPLACE FUNCTION update_cleaner_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.cleaners 
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating::numeric), 1) 
      FROM public.reviews 
      WHERE cleaner_id = COALESCE(NEW.cleaner_id, OLD.cleaner_id)
    ),
    total_reviews = (
      SELECT COUNT(*) 
      FROM public.reviews 
      WHERE cleaner_id = COALESCE(NEW.cleaner_id, OLD.cleaner_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.cleaner_id, OLD.cleaner_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ratings when reviews are added/updated/deleted
CREATE TRIGGER update_cleaner_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_cleaner_rating();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email_confirmed_at IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to update user email verification status
CREATE OR REPLACE FUNCTION handle_user_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.users 
    SET email_verified = TRUE, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for email confirmation
CREATE TRIGGER on_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_email_confirmation();

-- Function to generate SEO-friendly slugs
CREATE OR REPLACE FUNCTION generate_cleaner_slug(business_name TEXT, city TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Create base slug from business name and city
  base_slug := lower(regexp_replace(business_name || '-' || city, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append number if needed
  WHILE EXISTS (SELECT 1 FROM public.cleaners WHERE business_slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE FLORIDA ZIP CODES DATA
-- =============================================

INSERT INTO public.florida_zip_codes (zip_code, city, county, latitude, longitude, population) VALUES
-- Major Florida Cities
('32801', 'Orlando', 'Orange', 28.5383, -81.3792, 25000),
('32804', 'Orlando', 'Orange', 28.5472, -81.3431, 35000),
('32806', 'Orlando', 'Orange', 28.4889, -81.3431, 22000),
('32807', 'Orlando', 'Orange', 28.5650, -81.3431, 28000),
('32809', 'Orlando', 'Orange', 28.4700, -81.4200, 31000),

('33101', 'Miami Beach', 'Miami-Dade', 25.7907, -80.1300, 15000),
('33109', 'Miami Beach', 'Miami-Dade', 25.8500, -80.1300, 12000),
('33125', 'Miami', 'Miami-Dade', 25.7889, -80.2500, 45000),
('33126', 'Miami', 'Miami-Dade', 25.7400, -80.3200, 28000),
('33131', 'Miami', 'Miami-Dade', 25.7600, -80.1900, 8000),

('33602', 'Tampa', 'Hillsborough', 27.9506, -82.4572, 25000),
('33603', 'Tampa', 'Hillsborough', 27.9700, -82.4800, 32000),
('33604', 'Tampa', 'Hillsborough', 28.0100, -82.4900, 28000),
('33605', 'Tampa', 'Hillsborough', 27.9800, -82.5200, 22000),
('33606', 'Tampa', 'Hillsborough', 27.9400, -82.5400, 35000),

('32204', 'Jacksonville', 'Duval', 30.3200, -81.7000, 18000),
('32205', 'Jacksonville', 'Duval', 30.3100, -81.6800, 22000),
('32207', 'Jacksonville', 'Duval', 30.2800, -81.6200, 25000),
('32208', 'Jacksonville', 'Duval', 30.3500, -81.7200, 15000),
('32209', 'Jacksonville', 'Duval', 30.3800, -81.7500, 28000),

('33301', 'Fort Lauderdale', 'Broward', 26.1224, -80.1373, 18000),
('33304', 'Fort Lauderdale', 'Broward', 26.1400, -80.1400, 22000),
('33305', 'Fort Lauderdale', 'Broward', 26.1500, -80.1500, 25000),
('33306', 'Fort Lauderdale', 'Broward', 26.1300, -80.1200, 20000),

('32301', 'Tallahassee', 'Leon', 30.4518, -84.2807, 15000),
('32303', 'Tallahassee', 'Leon', 30.4200, -84.3200, 25000),
('32304', 'Tallahassee', 'Leon', 30.4800, -84.2500, 28000),
('32305', 'Tallahassee', 'Leon', 30.5000, -84.2800, 22000);

-- =============================================
-- EMAIL TEMPLATES
-- =============================================

INSERT INTO public.email_templates (template_name, subject, html_content, text_content, variables) VALUES
('welcome_customer', 'Welcome to Boss of Clean!', 
'<h1>Welcome to Boss of Clean, {name}!</h1><p>Thank you for joining Florida''s #1 cleaning directory. You can now search for professional cleaners in your area and request quotes instantly.</p><p><a href="{app_url}/search">Start searching for cleaners</a></p>',
'Welcome to Boss of Clean, {name}! Thank you for joining Florida''s #1 cleaning directory.',
'{"name": "Customer Name", "app_url": "https://bossofclean2.netlify.app"}'),

('welcome_cleaner', 'Welcome to Boss of Clean - Start Getting Leads!', 
'<h1>Welcome to Boss of Clean, {business_name}!</h1><p>Your cleaning business profile is being reviewed. Once approved, you''ll start receiving customer leads in your service area.</p><p><a href="{app_url}/dashboard">Complete your profile</a></p>',
'Welcome to Boss of Clean! Your cleaning business profile is being reviewed.',
'{"business_name": "Business Name", "app_url": "https://bossofclean2.netlify.app"}'),

('quote_request', 'New Quote Request - {service_type}', 
'<h1>New Quote Request</h1><p>You have a new quote request for {service_type} in {zip_code}.</p><p><strong>Customer:</strong> {customer_name}<br><strong>Budget:</strong> {budget_range}<br><strong>Details:</strong> {customer_message}</p><p><a href="{app_url}/dashboard/quotes/{quote_id}">Respond to Quote</a></p>',
'New quote request for {service_type} in {zip_code} from {customer_name}.',
'{"service_type": "Service Type", "zip_code": "ZIP Code", "customer_name": "Customer", "budget_range": "Budget", "customer_message": "Message", "app_url": "https://bossofclean2.netlify.app", "quote_id": "quote-id"}');

-- =============================================
-- SUBSCRIPTION TIER FEATURES
-- =============================================

-- Insert default subscription features
INSERT INTO public.subscriptions (cleaner_id, tier, status, features, monthly_price) VALUES
(uuid_generate_v4(), 'free', 'active', '{"max_photos": 1, "priority_placement": false, "analytics": false, "featured": false, "lead_generation": false}', 0),
(uuid_generate_v4(), 'basic', 'active', '{"max_photos": 5, "priority_placement": false, "analytics": true, "featured": false, "lead_generation": false}', 29),
(uuid_generate_v4(), 'pro', 'active', '{"max_photos": -1, "priority_placement": true, "analytics": true, "featured": false, "lead_generation": true}', 79),
(uuid_generate_v4(), 'enterprise', 'active', '{"max_photos": -1, "priority_placement": true, "analytics": true, "featured": true, "lead_generation": true, "priority_support": true}', 149);

-- Remove the dummy subscription entries (they were just for reference)
DELETE FROM public.subscriptions WHERE cleaner_id IN (
  SELECT cleaner_id FROM public.subscriptions 
  WHERE cleaner_id NOT IN (SELECT id FROM public.cleaners)
);

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

-- Add a completion marker
INSERT INTO public.email_templates (template_name, subject, html_content, text_content) VALUES
('schema_complete', 'Boss of Clean Database Schema Complete', 
'Database schema has been successfully created with all tables, indexes, RLS policies, and functions.',
'Boss of Clean database is ready for production use.',
'{}');

-- Show success message
SELECT 'Boss of Clean database schema created successfully! 🚀' as status;