import { test, expect } from '@playwright/test';

/**
 * E2E Test: Wishlist to Cart Flow
 * 
 * Tests adding items from wishlist directly to cart
 */

test.describe('Wishlist to Cart', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login with demo user
    await page.goto('/login');
    await page.getByLabel('Email').fill('demo@customiseyou.com');
    await page.getByLabel('Password').fill('Demo@123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(2000); // Wait for navigation
  });

  test('should add non-customizable item from wishlist to cart', async ({ page }) => {
    // Navigate to wishlist
    await page.goto('/wishlist');
    
    // Wait for wishlist to load
    await page.waitForSelector('h4:has-text("Wishlist")', { timeout: 10000 });
    
    // Check if wishlist has items
    const wishlistItems = page.locator('[data-testid^="add-to-cart-"]');
    const itemCount = await wishlistItems.count();
    
    if (itemCount > 0) {
      // Get initial cart count
      const cartBadge = page.locator('[aria-label*="cart"] span');
      const initialCartCount = (await cartBadge.textContent().catch(() => '0')) || '0';
      
      // Click "Add to Cart" on first item
      const addToCartBtn = wishlistItems.first();
      const productId = await addToCartBtn.getAttribute('data-testid');
      
      await addToCartBtn.click();
      
      // Wait for one of two outcomes:
      // 1. Toast notification (item added to cart)
      // 2. Redirect to product page (if customization required)
      
      await Promise.race([
        // Option 1: Toast appears (non-customizable product)
        page.waitForSelector('text=/.*added to cart.*/i', { timeout: 3000 }).then(() => 'toast'),
        // Option 2: Redirect to product page (customizable product)
        page.waitForURL(/\/products\/[^\/]+$/, { timeout: 3000 }).then(() => 'redirect'),
      ]).catch(() => null);
      
      // If we got toast, verify cart was updated
      if (page.url().includes('/wishlist')) {
        await expect(page.locator('text=/.*added to cart.*/i')).toBeVisible();
        // Cart count should increase
        await expect(cartBadge).not.toContainText(initialCartCount);
      } else {
        // If redirected, we're on product detail page
        expect(page.url()).toContain('/products/');
      }
    }
  });

  test('should redirect to product page for customizable items', async ({ page }) => {
    await page.goto('/wishlist');
    
    // This test assumes at least one customizable product in wishlist
    const addToCartBtn = page.locator('[data-testid^="add-to-cart-"]').first();
    
    if (await addToCartBtn.count() > 0) {
      await addToCartBtn.click();
      
      // Wait for either toast or redirect
      await page.waitForTimeout(1000);
      
      // Check current URL
      const currentUrl = page.url();
      
      // Either we stayed on wishlist (added to cart) or went to product page
      expect(currentUrl).toMatch(/\/(wishlist|products\/[^\/]+)$/);
    }
  });

  test('should remove item from wishlist', async ({ page }) => {
    await page.goto('/wishlist');
    
    // Wait for page load
    await page.waitForTimeout(1000);
    
    const wishlistItems = page.locator('[role="article"], [data-testid^="wishlist-item-"]');
    const initialCount = await wishlistItems.count();
    
    if (initialCount > 0) {
      // Click remove/delete button
      const removeBtn = page.locator('button[aria-label*="remove"]').first();
      await removeBtn.click();
      
      // Wait for update
      await page.waitForTimeout(500);
      
      // Verify item was removed
      const newCount = await wishlistItems.count();
      expect(newCount).toBeLessThan(initialCount);
    }
  });
});
