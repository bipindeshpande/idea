# Playwright E2E Tests

End-to-end tests for the IdeaBunch application using Playwright.

## Setup

Tests are already configured. To run:

```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug
```

## Prerequisites

1. **Backend server** must be running on `http://localhost:8000`
2. **Frontend dev server** will be started automatically by Playwright (or run `npm run dev` manually)
3. **Database** should have test data or be in a testable state

## Test Structure

- `founder-connect.spec.js` - Tests for Founder Connect feature
- `auth-helpers.js` - Helper functions for authentication and API setup

## Writing New Tests

1. Create a new `.spec.js` file in the `e2e/` directory
2. Import `test` and `expect` from `@playwright/test`
3. Use `test.describe()` to group related tests
4. Use `test.beforeEach()` for setup
5. Use `test()` for individual test cases

Example:
```javascript
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/my-page');
    await expect(page.locator('h1')).toHaveText('Expected Text');
  });
});
```

## Configuration

See `playwright.config.js` for configuration options.

