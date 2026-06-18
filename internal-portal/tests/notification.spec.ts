import { test, expect } from '@playwright/test';

test.describe('Notification Tests', () => {
  test('Notifications API exists and does not 500', async ({ request }) => {
    const response = await request.get('/api/notifications');
    expect(response.status()).not.toBe(500);
    expect(response.status()).not.toBe(502);
    expect(response.status()).not.toBe(503);
  });

  test('Notification preferences API rejects unauthenticated without 500', async ({ request }) => {
    const response = await request.post('/api/user/notifications/preferences', {
      data: { whatsappEnabled: false, emailEnabled: true },
    });
    expect(response.status()).not.toBe(500);
    expect(response.status()).not.toBe(502);
    expect(response.status()).not.toBe(503);
  });
});
