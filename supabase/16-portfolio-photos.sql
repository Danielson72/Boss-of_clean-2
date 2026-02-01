-- =============================================
-- PORTFOLIO PHOTOS TABLE FOR CLEANER GALLERIES
-- Allows cleaners to upload before/after photos
-- =============================================

-- Create portfolio_photos table
CREATE TABLE IF NOT EXISTS public.portfolio_photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cleaner_id UUID REFERENCES public.cleaners(id) ON DELETE CASCADE NOT NULL,

  -- Photo details
  image_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  caption TEXT,

  -- Before/After pairing
  pair_id UUID, -- Links before/after photos together
  photo_type VARCHAR(20) DEFAULT 'single' CHECK (photo_type IN ('single', 'before', 'after')),

  -- Ordering and metadata
  display_order INTEGER DEFAULT 0,
  file_size_bytes INTEGER,
  width INTEGER,
  height INTEGER,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolio_photos_cleaner_id ON public.portfolio_photos(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_photos_pair_id ON public.portfolio_photos(pair_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_photos_display_order ON public.portfolio_photos(cleaner_id, display_order);

-- Enable RLS
ALTER TABLE public.portfolio_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view portfolio photos for approved cleaners
CREATE POLICY "Anyone can view portfolio photos of approved cleaners" ON public.portfolio_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = portfolio_photos.cleaner_id
      AND c.approval_status = 'approved'
    )
  );

-- Cleaners can manage their own portfolio photos
CREATE POLICY "Cleaners can insert their own portfolio photos" ON public.portfolio_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = portfolio_photos.cleaner_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Cleaners can update their own portfolio photos" ON public.portfolio_photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = portfolio_photos.cleaner_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Cleaners can delete their own portfolio photos" ON public.portfolio_photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.cleaners c
      WHERE c.id = portfolio_photos.cleaner_id
      AND c.user_id = auth.uid()
    )
  );

-- Admins can manage all portfolio photos
CREATE POLICY "Admins can manage all portfolio photos" ON public.portfolio_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- STORAGE BUCKET SETUP (run manually in Supabase dashboard)
-- =============================================
-- Note: Storage bucket creation should be done via Supabase dashboard
-- or using the service role key. The bucket should be named 'portfolio-photos'
-- with the following policies:
--
-- Bucket: portfolio-photos
-- Public: Yes (for serving images)
-- File size limit: 1MB
-- Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Storage Policies (create in dashboard):
-- 1. Allow authenticated users to upload to their own cleaner folder
-- 2. Allow public read access
-- 3. Allow cleaners to delete their own images

-- Add function to enforce max 20 photos per cleaner
CREATE OR REPLACE FUNCTION check_portfolio_photo_limit()
RETURNS TRIGGER AS $$
DECLARE
  photo_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO photo_count
  FROM public.portfolio_photos
  WHERE cleaner_id = NEW.cleaner_id;

  IF photo_count >= 20 THEN
    RAISE EXCEPTION 'Maximum of 20 portfolio photos allowed per cleaner';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for photo limit
DROP TRIGGER IF EXISTS enforce_portfolio_photo_limit ON public.portfolio_photos;
CREATE TRIGGER enforce_portfolio_photo_limit
  BEFORE INSERT ON public.portfolio_photos
  FOR EACH ROW
  EXECUTE FUNCTION check_portfolio_photo_limit();

-- Add trigger to update timestamp
CREATE OR REPLACE FUNCTION update_portfolio_photo_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_portfolio_photos_timestamp ON public.portfolio_photos;
CREATE TRIGGER update_portfolio_photos_timestamp
  BEFORE UPDATE ON public.portfolio_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_photo_timestamp();

-- Success message
SELECT 'Portfolio photos table and policies created successfully!' as status;
