import { Page, expect, Route } from '@playwright/test'

export interface CleanerTestUser {
  email: string
  password: string
  role: 'cleaner'
}

/**
 * Generate a unique cleaner test email
 */
export function createCleanerTestUser(): CleanerTestUser {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return {
    email: `test-cleaner-${timestamp}-${random}@playwright-test.com`,
    password: 'testpassword123',
    role: 'cleaner',
  }
}

/**
 * Login as an existing user and navigate to a page
 */
export async function loginAndNavigate(page: Page, email: string, password: string, targetUrl: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle', { timeout: 15000 })
  await page.goto(targetUrl)
  await page.waitForLoadState('networkidle', { timeout: 15000 })
}

/**
 * Mock the billing API to return a specific tier
 */
export async function mockBillingApi(page: Page, tier: 'free' | 'basic' | 'pro', overrides: Record<string, unknown> = {}) {
  const defaults = {
    subscription: {
      planName: tier.charAt(0).toUpperCase() + tier.slice(1),
      planTier: tier,
      price: tier === 'free' ? 0 : tier === 'basic' ? 79 : 199,
      status: tier === 'free' ? 'none' : 'active',
      nextBillingDate: tier === 'free' ? undefined : new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    leadCredits: {
      used: 0,
      total: tier === 'free' ? 0 : tier === 'basic' ? 20 : -1,
      isUnlimited: tier === 'pro',
      resetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      recentUsage: [0, 0, 0, 0, 0, 0, 0],
    },
    paymentMethod: tier === 'free' ? null : {
      brand: 'visa',
      last4: '4242',
      expMonth: 12,
      expYear: 2027,
    },
    invoices: [],
  }

  await page.route('**/api/cleaner/billing', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...defaults, ...overrides }),
    })
  })
}

/**
 * Mock the lead fee API
 */
export async function mockLeadFeeApi(page: Page, tier: 'free' | 'basic' | 'pro', creditsUsed = 0) {
  const feeMap = { free: 1500, basic: 1000, pro: 0 }
  const limitMap = { free: 0, basic: 20, pro: -1 }
  const limit = limitMap[tier]
  const needsPayment = tier === 'free' || (tier === 'basic' && creditsUsed >= 20)
  const feeCents = needsPayment ? feeMap[tier] : 0

  await page.route('**/api/cleaner/leads/fee', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tier,
        creditsUsed,
        creditLimit: limit,
        needsPayment,
        feeCents,
        feeFormatted: `$${(feeCents / 100).toFixed(2)}`,
        hasPaymentMethod: tier !== 'free',
      }),
    })
  })
}

/**
 * Mock the lead claim API
 */
export async function mockLeadClaimApi(page: Page, options: { success?: boolean; charged?: boolean; feeCents?: number; creditsUsed?: number } = {}) {
  const { success = true, charged = false, feeCents = 0, creditsUsed = 1 } = options

  await page.route('**/api/cleaner/leads/claim', (route: Route) => {
    if (success) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          credits_used: creditsUsed,
          credit_limit: 20,
          charged,
          feeCents,
        }),
      })
    } else {
      route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'No payment method on file. Please add a payment method in Billing settings.',
          needsPaymentMethod: true,
          feeCents: 1500,
        }),
      })
    }
  })
}

/**
 * Mock the upgrade API to return a Stripe checkout redirect
 */
export async function mockUpgradeApi(page: Page) {
  await page.route('**/api/cleaner/billing/upgrade', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'checkout',
        url: 'https://checkout.stripe.com/test_session',
      }),
    })
  })
}

/**
 * Mock Stripe checkout redirect to avoid navigating to Stripe
 */
export async function mockStripeCheckout(page: Page) {
  await page.route('**/api/stripe/checkout**', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sessionId: 'cs_test_mock_session_id',
      }),
    })
  })
}

/**
 * Wait for billing page to finish loading
 */
export async function waitForBillingLoad(page: Page) {
  // Wait for the loading spinner to disappear
  await page.waitForSelector('text=Loading billing information...', { state: 'hidden', timeout: 10000 }).catch(() => {
    // May already be loaded
  })
  await page.waitForLoadState('networkidle', { timeout: 10000 })
}

/**
 * Wait for leads page to finish loading
 */
export async function waitForLeadsLoad(page: Page) {
  await page.waitForSelector('text=Loading leads...', { state: 'hidden', timeout: 10000 }).catch(() => {
    // May already be loaded
  })
  await page.waitForLoadState('networkidle', { timeout: 10000 })
}
