-- Migration: fix_indexes
-- Date: 2026-02-22
-- Fixes: 4 duplicate indexes wasting space/writes, 15 unindexed foreign keys
-- causing slow JOINs as data grows.

-- ============================================================
-- PART 1: Drop 4 duplicate indexes
-- ============================================================

-- cleaners: keep _gin suffix versions (more descriptive)
DROP INDEX IF EXISTS public.idx_cleaners_service_areas;
DROP INDEX IF EXISTS public.idx_cleaners_services;

-- customer_favorites: keep fully-qualified names
DROP INDEX IF EXISTS public.idx_favorites_cleaner;
DROP INDEX IF EXISTS public.idx_favorites_customer;

-- ============================================================
-- PART 2: Add 15 missing FK indexes
-- ============================================================

-- booking_history
CREATE INDEX IF NOT EXISTS idx_booking_history_quote_request_id
  ON public.booking_history (quote_request_id);

-- booking_transactions (4 FKs missing indexes)
CREATE INDEX IF NOT EXISTS idx_booking_transactions_cancelled_by
  ON public.booking_transactions (cancelled_by);
CREATE INDEX IF NOT EXISTS idx_booking_transactions_cleaner_id
  ON public.booking_transactions (cleaner_id);
CREATE INDEX IF NOT EXISTS idx_booking_transactions_customer_id
  ON public.booking_transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_transactions_quote_request_id
  ON public.booking_transactions (quote_request_id);

-- cleaner_availability
CREATE INDEX IF NOT EXISTS idx_cleaner_availability_cleaner_id
  ON public.cleaner_availability (cleaner_id);

-- cleaner_documents
CREATE INDEX IF NOT EXISTS idx_cleaner_documents_verified_by
  ON public.cleaner_documents (verified_by);

-- customer_credits
CREATE INDEX IF NOT EXISTS idx_customer_credits_hire_confirmation_id
  ON public.customer_credits (source_hire_confirmation_id);

-- lead_refund_requests
CREATE INDEX IF NOT EXISTS idx_lead_refund_requests_reviewed_by
  ON public.lead_refund_requests (reviewed_by);

-- leads
CREATE INDEX IF NOT EXISTS idx_leads_customer_id
  ON public.leads (customer_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_reported_by
  ON public.messages (reported_by);

-- payments (2 FKs missing indexes)
CREATE INDEX IF NOT EXISTS idx_payments_cleaner_id
  ON public.payments (cleaner_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id
  ON public.payments (subscription_id);

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_quote_request_id
  ON public.reviews (quote_request_id);

-- services_pricing
CREATE INDEX IF NOT EXISTS idx_services_pricing_cleaner_id
  ON public.services_pricing (cleaner_id);
