# Task 008: Stripe Test-Mode Skeleton Implementation

## Overview

This task implements a complete Stripe subscription system in test mode for the Boss of Clean platform, allowing cleaners to choose between Free, Professional ($79/month), and Enterprise ($149/month) plans. The implementation maintains existing branding and auth systems while adding subscription functionality.

## Implementation Details

### 1. Environment Configuration

Required environment variables (add to your `.env.local`):

```bash
# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_test_pro_monthly
STRIPE_ENTERPRISE_PRICE_ID=price_test_enterprise_monthly

# Client-side Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_URL=http://localhost:3000
```

### 2. Stripe Price IDs Setup

In your Stripe dashboard (test mode):

1. Create two subscription products:
   - Professional Plan: $79/month recurring
   - Enterprise Plan: $149/month recurring

2. Copy the price IDs and update your environment variables:
   - `STRIPE_PRO_PRICE_ID`: The price ID for the Professional plan
   - `STRIPE_ENTERPRISE_PRICE_ID`: The price ID for the Enterprise plan

### 3. Webhook Configuration

1. In Stripe Dashboard → Webhooks, create a new webhook endpoint:
   - URL: `http://localhost:3000/api/stripe/webhook` (or your production URL)
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

2. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## File Structure

```
├── app/api/stripe/
│   ├── checkout/route.ts     # Creates Stripe checkout sessions
│   ├── portal/route.ts       # Creates billing portal sessions
│   └── webhook/route.ts      # Handles Stripe webhooks
├── lib/stripe/
│   ├── config.ts            # Server-side Stripe configuration
│   └── client.ts            # Client-side Stripe utilities
├── app/pricing/page.tsx     # Updated pricing page with functional buttons
└── app/dashboard/cleaner/page.tsx  # Enhanced with billing management
```

## Features Implemented

### 1. Pricing Page (`/pricing`)
- **Functional checkout buttons** for Pro and Enterprise plans
- **Loading states** during checkout process
- **Free plan signup** redirect to `/signup`
- **Consistent styling** with existing design system

### 2. Stripe Checkout Flow
- **Authentication required** before checkout
- **Cleaner profile validation** (must exist)
- **Session metadata** includes user_id, cleaner_id, and plan
- **Proper redirect URLs** with success/cancel handling

### 3. Billing Portal
- **Manage subscription** link for paid plans in cleaner dashboard
- **Customer lookup by email** for existing Stripe customers
- **Portal session creation** with return URL to dashboard
- **Subscription tier gating** (only available for non-free plans)

### 4. Webhook Processing
- **Signature verification** for security
- **Subscription activation** on checkout completion
- **Subscription updates** when status changes
- **Automatic downgrade** to free on cancellation
- **Database synchronization** with `cleaners.subscription_tier`

### 5. Dashboard Integration
- **Current plan display** with tier-specific styling
- **Dynamic billing management** (Upgrade vs Manage Billing)
- **Updated plan details** matching pricing page
- **Feature list synchronization** across components

## Database Integration

The system uses the existing `cleaners` table with the `subscription_tier` column:

```sql
-- No migration needed, uses existing schema
-- cleaners.subscription_tier: 'free' | 'pro' | 'enterprise'
```

Webhook events automatically update this field based on Stripe subscription status.

## Error Handling

- **Authentication errors**: 401 responses for unauthenticated requests
- **Validation errors**: 400 responses for invalid data
- **Stripe API errors**: Proper error logging and user-friendly messages
- **Webhook verification**: Failed signatures return 400 errors
- **Database errors**: 500 responses with error logging

## Security Considerations

- **Webhook signature verification** prevents unauthorized updates
- **User authentication** required for all subscription operations
- **Metadata validation** ensures data integrity
- **Test mode only** prevents accidental production charges
- **HTTPS required** for production webhook endpoints

## Testing

### Manual Testing Steps

1. **Free Plan**:
   - Visit `/pricing`
   - Click "Get Started" on Free plan
   - Should redirect to `/signup`

