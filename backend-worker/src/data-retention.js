/**
 * Data Retention Cleanup Script
 * 
 * This script implements automated data cleanup based on retention policies:
 * - Sessions/Refresh tokens: 30 days
 * - Audit logs: 7 years (archive after 1 year)
 * - Bookings: 7 years (archive after 2 years)
 * - Temporary/cache data: 7 days
 */

export class DataRetentionCleanup {
  constructor(env) {
    this.env = env;
  }

  /**
   * Clean up sessions older than 30 days
   */
  async cleanupSessions() {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await this.env.DB.prepare(`
      DELETE FROM sessions 
      WHERE created_at < ?
    `).bind(cutoffDate.toISOString()).run();

    console.log(`Deleted ${result.meta.changes || 0} old sessions`);
    return result;
  }

  /**
   * Clean up refresh tokens older than 30 days
   */
  async cleanupRefreshTokens() {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await this.env.DB.prepare(`
      DELETE FROM refresh_tokens 
      WHERE created_at < ?
    `).bind(cutoffDate.toISOString()).run();

    console.log(`Deleted ${result.meta.changes || 0} old refresh tokens`);
    return result;
  }

  /**
   * Archive audit logs older than 1 year (to be deleted after 7 years)
   */
  async archiveAuditLogs() {
    const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    
    // Get logs to archive
    const logs = await this.env.DB.prepare(`
      SELECT * FROM audit_logs 
      WHERE created_at < ?
      AND archived = 0
      LIMIT 1000
    `).bind(cutoffDate.toISOString()).all();

    if (logs.results.length === 0) {
      console.log('No audit logs to archive');
      return;
    }

    // Archive to R2
    const archiveKey = `audit-logs/${new Date().toISOString().split('T')[0]}.json`;
    const archiveData = JSON.stringify(logs.results);
    
    await this.env.UPLOADS_BUCKET.put(archiveKey, archiveData, {
      customMetadata: {
        type: 'audit-log-archive',
        date: new Date().toISOString(),
        recordCount: logs.results.length
      }
    });

    // Mark as archived
    const ids = logs.results.map(log => log.id);
    const placeholders = ids.map(() => '?').join(',');
    
    await this.env.DB.prepare(`
      UPDATE audit_logs 
      SET archived = 1, archived_at = ?
      WHERE id IN (${placeholders})
    `).bind(new Date().toISOString(), ...ids).run();

    console.log(`Archived ${logs.results.length} audit logs to ${archiveKey}`);
  }

  /**
   * Delete audit logs older than 7 years
   */
  async deleteOldAuditLogs() {
    const cutoffDate = new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000);
    
    const result = await this.env.DB.prepare(`
      DELETE FROM audit_logs 
      WHERE created_at < ?
    `).bind(cutoffDate.toISOString()).run();

    console.log(`Deleted ${result.meta.changes || 0} old audit logs (> 7 years)`);
    return result;
  }

  /**
   * Archive bookings older than 2 years (to be deleted after 7 years)
   */
  async archiveBookings() {
    const cutoffDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
    
    // Get bookings to archive
    const bookings = await this.env.DB.prepare(`
      SELECT * FROM bookings 
      WHERE created_at < ?
      AND archived = 0
      LIMIT 1000
    `).bind(cutoffDate.toISOString()).all();

    if (bookings.results.length === 0) {
      console.log('No bookings to archive');
      return;
    }

    // Archive to R2
    const archiveKey = `bookings/${new Date().toISOString().split('T')[0]}.json`;
    const archiveData = JSON.stringify(bookings.results);
    
    await this.env.UPLOADS_BUCKET.put(archiveKey, archiveData, {
      customMetadata: {
        type: 'booking-archive',
        date: new Date().toISOString(),
        recordCount: bookings.results.length
      }
    });

    // Mark as archived
    const ids = bookings.results.map(booking => booking.id);
    const placeholders = ids.map(() => '?').join(',');
    
    await this.env.DB.prepare(`
      UPDATE bookings 
      SET archived = 1, archived_at = ?
      WHERE id IN (${placeholders})
    `).bind(new Date().toISOString(), ...ids).run();

    console.log(`Archived ${bookings.results.length} bookings to ${archiveKey}`);
  }

  /**
   * Delete bookings older than 7 years
   */
  async deleteOldBookings() {
    const cutoffDate = new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000);
    
    const result = await this.env.DB.prepare(`
      DELETE FROM bookings 
      WHERE created_at < ?
    `).bind(cutoffDate.toISOString()).run();

    console.log(`Deleted ${result.meta.changes || 0} old bookings (> 7 years)`);
    return result;
  }

  /**
   * Clean up temporary cache data older than 7 days
   */
  async cleanupCacheData() {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Clean up KV cache entries (if using TTL-based cache)
    // This would typically be handled by KV TTL policies, but we can also manually clean
    
    // Clean up R2 temporary uploads
    const listResult = await this.env.UPLOADS_BUCKET.list({
      prefix: 'temp-uploads/'
    });

    let deletedCount = 0;
    for (const object of listResult.objects) {
      if (new Date(object.uploaded) < cutoffDate) {
        await this.env.UPLOADS_BUCKET.delete(object.key);
        deletedCount++;
      }
    }

    console.log(`Deleted ${deletedCount} temporary cache files`);
    return { deletedCount };
  }

  /**
   * Run all cleanup tasks
   */
  async runAllCleanup() {
    console.log('Starting data retention cleanup...');
    const startTime = Date.now();
    
    const results = {
      sessions: await this.cleanupSessions(),
      refreshTokens: await this.cleanupRefreshTokens(),
      cacheData: await this.cleanupCacheData(),
    };

    // Archive operations (run less frequently)
    const today = new Date().getDay();
    if (today === 0) { // Sunday
      results.archiveAuditLogs = await this.archiveAuditLogs();
      results.archiveBookings = await this.archiveBookings();
    }

    // Delete very old records (run quarterly)
    const month = new Date().getMonth();
    if (month % 3 === 0 && new Date().getDate() === 1) {
      results.deleteOldAuditLogs = await this.deleteOldAuditLogs();
      results.deleteOldBookings = await this.deleteOldBookings();
    }

    const duration = Date.now() - startTime;
    console.log(`Data retention cleanup completed in ${duration}ms`);
    
    return results;
  }
}

export default DataRetentionCleanup;
