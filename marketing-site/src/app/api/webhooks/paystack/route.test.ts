/**
 * @jest-environment node
 *
 * Regression coverage for the Paystack webhook - the "authoritative async"
 * confirmation path per the payment-flow audit (initialize/verify already
 * had some coverage; webhook/refund/reconciliation had none at all). Uses a
 * real HMAC-SHA512 signature (Node's crypto, same algorithm the route's own
 * verifyWebhookSignature computes via Web Crypto) so the signature-gate
 * assertions are genuine, not just mocked past. Needs the `node` test
 * environment specifically - the route calls crypto.subtle (Web Crypto),
 * which the default jsdom environment doesn't implement.
 */
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

const mockDb: any = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
  run: jest.fn(() => Promise.resolve({})),
};

jest.mock('@/lib/db', () => ({
  getDb: jest.fn(() => Promise.resolve(mockDb)),
}));

jest.mock('@/lib/email', () => ({
  sendBookingConfirmationEmail: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('@/lib/zoho', () => ({
  findOrCreateContact: jest.fn(() => Promise.resolve(null)),
  createInvoice: jest.fn(),
  recordPayment: jest.fn(),
}));

const SECRET = 'test-webhook-secret';

function sign(body: string): string {
  return createHmac('sha512', SECRET).update(body).digest('hex');
}

function createRequest(body: any, opts: { signature?: string | null } = {}): NextRequest {
  const bodyText = JSON.stringify(body);
  const signature = opts.signature === undefined ? sign(bodyText) : opts.signature;
  const headers: Record<string, string> = {};
  if (signature !== null) headers['x-paystack-signature'] = signature;
  return new NextRequest('http://localhost/api/webhooks/paystack', {
    method: 'POST',
    headers,
    body: bodyText,
  });
}

describe('POST /api/webhooks/paystack', () => {
  const originalSecret = process.env.PAYSTACK_SECRET_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYSTACK_SECRET_KEY = SECRET;
    mockDb.first.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({});
  });

  afterAll(() => {
    process.env.PAYSTACK_SECRET_KEY = originalSecret;
  });

  test('rejects a request with no signature header', async () => {
    const { POST } = await import('./route');
    const res = await POST(createRequest({ event: 'charge.success', data: {} }, { signature: null }));
    expect(res.status).toBe(401);
  });

  test('rejects a request with a signature that does not match the body', async () => {
    const { POST } = await import('./route');
    const res = await POST(createRequest({ event: 'charge.success', data: {} }, { signature: 'not-a-real-signature' }));
    expect(res.status).toBe(400);
  });

  test('charge.success confirms the booking and marks the payment completed', async () => {
    const { POST } = await import('./route');
    mockDb.first
      .mockResolvedValueOnce({ id: 5, booking_id: 10, status: 'pending', metadata: null }) // payment lookup
      .mockResolvedValueOnce({ id: 10, client_name: 'Jane', booking_date: '2026-08-01', booking_time: '09:00', location: 'Bellville', service_type: 'standard' }); // booking lookup

    const res = await POST(createRequest({
      event: 'charge.success',
      data: { reference: 'ref-123', amount: 50000, customer: { email: 'jane@example.com' }, domain: 'live' },
    }));
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.booking_id).toBe(10);

    const paymentUpdate = mockDb.prepare.mock.calls.find(([q]: [string]) => q.includes("SET status = 'completed'"));
    expect(paymentUpdate).toBeDefined();
    const bookingUpdate = mockDb.prepare.mock.calls.find(([q]: [string]) => q.includes("UPDATE bookings SET status = 'confirmed'"));
    expect(bookingUpdate).toBeDefined();
  });

  test('charge.success is idempotent - a payment already completed is not double-processed', async () => {
    const { POST } = await import('./route');
    mockDb.first.mockResolvedValueOnce({ id: 5, booking_id: 10, status: 'completed', metadata: null });

    const res = await POST(createRequest({
      event: 'charge.success',
      data: { reference: 'ref-123', amount: 50000, customer: { email: 'jane@example.com' } },
    }));
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.message).toBe('Already processed');
    expect(mockDb.prepare.mock.calls.some(([q]: [string]) => q.includes("UPDATE bookings SET status = 'confirmed'"))).toBe(false);
  });

  test('refund.processed marks the matching payment refunded', async () => {
    const { POST } = await import('./route');
    mockDb.first.mockResolvedValueOnce({ id: 5, amount: 500 });

    const res = await POST(createRequest({
      event: 'refund.processed',
      data: { reference: 'ref-123', amount: 50000 },
    }));
    const body = await res.json() as any;

    expect(res.status).toBe(200);
    expect(body.status).toBe('acknowledged');
    const refundUpdate = mockDb.prepare.mock.calls.find(([q]: [string]) => q.includes("SET status = 'refunded'"));
    expect(refundUpdate).toBeDefined();
  });

  test('charge.failed only flips a still-pending payment to failed', async () => {
    const { POST } = await import('./route');
    mockDb.first.mockResolvedValueOnce({ id: 5, status: 'pending' });

    const res = await POST(createRequest({ event: 'charge.failed', data: { reference: 'ref-123' } }));
    expect(res.status).toBe(200);
    const failUpdate = mockDb.prepare.mock.calls.find(([q]: [string]) => q.includes("SET status = 'failed'"));
    expect(failUpdate).toBeDefined();
  });

  test('charge.failed does not touch an already-completed payment', async () => {
    const { POST } = await import('./route');
    mockDb.first.mockResolvedValueOnce({ id: 5, status: 'completed' });

    await POST(createRequest({ event: 'charge.failed', data: { reference: 'ref-123' } }));
    const failUpdate = mockDb.prepare.mock.calls.find(([q]: [string]) => q.includes("SET status = 'failed'"));
    expect(failUpdate).toBeUndefined();
  });
});
