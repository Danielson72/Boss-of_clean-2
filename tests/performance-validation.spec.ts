import { test, expect } from '@playwright/test';

test.describe('Performance Validation', () => {
  test('should measure API response times', async ({ page }) => {
    const apiResponses: Array<{ url: string; time: number; status: number }> = [];

    // Monitor all network requests (simplified for compatibility)
    const requestTimes = new Map();

    page.on('request', request => {
      requestTimes.set(request.url(), Date.now());
    });

    page.on('response', async (response) => {
      const url = response.url();
      const status = response.status();
      const startTime = requestTimes.get(url);

      if (url.includes('/api/') && startTime) {
        const responseTime = Date.now() - startTime;
        apiResponses.push({ url, time: responseTime, status });
        console.log(`API ${url} - ${responseTime}ms (${status})`);
      }
    });

    // Navigate to booking history page
    await page.goto('/dashboard/booking');
    await page.waitForLoadState('networkidle');

    // Wait a bit for any additional API calls
    await page.waitForTimeout(2000);

    // Log all API response times
    console.log('=== API PERFORMANCE SUMMARY ===');
    apiResponses.forEach(api => {
      console.log(`${api.url}: ${api.time}ms (Status: ${api.status})`);
    });

    // Check if any history API calls were made
    const historyAPIs = apiResponses.filter(api => api.url.includes('/history'));
    console.log(`Found ${historyAPIs.length} history API calls`);

    // Performance validation
    if (historyAPIs.length > 0) {
      const averageTime = historyAPIs.reduce((sum, api) => sum + api.time, 0) / historyAPIs.length;
      console.log(`Average history API response time: ${averageTime}ms`);

      // Expect average response time under 500ms
      expect(averageTime).toBeLessThan(500);
    }

    // Overall page load performance
    const pageLoadTime = await page.evaluate(() => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigationEntry ? navigationEntry.loadEventEnd - navigationEntry.loadEventStart : 0;
    });

    console.log(`Page load time: ${pageLoadTime}ms`);
    expect(pageLoadTime).toBeLessThan(5000); // 5 second threshold
  });

  test('should handle high load simulation', async ({ page }) => {
    const startTime = Date.now();

    // Simulate multiple rapid requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(page.goto('/dashboard/booking'));
    }

    await Promise.all(promises);
    await page.waitForLoadState('networkidle');

    const totalTime = Date.now() - startTime;
    console.log(`High load test completed in: ${totalTime}ms`);

    // Should handle load within reasonable time
    expect(totalTime).toBeLessThan(10000);
  });

  test('should measure memory usage', async ({ page }) => {
    await page.goto('/dashboard/booking');
    await page.waitForLoadState('networkidle');

    // Get memory metrics
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (metrics) {
      console.log('Memory Usage:', {
        used: `${(metrics.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(metrics.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(metrics.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
      });

      // Reasonable memory usage (under 50MB)
      expect(metrics.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024);
    }
  });
});