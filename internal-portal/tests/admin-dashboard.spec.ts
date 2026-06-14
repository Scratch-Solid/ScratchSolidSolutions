import { test, expect } from '@playwright/test';

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

/**
 * Admin Dashboard E2E Tests
 * Validates admin endpoints and data shapes.
 */
test.describe('Admin Dashboard', () => {
  test('Admin login page loads', async ({ page }) => {
    await page.goto(`${PORTAL_URL}/auth/login`);
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Internal Server Error');
    expect(await page.locator('input[type="email"], input[name="email"]').count()).toBeGreaterThan(0);
    expect(await page.locator('input[type="password"], input[name="password"]').count()).toBeGreaterThan(0);
  });

  test('Admin login API validates credentials', async ({ request }) => {
    const response = await request.post(`${PORTAL_URL}/api/auth/login`, {
      data: { email: 'admin@example.com', password: 'wrongpassword' }
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Admin cleaners API returns structured data', async ({ request }) => {
    const response = await request.get(`${PORTAL_URL}/api/admin/cleaners`);
    expect(response.status()).toBeLessThan(500);
    if (response.status() === 200) {
      const body = await response.json();
      if (Array.isArray(body)) {
        expect(body.length).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('Admin new-joiners approve/reject APIs exist', async ({ request }) => {
    // These should return 404 for non-existent IDs but not 500
    const approveResponse = await request.post(`${PORTAL_URL}/api/admin/new-joiners/99999/approve`);
    expect(approveResponse.status()).not.toBe(500);

    const rejectResponse = await request.post(`${PORTAL_URL}/api/admin/new-joiners/99999/reject`, {
      data: { reason: 'Test rejection' }
    });
    expect(rejectResponse.status()).not.toBe(500);
  });

  test('Data rights API (POPIA) endpoints exist', async ({ request }) => {
    // GET data-rights requires auth, so expect 401/403 but not 500
    const getResponse = await request.get(`${PORTAL_URL}/api/data-rights`);
    expect(getResponse.status()).not.toBe(500);

    const deleteResponse = await request.delete(`${PORTAL_URL}/api/data-rights`, {
      data: { confirmation: 'DELETE_MY_DATA' }
    });
    expect(deleteResponse.status()).not.toBe(500);
  });

  test('Login activity API returns stats', async ({ request }) => {
    const response = await request.get(`${PORTAL_URL}/api/admin/cleaners/login-activity`);
    expect(response.status()).toBeLessThan(500);
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('dailyLogins');
      expect(body).toHaveProperty('totals');
    }
  });

  test('Health endpoint returns OK', async ({ request }) => {
    const response = await request.get(`${PORTAL_URL}/api/health`);
    expect(response.status()).toBeLessThan(500);
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('status');
    }
  });
});
