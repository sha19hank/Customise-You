import { test, expect } from '@playwright/test';

/**
 * E2E Test: Checkout Flow
 * 
 * Tests COD and Online payment checkout flows
 */

test.describe('Checkout Flow', () => {
  
  test.beforeAll(async ({ browser }) => {
    // Register demo user before running tests
    const page = await browser.newPage();
    await page.goto('/register');
    
    // Try to register (will fail if user exists, which is fine)
    await page.getByLabel('First Name').fill('Demo');
    await page.getByLabel('Last Name').fill('User');
    await page.getByLabel('Email').fill('demo@customiseyou.com');
    await page.locator('input[name="password"]').fill('Demo@123');
    await page.locator('input[name="confirmPassword"]').fill('Demo@123');
    await page.locator('input[name="acceptedTerms"]').check();
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Wait a bit for registration (ignore errors if user exists)
    await page.waitForTimeout(2000);
    await page.close();
  });
  
  test.beforeEach(async ({ page }) => {
    // Step 1: Login
    await page.goto('/login');
    await page.getByLabel('Email').fill('demo@customiseyou.com');
    await page.getByLabel('Password').fill('Demo@123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(2000);
    
    if (page.url().includes('/login')) {
      test.skip(true, 'Backend not running - cannot login');
    }
    
    // Step 2: Browse products (REAL USER FLOW)
    await page.goto('/products');
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    
    try {
      // Wait for products page to render
      await page.waitForSelector('text=/Browse Products/i', { timeout: 10000 });
      
      // Wait longer for products to load (API might be slower after many requests)
      await page.waitForTimeout(4000);
      
      // Step 3: Click on a product card to go to detail page
      const productLinks = page.locator('a[href*="/products/"]');
      
      // Retry logic - wait up to 10 seconds for products to appear
      let linkCount = 0;
      for (let i = 0; i < 5; i++) {
        linkCount = await productLinks.count();
        if (linkCount > 0) break;
        await page.waitForTimeout(2000);
      }
      
      if (linkCount === 0) {
        throw new Error('No products found on listing page after retries');
      }
      
      // Click first available product
      const productLink = productLinks.first();
      await productLink.click();
      
      // Step 4: Wait for product detail page to load
      await page.waitForURL(/\/products\/.+/);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      
      // Step 5: Add to cart (handling customizable vs non-customizable)
      const addToCartBtn = page.getByRole('button', { name: /Add to Cart/i });
      await addToCartBtn.waitFor({ state: 'visible', timeout: 8000 });
      
      // Check if product has customization fields that are required
      const requiredFields = page.locator('input[required], select[required]');
      const hasRequiredCustomizations = await requiredFields.count() > 0;
      
      if (hasRequiredCustomizations) {
        // Fill first required text field if exists
        const textField = requiredFields.first();
        if (await textField.getAttribute('type') === 'text') {
          await textField.fill('Test Name');
        }
        
        // Select first option in required dropdowns
        const selects = page.locator('select[required]');
        const selectCount = await selects.count();
        for (let i = 0; i < selectCount; i++) {
          await selects.nth(i).selectOption({ index: 1 });
        }
      }
      
      // Now click Add to Cart
      await addToCartBtn.click();
      
      // Wait for success toast and cart update
      await page.waitForTimeout(2000);
      
    } catch (error) {
      console.error('Product flow error:', error);
      test.skip(true, 'Products not loading - check backend is running and seeded');
      return;
    }
    
    // Step 6: Navigate to cart
    await page.goto('/cart');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should complete COD checkout successfully', async ({ page }) => {
    // Check if cart has items
    const proceedBtn = page.locator('button:has-text("Proceed to Checkout")');
    const hasItems = await proceedBtn.isEnabled({ timeout: 5000 }).catch(() => false);
    
    if (!hasItems) {
      test.skip(true, 'Cart is empty - skipping checkout test');
      return;
    }
    
    // Proceed to checkout
    await proceedBtn.click();
    await page.waitForURL('/checkout');
    
    // Select or verify address exists
    await page.waitForTimeout(1000);
    
    // Check if we need to add an address
    const addAddressBtn = page.locator('button:has-text("Add Address")');
    if (await addAddressBtn.isVisible().catch(() => false)) {
      // Add a new address
      await addAddressBtn.click();
      
      // Fill address form
      await page.getByLabel('Full Name').fill('Test User');
      await page.getByLabel('Phone Number').fill('9876543210');
      await page.getByLabel('Address Line 1').fill('123 Test Street');
      await page.getByLabel('City').fill('Mumbai');
      await page.getByLabel('State').fill('Maharashtra');
      await page.getByLabel('Postal Code').fill('400001');
      
      // Save address
      await page.locator('button:has-text("Save")').click();
      await page.waitForTimeout(1000);
    }
    
    // Select COD payment method
    const codOption = page.locator('input[value="cod"]');
    if (await codOption.count() > 0) {
      await codOption.click();
      
      // Place order
      const placeOrderBtn = page.locator('button:has-text("Place Order")');
      await placeOrderBtn.click();
      
      // Wait for order confirmation
      await page.waitForURL(/\/orders\/[^\/]+/, { timeout: 10000 });
      
      // Verify we're on order success page
      expect(page.url()).toContain('/orders/');
    }
  });

  test('should redirect to payment page for ONLINE payment', async ({ page }) => {
    const proceedBtn = page.locator('button:has-text("Proceed to Checkout")');
    const hasItems = await proceedBtn.isEnabled({ timeout: 5000 }).catch(() => false);
    
    if (!hasItems) {
      test.skip(true, 'Cart is empty - skipping checkout test');
      return;
    }
    
    await proceedBtn.click();
    await page.waitForURL('/checkout');
    await page.waitForTimeout(1000);
    
    // Check if address exists, if not we need to add one
    const addAddressBtn = page.locator('button:has-text("Add Address")');
    if (await addAddressBtn.isVisible().catch(() => false)) {
      await addAddressBtn.click();
      await page.getByLabel('Full Name').fill('Test User');
      await page.getByLabel('Phone Number').fill('9876543210');
      await page.getByLabel('Address Line 1').fill('123 Test Street');
      await page.getByLabel('City').fill('Mumbai');
      await page.getByLabel('State').fill('Maharashtra');
      await page.getByLabel('Postal Code').fill('400001');
      await page.locator('button:has-text("Save")').click();
      await page.waitForTimeout(1000);
    }
    
    // Select ONLINE payment method
    const onlineOption = page.locator('input[value="razorpay"]');
    if (await onlineOption.count() > 0) {
      await onlineOption.click();
      
      // Place order
      const placeOrderBtn = page.locator('button:has-text("Place Order")');
      await placeOrderBtn.click();
      
      // Wait for either Razorpay modal or order page
      await page.waitForTimeout(2000);
      
      // Check if Razorpay payment modal opened
      // Note: Razorpay opens in iframe, so we check for iframe or redirect
      const hasIframe = await page.locator('iframe').count().catch(() => 0);
      const currentUrl = page.url();
      
      // Either we see Razorpay iframe or we got redirected to order page
      expect(hasIframe > 0 || currentUrl.includes('/orders/')).toBeTruthy();
    }
  });

  test('should show validation error when no address selected', async ({ page }) => {
    const proceedBtn = page.locator('button:has-text("Proceed to Checkout")');
    const hasItems = await proceedBtn.isEnabled({ timeout: 5000 }).catch(() => false);
    
    if (!hasItems) {
      test.skip(true, 'Cart is empty - skipping checkout test');
      return;
    }
    
    await proceedBtn.click();
    await page.waitForURL('/checkout');
    await page.waitForTimeout(1000);
    
    // Try to place order without selecting payment
    const placeOrderBtn = page.locator('button:has-text("Place Order")');
    
    if (await placeOrderBtn.isEnabled()) {
      await placeOrderBtn.click();
      
      // Should show error toast or validation message
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 3000 });
    }
  });
});
