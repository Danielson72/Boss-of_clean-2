import { test, expect } from '@playwright/test'

const TIER_LIMITS = {
  free: 1,
  basic: 5,
  pro: 15,
  enterprise: -1 // unlimited
}

test.describe('Subscription Tier Limits', () => {
  test.beforeEach(async ({ page }) => {
    // Assume we have a test user setup
    await page.goto('/login')
  })

  test('Free tier shows correct limit banner', async ({ page }) => {
    // Login as free tier user
    await page.fill('[data-testid="email-input"]', 'free.user@test.com')
    await page.fill('[data-testid="password-input"]', 'Test1234!')
    await page.click('[data-testid="login-button"]')

    // Navigate to booking flow
    await page.goto('/pros')
    await page.click('[data-testid="cleaner-card"]')
    await page.click('[data-testid="book-now-button"]')

    // Check tier banner shows correct information
    const tierBanner = page.locator('[data-testid="tier-banner"]')
    await expect(tierBanner).toContainText('Free Plan')
    await expect(tierBanner).toContainText('1 bookings used this month')
  })

  test('API returns 403 when tier limit exceeded', async ({ request }) => {
    // Create booking request for free user who has reached limit
    const bookingData = {
      cleanerId: 'test-cleaner-id',
      serviceId: 'test-service-id',
      serviceName: 'House Cleaning',
      serviceType: 'house_cleaning',
      scheduledDate: '2025-01-15',
      scheduledTime: '10:00',
      duration: 2,
      homeSize: 'medium',
      addOns: [],
      customerInfo: {
        name: 'John Doe',
        email: 'free.user@test.com',
        phone: '555-123-4567',
        address: '123 Test St',
        zipCode: '33101'
      },
      specialRequests: '',
      pricing: {
        basePrice: 100,
        addOnTotal: 0,
        travelFee: 10,
        discount: 0,
        totalPrice: 110
      }
    }

    const response = await request.post('/api/bookings', {
      data: bookingData,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    expect(response.status()).toBe(403)
    const result = await response.json()
    expect(result.error).toBe('Booking limit reached')
    expect(result.upgradeRequired).toBe(true)
    expect(result.message).toContain('Upgrade to Basic')
  })

  test('Tier endpoint returns correct user information', async ({ request }) => {
    const response = await request.get('/api/customer/tier')

    expect(response.ok()).toBe(true)
    const tierInfo = await response.json()

    expect(tierInfo).toHaveProperty('tier')
    expect(tierInfo).toHaveProperty('tierName')
    expect(tierInfo).toHaveProperty('limit')
    expect(tierInfo).toHaveProperty('used')
    expect(tierInfo).toHaveProperty('remaining')
    expect(tierInfo).toHaveProperty('isUnlimited')
    expect(tierInfo).toHaveProperty('isAtLimit')
  })

  test('Basic tier allows up to 5 bookings', async ({ page }) => {
    // Login as basic tier user
    await page.fill('[data-testid="email-input"]', 'basic.user@test.com')
    await page.fill('[data-testid="password-input"]', 'Test1234!')
    await page.click('[data-testid="login-button"]')

    // Check API endpoint
    const response = await page.request.get('/api/customer/tier')
    const tierInfo = await response.json()

    expect(tierInfo.tier).toBe('basic')
    expect(tierInfo.limit).toBe(5)
  })

  test('Pro tier allows up to 15 bookings', async ({ page }) => {
    // Login as pro tier user
    await page.fill('[data-testid="email-input"]', 'pro.user@test.com')
    await page.fill('[data-testid="password-input"]', 'Test1234!')
    await page.click('[data-testid="login-button"]')

    // Check API endpoint
    const response = await page.request.get('/api/customer/tier')
    const tierInfo = await response.json()

    expect(tierInfo.tier).toBe('pro')
    expect(tierInfo.limit).toBe(15)
  })

  test('Enterprise tier shows unlimited bookings', async ({ page }) => {
    // Login as enterprise tier user
    await page.fill('[data-testid="email-input"]', 'enterprise.user@test.com')
    await page.fill('[data-testid="password-input"]', 'Test1234!')
    await page.click('[data-testid="login-button"]')

    // Navigate to booking flow
    await page.goto('/pros')
    await page.click('[data-testid="cleaner-card"]')
    await page.click('[data-testid="book-now-button"]')

    // Check tier banner shows unlimited
    const tierBanner = page.locator('[data-testid="tier-banner"]')
    await expect(tierBanner).toContainText('Enterprise Plan')
    await expect(tierBanner).toContainText('Unlimited bookings')
  })

  test('Booking flow disabled when at limit', async ({ page }) => {
    // Login as user at booking limit
    await page.fill('[data-testid="email-input"]', 'limited.user@test.com')
    await page.fill('[data-testid="password-input"]', 'Test1234!')
    await page.click('[data-testid="login-button"]')

    // Navigate to booking flow
    await page.goto('/pros')
    await page.click('[data-testid="cleaner-card"]')
    await page.click('[data-testid="book-now-button"]')

    // Check that service cards are disabled
    const serviceCard = page.locator('[data-testid="service-card"]').first()
    await expect(serviceCard).toHaveClass(/opacity-50/)
    await expect(serviceCard).toHaveClass(/cursor-not-allowed/)

    // Check error banner
    const tierBanner = page.locator('[data-testid="tier-banner"]')
    await expect(tierBanner).toContainText('🚫 Booking limit reached')
  })

  test('Yellow warning shown when 1 booking remaining', async ({ page }) => {
    // Login as user with 1 booking remaining
    await page.fill('[data-testid="email-input"]', 'warning.user@test.com')
    await page.fill('[data-testid="password-input"]', 'Test1234!')
    await page.click('[data-testid="login-button"]')

    // Navigate to booking flow
    await page.goto('/pros')
    await page.click('[data-testid="cleaner-card"]')
    await page.click('[data-testid="book-now-button']')

    // Check warning banner
    const tierBanner = page.locator('[data-testid="tier-banner"]')
    await expect(tierBanner).toContainText('⚠️ 1 booking remaining')
    await expect(tierBanner).toHaveClass(/bg-yellow-50/)
  })

  test('Tier pricing multipliers applied correctly', async ({ page }) => {
    // Test that tier pricing affects the displayed prices
    await page.fill('[data-testid="email-input"]', 'pro.user@test.com')
    await page.fill('[data-testid="password-input"]', 'Test1234!')
    await page.click('[data-testid="login-button"]')

    const response = await page.request.get('/api/services/pricing')
    const services = await response.json()

    // Check that services have tier_pricing field
    services.forEach(service => {
      expect(service).toHaveProperty('tier_pricing')
      expect(service.tier_pricing).toHaveProperty('pro')
      expect(service.tier_pricing.pro.multiplier).toBe(0.90) // 10% discount
    })
  })
})

test.describe('Database Schema Tests', () => {
  test('Users table has subscription tier fields', async ({ request }) => {
    // Test that migration was applied correctly
    const response = await request.get('/api/customer/tier')
    expect(response.ok()).toBe(true)

    const tierInfo = await response.json()
    expect(tierInfo).toHaveProperty('tier')
    expect(tierInfo).toHaveProperty('expiresAt')
  })

  test('Services pricing table has tier pricing', async ({ request }) => {
    const response = await request.get('/api/services/pricing')
    expect(response.ok()).toBe(true)

    const services = await response.json()
    if (services.length > 0) {
      expect(services[0]).toHaveProperty('tier_pricing')
    }
  })
})

test.describe('Tier Management API', () => {
  test('GET /api/customer/tier returns user tier info', async ({ request }) => {
    const response = await request.get('/api/customer/tier')

    expect(response.ok()).toBe(true)
    const data = await response.json()

    expect(data).toMatchObject({
      tier: expect.stringMatching(/^(free|basic|pro|enterprise)$/),
      tierName: expect.any(String),
      limit: expect.any(Number),
      used: expect.any(Number),
      isUnlimited: expect.any(Boolean),
      isAtLimit: expect.any(Boolean),
      periodStart: expect.stringMatching(/\d{4}-\d{2}-\d{2}T/),
      periodEnd: expect.stringMatching(/\d{4}-\d{2}-\d{2}T/)
    })
  })

  test('POST /api/customer/tier updates subscription tier', async ({ request }) => {
    const updateData = {
      tier: 'pro',
      expiresAt: '2025-12-31T23:59:59.000Z'
    }

    const response = await request.post('/api/customer/tier', {
      data: updateData
    })

    expect(response.ok()).toBe(true)
    const result = await response.json()

    expect(result.success).toBe(true)
    expect(result.tier).toBe('pro')
    expect(result.tierName).toBe('Pro')
  })

  test('Invalid tier rejected by API', async ({ request }) => {
    const invalidData = {
      tier: 'invalid_tier',
      expiresAt: '2025-12-31T23:59:59.000Z'
    }

    const response = await request.post('/api/customer/tier', {
      data: invalidData
    })

    expect(response.status()).toBe(400)
    const result = await response.json()
    expect(result.error).toBe('Invalid subscription tier')
  })
})

// CEO Cat branding test 🐱
test('CEO cat branding visible in tier banners', async ({ page }) => {
  await page.fill('[data-testid="email-input"]', 'free.user@test.com')
  await page.fill('[data-testid="password-input"]', 'Test1234!')
  await page.click('[data-testid="login-button"]')

  await page.goto('/pros')
  await page.click('[data-testid="cleaner-card"]')
  await page.click('[data-testid="book-now-button"]')

  // Check that CEO cat branding is present
  await expect(page.locator('text=🐱')).toBeVisible()
  await expect(page.locator('text=Purrfection is our Standard')).toBeVisible()
})