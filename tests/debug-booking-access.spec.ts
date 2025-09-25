import { test, expect } from '@playwright/test';

test('debug booking access from customer dashboard', async ({ page }) => {
  console.log('=== DEBUG BOOKING ACCESS ===');

  // Enable detailed logging
  page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
  page.on('pageerror', error => console.log(`PAGE ERROR: ${error}`));

  // Step 1: Login
  console.log('1. Logging in');
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('[data-testid="email"]', 'free.user@test.com');
  await page.fill('[data-testid="password"]', 'Test1234!');
  await page.click('[data-testid="login-button"]');

  // Wait for redirect to customer dashboard
  await page.waitForURL(/\/dashboard\/customer/, { timeout: 10000 });
  console.log('Login successful, URL:', page.url());

  // Step 2: Look for booking history link on customer dashboard
  console.log('2. Looking for booking history link');

  // Wait for the page to fully load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Check if there's a link to booking history
  const bookingLinks = await page.locator('a[href*="booking"]').count();
  console.log('Found booking links:', bookingLinks);

  if (bookingLinks > 0) {
    const href = await page.locator('a[href*="booking"]').first().getAttribute('href');
    console.log('First booking link href:', href);

    // Click the booking link
    await page.locator('a[href*="booking"]').first().click();
    await page.waitForLoadState('networkidle');
    console.log('After clicking booking link, URL:', page.url());
  } else {
    console.log('No booking links found, trying direct navigation');
    // Try direct navigation
    await page.goto('/dashboard/booking');
    await page.waitForTimeout(3000);
    console.log('After direct navigation, URL:', page.url());
  }

  // Step 3: Check what's on the final page
  const title = await page.title();
  console.log('Final page title:', title);

  // Look for booking-related elements
  const bookingList = await page.locator('[data-testid="booking-history-list"]').count();
  console.log('Found booking-history-list elements:', bookingList);

  const pageContent = await page.textContent('body');
  console.log('Page contains "My Cleaning History":', pageContent?.includes('My Cleaning History'));
  console.log('Page contains "Purrfection":', pageContent?.includes('Purrfection'));

  // Take screenshot for debugging
  await page.screenshot({ path: 'debug-booking-access.png', fullPage: true });

  console.log('Debug complete - check debug-booking-access.png');
});