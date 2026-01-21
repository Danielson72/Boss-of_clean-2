# Task 004: Admin Moderation Queue

**Status:** ✅ COMPLETED
**Priority:** High
**Estimated Effort:** 6 hours

## Description
Build admin dashboard for reviewing and approving/rejecting cleaner applications with document verification.

## Acceptance Criteria
- [x] Admin queue showing pending applications
- [ ] Document viewer with verification tools (deferred)
- [x] Approve/reject workflow with notes
- [ ] Email notifications to applicants (deferred)
- [ ] Batch actions for efficiency (deferred)
- [x] Audit trail for decisions

## Implementation Plan

### Admin Dashboard
```typescript
interface PendingApplication {
  cleaner_id: string;
  business_name: string;
  submitted_date: Date;
  documents_count: number;
  verification_scores: {
    profile_complete: boolean;
    documents_valid: boolean;
    references_checked: boolean;
  };
}

// Queue filtering and sorting
- Priority: incomplete docs, resubmissions, oldest first
- Filters: document type, location, submission date
- Batch actions: approve selected, request info
```

### Database Updates
```sql
-- Admin review tracking
CREATE TABLE cleaner_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID REFERENCES cleaners(id),
  admin_user_id UUID REFERENCES users(id),
  decision VARCHAR(20) NOT NULL, -- 'approved', 'rejected', 'needs_info'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Document verification
ALTER TABLE cleaner_documents ADD COLUMN
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  verification_notes TEXT;
```

### Admin Actions
```typescript
// Review actions
POST /api/admin/cleaners/{id}/approve
POST /api/admin/cleaners/{id}/reject  
POST /api/admin/cleaners/{id}/request-info

// Document verification
PATCH /api/admin/documents/{id}/verify
GET /api/admin/documents/{id}/download

// Bulk operations
POST /api/admin/cleaners/bulk-approve
```

## UI Components
- **Queue List**: Sortable table with application details
- **Application Detail**: Full profile review with documents
- **Document Viewer**: PDF viewer with annotation tools
- **Decision Modal**: Approve/reject with required notes
- **Communication Center**: Template messages to applicants

## Workflow Integration
```sql
-- Approval triggers location validation
CREATE TRIGGER enforce_location_before_approval
  BEFORE UPDATE ON cleaners
  FOR EACH ROW
  EXECUTE FUNCTION enforce_cleaner_location_complete();

-- Email notifications on status change
CREATE TRIGGER notify_cleaner_status_change
  AFTER UPDATE ON cleaners
  FOR EACH ROW
  WHEN (OLD.approval_status != NEW.approval_status)
  EXECUTE FUNCTION send_status_notification();
```

## Security & Compliance
- Admin role required for access
- Document access logging
- GDPR compliance for document handling
- Background check FCRA compliance

## Related Tasks
- task-003: Cleaner onboarding wizard (feeds into queue)
- plan: auth-roles-rls.md (admin permissions)
- spec: cleaner-onboarding-and-approval.md (business rules)