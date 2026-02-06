import { loadStripe } from '@stripe/stripe-js'
import { createLogger } from '../utils/logger'

const logger = createLogger({ file: 'lib/stripe/client' })

// Client-side Stripe initialization
let stripePromise: ReturnType<typeof loadStripe>

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
    }
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}

/**
 * Redirect to Stripe Checkout for subscription
 */
export async function redirectToCheckout(plan: 'basic' | 'pro') {
  try {
    const response = await fetch(`/api/stripe/checkout?plan=${plan}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to create checkout session')
    }

    const { sessionId } = await response.json()
    
    const stripe = await getStripe()
    if (!stripe) throw new Error('Failed to load Stripe')

    const { error } = await stripe.redirectToCheckout({ sessionId })
    
    if (error) {
      throw new Error(error.message)
    }
  } catch (error) {
    logger.error('Error redirecting to checkout:', {}, error)
    throw error
  }
}

/**
 * Redirect to Stripe billing portal
 */
export async function redirectToBillingPortal() {
  try {
    const response = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to create portal session')
    }

    const { url } = await response.json()
    window.location.href = url
  } catch (error) {
    logger.error('Error redirecting to billing portal:', {}, error)
    throw error
  }
}