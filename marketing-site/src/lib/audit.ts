import { getDb } from './db';

export interface AuditLogOptions {
  resourceType: string;
  resourceId?: number;
  action: string;
  adminId?: number;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  details?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(options: AuditLogOptions): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Database not available for audit logging');
      return;
    }

    const {
      resourceType,
      resourceId,
      action,
      adminId,
      userEmail,
      userRole,
      ipAddress,
      details = {},
      metadata = {},
    } = options;

    await db.prepare(
      `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_email, user_role, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      adminId || null,
      action,
      resourceType,
      resourceId || null,
      JSON.stringify(details),
      ipAddress || '',
      userEmail || null,
      userRole || null,
      JSON.stringify(metadata)
    ).run();
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging failures shouldn't break the main flow
  }
}
