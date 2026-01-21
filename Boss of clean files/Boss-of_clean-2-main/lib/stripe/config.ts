import Stripe from 'stripe';

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});

// Subscription tiers configuration
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: {
      max_photos: 1,
      priority_placement: false,
      analytics: false,
      featured: false,
      lead_generation: false,
      customer_support: 'basic',
      quote_responses: 5,
    },
    description: 'Basic listing only',
  },
  basic: {
    name: 'Basic',
    price: 29,
    priceId: process.env.STRIPE_BASIC_PRICE_ID || '',
    features: {
      max_photos: 5,
      priority_placement: false,
      analytics: true,
      featured: false,
      lead_generation: false,
      customer_support: 'email',
      quote_responses: 50,
    },
    description: 'Enhanced features, 5 photos, basic analytics',
  },
  pro: {
    name: 'Pro',
    price: 79,
    priceId: process.env.STRIPE_PRO_PRICE_ID || '',
    features: {
      max_photos: -1, // unlimited
      priority_placement: true,
      analytics: true,
      featured: false,
      lead_generation: true,
      customer_support: 'priority',
      quote_responses: 200,
    },
    description: 'Priority placement, unlimited photos, lead generation',
  },
  enterprise: {
    name: 'Enterprise',
    price: 149,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
    features: {
      max_photos: -1,
      priority_placement: true,
      analytics: true,
      featured: true,
      lead_generation: true,
      customer_support: 'phone',
      quote_responses: -1, // unlimited
      priority_support: true,
      custom_branding: true,
    },
    description: 'Featured placement, advanced analytics, priority support',
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

// Webhook events we handle
export const STRIPE_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const;