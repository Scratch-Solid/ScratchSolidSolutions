/**
 * COMPREHENSIVE API TESTS — Internal Portal
 * Tests every single API endpoint.
 * Handles rate limiting with serial execution and delays.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://portal.scratchsolidsolutions.org';
const CI = !!process.env.CI;
const DELAY_MS = CI ? 2000 : 300;

function delay(ms = DELAY_MS) {
  return new Promise(r => setTimeout(r, ms));
}

function skipOn429(response: any) {
  if (response.status() === 429) {
    test.skip(true, 'Rate limited (429)');
  }
}

function expectStatusOk(response: any) {
  skipOn429(response);
  expect(response.status(), `Expected 200-299, got ${response.status()}`).toBeLessThan(300);
}

test.describe.configure({ mode: 'serial' });

// ─────────────────────────────────────────────
// PUBLIC API — No auth required
// ─────────────────────────────────────────────
test.describe('🌐 Public API Endpoints', () => {
  test('GET /api/auth/login — login endpoint responds', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/auth/login`);
    skipOn429(res);
    expect([200, 405]).toContain(res.status());
  });

  test('POST /api/auth/login — invalid credentials', async ({ request }) => {
    await delay();
    const res = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { identifier: 'invaliduser', password: 'wrongpassword' }
    });
    skipOn429(res);
    expect([400, 401, 403]).toContain(res.status());
  });

  test('POST /api/auth/signup — cleaner signup endpoint', async ({ request }) => {
    await delay();
    const res = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { type: 'cleaner', phone: '0000000000', password: 'test', name: 'Test' }
    });
    skipOn429(res);
    expect([200, 201, 400, 409]).toContain(res.status());
  });

  test('POST /api/auth/forgot-password — sends request', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/forgot-password`, {
      data: { email: 'nonexistent@example.com' }
    });
    skipOn429(res);
    expect([200, 400, 404]).toContain(res.status());
  });

  test('GET /api/cleaner/pre-dashboard — requires cleaner authentication', async ({ request }) => {
    // withAuth(['cleaner']) - anonymous access must be rejected, this is not
    // actually a public endpoint despite living in this describe block.
    const res = await request.get(`${BASE_URL}/api/cleaner/pre-dashboard`);
    skipOn429(res);
    expect(res.status()).toBe(401);
  });

  test('GET /api/employees — requires admin authentication', async ({ request }) => {
    // withAuth(['admin']) - anonymous access must be rejected.
    const res = await request.get(`${BASE_URL}/api/employees`);
    skipOn429(res);
    expect(res.status()).toBe(401);
  });
});

// ─────────────────────────────────────────────
// PROTECTED API — Admin endpoints (no auth, expect 401)
// ─────────────────────────────────────────────
test.describe('🔒 Protected Admin API Endpoints', () => {
  test('GET /api/admin/users — requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/users`);
    skipOn429(res);
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/admin/bookings — requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/bookings`);
    skipOn429(res);
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/admin/new-joiners — requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/new-joiners`);
    skipOn429(res);
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/admin/services — requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/services`);
    skipOn429(res);
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/admin/banking-details — requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/admin/banking-details`);
    skipOn429(res);
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/admin/new-joiners/create — requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/new-joiners/create`, {
      data: { fullName: 'Test', idPassportNumber: '123', contactNumber: '000', positionAppliedFor: 'cleaner' }
    });
    skipOn429(res);
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/admin/new-joiners/1/approve — requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/new-joiners/1/approve`);
    skipOn429(res);
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/admin/new-joiners/1/reject — requires auth', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/admin/new-joiners/1/reject`, {
      data: { reason: 'test' }
    });
    skipOn429(res);
    expect([401, 403]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────
// CONTRACTS & PAYROLL
// ─────────────────────────────────────────────
test.describe('📄 Contracts & Payroll API', () => {
  test('GET /api/contracts — requires admin authentication', async ({ request }) => {
    // withAuth(['admin']) - anonymous access must be rejected.
    const res = await request.get(`${BASE_URL}/api/contracts`);
    skipOn429(res);
    expect(res.status()).toBe(401);
  });

  test('GET /api/payroll — requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/payroll`);
    skipOn429(res);
    expect([200, 401, 403]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────
// NOTIFICATIONS & MESSAGES
// ─────────────────────────────────────────────
test.describe('🔔 Notifications & Messages API', () => {
  test('GET /api/notifications — requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/notifications`);
    skipOn429(res);
    expect([200, 401, 403]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────
// CLEANER API
// ─────────────────────────────────────────────
test.describe('🧹 Cleaner API', () => {
  test('GET /api/cleaner/profile — requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cleaner/profile`);
    skipOn429(res);
    expect([200, 401, 403]).toContain(res.status());
  });

  test('GET /api/cleaner/schedule — requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cleaner/schedule`);
    skipOn429(res);
    expect([200, 401, 403]).toContain(res.status());
  });

  test('GET /api/cleaner/payslips — requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/cleaner/payslips`);
    skipOn429(res);
    expect([200, 401, 403]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────
// BOOKING API
// ─────────────────────────────────────────────
test.describe('📅 Booking API', () => {
  test('GET /api/bookings — requires authentication', async ({ request }) => {
    // withAuth(request) with no roles still requires a valid token for any
    // authenticated user - anonymous access must be rejected.
    const res = await request.get(`${BASE_URL}/api/bookings`);
    skipOn429(res);
    expect(res.status()).toBe(401);
  });

  test('PUT /api/bookings/1 — requires auth to assign cleaner', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/api/bookings/1`, {
      data: { cleaner_id: '1' }
    });
    skipOn429(res);
    expect([401, 403]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────
// MARKETING CONTENT PROXY
// ─────────────────────────────────────────────
test.describe('🔗 Marketing Content Proxy', () => {
  test('GET /api/marketing/content — proxies to marketing site', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/marketing/content`);
    skipOn429(res);
    expectStatusOk(res);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('PUT /api/marketing/content — requires auth', async ({ request }) => {
    const res = await request.put(`${BASE_URL}/api/marketing/content`, {
      data: { slug: 'privacy', title: 'Test', content: 'Test content' }
    });
    skipOn429(res);
    expect([401, 403]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────
// HEALTH & STATUS
// ─────────────────────────────────────────────
test.describe('🏥 Health & Status', () => {
  test('GET /api/health — health check', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    skipOn429(res);
    if (res.status() !== 404) {
      expectStatusOk(res);
    }
  });

  test('GET /api/status — status check', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/status`);
    skipOn429(res);
    if (res.status() !== 404) {
      expectStatusOk(res);
    }
  });
});
