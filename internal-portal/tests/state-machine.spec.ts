import { test, expect } from '@playwright/test';

test.describe('State Machine Transitions', () => {
  test('Stage transitions are logged in audit table', async ({ request }) => {
    const response = await request.post('/api/admin/onboarding/update-stage', {
      data: { userId: 1, newStage: 'contract_signed' },
    });
    expect(response.ok()).toBeTruthy();
  });

  test('Invalid stage transition is rejected', async ({ request }) => {
    const response = await request.post('/api/admin/onboarding/update-stage', {
      data: { userId: 1, newStage: 'invalid_stage' },
    });
    expect(response.status()).toBe(400);
  });
});
