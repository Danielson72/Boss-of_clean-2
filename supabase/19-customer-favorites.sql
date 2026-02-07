-- Customer Favorites
-- Allows customers to save/bookmark cleaners for quick access

CREATE TABLE IF NOT EXISTS public.customer_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cleaner_id UUID NOT NULL REFERENCES public.cleaners(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, cleaner_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer_id
  ON public.customer_favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_cleaner_id
  ON public.customer_favorites(cleaner_id);

-- Enable RLS
ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

-- Customers can view their own favorites
CREATE POLICY "Customers can view own favorites"
  ON public.customer_favorites FOR SELECT
  USING (auth.uid() = customer_id);

-- Customers can add favorites
CREATE POLICY "Customers can add favorites"
  ON public.customer_favorites FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Customers can remove their own favorites
CREATE POLICY "Customers can remove own favorites"
  ON public.customer_favorites FOR DELETE
  USING (auth.uid() = customer_id);
