-- =====================================================
-- BOSS OF CLEAN - COMPLETE DATABASE SCHEMA
-- =====================================================
-- This script creates all tables, indexes, and relationships
-- for the Boss of Clean platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('customer', 'cleaner', 'admin');

-- Subscription tiers
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'pro', 'enterprise');

-- Quote status
CREATE TYPE quote_status AS ENUM ('pending', 'responded', 'accepted', 'completed', 'cancelled');

-- Cleaner approval status
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- =====================================================
-- TABLES
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role DEFAULT 'customer',
    avatar_url TEXT,
    address TEXT,
    city TEXT,
    state TEXT DEFAULT 'FL',
    zip_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cleaners table
CREATE TABLE IF NOT EXISTS public.cleaners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_description TEXT,
    business_phone TEXT,
    business_email TEXT,
    website_url TEXT,
    
    -- Service details
    services TEXT[] DEFAULT '{}',
    service_areas TEXT[] DEFAULT '{}',
    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    minimum_hours INTEGER DEFAULT 2,
    
    -- Business info
    years_experience INTEGER DEFAULT 0,
    employees_count INTEGER DEFAULT 1,
    insurance_verified BOOLEAN DEFAULT FALSE,
    license_verified BOOLEAN DEFAULT FALSE,
    license_number TEXT,
    insurance_expiry DATE,
    background_check BOOLEAN DEFAULT FALSE,
    
    -- Subscription
    subscription_tier subscription_tier DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    
    -- Approval
    approval_status approval_status DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    rejected_reason TEXT,
    
    -- Performance metrics
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    total_jobs INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2) DEFAULT 0.00,
    response_time_hours INTEGER DEFAULT 24,
    
    -- Media
    profile_image_url TEXT,
    business_images TEXT[] DEFAULT '{}',
    featured_image_url TEXT,
    
    -- Business details
    business_hours JSONB DEFAULT '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "18:00"}, "saturday": {"open": "09:00", "close": "14:00"}, "sunday": {"closed": true}}',
    instant_booking BOOLEAN DEFAULT FALSE,
    cancellation_policy TEXT,
    
    -- SEO
    business_slug TEXT UNIQUE,
    seo_keywords TEXT[] DEFAULT '{}',
    marketing_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_cleaner UNIQUE(user_id)
);

-- Quote requests table
CREATE TABLE IF NOT EXISTS public.quote_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.users(id),
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id),
    
    -- Service details
    service_type TEXT NOT NULL,
    service_date DATE NOT NULL,
    service_time TIME,
    duration_hours INTEGER DEFAULT 2,
    
    -- Location
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    
    -- Quote details
    description TEXT,
    special_requests TEXT,
    property_type TEXT,
    property_size TEXT,
    frequency TEXT DEFAULT 'one-time',
    
    -- Status
    status quote_status DEFAULT 'pending',
    responded_at TIMESTAMPTZ,
    response_message TEXT,
    quoted_price DECIMAL(10,2),
    
    -- Tracking
    viewed_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.users(id),
    quote_request_id UUID REFERENCES public.quote_requests(id),
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    
    -- Review details
    service_date DATE,
    verified_booking BOOLEAN DEFAULT FALSE,
    
    -- Response
    cleaner_response TEXT,
    response_date TIMESTAMPTZ,
    
    -- Moderation
    is_published BOOLEAN DEFAULT TRUE,
    flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_customer_cleaner_review UNIQUE(customer_id, cleaner_id, quote_request_id)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    
    tier subscription_tier NOT NULL,
    status TEXT DEFAULT 'active',
    
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    monthly_price DECIMAL(10,2),
    features JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id),
    subscription_id UUID REFERENCES public.subscriptions(id),
    
    stripe_payment_intent_id TEXT UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    status payment_status DEFAULT 'pending',
    
    description TEXT,
    metadata JSONB,
    
    paid_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service areas table (for detailed ZIP code coverage)
