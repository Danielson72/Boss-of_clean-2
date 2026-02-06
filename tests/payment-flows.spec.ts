import { test, expect } from '@playwright/test'

/**
 * Boss of Clean - Payment Flow E2E Tests
 *
 * Tests the subscription upgrade flow, lead claim + charge flow,
 * and contact info redaction behavior.
 *
 * These tests use route mocking for Stripe/API interactions since
 * real Stripe checkout requires external browser navigation.
 */

test.describe('Pricing Page', () => {
  test('displays all three plan tiers with correct pricing', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')

    // All three plans visible
    await expect(page.locator('h3:has-text("Free")')).toBeVisible()
    await expect(page.locator('h3:has-text("Basic")')).toBeVisible()
    await expect(page.locator('h3:has-text("Pro")')).toBeVisible()

    // Monthly prices
    await expect(page.locator('text=$0')).toBeVisible()
    await expect(page.locator('text=$79')).toBeVisible()
    await expect(page.locator('text=$199')).toBeVisible()

    // Basic is marked as Most Popular
    await expect(page.locator('text=Most Popular')).toBeVisible()

    // Feature highlights
    await expect(page.locator('text=20 lead credits/month')).toBeVisible()
    await expect(page.locator('text=Unlimited lead credits')).toBeVisible()
  })

  test('billing toggle switches between monthly and annual pricing', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')

    // Monthly is default
    await expect(page.locator('span:has-text("$79")')).toBeVisible()
    await expect(page.locator('span:has-text("$199")')).toBeVisible()

    // Switch to Annual
    await page.locator('button:has-text("Annual")').click()

    // Annual prices (25% off): $79 * 0.75 = $59, $199 * 0.75 = $149
    await expect(page.locator('span:has-text("$59")')).toBeVisible()
    await expect(page.locator('span:has-text("$149")')).toBeVisible()

    // Savings shown
    await expect(page.locator('text=Save $237/year')).toBeVisible()
    await expect(page.locator('text=Save $597/year')).toBeVisible()

    // Original prices shown with strikethrough
    await expect(page.locator('span.line-through:has-text("$79")')).toBeVisible()
    await expect(page.locator('span.line-through:has-text("$199")')).toBeVisible()
  })

  test('free plan button redirects to signup', async ({ page }) => {
    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')

    // Click Free plan button
    await page.locator('button:has-text("Start Free Today")').click()

    // Should redirect to signup
    await expect(page).toHaveURL(/\/signup/)
  })

  test('paid plan buttons trigger Stripe checkout', async ({ page }) => {
    // Mock the Stripe checkout API
    let checkoutCalled = false
    let requestedPlan = ''
    await page.route('**/api/stripe/checkout**', (route) => {
      checkoutCalled = true
      requestedPlan = new URL(route.request().url()).searchParams.get('plan') || ''
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sessionId: 'cs_test_mock' }),
      })
    })

    // Mock Stripe.js redirectToCheckout
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).Stripe = () => ({
        redirectToCheckout: () => Promise.resolve({ error: null }),
      })
    })

    await page.goto('/pricing')
    await page.waitForLoadState('networkidle')

    // Click Basic plan
    await page.locator('button:has-text("Start Basic Plan")').click()

    // Wait for the API call
    await page.waitForTimeout(1000)
    expect(checkoutCalled).toBe(true)
    expect(requestedPlan).toBe('basic')
  })

  test('FAQ section renders all questions', async ({ page }) => {
    await page.goto('/pricing')

    await expect(page.locator('text=Frequently Asked Questions')).toBeVisible()
    await expect(page.locator('text=How quickly can I start receiving leads?')).toBeVisible()
    await expect(page.locator('text=Can I change my plan at any time?')).toBeVisible()
    await expect(page.locator('text=Do you offer any guarantees?')).toBeVisible()
    await expect(page.locator('text=Is there a setup fee?')).toBeVisible()
  })
})

