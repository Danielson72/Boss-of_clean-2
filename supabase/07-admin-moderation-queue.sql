-- Migration: Admin Moderation Queue
-- Task: task-004
-- Description: Tables and functions for admin review of cleaner applications

-- ============================================================================
-- 1. CLEANER REVIEWS TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cleaner_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID NOT NULL REFERENCES cleaners(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES users(id),
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_info')),
  notes TEXT,
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX idx_cleaner_reviews_cleaner_id ON cleaner_reviews(cleaner_id);
CREATE INDEX idx_cleaner_reviews_admin_user_id ON cleaner_reviews(admin_user_id);
CREATE INDEX idx_cleaner_reviews_created_at ON cleaner_reviews(created_at DESC);

-- ============================================================================
-- 2. RLS POLICIES FOR CLEANER_REVIEWS
-- ============================================================================

ALTER TABLE cleaner_reviews ENABLE ROW LEVEL SECURITY;

-- Admins can view all reviews
CREATE POLICY "Admins can view all cleaner reviews"
  ON cleaner_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can insert reviews
CREATE POLICY "Admins can create cleaner reviews"
  ON cleaner_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Cleaners can view their own reviews
CREATE POLICY "Cleaners can view their own reviews"
  ON cleaner_reviews FOR SELECT
  TO authenticated
  USING (
    cleaner_id IN (
      SELECT id FROM cleaners WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. ADMIN HELPER FUNCTIONS
-- ============================================================================

-- Function to approve a cleaner application
CREATE OR REPLACE FUNCTION approve_cleaner(
  p_cleaner_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_old_status VARCHAR(20);
  v_cleaner_email TEXT;
  v_business_name TEXT;
BEGIN
  -- Get admin user id
  SELECT id INTO v_admin_id FROM users WHERE id = auth.uid() AND role = 'admin';
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get current cleaner status and info
  SELECT c.approval_status, u.email, c.business_name
  INTO v_old_status, v_cleaner_email, v_business_name
  FROM cleaners c
  JOIN users u ON c.user_id = u.id
  WHERE c.id = p_cleaner_id;

  IF v_old_status IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Cleaner not found');
  END IF;

  -- Update cleaner status
  UPDATE cleaners
  SET
    approval_status = 'approved',
    approved_at = NOW(),
    rejected_reason = NULL
  WHERE id = p_cleaner_id;

  -- Create audit record
  INSERT INTO cleaner_reviews (cleaner_id, admin_user_id, decision, notes, previous_status, new_status)
  VALUES (p_cleaner_id, v_admin_id, 'approved', p_admin_notes, v_old_status, 'approved');

  RETURN json_build_object(
    'success', true,
    'cleaner_id', p_cleaner_id,
    'business_name', v_business_name,
    'email', v_cleaner_email,
    'previous_status', v_old_status,
    'new_status', 'approved'
  );
END;
$$;

-- Function to reject a cleaner application
CREATE OR REPLACE FUNCTION reject_cleaner(
  p_cleaner_id UUID,
  p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_old_status VARCHAR(20);
  v_cleaner_email TEXT;
  v_business_name TEXT;
BEGIN
  -- Validate reason is provided
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Rejection reason is required');
  END IF;

  -- Get admin user id
  SELECT id INTO v_admin_id FROM users WHERE id = auth.uid() AND role = 'admin';
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get current cleaner status and info
  SELECT c.approval_status, u.email, c.business_name
  INTO v_old_status, v_cleaner_email, v_business_name
  FROM cleaners c
  JOIN users u ON c.user_id = u.id
  WHERE c.id = p_cleaner_id;

  IF v_old_status IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Cleaner not found');
  END IF;

  -- Update cleaner status
  UPDATE cleaners
  SET
    approval_status = 'rejected',
    rejected_reason = p_reason,
    approved_at = NULL
  WHERE id = p_cleaner_id;

  -- Create audit record
  INSERT INTO cleaner_reviews (cleaner_id, admin_user_id, decision, notes, previous_status, new_status)
  VALUES (p_cleaner_id, v_admin_id, 'rejected', p_reason, v_old_status, 'rejected');

  RETURN json_build_object(
    'success', true,
    'cleaner_id', p_cleaner_id,
    'business_name', v_business_name,
    'email', v_cleaner_email,
    'previous_status', v_old_status,
    'new_status', 'rejected'
  );
END;
$$;

-- Function to request more info from cleaner
CREATE OR REPLACE FUNCTION request_cleaner_info(
  p_cleaner_id UUID,
  p_request_notes TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_old_status VARCHAR(20);
  v_cleaner_email TEXT;
  v_business_name TEXT;
BEGIN
  -- Validate notes are provided
  IF p_request_notes IS NULL OR trim(p_request_notes) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Request notes are required');
  END IF;

  -- Get admin user id
  SELECT id INTO v_admin_id FROM users WHERE id = auth.uid() AND role = 'admin';
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get current cleaner status and info
  SELECT c.approval_status, u.email, c.business_name
  INTO v_old_status, v_cleaner_email, v_business_name
  FROM cleaners c
  JOIN users u ON c.user_id = u.id
  WHERE c.id = p_cleaner_id;

  IF v_old_status IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Cleaner not found');
  END IF;

  -- Update cleaner status to needs_info (reuse pending with a flag)
  UPDATE cleaners
  SET
    approval_status = 'pending',
    rejected_reason = 'INFO_REQUESTED: ' || p_request_notes
  WHERE id = p_cleaner_id;

  -- Create audit record
  INSERT INTO cleaner_reviews (cleaner_id, admin_user_id, decision, notes, previous_status, new_status)
  VALUES (p_cleaner_id, v_admin_id, 'needs_info', p_request_notes, v_old_status, 'pending');

  RETURN json_build_object(
    'success', true,
    'cleaner_id', p_cleaner_id,
    'business_name', v_business_name,
    'email', v_cleaner_email,
    'previous_status', v_old_status,
    'new_status', 'pending',
    'info_requested', true
  );
END;
$$;

-- Function to verify a document
CREATE OR REPLACE FUNCTION verify_document(
  p_document_id UUID,
  p_status VARCHAR(20),
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Validate status
  IF p_status NOT IN ('verified', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status. Must be verified or rejected');
  END IF;

  -- Get admin user id
  SELECT id INTO v_admin_id FROM users WHERE id = auth.uid() AND role = 'admin';
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Update document
  UPDATE cleaner_documents
  SET
    verification_status = p_status,
    verified_by = v_admin_id,
    verified_at = NOW(),
    verification_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_document_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Document not found');
  END IF;

  RETURN json_build_object(
    'success', true,
    'document_id', p_document_id,
    'status', p_status
  );
END;
$$;

-- ============================================================================
-- 4. ADMIN QUEUE VIEW
-- ============================================================================

CREATE OR REPLACE VIEW admin_pending_applications AS
SELECT
  c.id AS cleaner_id,
  c.business_name,
  c.approval_status,
  c.created_at AS application_date,
  c.onboarding_completed_at AS submitted_at,
  c.years_experience,
  c.hourly_rate,
  c.insurance_verified,
  c.background_check,
  c.rejected_reason,
  u.id AS user_id,
  u.email,
  u.full_name,
  u.city,
  u.state,
  u.zip_code,
  -- Document counts
  (SELECT COUNT(*) FROM cleaner_documents cd WHERE cd.cleaner_id = c.id) AS total_documents,
  (SELECT COUNT(*) FROM cleaner_documents cd WHERE cd.cleaner_id = c.id AND cd.verification_status = 'pending') AS pending_documents,
  (SELECT COUNT(*) FROM cleaner_documents cd WHERE cd.cleaner_id = c.id AND cd.verification_status = 'verified') AS verified_documents,
  -- Review history
  (SELECT COUNT(*) FROM cleaner_reviews cr WHERE cr.cleaner_id = c.id) AS review_count,
  (SELECT created_at FROM cleaner_reviews cr WHERE cr.cleaner_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_review_at
FROM cleaners c
JOIN users u ON c.user_id = u.id
WHERE c.approval_status IN ('pending', 'rejected')
  AND c.onboarding_completed_at IS NOT NULL
ORDER BY
  CASE WHEN c.rejected_reason LIKE 'INFO_REQUESTED:%' THEN 0 ELSE 1 END,
  c.onboarding_completed_at ASC;

-- Grant access to admin view
GRANT SELECT ON admin_pending_applications TO authenticated;

-- ============================================================================
-- 5. GRANT EXECUTE ON FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION approve_cleaner(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_cleaner(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION request_cleaner_info(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_document(UUID, VARCHAR, TEXT) TO authenticated;
