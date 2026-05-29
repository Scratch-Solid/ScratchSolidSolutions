import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('User can submit consent form', async ({ page }) => {
    await page.goto('/auth/consent');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="phone"]', '+1234567890');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="department"]', 'cleaning');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/auth\/create-profile/);
  });

  test('User can create profile', async ({ page }) => {
    await page.goto('/auth/create-profile');
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="address"]', '123 Test St');
    await page.fill('input[name="idNumber"]', '1234567890123');
    await page.fill('input[name="bankAccount"]', '1234567890');
    await page.fill('input[name="bankName"]', 'Test Bank');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/auth\/sign-contract/);
  });

  test('User can sign contract', async ({ page }) => {
    await page.goto('/auth/sign-contract');
    await page.check('input[type="checkbox"][value="agree"]');
    await page.waitForTimeout(500);
    await page.check('input[type="checkbox"][value="sign"]');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Contract signed successfully')).toBeVisible();
  });

  test('Unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
