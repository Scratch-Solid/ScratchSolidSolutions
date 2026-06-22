import { test, expect } from '@playwright/test';

const PUBLIC_PAGES = [
  { path: '/', titleContains: 'Scratch' },
  { path: '/services', titleContains: 'Service' },
  { path: '/book', titleContains: 'Book' },
  { path: '/contact', titleContains: 'Contact' },
  { path: '/login', titleContains: 'Login' },
  { path: '/client-signup', titleContains: 'Sign' },
  { path: '/forgot-password', titleContains: 'Forgot' },
  { path: '/gallery', titleContains: 'Gallery' },
  { path: '/privacy', titleContains: 'Privacy' },
  { path: '/terms', titleContains: 'Terms' },
];

const isProd = (process.env.CI || '').includes('scratchsolidsolutions');
const PAGE_TIMEOUT = isProd ? 60000 : 30000;

test.describe('Public Pages', () => {
  for (const page of PUBLIC_PAGES) {
    test(`${page.path} renders without 500`, async ({ page: p }) => {
      test.setTimeout(PAGE_TIMEOUT);
      const response = await p.goto(page.path, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
      expect(response).not.toBeNull();
      expect(response!.status()).toBeLessThan(500);
      expect(response!.status()).not.toBe(404);
      const body = await p.locator('body').innerText();
      expect(body).not.toContain('Internal Server Error');
    });
  }

  test('Navigation menu works', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav, header');
    await expect(nav).toBeVisible();
  });

  test('Footer is present on homepage', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});
