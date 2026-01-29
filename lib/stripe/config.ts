import Stripe from 'stripe'
import { createLogger } from '../utils/logger'

const logger = createLogger({ file: 'lib/stripe/config' })

// Create Stripe instance lazily to avoid build-time errors
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2025-07-30.basil',
      typescript: true,
    })
  }
  return stripeInstance
}

// Export for backward compatibility
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    return getStripe()[prop as keyof Stripe]
  }
})

// Test mode price IDs - these should be replaced with actual Stripe price IDs
export const STRIPE_PRICES = {
  basic: process.env.STRIPE_BASIC_PRICE_ID || 'price_test_basic_monthly',
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_test_pro_monthly',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_test_enterprise_monthly',
} as const

export type SubscriptionTier = 'free' | 'pro' | 'enterprise'

export const PLAN_DETAILS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      'Basic business listing',
      '1 photo only',
      'Contact information display',
      'Basic customer reviews',
      'Email support'
    ]
  },
  pro: {
    name: 'Professional',
    price: 79,
    priceId: STRIPE_PRICES.pro,
    features: [
      'Premium business listing',
      'Unlimited photos',
      'Priority in search results',
      'Advanced review management',
      'Lead contact information',
      'Business analytics',
      'Phone & email support'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: 149,
    priceId: STRIPE_PRICES.enterprise,
    features: [
      'Featured business listing',
      'Unlimited photos & videos',
      'Top placement in search',
      'Full review management suite',
      'Direct customer messaging',
      'Advanced analytics & insights',
      'Multiple location support',
      'Dedicated account manager',
      '24/7 priority support'
    ]
  }
} as const

export const SUBSCRIPTION_TIERS = PLAN_DETAILS

/**
 * Verify webhook signature from Stripe
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    logger.error('Webhook signature verification failed:', {}, err)
    throw new Error('Invalid webhook signature')
  }
}

/**
 * Get site URL for redirects
 */
export function getSiteUrl(): string {
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    throw new Error('SITE_URL or NEXT_PUBLIC_SITE_URL must be set')
  }
  return siteUrl
}