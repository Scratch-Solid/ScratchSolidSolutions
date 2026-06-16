import { test, expect } from '@playwright/test';

test.describe('Auth Flows', () => {
  test('Auth page has login inputs', async ({ page }) => {
    await page.goto('/auth');
    // Auth page has phone input (individual tab default) and password
    await expect(page.locator('input[type="tel"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Client signup page has registration fields', async ({ page }) => {
    await page.goto('/client-signup');
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('Forgot password page has identifier input', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="tel"], input[type="email"]')).toBeVisible();
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
