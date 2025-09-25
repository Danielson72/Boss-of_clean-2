import { test, expect } from '@playwright/test';

test('comprehensive authentication flow debug', async ({ page }) => {
  // Enable detailed logging
  page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
  page.on('pageerror', error => console.log(`PAGE ERROR: ${error}`));

  console.log('=== STARTING COMPREHENSIVE AUTH DEBUG ===');

  // Step 1: Go to login page
  console.log('Step 1: Navigating to login page');
  await page.goto('http://localhost:3002/login');
  await page.waitForLoadState('networkidle');

  console.log('Login page loaded, URL:', page.url());

  // Step 2: Fill credentials
  console.log('Step 2: Filling login credentials');
  await page.fill('[data-testid="email"]', 'free.user@test.com');
  await page.fill('[data-testid="password"]', 'Test1234!');

  // Step 3: Monitor network requests
  const authRequests: any[] = [];
  const apiRequests: any[] = [];

  page.on('request', request => {
    const url = request.url();
    if (url.includes('auth/v1/token') || url.includes('signin') || url.includes('signInWithPassword')) {
      authRequests.push({ url, method: request.method() });
      console.log(`AUTH REQUEST: ${request.method()} ${url}`);
    }
    if (url.includes('/api/')) {
      apiRequests.push({ url, method: request.method() });
      console.log(`API REQUEST: ${request.method()} ${url}`);
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('auth/v1/token') || url.includes('signin') || url.includes('signInWithPassword')) {
      const status = response.status();
      console.log(`AUTH RESPONSE: ${status} ${url}`);
      if (status !== 200) {
        try {
          const text = await response.text();
          console.log(`AUTH ERROR BODY: ${text}`);
        } catch (e) {
          console.log('Could not read auth error response body');
        }
      }
    }
  });

  // Step 4: Submit login form
  console.log('Step 3: Submitting login form');
  await page.click('[data-testid="login-button"]');

  // Wait for any auth requests to complete
  await page.waitForTimeout(3000);

  console.log('Auth requests made:', authRequests.length);
  console.log('API requests made:', apiRequests.length);

  // Step 4: Check current URL after login attempt
  const urlAfterLogin = page.url();
  console.log('URL after login attempt:', urlAfterLogin);

  // Step 5: Check for auth state in browser
  const authState = await page.evaluate(() => {
    // Check localStorage for any Supabase session data
    const keys = Object.keys(localStorage);
    const supabaseKeys = keys.filter(key => key.includes('supabase'));

    return {
      localStorageKeys: supabaseKeys,
      hasSupabaseSession: supabaseKeys.some(key => {
        const value = localStorage.getItem(key);
        return value && value.includes('access_token');
      }),
      cookies: document.cookie
    };
  });

  console.log('Browser auth state:', JSON.stringify(authState, null, 2));

  // Step 6: Try direct navigation to dashboard
  console.log('Step 6: Testing direct dashboard navigation');
  await page.goto('http://localhost:3002/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const dashboardUrl = page.url();
  console.log('Dashboard navigation result:', dashboardUrl);

  // Step 7: Check for any error messages
  const errorElements = await page.locator('.text-red-700, .text-red-600, .text-red-500, [role="alert"]').all();
  if (errorElements.length > 0) {
    console.log('Found error elements:');
    for (const el of errorElements) {
      const text = await el.textContent();
      console.log(`ERROR: ${text}`);
    }
  }

  // Step 8: Check auth context state if accessible
  const contextState = await page.evaluate(() => {
    return new Promise((resolve) => {
      // Try to access React DevTools global if available
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        resolve('React DevTools detected');
      } else {
        resolve('No React DevTools');
      }
    });
  });

  console.log('React context state:', contextState);

  // Final assessment
  console.log('=== FINAL ASSESSMENT ===');
  console.log(`Authentication successful: ${authRequests.length > 0 && !dashboardUrl.includes('/login')}`);
  console.log(`Session persisted: ${authState.hasSupabaseSession}`);
  console.log(`Dashboard accessible: ${!dashboardUrl.includes('/login')}`);
  console.log('=== END DEBUG ===');

  await page.screenshot({ path: 'comprehensive-auth-debug.png', fullPage: true });
});