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

// Stripe price IDs mapped to tier names (Free/Basic/Pro matching PRD)
export const STRIPE_PRICES = {
  basic: process.env.STRIPE_BASIC_PRICE_ID || '',
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
} as const

export type SubscriptionTier = 'free' | 'basic' | 'pro'

export const PLAN_DETAILS: Record<SubscriptionTier, {
  name: string
  price: number
  priceId?: string
  leadCredits: number // -1 = unlimited
  features: string[]
}> = {
  free: {
    name: 'Free',
    price: 0,
    leadCredits: 0,
    features: [
      'Basic business listing',
      'Pay-per-lead ($15/lead)',
      '1 photo upload',
      'Email support'
    ]
  },
  basic: {
    name: 'Basic',
    price: 79,
    priceId: STRIPE_PRICES.basic,
    leadCredits: 20,
    features: [
      'Premium business listing',
      '20 lead credits/month',
      'Additional leads $10 each',
      'Unlimited photos',
      'Priority in search results',
      'Business analytics',
      'Phone & email support'
    ]
  },
  pro: {
    name: 'Pro',
    price: 199,
    priceId: STRIPE_PRICES.pro,
    leadCredits: -1,
    features: [
      'Featured business listing',
      'Unlimited lead credits',
      'Unlimited photos & videos',
      'Top placement in search',
      'Advanced analytics & insights',
      'Direct customer messaging',
      'Dedicated account manager',
      '24/7 priority support'
    ]
  }
}

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