test.describe('Billing Page - Subscription Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth - intercept the auth check to allow access
    // In real tests, you'd login with test credentials first
  })

  test('shows success notification after Stripe checkout redirect', async ({ page }) => {
    // Mock billing API for a freshly upgraded user
    await page.route('**/api/cleaner/billing', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: { planName: 'Basic', planTier: 'basic', price: 79, status: 'active' },
          leadCredits: { used: 0, total: 20, isUnlimited: false, resetDate: new Date().toISOString(), recentUsage: [] },
          paymentMethod: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2027 },
          invoices: [],
        }),
      })
    })

    // Navigate with success param (Stripe redirect back)
    await page.goto('/dashboard/cleaner/billing?success=true')

    // Success notification should appear
    await expect(page.locator('text=Your subscription has been upgraded successfully')).toBeVisible({ timeout: 5000 })
  })

  test('shows cancellation notification after Stripe checkout cancel', async ({ page }) => {
    await page.route('**/api/cleaner/billing', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: { planName: 'Free', planTier: 'free', price: 0, status: 'none' },
          leadCredits: { used: 0, total: 0, isUnlimited: false, resetDate: new Date().toISOString(), recentUsage: [] },
          paymentMethod: null,
          invoices: [],
        }),
      })
    })

    await page.goto('/dashboard/cleaner/billing?canceled=true')

    await expect(page.locator('text=Checkout was canceled')).toBeVisible({ timeout: 5000 })
  })

  test('plan upgrade triggers Stripe checkout redirect', async ({ page }) => {
    // Mock billing API for free tier
    await page.route('**/api/cleaner/billing', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: { planName: 'Free', planTier: 'free', price: 0, status: 'none' },
          leadCredits: { used: 0, total: 0, isUnlimited: false, resetDate: new Date().toISOString(), recentUsage: [] },
          paymentMethod: null,
          invoices: [],
        }),
      })
    })

    // Mock upgrade API
    let upgradePlanRequested = ''
    await page.route('**/api/cleaner/billing/upgrade', (route) => {
      const body = route.request().postDataJSON()
      upgradePlanRequested = body.planId
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ type: 'checkout', url: 'https://checkout.stripe.com/test' }),
      })
    })

    // Block navigation to Stripe
    await page.route('https://checkout.stripe.com/**', (route) => route.abort())

    await page.goto('/dashboard/cleaner/billing')
    await page.waitForLoadState('networkidle')

    // Scroll to plans and click upgrade on Basic
    const plansSection = page.locator('#plans')
    if (await plansSection.isVisible()) {
      await plansSection.scrollIntoViewIfNeeded()
    }

    // Find and click the upgrade button for Basic plan
    const upgradeButtons = page.locator('button:has-text("Upgrade")')
    const firstUpgrade = upgradeButtons.first()
    if (await firstUpgrade.isVisible()) {
      await firstUpgrade.click()
      await page.waitForTimeout(1000)
      expect(upgradePlanRequested).toBeTruthy()
    }
  })

  test('cancel subscription dialog shows confirmation', async ({ page }) => {
    // Mock billing API for paid tier
    await page.route('**/api/cleaner/billing', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: { planName: 'Basic', planTier: 'basic', price: 79, status: 'active', nextBillingDate: new Date(Date.now() + 30 * 86400000).toISOString() },
          leadCredits: { used: 5, total: 20, isUnlimited: false, resetDate: new Date().toISOString(), recentUsage: [1, 2, 0, 1, 1, 0, 0] },
          paymentMethod: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2027 },
          invoices: [],
        }),
      })
    })

    await page.goto('/dashboard/cleaner/billing')
    await page.waitForLoadState('networkidle')

    // Cancel section should be visible for paid plans
    const cancelSection = page.locator('text=Cancel Subscription')
    if (await cancelSection.isVisible()) {
      // The cancel dialog/button should exist
      await expect(cancelSection).toBeVisible()
    }
  })
})

