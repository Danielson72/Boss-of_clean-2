-- Fix Reviews RLS Policy for Public Read Access
-- This migration ensures anonymous users can read reviews for cleaner profile pages

-- First, drop the existing policy if it exists (it may be misconfigured)
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can view published reviews" ON public.reviews;

-- Create the correct policy that allows both anon and authenticated users to read
CREATE POLICY "Anyone can read reviews"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (true);

-- Verify RLS is enabled on the table
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Grant SELECT permission to anon role (belt and suspenders)
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.reviews TO authenticated;
