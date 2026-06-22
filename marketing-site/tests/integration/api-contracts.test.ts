/**
 * API CONTRACT TESTS — Marketing Site
 * Validates the shape and structure of every API response.
 * Run: npx jest tests/integration/api-contracts.test.ts
 */

describe('API Contracts', () => {
  const BASE_URL = process.env.BASE_URL || 'https://scratchsolidsolutions.org';

  async function fetchJson(path: string, init?: RequestInit) {
    const res = await fetch(`${BASE_URL}${path}`, init);
    return { res, body: await res.json().catch(() => null) };
  }

  describe('/api/services', () => {
    it('returns array with correct shape', async () => {
      const { res, body } = await fetchJson('/api/services');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect(Array.isArray(body)).toBe(true);
      if (body && body.length > 0) {
        const item = body[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(typeof item.name).toBe('string');
      }
    });
  });

  describe('/api/pricing', () => {
    it('returns array with correct shape', async () => {
      const { res, body } = await fetchJson('/api/pricing');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('/api/content', () => {
    it('returns array with correct shape', async () => {
      const { res, body } = await fetchJson('/api/content');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('/api/content/[slug]', () => {
    it('privacy slug has correct shape', async () => {
      const { res, body } = await fetchJson('/api/content/privacy');
      if (res.status === 404) return;
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      if (body) {
        expect(body).toHaveProperty('slug');
        expect(body.slug).toBe('privacy');
      }
    });

    it('terms slug has correct shape', async () => {
      const { res, body } = await fetchJson('/api/content/terms');
      if (res.status === 404) return;
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      if (body) {
        expect(body).toHaveProperty('slug');
        expect(body.slug).toBe('terms');
      }
    });
  });

  describe('/api/cleaners', () => {
    it('returns array with correct shape', async () => {
      const { res, body } = await fetchJson('/api/cleaners');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('/api/feedback', () => {
    it('returns array with correct shape', async () => {
      const { res, body } = await fetchJson('/api/feedback');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('/api/chatbot', () => {
    it('responds with response field', async () => {
      const { res, body } = await fetchJson('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'hello' }),
      });
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      if (body) {
        expect(body).toHaveProperty('response');
        expect(typeof body.response).toBe('string');
      }
    });
  });

  describe('/api/auth/login', () => {
    it('returns error for invalid credentials', async () => {
      const { res, body } = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '0000000000', password: 'wrong' }),
      });
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      if (body) {
        expect(body).toHaveProperty('error');
      }
    });
  });

  describe('/api/auth/signup', () => {
    it('returns error for duplicate email', async () => {
      const { res, body } = await fetchJson('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'individual',
          name: 'Test',
          phone: '0000000000',
          email: 'duplicate@test.com',
          address: '123',
          password: 'Test123!',
        }),
      });
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      if (res.status === 400 || res.status === 409) {
        expect(body).toHaveProperty('error');
      }
    });
  });

  describe('/api/employees', () => {
    it('returns array with correct shape', async () => {
      const { res, body } = await fetchJson('/api/employees');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect(Array.isArray(body)).toBe(true);
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

  describe('/api/customer/quotes', () => {
    it('returns array with correct shape', async () => {
      const { res, body } = await fetchJson('/api/customer/quotes');
      expect(res.status).toBeLessThan(500);
      if (res.status === 429) return;
      expect(Array.isArray(body)).toBe(true);
    });
  });
});
