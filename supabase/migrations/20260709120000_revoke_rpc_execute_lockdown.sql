-- ============================================================================
-- RPC EXECUTE LOCKDOWN — revoke anon/authenticated EXECUTE on SECURITY DEFINER
-- functions exposed via PostgREST (/rest/v1/rpc/*).
-- Advisor lint: anon_security_definer_function_executable
-- Project: jisjxdsrflheosvodoxk (Boss of Clean production)
--
-- APPLY MANUALLY. Do not auto-push.
--
-- NOTE: service_role has BYPASSRLS and its own blanket EXECUTE grant, so all
-- server code using createServiceRoleClient() is unaffected by these REVOKEs.
-- However, code using lib/supabase/server.ts runs with the ANON key + user
-- cookies (role = authenticated, or anon when no session) — those call sites
-- are what the GRANT section below preserves.
--
-- ⚠️ PRE-APPLY REQUIREMENT (BLOCKING):
-- lib/stripe/webhook-event-service.ts uses the anon-key server client, so the
-- Stripe webhook route currently calls record_webhook_event /
-- mark_webhook_processed / mark_webhook_failed / is_webhook_processed as the
-- `anon` role. This migration revokes those. Before applying, deploy the
-- one-line fix switching webhook-event-service.ts to createServiceRoleClient()
-- — otherwise Stripe webhook processing breaks.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TRIGGER FUNCTIONS — never legitimately RPC-callable
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.enforce_cleaner_location_complete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_users_role_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admin_new_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pro_licenses_guard_verification_columns() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_pros_primary_category() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_conversation_on_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_lead_distributions_updated_at() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. ADMIN-ONLY FUNCTIONS — called from app/dashboard/admin/actions.ts server
--    actions, which run as the admin's `authenticated` session (anon-key SSR
--    client). Revoke anon/PUBLIC; re-grant authenticated below.
--    ⚠️ approve_cleaner and verify_document(uuid) have NO internal admin
--    check (app layer verifyAdmin() is the only gate) — follow-up: add an
--    is_admin() guard inside these functions or move calls to service_role.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.approve_cleaner(p_cleaner_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_cleaner(p_cleaner_id uuid, p_reason text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.request_cleaner_info(p_cleaner_id uuid, p_message text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_document(p_document_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_document(p_document_id uuid, p_status text, p_notes text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. WEBHOOK / BILLING / SERVICE-ROLE-ONLY — server-side only; no grants back.
--    (See BLOCKING note in header re: webhook-event-service.ts code fix.)
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.record_webhook_event(p_event_id character varying, p_event_type character varying, p_payload jsonb, p_customer_id text, p_subscription_id text, p_invoice_id text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_webhook_processed(p_event_id character varying) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_webhook_failed(p_event_id character varying, p_error_message text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_webhook_processed(p_event_id character varying) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_payment_failed_count(p_cleaner_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_cleaner_billing_dates(p_cleaner_id uuid, p_last_payment_date timestamp with time zone, p_next_billing_date timestamp with time zone, p_reset_failed_count boolean) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. UNUSED VIA RPC IN CODEBASE — no .rpc() call sites, not referenced by any
--    RLS policy. Revoke fully.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.match_lead_pros(p_quote_request_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_booking_tier_limit(p_customer_id uuid, p_tier subscription_tier) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_booking_tier_limit(p_customer_id uuid, p_tier text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_lead_unlock_cap(p_quote_request_id uuid, p_cleaner_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_comparisons() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. QUOTE FLOW + RATE LIMIT + RLS HELPERS — revoke, then grant back the
--    minimum proven necessary.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.check_and_increment_customer_limits(p_user_id uuid, p_ip inet, p_increment boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_quote_request_tier_limit(p_cleaner_id uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_quote_request(p_customer_id uuid, p_cleaner_id uuid, p_service_type text, p_service_date date, p_service_time time without time zone, p_address text, p_city text, p_zip_code text, p_description text, p_special_requests text, p_property_type text, p_property_size text, p_frequency text, p_duration_hours integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(p_identifier text, p_endpoint text, p_max_requests integer, p_window_seconds integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_cleaner() FROM PUBLIC, anon, authenticated;

-- ===========================================================================
-- GRANTS RESTORED (minimum proven by code audit, 2026-07-09)
-- ===========================================================================

-- RLS helper functions: is_admin() appears in 23 RLS policies, is_cleaner()
-- in 1 (users_cleaners_view_location). Policies evaluate these as the
-- querying role, and anon can query policy-bearing public tables (pros,
-- users, etc.) — both roles need EXECUTE or all reads on those tables fail.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_cleaner() TO anon, authenticated;

-- Quote flow: app/api/quote/route.ts uses the anon-key SSR client and allows
-- anonymous submitters (p_user_id may be null) → both roles required.
GRANT EXECUTE ON FUNCTION public.check_and_increment_customer_limits(p_user_id uuid, p_ip inet, p_increment boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_quote_request_tier_limit(p_cleaner_id uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_quote_request(p_customer_id uuid, p_cleaner_id uuid, p_service_type text, p_service_date date, p_service_time time without time zone, p_address text, p_city text, p_zip_code text, p_description text, p_special_requests text, p_property_type text, p_property_size text, p_frequency text, p_duration_hours integer) TO anon, authenticated;

-- Rate limiter: lib/middleware/rate-limit.ts calls /rest/v1/rpc/check_rate_limit
-- with the raw anon key (Bearer = anon key, no user JWT) → anon required.
GRANT EXECUTE ON FUNCTION public.check_rate_limit(p_identifier text, p_endpoint text, p_max_requests integer, p_window_seconds integer) TO anon;

-- Admin actions: app/dashboard/admin/actions.ts server actions run as the
-- admin's authenticated session (anon-key SSR client) after verifyAdmin().
GRANT EXECUTE ON FUNCTION public.approve_cleaner(p_cleaner_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_cleaner(p_cleaner_id uuid, p_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_cleaner_info(p_cleaner_id uuid, p_message text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_document(p_document_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_document(p_document_id uuid, p_status text, p_notes text) TO authenticated;

-- Prevent future functions from inheriting EXECUTE via default PUBLIC grant.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ===========================================================================
-- POST-APPLY VERIFICATION (run manually; expected rows listed in PR)
-- ===========================================================================
-- SELECT p.proname, r.rolname FROM pg_proc p
-- JOIN pg_namespace n ON n.oid=p.pronamespace
-- CROSS JOIN (VALUES('anon'),('authenticated')) AS r(rolname)
-- WHERE n.nspname='public'
-- AND has_function_privilege(r.rolname, p.oid, 'EXECUTE');
