import { test, expect } from '@playwright/test';

test.describe('State Machine Transitions', () => {
  test('Update-stage endpoint exists and does not 500', async ({ request }) => {
    const response = await request.post('/api/admin/onboarding/update-stage', {
      data: { userId: 1, newStage: 'contract_signed' },
    });
    expect(response.status()).not.toBe(500);
    expect(response.status()).not.toBe(502);
    expect(response.status()).not.toBe(503);
  });

  test('Invalid stage transition is rejected without 500', async ({ request }) => {
    const response = await request.post('/api/admin/onboarding/update-stage', {
      data: { userId: 1, newStage: 'invalid_stage' },
    });
    expect(response.status()).not.toBe(500);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
