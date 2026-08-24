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

/**
 * Brand marker written into the metadata of every Stripe object this codebase
 * creates.
 *
 * Boss of Clean LLC operates a single Stripe account across several DBA
 * brands, and Stripe delivers account-wide events to every endpoint
 * registered on it — so another brand's sessions and invoices arrive at our
 * webhook routinely. Stamping `venture` at creation time gives each handler a
 * way to recognize its own events instead of inferring ownership.
 *
 * This extends the convention already carried by our Stripe Products, which
 * are tagged venture: "boc" in the dashboard. Product metadata does not
 * propagate to sessions or subscriptions, so it has to be set explicitly here.
 *
 * Writers only for now: nothing reads this key yet. Guards ship separately,
 * once every object in flight carries it.
 */
export const VENTURE_KEY = 'venture' as const
export const VENTURE_BOC = 'boc' as const

// Stripe price IDs mapped to tier names (Free/Basic/Pro matching PRD)
export const STRIPE_PRICES = {
  basic: process.env.STRIPE_BASIC_PRICE_ID || '',
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  boc_per_lead: process.env.STRIPE_PRICE_BOC_PER_LEAD || '',
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
      'Pay-per-lead ($30/lead)',
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
      'Priority routing — matched ahead of free listings',
      'Member lead pricing (lower per-lead cost)',
      'Unlimited photos',
      'Priority placement in search results',
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
      'First priority — matched before all other tiers',
      'Best member lead pricing',
      'Unlimited photos & videos',
      'Top placement in search',
      'Advanced analytics & insights',
      'Direct customer messaging',
      'Dedicated account manager',
      'Priority support'
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
