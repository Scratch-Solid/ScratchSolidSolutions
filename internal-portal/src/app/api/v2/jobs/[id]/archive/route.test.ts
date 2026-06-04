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
    Promise.resolve({ db: mockDb, user: { id: 42, role: 'staff', paysheet_code: 'abcX123' } })
  ),
  withTracing: jest.fn(() => 'trace-123'),
  withSecurityHeaders: jest.fn((res: Response, _traceId: string) => res),
}));

function createRequest(jobId: string): NextRequest {
  return new NextRequest(`http://localhost/api/v2/jobs/${jobId}/archive`, { method: 'GET' });
}

describe('GET /api/v2/jobs/[id]/archive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 404 when job not found', async () => {
    mockDb.first.mockResolvedValue(null);

    const req = createRequest('SS-2026-001');
    const res = await GET(req, { params: { id: 'SS-2026-001' } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Job not found');
  });

  test('returns complete archive with all sections', async () => {
    mockDb.first
      .mockResolvedValueOnce({
        id: 'SS-2026-001',
        client_name: 'Alice',
        property_type: '2_bed',
        team_members: JSON.stringify(['abcX123']),
        status: 'completed',
      })
      .mockResolvedValueOnce({
        client_score: 4.5,
        adherence_score: 8,
        attendance_score: 10,
        company_values_score: 9,
        ops_score: 85,
      });

    mockDb.all
      .mockResolvedValueOnce({
        results: [
          { room_name: 'Kitchen', task_description: 'Clean counters', is_completed: 1, completed_by: 'abcX123', completed_at: '2026-06-15T10:00:00Z', photo_url: null },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          { room_name: 'Kitchen', photo_url: 'http://r2/kitchen.jpg', uploaded_by: 'abcX123', uploaded_at: '2026-06-15T10:00:00Z' },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          { latitude: -33.9, longitude: 18.4, timestamp: '2026-06-15T09:00:00Z', accuracy: 5 },
          { latitude: -33.9, longitude: 18.4, timestamp: '2026-06-15T10:30:00Z', accuracy: 3 },
        ],
      });

    const req = createRequest('SS-2026-001');
    const res = await GET(req, { params: { id: 'SS-2026-001' } });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.job.client_name).toBe('Alice');
    expect(json.data.job.team_members).toEqual(['abcX123']);
    expect(json.data.checklist.total_items).toBe(1);
    expect(json.data.checklist.completed_items).toBe(1);
    expect(json.data.checklist.completion_percentage).toBe(100);
    expect(json.data.photos.total).toBe(1);
    expect(json.data.tracking.total_points).toBe(2);
    expect(json.data.tracking.first_point.latitude).toBe(-33.9);
    expect(json.data.qa_metrics.client_score).toBe(4.5);
  });
});
