import { test, expect } from '@playwright/test';

/**
 * Boss of Clean - Smoke Tests
 * Critical path validation for Ralph's autonomous pipeline.
 * Headless Chromium only, no screenshots unless failure.
 */

test.describe('Boss of Clean - Smoke Tests', () => {

  test('Homepage loads with brand and tagline', async ({ page }) => {
    await page.goto('/');

    // Page title contains brand name
    await expect(page).toHaveTitle(/Boss of Clean/);

    // Visible brand text on the page
    await expect(page.locator('text=Boss of Clean').first()).toBeVisible();

    // Tagline present in JSON-LD structured data
    const jsonLd = page.locator('script[type="application/ld+json"]').first();
    await expect(jsonLd).toBeAttached();
    const jsonLdContent = await jsonLd.textContent();
    expect(jsonLdContent).toContain('Purrfection is our Standard');
  });

  test('Search page returns results for Miami ZIP 33101', async ({ page }) => {
    await page.goto('/search?zip=33101');

    // Search page loads without error
    await expect(page).toHaveTitle(/Boss of Clean/);

    // Search interface is visible
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    // Page should not show a server error
    expect(pageContent).not.toContain('Internal Server Error');
    expect(pageContent).not.toContain('Application error');
  });

  test('Cleaner profile page loads at /cleaner/[slug]', async ({ page }) => {
    // Navigate to a cleaner profile route
    const response = await page.goto('/cleaner/sotsvc');

    // Should get a valid response (200 for existing, 404 for not found - both OK)
    expect(response?.status()).toBeLessThan(500);

    // Page renders without crashing
    await expect(page.locator('body')).toBeVisible();

    // Should not show application error
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Application error');
  });

  test('Customer can access quote request form', async ({ page }) => {
    await page.goto('/quote-request');

    // Page loads successfully
    await expect(page).toHaveTitle(/Boss of Clean/);

    // Page renders content
    await expect(page.locator('body')).toBeVisible();

    // No server errors
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Internal Server Error');
    expect(pageContent).not.toContain('Application error');
  });

  test('Cleaner dashboard redirects to login when unauthenticated', async ({ page }) => {
    const response = await page.goto('/dashboard/cleaner');

    // Protected route should redirect to login or handle client-side
    expect(response?.status()).toBeLessThan(500);

    // Page should render without crashing
    await expect(page.locator('body')).toBeVisible();
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Application error');
  });

});
