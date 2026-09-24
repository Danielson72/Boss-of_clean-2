-- Restore the two affiliated pro listings unlisted on 2026-09-24.
--
-- Context
-- -------
-- Two pros on the marketplace are Daniel's own affiliated brands rather than
-- third-party businesses. Both were set to approval_status = 'suspended' so
-- they stop appearing on public surfaces (directory, profile pages, city and
-- service pages, sitemap, the anonymous REST directory query) and stop
-- receiving broadcast leads from the matcher in
-- app/quote-request/submit-core.ts lines 178-202, which filters on
-- approval_status = 'approved'.
--
-- State captured immediately before the change (both were 'approved'):
--   cf941b2f-00f0-47dd-a21e-243d25335a17  trusted-cleaning-experts
--       approval_status = 'approved'
--       updated_at      = 2026-09-24 15:09:43.433543+00
--       approved_at     = 2026-04-28 21:27:20.207+00
--   3cf19153-44d5-4aef-9688-fa7b217469ba  sonz-of-thunder-svc
--       approval_status = 'approved'
--       updated_at      = 2026-09-16 18:00:26.152819+00
--       approved_at     = 2026-09-12 02:21:14.031262+00
--
-- approved_at was not modified by the unlist and is not modified here.
--
-- Two triggers matter when running this
-- -------------------------------------
-- 1. a_guard_pro_approval_status raises 42501 unless the caller is an admin,
--    the service role, or a direct owner session (auth.jwt() IS NULL AND
--    session_user IN ('postgres','supabase_admin')). Run this as the database
--    owner, not through PostgREST with a user JWT.
-- 2. enforce_cleaner_location_complete blocks any transition INTO 'approved'
--    when the linked users row lacks city or zip_code. Both users had complete
--    city and zip at capture time, so this restore passes. Re-check first if
--    either profile has been edited since.
--
-- No email, notification, or Stripe side effect fires from this statement.
-- Approval emails live in the application layer, in app/dashboard/admin/
-- actions.ts behind the approve_cleaner / reject_cleaner / request_cleaner_info
-- RPCs. Neither pro has a Stripe subscription. A direct UPDATE bypasses all of
-- it, which is deliberate: restoring a listing should not email the owner.

BEGIN;
UPDATE public.pros SET approval_status = 'approved', updated_at = now()
WHERE id IN (
  'cf941b2f-00f0-47dd-a21e-243d25335a17',
  '3cf19153-44d5-4aef-9688-fa7b217469ba'
);
-- expect UPDATE 2
COMMIT;
