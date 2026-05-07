export const DATA_RETENTION_POLICIES: Record<string, { retentionDays: number; action: 'delete' | 'archive' }> = {
  audit_logs: { retentionDays: 2555, action: 'archive' }, // 7 years
  bookings: { retentionDays: 2555, action: 'archive' },
  task_completions: { retentionDays: 2555, action: 'archive' },
  sessions: { retentionDays: 30, action: 'delete' },
  soft_deleted_users: { retentionDays: 30, action: 'delete' },
  reviews: { retentionDays: 1825, action: 'delete' }, // 5 years
  gallery_images: { retentionDays: 1095, action: 'delete' }, // 3 years
  notifications: { retentionDays: 90, action: 'delete' },
  refresh_tokens: { retentionDays: 30, action: 'delete' },
};

export function shouldPurge(lastUpdated: string | Date, policyKey: string): boolean {
  const policy = DATA_RETENTION_POLICIES[policyKey];
  if (!policy) return false;
  const lastDate = new Date(lastUpdated);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - policy.retentionDays);
  return lastDate < cutoff;
}

/**
 * Cleanup expired data based on retention policies
 * This should be run periodically (e.g., daily cron job)
 */
export async function cleanupExpiredData(db: D1Database): Promise<{ deleted: Record<string, number>; errors: string[] }> {
  const results: Record<string, number> = {};
  const errors: string[] = [];
  const now = new Date();

  try {
    // Cleanup expired sessions
    const sessionCutoff = new Date(now);
    sessionCutoff.setDate(sessionCutoff.getDate() - DATA_RETENTION_POLICIES.sessions.retentionDays);
    const sessionsDeleted = await db.prepare(
      'DELETE FROM sessions WHERE created_at < ?'
    ).bind(sessionCutoff.toISOString()).run();
    results.sessions = sessionsDeleted.meta.changes || 0;

    // Cleanup expired refresh tokens
    const refreshTokenCutoff = new Date(now);
    refreshTokenCutoff.setDate(refreshTokenCutoff.getDate() - DATA_RETENTION_POLICIES.refresh_tokens.retentionDays);
    const refreshTokensDeleted = await db.prepare(
      'DELETE FROM refresh_tokens WHERE created_at < ?'
    ).bind(refreshTokenCutoff.toISOString()).run();
    results.refresh_tokens = refreshTokensDeleted.meta.changes || 0;

    // Archive old audit logs (mark as archived)
    const auditLogCutoff = new Date(now);
    auditLogCutoff.setDate(auditLogCutoff.getDate() - DATA_RETENTION_POLICIES.audit_logs.retentionDays);
    const auditLogsArchived = await db.prepare(
      'UPDATE audit_logs SET archived = 1 WHERE created_at < ? AND archived = 0'
    ).bind(auditLogCutoff.toISOString()).run();
    results.audit_logs = auditLogsArchived.meta.changes || 0;

  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error during cleanup');
  }

  return { deleted: results, errors };
}