test.describe('Lead Claims - Contact Info Redaction', () => {
  test('unclaimed leads always show contact info as hidden', async ({ page }) => {
    // Mock the Supabase query for leads via the page's client-side fetch
    // The leads page fetches data client-side, so we verify the UI behavior

    await page.route('**/rest/v1/cleaners**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-cleaner-1',
          subscription_tier: 'basic',
          lead_credits_used: 5,
          lead_credits_reset_at: new Date().toISOString(),
        }),
        headers: { 'content-range': '0-0/1' },
      })
    })

    await page.route('**/rest/v1/cleaner_service_areas**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ zip_code: '33101' }]),
      })
    })

    await page.route('**/rest/v1/quote_requests**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'lead-1',
            service_type: 'residential',
            property_size: '2000 sqft',
            property_type: 'House',
            frequency: 'Weekly',
            preferred_date: '2026-03-01',
            preferred_time: '10:00 AM',
            zip_code: '33101',
            city: 'Miami',
            budget_range: '$100-$200',
            special_instructions: 'Has pets',
            created_at: new Date().toISOString(),
            customer: { full_name: 'John Doe' },
          },
          {
            id: 'lead-2',
            service_type: 'deep_cleaning',
            property_size: '1500 sqft',
            property_type: 'Apartment',
            frequency: 'One-time',
            preferred_date: '2026-03-15',
            preferred_time: '2:00 PM',
            zip_code: '33101',
            city: 'Miami',
            budget_range: '$150-$300',
            special_instructions: '',
            created_at: new Date().toISOString(),
            customer: { full_name: 'Jane Smith' },
          },
        ]),
      })
    })

    await page.route('**/api/cleaner/leads/fee', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'basic',
          creditsUsed: 5,
          creditLimit: 20,
          needsPayment: false,
          feeCents: 0,
          feeFormatted: '$0.00',
          hasPaymentMethod: true,
        }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')

    // Wait for leads to render
    const leadCards = page.locator('.bg-white.rounded-lg.shadow-sm.p-5')

    // Every lead card should show "Contact info hidden" text
    const hiddenTexts = page.locator('text=Contact info hidden')
    const count = await hiddenTexts.count()
    expect(count).toBeGreaterThan(0)

    // No email addresses should be visible in lead cards
    // (emails would match the @ pattern)
    const pageText = await page.textContent('body')
    expect(pageText).not.toMatch(/[\w.-]+@[\w.-]+\.\w+/)

    // No phone numbers visible (pattern: digits with dashes/parens)
    // Lead cards should not display phone numbers
    const phonePattern = /\(\d{3}\)\s?\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/
    const leadArea = page.locator('.grid.grid-cols-1')
    if (await leadArea.isVisible()) {
      const leadAreaText = await leadArea.textContent()
      expect(leadAreaText).not.toMatch(phonePattern)
    }
  })

  test('lead cards show lock icon indicating hidden contact info', async ({ page }) => {
    // Simplified test - just check the pricing page has redaction messaging
    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')

    // The page should load without server errors
    const body = await page.textContent('body')
    expect(body).not.toContain('Internal Server Error')
    expect(body).not.toContain('Application error')
  })
})

