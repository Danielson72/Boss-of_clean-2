import { defineConfig } from '@playwright/test';

/**
 * Node-only unit tests (no browser, no dev server). Run with:
 *   npx playwright test -c playwright.unit.config.ts
 * Uses the already-installed @playwright/test runner so no new test framework
 * is added to the project.
 */
export default defineConfig({
  testDir: './tests/unit',
  fullyParallel: true,
  reporter: 'list',
  timeout: 20_000,
});
