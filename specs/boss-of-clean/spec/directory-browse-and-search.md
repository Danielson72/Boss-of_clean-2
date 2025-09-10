# Directory Browse and Search Specification

## Overview
Public-facing cleaning service directory that allows homeowners to discover, filter, and connect with verified cleaning professionals in their area.

## User Stories

### Anonymous Visitors
- **Browse Directory**: View approved cleaning businesses without authentication
- **Location Filter**: Find cleaners serving specific zip codes or cities
- **Service Filter**: Filter by cleaning types (residential, commercial, deep cleaning, etc.)
- **Verification Status**: See trust indicators (background check, insurance, ratings)
- **Business Profiles**: View cleaner photos, descriptions, pricing, availability

### Authenticated Customers  
- **Save Favorites**: Bookmark preferred cleaning services
- **Request Quotes**: Contact cleaners directly through the platform
- **View History**: See past quote requests and interactions

## Functional Requirements

### Directory Display
- **Grid/List Views**: Toggle between visual grid and detailed list
- **Sorting Options**: Distance, rating, price, availability, years of experience
- **Pagination**: Handle large result sets efficiently
- **Mobile Responsive**: Touch-friendly interface for mobile users

### Search & Filtering
- **Location Search**: ZIP code, city, address autocomplete
- **Service Type**: Residential, commercial, move-in/out, deep clean, regular maintenance
- **Availability**: Today, this week, specific date ranges
- **Price Range**: Hourly rate filters
- **Verification Filters**: Background checked, insured, licensed

### Business Profiles
- **Hero Images**: Professional photos of team and work samples
- **Service Details**: Descriptions, specialties, equipment used
- **Pricing**: Transparent hourly rates and package pricing
- **Reviews**: Customer testimonials and ratings
- **Contact Options**: Quote request, phone, message

## Technical Requirements

### Performance
- **Load Time**: Directory loads in < 2 seconds
- **Search Results**: Filter results appear in < 500ms
- **Image Optimization**: Lazy loading, WebP format, CDN delivery
- **Caching**: Static content cached, dynamic filters server-side cached

### Data Sources
- **Primary View**: `public.cleaner_directory` (privacy-safe, approved only)
- **Location Data**: Join with users table for city/state/zip
- **Real-time**: Availability, pricing updates
- **Static**: Business descriptions, photos, verification status

### SEO Requirements
- **URL Structure**: `/directory/{city}/{service-type}`
- **Meta Tags**: Dynamic titles, descriptions per search
- **Schema.org**: LocalBusiness markup for each cleaner
- **Sitemap**: Auto-generated XML sitemap

## User Experience

### Discovery Flow
1. **Landing**: Clear value prop, search prominence
2. **Results**: Visual directory with key info visible
3. **Filtering**: Progressive disclosure, clear active filters
4. **Profile**: Comprehensive business details, clear CTA

### Mobile Experience
- **Touch Targets**: 44px minimum for buttons/links
- **Thumb Navigation**: Important actions within thumb reach
- **Offline Handling**: Graceful degradation without connectivity
- **App-like Feel**: Smooth transitions, instant feedback

## Success Metrics

### Engagement
- **Directory Page Views**: Track discovery patterns
- **Filter Usage**: Most common search criteria
- **Profile Views**: Conversion from listing to detail
- **Session Duration**: Time spent exploring directory

### Conversion
- **Quote Requests**: Primary conversion goal
- **Phone Clicks**: Direct contact attempts
- **Favorite Saves**: Interest indicators
- **Return Visits**: User retention

## Edge Cases

### No Results
- **Empty State**: Helpful messaging, expand search suggestions
- **Spelling Errors**: Fuzzy matching, suggested corrections
- **Unavailable Areas**: Clear messaging about service area expansion

### Performance Degradation
- **Slow Networks**: Progressive loading, skeleton states
- **Large Result Sets**: Virtual scrolling, smart pagination
- **Image Failures**: Fallback placeholders, retry mechanisms

## Privacy & Compliance

### Data Protection
- **Public Directory**: Only approved business information shown
- **Personal Data**: No customer personal info in directory
- **Location Privacy**: General service areas, not specific addresses
- **Contact Control**: All communication through platform initially

### Accessibility
- **Screen Readers**: Semantic HTML, ARIA labels
- **Keyboard Navigation**: Full functionality without mouse
- **Color Contrast**: WCAG 2.1 AA compliance
- **Text Scaling**: Readable at 200% zoom