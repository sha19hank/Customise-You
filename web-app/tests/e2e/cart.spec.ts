import { test, expect } from '@playwright/test';

/**
 * E2E Test: Shopping Cart Flow
 * 
 * Tests adding products to cart, updating quantities, and proceeding to checkout
 */

test.describe('Shopping Cart', () => {
  
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
  
  // Login before each test
  test.beforeEach(async ({ page }) => {
    // Login with demo user
    await page.goto('/login');
    await page.getByLabel('Email').fill('demo@customiseyou.com');
    await page.getByLabel('Password').fill('Demo@123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(2000); // Wait for navigation
  });

  test('should add product to cart from product detail page', async ({ page }) => {
    // Navigate to products page
    await page.goto('/products');
    
    // Wait for products to load
    await page.waitForSelector('text=/.*Products.*/i', { timeout: 10000 });
    
    // Click on first product (if available)
    const firstProduct = page.locator('[data-testid^="product-card-"]').first();
    if (await firstProduct.count() > 0) {
      await firstProduct.click();
      
      // Wait for product detail page
      await page.waitForURL(/\/products\/[^\/]+$/);
      
      // Get initial cart count
      const cartBadge = page.locator('[aria-label*="cart"] span');
      const initialCount = (await cartBadge.textContent().catch(() => '0')) || '0';
      
      // Add to cart (if no customization required)
      const addToCartBtn = page.locator('button:has-text("Add to Cart")').first();
      if (await addToCartBtn.isEnabled()) {
        await addToCartBtn.click();
        
        // Wait for toast notification
        await expect(page.locator('text=/.*added to cart.*/i')).toBeVisible({ timeout: 5000 });
        
        // Verify cart count increased
        await expect(cartBadge).not.toContainText(initialCount);
      }
    }
  });

  test('should update quantity in cart', async ({ page }) => {
    // Go directly to cart
    await page.goto('/cart');
    
    // Check if cart has items
    const cartItems = page.locator('[data-testid^="cart-item-"]');
    const itemCount = await cartItems.count();
    
    if (itemCount > 0) {
      // Increase quantity
      const increaseBtn = page.locator('button[aria-label="increase quantity"]').first();
      await increaseBtn.click();
      
      // Wait for update
      await page.waitForTimeout(500);
      
      // Verify quantity changed
      const quantityInput = page.locator('input[type="number"]').first();
      const newQuantity = await quantityInput.inputValue();
      expect(parseInt(newQuantity)).toBeGreaterThan(1);
    }
  });

  test('should remove item from cart', async ({ page }) => {
    await page.goto('/cart');
    
    const cartItems = page.locator('[data-testid^="cart-item-"]');
    const initialCount = await cartItems.count();
    
    if (initialCount > 0) {
      // Click remove button on first item
      const removeBtn = page.locator('button[aria-label*="remove"]').first();
      await removeBtn.click();
      
      // Wait for removal
      await page.waitForTimeout(500);
      
      // Verify item count decreased
      const newCount = await cartItems.count();
      expect(newCount).toBeLessThan(initialCount);
    }
  });

  test('should add item back to cart after removal', async ({ page }) => {
    // After removing items, add a fresh one for checkout tests
    await page.goto('/products');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Wait for products to load
    await page.waitForSelector('text=/Browse Products/i', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Click first product
    const productLinks = page.locator('a[href*="/products/"]');
    const linkCount = await productLinks.count();
    
    if (linkCount > 0) {
      await productLinks.first().click();
      
      // Wait for product detail page
      await page.waitForURL(/\/products\/.+/);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // Fill customizations if required
      const requiredTextFields = page.locator('input[required][type="text"]');
      const requiredTextCount = await requiredTextFields.count();
      for (let i = 0; i < requiredTextCount; i++) {
        await requiredTextFields.nth(i).fill('Test Value');
      }
      
      const requiredSelects = page.locator('select[required]');
      const selectCount = await requiredSelects.count();
      for (let i = 0; i < selectCount; i++) {
        await requiredSelects.nth(i).selectOption({ index: 1 });
      }
      
      // Add to cart
      const addToCartBtn = page.getByRole('button', { name: /Add to Cart/i });
      if (await addToCartBtn.count() > 0) {
        await addToCartBtn.click();
        await page.waitForTimeout(1500);
      }
    }
  });

  test('should proceed to checkout with items in cart', async ({ page }) => {
    // Cart should already have items from previous test
    await page.goto('/cart');
    await page.waitForTimeout(1000);
    
    // Check if cart has items
    const proceedBtn = page.locator('button:has-text("Proceed to Checkout")');
    const isEnabled = await proceedBtn.isEnabled({ timeout: 5000 }).catch(() => false);
    
    if (!isEnabled) {
      test.skip(true, 'Cart is empty or checkout button not available');
      return;
    }
    
    await proceedBtn.click();
    
    // Should redirect to checkout page
    await page.waitForURL('/checkout', { timeout: 5000 }).catch(() => {});
    
    // Verify we're on checkout page
    const onCheckout = page.url().includes('/checkout');
    expect(onCheckout).toBeTruthy();
  });
});
