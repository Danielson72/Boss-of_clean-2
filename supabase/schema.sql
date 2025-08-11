-- Enable the UUID extension
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
  'post_construction'
);
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'pro', 'enterprise');
CREATE TYPE quote_status AS ENUM ('pending', 'responded', 'accepted', 'completed', 'cancelled');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  role user_role DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Cleaners business profiles table
CREATE TABLE public.cleaners (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  description TEXT,
  services service_type[] DEFAULT '{}',
  service_areas VARCHAR(255)[] DEFAULT '{}', -- ZIP codes they serve
  hourly_rate DECIMAL(10,2),
  minimum_hours INTEGER DEFAULT 2,
  years_experience INTEGER,
  insurance_verified BOOLEAN DEFAULT FALSE,
  license_verified BOOLEAN DEFAULT FALSE,
  background_check BOOLEAN DEFAULT FALSE,
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id VARCHAR(255),
  average_rating DECIMAL(2,1) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  profile_image_url VARCHAR(500),
  business_images VARCHAR(500)[] DEFAULT '{}',
  availability_schedule JSONB, -- Store weekly schedule
  instant_booking BOOLEAN DEFAULT FALSE,
  response_time_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Quote requests table
CREATE TABLE public.quote_requests (
  id UUID DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE SET NULL,
  service_type service_type NOT NULL,
  property_size VARCHAR(50), -- e.g., "1br", "2br", "3000sqft", "small office"
  property_type VARCHAR(50), -- e.g., "apartment", "house", "office"
  frequency VARCHAR(50), -- e.g., "one-time", "weekly", "bi-weekly", "monthly"
  preferred_date DATE,
  preferred_time VARCHAR(20),
  zip_code VARCHAR(10) NOT NULL,
  address TEXT,
  special_instructions TEXT,
  estimated_hours INTEGER,
  budget_range VARCHAR(50), -- e.g., "$100-200", "$200-300"
  status quote_status DEFAULT 'pending',
  customer_message TEXT,
  cleaner_response TEXT,
  quoted_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE,
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  photos VARCHAR(500)[] DEFAULT '{}',
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Cleaner service areas for better search
CREATE TABLE public.cleaner_service_areas (
  id UUID DEFAULT uuid_generate_v4(),
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE,
  zip_code VARCHAR(10) NOT NULL,
  city VARCHAR(100),
  county VARCHAR(100),
  travel_fee DECIMAL(10,2) DEFAULT 0.00,
  max_travel_distance INTEGER DEFAULT 25, -- miles
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_cleaners_user_id ON public.cleaners(user_id);
CREATE INDEX idx_cleaners_services ON public.cleaners USING GIN(services);
CREATE INDEX idx_cleaners_service_areas ON public.cleaners USING GIN(service_areas);
CREATE INDEX idx_cleaners_subscription_tier ON public.cleaners(subscription_tier);
CREATE INDEX idx_cleaners_rating ON public.cleaners(average_rating DESC);
CREATE INDEX idx_quote_requests_customer_id ON public.quote_requests(customer_id);
CREATE INDEX idx_quote_requests_cleaner_id ON public.quote_requests(cleaner_id);
CREATE INDEX idx_quote_requests_zip_code ON public.quote_requests(zip_code);
CREATE INDEX idx_quote_requests_service_type ON public.quote_requests(service_type);
CREATE INDEX idx_quote_requests_status ON public.quote_requests(status);
CREATE INDEX idx_reviews_cleaner_id ON public.reviews(cleaner_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_cleaner_service_areas_zip ON public.cleaner_service_areas(zip_code);
CREATE INDEX idx_cleaner_service_areas_cleaner_id ON public.cleaner_service_areas(cleaner_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaner_service_areas ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Cleaners policies
CREATE POLICY "Anyone can view active cleaner profiles" ON public.cleaners
  FOR SELECT USING (subscription_tier != 'free' OR subscription_expires_at > NOW());

CREATE POLICY "Cleaners can manage their own profile" ON public.cleaners
  FOR ALL USING (auth.uid() = user_id);

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

-- Reviews policies
CREATE POLICY "Anyone can read reviews" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Customers can create reviews for their completed jobs" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Review authors can update their own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = customer_id);

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

-- Function to update cleaner ratings
CREATE OR REPLACE FUNCTION update_cleaner_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.cleaners 
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating::numeric), 1) 
      FROM public.reviews 
      WHERE cleaner_id = NEW.cleaner_id
    ),
    total_reviews = (
      SELECT COUNT(*) 
      FROM public.reviews 
      WHERE cleaner_id = NEW.cleaner_id
    ),
    updated_at = NOW()
  WHERE id = NEW.cleaner_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ratings when reviews are added/updated
CREATE TRIGGER update_cleaner_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_cleaner_rating();

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Insert sample Florida ZIP codes and cities for testing
INSERT INTO public.cleaner_service_areas (cleaner_id, zip_code, city, county) VALUES
  (uuid_generate_v4(), '32801', 'Orlando', 'Orange'),
  (uuid_generate_v4(), '33101', 'Miami', 'Miami-Dade'),
  (uuid_generate_v4(), '33602', 'Tampa', 'Hillsborough'),
  (uuid_generate_v4(), '32204', 'Jacksonville', 'Duval'),
  (uuid_generate_v4(), '33301', 'Fort Lauderdale', 'Broward'),
  (uuid_generate_v4(), '32301', 'Tallahassee', 'Leon');