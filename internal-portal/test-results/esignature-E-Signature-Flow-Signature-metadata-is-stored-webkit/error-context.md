# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: esignature.spec.ts >> E-Signature Flow >> Signature metadata is stored
- Location: tests\esignature.spec.ts:16:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('E-Signature Flow', () => {
  4  |   test('Signature data is captured', async ({ page }) => {
  5  |     await page.goto('/auth/sign-contract');
  6  |     await page.check('input[type="checkbox"][value="agree"]');
  7  |     await page.waitForTimeout(500);
  8  |     const canvas = page.locator('canvas');
  9  |     await canvas.click({ position: { x: 50, y: 50 } });
  10 |     await canvas.dragTo(canvas, { targetPosition: { x: 100, y: 100 } });
  11 |     await page.check('input[type="checkbox"][value="sign"]');
  12 |     await page.click('button[type="submit"]');
  13 |     await expect(page.locator('text=Contract signed successfully')).toBeVisible();
  14 |   });
  15 | 
  16 |   test('Signature metadata is stored', async ({ request }) => {
  17 |     const response = await request.post('/api/auth/sign-contract', {
  18 |       data: { signatureDate: new Date().toISOString(), signatureData: 'data:image/png;base64,test' },
  19 |     });
> 20 |     expect(response.ok()).toBeTruthy();
     |                           ^ Error: expect(received).toBeTruthy()
  21 |   });
  22 | });
  23 | 
```