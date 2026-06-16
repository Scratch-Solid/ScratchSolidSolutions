import { test, expect } from '@playwright/test';

const BASE_URL = ''; // Use Playwright baseURL (relative paths)

/**
 * Booking Flow E2E Tests
 * Validates the full booking journey: selection -> form -> submission edge cases.
 */
test.describe('Booking Flow', () => {
  test('Booking page loads with service selection', async ({ page }) => {
    await page.goto(`${BASE_URL}/book`);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Internal Server Error');
    expect(bodyText).toContain('Book');
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
    await page.goto(`${BASE_URL}/booking-selection`);
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Individual');
    expect(bodyText).toContain('Business');
  });

  test('Services API returns valid service data', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/services`);
    expect(response.status()).toBe(200);
    const services = await response.json() as any[];
    expect(Array.isArray(services)).toBe(true);

    if (services.length > 0) {
      const first = services[0];
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('price');
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
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Internal Server Error');

    // If there are input fields, test edge cases
    const inputs = page.locator('input, select');
    const count = await inputs.count();
    if (count > 0) {
      // Try submitting empty form
      const submitBtn = page.locator('button[type="submit"], button:has-text("Submit")');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        await page.waitForTimeout(500);
        const newText = await page.locator('body').innerText();
        // Should not crash, should show validation error
        expect(newText).not.toContain('Internal Server Error');
      }
    }
  });
});
