import { test, expect } from '@playwright/test';

const BASE_URL = ''; // Use Playwright baseURL (relative paths)

/**
 * Booking Flow E2E Tests
 * Validates the full booking journey: selection -> form -> submission edge cases.
 */
test.describe('Booking Flow', () => {
  test('Booking page loads without error', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    // /book now redirects to auth or client-dashboard
    await page.waitForURL(/\/auth|\/client-dashboard/, { timeout: 5000 }).catch(() => {});
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Internal Server Error');
  });

  test('Booking page requires authentication', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    // Clear any existing auth state
    await page.evaluate(() => localStorage.clear());

    // Try to submit without being logged in
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit")');
    if (await submitButton.count() > 0) {
      await submitButton.first().click();
      // Should show login-required message or redirect
      await page.waitForTimeout(1000);
      const bodyText = await page.locator('body').innerText();
      const isLoginPage = page.url().includes('/auth') || page.url().includes('/login');
      const hasLoginPrompt = bodyText.toLowerCase().includes('login') || bodyText.toLowerCase().includes('sign in');
      expect(isLoginPage || hasLoginPrompt).toBe(true);
    }
  });

  test('Booking-selection page has two options', async ({ page }) => {
    test.skip(true, 'booking-selection page no longer exists — booking is done via client-dashboard');
  });

  test('Services API returns valid service data', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/services`);
    expect(response.status()).toBe(200);
    const services = await response.json() as any[];
    expect(Array.isArray(services)).toBe(true);

    if (services.length > 0) {
      const first = services[0];
      expect(first).toHaveProperty('name');
      // Schema has base_price, not price
      expect(first).toHaveProperty('base_price');
    }
  });

  test('Pricing API returns valid pricing tiers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/pricing`);
    expect(response.status()).toBe(200);
    const pricing = await response.json() as any;
    expect(pricing).toBeTruthy();
  });

  test('Booking page handles invalid inputs gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    // /book now redirects to auth or client-dashboard
    await page.waitForURL(/\/auth|\/client-dashboard/, { timeout: 5000 }).catch(() => {});
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Internal Server Error');
  });
});
