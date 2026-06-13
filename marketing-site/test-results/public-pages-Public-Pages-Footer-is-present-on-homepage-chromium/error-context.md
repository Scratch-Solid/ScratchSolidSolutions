# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-pages.spec.ts >> Public Pages >> Footer is present on homepage
- Location: tests\e2e\public-pages.spec.ts:34:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('footer')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('footer')

```

```yaml
- navigation "Main navigation":
  - link "Services":
    - /url: /services
  - link "About Us":
    - /url: /about
  - link "Gallery":
    - /url: /gallery
- heading "A Spotless Space. Total Transparency." [level=1]
- paragraph: Professional Residential & Commercial Cleaning in the Northern Suburbs.
- paragraph: From Durbanville to Brackenfell, we bring precision, reliability, and real-time tracking to every clean.
- button "Get a Quick Quote"
- link "Explore Our Services":
  - /url: /services
- 'heading "The \"Scratch Solid\" Advantage: Why Us?" [level=2]'
- paragraph: Cleaning with Nothing to Hide.
- paragraph: In an industry where trust is everything, we lead with transparency. Our custom platform keeps you in the loop from start to finish.
- heading "Real-Time Tracking" [level=3]
- paragraph: Watch your cleaner's status in real-time—from "On the Way" to "Completed"—using live geolocation.
- heading "Guaranteed Time on Site" [level=3]
- paragraph: Our Standard Clean includes 3 hours of active cleaning in a 4-hour window. No rushed jobs, ever.
- heading "Secure & Verified" [level=3]
- paragraph: We are POPIA compliant and secured by Cloudflare, ensuring your data and your home are in safe hands.
- heading "The Signature Finish" [level=3]
- paragraph: Every space is hand-checked and treated with our signature Fresh Lemon spray.
- heading "Our Specialized Services" [level=2]
- paragraph: "Quick links to your main offerings:"
- link "Residential & Office Weekly maintenance to keep life and work moving.":
  - /url: /services
  - heading "Residential & Office" [level=3]
  - paragraph: Weekly maintenance to keep life and work moving.
- link "LekkeSlaap Turnovers 5-star readiness for your Northern Suburbs guest stays.":
  - /url: /services
  - heading "LekkeSlaap Turnovers" [level=3]
  - paragraph: 5-star readiness for your Northern Suburbs guest stays.
- link "Move-In / Move-Out Heavy-duty deep cleans for a stress-free transition.":
  - /url: /services
  - heading "Move-In / Move-Out" [level=3]
  - paragraph: Heavy-duty deep cleans for a stress-free transition.
- heading "Areas We Service" [level=2]
- paragraph: Your Local Northern Suburbs Partner
- paragraph: "We are proud to serve:"
- text: Parow Plattekloof Durbanville Tygervalley Bellville Kuilsriver Brackenfell
- heading "Ready to see the difference transparency makes?" [level=2]
- paragraph: Get your Quick Quote via WhatsApp today.
- 'link "WhatsApp: +27 69 673 5947"':
  - /url: https://wa.me/27696735947
- 'link "Email: customerservice@scratchsolidsolutions.org"':
  - /url: mailto:customerservice@scratchsolidsolutions.org
- 'link "Social: @ScratchSolidSolutions"':
  - /url: https://instagram.com/ScratchSolidSolutions
- link "WhatsApp Booking":
  - /url: https://wa.me/27696735947
  - img
- button "Open menu":
  - img "Scratch Solid Logo"
- button "AI Assistant":
  - img
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
  22 |       expect(response!.status()).not.toBe(404);
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
> 37 |     await expect(footer).toBeVisible();
     |                          ^ Error: expect(locator).toBeVisible() failed
  38 |   });
  39 | });
  40 | 
```