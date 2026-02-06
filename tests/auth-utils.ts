import { Page, expect } from '@playwright/test'

export interface TestUser {
  email: string
  password: string
}

/**
 * Generate a unique test email address
 */
export function generateTestEmail(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `test-user-${timestamp}-${random}@playwright-test.com`
}

/**
 * Create a test user with default credentials
 */
export function createTestUser(): TestUser {
  return {
    email: generateTestEmail(),
    password: 'testpassword123'
  }
}

/**
 * Wait for auth state to settle.
 * The Header hides Login/Sign Up links while useAuth() is loading.
 * This waits until auth-dependent links appear in the nav.
 */
export async function waitForAuthReady(page: Page) {
  await page.waitForFunction(() => {
    const links = document.querySelectorAll('header a, header button')
    return Array.from(links).some(
      el => el.textContent?.trim() === 'Login' || el.textContent?.trim() === 'Dashboard'
    )
  }, { timeout: 10000 })
}

/**
 * Navigate to the signup page and verify it loads
 */
export async function navigateToSignup(page: Page) {
  await page.goto('/signup')
  // Page title: "Sign Up | Boss of Clean"
  await expect(page).toHaveTitle(/Sign Up/)
  // CardTitle renders as <h3> with text "Create Account"
  await expect(page.locator('h3:has-text("Create Account")')).toBeVisible()
}

/**
 * Navigate to the login page and verify it loads
 */
export async function navigateToLogin(page: Page) {
  await page.goto('/login')
  // Page title: "Sign In | Boss of Clean"
  await expect(page).toHaveTitle(/Sign In/)
  // CardTitle renders as <h3> with text "Sign In"
  await expect(page.locator('h3:has-text("Sign In")')).toBeVisible()
}

/**
 * Fill and submit the signup form
 */
export async function signupUser(page: Page, user: TestUser) {
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  await page.click('button[type="submit"]')
}

/**
 * Fill and submit the login form
 */
export async function loginUser(page: Page, user: TestUser) {
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  await page.click('button[type="submit"]')
}

/**
 * Wait for redirect to customer dashboard and verify elements
 */
export async function waitForCustomerDashboard(page: Page) {
  await page.waitForURL(/\/dashboard\/customer/)
  await expect(page).toHaveTitle(/Customer Dashboard/)
  await expect(page.locator('h1, h2')).toContainText(/dashboard|customer/i)
}

/**
 * Perform logout action
 */
export async function logoutUser(page: Page) {
  // Header.tsx uses "Logout" as button text
  const logoutButton = page.locator('button:has-text("Logout")')
  await logoutButton.click()
}

/**
 * Verify user is on homepage and logged out
 */
export async function verifyLoggedOut(page: Page) {
  await page.waitForURL('/')
  await expect(page).toHaveTitle(/Boss of Clean/)
  await waitForAuthReady(page)
  await expect(page.locator('a:has-text("Login")')).toBeVisible()
  await expect(page.locator('a:has-text("Sign Up")')).toBeVisible()
}

/**
 * Wait for any loading states to complete
 */
export async function waitForPageLoad(page: Page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Verify homepage loads correctly
 */
export async function verifyHomepage(page: Page) {
  await page.goto('/')
  await expect(page).toHaveTitle(/Boss of Clean/)
  // Header logo contains "BOSS OF CLEAN" - use header scope to avoid strict mode
  await expect(page.locator('header').locator('text=BOSS OF CLEAN')).toBeVisible()
  // Scope to header nav to avoid matching footer nav
  await expect(page.locator('header nav')).toBeVisible()
}
