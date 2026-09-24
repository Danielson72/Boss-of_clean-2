-- Run after both contact-boundary migrations.
-- Each case has its own transaction, role, runtime fixture, and rollback, so
-- this file is safe to run against production: every case ends in ROLLBACK and
-- leaves no row, policy, or grant changed. Fixtures are resolved at runtime, so
-- no environment-specific ids are hardcoded. Cases with no available fixture
-- raise a NOTICE and skip rather than fail.

-- 1. Anonymous callers cannot read the pro preview view.
BEGIN;
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF has_table_privilege('anon', 'public.quote_requests_pro_view', 'SELECT') THEN
    RAISE EXCEPTION 'anon can select pro quote view';
  END IF;
END $$;
ROLLBACK;

-- 2. The view has no customer identity or street address column.
BEGIN;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quote_requests_pro_view'
      AND column_name IN ('customer_id', 'address', 'street_address')
  ) THEN
    RAISE EXCEPTION 'private column present in pro quote view';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quote_requests_pro_view'
      AND column_name = 'updated_at'
  ) THEN
    RAISE EXCEPTION 'response-time column missing from pro quote view';
  END IF;
END $$;
ROLLBACK;

-- 3. A customer can read their own user row.
BEGIN;
SELECT set_config('request.jwt.claim.sub',
  (SELECT id::text FROM public.users WHERE role = 'customer' ORDER BY id LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'customer own user row hidden';
  END IF;
END $$;
ROLLBACK;

-- 4. An unpaid pro cannot read an unrelated customer's user row.
BEGIN;
SELECT set_config('request.jwt.claim.sub',
  (SELECT p.user_id::text FROM public.pros p WHERE p.approval_status = 'approved'
   ORDER BY p.id LIMIT 1), true);
SELECT set_config('contact_boundary.customer',
  (SELECT u.id::text FROM public.users u WHERE u.role = 'customer'
   AND NOT EXISTS (
     SELECT 1 FROM public.lead_acceptances la
     JOIN public.quote_requests qr ON qr.id = la.quote_request_id
     JOIN public.pros p ON p.id = la.cleaner_id
     WHERE p.user_id = auth.uid() AND qr.customer_id = u.id AND la.status = 'captured'
   ) ORDER BY u.id LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF current_setting('contact_boundary.customer', true) IS NULL THEN
    RAISE EXCEPTION 'missing unpaid customer fixture';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users
             WHERE id = current_setting('contact_boundary.customer')::uuid) THEN
    RAISE EXCEPTION 'unpaid pro can read customer';
  END IF;
END $$;
ROLLBACK;

-- 5. An unpaid pro cannot read the base quote row.
BEGIN;
SELECT set_config('request.jwt.claim.sub',
  (SELECT user_id::text FROM public.pros WHERE approval_status = 'approved'
   ORDER BY id LIMIT 1), true);
SELECT set_config('contact_boundary.quote',
  (SELECT qr.id::text FROM public.quote_requests qr
   WHERE qr.cleaner_id IS NULL AND qr.status = 'pending'
   AND NOT public.pro_has_captured_quote(qr.id)
   ORDER BY qr.id LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF current_setting('contact_boundary.quote', true) IS NULL THEN
    RAISE EXCEPTION 'missing pending quote fixture';
  END IF;
  IF EXISTS (SELECT 1 FROM public.quote_requests
             WHERE id = current_setting('contact_boundary.quote')::uuid) THEN
    RAISE EXCEPTION 'unpaid pro can read base quote';
  END IF;
END $$;
ROLLBACK;

-- 6. Approved pro can read a marketplace preview without contact columns.
BEGIN;
SELECT set_config('request.jwt.claim.sub',
  (SELECT user_id::text FROM public.pros WHERE approval_status = 'approved'
   ORDER BY id LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.quote_requests_pro_view
                 WHERE cleaner_id IS NULL AND status = 'pending') THEN
    RAISE EXCEPTION 'approved pro cannot read pending preview';
  END IF;
END $$;
ROLLBACK;

-- 7. A pro with a captured lead can read that quote and customer row.
BEGIN;
SELECT set_config('request.jwt.claim.sub',
  (SELECT p.user_id::text FROM public.lead_acceptances la
   JOIN public.pros p ON p.id = la.cleaner_id
   WHERE la.status = 'captured' ORDER BY la.id LIMIT 1), true);
SELECT set_config('contact_boundary.quote',
  (SELECT la.quote_request_id::text FROM public.lead_acceptances la
   JOIN public.pros p ON p.id = la.cleaner_id
   WHERE la.status = 'captured' AND p.user_id = auth.uid()
   ORDER BY la.id LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.quote_requests qr
    JOIN public.users u ON u.id = qr.customer_id
    WHERE qr.id = current_setting('contact_boundary.quote')::uuid
  ) THEN
    RAISE EXCEPTION 'captured lead contact hidden';
  END IF;
END $$;
ROLLBACK;

-- 8. A pro cannot preview another pro's assigned quote.
BEGIN;
SELECT set_config('request.jwt.claim.sub',
  (SELECT p.user_id::text FROM public.pros p
   WHERE p.approval_status = 'approved'
     AND EXISTS (SELECT 1 FROM public.quote_requests qr
                 WHERE qr.cleaner_id IS NOT NULL AND qr.cleaner_id <> p.id)
   ORDER BY p.id LIMIT 1), true);
SELECT set_config('contact_boundary.quote',
  (SELECT qr.id::text FROM public.quote_requests qr
   WHERE qr.cleaner_id IS NOT NULL
     AND qr.cleaner_id <> (SELECT id FROM public.pros WHERE user_id = auth.uid() LIMIT 1)
   ORDER BY qr.id LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF current_setting('contact_boundary.quote', true) IS NULL THEN
    RAISE EXCEPTION 'missing other-pro quote fixture';
  END IF;
  IF EXISTS (SELECT 1 FROM public.quote_requests_pro_view
             WHERE id = current_setting('contact_boundary.quote')::uuid) THEN
    RAISE EXCEPTION 'other pro quote preview exposed';
  END IF;
END $$;
ROLLBACK;

-- 9. Anonymous pros access is restricted to the public column allowlist.
BEGIN;
DO $$ BEGIN
  IF has_column_privilege('anon', 'public.pros', 'business_email', 'SELECT')
    OR has_column_privilege('anon', 'public.pros', 'business_phone', 'SELECT')
    OR has_column_privilege('anon', 'public.pros', 'insurance_verified', 'SELECT')
    OR has_table_privilege('anon', 'public.cleaners', 'SELECT') THEN
    RAISE EXCEPTION 'anonymous contact or credential field exposed';
  END IF;
  IF NOT has_column_privilege('anon', 'public.pros', 'business_name', 'SELECT') THEN
    RAISE EXCEPTION 'public business name hidden';
  END IF;
END $$;
ROLLBACK;

-- 10. Claim-then-read. Claiming a lead is not paying for it. A pro who sets
--     cleaner_id on a quote still cannot read the private row or the customer.
--     The claimed state is simulated as the table owner before dropping to the
--     pro role, and the surrounding transaction rolls it back.
BEGIN;
SELECT set_config('contact_boundary.pro_user',
  (SELECT p.user_id::text FROM public.pros p
   WHERE p.approval_status = 'approved'
     AND NOT EXISTS (
       SELECT 1 FROM public.lead_acceptances la
       WHERE la.cleaner_id = p.id AND la.status = 'captured')
   ORDER BY p.id LIMIT 1), true);
SELECT set_config('contact_boundary.pro',
  (SELECT p.id::text FROM public.pros p
   WHERE p.user_id = NULLIF(current_setting('contact_boundary.pro_user', true), '')::uuid
   LIMIT 1), true);
SELECT set_config('contact_boundary.quote',
  (SELECT qr.id::text FROM public.quote_requests qr
   WHERE qr.customer_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.lead_acceptances la
       WHERE la.quote_request_id = qr.id
         AND la.cleaner_id = NULLIF(current_setting('contact_boundary.pro', true), '')::uuid
         AND la.status = 'captured')
   ORDER BY qr.id LIMIT 1), true);
SELECT set_config('contact_boundary.customer',
  (SELECT qr.customer_id::text FROM public.quote_requests qr
   WHERE qr.id = NULLIF(current_setting('contact_boundary.quote', true), '')::uuid), true);

-- Simulate the claim as the owner. Matches nothing when a fixture is missing.
UPDATE public.quote_requests
   SET cleaner_id = NULLIF(current_setting('contact_boundary.pro', true), '')::uuid,
       status = 'responded'::quote_status
 WHERE id = NULLIF(current_setting('contact_boundary.quote', true), '')::uuid
   AND NULLIF(current_setting('contact_boundary.pro', true), '') IS NOT NULL;

SELECT set_config('request.jwt.claim.sub',
  current_setting('contact_boundary.pro_user', true), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NULLIF(current_setting('contact_boundary.pro_user', true), '') IS NULL
     OR NULLIF(current_setting('contact_boundary.quote', true), '') IS NULL THEN
    RAISE NOTICE 'skip case 10: no unpaid approved pro or claimable quote fixture';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.quote_requests
             WHERE id = current_setting('contact_boundary.quote')::uuid) THEN
    RAISE EXCEPTION 'claimed quote readable without payment';
  END IF;
  IF NULLIF(current_setting('contact_boundary.customer', true), '') IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.users
                 WHERE id = current_setting('contact_boundary.customer')::uuid) THEN
    RAISE EXCEPTION 'claimed quote customer readable without payment';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'quote_requests_pro_view'
      AND column_name IN ('address', 'street_address', 'customer_id')
  ) THEN
    RAISE EXCEPTION 'claimed quote preview exposes a private column';
  END IF;
  -- The claim is still visible as a preview; only the private row is withheld.
  IF NOT EXISTS (SELECT 1 FROM public.quote_requests_pro_view
                 WHERE id = current_setting('contact_boundary.quote')::uuid) THEN
    RAISE EXCEPTION 'claimed quote missing from pro preview';
  END IF;
END $$;
ROLLBACK;

-- 11. Paid pro isolation. Payment unlocks one relationship, not the platform.
BEGIN;
SELECT set_config('contact_boundary.pro_user',
  (SELECT p.user_id::text FROM public.lead_acceptances la
   JOIN public.pros p ON p.id = la.cleaner_id
   WHERE la.status = 'captured' ORDER BY p.id LIMIT 1), true);
SELECT set_config('request.jwt.claim.sub',
  current_setting('contact_boundary.pro_user', true), true);
SELECT set_config('contact_boundary.customer',
  (SELECT u.id::text FROM public.users u
   WHERE u.role = 'customer'
     AND NOT public.pro_has_captured_customer(u.id)
   ORDER BY u.id LIMIT 1), true);
SELECT set_config('contact_boundary.quote',
  (SELECT la.quote_request_id::text FROM public.lead_acceptances la
   WHERE la.status = 'captured'
     AND la.cleaner_id <> (SELECT p.id FROM public.pros p
                           WHERE p.user_id = NULLIF(current_setting('contact_boundary.pro_user', true), '')::uuid
                           LIMIT 1)
   ORDER BY la.id LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NULLIF(current_setting('contact_boundary.pro_user', true), '') IS NULL THEN
    RAISE NOTICE 'skip case 11: no pro holds a captured acceptance';
    RETURN;
  END IF;
  IF NULLIF(current_setting('contact_boundary.customer', true), '') IS NULL THEN
    RAISE NOTICE 'skip case 11 customer isolation: this pro has paid for every customer';
  ELSIF EXISTS (SELECT 1 FROM public.users
                WHERE id = current_setting('contact_boundary.customer')::uuid) THEN
    RAISE EXCEPTION 'paid pro can read a customer it never paid for';
  END IF;
  IF NULLIF(current_setting('contact_boundary.quote', true), '') IS NULL THEN
    RAISE NOTICE 'skip case 11 quote isolation: no lead captured by a different pro';
  ELSIF EXISTS (SELECT 1 FROM public.quote_requests
                WHERE id = current_setting('contact_boundary.quote')::uuid) THEN
    RAISE EXCEPTION 'paid pro can read a lead captured by another pro';
  END IF;
END $$;
ROLLBACK;
