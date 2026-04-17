-- DLD-227: Pro document upload + admin review queue
-- Add tax_id to cleaners, replace verify_document RPC with full implementation

-- 1. Add tax_id to cleaners (for 1099-K compliance)
ALTER TABLE public.cleaners
  ADD COLUMN IF NOT EXISTS tax_id text;

-- 2. Replace verify_document with a full implementation that:
--    - Updates verification_status, notes, rejection_reason, verified_at/by
--    - Updates the corresponding cleaners boolean flags
--    - Recalculates trust_score and verification_level
CREATE OR REPLACE FUNCTION public.verify_document(
  p_document_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_cleaner_id uuid;
  v_doc_type text;
  v_trust_score int;
  v_verification_level text;
BEGIN
  IF p_status NOT IN ('verified', 'rejected', 'expired') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  -- Must be admin
  SELECT id INTO v_admin_id FROM public.users
    WHERE id = (SELECT auth.uid()) AND role = 'admin';
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get document info
  SELECT cleaner_id, document_type INTO v_cleaner_id, v_doc_type
    FROM public.cleaner_documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found');
  END IF;

  -- Update document record
  UPDATE public.cleaner_documents SET
    verification_status = p_status,
    verification_notes  = p_notes,
    rejection_reason    = CASE WHEN p_status = 'rejected' THEN p_notes ELSE NULL END,
    verified_at         = CASE WHEN p_status IN ('verified', 'rejected') THEN now() ELSE verified_at END,
    verified_by         = v_admin_id,
    updated_at          = now()
  WHERE id = p_document_id;

  -- Update cleaner verification flags based on doc type
  IF p_status = 'verified' THEN
    CASE v_doc_type
      WHEN 'insurance'         THEN UPDATE public.cleaners SET insurance_verified = true, updated_at = now() WHERE id = v_cleaner_id;
      WHEN 'id_photo'          THEN UPDATE public.cleaners SET photo_verified = true,     updated_at = now() WHERE id = v_cleaner_id;
      WHEN 'background_check'  THEN UPDATE public.cleaners SET background_check_verified = true, updated_at = now() WHERE id = v_cleaner_id;
      WHEN 'license'           THEN UPDATE public.cleaners SET license_verified = true,   updated_at = now() WHERE id = v_cleaner_id;
      ELSE NULL;
    END CASE;
  ELSIF p_status = 'rejected' THEN
    CASE v_doc_type
      WHEN 'insurance'         THEN UPDATE public.cleaners SET insurance_verified = false, updated_at = now() WHERE id = v_cleaner_id;
      WHEN 'id_photo'          THEN UPDATE public.cleaners SET photo_verified = false,     updated_at = now() WHERE id = v_cleaner_id;
      WHEN 'background_check'  THEN UPDATE public.cleaners SET background_check_verified = false, updated_at = now() WHERE id = v_cleaner_id;
      WHEN 'license'           THEN UPDATE public.cleaners SET license_verified = false,   updated_at = now() WHERE id = v_cleaner_id;
      ELSE NULL;
    END CASE;
  END IF;

  -- Recalculate trust_score and verification_level
  SELECT
    (CASE WHEN photo_verified THEN 20 ELSE 0 END) +
    (CASE WHEN insurance_verified THEN 30 ELSE 0 END) +
    (CASE WHEN background_check_verified THEN 20 ELSE 0 END) +
    (CASE WHEN license_verified THEN 10 ELSE 0 END)
  INTO v_trust_score
  FROM public.cleaners WHERE id = v_cleaner_id;

  v_verification_level := CASE
    WHEN v_trust_score >= 80 THEN 'fully_verified'
    WHEN v_trust_score >= 50 THEN 'partially_verified'
    WHEN v_trust_score >= 20 THEN 'basic_verified'
    ELSE 'unverified'
  END;

  UPDATE public.cleaners SET
    trust_score        = v_trust_score,
    verification_level = v_verification_level,
    updated_at         = now()
  WHERE id = v_cleaner_id;

  RETURN jsonb_build_object(
    'success', true,
    'cleaner_id', v_cleaner_id,
    'document_type', v_doc_type,
    'status', p_status,
    'trust_score', v_trust_score,
    'verification_level', v_verification_level
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_document(uuid, text, text) TO authenticated;
