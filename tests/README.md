# E2E Testing with Playwright

This directory contains end-to-end (E2E) tests for the Boss of Clean application using Playwright.

## Overview

Our test suite focuses on critical authentication and dashboard functionality:

- **Homepage rendering** - Verifies the main site loads correctly
- **Auth pages** - Tests login/signup page rendering  
- **User signup flow** - Complete user registration and dashboard access
- **Login functionality** - Existing user authentication
- **Logout process** - User session termination
- **Route protection** - Middleware redirects for protected routes

## Running Tests Locally

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

3. **Set up environment:**
   - Copy `.env.example` to `.env.local`
   - Configure your Supabase environment variables
   - Ensure your database is set up and accessible

### Run Tests

**Start the development server and run all tests:**
```bash
npm run test:e2e
```

**Run tests in headed mode (see browser):**
```bash
npx playwright test --headed
```

**Run specific test file:**
```bash
npx playwright test tests/auth.spec.ts
```

**Run tests in debug mode:**
```bash
npx playwright test --debug
```

### View Test Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

## Test Structure

### Test Files
- `tests/auth.spec.ts` - Main authentication flow tests
- `tests/auth-utils.ts` - Shared utilities and helper functions

### Test Coverage
- ✅ Homepage loads and displays correctly
- ✅ Login page renders with proper form elements
- ✅ Signup page renders with proper form elements  
- ✅ User can create account with email/password
- ✅ New user gets redirected to customer dashboard
- ✅ Existing user can login successfully
- ✅ User can logout and return to homepage
- ✅ Protected routes redirect to login when not authenticated
- ✅ Navigation works correctly for unauthenticated users

### Test Data
- Uses dynamically generated test emails (e.g., `test-user-1234567890-123@playwright-test.com`)
- Password: `testpassword123`
- Creates fresh test users for each test to avoid conflicts

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

### Netlify Integration
Tests can be run on Netlify preview deployments:
```bash
# In netlify.toml or build script
npm run test:e2e
```

## Configuration

### Playwright Config (`playwright.config.ts`)
- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: `http://localhost:3000`
- **Parallel execution**: Enabled for faster test runs
- **Retries**: 2 retries on CI, 0 locally
- **Dev server**: Automatically starts Next.js dev server

### Environment Variables
Required for tests to run:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Troubleshooting

### Common Issues

**Tests timeout or fail to start:**
- Ensure your dev server is running (`npm run dev`)
- Check that port 3000 is available
- Verify environment variables are set correctly

**Authentication tests fail:**
- Verify Supabase is configured and accessible
- Check RLS policies allow test user creation
- Ensure email confirmation is disabled for tests or handled appropriately

**Flaky tests:**
- Tests include proper waits for elements and page loads
- Use `waitForPageLoad()` helper for additional stability
- Increase timeout values if needed for slower environments

### Debug Mode
Run with debug mode to step through tests:
```bash
npx playwright test --debug tests/auth.spec.ts
```

### Screenshots and Videos
Failed tests automatically capture screenshots and videos in `test-results/` directory.

## Best Practices

1. **Independent Tests**: Each test creates its own test user
2. **Cleanup**: Tests don't require manual cleanup (uses unique emails)
3. **Realistic Flows**: Tests follow actual user journeys
4. **Error Handling**: Tests handle expected variations (email confirmation, etc.)
5. **Performance**: Tests run in parallel and use efficient selectors

## Extending Tests

To add new tests:

1. **Create test utilities** in `auth-utils.ts` for reusable functions
2. **Add test cases** to existing spec files or create new ones
3. **Follow naming convention**: `feature.spec.ts`
4. **Use existing patterns** for consistency
5. **Document new test coverage** in this README

## Limitations

- **Email/Password Only**: Tests skip Google OAuth as requested
- **Email Confirmation**: Tests handle but don't fully test email confirmation flows
- **Admin Functions**: Limited admin testing (requires manual role assignment)
- **Payment Flows**: Not covered in current smoke tests