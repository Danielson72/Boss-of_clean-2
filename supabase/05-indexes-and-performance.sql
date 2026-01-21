-- =====================================================
-- TASK 002: INDEXES AND PERFORMANCE
-- =====================================================
-- Migration to add database indexes for optimizing
-- directory search and filtering performance.
-- =====================================================

-- =====================================================
-- SCHEMA ADDITIONS
-- =====================================================

-- Add directory_visible column to cleaners table
-- Controls whether a cleaner appears in public directory listings
ALTER TABLE public.cleaners
ADD COLUMN IF NOT EXISTS directory_visible BOOLEAN DEFAULT TRUE;

-- =====================================================
-- LOCATION-BASED SEARCH INDEXES
-- =====================================================

-- Composite index for city + state searches (partial - only non-null cities)
CREATE INDEX IF NOT EXISTS idx_users_city_state
ON public.users(city, state)
WHERE city IS NOT NULL;

-- =====================================================
-- CLEANER FILTERING INDEXES
-- =====================================================

-- Index for directory visibility filtering
CREATE INDEX IF NOT EXISTS idx_cleaners_directory_visible
ON public.cleaners(directory_visible);

-- =====================================================
-- SORTING OPTIMIZATION INDEXES
-- =====================================================

-- Partial index for hourly rate sorting (only non-null rates)
CREATE INDEX IF NOT EXISTS idx_cleaners_hourly_rate
ON public.cleaners(hourly_rate)
WHERE hourly_rate IS NOT NULL;

-- =====================================================
-- COMPOSITE INDEXES FOR COMMON FILTER COMBINATIONS
-- =====================================================

-- Composite index for approved + visible cleaners with created_at for sorting
-- Optimizes the most common directory listing query pattern
CREATE INDEX IF NOT EXISTS idx_cleaners_approved_visible
ON public.cleaners(approval_status, directory_visible, created_at DESC);

-- Composite index with INCLUDE for covering index pattern
-- Reduces need to access table for common select fields
CREATE INDEX IF NOT EXISTS idx_cleaners_location_approved
ON public.cleaners(approval_status, directory_visible)
INCLUDE (user_id, business_name, hourly_rate);

-- =====================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- =====================================================

-- Index for subscription tier + approval status combination
-- Useful for filtering paid/visible cleaners
CREATE INDEX IF NOT EXISTS idx_cleaners_tier_approved
ON public.cleaners(subscription_tier, approval_status)
WHERE directory_visible = TRUE;

-- Partial index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_cleaners_active_subscription
ON public.cleaners(subscription_expires_at)
WHERE subscription_expires_at > NOW() AND directory_visible = TRUE;

-- =====================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- =====================================================

-- Update statistics for query optimizer
ANALYZE public.users;
ANALYZE public.cleaners;
ANALYZE public.cleaner_service_areas;

-- =====================================================
-- COMPLETION
-- =====================================================
SELECT 'Task 002: Indexes and performance migration completed successfully' as status;
