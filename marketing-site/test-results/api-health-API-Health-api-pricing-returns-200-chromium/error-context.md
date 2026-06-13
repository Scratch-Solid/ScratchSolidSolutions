# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-health.spec.ts >> API Health >> /api/pricing returns 200
- Location: tests\e2e\api-health.spec.ts:21:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 500
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('API Health', () => {
  4  |   test('/api/health returns 200', async ({ request }) => {
  5  |     const response = await request.get('/api/health');
  6  |     expect(response.status()).toBe(200);
  7  |     const body = await response.json();
  8  |     expect(body).toHaveProperty('status');
  9  |   });
  10 | 
  11 |   test('/api/status returns 200', async ({ request }) => {
  12 |     const response = await request.get('/api/status');
  13 |     expect(response.status()).toBe(200);
  14 |   });
  15 | 
  16 |   test('/api/content returns 200', async ({ request }) => {
  17 |     const response = await request.get('/api/content');
  18 |     expect(response.status()).toBe(200);
  19 |   });
  20 | 
  21 |   test('/api/pricing returns 200', async ({ request }) => {
  22 |     const response = await request.get('/api/pricing');
> 23 |     expect(response.status()).toBe(200);
     |                               ^ Error: expect(received).toBe(expected) // Object.is equality
  24 |   });
  25 | 
  26 |   test('/api/services returns 200', async ({ request }) => {
  27 |     const response = await request.get('/api/services');
  28 |     expect(response.status()).toBe(200);
  29 |   });
  30 | });
  31 | 
```