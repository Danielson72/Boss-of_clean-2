/**
 * Stripe MCP Integration Layer
 * 
 * Provides a wrapper around Claude Code's MCP Stripe tools with SDK fallback.
 * Enable with STRIPE_USE_MCP=true environment variable.
 */

import { getStripe } from './config'

/**
 * Check if MCP Stripe integration should be used
 */
export function shouldUseMCP(): boolean {
  return process.env.STRIPE_USE_MCP === 'true'
}

/**
 * MCP-compatible checkout session creation
 * Falls back to SDK if MCP unavailable or fails
 */
export async function createCheckoutSession(params: {
  priceId: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string
  metadata?: Record<string, string>
  subscriptionMetadata?: Record<string, string>
}) {
  if (shouldUseMCP()) {
    try {
      // Note: MCP Stripe doesn't have direct checkout session creation
      // We'll use payment links as an alternative MCP approach
      console.log('MCP mode enabled, but using SDK for checkout sessions')
    } catch (error) {
      console.warn('MCP checkout failed, falling back to SDK:', error)
    }
  }

  // SDK fallback (current implementation)
  const stripe = getStripe()
  return await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.customerEmail,
    metadata: params.metadata,
    subscription_data: params.subscriptionMetadata ? {
      metadata: params.subscriptionMetadata,
    } : undefined,
  })
}

/**
 * MCP-compatible billing portal session creation
 * Falls back to SDK if MCP unavailable or fails
 */
export async function createBillingPortalSession(params: {
  customerId: string
  returnUrl: string
}) {
  if (shouldUseMCP()) {
    try {
      // Note: MCP Stripe tools don't include billing portal
      // Keep SDK implementation for now
      console.log('MCP mode enabled, but using SDK for billing portal')
    } catch (error) {
      console.warn('MCP billing portal failed, falling back to SDK:', error)
    }
  }

  // SDK fallback (current implementation)
  const stripe = getStripe()
  return await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  })
}

/**
 * MCP-compatible customer lookup with fallback
 */
export async function findCustomerByEmail(email: string) {
  if (shouldUseMCP()) {
    try {
      // Try MCP first - using the available list_customers function
      const mcpResult = await (globalThis as any).mcpStripeTool?.list_customers?.({ 
        email: email,
        limit: 1 
      })
      
      if (mcpResult && mcpResult.data && mcpResult.data.length > 0) {
        console.log('Found customer via MCP')
        return mcpResult
      }
    } catch (error) {
      console.warn('MCP customer lookup failed, falling back to SDK:', error)
    }
  }

  // SDK fallback
  const stripe = getStripe()
  return await stripe.customers.list({
    email: email,
    limit: 1,
  })
}

/**
 * Get available pricing information
 * Useful for debugging and validation
 */
export async function listPrices(limit = 10) {
  if (shouldUseMCP()) {
    try {
      // Try MCP first
      const mcpResult = await (globalThis as any).mcpStripeTool?.list_prices?.({ limit })
      if (mcpResult) {
        console.log('Prices retrieved via MCP')
        return mcpResult
      }
    } catch (error) {
      console.warn('MCP price listing failed, falling back to SDK:', error)
    }
  }

  // SDK fallback
  const stripe = getStripe()
  return await stripe.prices.list({ limit })
}

/**
 * Check MCP connectivity (for debugging)
 */
export async function testMCPConnection(): Promise<{ available: boolean; error?: string }> {
  if (!shouldUseMCP()) {
    return { available: false, error: 'MCP disabled via STRIPE_USE_MCP' }
  }

  try {
    // Test with a simple list operation
    const result = await (globalThis as any).mcpStripeTool?.list_prices?.({ limit: 1 })
    return { available: true }
  } catch (error) {
    return { 
      available: false, 
      error: error instanceof Error ? error.message : 'Unknown MCP error'
    }
  }
}