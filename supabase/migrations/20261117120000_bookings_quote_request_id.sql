-- DLD-696 (Option C): link each booking to the quote it was created from, so
-- the Stripe lead_unlock webhook can find the exact booking to unlock after a
-- captured payment, and the accept route can key its idempotency on the quote
-- instead of the (cleaner, customer, date, start_time) natural tuple.
--
-- NOT APPLIED. Daniel applies this to production before the code that reads
-- bookings.quote_request_id is merged. Additive only; no data is rewritten.

-- Exists in production out-of-band (no earlier migration). IF NOT EXISTS makes
-- this a no-op there and documents the column for other environments.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS quote_request_id uuid
    REFERENCES public.quote_requests(id) ON DELETE SET NULL;

-- One booking per accepted quote. Partial so legacy rows (NULL) are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_quote_request_id_key
  ON public.bookings (quote_request_id)
  WHERE quote_request_id IS NOT NULL;

-- Rollback:
--   DROP INDEX IF EXISTS public.bookings_quote_request_id_key;
--   ALTER TABLE public.bookings DROP COLUMN IF EXISTS quote_request_id;
