import { test, expect } from '@playwright/test';

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

// Generate unique test emails to avoid conflicts
const uniqueId = () => `test-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

test.describe('Portal Auth API - Intensive Tests', () => {
  test('Signup succeeds without CSRF token for public endpoint', async ({ request }) => {
    const email = `${uniqueId()}@example.com`;
    const response = await request.post(`${PORTAL_URL}/api/auth/signup`, {
      data: {
        name: 'Test User',
        email,
        password: 'TestPass123!',
        role: 'client',
        phone: '+27123456789'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('registered successfully');
    expect(body.user.email).toBe(email);
  });

  test('Login with valid credentials returns token', async ({ request }) => {
    // First signup
    const email = `${uniqueId()}@example.com`;
    await request.post(`${PORTAL_URL}/api/auth/signup`, {
      data: {
        name: 'Test User',
        email,
        password: 'TestPass123!',
        role: 'client',
        phone: '+27123456789'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    // Then login
    const loginResponse = await request.post(`${PORTAL_URL}/api/auth/login`, {
      data: {
        identifier: email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    expect(loginResponse.status()).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody.token).toBeTruthy();
    expect(loginBody.role).toBe('client');
  });

  test('Login with invalid password returns 401', async ({ request }) => {
    const email = `${uniqueId()}@example.com`;
    await request.post(`${PORTAL_URL}/api/auth/signup`, {
      data: {
        name: 'Test User',
        email,
        password: 'TestPass123!',
        role: 'client',
        phone: '+27123456789'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    const loginResponse = await request.post(`${PORTAL_URL}/api/auth/login`, {
      data: {
        identifier: email,
        password: 'WrongPassword123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    expect(loginResponse.status()).toBe(401);
    const body = await loginResponse.json();
    expect(body.error).toContain('Invalid credentials');
  });

  test('Signup with duplicate email returns 409', async ({ request }) => {
    const email = `${uniqueId()}@example.com`;
    await request.post(`${PORTAL_URL}/api/auth/signup`, {
      data: {
        name: 'Test User',
        email,
        password: 'TestPass123!',
        role: 'client',
        phone: '+27123456789'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    const duplicateResponse = await request.post(`${PORTAL_URL}/api/auth/signup`, {
      data: {
        name: 'Test User 2',
        email,
        password: 'TestPass123!',
        role: 'client',
        phone: '+27123456790'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    expect(duplicateResponse.status()).toBe(409);
    const body = await duplicateResponse.json();
    expect(body.error).toContain('already exists');
  });

  test('Login with non-existent user returns 401', async ({ request }) => {
    const response = await request.post(`${PORTAL_URL}/api/auth/login`, {
      data: {
        identifier: `${uniqueId()}@nonexistent.com`,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Invalid credentials');
  });

  test('Full signup -> login -> logout flow', async ({ request }) => {
    const email = `${uniqueId()}@example.com`;

    // Signup
    const signupResp = await request.post(`${PORTAL_URL}/api/auth/signup`, {
      data: {
        name: 'Flow Test User',
        email,
        password: 'TestPass123!',
        role: 'client',
        phone: '+27123456789'
      },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(signupResp.status()).toBe(200);

    // Login
    const loginResp = await request.post(`${PORTAL_URL}/api/auth/login`, {
      data: {
        identifier: email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(loginResp.status()).toBe(200);
    const loginBody = await loginResp.json();
    const token = loginBody.token;
    expect(token).toBeTruthy();

    // Logout
    const logoutResp = await request.post(`${PORTAL_URL}/api/auth/logout`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    expect(logoutResp.status()).toBeLessThan(500);
  });
});
