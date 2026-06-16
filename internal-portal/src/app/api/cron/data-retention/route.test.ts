import { POST } from './route';
import { NextRequest } from 'next/server';

const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
  run: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  getDb: jest.fn(() => Promise.resolve(mockDb)),
}));

jest.mock('@/lib/logger', () => ({
  log: {
    audit: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-trace-id'),
  },
  writable: true,
});

function createRequest(authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/cron/data-retention', {
    method: 'POST',
    headers: {
      ...(authHeader && { Authorization: authHeader }),
    },
  });
}

describe('POST /api/cron/data-retention', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: 'test-cron-secret' };
    mockDb.run.mockResolvedValue({ meta: { changes: 0 } });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns 401 without auth header', async () => {
    const req = createRequest();
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('returns 401 with invalid auth header', async () => {
    const req = createRequest('Bearer wrong-secret');
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('runs cleanup with valid auth', async () => {
    const req = createRequest('Bearer test-cron-secret');
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.traceId).toBe('test-trace-id');
    expect(json.deleted).toBeDefined();
  });

  test('returns 503 when database unavailable', async () => {
    const { getDb } = require('@/lib/db');
    getDb.mockResolvedValueOnce(null);

    const req = createRequest('Bearer test-cron-secret');
    const res = await POST(req);
    expect(res.status).toBe(503);
  });
});
