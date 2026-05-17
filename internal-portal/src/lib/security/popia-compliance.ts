// POPIA Compliance Layer
// Phase 10: Security Hardening & Compliance Innovation

export interface RedactedData {
  original: any;
  redacted: any;
  redactedFields: string[];
}

export class PopiaCompliance {
  private sensitiveFields: string[] = [
    'phone',
    'address',
    'tax_number',
    'id_number',
    'bank_account',
    'salary',
    'id_number'
  ];

  /**
   * Redacts sensitive data based on user role
   */
  redactSensitiveData(data: any, role: string, userId: number): RedactedData {
    const redactedFields: string[] = [];
    const redacted = { ...data };

    // Admin can see everything
    if (role === 'admin') {
      return { original: data, redacted: data, redactedFields: [] };
    }

    // Redact sensitive fields for non-admin users
    for (const field of this.sensitiveFields) {
      if (redacted[field] !== undefined) {
        redacted[field] = this.redactValue(redacted[field]);
        redactedFields.push(field);
      }
    }

    return { original: data, redacted, redactedFields };
  }

  /**
   * Redacts a value
   */
  private redactValue(value: any): string {
    if (typeof value === 'string') {
      if (value.length <= 4) {
        return '****';
      }
      return value.substring(0, 2) + '****' + value.substring(value.length - 2);
    }
    return '****';
  }

  /**
   * Checks if user has permission to view data
   */
  hasPermission(userId: number, targetUserId: number, role: string): boolean {
    // Admin can view everything
    if (role === 'admin') return true;

    // Users can view their own data
    if (userId === targetUserId) return true;

    return false;
  }
}

export class AdminProxyObserver {
  private activeSessions: Map<string, { adminUserId: number; targetUserId: number; startedAt: Date }> = new Map();

  /**
   * Starts a proxy observation session
   */
  async startSession(
    db: D1Database,
    adminUserId: number,
    targetUserId: number,
    ipAddress: string,
    userAgent: string
  ): Promise<string> {
    const sessionId = crypto.randomUUID();

    this.activeSessions.set(sessionId, {
      adminUserId,
      targetUserId,
      startedAt: new Date()
    });

    // Log to audit
    await db.prepare(`
      INSERT INTO proxy_access_audit (admin_user_id, target_user_id, action, ip_address, user_agent, session_id, started_at)
      VALUES (?, ?, 'START_SESSION', ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(adminUserId, targetUserId, ipAddress, userAgent, sessionId).run();

    return sessionId;
  }

  /**
   * Ends a proxy observation session
   */
  async endSession(
    db: D1Database,
    sessionId: string
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    await db.prepare(`
      UPDATE proxy_access_audit
      SET ended_at = CURRENT_TIMESTAMP
      WHERE session_id = ?
    `).bind(sessionId).run();

    this.activeSessions.delete(sessionId);
  }

  /**
   * Gets an active session
   */
  getSession(sessionId: string): { adminUserId: number; targetUserId: number; startedAt: Date } | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Checks if a session is valid
   */
  isSessionValid(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    // Sessions expire after 1 hour
    const expiryTime = 60 * 60 * 1000;
    return Date.now() - session.startedAt.getTime() < expiryTime;
  }
}

// Singleton instances
export const popiaCompliance = new PopiaCompliance();
export const adminProxyObserver = new AdminProxyObserver();
