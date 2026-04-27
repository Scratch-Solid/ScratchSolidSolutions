/**
 * Retention Policies Worker
 * Runs via Cloudflare Cron to enforce data retention policies
 * - Reviews: Keep for 2 years
 * - Gallery images: Keep for 1 year
 * - Financial records: Keep for 7 years (compliance)
 * - Audit logs: Keep for 5 years
 */

import { getDb } from '../lib/db';

const RETENTION_POLICIES = {
  reviews: { days: 730, description: '2 years' }, // 2 years
  gallery: { days: 365, description: '1 year' }, // 1 year
  financial: { days: 2555, description: '7 years' }, // 7 years (compliance)
  audit_logs: { days: 1825, description: '5 years' }, // 5 years
};

export async function handleRetentionPolicies() {
  const db = await getDb();
  
  try {
    console.log('[Retention Policies] Starting check...');
    
    let totalDeleted = 0;
    const results: any = {};
    
    // Delete old reviews
    const oldReviews = await db.prepare(`
      SELECT id, user_id, booking_id
      FROM reviews
      WHERE created_at < date('now', '-' || ${RETENTION_POLICIES.reviews.days} || ' days')
    `).all();
    
    if (oldReviews.results && oldReviews.results.length > 0) {
      for (const review of oldReviews.results as any[]) {
        await db.prepare('DELETE FROM reviews WHERE id = ?').bind(review.id).run();
        totalDeleted++;
      }
      results.reviews = { deleted: oldReviews.results.length, policy: RETENTION_POLICIES.reviews.description };
      console.log(`[Retention Policies] Deleted ${oldReviews.results.length} old reviews`);
    }
    
    // Delete old gallery images (from content_pages or background_images)
    const oldBackgroundImages = await db.prepare(`
      SELECT id
      FROM background_images
      WHERE created_at < date('now', '-' || ${RETENTION_POLICIES.gallery.days} || ' days')
    `).all();
    
    if (oldBackgroundImages.results && oldBackgroundImages.results.length > 0) {
      for (const img of oldBackgroundImages.results as any[]) {
        await db.prepare('DELETE FROM background_images WHERE id = ?').bind(img.id).run();
        totalDeleted++;
      }
      results.gallery = { deleted: oldBackgroundImages.results.length, policy: RETENTION_POLICIES.gallery.description };
      console.log(`[Retention Policies] Deleted ${oldBackgroundImages.results.length} old gallery images`);
    }
    
    // Financial records - keep for 7 years (compliance), only delete records older than 7 years
    const oldPayments = await db.prepare(`
      SELECT id, user_id, booking_id
      FROM payments
      WHERE created_at < date('now', '-' || ${RETENTION_POLICIES.financial.days} || ' days')
    `).all();
    
    if (oldPayments.results && oldPayments.results.length > 0) {
      // For financial records, we might want to archive them instead of deleting
      // For now, we'll mark them as archived instead of deleting
      for (const payment of oldPayments.results as any[]) {
        await db.prepare(`
          UPDATE payments 
          SET status = 'archived', 
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(payment.id).run();
        totalDeleted++;
      }
      results.financial = { archived: oldPayments.results.length, policy: RETENTION_POLICIES.financial.description };
      console.log(`[Retention Policies] Archived ${oldPayments.results.length} old payment records`);
    }
    
    // Delete old audit logs (keep for 5 years)
    const oldAuditLogs = await db.prepare(`
      SELECT id
      FROM audit_logs
      WHERE created_at < date('now', '-' || ${RETENTION_POLICIES.audit_logs.days} || ' days')
    `).all();
    
    if (oldAuditLogs.results && oldAuditLogs.results.length > 0) {
      for (const log of oldAuditLogs.results as any[]) {
        await db.prepare('DELETE FROM audit_logs WHERE id = ?').bind(log.id).run();
        totalDeleted++;
      }
      results.audit_logs = { deleted: oldAuditLogs.results.length, policy: RETENTION_POLICIES.audit_logs.description };
      console.log(`[Retention Policies] Deleted ${oldAuditLogs.results.length} old audit logs`);
    }
    
    // Clean up old password reset tokens (keep for 30 days)
    const oldResetTokens = await db.prepare(`
      SELECT id
      FROM password_reset_tokens
      WHERE expires_at < date('now', '-30 days')
    `).all();
    
    if (oldResetTokens.results && oldResetTokens.results.length > 0) {
      for (const token of oldResetTokens.results as any[]) {
        await db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').bind(token.id).run();
        totalDeleted++;
      }
      results.password_reset_tokens = { deleted: oldResetTokens.results.length, policy: '30 days' };
      console.log(`[Retention Policies] Deleted ${oldResetTokens.results.length} old password reset tokens`);
    }
    
    // Clean up expired sessions
    const oldSessions = await db.prepare(`
      SELECT id
      FROM sessions
      WHERE expires_at < datetime('now')
    `).all();
    
    if (oldSessions.results && oldSessions.results.length > 0) {
      for (const session of oldSessions.results as any[]) {
        await db.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run();
        totalDeleted++;
      }
      results.sessions = { deleted: oldSessions.results.length, policy: 'expired immediately' };
      console.log(`[Retention Policies] Deleted ${oldSessions.results.length} expired sessions`);
    }
    
    console.log(`[Retention Policies] Completed: ${totalDeleted} total records processed`);
    
    return { success: true, totalDeleted, results };
  } catch (error) {
    console.error('[Retention Policies] Error:', error);
    return { success: false, error: String(error) };
  }
}

// Cloudflare Worker entry point
export default {
  async scheduled(event: any, env: any, ctx: any) {
    await handleRetentionPolicies();
  }
};
