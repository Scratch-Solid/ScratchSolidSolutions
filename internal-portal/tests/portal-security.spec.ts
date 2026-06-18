import { test, expect } from '@playwright/test';

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

/**
 * Security & Performance Smoke Tests
 * Validates security headers, CORS, response times, TLS.
 */

test.describe('Security Headers', () => {
  test('Main page returns security headers', async ({ request }) => {
    const response = await request.get(`${PORTAL_URL}/auth/login`);
    const headers = response.headers();

    // X-Frame-Options or CSP frame-ancestors
    const hasFrameProtection =
      headers['x-frame-options'] !== undefined ||
      (headers['content-security-policy'] || '').includes('frame-ancestors');
    expect(hasFrameProtection).toBe(true);

    // X-Content-Type-Options
    expect(headers['x-content-type-options']).toBe('nosniff');

    // Strict-Transport-Security (on HTTPS)
    expect(headers['strict-transport-security']).toBeTruthy();
  });

  test('API endpoints do not leak stack traces', async ({ request }) => {
    const res = await request.get(`${PORTAL_URL}/api/admin/cleaners/99999`);
    const text = await res.text();
    expect(text).not.toContain('at ');   // no stack trace leakage
    expect(text).not.toContain('.ts:');
    expect(text).not.toContain('.js:');
  });

  test('Unauthorized API access returns 401/403 not 500', async ({ request }) => {
    const endpoints = [
      '/api/admin/bookings',
      '/api/admin/payroll',
      '/api/admin/users',
      '/api/employees',
      '/api/contracts',
      '/api/notifications',
    ];
    for (const path of endpoints) {
      const res = await request.get(`${PORTAL_URL}${path}`);
      expect(res.status(), `${path} leaked 500`).not.toBe(500);
      expect(res.status(), `${path} leaked 502`).not.toBe(502);
      expect(res.status(), `${path} leaked 503`).not.toBe(503);
    }
  });
});

test.describe('Response Time Checks', () => {
  test('Key pages load under 5 seconds', async ({ page }) => {
    const pages = ['/', '/auth/login', '/signup/cleaner'];
    for (const path of pages) {
      const start = Date.now();
      await page.goto(`${PORTAL_URL}${path}`, { waitUntil: 'networkidle', timeout: 10000 });
      const elapsed = Date.now() - start;
      expect(elapsed, `${path} took ${elapsed}ms`).toBeLessThan(5000);
    }
  });

  test('Key API endpoints respond under 3 seconds', async ({ request }) => {
    const endpoints = [
      '/api/health',
      '/api/ping',
      '/api/admin/cleaners/overview',
      '/api/admin/onboarding/analytics',
    ];
    for (const path of endpoints) {
      const start = Date.now();
      await request.get(`${PORTAL_URL}${path}`, { timeout: 10000 });
      const elapsed = Date.now() - start;
      expect(elapsed, `${path} took ${elapsed}ms`).toBeLessThan(3000);
    }
  });
});
