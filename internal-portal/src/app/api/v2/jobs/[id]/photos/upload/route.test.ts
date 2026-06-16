import { POST } from './route';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────
const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
  run: jest.fn(),
};

const mockBucket = {
  put: jest.fn(),
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

jest.mock('@/lib/runtime-context', () => ({
  getCloudflareContext: jest.fn(() =>
    Promise.resolve({
      env: {
        CLEANER_PHOTOS_BUCKET: mockBucket,
      },
    })
  ),
}));

function createRequest(jobId: string, body: object): NextRequest {
  return new NextRequest(`http://localhost/api/v2/jobs/${jobId}/photos/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Small 1x1 red PNG in base64
const sampleBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('POST /api/v2/jobs/[id]/photos/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.run.mockResolvedValue({});
    mockBucket.put.mockResolvedValue({});
  });

  test('returns 400 when room_name or base64_image is missing', async () => {
    const req = createRequest('SS-2026-001', { room_name: 'Kitchen' });
    const res = await POST(req, { params: Promise.resolve({ id: 'SS-2026-001' }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing room_name or base64_image');
  });

  test('returns 404 when job not found', async () => {
    mockDb.first.mockResolvedValue(null);

    const req = createRequest('SS-2026-001', { room_name: 'Kitchen', base64_image: sampleBase64Image });
    const res = await POST(req, { params: Promise.resolve({ id: 'SS-2026-001' }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Job not found');
  });

  test('uploads photo to R2 and records in DB', async () => {
    mockDb.first.mockResolvedValue({ id: 'SS-2026-001', status: 'assigned' });

    const req = createRequest('SS-2026-001', { room_name: 'Kitchen', base64_image: sampleBase64Image, file_name: 'test.png' });
    const res = await POST(req, { params: Promise.resolve({ id: 'SS-2026-001' }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('Photo uploaded successfully');
    expect(json.data.public_url).toContain('uploads.scratchsolidsolutions.org');
    expect(json.data.public_url).toContain('jobs/SS-2026-001/Kitchen/');
    expect(json.data.public_url).toContain('test.png');
    expect(mockBucket.put).toHaveBeenCalled();
    expect(mockDb.run).toHaveBeenCalled();
  });
});
