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
  getTrainingDb: jest.fn(() => Promise.resolve(mockDb)),
}));

jest.mock('@/lib/runtime-context', () => ({
  getCloudflareContext: jest.fn(() =>
    Promise.resolve({ env: { INTERNAL_PORTAL_N8N_WEBHOOK_SECRET: 'test-secret-123' } })
  ),
}));

jest.mock('@/lib/pool-management/pool-assignment', () => ({
  resolveAssignmentPool: jest.fn(() => Promise.resolve('AUTO')),
  scoreAssignmentCandidates: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@/lib/geocoding', () => ({
  geocodeAddress: jest.fn(() => Promise.resolve(null)),
}));

function createRequest(body: object, authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/n8n/booking-ingested', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader && { Authorization: authHeader }),
    },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  calcom_uid: 'cal_test_uid_abc123',
  client: {
    email: 'client@example.com',
    name: 'Jane Client',
    phone: '+27123456789',
  },
  service: {
    type: 'turnover_clean',
    duration_minutes: 120,
    scheduled_at: '2026-06-15T09:00:00Z',
  },
  property: {
    type: '1_bed',
    address: '123 Main St, Cape Town',
    access_code: '1234#',
    unit_name: 'Unit 4B',
    special_requests: 'Please use eco products',
  },
};

describe('POST /api/webhooks/n8n/booking-ingested', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.first.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({});
  });

  test('returns 401 when Authorization header is missing', async () => {
    const req = createRequest(validPayload);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('returns 401 when secret token is incorrect', async () => {
    const req = createRequest(validPayload, 'Bearer wrong-secret');
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('returns 400 when payload structure is invalid', async () => {
    const req = createRequest({ calcom_uid: 'abc' }, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid payload structure');
  });

  test('returns 400 for unknown property type', async () => {
    const payload = {
      ...validPayload,
      property: { ...validPayload.property, type: 'mansion' },
    };
    mockDb.first.mockResolvedValue(null); // no template found

    const req = createRequest(payload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Unknown property type');
  });

  test('returns 409 when calcom_uid already exists', async () => {
    mockDb.first
      .mockResolvedValueOnce({ rooms_json: '[]' }) // template found
      .mockResolvedValueOnce({ id: 'SS-2026-0001' }); // duplicate exists

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.status).toBe('duplicate');
    expect(json.calcom_uid).toBe('cal_test_uid_abc123');
  });

  test('creates job and checklist for valid payload', async () => {
    const roomsJson = JSON.stringify([
      { room_name: 'Kitchen', tasks: ['Clean sink', 'Wipe counters'] },
      { room_name: 'Bathroom', tasks: ['Scrub toilet'] },
    ]);

    mockDb.first
      .mockResolvedValueOnce({ rooms_json: roomsJson }) // template found
      .mockResolvedValueOnce(null); // no duplicate

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.status).toBe('scheduled');
    expect(json.calcom_uid).toBe('cal_test_uid_abc123');
    expect(json.checklist_items).toBe(3); // 2 kitchen + 1 bathroom
    expect(json.job_id).toMatch(/^SS-\d{4}-\d{4}$/);

    // Verify job insert was called
    expect(mockDb.run).toHaveBeenCalled();
    const insertCalls = mockDb.run.mock.calls;
    expect(insertCalls.length).toBeGreaterThanOrEqual(5); // job + 3 checklist + 1 audit
  });

  test('uses provided job_id if present', async () => {
    const roomsJson = JSON.stringify([{ room_name: 'Studio', tasks: ['Task 1'] }]);
    mockDb.first
      .mockResolvedValueOnce({ rooms_json: roomsJson })
      .mockResolvedValueOnce(null);

    const payload = { ...validPayload, job_id: 'SS-2026-9999' };
    const req = createRequest(payload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.job_id).toBe('SS-2026-9999');
  });

  test('handles corrupt template JSON gracefully', async () => {
    mockDb.first.mockResolvedValueOnce({ rooms_json: 'not-valid-json' });

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Corrupt property template');
  });
});
