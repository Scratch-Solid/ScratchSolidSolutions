import { test, expect } from '@playwright/test';

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

/**
 * Comprehensive Page Load Tests
 * Every single public page in the internal portal.
 * Safe for production — read-only, no mutations.
 */

const PUBLIC_PAGES = [
  // Auth / Onboarding
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/send-verification',
  '/auth/change-password',
  '/auth/cleaner-login',
  '/auth/create-profile',
  '/auth/sign-contract',
  '/auth/contract',
  '/auth/consent-submitted',
  '/auth/employee-consent',
  '/signup/cleaner',
  '/cleaner-signup',
  '/contract-form',

  // Public dashboards (redirect to login if unauthenticated — still must not 500)
  '/admin-dashboard',
  '/cleaner-dashboard',
  '/cleaner-pre-dashboard',
  '/cleaner-training',
  '/digital-dashboard',
  '/supervisor-dashboard',
  '/transport-dashboard',
  '/notifications',
  '/payroll',
  '/accounting',

  // Admin sub-pages
  '/admin',
  '/admin/admin-approvals',
  '/admin/audit-logs',
  '/admin/content',
  '/admin/content-upload',
  '/admin/monitoring',
  '/admin/onboarding',
  '/admin/onboarding/analytics',
  '/admin/onboarding/pipeline',
  '/admin/roles',
  '/admin/security',
  '/admin-contracts-payroll',
];

test.describe('Portal Public Pages - No 500 Errors', () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} loads without 500`, async ({ page }) => {
      const response = await page.goto(`${PORTAL_URL}${path}`, { waitUntil: 'load', timeout: 30000 });
      // Allow 200, 307, 308 redirects, 401, 403 — just not 500
      expect(response?.status()).not.toBe(500);
      expect(response?.status()).not.toBe(502);
      expect(response?.status()).not.toBe(503);

      const bodyText = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
      expect(bodyText).not.toContain('Internal Server Error');
      expect(bodyText).not.toContain('Application error');
    });
  }
});

test.describe('Portal Pages - Content Verification', () => {
  test('Login page has username and password fields', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/auth/login`);
    await expect(page.locator('input[name="username"], input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Login page has "Become part of the team" CTA', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/auth/login`);
    await expect(page.locator('text=Become part of the team')).toBeVisible();
    await expect(page.locator('text=Apply Now')).toBeVisible();
  });

  test('Signup/cleaner page has POPIA consent checkboxes', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/signup/cleaner`);
    const checkboxes = page.locator('input[type="checkbox"]');
    expect(await checkboxes.count()).toBeGreaterThanOrEqual(2);
  });

  test('Employee consent redirects to signup/cleaner', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/auth/employee-consent`);
    await expect(page).toHaveURL(/\/signup\/cleaner/);
  });

  test('Admin onboarding analytics page renders structure', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/admin/onboarding/analytics`);
    await expect(page.locator('text=Onboarding Analytics')).toBeVisible();
  });

  test('Admin onboarding pipeline page renders', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/admin/onboarding/pipeline`);
    await expect(page.locator('text=Onboarding Pipeline')).toBeVisible();
  });

  test('Admin monitoring page renders', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/admin/monitoring`);
    await expect(page.locator('text=System Health')).toBeVisible();
  });
});
