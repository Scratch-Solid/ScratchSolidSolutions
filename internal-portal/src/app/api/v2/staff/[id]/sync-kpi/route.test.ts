/**
 * Regression test for a real bug: this route's local-DB write and
 * admin/staff-reviews' write both upsert the same staff_monthly_reviews row
 * (unique on staff_id/month/year), and this route used to write its KPI
 * JSON blob into the same `notes` column staff-reviews uses for the admin's
 * free-text comment - so whichever call landed last silently overwrote the
 * other's data. Fixed by giving the KPI snapshot its own column.
 */
import { POST } from './route';
import { NextRequest } from 'next/server';

const mockDb = {
  prepare: jest.fn(() => mockDb),
  bind: jest.fn(() => mockDb),
  first: jest.fn(),
  run: jest.fn(() => Promise.resolve({})),
};

jest.mock('@/lib/db', () => ({
  getDb: jest.fn(() => Promise.resolve(mockDb)),
}));

jest.mock('@/lib/middleware', () => ({
  withAuth: jest.fn(() => Promise.resolve({ user: { user_id: 1, role: 'admin' } })),
  withTracing: jest.fn(() => 'trace-id'),
  withSecurityHeaders: jest.fn((res: any) => res),
  withCsrf: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/lib/cleaner-integrations', () => ({
  getErpNextCreds: jest.fn(() => Promise.resolve({ baseUrl: null, apiKey: null, apiSecret: null })),
}));

jest.mock('@/lib/kpi', () => ({
  calculateKpi: jest.fn(() => Promise.resolve({
    kpi5pt: 4, clientComponent: 8, systemComponent: 7, adminComponent: 9, bonusPercentage: 80, overall10pt: 8,
  })),
}));

function createRequest(): NextRequest {
  return new NextRequest('http://localhost/api/v2/staff/1/sync-kpi', { method: 'POST' });
}

describe('POST /api/v2/staff/[id]/sync-kpi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.run.mockResolvedValue({});
  });

  test('writes the KPI snapshot to kpi_snapshot, not notes', async () => {
    await POST(createRequest(), { params: Promise.resolve({ id: '1' }) });

    const sql = mockDb.prepare.mock.calls.find(([query]: [string]) => query.includes('staff_monthly_reviews'))?.[0];
    expect(sql).toBeDefined();
    expect(sql).toContain('kpi_snapshot');
    expect(sql).not.toMatch(/\bnotes\b/);
  });

  test('does not reference the nonexistent review_month column', async () => {
    await POST(createRequest(), { params: Promise.resolve({ id: '1' }) });

    for (const [query] of mockDb.prepare.mock.calls) {
      expect(query).not.toContain('review_month');
    }
  });
});
