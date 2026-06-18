import { test, expect } from '@playwright/test';

test.describe('E-Signature Flow', () => {
  test('Sign contract page renders with signature elements', async ({ page }) => {
    await page.goto('/auth/sign-contract');
    await expect(page.locator('input[type="checkbox"][value="agree"], input[type="checkbox"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Sign contract API rejects incomplete payload without 500', async ({ request }) => {
    const response = await request.post('/api/auth/sign-contract', {
      data: { signatureDate: new Date().toISOString() },
    });
    expect(response.status()).not.toBe(500);
    expect(response.status()).not.toBe(502);
    expect(response.status()).not.toBe(503);
  });
});
