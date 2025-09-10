# Task 005: Stripe Webhooks

**Status:** 📋 PLANNED  
**Priority:** High  
**Estimated Effort:** 5 hours  

## Description
Implement Stripe webhook handling for subscription management and payment processing events.

## Acceptance Criteria
- [ ] Webhook endpoint with signature verification
- [ ] Event handlers for subscription lifecycle
- [ ] Payment event processing
- [ ] Retry logic and idempotency
- [ ] Error handling and monitoring
- [ ] Database updates for billing events

## Implementation Plan

### Webhook Endpoint
```typescript
// /api/webhooks/stripe
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const payload = await request.text();
  
  // Verify webhook signature
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  // Route to appropriate handler
  await handleStripeEvent(event);
  
  return new Response('OK', { status: 200 });
}
```

### Event Handlers
```typescript
// Subscription events
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  await supabase
    .from('cleaners')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_plan: subscription.metadata.plan,
      subscription_status: subscription.status
    })
    .eq('user_id', subscription.metadata.user_id);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Handle plan changes, renewals, cancellations
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Trigger dunning management
  await sendPaymentFailedEmail(invoice.customer);
}
```

### Database Integration
```sql
-- Webhook event log
CREATE TABLE stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subscription status tracking
ALTER TABLE cleaners ADD COLUMN
  last_payment_date TIMESTAMP,
  next_billing_date TIMESTAMP,
  payment_failed_count INTEGER DEFAULT 0;
```

### Error Handling
```typescript
// Retry logic with exponential backoff
async function processWebhookWithRetry(event: Stripe.Event) {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      await processStripeEvent(event);
      break;
    } catch (error) {
      retryCount++;
      if (retryCount === maxRetries) {
        await logWebhookError(event, error);
        throw error;
      }
      await sleep(Math.pow(2, retryCount) * 1000);
    }
  }
}
```

## Event Types to Handle
### Critical Events
- `customer.subscription.created`
- `customer.subscription.updated` 
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Monitoring Events
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.dispute.created`

## Testing Strategy
- Unit tests for each event handler
- Integration tests with Stripe test events
- Webhook replay testing
- Error handling scenarios
- Idempotency verification

## Security Considerations
- Webhook signature verification required
- Rate limiting on webhook endpoint
- Sensitive event data logging restrictions
- PCI compliance maintained

## Related Tasks
- plan: stripe-architecture.md (overall payment architecture)
- spec: payments-subscriptions-ppl.md (business requirements)