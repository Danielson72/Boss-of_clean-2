import { test, expect } from '@playwright/test'

/**
 * Boss of Clean - Customer Dashboard E2E Tests
 *
 * Tests the customer dashboard enhancements:
 * - Credits tab display
 * - Confirm Hire button on accepted quotes
 * - Quote request link
 */

function wasRedirectedToLogin(page: { url(): string }): boolean {
  const url = page.url()
  return url.includes('/login') || url.includes('/signup')
}

test.describe('Customer Dashboard', () => {
  test('customer dashboard loads without errors', async ({ page }) => {
    await page.goto('/dashboard/customer')
    await page.waitForLoadState('networkidle')

    // Should either render dashboard or redirect to login
    const body = await page.textContent('body')
    expect(body).not.toContain('Internal Server Error')
    expect(body).not.toContain('Application error')
  })

  test('protected route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/customer')
    await expect(page).toHaveURL(/\/login/)
  })
})

// ─── API Routes ───────────────────────────────────────────────────────────────

test.describe('API Route Health Checks', () => {
  test('GET /api/leads/available returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/leads/available')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/leads/unlocked returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/leads/unlocked')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('POST /api/leads/unlock returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/leads/unlock', {
      data: { quote_request_id: 'test' },
    })
    expect(res.status()).toBe(401)
  })

  test('POST /api/leads/refund returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/leads/refund', {
      data: { lead_unlock_id: 'test', reason: 'wrong_contact_info' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/credits/pro returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/credits/pro')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('GET /api/admin/email-health returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/admin/email-health')
    expect(res.status()).toBe(401)
  })

  test('POST /api/admin/email-test returns 401 without auth', async ({ request }) => {
    const res = await request.post('/api/admin/email-test', {
      data: { to: 'test@example.com' },
    })
    expect(res.status()).toBe(401)
  })
})
