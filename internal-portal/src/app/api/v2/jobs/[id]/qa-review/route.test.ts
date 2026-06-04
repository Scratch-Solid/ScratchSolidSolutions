import { POST } from './route';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────
const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
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
  return new NextRequest(`http://localhost/api/v2/jobs/${jobId}/qa-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/v2/jobs/[id]/qa-review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.run.mockResolvedValue({});
  });

  test('returns 404 when job not found', async () => {
    mockDb.first.mockResolvedValue(null);

    const req = createRequest('SS-2026-001', { client_score: 80 });
    const res = await POST(req, { params: { id: 'SS-2026-001' } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Job not found');
  });

  test('records QA review with clamped scores', async () => {
    mockDb.first.mockResolvedValue({ id: 'SS-2026-001', status: 'completed' });

    const req = createRequest('SS-2026-001', {
      client_score: 95,
      adherence_score: 110, // should be clamped to 100
      attendance_score: -5, // should be clamped to 0
      company_values_score: 88,
      ops_score: 92,
      notes: 'Excellent work!',
    });
    const res = await POST(req, { params: { id: 'SS-2026-001' } });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('QA review recorded');
    expect(json.data.scores.client_score).toBe(95);
    expect(json.data.scores.adherence_score).toBe(100);
    expect(json.data.scores.attendance_score).toBe(0);
  });
});
