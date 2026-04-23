import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('signup and login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'e2e@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard|cleaner|business|admin/);
  });

  test('logout clears session', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'e2e@test.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/login');
  });
});
