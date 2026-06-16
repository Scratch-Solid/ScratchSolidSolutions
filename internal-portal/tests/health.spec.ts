import { test, expect } from '@playwright/test';

test('Health check endpoint returns healthy status', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  
  const data = await response.json();
  expect(data).toHaveProperty('status');
  expect(data).toHaveProperty('timestamp');
  expect(data).toHaveProperty('checks');
  expect(data.checks).toHaveProperty('database');
  expect(data.checks).toHaveProperty('r2');
});

test('Health check includes database connectivity', async ({ request }) => {
  const response = await request.get('/api/health');
  const data = await response.json();
  
  expect(data.checks.database).toHaveProperty('status');
  expect(data.checks.database).toHaveProperty('message');
  expect(['healthy', 'unhealthy']).toContain(data.checks.database.status);
});
