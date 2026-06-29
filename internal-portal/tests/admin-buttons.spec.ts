import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PORTAL_URL || 'http://localhost:3000';
const isProd = BASE_URL.includes('scratchsolidsolutions.org');
const PAGE_TIMEOUT = isProd ? 60000 : 30000;
const DELAY = isProd ? 3000 : 500;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Internal Portal Button & Interaction Tests
 * Verifies key buttons, forms, and interactive elements on admin pages
 */

test.describe.serial('Admin Page Buttons & Flows', () => {
  test('Login form has all required fields and submit button', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });

    // Username/identifier input
    const identifierInput = page.locator('input[name="identifier"], input[name="username"], input[type="text"]').first();
    await expect(identifierInput).toBeVisible();

    // Password input
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    // Submit button
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    // "Become part of the team" CTA link/button
    const cta = page.locator('text=Apply Now, text=Become part of the team').first();
    if (await cta.isVisible().catch(() => false)) {
      expect(await cta.isEnabled()).toBeTruthy();
    }
  });

  test('Cleaner signup form has POPIA checkboxes and submit button', async ({ page }) => {
    test.setTimeout(PAGE_TIMEOUT);
    await page.goto(`${BASE_URL}/signup/cleaner`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });

    // POPIA consent checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Submit button
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
  });

  test('Admin onboarding pipeline page has expected buttons', async ({ page, request }) => {
    test.setTimeout(PAGE_TIMEOUT + 20000);

    // Create and authenticate admin user
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
    if (signupRes.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect([200, 201, 409]).toContain(signupRes.status());

    await sleep(DELAY);

    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { identifier: uniqueEmail, password: 'TestPass123!' },
      headers: { 'Content-Type': 'application/json' }
    });
    if (loginRes.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    const token = loginBody.token;

    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
    await page.evaluate((t) => {
      localStorage.setItem('authToken', t);
      localStorage.setItem('userRole', 'admin');
    }, token);

    await page.goto(`${BASE_URL}/admin/onboarding/pipeline`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Onboarding Pipeline');
  });

  test('Content upload page form fields are interactive', async ({ page, request }) => {
    test.setTimeout(PAGE_TIMEOUT + 20000);

    // Create admin user
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

    // Type selector is interactive
    const typeSelect = page.locator('select#type');
    await expect(typeSelect).toBeVisible();
    await typeSelect.selectOption('terms');

    // Content textarea is interactive
    const contentArea = page.locator('textarea#content');
    await expect(contentArea).toBeVisible();
    await contentArea.fill('Test terms content');

    // Title input is interactive
    const titleInput = page.locator('input#title');
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill('Test Terms');
    }

    // Submit button is clickable
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();

    await sleep(DELAY);
  });
});
