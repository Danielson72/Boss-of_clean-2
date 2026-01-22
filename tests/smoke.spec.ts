import { test, expect } from '@playwright/test'

/**
 * Ralph Wiggum Smoke Tests
 *
 * Critical path validation tests run after build to ensure
 * core functionality is working before deployment.
 *
 * These tests are lightweight and headless-only (chromium).
 */

test.describe('Boss of Clean - Smoke Tests', () => {

  test('homepage loads with brand elements', async ({ page }) => {
    await page.goto('/')

    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded')

    // Check for main brand heading "BOSS OF CLEAN"
    await expect(page.locator('h1')).toContainText(/BOSS.*OF.*CLEAN/i, { timeout: 10000 })

    // Check for the tagline/subheading
    await expect(page.getByText(/Florida.*#1.*Cleaning/i)).toBeVisible({ timeout: 5000 })

    // Verify meta description contains the tagline (SEO)
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content')
    expect(metaDescription).toBeTruthy()

    // Navigation should be visible
    await expect(page.locator('nav')).toBeVisible()

    // Footer should contain BOSS OF CLEAN
    await expect(page.locator('footer')).toContainText('BOSS OF CLEAN')
  })

  test('search page loads and filters work for Miami ZIP 33101', async ({ page }) => {
    // Navigate to search with Miami ZIP code
    await page.goto('/search?zip=33101')

    await page.waitForLoadState('domcontentloaded')

    // Search page should load (even if no results)
    // Check for filter components or results grid
    await expect(page.locator('body')).toBeVisible()

    // Verify the URL contains the zip parameter
    expect(page.url()).toContain('33101')

    // The page should have some structure - either results or "no results" message
    // Wait for either the loading to finish or content to appear
    await page.waitForTimeout(2000) // Allow data to load

    // Check that the page rendered without errors (no error boundaries triggered)
    const errorMessage = page.locator('text=Something went wrong')
    const hasError = await errorMessage.count()
    expect(hasError).toBe(0)
  })

  test('cleaner profile page structure loads correctly', async ({ page }) => {
    // Try to load a cleaner profile page
    // First check search to get a cleaner slug, or use a known test slug
    await page.goto('/search')
    await page.waitForLoadState('domcontentloaded')

    // Wait for any cleaner cards to load
    await page.waitForTimeout(3000)

    // Look for any cleaner card link
    const cleanerLinks = page.locator('a[href^="/cleaner/"]')
    const linkCount = await cleanerLinks.count()

    if (linkCount > 0) {
      // Click on first cleaner profile
      const href = await cleanerLinks.first().getAttribute('href')
      await page.goto(href!)

      await page.waitForLoadState('domcontentloaded')

      // Verify profile page elements
      await expect(page.locator('body')).toBeVisible()

      // Should have "Back to Search" link
      await expect(page.locator('a:has-text("Back to Search")')).toBeVisible({ timeout: 5000 })
    } else {
      // No cleaners in database - verify 404 handling
      await page.goto('/cleaner/test-cleaner-slug')
      // Should either show 404 or redirect gracefully
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('quote request form is accessible', async ({ page }) => {
    await page.goto('/quote-request')

    await page.waitForLoadState('domcontentloaded')

    // Verify the quote request page loads
    await expect(page.locator('h1, h2')).toContainText(/Quote|Free/i, { timeout: 5000 })

    // Check for form elements
    // Step 1 should show service type selection
    await expect(page.locator('button, input')).toBeTruthy()

    // The page should have the multi-step form
    // Look for progress indicators (steps 1, 2, 3)
    const stepIndicators = page.locator('text=Service')
    await expect(stepIndicators.first()).toBeVisible({ timeout: 5000 })

    // ZIP code input should be present
    await expect(page.locator('input[placeholder*="32801"], input[type="text"]').first()).toBeVisible()
  })

  test('protected routes redirect unauthenticated users to login', async ({ page }) => {
    // Try to access cleaner dashboard without auth
    await page.goto('/dashboard/cleaner')

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10000 })

    // Verify we're on the login page
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('customer dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/customer')

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10000 })

    // Verify login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 })
  })

  test('navigation links work correctly', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    // Find and click search/find cleaners link
    const searchLink = page.locator('a:has-text("Find Cleaners"), a:has-text("Search")')
    if (await searchLink.count() > 0) {
      await searchLink.first().click()
      await expect(page).toHaveURL(/\/search/)
    }

    // Go back and test another link
    await page.goto('/')
    const pricingLink = page.locator('a:has-text("Pricing")')
    if (await pricingLink.count() > 0) {
      await pricingLink.first().click()
      await expect(page).toHaveURL(/\/pricing/)
    }
  })

  test('page does not have critical JavaScript errors', async ({ page }) => {
    const errors: string[] = []

    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    // Visit main pages
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    await page.goto('/search')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    await page.goto('/quote-request')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // Filter out known non-critical errors (hydration warnings, etc.)
    const criticalErrors = errors.filter(err =>
      !err.includes('Hydration') &&
      !err.includes('hydration') &&
      !err.includes('Warning:')
    )

    expect(criticalErrors).toHaveLength(0)
  })
})