CREATE TABLE IF NOT EXISTS public.service_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
    zip_code TEXT NOT NULL,
    city TEXT NOT NULL,
    county TEXT,
    travel_fee DECIMAL(10,2) DEFAULT 0.00,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_cleaner_zip UNIQUE(cleaner_id, zip_code)
);

-- Lead tracking table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cleaner_id UUID NOT NULL REFERENCES public.cleaners(id),
    customer_id UUID REFERENCES public.users(id),
    
    lead_type TEXT NOT NULL, -- 'profile_view', 'phone_click', 'email_click', 'quote_request'
    source TEXT, -- 'search', 'direct', 'featured'
    
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_zip_code ON public.users(zip_code);

-- Cleaners indexes
CREATE INDEX idx_cleaners_user_id ON public.cleaners(user_id);
CREATE INDEX idx_cleaners_approval_status ON public.cleaners(approval_status);
CREATE INDEX idx_cleaners_subscription_tier ON public.cleaners(subscription_tier);
CREATE INDEX idx_cleaners_average_rating ON public.cleaners(average_rating DESC);
CREATE INDEX idx_cleaners_service_areas ON public.cleaners USING GIN(service_areas);
CREATE INDEX idx_cleaners_services ON public.cleaners USING GIN(services);
CREATE INDEX idx_cleaners_business_slug ON public.cleaners(business_slug);
CREATE INDEX idx_cleaners_created_at ON public.cleaners(created_at DESC);

-- Quote requests indexes
CREATE INDEX idx_quotes_customer_id ON public.quote_requests(customer_id);
CREATE INDEX idx_quotes_cleaner_id ON public.quote_requests(cleaner_id);
CREATE INDEX idx_quotes_status ON public.quote_requests(status);
CREATE INDEX idx_quotes_service_date ON public.quote_requests(service_date);
CREATE INDEX idx_quotes_created_at ON public.quote_requests(created_at DESC);

-- Reviews indexes
CREATE INDEX idx_reviews_cleaner_id ON public.reviews(cleaner_id);
CREATE INDEX idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_cleaner_id ON public.subscriptions(cleaner_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- Service areas indexes
CREATE INDEX idx_service_areas_cleaner_id ON public.service_areas(cleaner_id);
CREATE INDEX idx_service_areas_zip_code ON public.service_areas(zip_code);

-- Leads indexes
CREATE INDEX idx_leads_cleaner_id ON public.leads(cleaner_id);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate business slug
CREATE OR REPLACE FUNCTION generate_business_slug()
RETURNS TRIGGER AS $$
BEGIN
    NEW.business_slug = LOWER(REGEXP_REPLACE(NEW.business_name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.business_slug = TRIM(BOTH '-' FROM NEW.business_slug);
    
    -- Add random suffix if slug exists
    IF EXISTS (SELECT 1 FROM public.cleaners WHERE business_slug = NEW.business_slug AND id != NEW.id) THEN
        NEW.business_slug = NEW.business_slug || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update cleaner rating
CREATE OR REPLACE FUNCTION update_cleaner_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.cleaners
    SET average_rating = (
        SELECT AVG(rating)::DECIMAL(3,2)
        FROM public.reviews
        WHERE cleaner_id = NEW.cleaner_id AND is_published = TRUE
    ),
    total_reviews = (
        SELECT COUNT(*)
        FROM public.reviews
        WHERE cleaner_id = NEW.cleaner_id AND is_published = TRUE
    )
    WHERE id = NEW.cleaner_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cleaners_updated_at BEFORE UPDATE ON public.cleaners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quote_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate business slug
CREATE TRIGGER generate_cleaner_slug BEFORE INSERT OR UPDATE OF business_name ON public.cleaners
    FOR EACH ROW EXECUTE FUNCTION generate_business_slug();

-- Update cleaner rating on review changes
CREATE TRIGGER update_rating_on_review AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_cleaner_rating();