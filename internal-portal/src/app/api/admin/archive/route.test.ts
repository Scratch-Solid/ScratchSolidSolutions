import { GET } from './route';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────
const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
  all: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  getDb: jest.fn(() => Promise.resolve(mockDb)),
}));

jest.mock('@/lib/middleware', () => ({
  withAuth: jest.fn((req: NextRequest, _roles: string[]) =>
    Promise.resolve({ db: mockDb, user: { id: 1, role: 'admin' } })
  ),
  withTracing: jest.fn(() => 'trace-123'),
  withSecurityHeaders: jest.fn((res: Response, _traceId: string) => res),
}));

function createRequest(query?: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/archive${query || ''}`, { method: 'GET' });
}

describe('GET /api/admin/archive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns paginated archive list', async () => {
    mockDb.first.mockResolvedValue({ total: 25 });
    mockDb.all.mockResolvedValue({
      results: [
        {
          id: 'SS-2026-001',
          client_name: 'Alice',
          property_type: '2_bed',
          scheduled_at: '2026-06-15T09:00:00Z',
          duration_minutes: 120,
          status: 'completed',
          payment_status: 'paid',
          team_members: JSON.stringify(['abcX123']),
          created_at: '2026-06-01T00:00:00Z',
          updated_at: '2026-06-15T12:00:00Z',
          client_score: 95,
          adherence_score: 8,
          ops_score: 85,
          checklist_total: 10,
          checklist_completed: 10,
          photo_count: 5,
          tracking_points: 12,
        },
      ],
    });

    const req = createRequest('?page=1&pageSize=20');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].team_members).toEqual(['abcX123']);
    expect(json.data[0].checklist_completion_pct).toBe(100);
    expect(json.pagination.page).toBe(1);
    expect(json.pagination.total).toBe(25);
    expect(json.pagination.totalPages).toBe(2);
  });

  test('filters by date range', async () => {
    mockDb.first.mockResolvedValue({ total: 3 });
    mockDb.all.mockResolvedValue({ results: [] });

    const req = createRequest('?from=2026-06-01&to=2026-06-30');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.pagination.total).toBe(3);
  });
});
