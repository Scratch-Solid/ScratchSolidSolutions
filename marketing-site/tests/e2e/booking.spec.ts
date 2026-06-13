import { test, expect } from '@playwright/test';

test.describe('Booking Pages', () => {
  test('Services page lists offerings', async ({ page }) => {
    await page.goto('/services');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
    const cards = page.locator('[data-testid="service-card"], .service-card, article');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Pricing page loads without error', async ({ page }) => {
    const response = await page.goto('/pricing');
    expect(response!.status()).toBeLessThan(500);
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Internal Server Error');
  });
});
