// Cloudflare Queue Consumer for D1 Write Batching
// Attach this to a Cloudflare Queue to batch non-critical D1 writes
// (audit logs, notifications, analytics) and reduce single-writer contention

export interface Env {
  DB: D1Database;
}

export interface WriteMessage {
  type: 'audit_log' | 'notification' | 'analytics';
  payload: Record<string, any>;
  timestamp: string;
}

export default {
  async queue(batch: MessageBatch<WriteMessage>, env: Env, ctx: ExecutionContext) {
    // Group messages by type for batch inserts
    const auditLogs: WriteMessage[] = [];
    const notifications: WriteMessage[] = [];

    for (const msg of batch.messages) {
      switch (msg.body.type) {
        case 'audit_log':
          auditLogs.push(msg.body);
          break;
        case 'notification':
          notifications.push(msg.body);
          break;
      }
    }

    // Batch insert audit logs
    if (auditLogs.length > 0) {
      const placeholders = auditLogs.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const values = auditLogs.flatMap(m => [
        m.payload.admin_id || null,
        m.payload.action,
        m.payload.resource_type,
        m.payload.resource_id || null,
        JSON.stringify(m.payload.details || {}),
        m.payload.ip_address || ''
      ]);
      await env.DB.prepare(
        `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address) VALUES ${placeholders}`
      ).bind(...values).run();
    }

    // Batch insert notifications
    if (notifications.length > 0) {
      const placeholders = notifications.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const values = notifications.flatMap(m => [
        m.payload.user_id,
        m.payload.type,
        m.payload.message,
        m.payload.channel,
        m.payload.status || 'pending'
      ]);
      await env.DB.prepare(
        `INSERT INTO notifications (user_id, type, message, channel, status) VALUES ${placeholders}`
      ).bind(...values).run();
    }

    // Acknowledge all messages
    for (const msg of batch.messages) {
      msg.ack();
    }
  }
};
