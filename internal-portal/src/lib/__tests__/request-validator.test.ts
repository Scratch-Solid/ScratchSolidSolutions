import { userSignupSchema } from '../request-validator';

describe('userSignupSchema', () => {
  const base = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'StrongP@ssw0rd',
    phone: '+27123456789',
  };

  it('rejects role=admin - regression test for the 2026-07-16 privilege-escalation bug', () => {
    // Public signup previously accepted role="admin" and created a fully
    // functional admin account with no invite/approval step. Admin accounts
    // must only be created via /api/admin/invite -> /api/auth/accept-invite.
    const result = userSignupSchema.safeParse({ ...base, role: 'admin' });
    expect(result.success).toBe(false);
  });

  it('accepts the legitimate self-service roles', () => {
    for (const role of ['client', 'cleaner', 'digital', 'transport']) {
      const result = userSignupSchema.safeParse({ ...base, role });
      expect(result.success).toBe(true);
    }
  });
});
