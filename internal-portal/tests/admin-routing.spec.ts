import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PORTAL_URL || 'http://localhost:3000';
const isProd = BASE_URL.includes('scratchsolidsolutions.org');
const PAGE_TIMEOUT = isProd ? 60000 : 30000;

/**
 * Internal Portal Routing Tests
 * Verifies navigation, redirects, and access control for admin routes
 */

test.describe('Portal Routing & Navigation', () => {
  // These pages redirect client-side in a useEffect (checking localStorage
  // then router.replace), so the URL isn't guaranteed to have changed yet
  // right after domcontentloaded - wait for it explicitly instead of
  // reading page.url() immediately.
  test('/admin redirects unauthenticated to login', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await page.waitForURL(/\/login/, { timeout: PAGE_TIMEOUT });
  });

  test('/admin/content redirects unauthenticated to login', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto(`${BASE_URL}/admin/content`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await page.waitForURL(/\/login/, { timeout: PAGE_TIMEOUT });
  });

  test('/admin-dashboard redirects unauthenticated to login', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto(`${BASE_URL}/admin-dashboard`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await page.waitForURL(/\/login/, { timeout: PAGE_TIMEOUT });
  });

  test('Cleaner dashboard redirects unauthenticated to login', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto(`${BASE_URL}/cleaner-dashboard`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    // Cleaners have their own dedicated /auth/cleaner-login page (distinct
    // from /auth/login), so match "login" generically rather than "/login".
    await page.waitForURL(/login/, { timeout: PAGE_TIMEOUT });
  });

  test('Login page loads with correct routing', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    expect(await page.locator('body').innerText()).toContain('Sign in');
    expect(await page.locator('body').innerText()).toContain('Paysheet code or email');
  });

  test('Cleaner signup page is publicly accessible', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    const response = await page.goto(`${BASE_URL}/signup/cleaner`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    expect(response?.status()).not.toBe(500);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Internal Server Error');
  });

  test('Auth pages do not have broken navigation links', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });

    // Check for any links that return 500
    const links = await page.locator('a[href^="/"]').all();
    for (const link of links.slice(0, 10)) {
      const href = await link.getAttribute('href');
      if (!href || href.startsWith('//')) continue;
      const response = await page.request.get(`${BASE_URL}${href}`);
      expect(response.status()).toBeLessThan(500);
    }
  });
});
