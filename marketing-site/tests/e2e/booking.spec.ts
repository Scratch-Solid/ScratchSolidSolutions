import { test, expect } from '@playwright/test';

test.describe('Booking Pages', () => {
  test('Services page loads without error', async ({ page }) => {
    const response = await page.goto('/services');
    expect(response!.status()).toBeLessThan(500);
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Internal Server Error');
    expect(body.length).toBeGreaterThan(200);
  });

  test('Booking page loads without error', async ({ page }) => {
    const response = await page.goto('/book');
    expect(response!.status()).toBeLessThan(500);
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Internal Server Error');
  });
});
