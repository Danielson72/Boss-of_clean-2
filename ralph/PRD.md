# Boss of Clean - Product Requirements Document

## Executive Summary

Boss of Clean is a Florida-focused marketplace connecting customers with professional cleaning services. The platform generates revenue through cleaner subscription tiers and aims to become Florida's #1 cleaning directory.

**Mission**: Make finding trusted, professional cleaning services as easy as ordering pizza.

**Revenue Model**: SaaS subscriptions for cleaning businesses ($0-$199/month)

---

## User Personas

### 1. Sarah the Customer
- **Demographics**: 35-55, homeowner or property manager, dual-income household
- **Goals**: Find reliable, background-checked cleaners quickly
- **Pain Points**: Unreliable services, no-shows, difficulty comparing prices
- **Behavior**: Searches by ZIP code, reads reviews, prefers instant booking

### 2. Carlos the Cleaner
- **Demographics**: 28-50, owns small cleaning business (1-5 employees)
- **Goals**: Get more customers, manage bookings, grow business
- **Pain Points**: Marketing costs, no-show customers, inconsistent leads
- **Behavior**: Checks dashboard daily, responds quickly to leads

### 3. Maria the Enterprise Cleaner
- **Demographics**: 35-60, owns established cleaning company (10+ employees)
- **Goals**: Expand to new areas, track team performance, premium visibility
- **Pain Points**: Managing multiple locations, team scheduling, analytics
- **Behavior**: Needs advanced features, willing to pay premium

---

## Feature Requirements

### Phase 1: Revenue Foundation (Current Priority)

#### 1.1 Authentication System
- [x] Email/password signup and login
- [x] Role-based access (customer, cleaner, admin)
- [ ] Email verification with resend option
- [ ] Password reset flow with email
- [ ] Google OAuth integration
- [ ] Session persistence and refresh

**Acceptance Criteria**:
- Users can register with email/password
- Email verification required before full access
- Password reset emails sent within 30 seconds
- OAuth users automatically linked to existing accounts

#### 1.2 Cleaner Onboarding
- [x] Multi-step setup wizard
- [x] Business profile creation
- [x] Service area selection (ZIP codes)
- [x] Service types and pricing
- [ ] Document upload (insurance, license)
- [ ] Background check integration
- [ ] Profile photo guidelines and upload

**Acceptance Criteria**:
- Cleaner can complete onboarding in < 10 minutes
- All required fields validated before submission
- Progress saved between sessions
- Admin notified of new cleaner registrations

#### 1.3 Cleaner Dashboard
- [x] Profile overview and stats
- [x] Quote request management
- [x] Lead viewing and claiming
- [x] Billing and subscription management
- [ ] Calendar/availability settings
- [ ] Review response functionality
- [ ] Earnings and analytics dashboard

**Acceptance Criteria**:
- Dashboard loads in < 2 seconds
- Real-time lead notifications
- Clear upgrade CTAs for free users
- Mobile-responsive design

#### 1.4 Customer Booking Flow
- [x] Search by service type and ZIP
- [x] Quote request submission
- [ ] Instant booking for available cleaners
- [ ] Date/time selection with cleaner availability
- [ ] Price calculator based on home size
- [ ] Booking confirmation emails
- [ ] Booking management (reschedule, cancel)

**Acceptance Criteria**:
- Search results in < 1 second
- Booking completes in < 3 clicks
- Confirmation email within 1 minute
- 24-hour cancellation policy enforced

#### 1.5 Payment Integration
- [x] Stripe subscription setup
- [x] Checkout session creation
- [x] Billing portal access
- [x] Webhook handling
- [ ] Invoice generation and history
- [ ] Proration for mid-cycle upgrades
- [ ] Failed payment retry logic
- [ ] Dunning emails for failed payments

**Acceptance Criteria**:
- Subscription changes reflect immediately
- Invoices accessible in dashboard
- Failed payments trigger 3 retry attempts
- Clear communication of billing changes

