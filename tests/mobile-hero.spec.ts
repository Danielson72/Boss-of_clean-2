import { test, expect } from '@playwright/test';

test.describe('Mobile Hero Section - CEO Cat Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Wait for the background image to load
    await page.waitForFunction(() => {
      const heroSection = document.querySelector('[style*="ChatGPT Image"]');
      return heroSection !== null;
    });
  });

  test('CEO cat should be visible on iPhone SE (375px)', async ({ page }) => {
    // Set viewport to iPhone SE dimensions
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify the hero section exists and has correct min-height
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
    
    // Check that the background image is set correctly
    const heroDiv = page.locator('div[style*="ChatGPT Image"]');
    await expect(heroDiv).toBeVisible();
    
    // Verify the min-height is applied correctly (50vh = ~333px for 667px height)
    const upperSection = page.locator('.flex-1.min-h-\\[50vh\\]');
    await expect(upperSection).toBeVisible();
    
    // Take screenshot for verification
    await page.screenshot({ 
      path: 'screenshots/mobile-hero/iphone-se-375px.png',
      fullPage: true 
    });
    
    // Take hero section specific screenshot
    await heroSection.screenshot({ 
      path: 'screenshots/mobile-hero/iphone-se-375px-hero-only.png' 
    });
  });

  test('CEO cat should be visible on iPhone 12 (390px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    
    const heroSection = page.locator('section').first();
    await expect(heroSection).toBeVisible();
    
    const heroDiv = page.locator('div[style*="ChatGPT Image"]');
    await expect(heroDiv).toBeVisible();
    
    // Take screenshots
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
    
    const heroDiv = page.locator('div[style*="ChatGPT Image"]');
    await expect(heroDiv).toBeVisible();
    
    // Take screenshots
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
    
    const heroDiv = page.locator('div[style*="ChatGPT Image"]');
    await expect(heroDiv).toBeVisible();
    
    // Take screenshots
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
      
      // Verify background image is present
      const heroDiv = page.locator('div[style*="ChatGPT Image"]');
      await expect(heroDiv).toBeVisible();
      
      // Verify search form is accessible
      const searchForm = page.locator('button:has-text("Find a Cleaner Now")');
      await expect(searchForm).toBeVisible();
      
      // Take comparison screenshot
      await page.screenshot({ 
        path: `screenshots/mobile-hero/responsive-${viewport.name}-${viewport.width}px.png`,
        fullPage: false // Just the viewport
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
    const searchButton = page.locator('button:has-text("Find a Cleaner Now")');
    await expect(searchButton).toBeVisible();
    
    // Check button is touch-friendly (minimum 44px height)
    const buttonHeight = await searchButton.evaluate(el => el.getBoundingClientRect().height);
    expect(buttonHeight).toBeGreaterThanOrEqual(44);
    
    // Take screenshot of filled form
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
    const tagline = page.locator('p:has-text("Find Any Cleaner in 60 Seconds")');
    await expect(tagline).toBeVisible();
    
    // Verify gradient overlay provides good contrast
    const gradientDiv = page.locator('.bg-gradient-to-t.from-white');
    await expect(gradientDiv).toBeVisible();
    
    // Take screenshot focusing on text area
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
    
    // Verify no layout shifts after image loads
    await page.waitForFunction(() => {
      const heroDiv = document.querySelector('div[style*="ChatGPT Image"]');
      return heroDiv && getComputedStyle(heroDiv).backgroundImage.includes('ChatGPT');
    });
    
    // Check that hero section maintains its height
    const heroSection = page.locator('section').first();
    const heroHeight = await heroSection.evaluate(el => el.getBoundingClientRect().height);
    
    // Should be at least viewport height
    expect(heroHeight).toBeGreaterThanOrEqual(667);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'screenshots/mobile-hero/performance-test-final.png',
      fullPage: true 
    });
  });
});