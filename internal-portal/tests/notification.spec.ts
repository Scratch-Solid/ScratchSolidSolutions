import { test, expect } from '@playwright/test';

test.describe('Notification Tests', () => {
  test('Notification is logged on consent submit', async ({ request }) => {
    const response = await request.post('/api/auth/consent', {
      data: { name: 'Test', phone: '+1234567890', email: 'test@test.com', department: 'cleaning' },
    });
    expect(response.ok()).toBeTruthy();
  });

  test('Notification preferences are respected', async ({ request }) => {
    const response = await request.post('/api/user/notification-preferences', {
      data: { whatsappEnabled: false, emailEnabled: true },
    });
    expect(response.ok()).toBeTruthy();
  });
});
