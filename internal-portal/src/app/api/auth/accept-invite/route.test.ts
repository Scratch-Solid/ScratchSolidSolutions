/**
 * Regression test for the invite single-use race condition: POST used to
 * check used_at/revoked_at/expires_at via a plain SELECT, then set used_at
 * in a separate, unconditional UPDATE - two concurrent requests with the
 * same still-valid token could both pass the SELECT check before either
 * UPDATE landed, redeeming a single-use token twice. Fixed by making the
 * used_at UPDATE itself the atomicity boundary (re-checks the same
 * conditions in its own WHERE clause) and gating the password update on
 * whether that UPDATE actually changed a row.
 */
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

const mockDb: any = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
  run: jest.fn(() => Promise.resolve({ meta: { changes: 1 } })),
};

jest.mock('@/lib/db', () => ({
  getDb: jest.fn(() => Promise.resolve(mockDb)),
}));

jest.mock('@/lib/middleware', () => ({
  withTracing: jest.fn(() => 'trace-id'),
  withSecurityHeaders: jest.fn((res: any) => res),
}));

jest.mock('@/lib/auth', () => ({
  validatePasswordStrength: jest.fn(() => ({ valid: true, errors: [] })),
  hashPassword: jest.fn(() => Promise.resolve('hashed-password')),
}));

jest.mock('@/lib/session', () => ({
  generateAccessToken: jest.fn(() => Promise.resolve('access-token')),
  generateRefreshToken: jest.fn(() => Promise.resolve('refresh-token')),
  setAuthCookies: jest.fn(),
}));

const VALID_INVITE = {
  id: 7,
  user_id: 42,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  used_at: null,
  revoked_at: null,
  email: 'invitee@example.com',
  name: 'Invitee',
  role: 'admin',
};

function getRequest(token: string | null): NextRequest {
  const url = token ? `http://localhost/api/auth/accept-invite?token=${token}` : 'http://localhost/api/auth/accept-invite';
  return new NextRequest(url);
}

function postRequest(body: any): NextRequest {
  return new NextRequest('http://localhost/api/auth/accept-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/auth/accept-invite', () => {
  beforeEach(() => jest.clearAllMocks());

  test('missing token is a 400', async () => {
    const res = await GET(getRequest(null));
    expect(res.status).toBe(400);
  });

  test('a used token is reported invalid', async () => {
    mockDb.first.mockResolvedValueOnce({ ...VALID_INVITE, used_at: '2026-01-01T00:00:00Z' });
    const res = await GET(getRequest('sometoken'));
    const body = await res.json() as any;
    expect(body.valid).toBe(false);
    expect(body.error).toContain('already been used');
  });

  test('a valid, unused token is reported valid', async () => {
    mockDb.first.mockResolvedValueOnce(VALID_INVITE);
    const res = await GET(getRequest('sometoken'));
    const body = await res.json() as any;
    expect(body.valid).toBe(true);
    expect(body.email).toBe(VALID_INVITE.email);
  });
});

describe('POST /api/auth/accept-invite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.run.mockResolvedValue({ meta: { changes: 1 } });
  });

  test('redeems a valid token: sets password, marks the user approved, returns tokens', async () => {
    mockDb.first.mockResolvedValueOnce(VALID_INVITE);

    const res = await POST(postRequest({ token: 'sometoken', password: 'StrongPass123!' }));
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.token).toBe('access-token');

    const consumeCall = mockDb.prepare.mock.calls.find(([q]: [string]) => q.includes('SET used_at'));
    expect(consumeCall).toBeDefined();
    expect(consumeCall[0]).toContain('used_at IS NULL');

    const passwordCall = mockDb.prepare.mock.calls.find(([q]: [string]) => q.includes('SET password_hash'));
    expect(passwordCall).toBeDefined();
  });

  test('a concurrent redemption that already consumed the token is rejected before touching the password', async () => {
    mockDb.first.mockResolvedValueOnce(VALID_INVITE);
    // Simulates another request winning the race: the atomic UPDATE's WHERE
    // clause matches nothing because used_at is no longer NULL by the time
    // this one runs.
    mockDb.run.mockResolvedValueOnce({ meta: { changes: 0 } });

    const res = await POST(postRequest({ token: 'sometoken', password: 'StrongPass123!' }));
    const body = await res.json() as any;

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/already been used|revoked|expired/);

    const passwordCall = mockDb.prepare.mock.calls.find(([q]: [string]) => q.includes('SET password_hash'));
    expect(passwordCall).toBeUndefined();
  });

  test('an already-used token (per the SELECT) is rejected without attempting to consume it', async () => {
    mockDb.first.mockResolvedValueOnce({ ...VALID_INVITE, used_at: '2026-01-01T00:00:00Z' });

    const res = await POST(postRequest({ token: 'sometoken', password: 'StrongPass123!' }));
    expect(res.status).toBe(400);

    const consumeCall = mockDb.prepare.mock.calls.find(([q]: [string]) => q.includes('SET used_at'));
    expect(consumeCall).toBeUndefined();
  });
});
