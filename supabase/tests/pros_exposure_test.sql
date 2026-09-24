-- Run after both pros-exposure migrations.
-- Each role is isolated in its own transaction that always ends in ROLLBACK, so
-- this file is safe to run against production: it leaves no row, policy, or grant
-- changed. Fixtures are resolved at runtime, so no environment-specific ids are
-- hardcoded.

-- ROLE: anon. Cases: safe directory; approved-only; no contact columns;
-- no base or legacy view access.
BEGIN;
SELECT set_config('pros_test.approved_count',
  (SELECT count(*)::text FROM public.pros WHERE approval_status = 'approved'), true);
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.pros_directory) < 1 THEN
    RAISE EXCEPTION 'directory is empty for anon fixture';
  END IF;
  IF (SELECT count(*) FROM public.pros_directory)::text <>
     current_setting('pros_test.approved_count') THEN
    RAISE EXCEPTION 'directory does not show exactly approved pros';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pros_directory'
      AND (column_name IN ('business_phone','business_email','phone','email',
        'trust_score','stripe_customer_id') OR column_name ~ '_verif')) THEN
    RAISE EXCEPTION 'directory has a private column';
  END IF;
  IF has_table_privilege('anon','public.pros','SELECT')
     OR has_any_column_privilege('anon','public.pros','SELECT') THEN
    RAISE EXCEPTION 'anon can read base pros';
  END IF;
  IF has_table_privilege('anon','public.cleaners','SELECT')
     OR has_table_privilege('anon','public.cleaner_directory','SELECT') THEN
    RAISE EXCEPTION 'anon can read a legacy view';
  END IF;
END $$;
ROLLBACK;

-- SCHEMA: customer contact must NOT be served by a database function. Customer
-- access to a pro's contact stays on the existing service-role path
-- (getAcceptedQuoteProContacts), which already gates on a captured acceptance.
BEGIN;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'pro_contact_for_customer'
  ) THEN
    RAISE EXCEPTION 'pro_contact_for_customer must not exist; contact stays on the service-role path';
  END IF;
  IF has_table_privilege('authenticated','public.cleaners','SELECT')
     OR has_table_privilege('authenticated','public.cleaner_directory','SELECT') THEN
    RAISE EXCEPTION 'authenticated can read a legacy view';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pros_directory'
      AND column_name = 'zip_code') THEN
    RAISE EXCEPTION 'directory exposes a pro home zip_code';
  END IF;
END $$;
ROLLBACK;

-- ROLE: other pro. Approved peers are visible in the directory, not base pros.
BEGIN;
SELECT set_config('request.jwt.claim.sub',
  (SELECT user_id::text FROM public.pros WHERE approval_status = 'approved'
   ORDER BY id LIMIT 1), true);
SELECT set_config('pros_test.other_pro',
  (SELECT id::text FROM public.pros WHERE user_id <> auth.uid()
     AND approval_status = 'approved' ORDER BY id LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF current_setting('pros_test.other_pro', true) IS NULL THEN
    RAISE EXCEPTION 'missing other pro fixture';
  END IF;
  IF (SELECT count(*) FROM public.pros WHERE id =
      current_setting('pros_test.other_pro')::uuid) <> 0 THEN
    RAISE EXCEPTION 'pro can read peer base row';
  END IF;
  IF (SELECT count(*) FROM public.pros_directory WHERE id =
      current_setting('pros_test.other_pro')::uuid) <> 1 THEN
    RAISE EXCEPTION 'approved peer absent from directory';
  END IF;
END $$;
ROLLBACK;

-- ROLE: owner pro. Authenticated keeps base table privilege and RLS own row.
BEGIN;
SELECT set_config('request.jwt.claim.sub',
  (SELECT user_id::text FROM public.pros ORDER BY id LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT has_table_privilege('authenticated','public.pros','SELECT') THEN
    RAISE EXCEPTION 'authenticated lost base pros privilege';
  END IF;
  IF (SELECT count(*) FROM (SELECT * FROM public.pros
       WHERE user_id = auth.uid()) own_pro) <> 1 THEN
    RAISE EXCEPTION 'owner cannot select star from own pro row';
  END IF;
END $$;
ROLLBACK;

-- ROLE: admin. All pro rows remain available through the admin policy.
BEGIN;
SELECT set_config('request.jwt.claim.sub',
  (SELECT id::text FROM public.users WHERE role = 'admin'
   ORDER BY id LIMIT 1), true);
SELECT set_config('pros_test.pro_count',
  (SELECT count(*)::text FROM public.pros), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'missing admin fixture'; END IF;
  IF (SELECT count(*) FROM public.pros)::text <>
     current_setting('pros_test.pro_count') THEN
    RAISE EXCEPTION 'admin cannot read all pros';
  END IF;
END $$;
ROLLBACK;
