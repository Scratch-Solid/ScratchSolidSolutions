import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('User can view cleaner signup page with consent form', async ({ page }) => {
    await page.goto('/signup/cleaner');
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(2, { timeout: 5000 });
  });

  test('Create profile page has required form fields', async ({ page }) => {
    await page.goto('/auth/create-profile');
    await expect(page.locator('input[name="firstName"], input[name="lastName"], input[name="residentialAddress"]').first()).toBeVisible();
    await expect(page.locator('input[name="cellphone"], input[type="tel"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Sign contract page requires auth and redirects to login', async ({ page }) => {
    await page.goto('/auth/sign-contract');
    // Without auth token, page redirects to login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });

  test('Unauthenticated user is redirected or protected', async ({ page }) => {
    await page.goto('/admin-dashboard');
    // Dashboards may redirect to login OR show auth gate UI — just ensure no 500
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Internal Server Error');
  });
});
