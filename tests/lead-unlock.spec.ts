import { test, expect } from '@playwright/test'

/**
 * Boss of Clean - Lead Unlock System E2E Tests
 *
 * Tests the new Fair Lead Model features:
 * - Available leads with competition indicator
 * - Lead unlock flow (credit-based and Stripe Checkout)
 * - Unlocked leads with full contact details
 * - Refund request flow
 * - Spending cap display
 *
 * These tests mock the API responses since they require
 * authenticated sessions with specific Supabase state.
 */

function wasRedirectedToLogin(page: { url(): string }): boolean {
  const url = page.url()
  return url.includes('/login') || url.includes('/signup')
}

// ─── Available Leads Tab ──────────────────────────────────────────────────────

test.describe('Pro Leads - Available Leads Tab', () => {
  test('shows available leads with competition indicator', async ({ page }) => {
    await page.route('**/api/leads/available', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leads: [
            {
              id: 'q1',
              service_type: 'residential',
              zip_code: '33101',
              city: 'Miami',
              property_size: '2000 sqft',
              property_type: 'House',
              service_date: '2026-03-15',
              frequency: 'weekly',
              created_at: new Date().toISOString(),
              competition_count: 1,
              competition_remaining: 2,
            },
            {
              id: 'q2',
              service_type: 'deep_clean',
              zip_code: '33101',
              city: 'Miami',
              property_size: '1500 sqft',
              property_type: 'Apartment',
              service_date: '2026-03-20',
              frequency: 'one-time',
              created_at: new Date().toISOString(),
              competition_count: 2,
              competition_remaining: 1,
            },
            {
              id: 'q3',
              service_type: 'commercial',
              zip_code: '33102',
              city: 'Miami',
              property_size: '5000 sqft',
              property_type: 'Office',
              service_date: null,
              frequency: 'weekly',
              created_at: new Date().toISOString(),
              competition_count: 3,
              competition_remaining: 0,
            },
          ],
        }),
      })
    })

    await page.route('**/api/leads/unlocked', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: [] }),
      })
    })

    await page.route('**/api/credits/pro', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'basic',
          credits: { total: 10, used: 3, remaining: 7, is_unlimited: false, billing_period_end: '2026-03-31' },
          spending_cap: { weekly_cap_cents: 10000, current_week_spent_cents: 2400, remaining_cents: 7600 },
        }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(wasRedirectedToLogin(page), 'Requires authenticated cleaner session')

    // Tab should be visible
    await expect(page.locator('button:has-text("Available Leads")')).toBeVisible({ timeout: 10000 })

    // Available leads count badge
    await expect(page.locator('text=3').first()).toBeVisible()

    // Lead cards should show competition info
    await expect(page.locator('text=2 spots left').first()).toBeVisible()
    await expect(page.locator('text=1 spot left').first()).toBeVisible()
    await expect(page.locator('text=Full').first()).toBeVisible()

    // Unlock buttons with prices
    await expect(page.locator('text=Unlock for $12').first()).toBeVisible()
    await expect(page.locator('text=Unlock for $18').first()).toBeVisible()
    await expect(page.locator('text=Unlock for $25').first()).toBeVisible()

    // Full competition lead should say "No spots left"
    await expect(page.locator('text=No spots left')).toBeVisible()

    // Credits display
    await expect(page.locator('text=7 credits left')).toBeVisible()

    // Spending cap display
    await expect(page.locator('text=$76.00 cap left')).toBeVisible()
  })

  test('unlock confirmation modal shows lead details and price', async ({ page }) => {
    await page.route('**/api/leads/available', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leads: [
            {
              id: 'q-modal',
              service_type: 'residential',
              zip_code: '33101',
              city: 'Miami',
              property_size: '2000 sqft',
              property_type: 'House',
              service_date: '2026-03-15',
              frequency: 'weekly',
              created_at: new Date().toISOString(),
              competition_count: 1,
              competition_remaining: 2,
            },
          ],
        }),
      })
    })

    await page.route('**/api/leads/unlocked', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: [] }),
      })
    })

    await page.route('**/api/credits/pro', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'basic',
          credits: null,
          spending_cap: null,
        }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(wasRedirectedToLogin(page), 'Requires authenticated cleaner session')

    // Click unlock button
    const unlockBtn = page.locator('button:has-text("Unlock for $12")').first()
    await expect(unlockBtn).toBeVisible({ timeout: 10000 })
    await unlockBtn.click()

    // Modal should appear
    await expect(page.locator('text=Unlock This Lead?')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Miami, 33101')).toBeVisible()
    await expect(page.locator('text=1 of 3 pros')).toBeVisible()
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible()
    await expect(page.locator('button:has-text("Unlock Lead")')).toBeVisible()
  })

  test('credit-based unlock shows success message', async ({ page }) => {
    await page.route('**/api/leads/available', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leads: [
            {
              id: 'q-credit',
              service_type: 'residential',
              zip_code: '33101',
              city: 'Miami',
              property_size: '2000 sqft',
              property_type: 'House',
              service_date: '2026-03-15',
              frequency: 'weekly',
              created_at: new Date().toISOString(),
              competition_count: 0,
              competition_remaining: 3,
            },
          ],
        }),
      })
    })

    await page.route('**/api/leads/unlocked', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: [] }),
      })
    })

    await page.route('**/api/credits/pro', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'pro',
          credits: { total: -1, used: 5, remaining: -1, is_unlimited: true, billing_period_end: '2026-03-31' },
          spending_cap: null,
        }),
      })
    })

    await page.route('**/api/leads/unlock', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unlocked: true, unlock_id: 'unlock-1' }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(wasRedirectedToLogin(page), 'Requires authenticated cleaner session')

    // Unlimited credits display
    await expect(page.locator('text=Unlimited Credits')).toBeVisible({ timeout: 10000 })

    // Unlock modal shows "Included credit"
    const unlockBtn = page.locator('button:has-text("Unlock for $12")').first()
    await expect(unlockBtn).toBeVisible({ timeout: 10000 })
    await unlockBtn.click()

    await expect(page.locator('text=Included credit')).toBeVisible({ timeout: 5000 })

    // Click unlock
    await page.locator('button:has-text("Unlock Lead")').click()

    // Success message
    await expect(page.locator('text=Lead unlocked with included credit')).toBeVisible({ timeout: 5000 })
  })
})

