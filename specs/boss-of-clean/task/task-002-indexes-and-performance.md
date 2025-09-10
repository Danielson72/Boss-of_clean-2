# Task 002: Indexes and Performance

**Status:** 📋 PLANNED  
**Priority:** High  
**Estimated Effort:** 3 hours  

## Description
Add database indexes to optimize directory search and filtering performance.

## Acceptance Criteria
- [ ] Add indexes for location-based searches (city, state, zip_code)
- [ ] Add indexes for service type filtering
- [ ] Add composite indexes for common filter combinations
- [ ] Add indexes for sorting (rating, hourly_rate, created_at)
- [ ] Verify query performance improvements

## Proposed Implementation

### Core Indexes
```sql
-- Location searches
CREATE INDEX idx_users_city_state ON users(city, state) WHERE city IS NOT NULL;
CREATE INDEX idx_users_zip_code ON users(zip_code) WHERE zip_code IS NOT NULL;

-- Cleaner filtering
CREATE INDEX idx_cleaners_approval_status ON cleaners(approval_status);
CREATE INDEX idx_cleaners_directory_visible ON cleaners(directory_visible);
CREATE INDEX idx_cleaners_service_types ON cleaners USING GIN(service_types);

-- Sorting optimization
CREATE INDEX idx_cleaners_hourly_rate ON cleaners(hourly_rate) WHERE hourly_rate IS NOT NULL;
CREATE INDEX idx_cleaners_created_at ON cleaners(created_at);
```

### Composite Indexes
```sql
-- Common filter combinations
CREATE INDEX idx_cleaners_approved_visible ON cleaners(approval_status, directory_visible, created_at);
CREATE INDEX idx_cleaners_location_approved ON cleaners(approval_status, directory_visible) 
  INCLUDE (user_id, business_name, hourly_rate);
```

## Performance Targets
- Directory page load: < 500ms
- Filter application: < 200ms
- City-based searches: < 300ms
- Service type filtering: < 400ms

## Testing Plan
- Benchmark queries before and after
- Test with realistic data volume (1000+ cleaners)
- Monitor index usage and query plans
- Load test directory endpoints

## Related Tasks
- task-001: Public directory view (prerequisite)
- task-006: SEO sitemap generation (benefits from indexes)