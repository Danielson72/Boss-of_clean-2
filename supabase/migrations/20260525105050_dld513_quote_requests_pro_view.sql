-- DLD-513 (A5): quote_requests_pro_view — security-barrier view (PII WALL, structural defense)
--
-- WHY: RLS on quote_requests is ROW-level only. Once a row passes the row filter,
-- ALL columns are visible to a pro — including PII (address, customer_id, the TCPA
-- IP/user-agent fingerprint). Pre-A5, PII safety depended on code-level select-list
-- discipline, which is exactly what the legacy /leads flow violated.
--
-- WHAT: A view that exposes ONLY the columns a pro may see PRE-ACCEPTANCE, plus the
-- customer's FIRST NAME ONLY (derived from users.full_name at read time).
-- security_barrier=true prevents planner pushdown past the column projection.
-- security_invoker=true keeps the querying pro's row-level RLS on quote_requests in force.
--
-- EXCLUDED (never exposed): address, customer_id, tcpa_consent_ip, tcpa_consent_ua.
-- (contact_* already dropped in A4 / DLD-512.)
--
-- NOTE: Applied to the live DB via Supabase MCP on 2026-05-25 (verified: 0 forbidden
-- columns present). This file is the committed source-of-truth record.

DROP VIEW IF EXISTS public.quote_requests_pro_view;

CREATE VIEW public.quote_requests_pro_view
  WITH (security_barrier = true, security_invoker = true)
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
  NULLIF(split_part(trim(u.full_name), ' ', 1), '') AS customer_first_name
FROM public.quote_requests qr
LEFT JOIN public.users u ON u.id = qr.customer_id;

COMMENT ON VIEW public.quote_requests_pro_view IS
  'PII-safe pro-facing view of quote_requests (DLD-513/A5). Exposes only pre-acceptance-safe columns + customer first name. Excludes address, customer_id, TCPA IP/UA. security_invoker=true so the querying pro''s RLS on quote_requests still applies.';

GRANT SELECT ON public.quote_requests_pro_view TO authenticated;
