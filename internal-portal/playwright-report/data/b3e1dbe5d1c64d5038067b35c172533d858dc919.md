# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: training.spec.ts >> Training Integration >> Training completion updates staff table
- Location: tests\training.spec.ts:4:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Training Integration', () => {
  4  |   test('Training completion updates staff table', async ({ request }) => {
  5  |     const response = await request.post('/api/staff/training', {
  6  |       data: { userId: 1, completed: true },
  7  |     });
> 8  |     expect(response.ok()).toBeTruthy();
     |                           ^ Error: expect(received).toBeTruthy()
  9  |   });
  10 | 
  11 |   test('Training completion activates user', async ({ request }) => {
  12 |     const response = await request.post('/api/staff/training', {
  13 |       data: { userId: 1, completed: true },
  14 |     });
  15 |     const data = await response.json();
  16 |     expect(data.activated).toBe(true);
  17 |   });
  18 | });
  19 | 
```