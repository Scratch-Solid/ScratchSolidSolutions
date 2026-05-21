/**
 * Database helper module for backend-worker
 * Provides access to D1 database instance
 */

// Global reference to the database instance
let dbInstance: any = null;

/**
 * Set the global database instance
 * Call this from the scheduled handler before using getDb()
 */
export function setDbInstance(db: any) {
  dbInstance = db;
}

/**
 * Get the database instance
 * Must call setDbInstance() first from the scheduled handler
 */
export async function getDb() {
  if (!dbInstance) {
    throw new Error('Database instance not set. Call setDbInstance(env.scratchsolid_db) from the scheduled handler first.');
  }
  return dbInstance;
}

/**
 * Get read session for unconstrained reads
 */
export function getReadSession(env: any) {
  return env.scratchsolid_db.withSession("first-unconstrained");
}

/**
 * Get consistent read session for primary reads
 */
export function getConsistentReadSession(env: any) {
  return env.scratchsolid_db.withSession("first-primary");
}
