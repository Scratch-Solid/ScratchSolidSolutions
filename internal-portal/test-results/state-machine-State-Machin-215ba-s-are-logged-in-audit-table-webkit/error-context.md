# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: state-machine.spec.ts >> State Machine Transitions >> Stage transitions are logged in audit table
- Location: tests\state-machine.spec.ts:4:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('State Machine Transitions', () => {
  4  |   test('Stage transitions are logged in audit table', async ({ request }) => {
  5  |     const response = await request.post('/api/admin/onboarding/update-stage', {
  6  |       data: { userId: 1, newStage: 'contract_signed' },
  7  |     });
> 8  |     expect(response.ok()).toBeTruthy();
     |                           ^ Error: expect(received).toBeTruthy()
  9  |   });
  10 | 
  11 |   test('Invalid stage transition is rejected', async ({ request }) => {
  12 |     const response = await request.post('/api/admin/onboarding/update-stage', {
  13 |       data: { userId: 1, newStage: 'invalid_stage' },
  14 |     });
  15 |     expect(response.status()).toBe(400);
  16 |   });
  17 | });
  18 | 
```