# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: negative.spec.ts >> Negative Test Cases >> Invalid phone number is rejected
- Location: tests\negative.spec.ts:4:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 404
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Negative Test Cases', () => {
  4  |   test('Invalid phone number is rejected', async ({ request }) => {
  5  |     const response = await request.post('/api/auth/consent', {
  6  |       data: { name: 'Test', phone: 'invalid', email: 'test@test.com', department: 'cleaning' },
  7  |     });
> 8  |     expect(response.status()).toBe(400);
     |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  9  |   });
  10 | 
  11 |   test('Missing required fields returns error', async ({ request }) => {
  12 |     const response = await request.post('/api/auth/create-profile', {
  13 |       data: { fullName: 'Test' },
  14 |     });
  15 |     expect(response.status()).toBe(400);
  16 |   });
  17 | 
  18 |   test('Unauthorized access is blocked', async ({ request }) => {
  19 |     const response = await request.get('/api/admin/onboarding/pipeline');
  20 |     expect(response.status()).toBe(401);
  21 |   });
  22 | 
  23 |   test('Invalid JWT token is rejected', async ({ request }) => {
  24 |     const response = await request.get('/api/auth/check-onboarding-stage', {
  25 |       headers: { Authorization: 'Bearer invalid_token' },
  26 |     });
  27 |     expect(response.status()).toBe(401);
  28 |   });
  29 | });
  30 | 
```