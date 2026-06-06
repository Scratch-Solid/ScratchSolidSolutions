import { GET, POST } from './route';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────
const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
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
  return new NextRequest(`http://localhost/api/v2/jobs/${jobId}/photos${query || ''}`, { method: 'GET' });
}

function createPostRequest(jobId: string, body: object): NextRequest {
  return new NextRequest(`http://localhost/api/v2/jobs/${jobId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/v2/jobs/[id]/photos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns all photos for a job', async () => {
    mockDb.all.mockResolvedValue({
      results: [
        { id: 1, room_name: 'Kitchen', photo_url: 'http://r2/kitchen1.jpg', uploaded_by: 'abcX123', uploaded_at: '2026-06-15T10:00:00Z' },
        { id: 2, room_name: 'Bedroom', photo_url: 'http://r2/bedroom1.jpg', uploaded_by: 'abcX123', uploaded_at: '2026-06-15T10:30:00Z' },
      ],
    });

    const req = createGetRequest('SS-2026-001');
    const res = await GET(req, { params: Promise.resolve({ id: 'SS-2026-001' }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
  });

  test('filters by room_name', async () => {
    mockDb.all.mockResolvedValue({
      results: [
        { id: 1, room_name: 'Kitchen', photo_url: 'http://r2/kitchen1.jpg', uploaded_by: 'abcX123', uploaded_at: '2026-06-15T10:00:00Z' },
      ],
    });

    const req = createGetRequest('SS-2026-001', '?room=Kitchen');
    const res = await GET(req, { params: Promise.resolve({ id: 'SS-2026-001' }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });
});

describe('POST /api/v2/jobs/[id]/photos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.run.mockResolvedValue({});
  });

  test('returns 400 when room_name or photo_url is missing', async () => {
    const req = createPostRequest('SS-2026-001', { room_name: 'Kitchen' });
    const res = await POST(req, { params: Promise.resolve({ id: 'SS-2026-001' }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing room_name or photo_url');
  });

  test('records photo URL with uploaded_by', async () => {
    const req = createPostRequest('SS-2026-001', { room_name: 'Kitchen', photo_url: 'http://r2/new.jpg' });
    const res = await POST(req, { params: Promise.resolve({ id: 'SS-2026-001' }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.uploaded_by).toBe('abcX123');
  });
});
