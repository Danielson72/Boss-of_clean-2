-- ============================================================================
-- ADMIN GUARD FOR PRIVILEGED RPCs
-- Follow-up to 20260709120000_revoke_rpc_execute_lockdown.sql (PR #73,
-- section 2 note): these SECURITY DEFINER functions are granted to
-- `authenticated` but had NO internal admin check — any signed-in user could
-- call them via /rest/v1/rpc/ directly, bypassing the app-layer verifyAdmin().
--
-- This adds `IF NOT public.is_admin() THEN RAISE 42501` as the FIRST
-- statement. Bodies otherwise byte-identical to live pg_get_functiondef
-- (pulled 2026-07-09). search_path normalized to `public, pg_temp`
-- (SECURITY DEFINER hygiene; was `public` only).
--
-- APPLY MANUALLY. Do not auto-push.
--
-- ⚠️ EXCLUDED — STOPPED PER AUDIT CONSTRAINT (ghost columns, do not guess):
--   * verify_document(p_document_id uuid) — writes cleaner_documents.status,
--     which does NOT exist (live column is verification_status). This is the
--     overload app/dashboard/admin/actions.ts:288 calls, so admin document
--     verification is ALREADY BROKEN in production. Needs a decided fix
--     (rewrite against verification_status, or drop in favor of the 3-arg
--     overload) before a guard can be added.
--   * verify_document(p_document_id uuid, p_status text, p_notes text) —
--     writes cleaner_documents.verification_notes, which does NOT exist.
--     (This overload does have an internal admin check already.)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_cleaner(p_cleaner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_email text;
  v_business_name text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: admin only'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.cleaners
  SET approval_status = 'approved',
      approved_at = now(),
      updated_at = now()
  WHERE id = p_cleaner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Professional not found');
  END IF;

  SELECT u.email, c.business_name
  INTO v_email, v_business_name
  FROM public.cleaners c
  JOIN public.users u ON u.id = c.user_id
  WHERE c.id = p_cleaner_id;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_email,
    'business_name', v_business_name
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_cleaner(p_cleaner_id uuid, p_reason text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_email text;
  v_business_name text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: admin only'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.cleaners
  SET approval_status = 'rejected',
      rejected_reason = p_reason,
      updated_at = now()
  WHERE id = p_cleaner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Professional not found');
  END IF;

  SELECT u.email, c.business_name
  INTO v_email, v_business_name
  FROM public.cleaners c
  JOIN public.users u ON u.id = c.user_id
  WHERE c.id = p_cleaner_id;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_email,
    'business_name', v_business_name
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.request_cleaner_info(p_cleaner_id uuid, p_message text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_email text;
  v_business_name text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: admin only'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.cleaners
  SET approval_status = 'info_requested',
      rejected_reason = p_message,
      updated_at = now()
  WHERE id = p_cleaner_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Professional not found');
  END IF;

  SELECT u.email, c.business_name
  INTO v_email, v_business_name
  FROM public.cleaners c
  JOIN public.users u ON u.id = c.user_id
  WHERE c.id = p_cleaner_id;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_email,
    'business_name', v_business_name
  );
END;
$function$;

-- ===========================================================================
-- POST-APPLY VERIFICATION (run manually)
-- ===========================================================================
-- As a non-admin authenticated user:
--   select public.approve_cleaner('00000000-0000-0000-0000-000000000000');
-- must fail with SQLSTATE 42501 'permission denied: admin only'.
-- As an admin, the admin dashboard approve/reject/request-info flows must
-- behave unchanged (actions.ts verifyAdmin() session passes is_admin()).
