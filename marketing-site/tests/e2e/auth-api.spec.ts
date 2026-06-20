import { test, expect } from '@playwright/test';

const BASE_URL = process.env.CI ? 'https://scratchsolidsolutions.org' : 'http://localhost:3000';

const uniqueId = () => `test-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

test.describe.serial('Marketing Site Auth API - Intensive Tests', () => {
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  test('Signup succeeds and user can log in immediately', async ({ request }) => {
    const email = `${uniqueId()}@example.com`;

    // Signup
    const signupResponse = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        type: 'individual',
        name: 'Test User',
        email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    expect(signupResponse.status()).toBe(200);
    const signupBody = await signupResponse.json();
    expect(signupBody.email).toBe(email);
    expect(signupBody.role).toBe('client');

    await sleep(1500);

    // Login immediately (no email verification required)
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    expect(loginResponse.status()).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody.token).toBeTruthy();
    expect(loginBody.user.email).toBe(email);

    await sleep(1500);
  });

  test('Login with wrong password returns 401', async ({ request }) => {
    const email = `${uniqueId()}@example.com`;
    await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        type: 'individual',
        name: 'Test User',
        email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    await sleep(1500);

    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email,
        password: 'WrongPassword123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Invalid credentials');

    await sleep(1500);
  });

  test('Signup with duplicate email returns 409', async ({ request }) => {
    const email = `${uniqueId()}@example.com`;
    await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        type: 'individual',
        name: 'Test User',
        email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    await sleep(1500);

    const response = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        type: 'individual',
        name: 'Test User 2',
        email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('already exists');

    await sleep(1500);
  });

  test('Business signup also allows immediate login', async ({ request }) => {
    const email = `${uniqueId()}@business.com`;

    const signupResponse = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        type: 'business',
        name: 'Test Business',
        email,
        password: 'TestPass123!',
        phone: '+27123456789',
        businessName: 'Test Business Pty Ltd',
        businessRegistration: '2025/123456/07'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    expect(signupResponse.status()).toBe(200);
    const signupBody = await signupResponse.json();
    expect(signupBody.email).toBe(email);

    await sleep(1500);

    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    expect(loginResponse.status()).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody.token).toBeTruthy();

    await sleep(1500);
  });

  test('Full signup -> login -> access protected page flow', async ({ request }) => {
    const email = `${uniqueId()}@example.com`;

    // Signup
    const signupResp = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        type: 'individual',
        name: 'Flow Test User',
        email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(signupResp.status()).toBe(200);

    await sleep(1500);

    // Login
    const loginResp = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(loginResp.status()).toBe(200);
    const loginBody = await loginResp.json();
    const token = loginBody.token;
    expect(token).toBeTruthy();

    await sleep(1500);

    // Access a protected endpoint (client dashboard API)
    const protectedResp = await request.get(`${BASE_URL}/api/client/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    // Should not be 403 due to email verification
    expect(protectedResp.status()).not.toBe(403);
  });
});
