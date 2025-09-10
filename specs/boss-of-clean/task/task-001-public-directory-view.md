# Task 001: Public Directory View

**Status:** ✅ DONE  
**Priority:** High  
**Estimated Effort:** 2 hours  
**Actual Effort:** 2 hours  

## Description
Create a privacy-safe public view of approved cleaners for the directory, excluding sensitive personal information.

## Acceptance Criteria
- [x] Create `cleaner_directory` view with only public-safe columns
- [x] Join cleaners and users tables with proper filtering
- [x] Exclude sensitive data (email, phone, full_name)
- [x] Include location data (city, state, zip_code)
- [x] Only show approved cleaners
- [x] Grant public access to view

## Implementation

### SQL Applied
```sql
-- Create privacy-safe directory view
CREATE OR REPLACE VIEW public.cleaner_directory AS
SELECT 
    c.id as cleaner_id,
    u.display_name,
    u.city,
    u.state,
    u.zip_code,
    c.business_name,
    c.description,
    c.hourly_rate,
    c.years_experience,
    c.profile_image_url,
    c.background_checked,
    c.insurance_verified,
    c.service_types,
    c.created_at
FROM public.cleaners c
JOIN public.users u ON c.user_id = u.id
WHERE c.approval_status = 'approved'
AND c.directory_visible = true;

-- Grant public access
GRANT SELECT ON public.cleaner_directory TO anon;
GRANT SELECT ON public.cleaner_directory TO authenticated;
```

### Test Query
```sql
-- Verify view works correctly
SELECT 
    cleaner_id,
    display_name,
    city,
    state,
    zip_code,
    business_name,
    hourly_rate
FROM public.cleaner_directory
LIMIT 5;
```

## Security Notes
- View automatically filters to approved cleaners only
- Sensitive columns (email, phone, full_name) excluded
- RLS policies inherited from base tables
- Public access granted for directory browsing

## Related Tasks
- task-002: Add indexes for performance
- task-006: SEO optimization with sitemap generation

## Rollback Plan
```sql
-- If needed, drop the view
DROP VIEW IF EXISTS public.cleaner_directory;
```