import { test, expect } from '@playwright/test';

test.describe('Training Integration', () => {
  test('Training modules API exists and does not 500', async ({ request }) => {
    const response = await request.get('/api/training/modules');
    expect(response.status()).not.toBe(500);
    expect(response.status()).not.toBe(502);
    expect(response.status()).not.toBe(503);
  });

  test('Cleaner training status API exists and does not 500', async ({ request }) => {
    const response = await request.get('/api/cleaner/training');
    expect(response.status()).not.toBe(500);
    expect(response.status()).not.toBe(502);
    expect(response.status()).not.toBe(503);
  });
});