// ─── Unlocked Leads Tab ───────────────────────────────────────────────────────

test.describe('Pro Leads - Unlocked Leads Tab', () => {
  test('shows unlocked leads with full customer contact', async ({ page }) => {
    await page.route('**/api/leads/available', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: [] }),
      })
    })

    await page.route('**/api/leads/unlocked', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leads: [
            {
              id: 'unlock-1',
              fee_tier: 'standard',
              amount_cents: 1200,
              status: 'paid',
              unlocked_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              refund_status: null,
              quote_request: {
                id: 'qr-1',
                service_type: 'residential',
                service_date: '2026-03-15',
                service_time: '10:00 AM',
                address: '123 Main St',
                city: 'Miami',
                zip_code: '33101',
                property_size: '2000 sqft',
                property_type: 'House',
                description: 'Needs deep cleaning',
                special_requests: 'Has two cats',
                frequency: 'weekly',
                customer: {
                  full_name: 'Jane Doe',
                  phone: '(305) 555-1234',
                  email: 'jane@example.com',
                },
              },
            },
          ],
        }),
      })
    })

    await page.route('**/api/credits/pro', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'basic',
          credits: null,
          spending_cap: null,
        }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(wasRedirectedToLogin(page), 'Requires authenticated cleaner session')

    // Switch to unlocked tab
    await page.locator('button:has-text("Unlocked Leads")').click()

    // Customer contact details should be visible
    await expect(page.locator('text=Jane Doe')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=(305) 555-1234')).toBeVisible()
    await expect(page.locator('text=jane@example.com')).toBeVisible()

    // Job details
    await expect(page.locator('text=123 Main St')).toBeVisible()
    await expect(page.locator('text=Needs deep cleaning')).toBeVisible()
    await expect(page.locator('text=Has two cats')).toBeVisible()

    // Payment info
    await expect(page.locator('text=$12.00')).toBeVisible()

    // Refund button should be available
    await expect(page.locator('text=Request Refund')).toBeVisible()
  })

  test('refund request modal with reason selection', async ({ page }) => {
    await page.route('**/api/leads/available', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: [] }),
      })
    })

    await page.route('**/api/leads/unlocked', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leads: [
            {
              id: 'unlock-refund',
              fee_tier: 'deep_clean',
              amount_cents: 1800,
              status: 'paid',
              unlocked_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              refund_status: null,
              quote_request: {
                id: 'qr-refund',
                service_type: 'deep_clean',
                service_date: '2026-03-20',
                service_time: '2:00 PM',
                address: '456 Oak Ave',
                city: 'Orlando',
                zip_code: '32801',
                property_size: '1500 sqft',
                property_type: 'Apartment',
                description: '',
                special_requests: '',
                frequency: 'one-time',
                customer: {
                  full_name: 'John Smith',
                  phone: '(407) 555-5678',
                  email: 'john@example.com',
                },
              },
            },
          ],
        }),
      })
    })

    await page.route('**/api/credits/pro', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tier: 'basic', credits: null, spending_cap: null }),
      })
    })

    await page.route('**/api/leads/refund', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ refund_id: 'ref-1', status: 'pending' }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(wasRedirectedToLogin(page), 'Requires authenticated cleaner session')

    // Go to unlocked tab
    await page.locator('button:has-text("Unlocked Leads")').click()
    await expect(page.locator('text=John Smith')).toBeVisible({ timeout: 5000 })

    // Click refund button
    await page.locator('button:has-text("Request Refund")').click()

    // Modal appears
    await expect(page.locator('text=Request a Refund')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Select a reason...')).toBeVisible()

    // Select reason
    await page.selectOption('select', 'wrong_contact_info')

    // Fill evidence
    await page.fill('textarea', 'Phone number is disconnected')

    // Submit
    await page.locator('button:has-text("Submit Refund Request")').click()

    // Success message
    await expect(page.locator('text=Refund request submitted')).toBeVisible({ timeout: 5000 })
  })

  test('shows refund status badge on unlocked leads', async ({ page }) => {
    await page.route('**/api/leads/available', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: [] }),
      })
    })

    await page.route('**/api/leads/unlocked', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leads: [
            {
              id: 'unlock-pending-refund',
              fee_tier: 'standard',
              amount_cents: 1200,
              status: 'paid',
              unlocked_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              refund_status: 'pending',
              quote_request: {
                id: 'qr-pending',
                service_type: 'residential',
                service_date: '2026-03-15',
                service_time: '10:00 AM',
                address: '789 Elm St',
                city: 'Tampa',
                zip_code: '33602',
                property_size: '1800 sqft',
                property_type: 'Condo',
                description: '',
                special_requests: '',
                frequency: 'one-time',
                customer: {
                  full_name: 'Bob Wilson',
                  phone: '(813) 555-9999',
                  email: 'bob@example.com',
                },
              },
            },
          ],
        }),
      })
    })

    await page.route('**/api/credits/pro', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tier: 'basic', credits: null, spending_cap: null }),
      })
    })

    await page.goto('/dashboard/cleaner/leads')
    await page.waitForLoadState('networkidle')
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(wasRedirectedToLogin(page), 'Requires authenticated cleaner session')

    await page.locator('button:has-text("Unlocked Leads")').click()

    // Refund status badge
    await expect(page.locator('text=Refund pending')).toBeVisible({ timeout: 5000 })

    // No refund button for leads with existing refund request
    await expect(page.locator('button:has-text("Request Refund")')).not.toBeVisible()
  })
})

