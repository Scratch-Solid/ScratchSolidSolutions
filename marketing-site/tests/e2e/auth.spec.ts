import { test, expect } from '@playwright/test';

test.describe('Auth Flows', () => {
  test('Login page has email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Signup page has registration fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('Forgot password page accepts email', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    const submit = page.locator('button[type="submit"]');
    await expect(submit).toBeVisible();
  });

  test('Reset password page requires token', async ({ page }) => {
    const response = await page.goto('/reset-password?token=invalid');
    expect(response!.status()).toBeLessThan(500);
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Internal Server Error');
  });
});
