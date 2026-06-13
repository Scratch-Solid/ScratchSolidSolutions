# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-pages.spec.ts >> Public Pages >> Navigation menu works
- Location: tests\e2e\public-pages.spec.ts:28:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('nav, header')
Expected: visible
Error: strict mode violation: locator('nav, header') resolved to 2 elements:
    1) <nav role="navigation" aria-label="Main navigation" class="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg z-40 px-2 sm:px-4 py-2 sm:py-3">…</nav> aka getByRole('navigation', { name: 'Main navigation' })
    2) <nav class="error-overlay-pagination dialog-exclude-closing-from-outside-click">…</nav> aka locator('nav').filter({ hasText: '/1' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('nav, header')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation "Main navigation" [ref=e3]:
      - generic [ref=e4]:
        - link "Services" [ref=e5] [cursor=pointer]:
          - /url: /services
        - link "About Us" [ref=e6] [cursor=pointer]:
          - /url: /about
        - link "Gallery" [ref=e7] [cursor=pointer]:
          - /url: /gallery
    - generic [ref=e9]:
      - heading "A Spotless Space. Total Transparency." [level=1] [ref=e10]
      - paragraph [ref=e11]: Professional Residential & Commercial Cleaning in the Northern Suburbs.
      - paragraph [ref=e12]: From Durbanville to Brackenfell, we bring precision, reliability, and real-time tracking to every clean.
      - generic [ref=e13]:
        - button "Get a Quick Quote" [ref=e14]
        - link "Explore Our Services" [ref=e15] [cursor=pointer]:
          - /url: /services
    - generic [ref=e17]:
      - 'heading "The \"Scratch Solid\" Advantage: Why Us?" [level=2] [ref=e18]'
      - paragraph [ref=e19]: Cleaning with Nothing to Hide.
      - paragraph [ref=e20]: In an industry where trust is everything, we lead with transparency. Our custom platform keeps you in the loop from start to finish.
      - generic [ref=e21]:
        - generic [ref=e22]:
          - heading "Real-Time Tracking" [level=3] [ref=e23]
          - paragraph [ref=e24]: Watch your cleaner's status in real-time—from "On the Way" to "Completed"—using live geolocation.
        - generic [ref=e25]:
          - heading "Guaranteed Time on Site" [level=3] [ref=e26]
          - paragraph [ref=e27]: Our Standard Clean includes 3 hours of active cleaning in a 4-hour window. No rushed jobs, ever.
        - generic [ref=e28]:
          - heading "Secure & Verified" [level=3] [ref=e29]
          - paragraph [ref=e30]: We are POPIA compliant and secured by Cloudflare, ensuring your data and your home are in safe hands.
        - generic [ref=e31]:
          - heading "The Signature Finish" [level=3] [ref=e32]
          - paragraph [ref=e33]: Every space is hand-checked and treated with our signature Fresh Lemon spray.
    - generic [ref=e35]:
      - heading "Our Specialized Services" [level=2] [ref=e36]
      - paragraph [ref=e37]: "Quick links to your main offerings:"
      - generic [ref=e38]:
        - link "Residential & Office Weekly maintenance to keep life and work moving." [ref=e39] [cursor=pointer]:
          - /url: /services
          - heading "Residential & Office" [level=3] [ref=e40]
          - paragraph [ref=e41]: Weekly maintenance to keep life and work moving.
        - link "LekkeSlaap Turnovers 5-star readiness for your Northern Suburbs guest stays." [ref=e42] [cursor=pointer]:
          - /url: /services
          - heading "LekkeSlaap Turnovers" [level=3] [ref=e43]
          - paragraph [ref=e44]: 5-star readiness for your Northern Suburbs guest stays.
        - link "Move-In / Move-Out Heavy-duty deep cleans for a stress-free transition." [ref=e45] [cursor=pointer]:
          - /url: /services
          - heading "Move-In / Move-Out" [level=3] [ref=e46]
          - paragraph [ref=e47]: Heavy-duty deep cleans for a stress-free transition.
    - generic [ref=e49]:
      - heading "Areas We Service" [level=2] [ref=e50]
      - paragraph [ref=e51]: Your Local Northern Suburbs Partner
      - paragraph [ref=e52]: "We are proud to serve:"
      - generic [ref=e53]:
        - generic [ref=e54]: Parow
        - generic [ref=e55]: Plattekloof
        - generic [ref=e56]: Durbanville
        - generic [ref=e57]: Tygervalley
        - generic [ref=e58]: Bellville
        - generic [ref=e59]: Kuilsriver
        - generic [ref=e60]: Brackenfell
    - generic [ref=e62]:
      - heading "Ready to see the difference transparency makes?" [level=2] [ref=e63]
      - paragraph [ref=e64]: Get your Quick Quote via WhatsApp today.
      - generic [ref=e65]:
        - 'link "WhatsApp: +27 69 673 5947" [ref=e66] [cursor=pointer]':
          - /url: https://wa.me/27696735947
          - generic [ref=e67]: "WhatsApp:"
          - text: +27 69 673 5947
        - 'link "Email: customerservice@scratchsolidsolutions.org" [ref=e68] [cursor=pointer]':
          - /url: mailto:customerservice@scratchsolidsolutions.org
          - generic [ref=e69]: "Email:"
          - text: customerservice@scratchsolidsolutions.org
        - 'link "Social: @ScratchSolidSolutions" [ref=e70] [cursor=pointer]':
          - /url: https://instagram.com/ScratchSolidSolutions
          - generic [ref=e71]: "Social:"
          - text: "@ScratchSolidSolutions"
    - link "WhatsApp Booking" [ref=e72] [cursor=pointer]:
      - /url: https://wa.me/27696735947
      - img [ref=e73]
    - button "Open menu" [ref=e77]:
      - img "Scratch Solid Logo" [ref=e78]
    - button "AI Assistant" [ref=e80]:
      - img [ref=e81]
  - generic [ref=e87] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e88]:
      - img [ref=e89]
    - generic [ref=e92]:
      - button "Open issues overlay" [ref=e93]:
        - generic [ref=e94]:
          - generic [ref=e95]: "0"
          - generic [ref=e96]: "1"
        - generic [ref=e97]: Issue
      - button "Collapse issues badge" [ref=e98]:
        - img [ref=e99]
  - alert [ref=e101]
  - generic [ref=e103]:
    - paragraph [ref=e105]:
      - strong [ref=e106]: "Cookie Notice:"
      - text: We use essential cookies for authentication and session management. By continuing to use this site, you accept our use of cookies in accordance with our
      - link "Privacy Policy" [ref=e107] [cursor=pointer]:
        - /url: /privacy
      - text: .
    - generic [ref=e108]:
      - button "Decline" [ref=e109]
      - button "Accept" [ref=e110]
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
> 31 |     await expect(nav).toBeVisible();
     |                       ^ Error: expect(locator).toBeVisible() failed
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