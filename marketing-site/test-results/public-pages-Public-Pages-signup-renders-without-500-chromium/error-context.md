# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-pages.spec.ts >> Public Pages >> /signup renders without 500
- Location: tests\e2e\public-pages.spec.ts:18:9

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not 404
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "404" [level=1] [ref=e4]
    - heading "This page could not be found." [level=2] [ref=e6]
  - generic [ref=e11] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e12]:
      - img [ref=e13]
    - generic [ref=e16]:
      - button "Open issues overlay" [ref=e17]:
        - generic [ref=e18]:
          - generic [ref=e19]: "0"
          - generic [ref=e20]: "1"
        - generic [ref=e21]: Issue
      - button "Collapse issues badge" [ref=e22]:
        - img [ref=e23]
  - alert [ref=e25]
  - generic [ref=e27]:
    - paragraph [ref=e29]:
      - strong [ref=e30]: "Cookie Notice:"
      - text: We use essential cookies for authentication and session management. By continuing to use this site, you accept our use of cookies in accordance with our
      - link "Privacy Policy" [ref=e31] [cursor=pointer]:
        - /url: /privacy
      - text: .
    - generic [ref=e32]:
      - button "Decline" [ref=e33]
      - button "Accept" [ref=e34]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const PUBLIC_PAGES = [
  4  |   { path: '/', titleContains: 'Scratch' },
  5  |   { path: '/services', titleContains: 'Service' },
  6  |   { path: '/pricing', titleContains: 'Price' },
  7  |   { path: '/contact', titleContains: 'Contact' },
  8  |   { path: '/login', titleContains: 'Login' },
  9  |   { path: '/signup', titleContains: 'Sign' },
  10 |   { path: '/forgot-password', titleContains: 'Forgot' },
  11 |   { path: '/gallery', titleContains: 'Gallery' },
  12 |   { path: '/privacy', titleContains: 'Privacy' },
  13 |   { path: '/terms', titleContains: 'Terms' },
  14 | ];
  15 | 
  16 | test.describe('Public Pages', () => {
  17 |   for (const page of PUBLIC_PAGES) {
  18 |     test(`${page.path} renders without 500`, async ({ page: p }) => {
  19 |       const response = await p.goto(page.path, { waitUntil: 'networkidle' });
  20 |       expect(response).not.toBeNull();
  21 |       expect(response!.status()).toBeLessThan(500);
> 22 |       expect(response!.status()).not.toBe(404);
     |                                      ^ Error: expect(received).not.toBe(expected) // Object.is equality
  23 |       const body = await p.locator('body').innerText();
  24 |       expect(body).not.toContain('Internal Server Error');
  25 |     });
  26 |   }
  27 | 
  28 |   test('Navigation menu works', async ({ page }) => {
  29 |     await page.goto('/');
  30 |     const nav = page.locator('nav, header');
  31 |     await expect(nav).toBeVisible();
  32 |   });
  33 | 
  34 |   test('Footer is present on homepage', async ({ page }) => {
  35 |     await page.goto('/');
  36 |     const footer = page.locator('footer');
  37 |     await expect(footer).toBeVisible();
  38 |   });
  39 | });
  40 | 
```