-- Apply only after every public/customer pro read uses pros_directory and all
-- PostgREST pro embeds have been replaced by explicit second queries.
DROP POLICY "pros_select" ON public.pros;
CREATE POLICY "pros_select" ON public.pros FOR SELECT TO public
  USING (
    public.is_admin()
    OR ((SELECT auth.uid()) = user_id)
  );

-- PR A left an anonymous column grant for its public pages. The directory
-- view now serves those pages, so revoke both table and column privileges.
REVOKE ALL ON public.pros FROM anon;
REVOKE SELECT (
  id, user_id, business_name, business_slug, business_description,
  services, service_areas, hourly_rate, minimum_hours, years_experience,
  employees_count, average_rating, total_reviews, total_jobs,
  response_time_hours, instant_booking, subscription_tier,
  profile_image_url, business_hours, created_at, updated_at, approval_status
) ON public.pros FROM anon;

-- Keep the legacy views for rollback, but make them inaccessible. The live
-- cleaner_directory view also has a PUBLIC SELECT grant, which must go first.
REVOKE ALL ON public.cleaners FROM anon, authenticated;
REVOKE ALL ON public.cleaner_directory FROM PUBLIC, anon, authenticated;
