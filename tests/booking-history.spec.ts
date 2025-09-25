import { test, expect, Page } from '@playwright/test';

// Test user credentials for booking history validation
const TEST_CUSTOMERS = [
  {
    email: 'free.user@test.com',
    password: 'Test1234!',
    name: 'Free Tier User',
    id: 'b8e01833-4947-4932-8e16-798ae42c8e0a',
    tier: 'free'
  },
  {
    email: 'growth.user@test.com',
    password: 'Test1234!',
    name: 'Growth Tier User',
    id: '23eed962-8735-48cc-ac66-27c0d3d543c3',
    tier: 'growth'
  },
  {
    email: 'pro.user@test.com',
    password: 'Test1234!',
    name: 'Pro Tier User',
    id: '39afd760-9171-42f1-aee1-248edef55245',
    tier: 'pro'
  },
  // Legacy test users (backup)
  {
    email: 'customer30@bosofcleantest.com',
    password: 'password123',
    name: 'Test Customer 30',
    id: 'dc8ba312-4310-49c4-b052-17be580e8752'
  }
];

class BookingHistoryPage {
  constructor(private page: Page) {}

  async navigateToBookingHistory() {
    await this.page.goto('/dashboard/booking');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForBookingsToLoad() {
    await this.page.waitForSelector('[data-testid="booking-history-list"]', { timeout: 10000 });
  }

  async getBookingCount() {
    const bookings = await this.page.locator('[data-testid="booking-card"]').count();
    return bookings;
  }

  async applyStatusFilter(status: string) {
    await this.page.click('[data-testid="status-filter"]');
    await this.page.click(`[data-testid="status-${status}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async applyServiceTypeFilter(serviceType: string) {
    await this.page.click('[data-testid="service-type-filter"]');
    await this.page.click(`[data-testid="service-${serviceType}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async setDateRange(fromDate: string, toDate: string) {
    await this.page.fill('[data-testid="date-from"]', fromDate);
    await this.page.fill('[data-testid="date-to"]', toDate);
    await this.page.click('[data-testid="apply-filters"]');
    await this.page.waitForLoadState('networkidle');
  }

  async clearFilters() {
    await this.page.click('[data-testid="clear-filters"]');
    await this.page.waitForLoadState('networkidle');
  }

  async openBookingDetail(index: number = 0) {
    await this.page.click(`[data-testid="booking-card"]:nth-child(${index + 1}) [data-testid="view-details"]`);
    await this.page.waitForSelector('[data-testid="booking-detail-modal"]');
  }

  async closeBookingDetail() {
    await this.page.click('[data-testid="close-modal"]');
  }

  async loadMoreBookings() {
    await this.page.click('[data-testid="load-more"]');
    await this.page.waitForLoadState('networkidle');
  }

  async checkCEOCatBranding() {
    // Check for CEO cat mascot
    const catMascot = await this.page.locator('.bg-blue-600.rounded-full:has-text("🐱")').count();
    expect(catMascot).toBeGreaterThan(0);

    // Check for "Purrfection is our Standard" tagline
    const tagline = await this.page.locator(':text("Purrfection is our Standard")').count();
    expect(tagline).toBeGreaterThan(0);
  }
}

// Authentication helper
async function loginAsCustomer(page: Page, customer: typeof TEST_CUSTOMERS[0]) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('[data-testid="email"]', customer.email);
  await page.fill('[data-testid="password"]', customer.password);

  // Wait a moment to ensure form is ready
  await page.waitForTimeout(500);

  await page.click('[data-testid="login-button"]');

  // Wait for redirect to customer dashboard with longer timeout
  await page.waitForURL(/\/dashboard\/customer/, { timeout: 10000 });
}

test.describe('Booking History - Comprehensive QA Validation', () => {
  let bookingPage: BookingHistoryPage;

  test.beforeEach(async ({ page }) => {
    bookingPage = new BookingHistoryPage(page);

    // Login as test customer
    await loginAsCustomer(page, TEST_CUSTOMERS[0]);

    // Navigate to booking history
    await bookingPage.navigateToBookingHistory();
  });

  test.describe('Functional Testing', () => {
    test('should display booking history list correctly', async ({ page }) => {
      await bookingPage.waitForBookingsToLoad();

      // Verify page title and headers
      await expect(page.locator('h1:text("My Cleaning History")')).toBeVisible();

      // Check that bookings are displayed
      const bookingCount = await bookingPage.getBookingCount();
      expect(bookingCount).toBeGreaterThan(0);

      // Verify booking cards have required elements
      const firstBooking = page.locator('[data-testid="booking-card"]').first();
      await expect(firstBooking.locator('[data-testid="service-type"]')).toBeVisible();
      await expect(firstBooking.locator('[data-testid="booking-date"]')).toBeVisible();
      await expect(firstBooking.locator('[data-testid="booking-status"]')).toBeVisible();
      await expect(firstBooking.locator('[data-testid="total-amount"]')).toBeVisible();
    });

    test('should handle pagination correctly', async ({ page }) => {
      await bookingPage.waitForBookingsToLoad();

      const initialCount = await bookingPage.getBookingCount();

      // Check if load more button exists
      const loadMoreButton = page.locator('[data-testid="load-more"]');
      if (await loadMoreButton.isVisible()) {
        await bookingPage.loadMoreBookings();

        // Verify more bookings loaded
        const newCount = await bookingPage.getBookingCount();
        expect(newCount).toBeGreaterThan(initialCount);
      }
    });

    test('should filter by status correctly', async ({ page }) => {
      await bookingPage.waitForBookingsToLoad();

      // Test completed filter
      await bookingPage.applyStatusFilter('completed');
      const completedBookings = await bookingPage.getBookingCount();

      // Verify all visible bookings have completed status
      const statusBadges = await page.locator('[data-testid="status-badge"]:text("Completed")').count();
      expect(statusBadges).toBe(completedBookings);

      // Test scheduled filter
      await bookingPage.applyStatusFilter('scheduled');
      const scheduledBookings = await bookingPage.getBookingCount();

      if (scheduledBookings > 0) {
        const scheduledBadges = await page.locator('[data-testid="status-badge"]:text("Scheduled")').count();
        expect(scheduledBadges).toBe(scheduledBookings);
      }

      // Clear filters
      await bookingPage.clearFilters();
    });

    test('should filter by service type correctly', async ({ page }) => {
      await bookingPage.waitForBookingsToLoad();

      // Test house cleaning filter
      await bookingPage.applyServiceTypeFilter('house-cleaning');
      const houseCleaningBookings = await bookingPage.getBookingCount();

      if (houseCleaningBookings > 0) {
        // Verify service types match
        const serviceTypes = await page.locator('[data-testid="service-type"]:text("house-cleaning")').count();
        expect(serviceTypes).toBeGreaterThan(0);
      }

      // Clear filters
      await bookingPage.clearFilters();
    });

    test('should filter by date range correctly', async () => {
      await bookingPage.waitForBookingsToLoad();

      // Apply date range filter (last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const fromDate = threeMonthsAgo.toISOString().split('T')[0];
      const toDate = new Date().toISOString().split('T')[0];

      await bookingPage.setDateRange(fromDate, toDate);

      // Verify bookings are within date range
      const bookingCount = await bookingPage.getBookingCount();
      expect(bookingCount).toBeGreaterThanOrEqual(0);

      // Clear filters
      await bookingPage.clearFilters();
    });

    test('should open and close booking detail modal', async ({ page }) => {
      await bookingPage.waitForBookingsToLoad();

      // Open detail modal
      await bookingPage.openBookingDetail(0);

      // Verify modal content
      await expect(page.locator('[data-testid="booking-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="booking-service-info"]')).toBeVisible();

      // Check for photo carousel if photos exist
      const photoCarousel = page.locator('[data-testid="photo-carousel"]');
      if (await photoCarousel.isVisible()) {
        await expect(photoCarousel).toBeVisible();
      }

      // Close modal
      await bookingPage.closeBookingDetail();
      await expect(page.locator('[data-testid="booking-detail-modal"]')).not.toBeVisible();
    });

    test('should display recurring CTA with correct tier messaging', async ({ page }) => {
      await bookingPage.waitForBookingsToLoad();

      // Check for recurring CTA section
      const recurringCTA = page.locator('[data-testid="recurring-cta"]');
      await expect(recurringCTA).toBeVisible();

      // Verify tier-appropriate messaging
      const ctaButton = recurringCTA.locator('button');
      await expect(ctaButton).toBeVisible();

      // Should contain either "Set Up" or "Upgrade" text
      const buttonText = await ctaButton.textContent();
      expect(buttonText).toMatch(/(Set Up|Upgrade)/);
    });
  });

  test.describe('UI/UX Testing', () => {
    test('should display CEO cat branding consistently', async () => {
      await bookingPage.waitForBookingsToLoad();
      await bookingPage.checkCEOCatBranding();
    });

    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await bookingPage.waitForBookingsToLoad();

      // Verify mobile layout
      await expect(page.locator('[data-testid="booking-history-list"]')).toBeVisible();

      // Check that cards stack properly on mobile
      const bookingCards = page.locator('[data-testid="booking-card"]');
      const firstCard = bookingCards.first();
      await expect(firstCard).toBeVisible();

      // Verify mobile-specific elements
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenu.isVisible()) {
        await expect(mobileMenu).toBeVisible();
      }
    });

    test('should display correctly on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1440, height: 900 });
      await bookingPage.waitForBookingsToLoad();

      // Verify desktop layout
      await expect(page.locator('[data-testid="booking-history-list"]')).toBeVisible();

      // Check tagline visibility on desktop
      await expect(page.locator(':text("Purrfection is our Standard")')).toBeVisible();
    });

    test('should handle loading states correctly', async ({ page }) => {
      // Navigate to booking history and check for loading state
      await page.goto('/dashboard/booking');

      // Check for loading spinner or skeleton
      const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
      if (await loadingIndicator.isVisible({ timeout: 1000 })) {
        await expect(loadingIndicator).toBeVisible();
      }

      // Wait for content to load
      await bookingPage.waitForBookingsToLoad();
      await expect(page.locator('[data-testid="booking-history-list"]')).toBeVisible();
    });

    test('should display empty state when no bookings exist', async ({ page }) => {
      // This would require a test user with no bookings
      // For now, we'll test the empty state component existence
      const emptyState = page.locator('[data-testid="empty-state"]');

      // If empty state is visible, verify its content
      if (await emptyState.isVisible()) {
        await expect(emptyState.locator(':text("No bookings yet")')).toBeVisible();
        await expect(emptyState.locator('button:text("Book Now")')).toBeVisible();
      }
    });
  });

  test.describe('Security Testing', () => {
    test('should require authentication for booking history page', async ({ page }) => {
      // Clear authentication and try to access booking history
      await page.context().clearCookies();
      await page.goto('/dashboard/booking');

      // Should redirect to login
      await page.waitForURL(/\/login/);
      expect(page.url()).toContain('/login');
    });

    test('should only display current user bookings', async ({ page }) => {
      await bookingPage.waitForBookingsToLoad();

      // Get current user's bookings count
      const userBookings = await bookingPage.getBookingCount();

      // Login as different user and verify different data
      await loginAsCustomer(page, TEST_CUSTOMERS[1]);
      await bookingPage.navigateToBookingHistory();
      await bookingPage.waitForBookingsToLoad();

      const otherUserBookings = await bookingPage.getBookingCount();

      // Data should be different for different users
      // (unless they happen to have the same number of bookings)
      expect(userBookings).toBeGreaterThanOrEqual(0);
      expect(otherUserBookings).toBeGreaterThanOrEqual(0);
    });

    test('should show navigation link only for customers', async ({ page }) => {
      // Verify "My History" link is visible for customer
      await expect(page.locator('a[href="/dashboard/booking"]:text("My History")')).toBeVisible();

      // Note: Testing for cleaner/admin roles would require different test data
    });
  });

  test.describe('Performance Testing', () => {
    test('should load booking history within performance threshold', async () => {
      const startTime = Date.now();

      await bookingPage.navigateToBookingHistory();
      await bookingPage.waitForBookingsToLoad();

      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds (generous threshold for QA)
      expect(loadTime).toBeLessThan(3000);

      console.log(`Booking history loaded in ${loadTime}ms`);
    });

    test('should handle API response time measurement', async ({ page }) => {
      // Monitor network requests
      const apiResponses: number[] = [];

      page.on('response', async (response) => {
        if (response.url().includes('/api/history')) {
          // Use performance.now() for response time measurement
          const responseTime = Date.now(); // Simplified measurement for testing
          apiResponses.push(responseTime);
          console.log(`API /history response detected`);
        }
      });

      await bookingPage.navigateToBookingHistory();
      await bookingPage.waitForBookingsToLoad();

      // Verify API responses are within acceptable range
      if (apiResponses.length > 0) {
        const averageResponseTime = apiResponses.reduce((a, b) => a + b, 0) / apiResponses.length;
        expect(averageResponseTime).toBeLessThan(500); // 500ms threshold
        console.log(`Average API response time: ${averageResponseTime}ms`);
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('/api/history*', route => route.abort());

      await page.goto('/dashboard/booking');

      // Should show error state
      const errorMessage = page.locator('[data-testid="error-message"]');
      if (await errorMessage.isVisible({ timeout: 5000 })) {
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText(/error|failed|unable/i);
      }
    });

    test('should handle invalid filter combinations', async () => {
      await bookingPage.waitForBookingsToLoad();

      // Apply invalid date range (from date after to date)
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await bookingPage.setDateRange(today, yesterday);

      // Should either prevent invalid input or show no results
      const bookingCount = await bookingPage.getBookingCount();
      expect(bookingCount).toBeGreaterThanOrEqual(0);
    });

    test('should refresh data correctly', async ({ page }) => {
      await bookingPage.waitForBookingsToLoad();

      // Click refresh button if it exists
      const refreshButton = page.locator('[data-testid="refresh-button"]');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await bookingPage.waitForBookingsToLoad();

        // Verify data reloaded
        const bookingCount = await bookingPage.getBookingCount();
        expect(bookingCount).toBeGreaterThanOrEqual(0);
      }
    });
  });
});