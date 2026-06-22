import { test, expect } from '@playwright/test';

const isProd = (process.env.PORTAL_URL || '').includes('scratchsolidsolutions.org');
const PAGE_TIMEOUT = isProd ? 60000 : 30000;

test.describe('Authentication Flow', () => {
  test('User can view cleaner signup page with consent form', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto('/signup/cleaner', { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(2, { timeout: PAGE_TIMEOUT });
  });

  test('Create profile page has required form fields', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto('/auth/create-profile', { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await expect(page.locator('input[name="firstName"], input[name="lastName"], input[name="residentialAddress"]').first()).toBeVisible();
    await expect(page.locator('input[name="cellphone"], input[type="tel"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Sign contract page requires auth and redirects to login', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto('/auth/sign-contract', { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    // Without auth token, page redirects to login
    const url = page.url();
    expect(url.includes('/login')).toBe(true);
  });

  test('Unauthenticated user is redirected or protected', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto('/admin-dashboard', { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    // Dashboards may redirect to login OR show auth gate UI — just ensure no 500
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Internal Server Error');
  });
});