### Phase 2: Growth Features

#### 2.1 Reviews and Ratings
- [ ] Customer review submission after service
- [ ] Star rating (1-5) with written feedback
- [ ] Cleaner response to reviews
- [ ] Review moderation by admin
- [ ] Aggregate rating display on profiles

#### 2.2 Messaging System
- [ ] In-app messaging between customer and cleaner
- [ ] Message notifications (in-app and email)
- [ ] Message templates for common responses
- [ ] Spam/abuse reporting

#### 2.3 Advanced Search
- [ ] Filter by rating, price range, availability
- [ ] Sort by distance, rating, price
- [ ] Save favorite cleaners
- [ ] Search history and suggestions

#### 2.4 Mobile App (Future)
- [ ] React Native or Flutter app
- [ ] Push notifications
- [ ] Offline booking management

### Phase 3: Enterprise Features

#### 3.1 Multi-Location Support
- [ ] Multiple business locations per account
- [ ] Location-specific pricing and availability
- [ ] Team member management

#### 3.2 Analytics Dashboard
- [ ] Lead conversion tracking
- [ ] Revenue analytics
- [ ] Customer acquisition cost
- [ ] Search impression tracking

#### 3.3 API Access
- [ ] REST API for enterprise integrations
- [ ] Webhook events for bookings
- [ ] White-label options

---

## Technical Requirements

### Performance
- Page load time: < 2 seconds
- API response time: < 500ms
- Uptime: 99.9%
- Mobile Lighthouse score: > 90

### Security
- All data encrypted in transit (HTTPS)
- Passwords hashed with bcrypt
- Row Level Security on all tables
- CSRF protection on forms
- Rate limiting on API endpoints

### Scalability
- Support 10,000 concurrent users
- Database optimized with proper indexes
- CDN for static assets
- Image optimization and lazy loading

### Compliance
- GDPR-compliant data handling
- Florida business regulations
- PCI compliance via Stripe
- Accessibility (WCAG 2.1 AA)

---

## Success Metrics

### North Star Metric
**Monthly Recurring Revenue (MRR)** from cleaner subscriptions

### Key Performance Indicators

| Metric | Target | Current |
|--------|--------|---------|
| Cleaner signups/month | 100 | - |
| Paid conversion rate | 15% | - |
| Customer bookings/month | 500 | - |
| Average cleaner rating | 4.5+ | - |
| Churn rate | < 5% | - |

### Funnel Metrics
1. **Awareness**: Site visits
2. **Acquisition**: Signups (customer + cleaner)
3. **Activation**: First booking completed
4. **Revenue**: Subscription started
5. **Retention**: Repeat bookings
6. **Referral**: Referral signups

---

## Roadmap

### Q1 2025: Revenue Foundation
- Complete auth flows (email verification, password reset)
- Finish cleaner dashboard features
- Launch customer instant booking
- Payment system hardening

### Q2 2025: Growth
- Reviews and ratings system
- In-app messaging
- Advanced search filters
- SEO optimization

### Q3 2025: Scale
- Mobile app launch
- Enterprise features
- API access
- Multi-location support

### Q4 2025: Expansion
- Expand beyond Florida
- Additional service categories
- B2B cleaning contracts
- Franchise model

---

## Appendix

### Subscription Tier Comparison

| Feature | Free | Basic ($79) | Pro ($199) |
|---------|------|-------------|------------|
| Business listing | Basic | Enhanced | Featured |
| Photos | 1 | Unlimited | Unlimited + Video |
| Lead credits/month | 5 | 20 | Unlimited |
| Search placement | Standard | Priority | Top |
| Analytics | None | Basic | Advanced |
| Support | Email | Phone + Email | Dedicated |
| Badge | None | "Verified" | "Top Pro" |

### Florida Market Data
- 67 counties served
- 22 million residents
- ~$4B cleaning services market
- Growing 5% annually
