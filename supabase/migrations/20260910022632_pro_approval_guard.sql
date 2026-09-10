-- Approval transitions are authorized at the base table, including view writes.
-- Apply only after review; this migration does not change policies or grants.
CREATE OR REPLACE FUNCTION public.guard_pro_approval_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
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

-- Runs before the existing slug and location checks; neither is replaced.
-- The a_ prefix deliberately orders this guard before enforce_cleaner_location_complete; do not rename it.
CREATE TRIGGER a_guard_pro_approval_status
BEFORE INSERT OR UPDATE ON public.pros
FOR EACH ROW EXECUTE FUNCTION public.guard_pro_approval_status();
