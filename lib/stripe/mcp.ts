/**
 * Stripe MCP Integration Layer
 *
 * Provides a wrapper around Claude Code's MCP Stripe tools with SDK fallback.
 * Enable with STRIPE_USE_MCP=true environment variable.
 */

import { getStripe } from './config'
import { createLogger } from '../utils/logger'
import type { GlobalWithMCP, MCPStripeCustomer } from '../types/api'
import type Stripe from 'stripe'

const logger = createLogger({ file: 'lib/stripe/mcp' })

/**
 * Type-safe access to MCP Stripe tool on globalThis
 */
function getMCPStripeTool(): GlobalWithMCP['mcpStripeTool'] {
  return (globalThis as unknown as GlobalWithMCP).mcpStripeTool;
}

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
      logger.debug('MCP mode enabled, but using SDK for checkout sessions')
    } catch (error) {
      logger.warn('MCP checkout failed, falling back to SDK:', {}, error)
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
      logger.debug('MCP mode enabled, but using SDK for billing portal')
    } catch (error) {
      logger.warn('MCP billing portal failed, falling back to SDK:', {}, error)
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
 * Customer list result type that works with both MCP and SDK
 */
type CustomerListResult = {
  data: Array<{ id: string; email?: string | null; name?: string | null }>;
};

/**
 * MCP-compatible customer lookup with fallback
 */
export async function findCustomerByEmail(email: string): Promise<CustomerListResult> {
  if (shouldUseMCP()) {
    try {
      // Try MCP first - using the available list_customers function
      const mcpStripeTool = getMCPStripeTool();
      const mcpResult = await mcpStripeTool?.list_customers?.({
        email: email,
        limit: 1
      })

      if (mcpResult && mcpResult.data && mcpResult.data.length > 0) {
        logger.debug('Found customer via MCP')
        return mcpResult
      }
    } catch (error) {
      logger.warn('MCP customer lookup failed, falling back to SDK:', {}, error)
    }
  }

  // SDK fallback
  const stripe = getStripe()
  const result = await stripe.customers.list({
    email: email,
    limit: 1,
  })

  // Return in a format compatible with our type
  return {
    data: result.data.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.name,
    })),
  }
}

/**
 * Get available pricing information
 * Useful for debugging and validation
 */
export async function listPrices(limit = 10) {
  if (shouldUseMCP()) {
    try {
      // Try MCP first
      const mcpStripeTool = getMCPStripeTool();
      const mcpResult = await mcpStripeTool?.list_prices?.({ limit })
      if (mcpResult) {
        logger.debug('Prices retrieved via MCP')
        return mcpResult
      }
    } catch (error) {
      logger.warn('MCP price listing failed, falling back to SDK:', {}, error)
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
    const mcpStripeTool = getMCPStripeTool();
    await mcpStripeTool?.list_prices?.({ limit: 1 })
    return { available: true }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown MCP error'
    }
  }
}