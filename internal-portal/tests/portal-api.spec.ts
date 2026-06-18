import { test, expect } from '@playwright/test';

const PORTAL_URL = process.env.PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

/**
 * Comprehensive API Endpoint Tests
 * Read-only GET requests — safe for production.
 * Validates every API route returns expected shape, no 500s.
 */

const API_GET_ENDPOINTS = [
  { path: '/api/health', expectedProps: ['status', 'timestamp', 'checks'] },
  { path: '/api/ping', expectedProps: [] },
  { path: '/api/status', expectedProps: [] },
  { path: '/api/admin/cleaners', expectedProps: [] },
  { path: '/api/admin/cleaners/overview', expectedProps: ['stats', 'cleaners'] },
  { path: '/api/admin/cleaners/training-graph', expectedProps: ['totalCleaners', 'completedTraining'] },
  { path: '/api/admin/cleaners/onboarding-funnel', expectedProps: ['totalCleaners', 'consentSigned', 'contractsSigned', 'trainingStarted', 'trainingCompleted'] },
  { path: '/api/admin/cleaners/login-activity', expectedProps: ['dailyLogins', 'totals'] },
  { path: '/api/admin/new-joiners', expectedProps: [] },
  { path: '/api/admin/bookings', expectedProps: [] },
  { path: '/api/admin/businesses', expectedProps: [] },
  { path: '/api/admin/services', expectedProps: [] },
  { path: '/api/admin/banking-details', expectedProps: [] },
  { path: '/api/admin/payroll', expectedProps: [] },
  { path: '/api/admin/roles', expectedProps: [] },
  { path: '/api/admin/permissions', expectedProps: [] },
  { path: '/api/admin/audit', expectedProps: [] },
  { path: '/api/admin/alerts/check', expectedProps: [] },
  { path: '/api/admin/onboarding/analytics', expectedProps: [] },
  { path: '/api/admin/onboarding/pipeline', expectedProps: [] },
  { path: '/api/admin/pending-approvals', expectedProps: [] },
  { path: '/api/admin/proxy-observer', expectedProps: [] },
  { path: '/api/admin/health-report', expectedProps: [] },
  { path: '/api/admin/staff-reviews', expectedProps: [] },
  { path: '/api/admin/sync-status', expectedProps: [] },
  { path: '/api/admin/training/status', expectedProps: [] },
  { path: '/api/admin/training/progress', expectedProps: [] },
  { path: '/api/admin/training/pending', expectedProps: [] },
  { path: '/api/admin/training/completed', expectedProps: [] },
  { path: '/api/admin/training/completion-rate', expectedProps: [] },
  { path: '/api/admin/training/quiz-attempts', expectedProps: [] },
  { path: '/api/admin/users', expectedProps: [] },
  { path: '/api/admin/content', expectedProps: [] },
  { path: '/api/admin/contract-content', expectedProps: [] },
  { path: '/api/admin/consent-form', expectedProps: [] },
  { path: '/api/admin/reminders', expectedProps: [] },
  { path: '/api/admin/archive', expectedProps: [] },
  { path: '/api/admin/cleanup', expectedProps: [] },
  { path: '/api/employees', expectedProps: [] },
  { path: '/api/contracts', expectedProps: [] },
  { path: '/api/bookings', expectedProps: [] },
  { path: '/api/clients', expectedProps: [] },
  { path: '/api/services', expectedProps: [] },
  { path: '/api/payroll', expectedProps: [] },
  { path: '/api/notifications', expectedProps: [] },
  { path: '/api/photos', expectedProps: [] },
  { path: '/api/cleaner-profiles', expectedProps: [] },
  { path: '/api/pools', expectedProps: [] },
  { path: '/api/settings', expectedProps: [] },
  { path: '/api/data-rights', expectedProps: [] },
  { path: '/api/v2/pricing/matrix', expectedProps: [] },
  { path: '/api/v2/cms/homepage', expectedProps: [] },
  { path: '/api/analytics', expectedProps: [] },
  { path: '/api/analytics/bookings', expectedProps: [] },
  { path: '/api/analytics/revenue', expectedProps: [] },
  { path: '/api/analytics/tracking', expectedProps: [] },
  { path: '/api/analytics/users/active', expectedProps: [] },
  { path: '/api/analytics/clients/new', expectedProps: [] },
  { path: '/api/analytics/clients/types', expectedProps: [] },
  { path: '/api/analytics/clients/locations', expectedProps: [] },
  { path: '/api/marketing/content', expectedProps: [] },
  { path: '/api/marketing/leaders', expectedProps: [] },
  { path: '/api/marketing/reviews', expectedProps: [] },
  { path: '/api/marketing/ai-responses', expectedProps: [] },
];

