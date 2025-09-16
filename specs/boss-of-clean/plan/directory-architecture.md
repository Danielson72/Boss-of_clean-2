# Directory Architecture Plan

## Overview
Technical architecture for the public cleaner directory, enabling customers to browse and search verified cleaning professionals.

## Components

### Frontend Layer
- **React Components**: Directory grid, search filters, cleaner profile cards
- **State Management**: Search filters, pagination, favorites (for authenticated users)
- **Routing**: `/directory`, `/directory/{city}`, `/cleaner/{id}`
- **Mobile-First**: Responsive design, touch-friendly interface

### API Layer
- **GET /api/directory**: Paginated cleaner listings with filters
- **GET /api/cleaners/:id**: Individual cleaner profile
- **POST /api/quotes**: Quote request submission (authenticated)

### Database Views
```sql
-- Public-safe directory view (already implemented)
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
```

### Search & Filtering
- **Elasticsearch/PostgREST**: Full-text search on business descriptions
- **Geographic Filters**: PostGIS for location-based search
- **Faceted Search**: Service types, price ranges, verification status
- **Performance**: Materialized view refresh, Redis caching

### SEO Strategy
- **Server-Side Rendering**: Next.js for SEO-friendly pages
- **Dynamic Meta Tags**: City-specific titles and descriptions
- **Schema.org Markup**: LocalBusiness structured data
- **URL Structure**: `/directory/orlando/residential-cleaning`

## Security Considerations
- **RLS Policies**: Directory view only shows approved cleaners
- **Rate Limiting**: Prevent scraping and abuse
- **Data Privacy**: No personal contact info in public view
- **Input Validation**: Sanitize all search parameters

## Performance Targets
- **Initial Load**: < 2 seconds for directory page
- **Search Results**: < 500ms for filter application
- **Images**: Lazy loading, WebP format, CDN delivery
- **Caching**: 15-minute cache for directory data

## Monitoring
- **Core Web Vitals**: LCP, FID, CLS tracking
- **Search Analytics**: Popular filters, null result queries
- **Conversion Tracking**: Directory view → profile view → quote request
- **Error Monitoring**: 404s, search failures, image load errors