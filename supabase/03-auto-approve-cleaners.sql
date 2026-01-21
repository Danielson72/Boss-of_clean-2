-- Change default approval status to 'approved' for new cleaners
ALTER TABLE cleaners 
ALTER COLUMN approval_status SET DEFAULT 'approved';

-- Update all existing pending cleaners to approved (optional - remove if you want manual approval)
UPDATE cleaners 
SET approval_status = 'approved',
    approved_at = NOW()
WHERE approval_status = 'pending';

-- Add a trigger to automatically set approved_at when status changes to approved
CREATE OR REPLACE FUNCTION set_approved_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.approval_status = 'approved' AND OLD.approval_status != 'approved' THEN
        NEW.approved_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_approved_at_trigger
BEFORE UPDATE ON cleaners
FOR EACH ROW
EXECUTE FUNCTION set_approved_at();