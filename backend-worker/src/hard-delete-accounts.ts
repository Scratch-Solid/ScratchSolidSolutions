/**
 * Hard Delete Accounts Worker
 * Runs via Cloudflare Cron to permanently delete accounts after 30-day grace period
 */

import { getDb } from '../lib/db';

const GRACE_PERIOD_DAYS = 30;

export async function handleHardDeleteAccounts() {
  const db = await getDb();
  
  try {
    console.log('[Hard Delete Accounts] Starting check...');
    
    // Find accounts past grace period
    const expiredAccounts = await db.prepare(`
      SELECT id, email, role
      FROM users
      WHERE deleted = 1
      AND soft_delete_at IS NOT NULL
      AND date(soft_delete_at, '+' || ${GRACE_PERIOD_DAYS} || ' days') < date('now')
    `).all();
    
    console.log(`[Hard Delete Accounts] Found ${expiredAccounts.results?.length || 0} accounts past grace period`);
    
    if (!expiredAccounts.results || expiredAccounts.results.length === 0) {
      return { success: true, deleted: 0 };
    }
    
    let deletedCount = 0;
    
    for (const account of expiredAccounts.results as any[]) {
      try {
        const userId = account.id;
        
        // Cascade delete related data
        // Delete bookings
        await db.prepare('DELETE FROM bookings WHERE client_id = ?').bind(userId).run();
        await db.prepare('DELETE FROM bookings WHERE cleaner_id = ?').bind(userId).run();
        
        // Delete payments
        await db.prepare('DELETE FROM payments WHERE user_id = ?').bind(userId).run();
        
        // Delete reviews
        await db.prepare('DELETE FROM reviews WHERE user_id = ?').bind(userId).run();
        
        // Delete notifications
        await db.prepare('DELETE FROM notifications WHERE user_id = ?').bind(userId).run();
        
        // Delete sessions
        await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
        
        // Delete cleaner profile if exists
        await db.prepare('DELETE FROM cleaner_profiles WHERE user_id = ?').bind(userId).run();
        
        // Delete password reset tokens
        await db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(userId).run();
        
        // Delete audit logs for this user (optional - keep for compliance)
        // await db.prepare('DELETE FROM audit_logs WHERE admin_id = ?').bind(userId).run();
        
        // Finally delete the user
        await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
        
        deletedCount++;
        console.log(`[Hard Delete Accounts] Permanently deleted user ID: ${userId} (${account.email})`);
      } catch (error) {
        console.error(`[Hard Delete Accounts] Failed to delete account #${account.id}:`, error);
      }
    }
    
    console.log(`[Hard Delete Accounts] Completed: ${deletedCount} accounts permanently deleted`);
    
    return { success: true, deleted: deletedCount };
  } catch (error) {
    console.error('[Hard Delete Accounts] Error:', error);
    return { success: false, error: String(error) };
  }
}

// Cloudflare Worker entry point
export default {
  async scheduled(event: any, env: any, ctx: any) {
    await handleHardDeleteAccounts();
  }
};