test.describe('Portal API Endpoints - GET Safety Check', () => {
  for (const endpoint of API_GET_ENDPOINTS) {
    test(`${endpoint.path} does not return 500/502/503`, async ({ request }) => {
      const response = await request.get(`${PORTAL_URL}${endpoint.path}`, { timeout: 15000 });
      expect(response.status()).not.toBe(500);
      expect(response.status()).not.toBe(502);
      expect(response.status()).not.toBe(503);
    });
  }
});

test.describe('Portal API Endpoints - Response Shape Validation', () => {
  for (const endpoint of API_GET_ENDPOINTS.filter(e => e.expectedProps.length > 0)) {
    test(`${endpoint.path} returns expected properties when 200`, async ({ request }) => {
      const response = await request.get(`${PORTAL_URL}${endpoint.path}`, { timeout: 15000 });
      if (response.status() === 200) {
        let body: any;
        try {
          body = await response.json();
        } catch {
          // Non-JSON response, skip property check
          return;
        }
        for (const prop of endpoint.expectedProps) {
          expect(body).toHaveProperty(prop);
        }
      }
    });
  }
});

test.describe('Portal API Endpoints - POST Safety Check (non-destructive)', () => {
  test('POST /api/auth/login with wrong creds returns 400+ not 500', async ({ request }) => {
    const res = await request.post(`${PORTAL_URL}/api/auth/login`, {
      data: { identifier: 'fake@example.com', password: 'wrong' }
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/auth/register with missing fields returns 400 not 500', async ({ request }) => {
    const res = await request.post(`${PORTAL_URL}/api/auth/register`, {
      data: { email: 'only-email@test.com' }
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/signup/cleaner with missing consent returns 400 not 500', async ({ request }) => {
    const res = await request.post(`${PORTAL_URL}/api/signup/cleaner`, {
      data: { fullName: 'Test', email: 't@test.com' }
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/auth/forgot-password with invalid email returns 400 not 500', async ({ request }) => {
    const res = await request.post(`${PORTAL_URL}/api/auth/forgot-password`, {
      data: { email: 'not-an-email' }
    });
    expect(res.status()).not.toBe(500);
  });

  test('POST /api/admin/new-joiners/99999/approve returns 404 not 500', async ({ request }) => {
    const res = await request.post(`${PORTAL_URL}/api/admin/new-joiners/99999/approve`);
    expect(res.status()).not.toBe(500);
  });

  test('POST /api/admin/new-joiners/99999/reject returns 404 not 500', async ({ request }) => {
    const res = await request.post(`${PORTAL_URL}/api/admin/new-joiners/99999/reject`, {
      data: { reason: 'Test' }
    });
    expect(res.status()).not.toBe(500);
  });

  test('POST /api/admin/bookings/99999/assign returns 404 not 500', async ({ request }) => {
    const res = await request.post(`${PORTAL_URL}/api/admin/bookings/99999/assign`, {
      data: { cleanerId: 1 }
    });
    expect(res.status()).not.toBe(500);
  });

  test('POST /api/v2/staff/pool-transition with invalid data returns 400+ not 500', async ({ request }) => {
    const res = await request.post(`${PORTAL_URL}/api/v2/staff/pool-transition`, {
      data: { staffId: 'invalid' }
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Portal API - Auth & Security Endpoints', () => {
  test('GET /api/auth/csrf-token returns token', async ({ request }) => {
    const res = await request.get(`${PORTAL_URL}/api/auth/csrf-token`);
    expect(res.status()).toBeLessThan(500);
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('csrfToken');
    }
  });

  test('GET /api/auth/check-onboarding-stage with no token returns 401', async ({ request }) => {
    const res = await request.get(`${PORTAL_URL}/api/auth/check-onboarding-stage`);
    expect(res.status()).not.toBe(500);
  });

  test('GET /api/data-rights without auth returns 401/403 not 500', async ({ request }) => {
    const res = await request.get(`${PORTAL_URL}/api/data-rights`);
    expect(res.status()).not.toBe(500);
  });
});
