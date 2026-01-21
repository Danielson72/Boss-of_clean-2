-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- This script sets up secure access control for all tables

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Anyone can view basic user info (for displaying names on reviews, etc)
CREATE POLICY "Public can view basic user info" ON public.users
    FOR SELECT USING (true);

-- New users can insert their profile
CREATE POLICY "Enable insert for authenticated users only" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- CLEANERS TABLE POLICIES
-- =====================================================

-- Anyone can view approved cleaners
CREATE POLICY "Anyone can view approved cleaners" ON public.cleaners
    FOR SELECT USING (approval_status = 'approved');

-- Cleaners can view their own profile regardless of status
CREATE POLICY "Cleaners can view own profile" ON public.cleaners
    FOR SELECT USING (user_id = auth.uid());

-- Cleaners can update their own profile
CREATE POLICY "Cleaners can update own profile" ON public.cleaners
    FOR UPDATE USING (user_id = auth.uid());

-- Authenticated users can create a cleaner profile
CREATE POLICY "Authenticated users can create cleaner profile" ON public.cleaners
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can view all cleaners
CREATE POLICY "Admins can view all cleaners" ON public.cleaners
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- QUOTE REQUESTS POLICIES
-- =====================================================

-- Customers can view their own quotes
CREATE POLICY "Customers can view own quotes" ON public.quote_requests
    FOR SELECT USING (customer_id = auth.uid());

-- Cleaners can view quotes sent to them
CREATE POLICY "Cleaners can view their quotes" ON public.quote_requests
    FOR SELECT USING (
        cleaner_id IN (
            SELECT id FROM public.cleaners 
            WHERE user_id = auth.uid()
        )
    );

-- Customers can create quote requests
CREATE POLICY "Customers can create quotes" ON public.quote_requests
    FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Customers can update their own quotes (cancel, etc)
CREATE POLICY "Customers can update own quotes" ON public.quote_requests
    FOR UPDATE USING (customer_id = auth.uid());

-- Cleaners can update quotes sent to them (respond, accept, etc)
CREATE POLICY "Cleaners can update their quotes" ON public.quote_requests
    FOR UPDATE USING (
        cleaner_id IN (
            SELECT id FROM public.cleaners 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- REVIEWS POLICIES
-- =====================================================

-- Anyone can view published reviews
CREATE POLICY "Anyone can view published reviews" ON public.reviews
    FOR SELECT USING (is_published = true);

-- Customers can create reviews for completed jobs
CREATE POLICY "Customers can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (
        customer_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM public.quote_requests 
            WHERE id = quote_request_id 
            AND customer_id = auth.uid() 
            AND status = 'completed'
        )
    );

-- Customers can update their own reviews
CREATE POLICY "Customers can update own reviews" ON public.reviews
    FOR UPDATE USING (customer_id = auth.uid());

-- Cleaners can add responses to reviews
CREATE POLICY "Cleaners can respond to reviews" ON public.reviews
    FOR UPDATE USING (
        cleaner_id IN (
            SELECT id FROM public.cleaners 
            WHERE user_id = auth.uid()
        )
    ) WITH CHECK (
        -- Only allow updating response fields
        NEW.rating = OLD.rating 
        AND NEW.title = OLD.title 
        AND NEW.comment = OLD.comment
    );

-- =====================================================
-- SUBSCRIPTIONS POLICIES
-- =====================================================

-- Cleaners can view their own subscriptions
CREATE POLICY "Cleaners can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (
        cleaner_id IN (
            SELECT id FROM public.cleaners 
            WHERE user_id = auth.uid()
        )
    );

-- System/webhook can manage subscriptions (using service key)
-- No policy needed as service key bypasses RLS

-- =====================================================
-- PAYMENTS POLICIES
-- =====================================================

-- Cleaners can view their own payments
CREATE POLICY "Cleaners can view own payments" ON public.payments
    FOR SELECT USING (
        cleaner_id IN (
            SELECT id FROM public.cleaners 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- SERVICE AREAS POLICIES
-- =====================================================

-- Anyone can view service areas
CREATE POLICY "Anyone can view service areas" ON public.service_areas
    FOR SELECT USING (true);

-- Cleaners can manage their own service areas
CREATE POLICY "Cleaners can manage own service areas" ON public.service_areas
    FOR ALL USING (
        cleaner_id IN (
            SELECT id FROM public.cleaners 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- LEADS POLICIES
-- =====================================================

-- Cleaners can view their own leads
CREATE POLICY "Cleaners can view own leads" ON public.leads
    FOR SELECT USING (
        cleaner_id IN (
            SELECT id FROM public.cleaners 
            WHERE user_id = auth.uid()
        )
    );

-- System can create leads (using service key)
-- No policy needed as service key bypasses RLS

-- =====================================================
-- HELPER FUNCTIONS FOR POLICIES
-- =====================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a cleaner profile
CREATE OR REPLACE FUNCTION owns_cleaner_profile(cleaner_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.cleaners 
        WHERE id = cleaner_uuid AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;