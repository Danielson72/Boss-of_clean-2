# Task 007: Quote Request System

**Status:** ✅ COMPLETED
**Priority:** High
**Estimated Effort:** 6 hours

## Description
Implement public quote request form with lead matching to cleaners and response workflow. Core customer acquisition feature enabling homeowners to request cleaning quotes without authentication.

## Acceptance Criteria
- [x] Public quote request form at /quote-request (no auth required)
- [x] Quote requests stored with full property details
- [x] Automatic lead matching to eligible cleaners
- [x] Cleaner dashboard view for incoming leads
- [x] Cleaner response with quote amount and availability
- [x] Lead credit deduction on response (PPL model)
- [x] Email notifications for customers and cleaners (placeholder service)

## Implementation Plan

### Database Schema
```sql
-- Quote requests from customers
CREATE TABLE quote_requests (
  id UUID PRIMARY KEY,
  -- Service details
  service_type TEXT NOT NULL,
  property_type TEXT NOT NULL, -- home, condo, office, apartment
  sqft_estimate INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  -- Location
  zip_code TEXT NOT NULL,
  city TEXT,
  -- Scheduling
  preferred_date DATE,
  flexibility TEXT, -- exact, flexible, asap
  -- Contact info (no auth required)
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  notes TEXT,
  -- Status tracking
  status TEXT DEFAULT 'pending', -- pending, matched, completed, expired
  match_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Junction table for cleaner-quote matches
CREATE TABLE lead_matches (
  id UUID PRIMARY KEY,
  quote_request_id UUID REFERENCES quote_requests(id),
  cleaner_id UUID REFERENCES cleaners(id),
  -- Match metadata
  match_score DECIMAL(5,2), -- relevance score
  distance_miles DECIMAL(5,1),
  -- Response
  status TEXT DEFAULT 'pending', -- pending, viewed, responded, declined, expired
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  -- Cleaner's quote
  quote_amount DECIMAL(10,2),
  availability_date DATE,
  response_message TEXT,
  -- Lead credit tracking
  lead_credit_deducted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Quote Request Form
```typescript
// /quote-request/page.tsx - Public form
interface QuoteRequestForm {
  service_type: 'residential' | 'commercial' | 'deep_cleaning' | 'move_in_out' | 'recurring';
  property_type: 'home' | 'condo' | 'apartment' | 'office' | 'other';
  sqft_estimate: number;
  bedrooms: number;
  bathrooms: number;
  zip_code: string;
  preferred_date: Date;
  notes: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
}
```

### Lead Matching Algorithm
```typescript
// Match criteria (in order of priority):
// 1. Service area: cleaner serves the zip code
// 2. Services offered: cleaner provides requested service type
// 3. Active subscription: cleaner has active paid plan
// 4. Availability: cleaner not at lead capacity
// 5. Rating: higher-rated cleaners preferred

async function matchQuoteToCleaners(quoteId: string) {
  // Find eligible cleaners
  const cleaners = await supabase
    .from('cleaners')
    .select('*, service_areas!inner(*)')
    .eq('approval_status', 'approved')
    .eq('service_areas.zip_code', quote.zip_code)
    .contains('services', [quote.service_type])
    .order('average_rating', { ascending: false })
    .limit(5);

  // Create lead_matches entries
  // Notify matched cleaners
}
```

### Cleaner Dashboard
- New "Leads" section in cleaner dashboard
- List of matched quote requests with:
  - Service type and property details
  - Customer's preferred date
  - Distance from cleaner's primary area
  - Time remaining to respond
- Response form: quote amount, availability, message
- Lead credit counter showing remaining credits

### Email Notifications
```typescript
// Customer notification when cleaner responds
sendEmail({
  to: quote.contact_email,
  subject: `Quote received from ${cleaner.business_name}`,
  template: 'quote-response',
  data: { quote, cleaner, response }
});

// Cleaner notification when new lead matches
sendEmail({
  to: cleaner.business_email,
  subject: 'New cleaning lead in your area',
  template: 'new-lead',
  data: { quote, cleaner }
});
```

## API Endpoints

### Public
- `POST /api/quotes` - Submit quote request
- `GET /api/quotes/[id]/status` - Check quote status (by email verification)

### Authenticated (Cleaner)
- `GET /api/cleaner/leads` - List matched leads
- `GET /api/cleaner/leads/[id]` - Lead details
- `POST /api/cleaner/leads/[id]/respond` - Submit quote response
- `POST /api/cleaner/leads/[id]/decline` - Decline lead

## Business Rules

### Matching Rules
- Maximum 5 cleaners matched per quote request
- Only approved cleaners with active subscriptions
- Cleaner must serve the requested zip code
- Cleaner must offer the requested service type

### Lead Credits
- Free tier: 5 leads/month
- Paid tiers: Unlimited leads
- 1 credit deducted when cleaner responds (not just views)
- Credits reset monthly on subscription anniversary

### Expiration
- Quote requests expire after 7 days
- Unresponded lead matches expire after 48 hours
- Expired leads don't count against credits

## Related Tasks
- task-005: Stripe webhooks (subscription status)
- spec: payments-subscriptions-ppl.md (lead credit model)
- spec: directory-browse-and-search.md (quote request CTA)
