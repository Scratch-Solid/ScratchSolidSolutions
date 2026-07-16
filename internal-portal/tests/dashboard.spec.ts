import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PORTAL_URL || 'http://localhost:3000';
const isProd = (process.env.PORTAL_URL || '').includes('scratchsolidsolutions.org') && !(process.env.PORTAL_URL || '').includes('staging');
const PAGE_TIMEOUT = isProd ? 60000 : 30000;

// Admin accounts can no longer be created via public signup (role=admin was
// removed there 2026-07-16 - it was a privilege-escalation hole this test was
// unintentionally exploiting against production every run). These tests need
// a pre-provisioned admin account's credentials, and are skipped entirely
// against production.
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

async function loginAsAdmin(page: any, request: any) {
  const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { identifier: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD },
    headers: { 'Content-Type': 'application/json' }
  });
  if (loginRes.status() === 429) { test.skip(true, 'Rate limited'); return null; }

  const loginBody = await loginRes.json();
  const token = loginBody.token;

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
  await page.evaluate((t: string) => {
    localStorage.setItem('authToken', t);
    localStorage.setItem('userRole', 'admin');
  }, token);

  return token;
}

test.describe('Admin Dashboard Tests', () => {
  test.beforeEach(() => {
    test.skip(isProd, 'Admin-authenticated flows are not exercised against production');
    test.skip(!E2E_ADMIN_EMAIL || !E2E_ADMIN_PASSWORD, 'E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD not configured');
  });

  test('Pipeline page loads with applicants', async ({ page, request }) => {
    test.setTimeout(PAGE_TIMEOUT + 20000);
    await loginAsAdmin(page, request);
    await page.goto(`${BASE_URL}/admin/onboarding/pipeline`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await expect(page.locator('text=Onboarding Pipeline')).toBeVisible();
  });

  test('Analytics page displays funnel data', async ({ page, request }) => {
    test.setTimeout(PAGE_TIMEOUT + 20000);
    await loginAsAdmin(page, request);
    await page.goto(`${BASE_URL}/admin/onboarding/analytics`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await expect(page.locator('text=Onboarding Analytics')).toBeVisible();
  });

  test('Monitoring page shows health status', async ({ page, request }) => {
    test.setTimeout(PAGE_TIMEOUT + 20000);
    await loginAsAdmin(page, request);
    await page.goto(`${BASE_URL}/admin/monitoring`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await expect(page.locator('text=System Health')).toBeVisible();
  });
});
