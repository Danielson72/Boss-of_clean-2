-- Phase C: narrow direct RPC access for elevated functions that do not need it.
-- Prepared only. Review in a database branch before applying to production.

BEGIN;

-- Legacy tier helper: no application call site was found. Server code can
-- still call it through service_role if a future internal flow needs it.
REVOKE EXECUTE ON FUNCTION public.check_quote_request_tier_limit(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_quote_request_tier_limit(uuid)
  TO service_role;

-- Trigger functions are invoked by their triggers and do not need direct RPC
-- access from browser roles.
REVOKE EXECUTE ON FUNCTION public.guard_pro_approval_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_pro_approval_status()
  TO service_role;

COMMIT;

-- Rollback, if an application dependency is later found:
-- GRANT EXECUTE ON FUNCTION public.check_quote_request_tier_limit(uuid)
--   TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.guard_pro_approval_status()
--   TO anon, authenticated;
