import { test, expect } from '@playwright/test';

test.describe('Booking flow', () => {
  test('client can create booking', async ({ page }) => {
    await page.goto('/booking');
    await page.selectOption('select[name="service_type"]', 'Standard Cleaning');
    await page.fill('input[name="location"]', '123 Test Street');
    await page.fill('input[name="booking_date"]', new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    await page.click('button:has-text("Book Now")');
    await expect(page.locator('.success-msg, [role="status"]')).toBeVisible();
  });
});