2. **Pro Plan Checkout**:
   - Sign in as a cleaner
   - Visit `/pricing`
   - Click "Start Professional"
   - Should redirect to Stripe Checkout
   - Complete test payment
   - Should return to `/dashboard/cleaner`
   - Verify subscription tier updated in dashboard

3. **Billing Portal**:
   - As a subscribed cleaner, visit dashboard
   - Click "Manage Billing →"
   - Should redirect to Stripe billing portal
   - Verify can manage subscription

4. **Webhook Testing**:
   - Use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   - Trigger test events in Stripe dashboard
   - Verify database updates correctly

### Test Cards

Use Stripe's test card numbers:
- **Success**: 4242 4242 4242 4242
- **Declined**: 4000 0000 0000 0002
- **Requires Authentication**: 4000 0027 6000 3184

## Deploy to Netlify Checklist

### Environment Variables
Set these environment variables in Netlify dashboard (Site settings > Environment variables):

```bash
# Stripe Configuration (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_live_pro_monthly
STRIPE_ENTERPRISE_PRICE_ID=price_live_enterprise_monthly

# Client-side Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://your-domain.netlify.app
SITE_URL=https://your-domain.netlify.app

# Supabase Configuration (if not already set)
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
```

### Pre-deployment Stripe Setup
1. ✅ Switch Stripe account to live mode
2. ✅ Create production subscription products (Pro: $79/month, Enterprise: $149/month)
3. ✅ Update price IDs in environment variables
4. ✅ Configure webhook endpoint: `https://your-domain.netlify.app/api/stripe/webhook`
5. ✅ Select webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
6. ✅ Copy webhook signing secret to environment variables

### Post-deployment Verification
1. Test subscription checkout flow with live Stripe
2. Verify webhook events are received and processed
3. Test billing portal functionality
4. Confirm subscription tier updates in database
5. Validate payment processing and receipt generation

### Webhook Security Considerations
- **HTTPS required** for production webhooks
- **Webhook signature verification** implemented and working
- **Monitor webhook delivery** in Stripe dashboard
- **Test webhook resilience** with failed/retry scenarios

## Deployment Notes

### Environment Variables
- Update all `STRIPE_*` variables with production keys
- Set `SITE_URL` to production domain
- Configure webhook URL to production endpoint

### Webhook Security
- **HTTPS required** for production webhooks
- **Verify webhook secret** is set correctly
- **Monitor webhook delivery** in Stripe dashboard

### Database Considerations
- **No migrations required** - uses existing schema
- **Subscription tier consistency** maintained automatically
- **Consider adding indexes** if subscription queries become frequent

## Troubleshooting

### Common Issues

1. **"Failed to create checkout session"**:
   - Check Stripe secret key is correct
   - Verify price IDs exist in Stripe dashboard
   - Check user authentication

2. **"Webhook signature verification failed"**:
   - Verify webhook secret matches Stripe dashboard
   - Ensure raw body is passed to verification function
   - Check webhook URL is accessible

3. **"No billing account found"**:
   - Customer hasn't completed checkout yet
   - Email mismatch between Supabase and Stripe
   - Check customer exists in Stripe dashboard

4. **Subscription not updating in dashboard**:
   - Check webhook endpoint is receiving events
   - Verify webhook secret is correct
   - Review server logs for processing errors

### Debug Commands

```bash
# Test webhook locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed

# View webhook logs
stripe logs tail
```

## Future Enhancements

- **Proration handling** for plan changes
- **Usage-based billing** for enterprise features
- **Team management** for multi-user accounts
- **Custom pricing** for large enterprises
- **Subscription analytics** and reporting
- **Automated dunning management** for failed payments

## Conclusion

This implementation provides a complete subscription system foundation that can be extended as the business grows. The test mode setup allows for thorough testing before going live, and the modular architecture makes it easy to add new features or modify existing ones.