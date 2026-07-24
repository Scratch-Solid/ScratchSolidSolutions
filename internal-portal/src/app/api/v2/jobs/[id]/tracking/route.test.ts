import { GET, POST } from './route';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────
const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  getDb: jest.fn(() => Promise.resolve(mockDb)),
}));

jest.mock('@/lib/middleware', () => ({
  withAuth: jest.fn((req: NextRequest, _roles: string[]) =>
    Promise.resolve({ db: mockDb, user: { id: 42, role: 'cleaner', paysheet_code: 'abcX123' } })
  ),
  withTracing: jest.fn(() => 'trace-123'),
  withSecurityHeaders: jest.fn((res: Response, _traceId: string) => res),
}));

function createGetRequest(jobId: string, query?: string): NextRequest {
  return new NextRequest(`http://localhost/api/v2/jobs/${jobId}/tracking${query || ''}`, { method: 'GET' });
}

function createPostRequest(jobId: string, body: object): NextRequest {
  return new NextRequest(`http://localhost/api/v2/jobs/${jobId}/tracking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/v2/jobs/[id]/tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns tracking points in chronological order', async () => {
    mockDb.all.mockResolvedValue({
      results: [
        { id: 2, latitude: -33.9, longitude: 18.4, recorded_at: '2026-06-15T10:00:00Z', accuracy_meters: 5, source: 'mobile_app' },
        { id: 1, latitude: -33.8, longitude: 18.5, recorded_at: '2026-06-15T09:00:00Z', accuracy_meters: 8, source: 'mobile_app' },
      ],
    });

    const req = createGetRequest('SS-2026-001');
    const res = await GET(req, { params: Promise.resolve({ id: 'SS-2026-001' }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].recorded_at).toBe('2026-06-15T09:00:00Z'); // reversed to chronological
  });
});

describe('POST /api/v2/jobs/[id]/tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.run.mockResolvedValue({});
  });

  test('returns 400 for invalid coordinates', async () => {
    const req = createPostRequest('SS-2026-001', { latitude: 999, longitude: 0 });
    const res = await POST(req, { params: Promise.resolve({ id: 'SS-2026-001' }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid latitude or longitude');
  });

  test('records valid tracking point', async () => {
    const req = createPostRequest('SS-2026-001', { latitude: -33.9, longitude: 18.4, accuracy: 5 });
    const res = await POST(req, { params: Promise.resolve({ id: 'SS-2026-001' }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('Tracking point recorded');
  });
});
