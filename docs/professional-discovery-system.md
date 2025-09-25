# Professional Discovery & Booking System Documentation

## Overview

The Professional Discovery & Booking System is a comprehensive solution that enables customers to search, discover, and book cleaning services from verified professionals. This system integrates seamlessly with the existing Boss of Clean platform architecture and provides the foundation for scalable professional services.

## System Architecture

```mermaid
erDiagram
    users ||--o{ cleaners : "has profile"
    users ||--o{ booking_transactions : "creates"
    users ||--o{ reviews : "writes"

    cleaners ||--o{ professional_profiles : "has"
    cleaners ||--o{ cleaner_availability : "defines"
    cleaners ||--o{ services_pricing : "offers"
    cleaners ||--o{ service_areas : "serves"
    cleaners ||--o{ booking_transactions : "receives"
    cleaners ||--o{ reviews : "receives"

    quote_requests ||--o{ booking_transactions : "converts to"
    booking_transactions ||--o{ reviews : "generates"

    florida_zipcodes ||--o{ service_areas : "references"

    users {
        uuid id PK
        varchar email UK
        varchar full_name
        varchar phone
        user_role role
        varchar avatar_url
        text address
        varchar city
        varchar state
        varchar zip_code
        timestamptz created_at
        timestamptz updated_at
    }

    cleaners {
        uuid id PK
        uuid user_id FK
        varchar business_name
        text business_description
        varchar business_phone
        varchar business_email
        varchar website_url
        text_array services
        text_array service_areas
        decimal hourly_rate
        integer minimum_hours
        integer years_experience
        integer employees_count
        boolean insurance_verified
        boolean license_verified
        boolean background_check_verified
        subscription_tier subscription_tier
        decimal average_rating
        integer total_reviews
        integer total_jobs
        decimal response_rate
        integer response_time_hours
        varchar profile_image_url
        text_array business_images
        varchar featured_image_url
        jsonb business_hours
        boolean instant_booking
        text cancellation_policy
        varchar business_slug UK
        approval_status approval_status
        integer trust_score
        boolean guarantee_eligible
        timestamptz created_at
        timestamptz updated_at
    }

    professional_profiles {
        uuid id PK
        uuid cleaner_id FK UK
        text tagline
        text bio
        text_array specialties
        text_array languages_spoken
        jsonb certifications
        jsonb insurance_details
        jsonb portfolio_images
        varchar intro_video_url
        integer team_size
        boolean brings_supplies
        boolean eco_friendly
        boolean pet_friendly
        integer response_time_minutes
        decimal acceptance_rate
        decimal on_time_rate
        decimal completion_rate
        text_array badges
        integer years_on_platform
        decimal repeat_customer_rate
        timestamptz created_at
        timestamptz updated_at
    }

    cleaner_availability {
        uuid id PK
        uuid cleaner_id FK
        jsonb weekly_schedule
        jsonb date_overrides
        integer advance_booking_days
        integer minimum_notice_hours
        integer buffer_time_minutes
        varchar external_calendar_url
        timestamptz last_sync_at
        timestamptz created_at
        timestamptz updated_at
    }

    services_pricing {
        uuid id PK
        uuid cleaner_id FK
        varchar service_type
        varchar service_name
        text description
        decimal base_price
        varchar price_unit
        jsonb pricing_tiers
        jsonb package_deals
        jsonb add_ons
        decimal minimum_charge
        boolean is_active
        boolean instant_booking_available
        integer priority_order
        boolean featured
        timestamptz created_at
        timestamptz updated_at
    }

    booking_transactions {
        uuid id PK
        uuid customer_id FK
        uuid cleaner_id FK
        uuid quote_request_id FK
        varchar booking_reference UK
        varchar service_type
        date service_date
        time service_time
        decimal duration_hours
        text address
        varchar city
        varchar state
        varchar zip_code
        varchar property_type
        integer property_size_sqft
        text special_instructions
        decimal base_price
        jsonb add_ons
        decimal discount_amount
        decimal travel_fee
        decimal total_amount
        subscription_tier customer_tier
        integer monthly_booking_count
        varchar status
        timestamptz confirmed_at
        varchar confirmation_code
        timestamptz check_in_time
        timestamptz check_out_time
        decimal actual_duration_hours
        timestamptz cancelled_at
        uuid cancelled_by FK
        text cancellation_reason
        decimal cancellation_fee
        varchar payment_method
        varchar stripe_payment_intent_id
        varchar payment_status
        timestamptz paid_at
        timestamptz reminder_sent_at
        timestamptz follow_up_sent_at
        varchar source
        jsonb device_info
        timestamptz created_at
        timestamptz updated_at
    }

    service_areas {
        uuid id PK
        uuid cleaner_id FK
        varchar zip_code FK
        varchar city
        varchar county
        decimal travel_fee
        boolean is_primary
        timestamptz created_at
    }

    florida_zipcodes {
        varchar zip_code PK
        varchar city
        varchar county
        decimal latitude
        decimal longitude
        geometry geom
    }

    reviews {
        uuid id PK
        uuid cleaner_id FK
        uuid customer_id FK
        uuid quote_request_id FK
        integer rating
        varchar title
        text comment
        date service_date
        boolean verified_booking
        text cleaner_response
        timestamptz response_date
        boolean is_published
        boolean flagged
        text flag_reason
        timestamptz created_at
        timestamptz updated_at
    }

    quote_requests {
        uuid id PK
        uuid customer_id FK
        uuid cleaner_id FK
        varchar service_type
        date service_date
        time service_time
        integer duration_hours
        text address
        varchar city
        varchar zip_code
        text description
        text special_requests
        varchar property_type
        varchar property_size
        varchar frequency
        quote_status status
        timestamptz responded_at
        text response_message
        decimal quoted_price
        timestamptz created_at
        timestamptz updated_at
    }
```

