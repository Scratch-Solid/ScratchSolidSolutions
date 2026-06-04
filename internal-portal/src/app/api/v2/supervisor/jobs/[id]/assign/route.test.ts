import { POST } from './route';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────
const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
  all: jest.fn(() => mockDb),
  run: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  getDb: jest.fn(() => Promise.resolve(mockDb)),
}));

jest.mock('@/lib/middleware', () => ({
  withAuth: jest.fn((req: NextRequest, _roles: string[]) =>
    Promise.resolve({ db: mockDb, user: { id: 42, role: 'staff' } })
  ),
  withTracing: jest.fn(() => 'trace-123'),
  withSecurityHeaders: jest.fn((res: Response, _traceId: string) => res),
}));

function createRequest(jobId: string, body: object): NextRequest {
  return new NextRequest(`http://localhost/api/v2/supervisor/jobs/${jobId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v2/supervisor/jobs/[id]/assign', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.run.mockResolvedValue({});
  });

  test('returns 400 when cleaner_ids is missing', async () => {
    const req = createRequest('SS-2026-001', {});
    const res = await POST(req, { params: { id: 'SS-2026-001' } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing cleaner_ids array');
  });

  test('returns 400 when cleaner IDs are invalid', async () => {
    mockDb.all.mockResolvedValue({ results: [] });

    const req = createRequest('SS-2026-001', { cleaner_ids: ['badId'] });
    const res = await POST(req, { params: { id: 'SS-2026-001' } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid cleaner IDs');
    expect(json.missing).toEqual(['badId']);
  });

  test('assigns valid cleaners and updates job', async () => {
    mockDb.all.mockResolvedValue({
      results: [{ paysheet_code: 'abcX123456' }, { paysheet_code: 'defY789012' }],
    });

    const req = createRequest('SS-2026-001', { cleaner_ids: ['abcX123456', 'defY789012'] });
    const res = await POST(req, { params: { id: 'SS-2026-001' } });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.job_id).toBe('SS-2026-001');
    expect(json.data.supervisor_id).toBe(42);
    expect(json.data.cleaner_ids).toEqual(['abcX123456', 'defY789012']);
    expect(json.data.status).toBe('assigned');
  });
});
