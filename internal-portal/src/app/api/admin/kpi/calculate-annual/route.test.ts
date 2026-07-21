/**
 * Regression test for a real bug: this route queried
 * `WHERE staff_id = ? AND review_month LIKE ?`, but staff_monthly_reviews
 * has no review_month column (it's `month`, per migrations/011) - every
 * call threw "no such column: review_month" for every cleaner, meaning the
 * annual bonus calculation has never actually run successfully. Also
 * verifies it reads the new kpi_snapshot column (see sync-kpi's own
 * regression test), not `notes`.
 */
import { POST } from './route';
import { NextRequest } from 'next/server';

const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  all: jest.fn(),
  run: jest.fn(() => Promise.resolve({})),
};

jest.mock('@/lib/middleware', () => ({
  withAuth: jest.fn(() => Promise.resolve({ user: { user_id: 1, role: 'admin' }, db: mockDb })),
  withTracing: jest.fn(() => 'trace-id'),
  withSecurityHeaders: jest.fn((res: any) => res),
  withCsrf: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/lib/cleaner-integrations', () => ({
  getErpNextCreds: jest.fn(() => Promise.resolve({ baseUrl: null, apiKey: null, apiSecret: null })),
}));

function createRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/kpi/calculate-annual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year: 2026 }),
  });
}

describe('POST /api/admin/kpi/calculate-annual', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.run.mockResolvedValue({});
  });

  test('never queries the nonexistent review_month column', async () => {
    mockDb.all
      .mockResolvedValueOnce({ results: [{ user_id: 42 }] }) // cleaners list
      .mockResolvedValueOnce({ results: [] }); // that cleaner's monthly rows - none, no crash either way

    await POST(createRequest());

    for (const [query] of mockDb.prepare.mock.calls) {
      expect(query).not.toContain('review_month');
    }
  });

  test('averages kpi_snapshot rows into a real annual summary, not stuck at 0 cleaners processed', async () => {
    mockDb.all
      .mockResolvedValueOnce({ results: [{ user_id: 42 }] })
      .mockResolvedValueOnce({
        results: [
          { kpi_snapshot: JSON.stringify({ overall10pt: 8 }) },
          { kpi_snapshot: JSON.stringify({ overall10pt: 6 }) },
        ],
      });

    const response = await POST(createRequest());
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.cleanersProcessed).toBe(1);
    expect(body.results[0]).toMatchObject({ cleanerId: 42, monthsReviewed: 2 });

    const insertSql = mockDb.prepare.mock.calls.find(([q]: [string]) => q.includes('kpi_annual_summary'))?.[0];
    expect(insertSql).toBeDefined();
    expect(insertSql).not.toContain('review_month');
  });
});
