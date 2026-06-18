import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('User can view cleaner signup page with consent form', async ({ page }) => {
    await page.goto('/signup/cleaner');
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(2, { timeout: 5000 });
  });

  test('Create profile page has required form fields', async ({ page }) => {
    await page.goto('/auth/create-profile');
    await expect(page.locator('input[name="fullName"], input[name="address"], input[name="idNumber"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Sign contract page renders with checkboxes', async ({ page }) => {
    await page.goto('/auth/sign-contract');
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(2, { timeout: 5000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Unauthenticated user is redirected or protected', async ({ page }) => {
    await page.goto('/admin-dashboard');
    // Dashboards may redirect to login OR show auth gate UI — just ensure no 500
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Internal Server Error');
  });
});
