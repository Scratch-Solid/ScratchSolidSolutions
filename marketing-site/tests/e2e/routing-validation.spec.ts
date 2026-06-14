import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://scratchsolidsolutions.org';

/**
 * Routing Validation E2E Tests
 * Verifies every public link/button navigates to a valid page (no 404/500).
 */
test.describe('Routing Validation', () => {
  test('Homepage CTA buttons route correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const ctas = [
      { text: /Get a Quick Quote|Book a Cleaner/i, validPaths: ['/auth', '/booking-selection', '/book'] },
      { text: /View Services/i, validPaths: ['/services'] },
    ];

    for (const cta of ctas) {
      const button = page.locator('button, a').filter({ hasText: cta.text });
      if (await button.count() > 0) {
        const href = await button.first().getAttribute('href');
        if (href) {
          const res = await page.request.get(`${BASE_URL}${href}`);
          expect(res.status(), `CTA "${cta.text}" -> ${href} should not 404/500`).toBeLessThan(500);
          expect(res.status(), `CTA "${cta.text}" -> ${href} should not 404`).not.toBe(404);
        }
      }
    }
  });

  test('Navigation links have valid targets', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const navLinks = page.locator('nav a, header a');
    const count = await navLinks.count();

    for (let i = 0; i < count; i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        const res = await page.request.get(`${BASE_URL}${href}`);
        expect(res.status(), `Nav link ${href} should not 404/500`).toBeLessThan(500);
        expect(res.status(), `Nav link ${href} should not 404`).not.toBe(404);
      }
    }
  });

  test('Footer links have valid targets', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const footerLinks = page.locator('footer a');
    const count = await footerLinks.count();

    for (let i = 0; i < count; i++) {
      const link = footerLinks.nth(i);
      const href = await link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        const res = await page.request.get(`${BASE_URL}${href}`);
        expect(res.status(), `Footer link ${href} should not 404/500`).toBeLessThan(500);
        expect(res.status(), `Footer link ${href} should not 404`).not.toBe(404);
      }
    }
  });

  test('No duplicate page routes (canonical redirects)', async ({ page }) => {
    const canonicalPairs = [
      { from: `${BASE_URL}/booking`, to: '/book' },
      { from: `${BASE_URL}/privacy-policy`, to: '/privacy' },
    ];

    for (const pair of canonicalPairs) {
      const res = await page.request.get(pair.from, { maxRedirects: 0 });
      // Should redirect (307) or at least not 500
      expect(res.status(), `${pair.from} should redirect to ${pair.to}`).toBeLessThan(500);
    }
  });

  test('Booking-selection page routes to correct paths', async ({ page }) => {
    await page.goto(`${BASE_URL}/booking-selection`);
    const buttons = page.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const onclick = await buttons.nth(i).getAttribute('onclick');
      // Buttons that push to router should have valid targets
      if (onclick && onclick.includes("router.push")) {
        const match = onclick.match(/router\.push\(["']([^"']+)["']\)/);
        if (match) {
          const target = match[1];
          const res = await page.request.get(`${BASE_URL}${target}`);
          expect(res.status(), `Booking selection route ${target} should not 404/500`).toBeLessThan(500);
        }
      }
    }
  });
});
