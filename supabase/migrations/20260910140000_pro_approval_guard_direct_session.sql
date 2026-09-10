-- Follow-up to 20260910022632_pro_approval_guard: allow direct database-owner
-- sessions (migrations, SQL editor, psql) to change pros.approval_status.
--
-- Detection: session_user is the role that authenticated the CONNECTION. It is
-- fixed at login and is not changed by SET ROLE or by SECURITY DEFINER (those
-- change current_user only). Every PostgREST request, anon included, arrives on
-- a connection logged in as `authenticator` and carries request.jwt.claims, so
-- it can never satisfy "no JWT AND session_user is postgres/supabase_admin".
-- Every other rule is identical to the merged version.
CREATE OR REPLACE FUNCTION public.guard_pro_approval_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Direct owner session: no request JWT and the connection itself was opened
  -- by the database owner or the platform superuser.
  IF auth.jwt() IS NULL
     AND session_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Request claims survive SECURITY DEFINER calls; current_user does not.
  IF (auth.jwt() ->> 'role') IS NOT DISTINCT FROM 'service_role'
     OR public.is_admin() IS TRUE THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Defaults are populated before BEFORE INSERT; explicit NULL stays NULL.
    IF NEW.approval_status IS NOT DISTINCT FROM 'pending'::public.approval_status THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status THEN
      RETURN NEW;
    END IF;

    IF (OLD.approval_status IS NOT DISTINCT FROM 'rejected'::public.approval_status
        OR OLD.approval_status IS NOT DISTINCT FROM 'info_requested'::public.approval_status)
       AND NEW.approval_status IS NOT DISTINCT FROM 'pending'::public.approval_status THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'permission denied: approval status transition requires admin access'
    USING ERRCODE = '42501';
END;
$function$;
