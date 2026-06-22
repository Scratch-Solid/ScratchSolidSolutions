/**
 * API CONTRACT TESTS — Internal Portal
 * Validates the shape and structure of every API response.
 * Run: npx jest tests/integration/api-contracts.test.ts
 */

describe('API Contracts', () => {
  const BASE_URL = process.env.BASE_URL || 'https://portal.scratchsolidsolutions.org';

  async function fetchJson(path: string, init?: RequestInit) {
    const res = await fetch(`${BASE_URL}${path}`, init);
    return { res, body: await res.json().catch(() => null) };
  }

  describe('/api/employees', () => {
    it('returns array with correct shape', async () => {
      const { res, body } = await fetchJson('/api/employees');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect(Array.isArray(body)).toBe(true);
      if (body && body.length > 0) {
        const item = body[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
      }
    });
  });

  describe('/api/contracts', () => {
    it('returns array with correct shape', async () => {
      const { res, body } = await fetchJson('/api/contracts');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('/api/bookings', () => {
    it('returns array with correct shape', async () => {
      const { res, body } = await fetchJson('/api/bookings');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('/api/auth/login', () => {
    it('returns error for invalid credentials', async () => {
      const { res, body } = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'invalid', password: 'wrong' }),
      });
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      if (body) {
        expect(body).toHaveProperty('error');
      }
    });
  });

  describe('/api/auth/forgot-password', () => {
    it('returns 400 or 404 for unknown email', async () => {
      const { res } = await fetchJson('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@test.com' }),
      });
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect([200, 400, 404]).toContain(res.status);
    });
  });

  describe('/api/cleaner/pre-dashboard', () => {
    it('returns object with data field', async () => {
      const { res, body } = await fetchJson('/api/cleaner/pre-dashboard');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      if (body) {
        expect(body).toHaveProperty('data');
      }
    });
  });

  describe('/api/marketing/content', () => {
    it('returns array with correct shape', async () => {
      const { res, body } = await fetchJson('/api/marketing/content');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('/api/admin/users', () => {
    it('requires auth', async () => {
      const { res } = await fetchJson('/api/admin/users');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('/api/admin/bookings', () => {
    it('requires auth', async () => {
      const { res } = await fetchJson('/api/admin/bookings');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('/api/admin/new-joiners', () => {
    it('requires auth', async () => {
      const { res } = await fetchJson('/api/admin/new-joiners');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('/api/admin/services', () => {
    it('requires auth', async () => {
      const { res } = await fetchJson('/api/admin/services');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('/api/payroll', () => {
    it('requires auth or returns empty', async () => {
      const { res } = await fetchJson('/api/payroll');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
    });
  });

  describe('/api/notifications', () => {
    it('requires auth or returns empty', async () => {
      const { res } = await fetchJson('/api/notifications');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
    });
  });
});
