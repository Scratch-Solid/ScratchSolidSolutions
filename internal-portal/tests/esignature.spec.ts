import { test, expect } from '@playwright/test';

test.describe('E-Signature Flow', () => {
  test('Signature data is captured', async ({ page }) => {
    await page.goto('/auth/sign-contract');
    await page.check('input[type="checkbox"][value="agree"]');
    await page.waitForTimeout(500);
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: 50, y: 50 } });
    await canvas.dragTo(canvas, { targetPosition: { x: 100, y: 100 } });
    await page.check('input[type="checkbox"][value="sign"]');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Contract signed successfully')).toBeVisible();
  });

  test('Signature metadata is stored', async ({ request }) => {
    const response = await request.post('/api/auth/sign-contract', {
      data: { signatureDate: new Date().toISOString(), signatureData: 'data:image/png;base64,test' },
    });
    expect(response.ok()).toBeTruthy();
  });
});
