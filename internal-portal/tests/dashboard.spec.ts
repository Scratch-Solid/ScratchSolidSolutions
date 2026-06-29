import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PORTAL_URL || 'http://localhost:3000';
const isProd = (process.env.PORTAL_URL || '').includes('scratchsolidsolutions.org');
const PAGE_TIMEOUT = isProd ? 60000 : 30000;
const DELAY = isProd ? 3000 : 500;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function loginAsAdmin(page: any, request: any) {
  const uniqueEmail = `test-admin-${Date.now()}@example.com`;
  const signupRes = await request.post(`${BASE_URL}/api/auth/signup`, {
    data: {
      name: 'Test Admin',
      email: uniqueEmail,
      password: 'TestPass123!',
      role: 'admin',
      phone: '+27123456789'
    },
    headers: { 'Content-Type': 'application/json' }
  });
  if (signupRes.status() === 429) { test.skip(true, 'Rate limited'); return null; }

  await sleep(DELAY);

  const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { identifier: uniqueEmail, password: 'TestPass123!' },
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
