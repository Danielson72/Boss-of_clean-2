-- ============================================================================
-- PII LOG + BUCKET LISTING LOCKDOWN
-- Project: jisjxdsrflheosvodoxk (Boss of Clean production)
-- Advisor findings: (1) permissive USING(true) policy on public.pii_filter_log
-- bound to {public} (all roles); (2) broad SELECT policies on storage.objects
-- for the three public buckets, allowing full file listing by anyone.
--
-- APPLY MANUALLY. Do not auto-push.
--
-- Audit basis (2026-07-09):
-- * Only code path touching pii_filter_log is app/api/messages/route.ts:349,
--   which INSERTs via createServiceRoleClient(). service_role bypasses RLS,
--   so the permissive policy needs no replacement. The two duplicate admin
--   SELECT policies ("Admins can view/read pii_filter_log") are left as-is.
-- * No client code calls .list()/.download()/createSignedUrl() on
--   portfolio-photos, profile-images, or review-photos. All three buckets are
--   public=true, so object serving via getPublicUrl does NOT go through these
--   SELECT policies and is unaffected.
-- * EXCEPTION: profile photo upload uses upload(..., { upsert: true })
--   (app/dashboard/pro/profile/page.tsx), and storage upsert requires
--   SELECT + INSERT + UPDATE on the row. Broad SELECT is therefore replaced
--   with owner-scoped SELECT (same folder convention as the existing
--   INSERT/UPDATE/DELETE policies) rather than dropped, on all three buckets
--   for consistency. This kills anonymous bucket enumeration while keeping
--   upsert and owner self-reads working.
-- ============================================================================

-- (1) pii_filter_log: drop the row-security bypass
DROP POLICY "Service role manages pii_filter_log" ON public.pii_filter_log;

-- (2) storage.objects: replace public SELECT with owner-scoped SELECT
DROP POLICY "Public read access for portfolio photos" ON storage.objects;
DROP POLICY "Public read access for profile images" ON storage.objects;
DROP POLICY "Public read access for review photos" ON storage.objects;

CREATE POLICY "Owners read own portfolio photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'portfolio-photos'
         AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Owners read own profile images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-images'
         AND (storage.foldername(name))[1] = (auth.uid())::text);

CREATE POLICY "Owners read own review photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'review-photos'
         AND (storage.foldername(name))[1] = (auth.uid())::text);

-- ===========================================================================
-- POST-APPLY VERIFICATION (run manually)
-- ===========================================================================
-- 1. Policy state:
--    SELECT policyname, roles, cmd, qual FROM pg_policies
--    WHERE (schemaname='public' AND tablename='pii_filter_log')
--       OR (schemaname='storage' AND tablename='objects'
--           AND qual ~ 'portfolio-photos|profile-images|review-photos');
--    Expect: 2 admin SELECT policies on pii_filter_log (no ALL policy);
--    per bucket: owner SELECT/INSERT/UPDATE/DELETE, no {public} SELECT.
-- 2. Anonymous listing must fail/return empty:
--    curl -s "$SUPABASE_URL/storage/v1/object/list/portfolio-photos" \
--      -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
--      -X POST -H 'Content-Type: application/json' -d '{"prefix":""}'
-- 3. Public URLs still serve (bucket is public=true):
--    curl -I "$SUPABASE_URL/storage/v1/object/public/profile-images/<known-path>"
-- 4. App smoke: pro profile photo re-upload (upsert) still succeeds;
--    messages route still logs to pii_filter_log (service_role).
