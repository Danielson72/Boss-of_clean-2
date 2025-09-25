import { test, expect } from '@playwright/test';

test('debug booking history auth', async ({ page }) => {
  console.log('=== DEBUG BOOKING AUTH ===');

  // Enable detailed logging
  page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
  page.on('pageerror', error => console.log(`PAGE ERROR: ${error}`));

  // Step 1: Navigate to login
  console.log('1. Navigating to login page');
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  console.log('Login page URL:', page.url());

  // Step 2: Fill form and submit
  console.log('2. Filling login form');
  await page.fill('[data-testid="email"]', 'free.user@test.com');
  await page.fill('[data-testid="password"]', 'Test1234!');

  // Wait a bit to ensure form is ready
  await page.waitForTimeout(1000);

  // Monitor network for auth requests
  const authRequests: any[] = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('auth/v1/token')) {
      authRequests.push({ url, method: request.method() });
      console.log(`AUTH REQUEST: ${request.method()} ${url}`);
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('auth/v1/token')) {
      console.log(`AUTH RESPONSE: ${response.status()} ${url}`);
    }
  });

  console.log('3. Clicking login button');
  await page.click('[data-testid="login-button"]');

  // Wait a bit for any requests
  await page.waitForTimeout(3000);

  console.log('4. Current URL after login:', page.url());
  console.log('5. Auth requests made:', authRequests.length);

  // Check if we're on dashboard
  if (page.url().includes('/dashboard')) {
    console.log('SUCCESS: Redirected to dashboard');
  } else {
    console.log('ISSUE: Still on login page');

    // Check for any error messages
    const errorEl = page.locator('[role="alert"], .text-red-700, .text-red-600');
    if (await errorEl.count() > 0) {
      const errorText = await errorEl.first().textContent();
      console.log('Error message:', errorText);
    }
  }

  // Take screenshot for debugging
  await page.screenshot({ path: 'debug-booking-auth.png', fullPage: true });
});