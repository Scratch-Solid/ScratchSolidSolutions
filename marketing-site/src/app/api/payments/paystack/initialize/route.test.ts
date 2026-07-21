/**
 * Regression test for a real price-tampering vulnerability: this route took
 * `amount` straight from the request body and charged that via Paystack -
 * a fully attacker-controlled value, with nothing anywhere recomputing the
 * real price server-side. A client could edit the request body (browser
 * dev tools, a proxy, a modified frontend build) to set `amount` to almost
 * anything and still get a real booking. Fixed to charge
 * `bookings.quoted_price` (migration 031, computed server-side by the
 * booking-creation route from service_id/quantity/suburb/promo_code) and
 * ignore the client's `amount` whenever that column is populated.
 */
import { POST } from './route';
import { NextRequest } from 'next/server';

const mockDb: any = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
  run: jest.fn(() => Promise.resolve({})),
};

jest.mock('@/lib/middleware', () => ({
  withAuth: jest.fn(() => Promise.resolve({ user: { user_id: 1, role: 'client' }, db: mockDb })),
  withTracing: jest.fn(() => 'trace-id'),
  withSecurityHeaders: jest.fn((res: any) => res),
}));

jest.mock('@/lib/paystack', () => ({
  initializeTransaction: jest.fn(() =>
    Promise.resolve({
      status: true,
      data: { authorization_url: 'https://paystack.test/pay', reference: 'ref-1', access_code: 'code-1' },
    })
  ),
  generatePaystackReference: jest.fn(() => 'ref-1'),
}));

const { initializeTransaction } = jest.requireMock('@/lib/paystack');

function createRequest(amount: number): NextRequest {
  return new NextRequest('http://localhost/api/payments/paystack/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id: 1, email: 'client@example.com', amount, callback_url: 'https://x/verify' }),
  });
}

describe('POST /api/payments/paystack/initialize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('charges the booking\'s server-computed quoted_price, not the client-supplied amount', async () => {
    // Real price is R500 (quoted_price), but the request body claims R1 -
    // simulating a tampered/edited client request.
    mockDb.first
      .mockResolvedValueOnce({ id: 1, quoted_price: 500, service_type: 'standard' }) // booking lookup
      .mockResolvedValueOnce(null); // no existing pending payment

    await POST(createRequest(1));

    expect(initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50000 }) // R500 in kobo, not R1
    );
  });

  test('falls back to the client amount for a legacy booking with no quoted_price', async () => {
    mockDb.first
      .mockResolvedValueOnce({ id: 2, quoted_price: null, service_type: 'standard' })
      .mockResolvedValueOnce(null);

    await POST(createRequest(350));

    expect(initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 35000 })
    );
  });

  test('rejects when neither quoted_price nor a usable amount is available', async () => {
    mockDb.first
      .mockResolvedValueOnce({ id: 3, quoted_price: null, service_type: 'standard' })
      .mockResolvedValueOnce(null);

    const res = await POST(createRequest(0));

    expect(res.status).toBe(400);
    expect(initializeTransaction).not.toHaveBeenCalled();
  });
});
