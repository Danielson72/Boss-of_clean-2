-- =====================================================
-- FIX MISSING ROW LEVEL SECURITY POLICIES
-- Critical security fix for Boss of Clean
-- =====================================================

-- Enable RLS on tables that were missing it
ALTER TABLE IF EXISTS public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.florida_zip_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cleaner_service_areas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- EMAIL_TEMPLATES POLICIES
-- =====================================================

-- Only admins can manage email templates
CREATE POLICY IF NOT EXISTS "Admins can manage email templates" ON public.email_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- System can read email templates (for sending emails)
CREATE POLICY IF NOT EXISTS "System can read email templates" ON public.email_templates
    FOR SELECT USING (true);

-- =====================================================
-- FLORIDA_ZIP_CODES POLICIES
-- =====================================================

-- Anyone can view ZIP codes (public data)
CREATE POLICY IF NOT EXISTS "Anyone can view Florida ZIP codes" ON public.florida_zip_codes
    FOR SELECT USING (true);

-- Only admins can manage ZIP codes
CREATE POLICY IF NOT EXISTS "Admins can manage ZIP codes" ON public.florida_zip_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- ANALYTICS_EVENTS POLICIES
-- =====================================================

-- Users can create their own analytics events
CREATE POLICY IF NOT EXISTS "Users can create own analytics events" ON public.analytics_events
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR user_id IS NULL
    );

-- Users can view their own analytics events
CREATE POLICY IF NOT EXISTS "Users can view own analytics events" ON public.analytics_events
    FOR SELECT USING (
        user_id = auth.uid() 
        OR user_id IS NULL -- Anonymous events
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can view all analytics
CREATE POLICY IF NOT EXISTS "Admins can view all analytics" ON public.analytics_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- CLEANER_SERVICE_AREAS POLICIES
-- =====================================================

-- Anyone can view service areas (needed for search)
CREATE POLICY IF NOT EXISTS "Anyone can view service areas" ON public.cleaner_service_areas
    FOR SELECT USING (true);

-- Cleaners can manage their own service areas
CREATE POLICY IF NOT EXISTS "Cleaners can manage own service areas" ON public.cleaner_service_areas
    FOR ALL USING (
        cleaner_id IN (
            SELECT id FROM public.cleaners 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- FIX QUOTE_REQUESTS POLICIES FOR TEMP USERS
-- =====================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Customers can create quotes" ON public.quote_requests;

-- Allow authenticated users AND temporary users to create quotes
CREATE POLICY "Anyone can create quote requests" ON public.quote_requests
    FOR INSERT WITH CHECK (
        -- Either authenticated user or temporary ID pattern
        customer_id = auth.uid() 
        OR customer_id LIKE 'temp_%'
    );

-- Allow viewing quotes for authenticated users or matching temp IDs
DROP POLICY IF EXISTS "Customers can view own quotes" ON public.quote_requests;

CREATE POLICY "Users can view relevant quotes" ON public.quote_requests
    FOR SELECT USING (
        customer_id = auth.uid()
        OR customer_id LIKE 'temp_%' -- Temporary quotes are viewable
        OR cleaner_id IN (
            SELECT id FROM public.cleaners 
            WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- ENSURE ALL CRITICAL TABLES HAVE RLS ENABLED
-- =====================================================

-- Double-check all tables have RLS enabled
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- =====================================================
-- GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant permissions for anonymous users to create quotes
GRANT INSERT ON public.quote_requests TO anon;
GRANT SELECT ON public.quote_requests TO anon;
GRANT SELECT ON public.florida_zip_codes TO anon;
GRANT SELECT ON public.cleaner_service_areas TO anon;
GRANT SELECT ON public.cleaners TO anon;

-- Grant permissions for authenticated users
GRANT ALL ON public.quote_requests TO authenticated;
GRANT SELECT ON public.florida_zip_codes TO authenticated;
GRANT ALL ON public.cleaner_service_areas TO authenticated;
GRANT ALL ON public.analytics_events TO authenticated;

-- Service role has full access (bypasses RLS)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;