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

jest.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: jest.fn(() =>
    Promise.resolve({ env: { INTERNAL_PORTAL_N8N_WEBHOOK_SECRET: 'test-secret-123' } })
  ),
}));

function createRequest(body: object, authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/n8n/payment-webhook', {
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
  zoho_invoice_id: 'Z_INV_001',
  payment_status: 'paid',
  amount_paid_cents: 100000,
  payment_date: '2026-05-15',
  payment_mode: 'eft',
};

describe('POST /api/webhooks/n8n/payment-webhook', () => {
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

  test('returns 400 when required fields are missing', async () => {
    const req = createRequest({ job_id: 'x' }, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Missing required fields');
  });

  test('returns 400 for invalid payment_status', async () => {
    const req = createRequest(
      { ...validPayload, payment_status: 'unknown' },
      'Bearer test-secret-123'
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid payment_status');
  });

  test('returns 404 when job does not exist or invoice mismatch', async () => {
    mockDb.first.mockResolvedValueOnce(null);

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Job not found or invoice mismatch');
  });

  test('updates payment_status for valid payload', async () => {
    mockDb.first.mockResolvedValueOnce({
      id: 'SS-2026-1234',
      payment_status: 'pending',
    });

    const req = createRequest(validPayload, 'Bearer test-secret-123');
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.job_id).toBe('SS-2026-1234');
    expect(json.previous_status).toBe('pending');
    expect(json.payment_status).toBe('paid');

    expect(mockDb.run).toHaveBeenCalledTimes(2); // UPDATE + audit log
  });

  test('handles all valid payment statuses', async () => {
    const statuses = ['pending', 'paid', 'failed', 'refunded'];

    for (const status of statuses) {
      jest.clearAllMocks();
      mockDb.first.mockResolvedValueOnce({
        id: 'SS-2026-1234',
        payment_status: 'pending',
      });
      mockDb.run.mockResolvedValue({});

      const req = createRequest(
        { ...validPayload, payment_status: status },
        'Bearer test-secret-123'
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.payment_status).toBe(status);
    }
  });
});
