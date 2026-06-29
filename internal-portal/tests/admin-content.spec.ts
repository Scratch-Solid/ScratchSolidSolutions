import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PORTAL_URL || 'http://localhost:3000';
const isProd = BASE_URL.includes('scratchsolidsolutions.org');
const PAGE_TIMEOUT = isProd ? 60000 : 30000;
const DELAY = isProd ? 3000 : 500;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Internal Portal Admin Content CRUD Tests
 * Tests the content management flow via /admin/content-upload
 * which proxies to marketing site via /api/marketing/content
 */

test.describe.serial('Admin Content Management', () => {
  test('Unauthenticated user is redirected from admin content', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto(`${BASE_URL}/admin/content`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    // Should redirect to login when no auth token
    await expect(page).toHaveURL(/\/login/, { timeout: PAGE_TIMEOUT });
  });

  test('Admin can login and access content upload page', async ({ page, request }) => {
    test.setTimeout(PAGE_TIMEOUT + 20000);

    // First, create a test admin user via signup if not exists (or use existing)
    const uniqueEmail = `test-admin-${Date.now()}@example.com`;

    // Signup as admin
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

    if (signupRes.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect([200, 201, 409]).toContain(signupRes.status());

    await sleep(DELAY);

    // Login
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        identifier: uniqueEmail,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    if (loginRes.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    const token = loginBody.token;
    expect(token).toBeTruthy();

    // Set auth state in page
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await page.evaluate((t) => {
      localStorage.setItem('authToken', t);
      localStorage.setItem('userRole', 'admin');
    }, token);

    // Navigate to content upload
    await page.goto(`${BASE_URL}/admin/content-upload`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Content Upload');
    expect(bodyText).not.toContain('Internal Server Error');

    // Verify form elements exist
    await expect(page.locator('select#type')).toBeVisible();
    await expect(page.locator('textarea#content')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await sleep(DELAY);
  });

  test('Admin can load and update privacy policy content', async ({ page, request }) => {
    test.setTimeout(PAGE_TIMEOUT + 20000);

    const uniqueEmail = `test-admin-${Date.now()}@example.com`;

    // Signup
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
    if (signupRes.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect([200, 201, 409]).toContain(signupRes.status());

    await sleep(DELAY);

    // Login
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { identifier: uniqueEmail, password: 'TestPass123!' },
      headers: { 'Content-Type': 'application/json' }
    });
    if (loginRes.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    const token = loginBody.token;

    // Set auth state
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await page.evaluate((t) => {
      localStorage.setItem('authToken', t);
      localStorage.setItem('userRole', 'admin');
    }, token);

    // Navigate to content upload
    await page.goto(`${BASE_URL}/admin/content-upload`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });

    // Select privacy type
    await page.selectOption('select#type', 'privacy');
    await sleep(2000);

    // Fill content
    const testContent = `Privacy Policy Test Content - ${Date.now()}`;
    await page.fill('textarea#content', testContent);
    await page.fill('input#title', 'Test Privacy Policy');

    // Submit form
    await page.click('button[type="submit"]');
    await sleep(2000);

    // Verify success message
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('updated successfully');

    await sleep(DELAY);
  });
});
