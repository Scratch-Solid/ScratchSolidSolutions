/**
 * Portal Database Data Retention Cleanup
 * POPIA-compliant cleanup for the internal-portal database
 * This runs alongside the main backend-worker cleanup
 */

const PORTAL_RETENTION_POLICIES: Record<string, { retentionDays: number }> = {
  sessions: { retentionDays: 30 },
  refresh_tokens: { retentionDays: 30 },
  notifications: { retentionDays: 90 },
  audit_logs: { retentionDays: 2555 }, // 7 years
  // POPIA: transient tracking metadata must expire within 48 hours of job completion
  whatsapp_sessions: { retentionDays: 2 },
  job_tracking_metadata: { retentionDays: 2 },
};

export async function cleanupPortalExpiredData(
  db: D1Database
): Promise<{ deleted: Record<string, number>; errors: string[] }> {
  const results: Record<string, number> = {};
  const errors: string[] = [];
  const now = new Date();

  try {
    // Cleanup expired sessions
    const sessionCutoff = new Date(now);
    sessionCutoff.setDate(sessionCutoff.getDate() - PORTAL_RETENTION_POLICIES.sessions.retentionDays);
    const sessionsDeleted = await db
      .prepare('DELETE FROM sessions WHERE created_at < ?')
      .bind(sessionCutoff.toISOString())
      .run();
    results.sessions = (sessionsDeleted.meta?.changes as number) || 0;

    // Cleanup expired refresh tokens
    const refreshTokenCutoff = new Date(now);
    refreshTokenCutoff.setDate(
      refreshTokenCutoff.getDate() - PORTAL_RETENTION_POLICIES.refresh_tokens.retentionDays
    );
    const refreshTokensDeleted = await db
      .prepare('DELETE FROM refresh_tokens WHERE created_at < ?')
      .bind(refreshTokenCutoff.toISOString())
      .run();
    results.refresh_tokens = (refreshTokensDeleted.meta?.changes as number) || 0;

    // Cleanup old notifications
    const notificationsCutoff = new Date(now);
    notificationsCutoff.setDate(
      notificationsCutoff.getDate() - PORTAL_RETENTION_POLICIES.notifications.retentionDays
    );
    const notificationsDeleted = await db
      .prepare('DELETE FROM notifications WHERE created_at < ?')
      .bind(notificationsCutoff.toISOString())
      .run();
    results.notifications = (notificationsDeleted.meta?.changes as number) || 0;

    // Archive old audit logs (mark as archived)
    const auditLogCutoff = new Date(now);
    auditLogCutoff.setDate(
      auditLogCutoff.getDate() - PORTAL_RETENTION_POLICIES.audit_logs.retentionDays
    );
    const auditLogsArchived = await db
      .prepare('UPDATE audit_logs SET archived = 1 WHERE created_at < ? AND archived = 0')
      .bind(auditLogCutoff.toISOString())
      .run();
    results.audit_logs = (auditLogsArchived.meta?.changes as number) || 0;

    // POPIA: purge transient tracking metadata after 48 hours
    const trackingCutoff = new Date(now);
    trackingCutoff.setDate(
      trackingCutoff.getDate() - PORTAL_RETENTION_POLICIES.whatsapp_sessions.retentionDays
    );
    const whatsappSessionsDeleted = await db
      .prepare('DELETE FROM whatsapp_sessions WHERE conversation_expires_at < ?')
      .bind(trackingCutoff.toISOString())
      .run();
    results.whatsapp_sessions = (whatsappSessionsDeleted.meta?.changes as number) || 0;

    // Also clean any job_tracking_metadata table if it exists
    try {
      const jobTrackingDeleted = await db
        .prepare('DELETE FROM job_tracking_metadata WHERE created_at < ?')
        .bind(trackingCutoff.toISOString())
        .run();
      results.job_tracking_metadata = (jobTrackingDeleted.meta?.changes as number) || 0;
    } catch {
      // Table may not exist yet; ignore
      results.job_tracking_metadata = 0;
    }

    // Clean soft-deleted users (permanent deletion after 30-day grace)
    const softDeleteCutoff = new Date(now);
    softDeleteCutoff.setDate(softDeleteCutoff.getDate() - 30);
    try {
      const softDeletedUsers = await db
        .prepare('DELETE FROM users WHERE deleted_at < ?')
        .bind(softDeleteCutoff.toISOString())
        .run();
      results.soft_deleted_users = (softDeletedUsers.meta?.changes as number) || 0;
    } catch {
      // deleted_at column may not exist; ignore
      results.soft_deleted_users = 0;
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error during portal cleanup');
  }

  return { deleted: results, errors };
}

export async function cleanupTrainingExpiredData(
  db: D1Database
): Promise<{ deleted: Record<string, number>; errors: string[] }> {
  const results: Record<string, number> = {};
  const errors: string[] = [];

  try {
    // Clean old login_activity (retain 90 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const loginActivityDeleted = await db
      .prepare('DELETE FROM login_activity WHERE created_at < ?')
      .bind(cutoff.toISOString())
      .run();
    results.login_activity = (loginActivityDeleted.meta?.changes as number) || 0;

    // Clean old training_progress audit records (retain 1 year)
    const trainingCutoff = new Date();
    trainingCutoff.setDate(trainingCutoff.getDate() - 365);
    const trainingDeleted = await db
      .prepare('DELETE FROM training_progress WHERE updated_at < ? AND status = "completed"')
      .bind(trainingCutoff.toISOString())
      .run();
    results.training_progress = (trainingDeleted.meta?.changes as number) || 0;
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : 'Unknown error during training cleanup'
    );
  }

  return { deleted: results, errors };
}