## Database Schema Details

### Core Tables

#### 1. professional_profiles
Enhanced professional profiles with comprehensive information for discovery and trust-building.

**Key Features:**
- Portfolio management with categorized images
- Certification tracking with verification status
- Performance metrics (response time, acceptance rate, etc.)
- Badge system for achievements
- Video introduction support

#### 2. cleaner_availability
Flexible availability management system supporting recurring schedules and date-specific overrides.

**Weekly Schedule Format:**
```json
{
  "monday": [{"start": "09:00", "end": "17:00"}],
  "tuesday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "18:00"}],
  "wednesday": [{"start": "09:00", "end": "17:00"}],
  "thursday": [{"start": "09:00", "end": "17:00"}],
  "friday": [{"start": "09:00", "end": "17:00"}],
  "saturday": [{"start": "10:00", "end": "14:00"}],
  "sunday": [{"closed": true}]
}
```

**Date Overrides Format:**
```json
[
  {"date": "2025-12-25", "available": false, "reason": "Holiday"},
  {"date": "2025-01-15", "slots": [{"start": "10:00", "end": "14:00"}], "reason": "Limited availability"}
]
```

#### 3. services_pricing
Comprehensive pricing structure supporting multiple pricing models.

**Pricing Tiers Format:**
```json
[
  {"min_sqft": 0, "max_sqft": 1000, "price": 100},
  {"min_sqft": 1001, "max_sqft": 2000, "price": 150},
  {"min_sqft": 2001, "max_sqft": 999999, "price": 200}
]
```

**Package Deals Format:**
```json
[
  {"name": "Weekly Special", "frequency": "weekly", "discount_percent": 15},
  {"name": "Monthly Package", "frequency": "monthly", "discount_percent": 20}
]
```

#### 4. booking_transactions
Complete booking lifecycle management with subscription tier enforcement.

**Key Features:**
- Tier-based booking limits validation
- Comprehensive status tracking
- Payment integration with Stripe
- Time tracking for service execution
- Cancellation handling with fees

### Search Optimization

#### Materialized View: cleaner_search_index
Pre-computed search results for optimal performance:
- Aggregated cleaner data with profiles
- Service areas and cities
- Performance metrics
- Next available dates

#### Stored Procedures

1. **search_cleaners_by_location()**
   - Geospatial search with radius filtering
   - Service type and feature filtering
   - Tier-based result prioritization
   - Performance optimized with indexes

2. **check_booking_tier_limit()**
   - Validates monthly booking limits
   - Supports all subscription tiers
   - Returns boolean for limit check

3. **get_cleaner_availability()**
   - Returns availability for date range
   - Considers existing bookings
   - Processes weekly schedules and overrides

## API Endpoints

### 1. Search API: `/api/pros/search`

#### GET Parameters:
- `zipCode` (required): Target ZIP code
- `serviceType`: Filter by service type
- `radius`: Search radius in miles (default: 10)
- `minRating`: Minimum rating filter
- `maxPrice`: Maximum hourly rate
- `instantBooking`: Filter for instant booking availability
- `date`: Check availability for specific date
- `page`: Page number for pagination
- `limit`: Results per page (max: 50)

