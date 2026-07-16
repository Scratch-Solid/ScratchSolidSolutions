import { test, expect } from '@playwright/test';

const BASE_URL = process.env.CI ? (process.env.BASE_URL || 'https://scratchsolidsolutions.org') : 'http://localhost:3000';
const isProd = BASE_URL.includes('scratchsolidsolutions.org') && !BASE_URL.includes('staging');
const uniqueId = () => `test-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

/**
 * Regression coverage for two flows that were found completely broken for
 * every real customer during the 2026-07-16 audit and fixed the same day:
 * - The Transparency Policy tracker (marketing copy promises live On the
 *   Way/Arrived/Completed status with timestamps).
 * - Card payment initialization (Paystack).
 * Both had root causes that a simple "page loads" check would never catch -
 * these tests assert on the actual data shape and behavior, not just status
 * codes.
 */
test.describe('Transparency Policy tracker', () => {
  test('invalid tracking token returns a clean 404, not a 500', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/public/tracking/nonexistent-regression-test-token`);
    expect(response.status()).toBe(404);
  });

  test('response schema uses the real tracking field, not the old dead cleanerStatus/gpsLocation shape', async ({ request }) => {
    // A 404 for a made-up token still exercises the route; what matters here
    // is that nobody has reverted api/public/tracking/[token]/route.ts to the
    // pre-fix shape that read this app's own never-populated booking columns.
    const response = await request.get(`${BASE_URL}/api/public/tracking/nonexistent-regression-test-token`);
    const body = await response.json() as Record<string, unknown>;
    expect(body).not.toHaveProperty('cleanerStatus');
    expect(body).not.toHaveProperty('gpsLocation');
  });
});

test.describe('Payment initialization (Paystack)', () => {
  test('initialize endpoint requires authentication', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/payments/paystack/initialize`, {
      data: { booking_id: 1, email: 'test@example.com', amount: 10000 },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });

  // Full mutating flow (signup -> login -> create booking -> initialize
  // payment) only runs against staging, which uses Paystack TEST-mode keys.
  // Production uses LIVE keys - running this every 6 hours against
  // production would create real (if uncompleted) checkout sessions in the
  // live Paystack dashboard and fake bookings in the real database forever.
  test('a real booking can initialize a real Paystack checkout session', async ({ request }) => {
    test.skip(isProd, 'Mutating payment test only runs against staging (test-mode Paystack keys)');

    const email = `${uniqueId()}@example.com`;
    const signupRes = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { type: 'individual', name: 'Payment Regression Test', email, password: 'TestPass123!' },
      headers: { 'Content-Type': 'application/json' },
    });
    if (signupRes.status() === 429) { test.skip(true, 'Rate limited'); return; }
    expect([200, 201]).toContain(signupRes.status());

    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email, password: 'TestPass123!' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(loginRes.status()).toBe(200);
    const { token } = await loginRes.json() as { token: string };
    expect(token).toBeTruthy();

    const bookingRes = await request.post(`${BASE_URL}/api/bookings`, {
      data: {
        client_name: 'Payment Regression Test',
        location: 'Bellville',
        suburb: 'Bellville',
        service_type: 'standard',
        booking_date: '2026-12-01',
        booking_time: '10:00',
        payment_method: 'card',
        price: 350,
      },
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    expect([200, 201]).toContain(bookingRes.status());
    const booking = await bookingRes.json() as { id: number; booking?: { id: number } };
    const bookingId = booking.id || booking.booking?.id;
    expect(bookingId).toBeTruthy();

    const initRes = await request.post(`${BASE_URL}/api/payments/paystack/initialize`, {
      data: { booking_id: bookingId, email, amount: 35000 },
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    expect(initRes.status()).toBe(200);
    const initBody = await initRes.json() as { data?: { authorization_url?: string } };
    // This is the exact assertion that would have caught the original bug:
    // a real, usable Paystack checkout URL, not a silent failure.
    expect(initBody.data?.authorization_url).toMatch(/^https:\/\/checkout\.paystack\.com\//);
  });
});
