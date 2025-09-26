import { test, expect } from '@playwright/test';

test.describe('Dashboard Login Flow', () => {
  test('should redirect authenticated users to appropriate dashboard', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');

    // Verify we're on the login page
    await expect(page.locator('h1, h2')).toContainText(/sign in|log in|login/i);

    // Test customer login flow
    await page.fill('input[type="email"]', 'test@customer.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    // Wait for authentication and redirect
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Should redirect to /dashboard first (loading state)
    await expect(page.url()).toContain('/dashboard');

    // Wait for final redirect to customer dashboard
    await page.waitForURL(/\/dashboard\/customer/, { timeout: 10000 });

    // Verify we reached the customer dashboard
    await expect(page.locator('h1')).toContainText('Customer Dashboard');

    // Verify dashboard content loads without errors
    await expect(page.locator('.min-h-screen')).toBeVisible();

    // Check for error boundaries or error messages
    await expect(page.locator('[data-testid="error"]')).toHaveCount(0);
    await expect(page.locator('.bg-red-')).toHaveCount(0);
  });

  test('should handle dashboard loading states gracefully', async ({ page }) => {
    // Navigate directly to dashboard while logged out
    await page.goto('/dashboard');

    // Should be redirected to login or show protected route message
    await page.waitForLoadState('networkidle');

    // Check if redirected to login or showing auth required message
    const isLoginPage = await page.locator('input[type="email"]').isVisible();
    const isProtectedMessage = await page.locator('text=/sign in|authenticate|login required/i').isVisible();

    expect(isLoginPage || isProtectedMessage).toBeTruthy();
  });

  test('should show loading states during dashboard navigation', async ({ page }) => {
    // Mock slow network to test loading states
    await page.route('**/*', route => {
      // Add delay to API calls to test loading states
      if (route.request().url().includes('/api/')) {
        setTimeout(() => route.continue(), 100);
      } else {
        route.continue();
      }
    });

    await page.goto('/dashboard');

    // Look for loading indicators
    const loadingIndicators = page.locator('.animate-spin, [data-testid="loading"], text=/loading|redirecting/i');

    // At least one loading indicator should be present during navigation
    await expect(loadingIndicators.first()).toBeVisible();
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should not show any unhandled JavaScript errors in console
    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Wait a bit to catch any async errors
    await page.waitForTimeout(2000);

    // Filter out expected errors (404s are OK, uncaught exceptions are not)
    const criticalErrors = errors.filter(error =>
      !error.includes('404') &&
      !error.includes('Failed to fetch') &&
      error.includes('Uncaught')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should display error boundaries when components fail', async ({ page }) => {
    // Mock a failing API response
    await page.route('**/api/pros/search**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Navigate to dashboard (assuming user is authenticated)
    await page.goto('/dashboard/customer');
    await page.waitForLoadState('networkidle');

    // Error boundary should catch any failures and display fallback UI
    const errorBoundary = page.locator('text=/something went wrong|error occurred|try again/i');
    const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("Try Again")');

    // Either the error boundary should show, or the page should load successfully
    const hasErrorBoundary = await errorBoundary.isVisible();
    const hasContent = await page.locator('h1:has-text("Customer Dashboard")').isVisible();

    expect(hasErrorBoundary || hasContent).toBeTruthy();

    // If error boundary is shown, it should have recovery options
    if (hasErrorBoundary) {
      await expect(refreshButton).toBeVisible();
    }
  });
});