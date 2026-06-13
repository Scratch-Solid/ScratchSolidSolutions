# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Auth Flows >> Forgot password page accepts email
- Location: tests\e2e\auth.spec.ts:17:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[type="email"], input[name="email"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('input[type="email"], input[name="email"]')

```

```yaml
- heading "Reset Password" [level=1]
- paragraph: Recover your account password
- text: Account Type
- button "Individual"
- button "Business"
- text: Phone Number *
- textbox "+27 12 345 6789"
- paragraph: A reset link will be sent to your email if one is registered
- button "Send Reset Code"
- link "Back to Login":
  - /url: /login
- alert
- paragraph:
  - strong: "Cookie Notice:"
  - text: We use essential cookies for authentication and session management. By continuing to use this site, you accept our use of cookies in accordance with our
  - link "Privacy Policy":
    - /url: /privacy
  - text: .
- button "Decline"
- button "Accept"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Auth Flows', () => {
  4  |   test('Login page has email and password fields', async ({ page }) => {
  5  |     await page.goto('/login');
  6  |     await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  7  |     await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  8  |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  9  |   });
  10 | 
  11 |   test('Signup page has registration fields', async ({ page }) => {
  12 |     await page.goto('/signup');
  13 |     await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  14 |     await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  15 |   });
  16 | 
  17 |   test('Forgot password page accepts email', async ({ page }) => {
  18 |     await page.goto('/forgot-password');
> 19 |     await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
     |                                                                            ^ Error: expect(locator).toBeVisible() failed
  20 |     const submit = page.locator('button[type="submit"]');
  21 |     await expect(submit).toBeVisible();
  22 |   });
  23 | 
  24 |   test('Reset password page requires token', async ({ page }) => {
  25 |     const response = await page.goto('/reset-password?token=invalid');
  26 |     expect(response!.status()).toBeLessThan(500);
  27 |     const body = await page.locator('body').innerText();
  28 |     expect(body).not.toContain('Internal Server Error');
  29 |   });
  30 | });
  31 | 
```