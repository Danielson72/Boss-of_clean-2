-- Additive stage. Keep current table policies until the application reads the
-- preview view; this migration can run while the old application is live.

CREATE OR REPLACE FUNCTION public.current_pro_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id FROM public.pros p
  WHERE p.user_id = (SELECT auth.uid())
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.pro_has_captured_quote(p_quote_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lead_acceptances la
    JOIN public.pros p ON p.id = la.cleaner_id
    WHERE la.quote_request_id = p_quote_id
      AND la.status = 'captured'
      AND p.user_id = (SELECT auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.pro_has_captured_customer(p_customer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lead_acceptances la
    JOIN public.pros p ON p.id = la.cleaner_id
    JOIN public.quote_requests qr ON qr.id = la.quote_request_id
    WHERE qr.customer_id = p_customer_id
      AND la.status = 'captured'
      AND p.user_id = (SELECT auth.uid())
  )
$$;

REVOKE ALL ON FUNCTION public.current_pro_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pro_has_captured_quote(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pro_has_captured_customer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_pro_id() TO authenticated;
-- The SELECT policies apply TO public, including anon. These helpers return
-- false for callers without a signed-in pro, so they must be executable there.
GRANT EXECUTE ON FUNCTION public.pro_has_captured_quote(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pro_has_captured_customer(uuid) TO anon, authenticated;

-- Preserve the existing column order so CREATE OR REPLACE VIEW is additive.
-- The owner reads underlying rows, but the view itself grants only the safe
-- projection to an authenticated pro. Customer identity and street address
-- are intentionally absent.
CREATE OR REPLACE VIEW public.quote_requests_pro_view
  WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  qr.id,
  qr.service_type,
  qr.is_commercial,
  qr.service_date,
  qr.service_time,
  qr.duration_hours,
  qr.city,
  qr.zip_code,
  qr.description,
  qr.special_requests,
  qr.property_type,
  qr.property_size,
  qr.frequency,
  qr.status,
  qr.cleaner_id,
  qr.quoted_price,
  qr.response_message,
  qr.responded_at,
  qr.created_at,
  NULLIF(split_part(trim(u.full_name), ' ', 1), '') AS customer_first_name,
  qr.updated_at
FROM public.quote_requests qr
LEFT JOIN public.users u ON u.id = qr.customer_id
WHERE (SELECT auth.uid()) IS NOT NULL
  AND (
    qr.cleaner_id = (SELECT public.current_pro_id())
    OR (
      qr.cleaner_id IS NULL
      AND qr.status = 'pending'::quote_status
      AND EXISTS (
        SELECT 1 FROM public.pros p
        WHERE p.user_id = (SELECT auth.uid())
          AND p.approval_status = 'approved'::approval_status
      )
    )
  );

REVOKE ALL ON public.quote_requests_pro_view FROM anon;
GRANT SELECT ON public.quote_requests_pro_view TO authenticated;
