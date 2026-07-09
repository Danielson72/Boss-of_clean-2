-- ============================================================================
-- FIX + CONSOLIDATE verify_document (PR #73, follow-up to the ghost-column
-- STOP in 20260709130000_admin_guard_privileged_rpcs.sql)
--
-- Both live overloads referenced columns that do not exist on
-- public.cleaner_documents:
--   * verify_document(uuid)            wrote `status` (live: verification_status)
--     — this was the overload actions.ts called, so admin document
--     verification has been broken in production.
--   * verify_document(uuid,text,text)  wrote `verification_notes` (absent).
--
-- This migration drops both and creates ONE guarded 3-arg replacement built
-- against the live schema. Live CHECK constraint
-- cleaner_documents_verification_status_check allows:
--   'pending' | 'verified' | 'rejected' | 'expired'
-- The function accepts only 'verified' | 'rejected' (admin actions).
--
-- SEQUENCING NOTE: migrations 20260709120000 (REVOKE/GRANT on the old
-- verify_document overloads) are left untouched — they are valid at their
-- point in the chain, where the old overloads still exist. This migration
-- supersedes them at the end of the chain.
--
-- APPLY MANUALLY. Do not auto-push.
-- ============================================================================

DROP FUNCTION public.verify_document(uuid);
DROP FUNCTION public.verify_document(uuid, text, text);

CREATE FUNCTION public.verify_document(
  p_document_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: admin only'
      USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('verified', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  UPDATE public.cleaner_documents
  SET verification_status = p_status,
      verified_at         = now(),
      verified_by         = auth.uid(),
      rejection_reason    = CASE WHEN p_status = 'rejected' THEN p_notes
                                 ELSE rejection_reason END,
      updated_at          = now()
  WHERE id = p_document_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$function$;

-- Lockdown consistent with PR #73: internally guarded, callable only by
-- signed-in users (admin server actions run as the admin's authenticated
-- session). service_role bypasses grants.
REVOKE EXECUTE ON FUNCTION public.verify_document(p_document_id uuid, p_status text, p_notes text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_document(p_document_id uuid, p_status text, p_notes text) TO authenticated;

-- ===========================================================================
-- POST-APPLY VERIFICATION (run manually)
-- ===========================================================================
-- 1. Only one overload remains:
--    SELECT pg_get_function_identity_arguments(oid) FROM pg_proc
--    WHERE proname='verify_document';
-- 2. As non-admin authenticated: SELECT public.verify_document(gen_random_uuid(),'verified');
--    must fail with SQLSTATE 42501.
-- 3. Admin dashboard: verify + reject-with-notes flows on a test document.
