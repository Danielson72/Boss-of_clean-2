import { test, expect } from '@playwright/test';

test('debug login', async ({ page }) => {
  await page.goto('http://localhost:3002/login');
  await page.screenshot({ path: 'login-page.png' });

  console.log('Page title:', await page.title());
  console.log('Page URL:', page.url());

  // Fill login form with new test user from boc-foundation-agent
  await page.fill('[data-testid="email"]', 'free.user@test.com');
  await page.fill('[data-testid="password"]', 'Test1234!');

  await page.screenshot({ path: 'before-login.png' });

  // Click login
  await page.click('[data-testid="login-button"]');

  // Wait for navigation or error
  try {
    await page.waitForURL('/dashboard', { timeout: 10000 });
    console.log('SUCCESS: Redirected to dashboard');
  } catch (e) {
    console.log('No redirect to dashboard, checking for errors...');
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'after-login.png' });

  console.log('After login URL:', page.url());

  // Check for error messages
  const errorElement = page.locator('.text-red-700, .text-red-600, .text-red-500');
  if (await errorElement.count() > 0) {
    const errorText = await errorElement.first().textContent();
    console.log('Error message:', errorText);
  }

  // Try navigating directly to dashboard to test auth state
  console.log('Testing direct navigation to dashboard...');
  await page.goto('http://localhost:3002/dashboard');
  await page.waitForTimeout(2000);

  const dashboardUrl = page.url();
  console.log('Dashboard URL:', dashboardUrl);

  if (dashboardUrl.includes('/dashboard')) {
    console.log('SUCCESS: Authentication working, can access dashboard');
  } else if (dashboardUrl.includes('/login')) {
    console.log('FAILED: Still redirected to login, authentication not persisting');
  }

  await page.screenshot({ path: 'dashboard-test.png' });
});