# Task 009: Cleaner Billing Dashboard

**Status:** 📋 PLANNED
**Priority:** High
**Estimated Effort:** 6 hours

## Description
Build a billing dashboard for cleaners to view their subscription status, manage plans, track lead credit usage, and access billing history. This is essential for the revenue model and cleaner self-service.

## Acceptance Criteria
- [ ] Billing dashboard page at `/dashboard/cleaner/billing`
- [ ] Display current subscription plan and status
- [ ] Show lead credits remaining and usage this month
- [ ] Plan comparison with upgrade/downgrade buttons
- [ ] Billing history table with invoices
- [ ] Payment method management (add/update card)
- [ ] Cancel subscription flow with confirmation
- [ ] Usage charts (leads used over time)
- [ ] Mobile-responsive design

## Implementation Plan

### Billing Dashboard Page
```typescript
// /dashboard/cleaner/billing/page.tsx
interface BillingDashboard {
  subscription: {
    tier: 'free' | 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  };
  leadCredits: {
    remaining: number;
    usedThisMonth: number;
    monthlyLimit: number | null; // null = unlimited
    resetDate: Date;
  };
  paymentMethod: {
    brand: string; // visa, mastercard, etc.
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
}
```

### Subscription Status Card
```typescript
// components/billing/SubscriptionStatus.tsx
// Displays:
// - Current plan name and badge
// - Status indicator (active, past due, canceling)
// - Next billing date and amount
// - "Manage Plan" button
// - Warning banner if past due or canceling
```

### Lead Credits Card
```typescript
// components/billing/LeadCreditsCard.tsx
// Displays:
// - Circular progress: X of Y leads used
// - "Unlimited" badge for paid plans
// - Reset date countdown
// - Link to leads dashboard
// - Usage sparkline chart (last 6 months)
```

### Plan Comparison Component
```typescript
// components/billing/PlanComparison.tsx
interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  leadLimit: number | null;
  highlighted: boolean;
}

// Plans:
// - Free: $0, 5 leads/month, basic profile
// - Basic: $79/month, unlimited leads, priority placement
// - Pro: $199/month, instant booking, marketing tools, API access
```

### Billing History Table
```typescript
// components/billing/BillingHistory.tsx
interface Invoice {
  id: string;
  date: Date;
  amount: number;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  description: string;
  invoicePdf: string; // Stripe hosted invoice URL
}

// Table columns: Date, Description, Amount, Status, Actions (Download)
// Pagination: 10 per page
```

### Payment Method Management
```typescript
// components/billing/PaymentMethod.tsx
// - Display current card (brand icon, •••• 4242, exp 12/25)
// - "Update Payment Method" button
// - Opens Stripe Customer Portal or embedded form
// - Success/error toast notifications
```

### API Routes

#### GET /api/cleaner/billing
```typescript
// Returns complete billing dashboard data
{
  subscription: { tier, status, currentPeriodEnd, ... },
  leadCredits: { remaining, usedThisMonth, ... },
  paymentMethod: { brand, last4, ... },
  invoices: Invoice[],
  usage: { month: string, leads: number }[]
}
```

#### POST /api/cleaner/billing/upgrade
```typescript
// Body: { planId: 'basic' | 'pro' }
// Creates Stripe Checkout session for plan upgrade
// Returns: { checkoutUrl: string }
```

#### POST /api/cleaner/billing/downgrade
```typescript
// Body: { planId: 'free' | 'basic' }
// Schedules downgrade at period end
// Returns: { success: boolean, effectiveDate: Date }
```

#### POST /api/cleaner/billing/cancel
```typescript
// Schedules cancellation at period end
// Returns: { success: boolean, effectiveDate: Date }
```

#### POST /api/cleaner/billing/reactivate
```typescript
// Removes scheduled cancellation
// Returns: { success: boolean }
```

#### GET /api/cleaner/billing/portal
```typescript
// Creates Stripe Customer Portal session
// Returns: { portalUrl: string }
```

### Database Queries

```sql
-- Get cleaner subscription info
SELECT
  c.subscription_tier,
  c.subscription_expires_at,
  c.stripe_customer_id,
  c.stripe_subscription_id,
  c.lead_credits_remaining,
  c.lead_credits_used_this_month,
  c.lead_credits_reset_date
FROM cleaners c
WHERE c.user_id = $1;

-- Get lead usage history (last 6 months)
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as leads_used
FROM lead_matches
WHERE cleaner_id = $1
  AND status = 'responded'
  AND created_at > NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

### Stripe Integration

```typescript
// lib/stripe/billing.ts

// Get subscription details
async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method', 'latest_invoice']
  });
}

// Create checkout for upgrade
async function createUpgradeCheckout(customerId: string, priceId: string) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/cleaner/billing?upgraded=true`,
    cancel_url: `${baseUrl}/dashboard/cleaner/billing`
  });
}

// Create customer portal session
async function createPortalSession(customerId: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/dashboard/cleaner/billing`
  });
}

// List invoices
async function listInvoices(customerId: string, limit = 10) {
  return stripe.invoices.list({
    customer: customerId,
    limit,
    expand: ['data.subscription']
  });
}
```

## UI Components

### Subscription Status States
- **Active**: Green badge, next billing info
- **Trialing**: Blue badge, trial end date, upgrade CTA
- **Past Due**: Red banner, "Update payment method" CTA
- **Canceling**: Yellow banner, "Reactivate" button, end date
- **Canceled**: Gray badge, "Resubscribe" CTA

### Plan Cards
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│      FREE       │  │     BASIC       │  │      PRO        │
│      $0/mo      │  │    $79/mo       │  │    $199/mo      │
│                 │  │                 │  │   RECOMMENDED   │
│ • 5 leads/month │  │ • Unlimited     │  │ • Everything in │
│ • Basic profile │  │ • Priority rank │  │   Basic         │
│ • Email support │  │ • Analytics     │  │ • Instant book  │
│                 │  │ • Phone support │  │ • Marketing     │
│  Current Plan   │  │    Upgrade →    │  │    Upgrade →    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Navigation Integration
- Add "Billing" link to cleaner dashboard sidebar
- Badge on sidebar if payment past due
- Link from leads page when credits low

## Testing Checklist
- [ ] Dashboard loads with subscription data
- [ ] Lead credits display correctly (free vs unlimited)
- [ ] Upgrade flow creates Stripe checkout
- [ ] Downgrade schedules change at period end
- [ ] Cancel flow shows confirmation and effective date
- [ ] Reactivate removes pending cancellation
- [ ] Billing history shows invoices with download links
- [ ] Payment method displays correctly
- [ ] Stripe portal opens for payment updates
- [ ] Past due state shows warning and update CTA
- [ ] Mobile responsive at all breakpoints

## Error Handling
- Stripe API errors: Show user-friendly message, log details
- No subscription: Show free tier status, upgrade CTAs
- No payment method: Prompt to add before upgrade
- Failed webhook: Graceful degradation, manual refresh option

## Related Tasks
- task-005: Stripe webhooks (subscription status sync)
- task-007: Quote request system (lead credits)
- spec: payments-subscriptions-ppl.md
