-- DLD-443: Add is_commercial flag to quote_requests
--
-- BOC serves residential AND commercial customers. This boolean lets the
-- customer quote form differentiate the two so downstream lead matching,
-- fee tiers, and Coverall referral routing (DLD-451) can react later.
--
-- For now we only capture the flag in the schema + UI. No routing changes.

ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS is_commercial BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.quote_requests.is_commercial IS
  'True if the customer indicated this is for a business or facility (commercial). Default false (residential). Captured by the customer quote form per DLD-443.';

CREATE INDEX IF NOT EXISTS idx_quote_requests_is_commercial
  ON public.quote_requests (is_commercial)
  WHERE is_commercial = true;
