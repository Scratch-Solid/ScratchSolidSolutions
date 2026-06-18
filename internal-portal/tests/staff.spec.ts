import { test, expect } from '@playwright/test';

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

test.describe('Staff Table Population', () => {
  test('Create-profile API rejects incomplete payload without 500', async ({ request }) => {
    const response = await request.post(`${PORTAL_URL}/api/auth/create-profile`, {
      data: {
        firstName: 'Test',
        lastName: 'Staff',
        // Missing required fields: residentialAddress, cellphone, password, confirmPassword, profilePicture
      },
    });
    expect(response.status()).not.toBe(500);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Staff overview API exists and does not 500', async ({ request }) => {
    const response = await request.get(`${PORTAL_URL}/api/admin/cleaners/overview`);
    expect(response.status()).not.toBe(500);
    expect(response.status()).not.toBe(502);
    expect(response.status()).not.toBe(503);
  });
});
