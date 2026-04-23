import { shouldPurge, DATA_RETENTION_POLICIES } from '../lib/data-retention';

describe('data retention policies', () => {
  test('sessions should be purged after 30 days', () => {
    const old = new Date();
    old.setDate(old.getDate() - 31);
    expect(shouldPurge(old.toISOString(), 'sessions')).toBe(true);
  });

  test('active records should not be purged', () => {
    const recent = new Date();
    expect(shouldPurge(recent.toISOString(), 'sessions')).toBe(false);
  });

  test('all policies have retentionDays and action', () => {
    Object.values(DATA_RETENTION_POLICIES).forEach(policy => {
      expect(policy.retentionDays).toBeGreaterThan(0);
      expect(['delete', 'archive']).toContain(policy.action);
    });
  });
});