#### Response Format:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "cleaner_id": "uuid",
        "business_name": "string",
        "business_slug": "string",
        "tagline": "string",
        "average_rating": 4.8,
        "total_reviews": 150,
        "hourly_rate": 45.00,
        "distance_miles": 2.3,
        "response_time_minutes": 120,
        "instant_booking": true,
        "subscription_tier": "pro",
        "next_available_date": "2025-01-15",
        "badges": ["top_rated", "eco_warrior"],
        "profile_image_url": "string"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasMore": true
    },
    "filters": {
      "zipCode": "32801",
      "radius": 10,
      "serviceType": "residential"
    }
  }
}
```

#### POST (Advanced Search)
Supports complex filtering with multiple criteria:
- Multiple ZIP codes and service types
- Price ranges and availability windows
- Feature filters (eco-friendly, pet-friendly, etc.)
- Advanced sorting options

### 2. Profile API: `/api/pros/[id]`

#### GET Response:
Comprehensive professional profile including:
- Business information and contact details
- Service areas and pricing options
- Performance metrics and ratings
- Reviews with customer details
- Portfolio images and videos
- Availability calendar
- Verification status and trust indicators

#### PUT (Profile Updates)
Supports updating all profile sections:
- Business information
- Professional details
- Pricing and services
- Availability settings
- Portfolio content

### 3. Booking API: `/api/book`

#### POST Request:
```json
{
  "cleanerId": "uuid",
  "serviceType": "residential",
  "serviceDate": "2025-01-15",
  "serviceTime": "10:00",
  "durationHours": 3,
  "address": "123 Main St",
  "city": "Orlando",
  "zipCode": "32801",
  "propertyType": "apartment",
  "propertySizeSqufeet": 1200,
  "basePrice": 45.00,
  "addOns": [
    {"name": "Inside Oven", "price": 25.00}
  ],
  "paymentMethod": "stripe",
  "stripePaymentMethodId": "pm_xxx"
}
```

#### Response:
```json
{
  "success": true,
  "booking": {
    "id": "uuid",
    "reference": "BC12345678",
    "status": "confirmed",
    "cleanerName": "Sparkle Clean Services",
    "serviceDate": "2025-01-15",
    "serviceTime": "10:00",
    "duration": 3,
    "address": "123 Main St, Orlando",
    "totalAmount": 160.00,
    "instantBooking": true
  },
  "payment": {
    "paymentIntentId": "pi_xxx",
    "clientSecret": "pi_xxx_secret_xxx",
    "status": "succeeded"
  },
  "nextSteps": "Your booking is confirmed! You will receive a confirmation email shortly.",
  "estimatedResponse": "Immediate"
}
```

## Subscription Tier Integration

### Tier Limits
- **Free**: 1 booking per month
- **Basic**: 5 bookings per month
- **Pro**: 15 bookings per month
- **Enterprise**: Unlimited bookings

### Features by Tier
- **Free**: Basic search, standard profiles
- **Basic**: Priority in search results, enhanced profiles
- **Pro**: Premium placement, instant booking, advanced analytics
- **Enterprise**: Top placement, custom branding, dedicated support

### Enforcement
- Real-time limit checking during booking
- Monthly reset of booking counters
- Upgrade prompts when limits exceeded
- Grace period handling for tier transitions

## Performance Optimizations

### Database Indexes
```sql
-- Geospatial search
CREATE INDEX idx_florida_zipcodes_geom ON florida_zipcodes USING GIST(geom);

-- Search optimization
CREATE INDEX idx_cleaner_search_rating ON cleaner_search_index(average_rating DESC NULLS LAST);
CREATE INDEX idx_cleaner_search_tier ON cleaner_search_index(subscription_tier);
CREATE INDEX idx_cleaner_search_services ON cleaner_search_index USING GIN(services);

