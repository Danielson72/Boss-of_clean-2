-- Additive stage: safe public projection while existing reads still use pros.
-- The view owner reads the base tables; the explicit projection is the boundary.
CREATE VIEW public.pros_directory
  WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  p.id,
  p.user_id,
  p.business_name,
  p.business_slug,
  p.business_description,
  p.services,
  p.service_areas,
  p.hourly_rate,
  p.minimum_hours,
  p.years_experience,
  p.employees_count,
  p.average_rating,
  p.total_reviews,
  p.total_jobs,
  p.response_time_hours,
  p.instant_booking,
  p.subscription_tier,
  p.profile_image_url,
  p.business_hours,
  p.created_at,
  p.updated_at,
  u.city,
  u.state
FROM public.pros p
LEFT JOIN public.users u ON u.id = p.user_id
WHERE p.approval_status = 'approved'::public.approval_status;

REVOKE ALL ON public.pros_directory FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pros_directory TO anon, authenticated;
