# Task 003: Cleaner Onboarding Wizard

**Status:** 📋 PLANNED  
**Priority:** High  
**Estimated Effort:** 8 hours  

## Description
Build multi-step onboarding wizard for cleaning professionals to complete their profile and submit verification documents.

## Acceptance Criteria
- [ ] Create multi-step wizard UI (5 steps)
- [ ] Form validation and error handling
- [ ] Document upload with preview
- [ ] Progress saving between sessions
- [ ] Location validation and autocomplete
- [ ] Integration with approval workflow

## Implementation Plan

### Frontend Components
```typescript
// Wizard steps
enum OnboardingStep {
  BUSINESS_INFO = 1,
  LOCATION_SERVICES = 2, 
  DOCUMENTS = 3,
  TRAINING = 4,
  REVIEW = 5
}

// Step components
- BusinessInfoForm: business_name, description, team_size
- LocationServicesForm: service areas, pricing, schedule  
- DocumentUploadForm: license, insurance, background check
- TrainingModule: platform walkthrough, video tutorials
- ReviewSubmitForm: final review before admin approval
```

### Database Updates
```sql
-- Track onboarding progress
ALTER TABLE cleaners ADD COLUMN 
  onboarding_step INTEGER DEFAULT 1,
  onboarding_completed_at TIMESTAMP,
  onboarding_data JSONB; -- Store draft form data

-- Document uploads
CREATE TABLE cleaner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID REFERENCES cleaners(id),
  document_type VARCHAR(50) NOT NULL, -- 'license', 'insurance', 'background'
  file_url TEXT NOT NULL,
  upload_date TIMESTAMP DEFAULT NOW(),
  verification_status VARCHAR(20) DEFAULT 'pending'
);
```

### API Endpoints
```typescript
// Draft saving
POST /api/cleaners/onboarding/save-draft
GET /api/cleaners/onboarding/draft

// Document upload
POST /api/cleaners/documents/upload
GET /api/cleaners/documents

// Submit for approval
POST /api/cleaners/onboarding/submit
```

## UX Requirements
- Mobile-responsive design
- Auto-save drafts every 30 seconds
- Clear progress indicator
- Validation with helpful error messages
- File upload with drag-and-drop
- Preview before submission

## Testing Plan
- Unit tests for form validation
- Integration tests for API endpoints
- E2E test for complete onboarding flow
- Mobile device testing
- File upload edge cases

## Related Tasks
- task-004: Admin moderation queue (handles submissions)
- spec: cleaner-onboarding-and-approval.md (requirements)