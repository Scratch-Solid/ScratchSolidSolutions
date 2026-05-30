# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notification.spec.ts >> Notification Tests >> Notification preferences are respected
- Location: tests\notification.spec.ts:11:7

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Notification Tests', () => {
  4  |   test('Notification is logged on consent submit', async ({ request }) => {
  5  |     const response = await request.post('/api/auth/consent', {
  6  |       data: { name: 'Test', phone: '+1234567890', email: 'test@test.com', department: 'cleaning' },
  7  |     });
  8  |     expect(response.ok()).toBeTruthy();
  9  |   });
  10 | 
  11 |   test('Notification preferences are respected', async ({ request }) => {
  12 |     const response = await request.post('/api/user/notification-preferences', {
  13 |       data: { whatsappEnabled: false, emailEnabled: true },
  14 |     });
> 15 |     expect(response.ok()).toBeTruthy();
     |                           ^ Error: expect(received).toBeTruthy()
  16 |   });
  17 | });
  18 | 
```