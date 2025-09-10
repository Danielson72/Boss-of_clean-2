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
 * Navigate to the signup page and verify it loads
 */
export async function navigateToSignup(page: Page) {
  await page.goto('/signup')
  await expect(page).toHaveTitle(/Sign Up/)
  await expect(page.locator('h1, h2')).toContainText(/sign up/i)
}

/**
 * Navigate to the login page and verify it loads
 */
export async function navigateToLogin(page: Page) {
  await page.goto('/login')
  await expect(page).toHaveTitle(/Login|Sign In/)
  await expect(page.locator('h1, h2')).toContainText(/sign in|login/i)
}

/**
 * Fill and submit the signup form
 */
export async function signupUser(page: Page, user: TestUser) {
  // Fill signup form
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  
  // Submit form
  await page.click('button[type="submit"]')
}

/**
 * Fill and submit the login form
 */
export async function loginUser(page: Page, user: TestUser) {
  // Fill login form
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  
  // Submit form
  await page.click('button[type="submit"]')
}

/**
 * Wait for redirect to customer dashboard and verify elements
 */
export async function waitForCustomerDashboard(page: Page) {
  // Wait for navigation to dashboard
  await page.waitForURL(/\/dashboard\/customer/)
  
  // Verify dashboard elements
  await expect(page).toHaveTitle(/Customer Dashboard/)
  await expect(page.locator('h1, h2')).toContainText(/dashboard|customer/i)
}

/**
 * Perform logout action
 */
export async function logoutUser(page: Page) {
  // Look for logout button/link
  const logoutButton = page.locator('[data-testid="logout"], button:has-text("Sign Out"), a:has-text("Sign Out")')
  
  // If not found, try avatar dropdown menu
  if (!(await logoutButton.isVisible())) {
    // Click avatar to open dropdown
    await page.click('[data-testid="user-avatar"], button[role="button"]:has([data-testid="avatar"])')
    
    // Wait for dropdown and click logout
    await page.click('[data-testid="logout"], button:has-text("Sign out"), [role="menuitem"]:has-text("Sign out")')
  } else {
    await logoutButton.click()
  }
}

/**
 * Verify user is on homepage and logged out
 */
export async function verifyLoggedOut(page: Page) {
  // Wait for redirect to home
  await page.waitForURL('/')
  
  // Verify we're on homepage
  await expect(page).toHaveTitle(/Boss of Clean|BOSS OF CLEAN/)
  
  // Verify login/signup links are visible (indicating logged out state)
  await expect(page.locator('a:has-text("Sign In"), a:has-text("Login")')).toBeVisible()
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
  await expect(page).toHaveTitle(/Boss of Clean|BOSS OF CLEAN/)
  
  // Check for main branding/logo
  await expect(page.locator('text=BOSS OF CLEAN, text=Boss of Clean')).toBeVisible()
  
  // Check for navigation elements
  await expect(page.locator('nav')).toBeVisible()
}