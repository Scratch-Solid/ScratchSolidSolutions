/**
 * TRANSPORT ROLE — regression coverage for commit 3eab7942 ("bring
 * transport-dashboard to feature parity with digital-dashboard").
 *
 * Before that fix: transport-dashboard only showed a bare deliveries list,
 * and /api/staff/leave, /api/staff/leave/balance, /api/cleaner/payslips
 * all 403'd for the transport role (their allowed-role lists only included
 * 'digital'). Added after an audit found no test exercised the transport
 * role against any of these at all.
 *
 * Also covers the settings-gear-icon fix (commit 3ccf73b9): the gear link
 * is a single hardcoded href for every role, not role-conditional routing -
 * verified here for a non-admin role since the existing suite only ever
 * authenticates as admin.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://portal.scratchsolidsolutions.org';
const isProd = BASE_URL.includes('scratchsolidsolutions.org') && !BASE_URL.includes('staging');
const PAGE_TIMEOUT = isProd ? 60000 : 30000;

async function signupAndLoginTransport(request: any) {
  const suffix = Date.now();
  const email = `transporttest${suffix}@example.com`;
  const phone = `08${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
  const password = 'TestPass123!';

  const signupRes = await request.post(`${BASE_URL}/api/auth/signup`, {
    data: { name: 'Transport Test User', email, phone, password, role: 'transport' },
  });
  if (signupRes.status() === 429) { test.skip(true, 'Rate limited'); return null; }
  expect([200, 201]).toContain(signupRes.status());

  const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { identifier: email, password },
  });
  if (loginRes.status() === 429) { test.skip(true, 'Rate limited'); return null; }
  expect(loginRes.status()).toBe(200);
  const body = await loginRes.json();
  return { email, phone, token: body.token as string };
}

test.describe.configure({ mode: 'serial' });

let transportUser: { email: string; phone: string; token: string } | null = null;

test.beforeAll(async ({ request }) => {
  transportUser = await signupAndLoginTransport(request as any);
});

test.describe('🚚 Transport role — API access', () => {
  test('GET /api/staff/leave — transport role is allowed (was 403 before the fix)', async ({ request }) => {
    test.skip(!transportUser, 'Setup was rate limited');
    const res = await request.get(`${BASE_URL}/api/staff/leave`, {
      headers: { Authorization: `Bearer ${transportUser!.token}` },
    });
    if (res.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(res.status()).not.toBe(403);
    expect(res.status()).toBeLessThan(300);
  });

  test('GET /api/staff/leave/balance — transport role is allowed (was 403 before the fix)', async ({ request }) => {
    test.skip(!transportUser, 'Setup was rate limited');
    const res = await request.get(`${BASE_URL}/api/staff/leave/balance`, {
      headers: { Authorization: `Bearer ${transportUser!.token}` },
    });
    if (res.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(res.status()).not.toBe(403);
    expect(res.status()).toBeLessThan(300);
  });

  test('GET /api/cleaner/payslips — transport role is allowed (was 403 before the fix)', async ({ request }) => {
    test.skip(!transportUser, 'Setup was rate limited');
    const res = await request.get(`${BASE_URL}/api/cleaner/payslips`, {
      headers: { Authorization: `Bearer ${transportUser!.token}` },
    });
    if (res.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(res.status()).not.toBe(403);
    expect(res.status()).toBeLessThan(300);
  });
});

test.describe('🚚 Transport role — dashboard UI', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!transportUser, 'Setup was rate limited');
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await page.evaluate((t: string) => {
      localStorage.setItem('authToken', t);
      localStorage.setItem('userRole', 'transport');
    }, transportUser!.token);
    await page.goto(`${BASE_URL}/transport-dashboard`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
  });

  test('KPI, Payslips, and Leave tabs render for an authenticated transport user', async ({ page }) => {
    await expect(page.locator('button:has-text("Deliveries")')).toBeVisible({ timeout: PAGE_TIMEOUT });

    await page.locator('button:has-text("KPI")').click();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();

    await page.locator('button:has-text("Payslips")').click();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();

    await page.locator('button:has-text("Leave")').click();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
  });

  test('Settings gear icon links to change-password, not admin monitoring (regression: 3ccf73b9)', async ({ page }) => {
    const settingsLink = page.locator('a[aria-label="Settings"]');
    await expect(settingsLink).toHaveAttribute('href', '/auth/change-password');
  });
});
