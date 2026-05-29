import { test, expect } from '@playwright/test';

test.describe('Staff Table Population', () => {
  test('Staff record is created on profile creation', async ({ request }) => {
    const response = await request.post('/api/auth/create-profile', {
      data: {
        fullName: 'Test Staff',
        address: '123 Test St',
        idNumber: '1234567890123',
        bankAccount: '1234567890',
        bankName: 'Test Bank',
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('staffId');
  });

  test('Department maps to correct pool_type', async ({ request }) => {
    const response = await request.post('/api/auth/create-profile', {
      data: {
        fullName: 'Test Staff',
        address: '123 Test St',
        idNumber: '1234567890123',
        bankAccount: '1234567890',
        bankName: 'Test Bank',
        department: 'cleaning',
      },
    });
    const data = await response.json();
    expect(data.poolType).toBe('INDIVIDUAL');
  });
});
