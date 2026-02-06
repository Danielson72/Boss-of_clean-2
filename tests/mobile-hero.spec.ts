import { test, expect } from '@playwright/test';

test.describe('Mobile Hero Section - CEO Cat Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the hero section and Next.js Image components to load
    // Hero images use <Image> with alt="Boss of Clean - Florida's #1 Cleaning Directory"
    await page.waitForFunction(() => {
      const imgs = document.querySelectorAll('img[alt*="Boss of Clean"]');
      return imgs.length > 0 && Array.from(imgs).some(
        img => (img as HTMLImageElement).complete
      );
    }, { timeout: 15000 });
  });

  test('CEO cat should be visible on iPhone SE (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify the hero section exists
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();

    // Check that a hero image is rendered and visible
    // On mobile (<640px), the mobile image container is visible
    await page.waitForFunction(() => {
      const imgs = document.querySelectorAll('img[alt*="Boss of Clean"]');
      return Array.from(imgs).some(img => {
        const rect = img.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    });

    // Verify the spacer div exists (min-h-[40vh] on mobile)
    const upperSection = page.locator('section').first().locator('.flex-1').first();
    await expect(upperSection).toBeVisible();

    await page.screenshot({
      path: 'screenshots/mobile-hero/iphone-se-375px.png',
      fullPage: true
    });

    await heroSection.screenshot({
      path: 'screenshots/mobile-hero/iphone-se-375px-hero-only.png'
    });
  });

  test('CEO cat should be visible on iPhone 12 (390px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();

    await page.waitForFunction(() => {
      const imgs = document.querySelectorAll('img[alt*="Boss of Clean"]');
      return Array.from(imgs).some(img => {
        const rect = img.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    });

    await page.screenshot({
      path: 'screenshots/mobile-hero/iphone-12-390px.png',
      fullPage: true
    });

    await heroSection.screenshot({
      path: 'screenshots/mobile-hero/iphone-12-390px-hero-only.png'
    });
  });

  test('CEO cat should be visible on iPhone 12 Pro Max (428px)', async ({ page }) => {
    await page.setViewportSize({ width: 428, height: 926 });

    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();

    await page.waitForFunction(() => {
      const imgs = document.querySelectorAll('img[alt*="Boss of Clean"]');
      return Array.from(imgs).some(img => {
        const rect = img.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    });

    await page.screenshot({
      path: 'screenshots/mobile-hero/iphone-12-pro-max-428px.png',
      fullPage: true
    });

    await heroSection.screenshot({
      path: 'screenshots/mobile-hero/iphone-12-pro-max-428px-hero-only.png'
    });
  });

  test('CEO cat should be visible on Samsung Galaxy S21 (360px)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });

    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();

    await page.waitForFunction(() => {
      const imgs = document.querySelectorAll('img[alt*="Boss of Clean"]');
      return Array.from(imgs).some(img => {
        const rect = img.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    });

    await page.screenshot({
      path: 'screenshots/mobile-hero/samsung-s21-360px.png',
      fullPage: true
    });

    await heroSection.screenshot({
      path: 'screenshots/mobile-hero/samsung-s21-360px-hero-only.png'
    });
  });

  test('Hero section responsive behavior across breakpoints', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568, name: 'small-mobile' },
      { width: 375, height: 667, name: 'iphone-se' },
      { width: 390, height: 844, name: 'iphone-12' },
      { width: 414, height: 896, name: 'large-mobile' },
      { width: 768, height: 1024, name: 'tablet' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      // Verify hero section is always visible
      const heroSection = page.locator('section').first();
      await expect(heroSection).toBeVisible();

      // Verify a hero image is rendered
      await page.waitForFunction(() => {
        const imgs = document.querySelectorAll('img[alt*="Boss of Clean"]');
        return Array.from(imgs).some(img => {
          const rect = img.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      });

      // Verify the main CTA button is accessible
      const searchButton = page.locator('button:has-text("Get Free Quotes Now")');
      await expect(searchButton).toBeVisible();

      await page.screenshot({
        path: `screenshots/mobile-hero/responsive-${viewport.name}-${viewport.width}px.png`,
        fullPage: false
      });
    }
  });

  test('Search form functionality on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Test service type dropdown
    const serviceSelect = page.locator('select').first();
    await expect(serviceSelect).toBeVisible();
    await serviceSelect.selectOption('House Cleaning');

    // Test ZIP code input
    const zipInput = page.locator('input[placeholder="Enter ZIP code"]');
    await expect(zipInput).toBeVisible();
    await zipInput.fill('32801');

    // Verify search button is accessible
    const searchButton = page.locator('button:has-text("Get Free Quotes Now")');
    await expect(searchButton).toBeVisible();

    // Check button is touch-friendly (minimum 44px height)
    const buttonHeight = await searchButton.evaluate(el => el.getBoundingClientRect().height);
    expect(buttonHeight).toBeGreaterThanOrEqual(44);

    await page.screenshot({
      path: 'screenshots/mobile-hero/mobile-search-form-filled.png',
      fullPage: false
    });
  });

  test('Hero text readability over background', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Check main title is visible
    const mainTitle = page.locator('h1:has-text("BOSS OF CLEAN")');
    await expect(mainTitle).toBeVisible();

    // Check subtitle is visible
    const subtitle = page.locator('h2:has-text("Florida\'s #1 Cleaning Directory")');
    await expect(subtitle).toBeVisible();

    // Check tagline is visible
    const tagline = page.locator('p:has-text("Find Any Cleaner in")');
    await expect(tagline).toBeVisible();

    // Verify gradient overlay div provides good contrast
    // The gradient has class bg-gradient-to-t (from-white/98 via-white/95 to-white/85)
    const gradientDiv = page.locator('.bg-gradient-to-t').first();
    await expect(gradientDiv).toBeVisible();

    await gradientDiv.screenshot({
      path: 'screenshots/mobile-hero/mobile-text-readability.png'
    });
  });

  test('Performance: Image loading and layout stability', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Measure page load performance
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Page load time: ${loadTime}ms`);

    // Verify hero image is loaded
    await page.waitForFunction(() => {
      const imgs = document.querySelectorAll('img[alt*="Boss of Clean"]');
      return imgs.length > 0 && Array.from(imgs).some(
        img => (img as HTMLImageElement).complete
      );
    }, { timeout: 15000 });

    // Check that hero section maintains its height
    // Hero has h-[78vh] which is ~78% of viewport height
    const heroSection = page.locator('section').first();
    const heroHeight = await heroSection.evaluate(el => el.getBoundingClientRect().height);

    // Should be at least 70% of viewport height (78vh with some tolerance)
    expect(heroHeight).toBeGreaterThanOrEqual(667 * 0.7);

    await page.screenshot({
      path: 'screenshots/mobile-hero/performance-test-final.png',
      fullPage: true
    });
  });
});
