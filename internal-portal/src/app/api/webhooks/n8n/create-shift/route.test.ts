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

jest.mock('@/lib/runtime-context', () => ({
  getCloudflareContext: jest.fn(() =>
    Promise.resolve({ env: { INTERNAL_PORTAL_N8N_WEBHOOK_SECRET: 'test-secret-123' } })
  ),
}));

const mockCreateShiftAssignment = jest.fn();

jest.mock('@/lib/cleaner-integrations', () => ({
  createShiftAssignmentInErpNext: (...args: any[]) => mockCreateShiftAssignment(...args),
}));

function createRequest(body: object, authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/n8n/create-shift', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader && { Authorization: authHeader }),
    },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  job_id: 'SS-2026-1234',
  cleaner_ids: ['abcX123456', 'defY789012'],
  shift_type: 'Full Day',
};

describe('POST /api/webhooks/n8n/create-shift', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.first.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({});
    mockCreateShiftAssignment.mockResolvedValue({
      provider: 'erpnext',
      status: 'configured',
      reference: 'SHIFT-001',
    });
  });

  test('returns 401 when Authorization header is missing', async () => {
    const req = createRequest(validPayload);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('returns 400 when job_id is missing', async () => {
    const req = createRequest({ cleaner_ids: ['abc'] }, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Missing job_id');
  });

  test('returns 400 when no cleaners assigned and job has no team_members', async () => {
    mockDb.first.mockResolvedValueOnce({
      id: 'SS-2026-1234',
      scheduled_at: '2026-06-15T09:00:00Z',
      property_address: '123 Main St',
      status: 'assigned',
      team_members: null,
    });

    const req = createRequest({ job_id: 'SS-2026-1234' }, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('No cleaners assigned');
  });

  test('looks up cleaner_ids from job team_members when not provided', async () => {
    mockDb.first.mockResolvedValueOnce({
      id: 'SS-2026-1234',
      scheduled_at: '2026-06-15T09:00:00Z',
      property_address: '123 Main St',
      status: 'assigned',
      team_members: JSON.stringify(['abcX123456', 'defY789012']),
    });

    const req = createRequest({ job_id: 'SS-2026-1234' }, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.job_id).toBe('SS-2026-1234');
    expect(json.successful).toBe(2);
    expect(json.failed).toBe(0);
    expect(mockCreateShiftAssignment).toHaveBeenCalledTimes(2);
  });

  test('returns 404 when job does not exist', async () => {
    mockDb.first.mockResolvedValueOnce(null);

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Job not found');
  });

  test('creates shifts for all cleaners and updates job', async () => {
    mockDb.first.mockResolvedValueOnce({
      id: 'SS-2026-1234',
      scheduled_at: '2026-06-15T09:00:00Z',
      property_address: '123 Main St',
      status: 'assigned',
      team_members: JSON.stringify(['abcX123456', 'defY789012']),
    });

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.job_id).toBe('SS-2026-1234');
    expect(json.successful).toBe(2);
    expect(json.failed).toBe(0);
    expect(json.results).toHaveLength(2);
    expect(json.results[0].status).toBe('configured');
    expect(json.results[0].reference).toBe('SHIFT-001');

    expect(mockCreateShiftAssignment).toHaveBeenCalledTimes(2);
    expect(mockDb.run).toHaveBeenCalled();
  });

  test('handles partial ERPNext failures gracefully', async () => {
    mockDb.first.mockResolvedValueOnce({
      id: 'SS-2026-1234',
      scheduled_at: '2026-06-15T09:00:00Z',
      property_address: '123 Main St',
      status: 'assigned',
      team_members: JSON.stringify(['abcX123456', 'defY789012']),
    });

    mockCreateShiftAssignment
      .mockResolvedValueOnce({ provider: 'erpnext', status: 'configured', reference: 'SHIFT-001' })
      .mockResolvedValueOnce({ provider: 'erpnext', status: 'pending', reference: 'abcX123456', reason: 'ERPNext credentials not configured' });

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.successful).toBe(1);
    expect(json.failed).toBe(1);
  });
});