-- Booking performance
CREATE INDEX idx_booking_transactions_month ON booking_transactions(DATE_TRUNC('month', created_at));
CREATE INDEX idx_booking_transactions_date ON booking_transactions(service_date);
```

### Caching Strategy
- Materialized view refresh on data changes
- API response caching for search results
- CDN integration for profile images
- Redis caching for availability checks

### Query Optimization
- Use of stored procedures for complex queries
- Proper JOIN strategies with selective filters
- Pagination with cursor-based navigation for large result sets
- Async loading for non-critical profile sections

## Security Implementation

### Row Level Security (RLS)
All tables have comprehensive RLS policies:
- Users can only access their own bookings
- Cleaners can manage their own profiles and see relevant bookings
- Public access restricted to approved, active profiles
- Admin override capabilities for support operations

### Data Protection
- PII encryption for sensitive data
- Secure payment processing via Stripe
- Image upload validation and processing
- Rate limiting on search and booking APIs

## Integration Points

### Existing Systems
- **Authentication**: Seamless integration with Supabase Auth
- **Payments**: Enhanced Stripe integration with booking context
- **Notifications**: Email/SMS for booking confirmations and updates
- **File Storage**: Supabase Storage for profile images and portfolios

### External Services
- **Google Maps**: Geospatial calculations and address validation
- **Stripe**: Payment processing and subscription management
- **SendGrid/Twilio**: Notification delivery
- **Calendar APIs**: Availability synchronization

## Agent Hand-off Specifications

### For boss-clean-visual-designer
**Mobile-First Search Interface Requirements:**
- Responsive grid layout for professional cards
- Filter UI with collapsible sections
- Map view integration for location-based search
- Swipeable professional profile carousels
- Touch-optimized booking flow
- iOS/Android native feel with bottom sheets and modal presentations

**Key Components to Design:**
1. **SearchFilters**: Collapsible filter interface
2. **ProfessionalCard**: Grid and list view variants
3. **ProfileHeader**: Hero section with ratings and verification badges
4. **BookingForm**: Multi-step form with validation
5. **MapView**: Integrated map with professional markers
6. **AvailabilityCalendar**: Touch-friendly date/time selection

### For stripe-cleaning-payments
**Enhanced Payment Integration:**
- Booking-specific payment intents with metadata
- Subscription tier validation before payment processing
- Automatic refund handling for cancellations
- Split payments for team bookings
- Recurring payment setup for regular services

**Required Webhook Handlers:**
- `payment_intent.succeeded`: Confirm booking and send notifications
- `payment_intent.payment_failed`: Handle failed payments and retry logic
- `invoice.payment_succeeded`: Process subscription tier upgrades
- `customer.subscription.updated`: Update cleaner tier in database

### For boss-clean-tester
**Comprehensive Test Matrix:**

**Search Flow Tests:**
- Geospatial search accuracy within radius
- Filter combination validation
- Pagination and sorting functionality
- Performance testing with large datasets
- Mobile responsiveness across devices

**Booking Flow Tests:**
- Tier limit enforcement across all subscription levels
- Payment processing success and failure scenarios
- Availability conflict detection
- Cross-platform booking completion
- Notification delivery verification

**Edge Cases:**
- Simultaneous booking attempts
- Network failure during payment
- Cleaner profile updates during active bookings
- Time zone handling for different locations
- File upload limits and format validation

## Deployment Strategy

### Database Migration
1. Apply migration `002_professional_discovery_booking.sql`
2. Refresh materialized views
3. Verify PostGIS extension installation
4. Run data validation scripts

### API Deployment
1. Deploy new API endpoints to staging
2. Run integration tests with existing systems
3. Performance testing with simulated load
4. Blue-green deployment to production

### Monitoring
- API response time tracking
- Search query performance metrics
- Booking conversion rates
- Payment success rates
- Error rate monitoring with alerting

## Success Metrics

### Phase 1 Goals
- **Customer Discovery**: ≥2 professionals findable per search
- **Conversion Rate**: ≥10% search-to-booking conversion
- **Performance**: Search results < 200ms, checkout < 3 seconds
- **Availability**: 99.9% API uptime during business hours

### KPIs to Track
- Daily active searches
- Professional profile completion rates
- Booking-to-completion ratio
- Customer satisfaction scores
- Revenue per booking
- Platform growth rate

## Future Enhancements

### Phase 2 Features
- Advanced scheduling with recurring bookings
- Team booking coordination
- Real-time chat integration
- AI-powered professional matching
- Dynamic pricing based on demand
- Mobile app with push notifications

### Scalability Considerations
- Database sharding by geographic region
- Microservices architecture for high-traffic components
- CDN optimization for global reach
- Machine learning for search relevance
- Advanced caching strategies

This comprehensive system provides the foundation for Boss of Clean's professional discovery and booking platform, designed for scale, performance, and exceptional user experience.