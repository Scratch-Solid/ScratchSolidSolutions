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
    Promise.resolve({ db: mockDb, user: { id: 42, role: 'staff' } })
  ),
  withTracing: jest.fn(() => 'trace-123'),
  withSecurityHeaders: jest.fn((res: Response, _traceId: string) => res),
}));

function createRequest(): NextRequest {
  return new NextRequest('http://localhost/api/v2/supervisor/dashboard', { method: 'GET' });
}

describe('GET /api/v2/supervisor/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns dashboard KPIs', async () => {
    mockDb.first
      .mockResolvedValueOnce({
        total_jobs: 10,
        scheduled: 3,
        assigned: 4,
        in_progress: 2,
        completed: 1,
        cancelled: 0,
        paid: 5,
        unpaid: 5,
      })
      .mockResolvedValueOnce({ count: 8 });

    mockDb.all.mockResolvedValue({
      results: [
        {
          id: 'SS-2026-001',
          client_name: 'Alice',
          property_address: '1 Main St',
          property_type: '2_bed',
          scheduled_at: '2026-06-15T09:00:00Z',
          status: 'assigned',
          team_members: JSON.stringify(['abcX123']),
          payment_status: 'pending',
        },
      ],
    });

    const req = createRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.jobs.total).toBe(10);
    expect(json.data.jobs.paid).toBe(5);
    expect(json.data.workforce.active_cleaners).toBe(8);
    expect(json.data.todays_jobs).toHaveLength(1);
    expect(json.data.todays_jobs[0].team_members).toEqual(['abcX123']);
  });
});
