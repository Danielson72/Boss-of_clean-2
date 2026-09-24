-- Apply only after the application has moved pro preview reads to the view.
DROP POLICY "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT TO public
  USING (
    public.is_admin()
    OR ((SELECT auth.uid()) = id)
    OR (public.pro_has_captured_customer(id))
  );

DROP POLICY "quote_requests_select" ON public.quote_requests;
CREATE POLICY "quote_requests_select" ON public.quote_requests FOR SELECT TO public
  USING (
    public.is_admin()
    OR (customer_id = (SELECT auth.uid()))
    OR (public.pro_has_captured_quote(id))
  );

-- PostgREST requires SELECT visibility for UPDATE; the existing pro update
-- policy remains in force, so a pro response uses a scoped server write.
REVOKE ALL ON public.pros FROM anon;
GRANT SELECT (
  id, user_id, business_name, business_slug, business_description,
  services, service_areas, hourly_rate, minimum_hours, years_experience,
  employees_count, average_rating, total_reviews, total_jobs,
  response_time_hours, instant_booking, subscription_tier,
  profile_image_url, business_hours,
  created_at, updated_at, approval_status
) ON public.pros TO anon;

REVOKE ALL ON public.cleaners FROM anon;
