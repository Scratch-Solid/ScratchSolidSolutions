import { test, expect } from '@playwright/test';

const BASE_URL = process.env.CI ? 'https://scratchsolidsolutions.org' : 'http://localhost:3000';

const uniqueId = () => `test-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

test.describe.serial('Marketing Site Auth API - Intensive Tests', () => {
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  const isProd = BASE_URL.includes('scratchsolidsolutions.org');
  const DELAY = isProd ? 3000 : 1500;

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

    if (signupResponse.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect([200, 201]).toContain(signupResponse.status());
    const signupBody = await signupResponse.json();
    expect(signupBody.email).toBe(email);
    expect(signupBody.role).toBe('client');

    await sleep(DELAY);

    // Login immediately (no email verification required)
    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    if (loginResponse.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(loginResponse.status()).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody.token).toBeTruthy();
    expect(loginBody.email).toBe(email);

    await sleep(DELAY);
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

    await sleep(DELAY);

    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email,
        password: 'WrongPassword123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Invalid credentials');

    await sleep(DELAY);
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

    await sleep(DELAY);

    const response = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: {
        type: 'individual',
        name: 'Test User 2',
        email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('already exists');

    await sleep(DELAY);
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

    if (signupResponse.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect([200, 201]).toContain(signupResponse.status());
    const signupBody = await signupResponse.json();
    expect(signupBody.email).toBe(email);

    await sleep(DELAY);

    const loginResponse = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });

    if (loginResponse.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(loginResponse.status()).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody.token).toBeTruthy();

    await sleep(DELAY);
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
    if (signupResp.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect([200, 201]).toContain(signupResp.status());

    await sleep(DELAY);

    // Login
    const loginResp = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email,
        password: 'TestPass123!'
      },
      headers: { 'Content-Type': 'application/json' }
    });
    if (loginResp.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect(loginResp.status()).toBe(200);
    const loginBody = await loginResp.json();
    const token = loginBody.token;
    expect(token).toBeTruthy();

    await sleep(DELAY);

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
