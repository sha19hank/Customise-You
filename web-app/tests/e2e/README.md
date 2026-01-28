# E2E Testing with Playwright

This directory contains end-to-end tests for the CustomiseYou web application.

## Setup

Playwright has already been installed and configured. The tests run against `http://localhost:3001`.

## Running Tests

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests with UI mode (recommended for development)
npm run test:e2e:ui

# Run tests in headed mode (see the browser)
npm run test:e2e:headed

# View last test report
npm run test:report
```

## Test Suites

### 1. Authentication (`auth.spec.ts`)
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Form validation

### 2. Shopping Cart (`cart.spec.ts`)
- ✅ Add product to cart from product page
- ✅ Update quantity in cart
- ✅ Remove item from cart
- ✅ Proceed to checkout

### 3. Wishlist to Cart (`wishlist.spec.ts`)
- ✅ Add non-customizable item from wishlist to cart
- ✅ Redirect to product page for customizable items
- ✅ Remove item from wishlist

### 4. Checkout Flow (`checkout.spec.ts`)
- ✅ Complete COD checkout
- ✅ Initiate ONLINE payment (Razorpay)
- ✅ Validation when no address selected

## Test Credentials

Tests use the demo user from seed data:
- **Email:** `demo@customiseyou.com`
- **Password:** `Demo@123`

## Writing New Tests

1. Create a new `.spec.ts` file in `tests/e2e/`
2. Import Playwright test utilities:
   ```typescript
   import { test, expect } from '@playwright/test';
   ```
3. Use `data-testid` attributes for reliable selectors
4. Follow existing test patterns

## Best Practices

- ✅ Use semantic selectors (`getByTestId`, `getByRole`, `getByLabel`)
- ✅ Add `data-testid` attributes for critical elements
- ✅ Keep tests independent (each test should work in isolation)
- ✅ Use `test.beforeEach()` for common setup (login, navigation)
- ✅ Add meaningful assertions
- ✅ Handle async operations with `waitFor` methods

## CI/CD Integration

Tests can be integrated into CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: npm run test:e2e
```

## Debugging Failed Tests

1. Run with UI mode: `npm run test:e2e:ui`
2. Check screenshots in `test-results/` folder
3. View traces in HTML report: `npm run test:report`
4. Run specific test file: `npx playwright test auth.spec.ts`

## Configuration

Test configuration is in `playwright.config.ts`:
- Browser: Chromium (Desktop Chrome)
- Base URL: `http://localhost:3001`
- Timeout: 30 seconds per test
- Retries: 2 on CI, 0 locally
- Screenshots: On failure only

## Notes

- Tests automatically start the dev server (`npm run dev`)
- Tests require backend API to be running on `http://localhost:3000`
- Database should be seeded with demo data before running tests
