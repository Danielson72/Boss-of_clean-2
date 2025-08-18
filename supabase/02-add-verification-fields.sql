-- Add verification badge fields to cleaners table
ALTER TABLE cleaners
ADD COLUMN IF NOT EXISTS background_check_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS photo_verified BOOLEAN DEFAULT FALSE;

-- Note: insurance_verified already exists in the table

-- Add index for faster queries on verification status
CREATE INDEX IF NOT EXISTS idx_cleaners_verification 
ON cleaners(background_check_verified, insurance_verified, photo_verified);

-- Add a computed column for "Boss of Clean Certified" status
-- A cleaner is certified if they have all three verifications
ALTER TABLE cleaners
ADD COLUMN IF NOT EXISTS is_certified BOOLEAN GENERATED ALWAYS AS 
  (background_check_verified = TRUE AND insurance_verified = TRUE AND photo_verified = TRUE) STORED;

-- Add index on certification status for faster queries
CREATE INDEX IF NOT EXISTS idx_cleaners_certified ON cleaners(is_certified);

-- Update existing cleaners to set photo_verified = true if they have profile photos
UPDATE cleaners 
SET photo_verified = TRUE 
WHERE array_length(profile_photos, 1) > 0;