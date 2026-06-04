import { GET } from './route';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────
const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
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

function createRequest(url: string): NextRequest {
  return new NextRequest(url, { method: 'GET' });
}

describe('GET /api/v2/supervisor/jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns jobs list for supervisor', async () => {
    mockDb.all.mockResolvedValue({
      results: [
        {
          id: 'SS-2026-001',
          client_name: 'Alice',
          property_address: '1 Main St',
          status: 'assigned',
          team_members: JSON.stringify(['abcX123']),
          erpnext_shift_id: null,
        },
        {
          id: 'SS-2026-002',
          client_name: 'Bob',
          property_address: '2 Oak Ave',
          status: 'completed',
          team_members: JSON.stringify(['abcX123', 'defY456']),
          erpnext_shift_id: JSON.stringify({ abcX123: 'SHIFT-1' }),
        },
      ],
    });

    const req = createRequest('http://localhost/api/v2/supervisor/jobs?status=assigned');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].team_members).toEqual(['abcX123']);
    expect(json.data[1].erpnext_shift_id).toEqual({ abcX123: 'SHIFT-1' });
  });

  test('filters by date parameter', async () => {
    mockDb.all.mockResolvedValue({ results: [] });

    const req = createRequest('http://localhost/api/v2/supervisor/jobs?date=2026-06-15');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.count).toBe(0);
  });

  test('filters my jobs only', async () => {
    mockDb.all.mockResolvedValue({ results: [] });

    const req = createRequest('http://localhost/api/v2/supervisor/jobs?mine=true');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