// ─── Signup Role Selection ────────────────────────────────────────────────────

test.describe('Signup - Role Selection', () => {
  test('signup page shows customer and pro role cards', async ({ page }) => {
    await page.goto('/signup')

    // Role selection cards
    await expect(page.locator('text=I Need Cleaning')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=I\'m a Cleaning Pro')).toBeVisible()

    // No form fields yet
    await expect(page.locator('input[type="email"]')).not.toBeVisible()
  })

  test('selecting customer role shows basic signup form', async ({ page }) => {
    await page.goto('/signup')

    await page.locator('text=I Need Cleaning').click()

    // Form should appear
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()

    // No pro-specific fields
    await expect(page.locator('input#businessName')).not.toBeVisible()
    await expect(page.locator('input#phone')).not.toBeVisible()
  })

  test('selecting pro role shows pro signup form with extra fields', async ({ page }) => {
    await page.goto('/signup')

    await page.locator('text=I\'m a Cleaning Pro').click()

    // All form fields visible
    await expect(page.locator('input#fullName')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input#businessName')).toBeVisible()
    await expect(page.locator('input#phone')).toBeVisible()
    await expect(page.locator('input#zipCode')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()

    // Button says "Create Pro Account"
    await expect(page.locator('button:has-text("Create Pro Account")')).toBeVisible()
  })

  test('back button returns to role selection', async ({ page }) => {
    await page.goto('/signup')

    await page.locator('text=I Need Cleaning').click()
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 })

    // Click back arrow
    await page.locator('button:has-text("Choose a different role")').click()

    // Back to role selection
    await expect(page.locator('text=I Need Cleaning')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[type="email"]')).not.toBeVisible()
  })
})

// ─── Stripe Checkout Return ───────────────────────────────────────────────────

test.describe('Stripe Checkout Return', () => {
  test('success URL shows success message and switches to unlocked tab', async ({ page }) => {
    await page.route('**/api/leads/available', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: [] }),
      })
    })

    await page.route('**/api/leads/unlocked', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: [] }),
      })
    })

    await page.route('**/api/credits/pro', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tier: 'basic', credits: null, spending_cap: null }),
      })
    })

    await page.goto('/dashboard/cleaner/leads?unlock=success')
    await page.waitForLoadState('networkidle')
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(wasRedirectedToLogin(page), 'Requires authenticated cleaner session')

    // Success message
    await expect(page.locator('text=Lead unlocked successfully')).toBeVisible({ timeout: 10000 })

    // Should be on unlocked tab
    const unlockedTab = page.locator('button:has-text("Unlocked Leads")')
    await expect(unlockedTab).toHaveClass(/border-blue-600/, { timeout: 5000 })
  })

  test('cancelled URL shows error message', async ({ page }) => {
    await page.route('**/api/leads/available', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: [] }),
      })
    })

    await page.route('**/api/leads/unlocked', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: [] }),
      })
    })

    await page.route('**/api/credits/pro', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tier: 'basic', credits: null, spending_cap: null }),
      })
    })

    await page.goto('/dashboard/cleaner/leads?unlock=cancelled')
    await page.waitForLoadState('networkidle')
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(wasRedirectedToLogin(page), 'Requires authenticated cleaner session')

    await expect(page.locator('text=Lead unlock payment was cancelled')).toBeVisible({ timeout: 10000 })
  })
})
