/**
 * DATA DELETION & ACCOUNT DELETION — regression coverage for PR #2
 * (data-deletion request/confirm flow + self-service account deletion).
 * Added after an audit found this feature shipped with ~zero test coverage.
 *
 * Signup/login/data-deletion-request/confirm all share the same `auth`
 * rate-limit bucket (5 requests / 15 min per IP - see rateLimit.ts). Tests
 * below reuse as few signed-up users as the scenarios allow, and still
 * skipOn429 defensively like the rest of this suite - some skips on a given
 * CI run are expected, not a bug.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://scratchsolidsolutions.org';
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

async function getCsrfToken(request: any): Promise<string> {
  const res = await request.get(`${BASE_URL}/api/csrf-token`);
  const body = await res.json();
  return body.csrfToken;
}

// Returns null on 429 instead of calling test.skip() itself - test.skip()
// inside a beforeAll hook skips every test in the run, including ones that
// don't even need the fixture it's building. Callers that depend on the
// result must check for null and skip themselves individually.
async function signupAndLogin(request: any, label: string) {
  const phone = `08${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
  const email = `deltest-${label}-${Date.now()}@example.com`;
  const password = 'TestPass123!';

  const signupRes = await request.post(`${BASE_URL}/api/auth/signup`, {
    data: { type: 'individual', name: 'Deletion Test User', phone, email, address: '1 Test St', password },
  });
  if (signupRes.status() === 429) return null;
  expect([200, 201]).toContain(signupRes.status());

  await delay();
  const loginRes = await request.post(`${BASE_URL}/api/auth/login`, { data: { email, password } });
  if (loginRes.status() === 429) return null;
  expect(loginRes.status()).toBe(200);
  const loginBody = await loginRes.json();
  return { email, phone, password, token: loginBody.token as string };
}

test.describe.configure({ mode: 'serial' });

// One user shared across every test that just needs "an account that exists
// and stays alive" (the public request-flow tests and the authenticated
// in-app request tests) - none of those tests delete this account.
let survivor: { email: string; phone: string; password: string; token: string } | null = null;

test.beforeAll(async ({ request }) => {
  survivor = await signupAndLogin(request as any, 'survivor');
});

// ─────────────────────────────────────────────
// Public request/confirm flow (unauthenticated) — /data-deletion
// ─────────────────────────────────────────────
test.describe('🗑️ Data Deletion — public request flow', () => {
  test('POST /api/data-deletion/request — existing account gets the generic response', async ({ request }) => {
    test.skip(!survivor, 'Setup was rate limited');
    const res = await request.post(`${BASE_URL}/api/data-deletion/request`, { data: { email: survivor!.email } });
    skipOn429(res);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('confirmation link has been sent');
  });

  test('POST /api/data-deletion/request — nonexistent email returns the SAME response (anti-enumeration)', async ({ request }) => {
    test.skip(!survivor, 'Setup was rate limited');
    await delay();
    const realRes = await request.post(`${BASE_URL}/api/data-deletion/request`, { data: { email: survivor!.email } });
    skipOn429(realRes);
    await delay();
    const nonexistentRes = await request.post(`${BASE_URL}/api/data-deletion/request`, {
      data: { email: `nobody-${Date.now()}@example.com` },
    });
    skipOn429(nonexistentRes);
    expect(nonexistentRes.status()).toBe(realRes.status());
    const [realBody, fakeBody] = await Promise.all([realRes.json(), nonexistentRes.json()]);
    expect(fakeBody.message).toBe(realBody.message);
  });

  test('POST /api/data-deletion/request — missing email is a 400, not a 500', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/data-deletion/request`, { data: {} });
    skipOn429(res);
    expect(res.status()).toBe(400);
  });

  test('POST /api/data-deletion/confirm — missing token is a 400', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/data-deletion/confirm`, { data: {} });
    skipOn429(res);
    expect(res.status()).toBe(400);
  });

  test('POST /api/data-deletion/confirm — invalid token is rejected, not 500', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/data-deletion/confirm`, { data: { token: 'not-a-real-token' } });
    skipOn429(res);
    expect(res.status()).toBe(400);
  });
});

// ─────────────────────────────────────────────
// Authenticated in-app request flow — /api/data-deletion (skips the email
// round-trip since the session already proves ownership)
// ─────────────────────────────────────────────
test.describe('🗑️ Data Deletion — authenticated flow', () => {
  test('POST /api/data-deletion then GET /api/data-deletion — reason round-trips (regression: reason used to be silently dropped)', async ({ request }) => {
    test.skip(!survivor, 'Setup was rate limited');
    const reason = 'No longer using the service - regression test';
    const postRes = await request.post(`${BASE_URL}/api/data-deletion`, {
      headers: { Authorization: `Bearer ${survivor!.token}` },
      data: { reason },
    });
    skipOn429(postRes);
    expect(postRes.status()).toBe(201);
    const postBody = await postRes.json();
    expect(postBody.success).toBe(true);
    expect(postBody.request_id).toBeTruthy();

    await delay();
    const getRes = await request.get(`${BASE_URL}/api/data-deletion`, {
      headers: { Authorization: `Bearer ${survivor!.token}` },
    });
    skipOn429(getRes);
    expect(getRes.status()).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.status).toBe('pending');
    expect(getBody.reason).toBe(reason);
  });

  test('POST /api/data-deletion — no auth token is a 401', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/data-deletion`, { data: { reason: 'test' } });
    skipOn429(res);
    expect(res.status()).toBe(401);
  });
});

// ─────────────────────────────────────────────
// Self-service account deletion — /api/account/delete
// ─────────────────────────────────────────────
test.describe('🗑️ Self-Service Account Deletion', () => {
  // Shared by the two non-destructive tests below - neither one actually
  // deletes this account, so one signup covers both.
  let nonDestructive: { email: string; phone: string; password: string; token: string } | null = null;

  test.beforeAll(async ({ request }) => {
    nonDestructive = await signupAndLogin(request as any, 'del-nd');
  });

  test('POST /api/account/delete — missing confirm flag is a 400', async ({ request }) => {
    test.skip(!nonDestructive, 'Setup was rate limited');
    const csrfToken = await getCsrfToken(request);
    const res = await request.post(`${BASE_URL}/api/account/delete`, {
      headers: { Authorization: `Bearer ${nonDestructive!.token}`, 'X-CSRF-Token': csrfToken },
      data: { password: nonDestructive!.password },
    });
    skipOn429(res);
    expect(res.status()).toBe(400);
  });

  test('POST /api/account/delete — wrong password is a 401 and the account survives', async ({ request }) => {
    test.skip(!nonDestructive, 'Setup was rate limited');
    await delay();
    const csrfToken = await getCsrfToken(request);
    const res = await request.post(`${BASE_URL}/api/account/delete`, {
      headers: { Authorization: `Bearer ${nonDestructive!.token}`, 'X-CSRF-Token': csrfToken },
      data: { password: 'DefinitelyWrongPassword!', confirm: true },
    });
    skipOn429(res);
    expect(res.status()).toBe(401);

    // Confirm the account is still usable - a rejected deletion must not
    // have any side effect on the account.
    await delay();
    const loginRes = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email: nonDestructive!.email, password: nonDestructive!.password },
    });
    skipOn429(loginRes);
    expect(loginRes.status()).toBe(200);
  });

  test('POST /api/account/delete — correct password soft-deletes the account and tears down its session', async ({ request }) => {
    const maybeVictim = await signupAndLogin(request as any, 'del-victim');
    test.skip(!maybeVictim, 'Setup was rate limited');
    const victim = maybeVictim!;
    await delay();

    const csrfToken = await getCsrfToken(request);
    const deleteRes = await request.post(`${BASE_URL}/api/account/delete`, {
      headers: { Authorization: `Bearer ${victim.token}`, 'X-CSRF-Token': csrfToken },
      data: { password: victim.password, confirm: true },
    });
    skipOn429(deleteRes);
    expect(deleteRes.status()).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.grace_period_end).toBeTruthy();

    // The session that performed the deletion should be dead immediately -
    // deleting an account should not leave its own token usable afterward.
    await delay();
    const getRes = await request.get(`${BASE_URL}/api/data-deletion`, {
      headers: { Authorization: `Bearer ${victim.token}` },
    });
    skipOn429(getRes);
    expect(getRes.status()).toBe(401);

    // Documents current real behavior, not aspirational behavior: restore
    // requires a live session (withAuth), but delete just destroyed every
    // session this user had and mangled their email/phone, so there is no
    // way to obtain a fresh token for this account through the normal
    // signup/login flow. The "restore within 30 days" copy shown in the
    // delete-account modal is not currently reachable via any real flow -
    // see DeleteAccountSection.tsx and account/delete/route.ts's PUT handler.
    await delay();
    const restoreRes = await request.put(`${BASE_URL}/api/account/delete`, {
      headers: { Authorization: `Bearer ${victim.token}` },
      data: { action: 'restore' },
    });
    skipOn429(restoreRes);
    expect(restoreRes.status()).toBe(401);
  });
});
