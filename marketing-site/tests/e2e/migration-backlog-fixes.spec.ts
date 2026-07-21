/**
 * MIGRATION BACKLOG FIXES — regression coverage for commit 469ccd25
 * ("3 confirmed broken marketing-site features found in migration backlog
 * audit"): loyalty/referrals, contracts, and promo-scan tracking were all
 * throwing "no such column" against production because earlier migrations
 * never added columns the route code actually writes/reads. Added after an
 * audit found none of the three had any test exercising the broken path
 * (the one existing contracts test only checks the unauthenticated 401,
 * and the one existing analytics/track test never sends a promoCode, so
 * neither would have caught the original bugs).
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://scratchsolidsolutions.org';

function skipOn429(response: any) {
  if (response.status() === 429) {
    test.skip(true, 'Rate limited (429)');
  }
}

test.describe.configure({ mode: 'serial' });

// ─────────────────────────────────────────────
// Promo scan tracking — migration 028 added promo_scans.referrer
// ─────────────────────────────────────────────
test.describe('📊 Promo scan tracking (migration 028)', () => {
  test('POST /api/analytics/track with a promoCode exercises the promo_scans insert successfully', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/analytics/track`, {
      data: {
        eventType: 'page_view',
        promoCode: `TESTCODE${Date.now()}`,
        referrer: 'https://example.com/regression-test',
        url: '/test',
      },
    });
    skipOn429(res);
    // Migration 028 added promo_scans.referrer. promo_scans.short_url_id was
    // still NOT NULL from its original migration (003_promotions.sql, back
    // when this table only tracked short-URL scans) - every promoCode
    // page_view event 500'd with a NOT NULL constraint violation until
    // migration 030 (table-recreate; SQLite/D1 can't drop a NOT NULL
    // constraint via a plain ALTER TABLE) made short_url_id nullable.
    expect(res.status()).toBeLessThan(300);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Loyalty — migration 026 added loyalty_transactions columns the route
// writes (transaction_type, description, booking_id, earned_at, expires_at)
// ─────────────────────────────────────────────
test.describe('🏆 Loyalty points (migration 026)', () => {
  test('GET /api/loyalty — reads from loyalty_points/loyalty_transactions without erroring', async ({ request }) => {
    const email = `loyaltytest${Date.now()}@example.com`;
    const phone = `08${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    const password = 'TestPass123!';

    const signupRes = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { type: 'individual', name: 'Loyalty Test User', phone, email, address: '1 Test St', password },
    });
    skipOn429(signupRes);
    expect([200, 201]).toContain(signupRes.status());

    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, { data: { email, password } });
    skipOn429(loginRes);
    expect(loginRes.status()).toBe(200);
    const { token } = await loginRes.json();

    const res = await request.get(`${BASE_URL}/api/loyalty`, { headers: { Authorization: `Bearer ${token}` } });
    skipOn429(res);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('points');
    expect(body).toHaveProperty('tier');
    expect(Array.isArray(body.recent_transactions)).toBe(true);

    // Note: POST /api/loyalty (the route that actually writes the new
    // transaction_type/description/booking_id/earned_at/expires_at columns)
    // is admin-only and can't be exercised here - self-signup can't create
    // an admin account (removed as a privilege-escalation fix). This test
    // only proves the read path survives the migration; the write path
    // needs a pre-provisioned admin credential, same pattern as
    // internal-portal/tests/dashboard.spec.ts's E2E_ADMIN_EMAIL/PASSWORD.
  });
});

// ─────────────────────────────────────────────
// Referrals — migration 026 added referrals.expires_at, and the route's
// join/select was fixed (referee_id not referred_user_id, users.name not
// first_name/last_name)
// ─────────────────────────────────────────────
test.describe('🔗 Referrals (migration 026 + join fix)', () => {
  test('POST /api/referrals generates a code, then GET /api/referrals reads it back', async ({ request }) => {
    const email = `referraltest${Date.now()}@example.com`;
    const phone = `08${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    const password = 'TestPass123!';

    const signupRes = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { type: 'individual', name: 'Referral Test User', phone, email, address: '1 Test St', password },
    });
    skipOn429(signupRes);
    expect([200, 201]).toContain(signupRes.status());

    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, { data: { email, password } });
    skipOn429(loginRes);
    expect(loginRes.status()).toBe(200);
    const { token } = await loginRes.json();

    const postRes = await request.post(`${BASE_URL}/api/referrals`, { headers: { Authorization: `Bearer ${token}` } });
    skipOn429(postRes);
    // Before the fix this 500'd with "no such column: expires_at".
    expect(postRes.status()).toBe(201);
    const postBody = await postRes.json();
    expect(postBody.referral_code).toBeTruthy();
    expect(postBody.expires_at).toBeTruthy();

    // Before the fix this joined on the wrong column (referred_user_id,
    // which doesn't exist) and selected users.first_name/last_name (which
    // also don't exist) - would 500 on any GET, not just when a referee
    // record actually exists.
    const getRes = await request.get(`${BASE_URL}/api/referrals`, { headers: { Authorization: `Bearer ${token}` } });
    skipOn429(getRes);
    expect(getRes.status()).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.referral_code).toBe(postBody.referral_code);
    expect(Array.isArray(getBody.referrals)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Contracts — migration 027 added contracts columns + created the
// weekend_assignments table (didn't exist at all before)
// ─────────────────────────────────────────────
test.describe('📄 Contracts (migration 027)', () => {
  test('POST /api/contracts with weekend_required creates the contract and its weekend_assignments row', async ({ request }) => {
    const suffix = Date.now();
    const email = `contracttest${suffix}@example.com`;
    const phone = `08${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    const password = 'TestPass123!';

    const signupRes = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { type: 'business', name: 'Contract Test User', phone, email, password, businessName: `Regression Test Co ${suffix}` },
    });
    skipOn429(signupRes);
    expect([200, 201]).toContain(signupRes.status());

    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, { data: { email, password } });
    skipOn429(loginRes);
    expect(loginRes.status()).toBe(200);
    const { token } = await loginRes.json();

    const res = await request.post(`${BASE_URL}/api/contracts`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        business_name: `Regression Test Co ${suffix}`,
        contract_type: 'standard',
        rate_per_hour: 180,
        weekend_rate_multiplier: 1.5,
        start_date: new Date().toISOString().split('T')[0],
        weekend_required: true,
      },
    });
    skipOn429(res);
    // Before the fix this 500'd - either "no such column" on contracts, or
    // "no such table: weekend_assignments" when weekend_required was set.
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.business_name).toBe(`Regression Test Co ${suffix}`);
    expect(body.weekend_required).toBeTruthy();
  });
});
