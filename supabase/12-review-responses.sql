-- Add cleaner response columns to reviews table
-- This allows cleaners to respond to customer reviews

-- Add response columns
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS cleaner_response TEXT,
ADD COLUMN IF NOT EXISTS cleaner_response_at TIMESTAMP WITH TIME ZONE;

-- Add RLS policy for cleaners to update their own reviews (only response fields)
CREATE POLICY "Cleaners can respond to their own reviews" ON public.reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = reviews.cleaner_id AND c.user_id = auth.uid()
    )
  );

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_cleaner_response ON public.reviews(cleaner_id) WHERE cleaner_response IS NOT NULL;
