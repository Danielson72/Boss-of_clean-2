# Task 008: Professional Search & Discovery

**Status:** ✅ COMPLETED
**Priority:** High
**Estimated Effort:** 8 hours
**Completed:** 2026-01-20

## Description
Build a customer-facing search and discovery experience for finding cleaning professionals. This is the primary way customers will discover cleaners in their area, with robust filtering and sorting capabilities.

## Acceptance Criteria
- [x] Customer search page at `/search` (existing) or `/find-cleaners`
- [x] Location search by city, zip code, or county
- [x] Filter by service type (residential, commercial, deep cleaning, etc.)
- [x] Filter by rating (4+ stars, 3+ stars, etc.)
- [x] Filter by price range (hourly rate)
- [x] Filter by availability/accepting new clients
- [x] Cleaner result cards with photo, name, rating, services, price range
- [x] Pagination or infinite scroll for large result sets
- [x] Mobile-responsive design (cards stack on mobile)
- [x] Each result links to cleaner profile page
- [x] Empty state when no results found
- [x] Loading states during search

## Implementation Plan

### Search Page Component
```typescript
// /search/page.tsx or /find-cleaners/page.tsx
interface SearchFilters {
  location: {
    type: 'city' | 'zip' | 'county';
    value: string;
  };
  serviceTypes: string[];      // residential, commercial, deep_cleaning, etc.
  minRating: number | null;    // 3, 4, 4.5, etc.
  priceRange: {
    min: number | null;
    max: number | null;
  };
  sortBy: 'rating' | 'price_low' | 'price_high' | 'newest';
}

interface SearchState {
  filters: SearchFilters;
  results: CleanerCard[];
  totalCount: number;
  page: number;
  isLoading: boolean;
  hasMore: boolean;
}
```

### Cleaner Card Component
```typescript
// components/search/CleanerCard.tsx
interface CleanerCardProps {
  id: string;
  businessName: string;
  businessSlug: string;
  profileImageUrl: string | null;
  averageRating: number;
  reviewCount: number;
  services: string[];
  hourlyRateMin: number;
  hourlyRateMax: number | null;
  yearsExperience: number;
  city: string;
  state: string;
}

// Card displays:
// - Profile photo (or placeholder)
// - Business name
// - Star rating with review count
// - Top 3 service badges
// - Price range: "$50-75/hr" or "From $50/hr"
// - Years experience
// - Location (city, state)
// - "View Profile" CTA button
```

### Search API Endpoint
```typescript
// /api/search/cleaners/route.ts
// GET /api/search/cleaners?zip=12345&services=residential,deep_cleaning&minRating=4&sortBy=rating

async function searchCleaners(params: SearchParams) {
  let query = supabase
    .from('cleaners')
    .select(`
      id, business_name, business_slug, profile_image_url,
      average_rating, review_count, services, hourly_rate,
      years_experience,
      users!inner(city, state),
      service_areas!inner(zip_code, city, county)
    `)
    .eq('approval_status', 'approved');

  // Location filter (uses task-002 indexes)
  if (params.zip) {
    query = query.eq('service_areas.zip_code', params.zip);
  } else if (params.city) {
    query = query.ilike('service_areas.city', params.city);
  } else if (params.county) {
    query = query.ilike('service_areas.county', params.county);
  }

  // Service type filter
  if (params.services?.length) {
    query = query.overlaps('services', params.services);
  }

  // Rating filter
  if (params.minRating) {
    query = query.gte('average_rating', params.minRating);
  }

  // Price range filter
  if (params.priceMin) {
    query = query.gte('hourly_rate', params.priceMin);
  }
  if (params.priceMax) {
    query = query.lte('hourly_rate', params.priceMax);
  }

  // Sorting (uses task-002 indexes)
  switch (params.sortBy) {
    case 'rating':
      query = query.order('average_rating', { ascending: false });
      break;
    case 'price_low':
      query = query.order('hourly_rate', { ascending: true });
      break;
    case 'price_high':
      query = query.order('hourly_rate', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
  }

  // Pagination
  const pageSize = 12;
  query = query.range(
    params.page * pageSize,
    (params.page + 1) * pageSize - 1
  );

  return query;
}
```

### URL Structure
```
/search                           # Landing with location prompt
/search?zip=12345                 # Search by zip
/search?city=Austin&state=TX      # Search by city
/search?zip=12345&services=residential&minRating=4&sort=rating
```

### Filter UI Components
```typescript
// components/search/SearchFilters.tsx
// - Location input with autocomplete (city/zip)
// - Service type multi-select checkboxes
// - Rating selector (star buttons)
// - Price range slider or min/max inputs
// - Sort dropdown
// - "Clear filters" button
// - Mobile: filters in collapsible drawer
```

### Results Grid Layout
```typescript
// Desktop: 3 columns (lg), 2 columns (md), 1 column (sm)
// Card spacing: gap-6
// Pagination: "Load more" button or infinite scroll with intersection observer

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {results.map(cleaner => (
    <CleanerCard key={cleaner.id} {...cleaner} />
  ))}
</div>
```

### Empty & Loading States
```typescript
// No results found
<EmptyState
  icon={SearchIcon}
  title="No cleaners found"
  description="Try expanding your search area or adjusting filters"
  action={{ label: "Clear filters", onClick: clearFilters }}
/>

// Loading
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {[...Array(6)].map((_, i) => <CleanerCardSkeleton key={i} />)}
</div>
```

## Database Indexes (from task-002)
This task leverages existing indexes:
- `idx_service_areas_zip_code` - zip code lookups
- `idx_service_areas_city` - city searches
- `idx_cleaners_services` - GIN index on services array
- `idx_cleaners_approved_rating` - approved cleaners sorted by rating
- `idx_cleaners_approved_price` - approved cleaners sorted by price
- `idx_cleaners_directory_covering` - covering index for directory queries

## Mobile Considerations
- Sticky filter bar at top
- Filter drawer slides up from bottom
- Cards stack single column
- Touch-friendly filter controls
- "Back to top" floating button after scrolling

## SEO Considerations
- Server-side rendering for initial results
- Semantic HTML for cleaner cards
- Proper heading hierarchy
- Schema.org LocalBusiness markup on cards
- Meta description with location context

## Performance Targets
- Initial search results < 500ms
- Filter updates < 300ms
- Infinite scroll prefetch next page
- Image lazy loading with blur placeholder

## Testing Checklist
- [ ] Search by zip code returns correct cleaners
- [ ] Search by city returns correct cleaners
- [ ] Multiple filters combine correctly (AND logic)
- [ ] Sorting works correctly for all options
- [ ] Pagination/infinite scroll loads more results
- [ ] Empty state displays when no results
- [ ] Mobile responsive at all breakpoints
- [ ] Links to cleaner profiles work correctly

## Related Tasks
- task-001: Public directory view (similar UI patterns)
- task-002: Database indexes (performance foundation)
- task-006: SEO and structured data
- spec: directory-browse-and-search.md
