# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: booking.spec.ts >> Booking Pages >> Services page lists offerings
- Location: tests\e2e\booking.spec.ts:4:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - generic [ref=e3]:
      - link "Home" [ref=e4] [cursor=pointer]:
        - /url: /
      - link "Services" [ref=e5] [cursor=pointer]:
        - /url: /services
      - link "About Us" [ref=e6] [cursor=pointer]:
        - /url: /about
      - link "Gallery" [ref=e7] [cursor=pointer]:
        - /url: /gallery
  - generic [ref=e9]:
    - generic:
      - img
    - heading "Our Services" [level=1] [ref=e10]
    - paragraph [ref=e12]: At Scratch Solid Solutions, we provide more than just a clean space—we provide peace of mind. Whether you need a quick weekly reset or a heavy-duty deep clean, our teams bring precision and care to every property across the Northern Suburbs.
    - generic [ref=e13]:
      - heading "1. Choose Your Level of Clean" [level=2] [ref=e14]
      - paragraph [ref=e15]: We offer two primary cleaning tiers to suit your needs and budget.
      - generic [ref=e16]:
        - button "See details for Maintenance Clean" [ref=e17] [cursor=pointer]:
          - generic [ref=e18]:
            - generic [ref=e19]:
              - generic [ref=e20]: 🧹
              - heading "Maintenance Clean" [level=3] [ref=e21]
              - paragraph [ref=e22]: Weekly or bi-weekly visits
              - paragraph [ref=e23]: Tap to see details
            - generic [ref=e24]:
              - heading "Maintenance Clean - What We Clean" [level=3] [ref=e25]
              - generic [ref=e26]:
                - paragraph [ref=e27]: Your home/office reset. Book weekly or bi-weekly.
                - strong [ref=e29]: "All Areas:"
                - generic [ref=e30]: ✓ Floors mopped
                - generic [ref=e31]: ✓ Surfaces dusted
                - generic [ref=e32]: ✓ Skirting boards wiped
                - generic [ref=e33]: ✓ Light switches & handles disinfected
                - generic [ref=e34]: ✓ Bins emptied + new bags
                - generic [ref=e35]: ✓ Windowsills wiped
                - strong [ref=e37]: "Kitchen:"
                - generic [ref=e38]: ✓ Sink scrubbed + taps polished
                - generic [ref=e39]: ✓ Counters & stovetop wiped
                - generic [ref=e40]: ✓ Outside appliances wiped
                - generic [ref=e41]: ✓ Splashback degreased
                - strong [ref=e43]: "Bathrooms:"
                - generic [ref=e44]: ✓ Toilet cleaned + disinfected
                - generic [ref=e45]: ✓ Shower/bath scrubbed
                - generic [ref=e46]: ✓ Sink, taps & counters wiped
                - generic [ref=e47]: ✓ Mirrors streak-free
                - generic [ref=e48]: ✓ Floors mopped incl. behind doors
                - strong [ref=e50]: "Bedrooms:"
                - generic [ref=e51]: ✓ Dusted incl. tops of cupboards
                - generic [ref=e52]: ✓ Floors mopped + under bed edges
                - generic [ref=e53]: ✓ Mirrors/glass wiped
                - strong [ref=e55]: "Final Touches:"
                - generic [ref=e56]: ✓ Fresh lemon final touch spray
                - generic [ref=e57]: ✓ Toilet paper folded 💚
                - generic [ref=e58]: ✓ Home secured as found
                - generic [ref=e59]: "Note: Inside cupboards, ovens, fridges, windows & vacuum covered in Deep Clean."
              - paragraph [ref=e60]: Tap to flip back
        - button "See details for Deep Clean" [ref=e61] [cursor=pointer]:
          - generic [ref=e62]:
            - generic [ref=e63]:
              - generic [ref=e64]: ✨
              - heading "Deep Clean" [level=3] [ref=e65]
              - paragraph [ref=e66]: First-time or seasonal resets
              - paragraph [ref=e67]: Tap to see details
            - generic [ref=e68]:
              - heading "Deep Clean - What We Clean" [level=3] [ref=e69]
              - generic [ref=e70]:
                - paragraph [ref=e71]: "Includes EVERYTHING from Maintenance Clean, PLUS:"
                - strong [ref=e73]: "Whole Home/Office:"
                - generic [ref=e74]: ✓ Inside all windows + frames + tracks
                - generic [ref=e75]: ✓ All doors + door frames wiped
                - generic [ref=e76]: ✓ Light fixtures & ceiling fans dusted
                - generic [ref=e77]: ✓ Blinds/window dressings dusted
                - generic [ref=e78]: ✓ High dusting - vents, tops of cupboards
                - generic [ref=e79]: ✓ Under & behind light furniture moved
                - strong [ref=e81]: "Kitchen Deep Additions:"
                - generic [ref=e82]: ✓ Inside oven + under stovetop
                - generic [ref=e83]: ✓ Inside fridge + freezer wiped
                - generic [ref=e84]: ✓ Inside all cupboards & drawers
                - generic [ref=e85]: ✓ Range hood filters degreased
                - generic [ref=e86]: ✓ Tile grout scrubbed
                - strong [ref=e88]: "Bathroom Deep Additions:"
                - generic [ref=e89]: ✓ Tile grout & silicone lines scrubbed
                - generic [ref=e90]: ✓ Shower heads descaled
                - generic [ref=e91]: ✓ Inside vanity cupboards wiped
                - generic [ref=e92]: ✓ Exhaust fans dusted
                - strong [ref=e94]: "Office Deep Additions:"
                - generic [ref=e95]: ✓ Carpets spot treated/steam cleaned
                - generic [ref=e96]: ✓ Office chairs vacuumed incl. under
                - generic [ref=e97]: ✓ Inside kitchenette cupboards
                - generic [ref=e98]: ✓ Computers/servers dusted - exterior
                - strong [ref=e100]: "Final Touches:"
                - generic [ref=e101]: ✓ Shower glass water-repellent treated
                - generic [ref=e102]: ✓ Bins deodorized with baking soda
                - generic [ref=e103]: ✓ Fresh lemon final touch spray
                - generic [ref=e104]: Your space reset to "like new". Recommend Deep Clean every 3-6 months.
              - paragraph [ref=e105]: Tap to flip back
    - generic [ref=e106]:
      - heading "2. Specialized Sectors" [level=2] [ref=e107]
      - paragraph [ref=e108]: Professional solutions tailored to your specific environment.
      - list [ref=e109]:
        - listitem [ref=e110]:
          - strong [ref=e111]: "Residential Spaces:"
          - text: Reliable, trustworthy care for your private home.
        - listitem [ref=e112]:
          - strong [ref=e113]: "Office & Commercial:"
          - text: Hygienic, professional environments for businesses and corporate workspaces.
        - listitem [ref=e114]:
          - strong [ref=e115]: "LekkeSlaap & Short-Term Stays:"
          - text: Five-star guest turnovers to ensure your local rental stays "Lekke."
        - listitem [ref=e116]:
          - strong [ref=e117]: "Move-In / Move-Out:"
          - text: High-intensity deep cleans to take the stress out of moving day.
    - generic [ref=e118]: Loading...
    - button "Request a Quote" [ref=e120]
  - generic [ref=e125] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e126]:
      - img [ref=e127]
    - generic [ref=e130]:
      - button "Open issues overlay" [ref=e131]:
        - generic [ref=e132]:
          - generic [ref=e133]: "0"
          - generic [ref=e134]: "1"
        - generic [ref=e135]: Issue
      - button "Collapse issues badge" [ref=e136]:
        - img [ref=e137]
  - alert [ref=e139]
  - generic [ref=e141]:
    - paragraph [ref=e143]:
      - strong [ref=e144]: "Cookie Notice:"
      - text: We use essential cookies for authentication and session management. By continuing to use this site, you accept our use of cookies in accordance with our
      - link "Privacy Policy" [ref=e145] [cursor=pointer]:
        - /url: /privacy
      - text: .
    - generic [ref=e146]:
      - button "Decline" [ref=e147]
      - button "Accept" [ref=e148]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Booking Pages', () => {
  4  |   test('Services page lists offerings', async ({ page }) => {
  5  |     await page.goto('/services');
  6  |     await expect(page.locator('body')).not.toContainText('Internal Server Error');
  7  |     const cards = page.locator('[data-testid="service-card"], .service-card, article');
  8  |     const count = await cards.count();
> 9  |     expect(count).toBeGreaterThan(0);
     |                   ^ Error: expect(received).toBeGreaterThan(expected)
  10 |   });
  11 | 
  12 |   test('Pricing page loads without error', async ({ page }) => {
  13 |     const response = await page.goto('/pricing');
  14 |     expect(response!.status()).toBeLessThan(500);
  15 |     const body = await page.locator('body').innerText();
  16 |     expect(body).not.toContain('Internal Server Error');
  17 |   });
  18 | });
  19 | 
```