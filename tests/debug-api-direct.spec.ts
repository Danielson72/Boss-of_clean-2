import { test, expect } from '@playwright/test';

test('debug API direct access', async ({ page }) => {
  console.log('=== DEBUG API DIRECT ACCESS ===');

  // Enable detailed logging
  page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
  page.on('pageerror', error => console.log(`PAGE ERROR: ${error}`));

  // Step 1: Login first to get auth cookie
  console.log('1. Logging in');
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('[data-testid="email"]', 'free.user@test.com');
  await page.fill('[data-testid="password"]', 'Test1234!');
  await page.click('[data-testid="login-button"]');

  // Wait for redirect
  await page.waitForURL(/\/dashboard\/customer/, { timeout: 10000 });
  console.log('Login successful');

  // Step 2: Test API endpoint directly
  console.log('2. Testing API endpoint directly');

  const apiResponse = await page.request.get('/api/history?limit=10');
  console.log('API Response status:', apiResponse.status());

  if (apiResponse.ok()) {
    const data = await apiResponse.json();
    console.log('API Response data:', JSON.stringify(data, null, 2));
  } else {
    const errorText = await apiResponse.text();
    console.log('API Error:', errorText);
  }

  // Step 3: Test page loading without navigation failures
  console.log('3. Loading booking page in iframe to avoid redirects');

  await page.evaluate(async () => {
    const iframe = document.createElement('iframe');
    iframe.src = '/dashboard/booking';
    iframe.style.width = '100%';
    iframe.style.height = '500px';
    document.body.appendChild(iframe);

    return new Promise((resolve) => {
      iframe.onload = () => {
        console.log('IFRAME: booking page loaded');
        resolve(true);
      };
      iframe.onerror = (error) => {
        console.log('IFRAME: booking page error', error);
        resolve(false);
      };
      // Timeout after 10 seconds
      setTimeout(() => {
        console.log('IFRAME: timeout loading booking page');
        resolve(false);
      }, 10000);
    });
  });

  await page.waitForTimeout(3000);

  // Take final screenshot
  await page.screenshot({ path: 'debug-api-direct.png', fullPage: true });
});