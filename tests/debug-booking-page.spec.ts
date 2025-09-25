import { test, expect } from '@playwright/test';

test('debug booking page loading', async ({ page }) => {
  console.log('=== DEBUG BOOKING PAGE LOADING ===');

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

  // Wait for redirect
  await page.waitForURL(/\/dashboard\/customer/, { timeout: 10000 });
  console.log('Login successful, URL:', page.url());

  // Step 2: Navigate to booking page
  console.log('2. Navigating to booking page');
  await page.goto('/dashboard/booking');
  await page.waitForLoadState('networkidle');
  console.log('After navigation, URL:', page.url());

  // Step 3: Check for elements step by step
  console.log('3. Checking for page elements');

  // Check if page title loads
  const title = await page.title();
  console.log('Page title:', title);

  // Check if header loads
  const headerText = await page.locator('h1').textContent().catch(() => 'Header not found');
  console.log('Header text:', headerText);

  // Check for CEO cat branding
  const catBranding = await page.locator('text=Purrfection is our Standard').count();
  console.log('CEO cat branding found:', catBranding > 0 ? 'YES' : 'NO');

  // Check for loading indicator
  const loadingIndicator = await page.locator('[data-testid="loading-indicator"]').count();
  console.log('Loading indicator count:', loadingIndicator);

  // Check for error message
  const errorMessage = await page.locator('[data-testid="error-message"]').count();
  console.log('Error message count:', errorMessage);

  // Check if booking-history-list div exists (should always be there)
  const historyListDiv = await page.locator('[data-testid="booking-history-list"]').count();
  console.log('booking-history-list div count:', historyListDiv);

  // Wait longer to see if it appears
  console.log('4. Waiting 5 seconds for content to load');
  await page.waitForTimeout(5000);

  // Check again for actual booking items
  const bookingItems = await page.locator('[data-testid^="booking-item-"]').count();
  console.log('Booking items count after wait:', bookingItems);

  // Check if any network requests failed
  const failedRequests: string[] = [];
  page.on('requestfailed', request => {
    failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });

  // Manually test API call
  console.log('5. Testing API call manually');
  const apiResponse = await page.request.get('/api/history?limit=5');
  console.log('API Response status:', apiResponse.status());

  if (apiResponse.ok()) {
    const data = await apiResponse.json();
    console.log('API Response bookings count:', data.bookings?.length || 0);
    console.log('API Response total:', data.pagination?.total || 0);
  } else {
    const errorText = await apiResponse.text();
    console.log('API Error:', errorText);
  }

  // Take final screenshot
  await page.screenshot({ path: 'debug-booking-page.png', fullPage: true });
  console.log('Debug complete - check debug-booking-page.png');
});