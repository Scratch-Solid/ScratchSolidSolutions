/**
 * Admin Failure Logging Utility
 * Logs admin action failures for debugging and security monitoring
 */

import { getDb } from './db';

interface AdminFailureLog {
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  error_message: string;
  error_code?: string;
  request_details?: any;
  ip_address?: string;
  user_agent?: string;
}

export async function logAdminFailure(log: AdminFailureLog): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Admin Failure Log] Database not available');
      return;
    }
    
    await db.prepare(`
      INSERT INTO admin_failure_logs (
        admin_id, action, resource_type, resource_id, error_message, 
        error_code, request_details, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      log.admin_id,
      log.action,
      log.resource_type,
      log.resource_id || null,
      log.error_message,
      log.error_code || null,
      log.request_details ? JSON.stringify(log.request_details) : null,
      log.ip_address || null,
      log.user_agent || null
    ).run();
  } catch (error) {
    console.error('[Admin Failure Log] Failed to log admin failure:', error);
  }
}

export async function getAdminFailureLogs(adminId: string, limit: number = 100): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Admin Failure Log] Database not available');
      return [];
    }
    
    const result = await db.prepare(`
      SELECT * FROM admin_failure_logs
      WHERE admin_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(adminId, limit).all();
    
    return (result.results || []) as any[];
  } catch (error) {
    console.error('[Admin Failure Log] Failed to fetch admin failure logs:', error);
    return [];
  }
}

export async function getAllAdminFailureLogs(limit: number = 100, offset: number = 0): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Admin Failure Log] Database not available');
      return [];
    }
    
    const result = await db.prepare(`
      SELECT afl.*, u.username, u.email
      FROM admin_failure_logs afl
      LEFT JOIN users u ON afl.admin_id = u.id
      ORDER BY afl.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    return (result.results || []) as any[];
  } catch (error) {
    console.error('[Admin Failure Log] Failed to fetch all admin failure logs:', error);
    return [];
  }
}

export async function getAdminFailureStats(adminId?: string): Promise<any> {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Admin Failure Log] Database not available');
      return { total_failures: 0, by_action: [] };
    }
    
    let query = `
      SELECT 
        action,
        resource_type,
        error_code,
        COUNT(*) as count,
        MAX(created_at) as last_occurred
      FROM admin_failure_logs
    `;
    
    const params: any[] = [];
    
    if (adminId) {
      query += ' WHERE admin_id = ?';
      params.push(adminId);
    }
    
    query += ' GROUP BY action, resource_type, error_code ORDER BY count DESC';
    
    const result = await db.prepare(query).bind(...params).all();
    
    return {
      total_failures: (result.results || []).reduce((sum: number, row: any) => sum + row.count, 0),
      by_action: (result.results || [])
    };
  } catch (error) {
    console.error('[Admin Failure Log] Failed to fetch admin failure stats:', error);
    return { total_failures: 0, by_action: [] };
  }
}
