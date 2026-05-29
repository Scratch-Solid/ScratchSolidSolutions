import { test, expect } from '@playwright/test';

test.describe('Negative Test Cases', () => {
  test('Invalid phone number is rejected', async ({ request }) => {
    const response = await request.post('/api/auth/consent', {
      data: { name: 'Test', phone: 'invalid', email: 'test@test.com', department: 'cleaning' },
    });
    expect(response.status()).toBe(400);
  });

  test('Missing required fields returns error', async ({ request }) => {
    const response = await request.post('/api/auth/create-profile', {
      data: { fullName: 'Test' },
    });
    expect(response.status()).toBe(400);
  });

  test('Unauthorized access is blocked', async ({ request }) => {
    const response = await request.get('/api/admin/onboarding/pipeline');
    expect(response.status()).toBe(401);
  });

  test('Invalid JWT token is rejected', async ({ request }) => {
    const response = await request.get('/api/auth/check-onboarding-stage', {
      headers: { Authorization: 'Bearer invalid_token' },
    });
    expect(response.status()).toBe(401);
  });
});