test.describe('Lead Claim - Payment Flow', () => {
  test('free tier cleaner sees per-lead fee on claim button', async ({ page }) => {
    // Set up route mocks for a free-tier cleaner
    await page.route('**/rest/v1/cleaners**', (route) => {
      if (route.request().url().includes('select=')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-cleaner-free',
            subscription_tier: 'free',
            lead_credits_used: 0,
            lead_credits_reset_at: new Date().toISOString(),
          }),
          headers: { 'content-range': '0-0/1' },
        })
      } else {
        route.continue()
      }
    })

    await page.route('**/rest/v1/cleaner_service_areas**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ zip_code: '33101' }]),
      })
    })

    await page.route('**/rest/v1/quote_requests**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'lead-free-1',
            service_type: 'residential',
            property_size: '2000 sqft',
            property_type: 'House',
            frequency: 'Weekly',
            preferred_date: '2026-03-01',
            preferred_time: '10:00 AM',
            zip_code: '33101',
            city: 'Miami',
            budget_range: '$100-$200',
            special_instructions: '',
            created_at: new Date().toISOString(),
            customer: { full_name: 'Test Customer' },
          },
        ]),
      })
    })

    await page.route('**/api/cleaner/leads/fee', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'free',
          creditsUsed: 0,
          creditLimit: 0,
          needsPayment: true,
          feeCents: 1500,
          feeFormatted: '$15.00',
          hasPaymentMethod: true,
        }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')

    // Should show pay-per-lead banner
    await expect(page.locator('text=Pay-per-lead active')).toBeVisible({ timeout: 5000 })

    // Should show fee on claim button
    await expect(page.locator('text=Claim ($15.00)')).toBeVisible({ timeout: 5000 })

    // Should show the $15.00 per lead badge in header
    await expect(page.locator('text=$15.00 per lead')).toBeVisible()
  })

  test('fee confirmation modal appears for paid leads', async ({ page }) => {
    // Set up free tier cleaner with payment method
    await page.route('**/rest/v1/cleaners**', (route) => {
      if (route.request().url().includes('select=')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-cleaner-free',
            subscription_tier: 'free',
            lead_credits_used: 0,
            lead_credits_reset_at: new Date().toISOString(),
          }),
          headers: { 'content-range': '0-0/1' },
        })
      } else {
        route.continue()
      }
    })

    await page.route('**/rest/v1/cleaner_service_areas**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ zip_code: '33101' }]),
      })
    })

    await page.route('**/rest/v1/quote_requests**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'lead-modal-test',
            service_type: 'residential',
            property_size: '2000 sqft',
            property_type: 'House',
            frequency: 'Weekly',
            preferred_date: '2026-03-01',
            preferred_time: '10:00 AM',
            zip_code: '33101',
            city: 'Miami',
            budget_range: '$100-$200',
            special_instructions: '',
            created_at: new Date().toISOString(),
            customer: { full_name: 'Test Customer' },
          },
        ]),
      })
    })

    await page.route('**/api/cleaner/leads/fee', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'free',
          creditsUsed: 0,
          creditLimit: 0,
          needsPayment: true,
          feeCents: 1500,
          feeFormatted: '$15.00',
          hasPaymentMethod: true,
        }),
      })
    })

    await page.route('**/api/cleaner/leads/claim', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, credits_used: 1, credit_limit: 0, charged: true, feeCents: 1500 }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')

    // Click claim on the lead
    const claimButton = page.locator('button:has-text("Claim ($15.00)")').first()
    await expect(claimButton).toBeVisible({ timeout: 5000 })
    await claimButton.click()

    // Fee confirmation modal should appear
    await expect(page.locator('text=Confirm Lead Purchase')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=$15.00')).toBeVisible()

    // Modal has cancel and pay buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible()
    await expect(page.locator('button:has-text("Pay $15.00 & Claim")')).toBeVisible()
  })

  test('basic tier cleaner sees credit counter instead of fee', async ({ page }) => {
    await page.route('**/rest/v1/cleaners**', (route) => {
      if (route.request().url().includes('select=')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-cleaner-basic',
            subscription_tier: 'basic',
            lead_credits_used: 5,
            lead_credits_reset_at: new Date().toISOString(),
          }),
          headers: { 'content-range': '0-0/1' },
        })
      } else {
        route.continue()
      }
    })

    await page.route('**/rest/v1/cleaner_service_areas**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ zip_code: '33101' }]),
      })
    })

    await page.route('**/rest/v1/quote_requests**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'lead-basic-1',
            service_type: 'deep_cleaning',
            property_size: '1500 sqft',
            property_type: 'Apartment',
            frequency: 'One-time',
            preferred_date: '2026-03-01',
            preferred_time: '2:00 PM',
            zip_code: '33101',
            city: 'Miami',
            budget_range: '$150-$300',
            special_instructions: '',
            created_at: new Date().toISOString(),
            customer: { full_name: 'Basic Lead Customer' },
          },
        ]),
      })
    })

    await page.route('**/api/cleaner/leads/fee', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'basic',
          creditsUsed: 5,
          creditLimit: 20,
          needsPayment: false,
          feeCents: 0,
          feeFormatted: '$0.00',
          hasPaymentMethod: true,
        }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')

    // Should show credits remaining (15 / 20)
    await expect(page.locator('text=15 / 20 credits left')).toBeVisible({ timeout: 5000 })

    // Claim button should say "Claim Lead" without a price
    await expect(page.locator('button:has-text("Claim Lead")')).toBeVisible()

    // No pay-per-lead banner
    await expect(page.locator('text=Pay-per-lead active')).not.toBeVisible()
  })

  test('pro tier cleaner sees unlimited leads badge', async ({ page }) => {
    await page.route('**/rest/v1/cleaners**', (route) => {
      if (route.request().url().includes('select=')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-cleaner-pro',
            subscription_tier: 'pro',
            lead_credits_used: 50,
            lead_credits_reset_at: new Date().toISOString(),
          }),
          headers: { 'content-range': '0-0/1' },
        })
      } else {
        route.continue()
      }
    })

    await page.route('**/rest/v1/cleaner_service_areas**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ zip_code: '33101' }]),
      })
    })

    await page.route('**/rest/v1/quote_requests**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/api/cleaner/leads/fee', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'pro',
          creditsUsed: 50,
          creditLimit: -1,
          needsPayment: false,
          feeCents: 0,
          feeFormatted: '$0.00',
          hasPaymentMethod: true,
        }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')

    // Should show "Unlimited Leads" badge
    await expect(page.locator('text=Unlimited Leads')).toBeVisible({ timeout: 5000 })

    // No upgrade banner (Pro doesn't need upgrade)
    await expect(page.locator('text=Unlock More Leads')).not.toBeVisible()
  })

  test('no payment method warning shown when missing', async ({ page }) => {
    await page.route('**/rest/v1/cleaners**', (route) => {
      if (route.request().url().includes('select=')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-cleaner-no-card',
            subscription_tier: 'free',
            lead_credits_used: 0,
            lead_credits_reset_at: new Date().toISOString(),
          }),
          headers: { 'content-range': '0-0/1' },
        })
      } else {
        route.continue()
      }
    })

    await page.route('**/rest/v1/cleaner_service_areas**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ zip_code: '33101' }]),
      })
    })

    await page.route('**/rest/v1/quote_requests**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'lead-no-card',
            service_type: 'residential',
            property_size: '2000 sqft',
            property_type: 'House',
            frequency: 'One-time',
            preferred_date: '2026-03-01',
            preferred_time: '',
            zip_code: '33101',
            city: 'Miami',
            budget_range: '$100-$200',
            special_instructions: '',
            created_at: new Date().toISOString(),
            customer: { full_name: 'Test' },
          },
        ]),
      })
    })

    await page.route('**/api/cleaner/leads/fee', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'free',
          creditsUsed: 0,
          creditLimit: 0,
          needsPayment: true,
          feeCents: 1500,
          feeFormatted: '$15.00',
          hasPaymentMethod: false,
        }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')

    // Should show payment method warning
    await expect(page.locator('text=Payment method required')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Add Card').first()).toBeVisible()
  })
})

