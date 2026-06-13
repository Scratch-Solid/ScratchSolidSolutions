import { test, expect } from '@playwright/test';

test.describe('API Health', () => {
  test('/api/health returns 200', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });

  test('/api/status returns 200', async ({ request }) => {
    const response = await request.get('/api/status');
    expect(response.status()).toBe(200);
  });

  test('/api/content returns 200', async ({ request }) => {
    const response = await request.get('/api/content');
    expect(response.status()).toBe(200);
  });

  test('/api/pricing returns 200', async ({ request }) => {
    const response = await request.get('/api/pricing');
    expect(response.status()).toBe(200);
  });

  test('/api/services returns 200', async ({ request }) => {
    const response = await request.get('/api/services');
    expect(response.status()).toBe(200);
  });
});
