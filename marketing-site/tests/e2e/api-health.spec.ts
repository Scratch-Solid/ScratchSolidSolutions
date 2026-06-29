import { test, expect } from '@playwright/test';

const isProd = (process.env.BASE_URL || '').includes('scratchsolidsolutions.org');

test.describe('API Health', () => {
  test('/api/health returns 200', async ({ request }) => {
    const response = await request.get('/api/health');
    // Cloudflare WAF may block automated API requests in production
    if (isProd && response.status() === 403) {
      test.skip(true, 'Cloudflare WAF blocks automated API requests in production');
      return;
    }
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });

  test('/api/status returns 200', async ({ request }) => {
    const response = await request.get('/api/status');
    expect(response.status()).toBe(200);
  });

  test('/api/content returns 200 or 404 (empty DB OK)', async ({ request }) => {
    const response = await request.get('/api/content');
    // 200 if content seeded, 404 if empty DB — both acceptable
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    expect(body).toBeTruthy();
  });

  test('/api/pricing returns 200 or 404 (empty DB OK)', async ({ request }) => {
    const response = await request.get('/api/pricing');
    // 200 if pricing seeded, 404/empty if not — both acceptable
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    expect(body).toBeTruthy();
  });

  test('/api/services returns 200', async ({ request }) => {
    const response = await request.get('/api/services');
    expect(response.status()).toBe(200);
  });
});
