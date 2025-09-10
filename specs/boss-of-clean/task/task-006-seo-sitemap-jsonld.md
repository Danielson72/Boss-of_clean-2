# Task 006: SEO Sitemap & JSON-LD

**Status:** 📋 PLANNED  
**Priority:** Medium  
**Estimated Effort:** 4 hours  

## Description
Implement SEO optimization with dynamic sitemaps and structured data markup for cleaner directory pages.

## Acceptance Criteria
- [ ] Dynamic XML sitemap generation
- [ ] JSON-LD structured data for LocalBusiness
- [ ] City/service-specific landing pages
- [ ] Meta tag optimization
- [ ] Schema.org markup validation

## Implementation Plan

### Sitemap Generation
```typescript
// /api/sitemap.xml
export async function GET() {
  const cleaners = await supabase
    .from('cleaner_directory')
    .select('cleaner_id, city, state, business_name, created_at');
  
  const urls = [
    // Static pages
    { url: '/directory', priority: 1.0, changefreq: 'daily' },
    
    // City pages
    ...cities.map(city => ({
      url: `/directory/${city.slug}`,
      priority: 0.8,
      changefreq: 'weekly'
    })),
    
    // Individual cleaner profiles
    ...cleaners.map(cleaner => ({
      url: `/cleaner/${cleaner.cleaner_id}`,
      priority: 0.6,
      lastmod: cleaner.created_at,
      changefreq: 'monthly'
    }))
  ];
  
  return generateSitemapXML(urls);
}
```

### JSON-LD Structured Data
```typescript
// LocalBusiness schema for cleaner profiles
function generateCleanerStructuredData(cleaner: Cleaner) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `https://bossofclean.com/cleaner/${cleaner.id}`,
    name: cleaner.business_name,
    description: cleaner.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: cleaner.city,
      addressRegion: cleaner.state,
      postalCode: cleaner.zip_code,
      addressCountry: 'US'
    },
    telephone: cleaner.phone, // Only if public
    priceRange: `$${cleaner.hourly_rate}/hour`,
    aggregateRating: cleaner.avg_rating && {
      '@type': 'AggregateRating',
      ratingValue: cleaner.avg_rating,
      reviewCount: cleaner.review_count
    }
  };
}
```

### Dynamic Meta Tags
```typescript
// City landing pages
function generateCityMeta(city: string, state: string) {
  return {
    title: `House Cleaning Services in ${city}, ${state} | Boss of Clean`,
    description: `Find trusted house cleaners in ${city}, ${state}. Compare quotes, read reviews, and book verified cleaning professionals.`,
    canonical: `/directory/${cityToSlug(city)}`,
    openGraph: {
      title: `Top House Cleaners in ${city}, ${state}`,
      description: `Professional cleaning services in ${city}. Vetted cleaners with insurance and background checks.`
    }
  };
}
```

### URL Structure
```
/directory                          # Main directory
/directory/orlando-fl               # City pages
/directory/orlando-fl/residential   # Service-specific pages
/directory/orlando-fl/commercial    # Commercial cleaning
/cleaner/[id]                      # Individual profiles
```

### Database Queries
```sql
-- City aggregation for sitemap
SELECT DISTINCT 
  city,
  state,
  COUNT(*) as cleaner_count,
  MAX(created_at) as last_updated
FROM cleaner_directory
GROUP BY city, state
HAVING COUNT(*) >= 3; -- Only cities with multiple cleaners

-- Service type pages
SELECT DISTINCT 
  unnest(service_types) as service_type,
  city,
  state,
  COUNT(*) as provider_count
FROM cleaner_directory
GROUP BY service_type, city, state;
```

## SEO Strategy
- **Local SEO**: City-specific landing pages
- **Service SEO**: Service type + location pages
- **Rich Snippets**: Structured data for enhanced SERP appearance
- **Internal Linking**: Related cleaners and services
- **Mobile Optimization**: Core Web Vitals compliance

## Performance Considerations
- Sitemap caching (update daily)
- Static generation for city pages
- Lazy loading for cleaner images
- CDN for static assets

## Testing Plan
- Schema markup validation
- Google Search Console monitoring
- Core Web Vitals testing
- Mobile-friendly testing
- Structured data testing tool

## Related Tasks
- task-001: Public directory view (data source)
- task-002: Indexes for performance (query optimization)
- spec: directory-browse-and-search.md (SEO requirements)