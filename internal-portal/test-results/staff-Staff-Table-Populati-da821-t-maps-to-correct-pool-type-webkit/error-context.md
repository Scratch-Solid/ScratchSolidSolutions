# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: staff.spec.ts >> Staff Table Population >> Department maps to correct pool_type
- Location: tests\staff.spec.ts:19:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "INDIVIDUAL"
Received: undefined
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Staff Table Population', () => {
  4  |   test('Staff record is created on profile creation', async ({ request }) => {
  5  |     const response = await request.post('/api/auth/create-profile', {
  6  |       data: {
  7  |         fullName: 'Test Staff',
  8  |         address: '123 Test St',
  9  |         idNumber: '1234567890123',
  10 |         bankAccount: '1234567890',
  11 |         bankName: 'Test Bank',
  12 |       },
  13 |     });
  14 |     expect(response.ok()).toBeTruthy();
  15 |     const data = await response.json();
  16 |     expect(data).toHaveProperty('staffId');
  17 |   });
  18 | 
  19 |   test('Department maps to correct pool_type', async ({ request }) => {
  20 |     const response = await request.post('/api/auth/create-profile', {
  21 |       data: {
  22 |         fullName: 'Test Staff',
  23 |         address: '123 Test St',
  24 |         idNumber: '1234567890123',
  25 |         bankAccount: '1234567890',
  26 |         bankName: 'Test Bank',
  27 |         department: 'cleaning',
  28 |       },
  29 |     });
  30 |     const data = await response.json();
> 31 |     expect(data.poolType).toBe('INDIVIDUAL');
     |                           ^ Error: expect(received).toBe(expected) // Object.is equality
  32 |   });
  33 | });
  34 | 
```