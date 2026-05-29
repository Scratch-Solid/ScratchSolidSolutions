import { test, expect } from '@playwright/test';

test.describe('Training Integration', () => {
  test('Training completion updates staff table', async ({ request }) => {
    const response = await request.post('/api/staff/training', {
      data: { userId: 1, completed: true },
    });
    expect(response.ok()).toBeTruthy();
  });

  test('Training completion activates user', async ({ request }) => {
    const response = await request.post('/api/staff/training', {
      data: { userId: 1, completed: true },
    });
    const data = await response.json();
    expect(data.activated).toBe(true);
  });
});
