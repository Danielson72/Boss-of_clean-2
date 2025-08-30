import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3001',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers and mobile devices */
  projects: [
    {
      name: 'Mobile CEO Cat Tests',
      use: { 
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 }
      },
    },
    {
      name: 'iPhone 12',
      use: { 
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 }
      },
    },
    {
      name: 'iPhone 12 Pro Max',
      use: { 
        ...devices['iPhone 12 Pro Max'],
        viewport: { width: 428, height: 926 }
      },
    },
    {
      name: 'Samsung Galaxy S21',
      use: { 
        ...devices['Galaxy S8'],
        viewport: { width: 360, height: 800 }
      },
    },
    {
      name: 'iPad Mini',
      use: { 
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 }
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
});