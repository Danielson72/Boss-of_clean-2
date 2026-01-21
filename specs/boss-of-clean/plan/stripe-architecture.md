# Stripe Architecture Plan

## Overview
Payment processing architecture supporting subscriptions, pay-per-lead transactions, and marketplace payouts.

## Stripe Integration Points

### Products & Pricing
```typescript
// Subscription Products
const SUBSCRIPTION_PRODUCTS = {
  basic: {
    price: 7900, // $79/month
    features: ['unlimited_leads', 'enhanced_profile', 'priority_placement']
  },
  pro: {
    price: 19900, // $199/month  
    features: ['instant_booking', 'automation', 'white_label']
  }
};

// Pay-per-lead pricing (dynamic)
const PPL_PRICING = {
  base: 500, // $5.00
  multipliers: {
    urgent: 1.5,
    commercial: 2.0,
    high_value: 3.0
  }
};
```

### Customer Management
- **Stripe Customers**: 1:1 mapping with platform users
- **Payment Methods**: Cards, ACH, digital wallets
- **Billing Addresses**: Required for tax calculation
- **Customer Portal**: Self-service subscription management

### Subscription Lifecycle
1. **Trial Period**: 14-day free trial for Pro plan
2. **Activation**: Automatic billing after trial
3. **Plan Changes**: Prorated upgrades/downgrades
4. **Cancellation**: End-of-period termination
5. **Dunning**: Payment failure recovery flow

## Database Schema Integration

### Stripe-Related Tables
```sql
-- Store Stripe customer/subscription IDs
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE cleaners ADD COLUMN 
  stripe_subscription_id VARCHAR(255),
  subscription_plan VARCHAR(50),
  subscription_status VARCHAR(50);

-- Track lead purchases
CREATE TABLE lead_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id UUID REFERENCES cleaners(id),
  quote_request_id UUID REFERENCES quote_requests(id),
  stripe_payment_intent_id VARCHAR(255),
  amount_cents INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Webhook Processing
```sql
-- Store webhook events for reliability
CREATE TABLE stripe_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE,
  event_type VARCHAR(100),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  event_data JSONB
);
```

## Webhook Handlers

### Subscription Events
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`
- `invoice.payment_succeeded`

### Payment Events
- `payment_intent.succeeded` → Release lead to cleaner
- `payment_intent.payment_failed` → Retry or refund
- `charge.dispute.created` → Admin notification

### Connect Events (Future)
- `account.updated` → Cleaner payout account verified
- `transfer.created` → Cleaner payment processed

## Financial Flow

### Revenue Recognition
1. **Subscriptions**: Monthly recurring revenue
2. **PPL Fees**: Recognized when lead delivered
3. **Platform Fees**: % of customer payments (future)

### Cleaner Payouts
- Weekly ACH transfers
- Minimum payout threshold: $50
- Instant pay available for fee
- Tax document generation (1099)

## Compliance & Security

### PCI DSS
- No card data stored on platform
- Stripe Elements for secure collection
- PCI compliance inherited from Stripe

### Tax Handling
- Sales tax calculation via Stripe Tax
- International tax compliance
- Automated tax reporting

### Fraud Prevention
- Radar for fraud detection
- 3D Secure for international cards
- Velocity checks for high-risk transactions

## Error Handling

### Payment Failures
- Immediate retry for temporary failures
- Email notifications to customer
- Dunning management for subscriptions
- Graceful degradation of features

### Webhook Reliability
- Idempotency keys for all operations
- Retry logic with exponential backoff
- Dead letter queue for failed processing
- Monitoring and alerting