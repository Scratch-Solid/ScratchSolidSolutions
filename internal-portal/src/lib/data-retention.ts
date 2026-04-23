export const DATA_RETENTION_POLICIES: Record<string, { retentionDays: number; action: 'delete' | 'archive' }> = {
  audit_logs: { retentionDays: 2555, action: 'archive' }, // 7 years
  bookings: { retentionDays: 2555, action: 'archive' },
  task_completions: { retentionDays: 2555, action: 'archive' },
  sessions: { retentionDays: 30, action: 'delete' },
  soft_deleted_users: { retentionDays: 30, action: 'delete' },
  reviews: { retentionDays: 1825, action: 'delete' }, // 5 years
  gallery_images: { retentionDays: 1095, action: 'delete' }, // 3 years
  notifications: { retentionDays: 90, action: 'delete' },
};

export function shouldPurge(lastUpdated: string | Date, policyKey: string): boolean {
  const policy = DATA_RETENTION_POLICIES[policyKey];
  if (!policy) return false;
  const lastDate = new Date(lastUpdated);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - policy.retentionDays);
  return lastDate < cutoff;
}
