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

function createGetRequest(jobId: string): NextRequest {
  return new NextRequest(`http://localhost/api/v2/jobs/${jobId}/checklist`, { method: 'GET' });
}

function createPostRequest(jobId: string, body: object): NextRequest {
  return new NextRequest(`http://localhost/api/v2/jobs/${jobId}/checklist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/v2/jobs/[id]/checklist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns checklist grouped by room', async () => {
    mockDb.all.mockResolvedValue({
      results: [
        { id: 1, room_name: 'Kitchen', task_description: 'Clean counters', is_completed: 1, completed_by: 'abcX123', completed_at: '2026-06-15T10:00:00Z', photo_url: 'http://r2/photo1.jpg' },
        { id: 2, room_name: 'Kitchen', task_description: 'Wash dishes', is_completed: 0, completed_by: null, completed_at: null, photo_url: null },
        { id: 3, room_name: 'Bedroom', task_description: 'Make bed', is_completed: 1, completed_by: 'abcX123', completed_at: '2026-06-15T10:30:00Z', photo_url: null },
      ],
    });

    const req = createGetRequest('SS-2026-001');
    const res = await GET(req, { params: { id: 'SS-2026-001' } });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.Kitchen).toHaveLength(2);
    expect(json.data.Bedroom).toHaveLength(1);
    expect(json.flat).toHaveLength(3);
  });
});

describe('POST /api/v2/jobs/[id]/checklist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.run.mockResolvedValue({});
  });

  test('returns 400 when body is missing fields', async () => {
    const req = createPostRequest('SS-2026-001', { is_completed: true });
    const res = await POST(req, { params: { id: 'SS-2026-001' } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing checklist_item_id or is_completed');
  });

  test('returns 404 when item belongs to different job', async () => {
    mockDb.first.mockResolvedValue({ job_id: 'SS-2026-999' });

    const req = createPostRequest('SS-2026-001', { checklist_item_id: 1, is_completed: true });
    const res = await POST(req, { params: { id: 'SS-2026-001' } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Checklist item not found for this job');
  });

  test('marks item complete and sets completed_by', async () => {
    mockDb.first.mockResolvedValue({ job_id: 'SS-2026-001' });

    const req = createPostRequest('SS-2026-001', { checklist_item_id: 1, is_completed: true, photo_url: 'http://r2/photo.jpg' });
    const res = await POST(req, { params: { id: 'SS-2026-001' } });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('Item marked complete');
    expect(json.data.completed_by).toBe('abcX123');
  });
});
