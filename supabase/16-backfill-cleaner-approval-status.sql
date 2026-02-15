-- =====================================================
-- BACKFILL NULL approval_status ON cleaners
-- =====================================================
-- Issue: 9 cleaner records have NULL approval_status
-- Fix: Default NULLs to 'pending' so all cleaners have an explicit status
-- Also adds a NOT NULL constraint with default to prevent future NULLs

-- Step 1: Backfill existing NULLs to 'pending'
UPDATE public.cleaners
SET approval_status = 'pending'
WHERE approval_status IS NULL;

-- Step 2: Set a default so future inserts always have a status
ALTER TABLE public.cleaners
ALTER COLUMN approval_status SET DEFAULT 'pending';

-- Step 3: Add NOT NULL constraint to prevent future NULLs
ALTER TABLE public.cleaners
ALTER COLUMN approval_status SET NOT NULL;

-- Verification:
-- SELECT approval_status, COUNT(*) FROM cleaners GROUP BY approval_status;
