import type Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { getStripe } from './config'
import { createLogger } from '../utils/logger'

const logger = createLogger({ file: 'lib/stripe/server' })

export const PAYMENTS_UNAVAILABLE = 'payments_unavailable' as const

/**
 * Server-side Stripe client for payment routes, or null when
 * STRIPE_SECRET_KEY is not set (e.g. Deploy Preview / Branch deploy contexts
 * that carry no production secrets). Never throws and never falls back to
 * another key; callers must return paymentsUnavailable() on null before any
 * DB write or Stripe call.
 */
export function getServerStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return getStripe()
}

/**
 * 503 response for a payment route hit while Stripe is not configured.
 * Logs one line naming the route; never logs env values.
 */
export function paymentsUnavailable(route: string, headers?: HeadersInit) {
  logger.warn('Stripe is not configured; payment route unavailable', { route })
  return NextResponse.json({ error: PAYMENTS_UNAVAILABLE }, { status: 503, headers })
}
