-- Migration: Add photo_urls column to reviews table
-- Date: 2026-01-25
-- Description: Allows customers to attach photos to their reviews

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';

COMMENT ON COLUMN reviews.photo_urls IS 'Array of URLs to photos uploaded with the review';