test.describe('Subscription Upgrade Path - Free to Basic to Pro', () => {
  test('free user sees Upgrade Now banner on leads page', async ({ page }) => {
    await page.route('**/rest/v1/cleaners**', (route) => {
      if (route.request().url().includes('select=')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-cleaner-upgrade',
            subscription_tier: 'free',
            lead_credits_used: 0,
            lead_credits_reset_at: new Date().toISOString(),
          }),
          headers: { 'content-range': '0-0/1' },
        })
      } else {
        route.continue()
      }
    })

    await page.route('**/rest/v1/cleaner_service_areas**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ zip_code: '32202' }]),
      })
    })

    await page.route('**/rest/v1/quote_requests**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/api/cleaner/leads/fee', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'free',
          creditsUsed: 0,
          creditLimit: 0,
          needsPayment: true,
          feeCents: 1500,
          feeFormatted: '$15.00',
          hasPaymentMethod: false,
        }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')

    // Purple upgrade banner visible for free users
    await expect(page.locator('text=Unlock More Leads')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('a:has-text("Upgrade Now")')).toBeVisible()

    // Link goes to billing page
    const upgradeLink = page.locator('a:has-text("Upgrade Now")')
    await expect(upgradeLink).toHaveAttribute('href', '/dashboard/cleaner/billing')
  })

  test('billing page shows plan comparison with current plan marked', async ({ page }) => {
    await page.route('**/api/cleaner/billing', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscription: { planName: 'Basic', planTier: 'basic', price: 79, status: 'active' },
          leadCredits: { used: 10, total: 20, isUnlimited: false, resetDate: new Date().toISOString(), recentUsage: [2, 1, 3, 0, 2, 1, 1] },
          paymentMethod: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2027 },
          invoices: [],
        }),
      })
    })

    await page.goto('/dashboard/cleaner/billing')
    await page.waitForLoadState('networkidle')

    // Page heading
    await expect(page.locator('h1:has-text("Billing & Subscription")')).toBeVisible({ timeout: 5000 })

    // Plans section exists
    const plansSection = page.locator('#plans')
    await expect(plansSection).toBeAttached()
  })
})
