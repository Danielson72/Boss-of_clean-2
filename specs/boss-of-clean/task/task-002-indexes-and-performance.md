# Task 002: Indexes and Performance

**Status:** ✅ COMPLETED
**Priority:** High
**Estimated Effort:** 3 hours
**Completed:** 2026-01-19

## Description
Add database indexes to optimize directory search and filtering performance.

## Acceptance Criteria
- [x] Add indexes for location-based searches (city, state, zip_code)
- [x] Add indexes for service type filtering
- [x] Add composite indexes for common filter combinations
- [x] Add indexes for sorting (rating, hourly_rate, created_at)
- [x] Verify query performance improvements

## Implementation Summary

### Pre-existing Indexes (already in place)
The following indexes were already created in previous migrations:
- `idx_cleaners_approval_status` - btree on approval_status
- `idx_cleaners_services` - GIN index on services array
- `idx_cleaners_created_at` - btree on created_at DESC
- `idx_cleaners_average_rating` - btree on average_rating DESC
- `idx_service_areas_zip_code` - btree on zip_code
- `idx_users_zip_code` - btree on zip_code

### New Indexes Created (Migration: add_directory_performance_indexes)

#### Location-Based Search Indexes
```sql
-- Users: City + State composite for directory filtering
CREATE INDEX idx_users_city_state ON users(city, state) WHERE city IS NOT NULL;

-- Service Areas: City index for geographic searches
CREATE INDEX idx_service_areas_city ON service_areas(city);

-- Service Areas: Composite for cleaner lookups by location
CREATE INDEX idx_service_areas_cleaner_city_zip ON service_areas(cleaner_id, city, zip_code);
```

#### Sorting Optimization
```sql
-- Cleaners: Hourly rate for price sorting/filtering
CREATE INDEX idx_cleaners_hourly_rate ON cleaners(hourly_rate) WHERE hourly_rate IS NOT NULL;
```

#### Composite Indexes for Directory Queries
```sql
-- Approved cleaners with rating sort
CREATE INDEX idx_cleaners_approved_rating ON cleaners(approval_status, average_rating DESC)
  WHERE approval_status = 'approved';

-- Approved cleaners with price sort
CREATE INDEX idx_cleaners_approved_price ON cleaners(approval_status, hourly_rate ASC)
  WHERE approval_status = 'approved';

-- Approved cleaners with created_at sort
CREATE INDEX idx_cleaners_approved_created ON cleaners(approval_status, created_at DESC)
  WHERE approval_status = 'approved';
```

#### Covering Index for Directory View
```sql
-- Covering index to avoid table lookups in directory view
CREATE INDEX idx_cleaners_directory_covering ON cleaners(approval_status, average_rating DESC, hourly_rate)
  INCLUDE (business_name, business_slug, profile_image_url, services, years_experience)
  WHERE approval_status = 'approved';
```

#### Quote Request Location Indexes
```sql
-- Location-based filtering for lead matching
CREATE INDEX idx_quote_requests_zip_status ON quote_requests(zip_code, status);
CREATE INDEX idx_quote_requests_city_status ON quote_requests(city, status);
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
- task-001: Public directory view (prerequisite) ✅
- task-006: SEO sitemap generation (benefits from indexes) ✅