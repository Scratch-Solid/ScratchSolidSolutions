// Shared D1 Database Helper for Cloudflare Pages
// Both marketing-site and internal-portal use this same pattern

import { D1Database } from '@cloudflare/workers-types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getCloudflareContext } from '@/lib/runtime-context';
import { getPgD1 } from '@/lib/server/pg-d1';

export interface Env {
  scratchsolid_db: D1Database;
  training_db: D1Database;
}

// Helper to get the D1 database — Cloudflare context first, then PostgreSQL fallback
export async function getDb(): Promise<D1Database | null> {
  try {
    // Use getCloudflareContext for OpenNext.js on Cloudflare Pages
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const envAny = env as any;

    const db = envAny?.scratchsolid_db || envAny?.scratchsolidDb || envAny?.scratchsolid_db_portal_staging || envAny?.DB || envAny?.db || envAny?.database;
    if (db) {
      return db as D1Database;
    }
    // As a last resort, scan env for a D1-like binding (has prepare method)
    const candidateKey = Object.keys(envAny || {}).find((k) => {
      const val = (envAny as any)[k];
      return val && typeof val === 'object' && typeof (val as any).prepare === 'function';
    });
    if (candidateKey) {
      return (envAny as any)[candidateKey] as D1Database;
    }
  } catch {
    // Not in Cloudflare environment — fall through to PostgreSQL
  }

  // Standalone / Docker fallback: PostgreSQL via pg-d1 adapter
  const pgUrl = process.env.DATABASE_URL || process.env.DB_URL;
  if (pgUrl) {
    return getPgD1(pgUrl) as unknown as D1Database;
  }

  return null;
}

// Helper to get the training database — Cloudflare context first, then PostgreSQL fallback
export async function getTrainingDb(): Promise<D1Database | null> {
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const envAny = env as any;
    const db = envAny?.training_db || envAny?.trainingDb;
    if (db) {
      return db as D1Database;
    }
  } catch {
    // Not in Cloudflare environment — fall through to PostgreSQL
  }

  // Standalone / Docker fallback: reuse main PostgreSQL connection (training data can live in same DB with prefix, or use TRAINING_DATABASE_URL)
  const pgUrl = process.env.TRAINING_DATABASE_URL || process.env.TRAINING_DB_URL || process.env.DATABASE_URL || process.env.DB_URL;
  if (pgUrl) {
    return getPgD1(pgUrl) as unknown as D1Database;
  }

  return null;
}

// User operations
export async function getUserByEmail(db: D1Database, email: string) {
  const result = await db.prepare('SELECT id, email, role, name, phone, address, business_name, password_hash, failed_attempts, locked_until FROM users WHERE email = ?').bind(email).first();
  return result;
}

export async function getUserById(db: D1Database, id: number) {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return result;
}

export async function createUser(db: D1Database, data: {
  email: string;
  password_hash: string;
  role: string;
  name: string;
  phone?: string;
  address?: string;
  business_name?: string;
  business_registration?: string;
}) {
  const result = await db.prepare(
    `INSERT INTO users (email, password_hash, role, name, phone, address, business_name, business_registration, email_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1) RETURNING *`
  ).bind(
    data.email, data.password_hash, data.role, data.name,
    data.phone || '', data.address || '', data.business_name || '', data.business_registration || ''
  ).first();
  return result;
}

export async function validateLogin(db: D1Database, email: string, password: string) {
  const user = await getUserByEmail(db, email);
  if (!user) return null;
  // Check account lockout
  if ((user as any).locked_until && new Date((user as any).locked_until) > new Date()) {
    return null; // Account is locked
  }
  const isValid = await bcrypt.compare(password, (user as any).password_hash);
  if (isValid) {
    await resetFailedAttempts(db, email);
    return user;
  }
  await incrementFailedAttempts(db, email);
  return null;
}

// Session operations
const MAX_CONCURRENT_SESSIONS = 3; // Maximum allowed concurrent sessions per user

export async function createSession(db: D1Database, userId: number, token: string, refreshToken?: string) {
  // Enforce concurrent session limit
  const existingSessions = await db.prepare(
    'SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND expires_at > datetime("now")'
  ).bind(userId).first();
  
  const sessionCount = (existingSessions as any)?.count || 0;
  if (sessionCount >= MAX_CONCURRENT_SESSIONS) {
    // Delete oldest session(s) to make room
    await db.prepare(
      `DELETE FROM sessions WHERE user_id = ? AND expires_at > datetime("now") 
       ORDER BY created_at ASC LIMIT ?`
    ).bind(userId, sessionCount - MAX_CONCURRENT_SESSIONS + 1).run();
  }

  await db.prepare(
    `INSERT INTO sessions (user_id, token, refresh_token, expires_at) VALUES (?, ?, ?, datetime('now', '+24 hours'))`
  ).bind(userId, token, refreshToken || null).run();
}

export async function getUserSessions(db: D1Database, userId: number) {
  const result = await db.prepare(
    'SELECT * FROM sessions WHERE user_id = ? AND expires_at > datetime("now") ORDER BY created_at DESC'
  ).bind(userId).all();
  return result.results;
}

export async function revokeAllUserSessions(db: D1Database, userId: number, exceptToken?: string) {
  if (exceptToken) {
    await db.prepare(
      'DELETE FROM sessions WHERE user_id = ? AND token != ?'
    ).bind(userId, exceptToken).run();
  } else {
    await db.prepare(
      'DELETE FROM sessions WHERE user_id = ?'
    ).bind(userId).run();
  }
}

export async function createRefreshToken(db: D1Database, userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  await db.prepare(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+30 days'))`
  ).bind(userId, token).run();
  return token;
}

export async function validateRefreshToken(db: D1Database, token: string) {
  const session = await db.prepare(
    `SELECT rt.*, u.email, u.role, u.name FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token = ? AND rt.expires_at > datetime('now') AND rt.revoked = 0`
  ).bind(token).first();
  return session;
}

export async function revokeRefreshToken(db: D1Database, token: string) {
  await db.prepare('UPDATE refresh_tokens SET revoked = 1, revoked_at = datetime("now") WHERE token = ?').bind(token).run();
}

// Account lockout operations
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export async function incrementFailedAttempts(db: D1Database, email: string): Promise<number> {
  const user = await getUserByEmail(db, email);
  if (!user) return 0;
  const attempts = ((user as any).failed_attempts || 0) + 1;
  const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS
    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60_000).toISOString()
    : (user as any).locked_until;
  await db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE email = ?')
    .bind(attempts, lockedUntil || null, email).run();
  return attempts;
}

export async function resetFailedAttempts(db: D1Database, email: string) {
  await db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE email = ?').bind(email).run();
}

export async function isAccountLocked(db: D1Database, identifier: string): Promise<boolean> {
  // Try email first
  let user = await getUserByEmail(db, identifier);
  // If not found, try phone
  if (!user) {
    user = await db.prepare('SELECT id, email, role, name, phone, address, business_name, failed_attempts, locked_until FROM users WHERE phone = ?').bind(identifier).first();
  }
  if (!user) return false;
  if ((user as any).locked_until && new Date((user as any).locked_until) > new Date()) return true;
  return false;
}

export async function getRemainingLockoutTime(db: D1Database, identifier: string): Promise<number | null> {
  let user = await getUserByEmail(db, identifier);
  if (!user) {
    user = await db.prepare('SELECT id, email, role, name, phone, address, business_name, failed_attempts, locked_until FROM users WHERE phone = ?').bind(identifier).first();
  }
  if (!user || !(user as any).locked_until) return null;
  
  const lockoutUntil = new Date((user as any).locked_until);
  const now = new Date();
  if (lockoutUntil <= now) return null;
  
  return Math.ceil((lockoutUntil.getTime() - now.getTime()) / 1000 / 60); // Return minutes remaining
}

export async function validateSession(db: D1Database, token: string) {
  const session = await db.prepare(
    `SELECT s.*, u.email, u.role, u.name, u.password_hash, u.admin_approval_status FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')`
  ).bind(token).first();
  return session;
}

export async function deleteSession(db: D1Database, token: string) {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

// Cleaner profile operations
export async function getCleanerProfileByUsername(db: D1Database, username: string) {
  // Try to find by paysheet_code first (username is stored as paysheet_code)
  const result = await db.prepare('SELECT * FROM cleaner_profiles WHERE paysheet_code = ?').bind(username).first();
  if (result) return result;
  
  // Fallback: try to find by joining with users table
  const joinedResult = await db.prepare(
    'SELECT cp.* FROM cleaner_profiles cp JOIN users u ON cp.user_id = u.id WHERE u.username = ?'
  ).bind(username).first();
  return joinedResult;
}

export async function getCleanerProfileByUserId(db: D1Database, userId: number) {
  const result = await db.prepare('SELECT * FROM cleaner_profiles WHERE user_id = ?').bind(userId).first();
  return result;
}

export async function createCleanerProfile(db: D1Database, data: {
  user_id: number;
  username: string;
  paysheet_code?: string;
  first_name?: string;
  last_name?: string;
  department?: string;
}) {
  const result = await db.prepare(
    `INSERT INTO cleaner_profiles (user_id, username, paysheet_code, first_name, last_name, department)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(data.user_id, data.username, data.paysheet_code || '', data.first_name || '', data.last_name || '', data.department || 'cleaning').first();
  return result;
}

// Initialize cleaner_profiles table if it doesn't exist
export async function initializeCleanerProfilesTable(db: D1Database) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS cleaner_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL UNIQUE,
        paysheet_code TEXT,
        first_name TEXT,
        last_name TEXT,
        department TEXT DEFAULT 'cleaning',
        status TEXT DEFAULT 'idle',
        profile_picture TEXT,
        bio TEXT,
        specialties TEXT,
        phone TEXT,
        address TEXT,
        residential_address TEXT,
        cellphone TEXT,
        tax_number TEXT,
        emergency_contact1_name TEXT,
        emergency_contact1_phone TEXT,
        emergency_contact2_name TEXT,
        emergency_contact2_phone TEXT,
        gps_lat REAL,
        gps_long REAL,
        weekday_rate REAL DEFAULT 150,
        weekend_rate REAL DEFAULT 225,
        deductions REAL DEFAULT 0,
        updated_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `).run();
    return true;
  } catch (error) {
    console.error('Failed to initialize cleaner_profiles table:', error);
    return false;
  }
}

// Initialize staff table for onboarding
export async function initializeStaffTable(db: D1Database) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        pool_type TEXT DEFAULT 'INDIVIDUAL',
        is_active INTEGER DEFAULT 1,
        service_type TEXT DEFAULT 'standard',
        first_name TEXT DEFAULT '',
        last_name TEXT DEFAULT '',
        cellphone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        training_completed INTEGER DEFAULT 0,
        contract_url TEXT,
        department TEXT DEFAULT 'cleaning',
        onboarding_stage TEXT DEFAULT 'consent_pending',
        hired_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();

    // Add indexes
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_staff_pool_type ON staff(pool_type)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_staff_service_type ON staff(service_type)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_staff_training_completed ON staff(training_completed)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_staff_onboarding_stage ON staff(onboarding_stage)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department)`).run();

    return true;
  } catch (error) {
    console.error('Failed to initialize staff table:', error);
    return false;
  }
}

// Add onboarding columns to staff table if they don't exist
export async function addOnboardingColumnsToStaff(db: D1Database) {
  try {
    // Ensure table exists (Postgres-compatible: try init, swallow if exists)
    try {
      await initializeStaffTable(db);
    } catch {
      // Table already exists or other init error — proceed with column adds
    }

    // Add columns if they don't exist
    const columns = [
      { name: 'training_completed', type: 'INTEGER DEFAULT 0' },
      { name: 'contract_url', type: 'TEXT' },
      { name: 'department', type: "TEXT DEFAULT 'cleaning'" },
      { name: 'onboarding_stage', type: "TEXT DEFAULT 'consent_pending'" },
      { name: 'hired_at', type: 'TEXT' }
    ];

    for (const col of columns) {
      try {
        await db.prepare(`ALTER TABLE staff ADD COLUMN ${col.name} ${col.type}`).run();
      } catch (error: any) {
        // Column might already exist, ignore error
        if (!error.message?.includes('duplicate column name')) {
          console.error(`Failed to add column ${col.name}:`, error);
        }
      }
    }

    // Create indexes
    try {
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_staff_training_completed ON staff(training_completed)`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_staff_onboarding_stage ON staff(onboarding_stage)`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department)`).run();
    } catch (error) {
      console.error('Failed to create indexes:', error);
    }

    return true;
  } catch (error) {
    console.error('Failed to add onboarding columns to staff table:', error);
    return false;
  }
}

// Map department to pool_type
export function mapDepartmentToPoolType(department: string): 'INDIVIDUAL' | 'BUSINESS' {
  // Cleaners (cleaning department) go to INDIVIDUAL pool
  // Other departments (digital, transport, admin) go to BUSINESS pool
  if (department === 'cleaning') {
    return 'INDIVIDUAL';
  }
  return 'BUSINESS';
}

// Create or update staff record for a user
export async function createOrUpdateStaffRecord(db: D1Database, data: {
  user_id: number;
  first_name?: string;
  last_name?: string;
  cellphone?: string;
  email?: string;
  department?: string;
  onboarding_stage?: string;
  training_completed?: boolean;
  is_active?: boolean;
}) {
  try {
    // Check if staff record exists
    const existing = await db.prepare('SELECT id FROM staff WHERE user_id = ?').bind(data.user_id).first();
    
    const poolType = mapDepartmentToPoolType(data.department || 'cleaning');
    
    if (existing) {
      // Update existing record
      const updates: string[] = [];
      const values: any[] = [];
      
      if (data.first_name !== undefined) { updates.push('first_name = ?'); values.push(data.first_name); }
      if (data.last_name !== undefined) { updates.push('last_name = ?'); values.push(data.last_name); }
      if (data.cellphone !== undefined) { updates.push('cellphone = ?'); values.push(data.cellphone); }
      if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email); }
      if (data.department !== undefined) { updates.push('department = ?'); values.push(data.department); }
      if (data.onboarding_stage !== undefined) { updates.push('onboarding_stage = ?'); values.push(data.onboarding_stage); }
      if (data.training_completed !== undefined) { updates.push('training_completed = ?'); values.push(data.training_completed ? 1 : 0); }
      if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }
      
      updates.push('pool_type = ?');
      values.push(poolType);
      updates.push('updated_at = datetime(\'now\')');
      values.push(data.user_id);
      
      if (updates.length > 2) { // More than just pool_type and updated_at
        const setClause = updates.join(', ');
        await db.prepare(`UPDATE staff SET ${setClause} WHERE user_id = ?`).bind(...values).run();
      }
      
      return existing;
    } else {
      // Create new record
      const result = await db.prepare(`
        INSERT INTO staff (user_id, first_name, last_name, cellphone, email, department, pool_type, onboarding_stage, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        RETURNING *
      `).bind(
        data.user_id,
        data.first_name || '',
        data.last_name || '',
        data.cellphone || '',
        data.email || '',
        data.department || 'cleaning',
        poolType,
        data.onboarding_stage || 'consent_pending'
      ).first();
      
      return result;
    }
  } catch (error) {
    console.error('Failed to create or update staff record:', error);
    return null;
  }
}

// Add onboarding_stage column to users table if it doesn't exist
export async function addOnboardingStageToUsers(db: D1Database) {
  try {
    // Add column if it doesn't exist
    try {
      await db.prepare(`ALTER TABLE users ADD COLUMN onboarding_stage TEXT DEFAULT 'consent_pending'`).run();
    } catch (error: any) {
      // Column might already exist, ignore error
      if (!error.message?.includes('duplicate column name')) {
        console.error('Failed to add onboarding_stage column to users:', error);
      }
    }

    // Create index
    try {
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_users_onboarding_stage ON users(onboarding_stage)`).run();
    } catch (error) {
      console.error('Failed to create index:', error);
    }

    return true;
  } catch (error) {
    console.error('Failed to add onboarding_stage to users table:', error);
    return false;
  }
}

// Update user onboarding stage
export async function updateUserOnboardingStage(db: D1Database, userId: number, stage: string) {
  try {
    await db.prepare(`
      UPDATE users SET onboarding_stage = ? WHERE id = ?
    `).bind(stage, userId).run();
    return true;
  } catch (error) {
    console.error('Failed to update user onboarding stage:', error);
    return false;
  }
}

// Initialize onboarding_audit table
export async function initializeOnboardingAuditTable(db: D1Database) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS onboarding_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        from_stage TEXT,
        to_stage TEXT NOT NULL,
        event_type TEXT NOT NULL,
        metadata TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();

    // Create indexes
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_onboarding_audit_user_id ON onboarding_audit(user_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_onboarding_audit_to_stage ON onboarding_audit(to_stage)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_onboarding_audit_created_at ON onboarding_audit(created_at)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_onboarding_audit_event_type ON onboarding_audit(event_type)`).run();

    return true;
  } catch (error) {
    console.error('Failed to initialize onboarding_audit table:', error);
    return false;
  }
}

// Log onboarding stage transition
export async function logOnboardingTransition(db: D1Database, data: {
  user_id: number;
  from_stage?: string;
  to_stage: string;
  event_type: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}) {
  try {
    // Ensure table exists
    await initializeOnboardingAuditTable(db);

    await db.prepare(`
      INSERT INTO onboarding_audit (user_id, from_stage, to_stage, event_type, metadata, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      data.user_id,
      data.from_stage || null,
      data.to_stage,
      data.event_type,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.ip_address || null,
      data.user_agent || null
    ).run();

    return true;
  } catch (error) {
    console.error('Failed to log onboarding transition:', error);
    return false;
  }
}

// Get onboarding audit history for a user
export async function getOnboardingAuditHistory(db: D1Database, userId: number, limit: number = 50) {
  try {
    const results = await db.prepare(`
      SELECT * FROM onboarding_audit 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).bind(userId, limit).all();
    return results.results || [];
  } catch (error) {
    console.error('Failed to get onboarding audit history:', error);
    return [];
  }
}

// Cross-database sync: Update main database when training is completed
export async function syncTrainingCompletion(userId: string, certificateHash: string, ip?: string, userAgent?: string) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Main database not available for training sync');
      return false;
    }

    // Find user by user_id (string from training DB)
    const user = await db.prepare('SELECT id, onboarding_stage FROM users WHERE id = ?').bind(parseInt(userId)).first();
    if (!user) {
      console.error('User not found in main database for training sync:', userId);
      return false;
    }

    const userIdNum = (user as any).id;
    const currentStage = (user as any).onboarding_stage;

    // Update users table onboarding_stage to training_completed
    await updateUserOnboardingStage(db, userIdNum, 'training_completed');

    // Update staff table training_completed flag
    await createOrUpdateStaffRecord(db, {
      user_id: userIdNum,
      training_completed: true,
      onboarding_stage: 'training_completed'
    });

    // Log the stage transition
    await logOnboardingTransition(db, {
      user_id: userIdNum,
      from_stage: currentStage || 'contract_signed',
      to_stage: 'training_completed',
      event_type: 'training_completed',
      metadata: { certificate_hash: certificateHash },
      ip_address: ip,
      user_agent: userAgent
    });

    console.log('Training completion sync successful for user:', userId);
    return true;
  } catch (error) {
    console.error('Failed to sync training completion:', error);
    return false;
  }
}

// Cross-database sync: Activate user after training completion
export async function activateUserAfterTraining(userId: string, ip?: string, userAgent?: string) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('Main database not available for user activation');
      return false;
    }

    // Find user by user_id (string from training DB)
    const user = await db.prepare('SELECT id, onboarding_stage FROM users WHERE id = ?').bind(parseInt(userId)).first();
    if (!user) {
      console.error('User not found in main database for activation:', userId);
      return false;
    }

    const userIdNum = (user as any).id;
    const currentStage = (user as any).onboarding_stage;

    // Update users table onboarding_stage to active
    await updateUserOnboardingStage(db, userIdNum, 'active');

    // Update staff table
    await createOrUpdateStaffRecord(db, {
      user_id: userIdNum,
      training_completed: true,
      onboarding_stage: 'active',
      is_active: true
    });

    // Log the stage transition
    await logOnboardingTransition(db, {
      user_id: userIdNum,
      from_stage: currentStage || 'training_completed',
      to_stage: 'active',
      event_type: 'user_activated',
      metadata: { activation_reason: 'training_completed' },
      ip_address: ip,
      user_agent: userAgent
    });

    console.log('User activation successful for user:', userId);
    return true;
  } catch (error) {
    console.error('Failed to activate user:', error);
    return false;
  }
}

// Initialize notification_log table
export async function initializeNotificationLogTable(db: D1Database) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        phone_number TEXT,
        email TEXT,
        notification_type TEXT NOT NULL,
        channel TEXT NOT NULL,
        template_name TEXT,
        status TEXT NOT NULL,
        message_id TEXT,
        error_message TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `).run();

    // Create indexes
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notification_type)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_notification_log_channel ON notification_log(channel)`).run();

    return true;
  } catch (error) {
    console.error('Failed to initialize notification_log table:', error);
    return false;
  }
}

// Log notification to database
export async function logNotification(db: D1Database, data: {
  user_id?: number;
  phone_number?: string;
  email?: string;
  notification_type: string;
  channel: 'whatsapp' | 'email';
  template_name?: string;
  status: 'sent' | 'failed' | 'pending' | 'skipped';
  message_id?: string;
  error_message?: string;
  skip_reason?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await initializeNotificationLogTable(db);

    await db.prepare(`
      INSERT INTO notification_log (user_id, phone_number, email, notification_type, channel, template_name, status, message_id, error_message, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      data.user_id || null,
      data.phone_number || null,
      data.email || null,
      data.notification_type,
      data.channel,
      data.template_name || null,
      data.status,
      data.message_id || null,
      data.error_message || null,
      data.metadata ? JSON.stringify(data.metadata) : null
    ).run();

    return true;
  } catch (error) {
    console.error('Failed to log notification:', error);
    return false;
  }
}

// Get notification history for a user
export async function getNotificationHistory(db: D1Database, userId: number, limit: number = 50) {
  try {
    const results = await db.prepare(`
      SELECT * FROM notification_log 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).bind(userId, limit).all();
    return results.results || [];
  } catch (error) {
    console.error('Failed to get notification history:', error);
    return [];
  }
}

// Initialize notification preferences column
export async function initializeSessionsTable(db: D1Database) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        refresh_token TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();

    // Create indexes
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`).run();
    return true;
  } catch (error) {
    console.error('Failed to initialize sessions table:', error);
    return false;
  }
}

export async function initializeNotificationPreferences(db: D1Database) {
  try {
    await db.prepare(`ALTER TABLE users ADD COLUMN notification_preferences TEXT DEFAULT '{"whatsapp": true, "email": true}'`).run().catch(() => {});
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_users_notification_preferences ON users(notification_preferences)`).run();
    return true;
  } catch (error) {
    console.error('Failed to initialize notification preferences:', error);
    return false;
  }
}

// Get user notification preferences
export async function getNotificationPreferences(db: D1Database, userId: number) {
  try {
    await initializeNotificationPreferences(db);
    const result = await db.prepare('SELECT notification_preferences FROM users WHERE id = ?').bind(userId).first();
    if (result && (result as any).notification_preferences) {
      try {
        return JSON.parse((result as any).notification_preferences);
      } catch {
        return { whatsapp: true, email: true };
      }
    }
    return { whatsapp: true, email: true };
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
    return { whatsapp: true, email: true };
  }
}

// Update user notification preferences
export async function updateNotificationPreferences(db: D1Database, userId: number, preferences: { whatsapp?: boolean; email?: boolean }) {
  try {
    await initializeNotificationPreferences(db);
    const current = await getNotificationPreferences(db, userId);
    const updated = { ...current, ...preferences };
    await db.prepare('UPDATE users SET notification_preferences = ? WHERE id = ?').bind(JSON.stringify(updated), userId).run();
    return true;
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    return false;
  }
}

export async function updateCleanerProfile(db: D1Database, lookupValue: string, data: Record<string, any>, lookupField: 'username' | 'paysheet_code' | 'user_id' = 'username') {
  // Map frontend field names to database column names
  const fieldMap: Record<string, string> = {
    'firstName': 'first_name',
    'lastName': 'last_name',
    'cellphoneNumber': 'cellphone',
    'taxNumber': 'tax_number',
    'emergencyContact1': 'emergency_contact1',
    'emergencyContact2': 'emergency_contact2'
  };

  const ALLOWED_FIELDS = ['first_name', 'last_name', 'department', 'paysheet_code', 'profile_picture', 'bio', 'specialties', 'phone', 'address', 'residential_address', 'cellphone', 'tax_number', 'emergency_contact1_name', 'emergency_contact1_phone', 'emergency_contact2_name', 'emergency_contact2_phone'];
  
  // Map frontend field names to database column names and filter
  const mappedData: Record<string, any> = {};
  Object.keys(data).forEach(key => {
    const dbKey = fieldMap[key] || key;
    if (ALLOWED_FIELDS.includes(dbKey)) {
      mappedData[dbKey] = data[key];
    }
  });

  // Handle emergency contact objects
  if (data.emergencyContact1 && typeof data.emergencyContact1 === 'object') {
    mappedData.emergency_contact1_name = data.emergencyContact1.name;
    mappedData.emergency_contact1_phone = data.emergencyContact1.number;
  }
  if (data.emergencyContact2 && typeof data.emergencyContact2 === 'object') {
    mappedData.emergency_contact2_name = data.emergencyContact2.name;
    mappedData.emergency_contact2_phone = data.emergencyContact2.number;
  }

  const fields = Object.keys(mappedData);
  if (fields.length === 0) return null;
  
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => mappedData[f]);
  values.push(lookupField === 'user_id' ? Number(lookupValue) : lookupValue);
  
  const result = await db.prepare(
    `UPDATE cleaner_profiles SET ${setClause}, updated_at = datetime('now') WHERE ${lookupField} = ? RETURNING *`
  ).bind(...values).first();
  return result;
}

// Get cleaner public profile (for client dashboard sync)
export async function getCleanerPublicProfile(db: D1Database, cleanerId: number) {
  const result = await db.prepare(
    `SELECT first_name, last_name, profile_picture, residential_address, cellphone FROM cleaner_profiles WHERE user_id = ?`
  ).bind(cleanerId).first();
  return result;
}

// Pending contracts operations
export async function getPendingContracts(db: D1Database) {
  const result = await db.prepare('SELECT * FROM pending_contracts ORDER BY submitted_at DESC').all();
  return result.results;
}

export async function getPendingContractById(db: D1Database, id: number) {
  const result = await db.prepare('SELECT * FROM pending_contracts WHERE id = ?').bind(id).first();
  return result;
}

const PENDING_CONTRACT_ALLOWED_FIELDS = new Set([
  'full_name','email','phone','id_number','address','position','department',
  'start_date','contract_type','status','submitted_at','consent_given',
  'signature','notes','user_id'
]);

export async function createPendingContract(db: D1Database, data: Record<string, any>) {
  const fields = Object.keys(data).filter(k => PENDING_CONTRACT_ALLOWED_FIELDS.has(k));
  if (fields.length === 0) throw new Error('No valid fields provided for pending contract');
  const placeholders = fields.map(() => '?').join(', ');
  const values = fields.map(f => data[f]);
  
  const result = await db.prepare(
    `INSERT INTO pending_contracts (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`
  ).bind(...values).first();
  return result;
}

export async function updatePendingContractStatus(db: D1Database, id: number, status: string) {
  const result = await db.prepare(
    `UPDATE pending_contracts SET status = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`
  ).bind(status, id).first();
  return result;
}

export async function deletePendingContract(db: D1Database, id: number) {
  await db.prepare('DELETE FROM pending_contracts WHERE id = ?').bind(id).run();
}

// Employee operations
export async function getEmployees(db: D1Database) {
  const result = await db.prepare('SELECT * FROM employees ORDER BY created_at DESC').all();
  return result.results;
}

const EMPLOYEE_ALLOWED_FIELDS = new Set([
  'user_id','email','name','phone','id_number','address','position','department',
  'paysheet_code','start_date','employment_type','status','emergency_contact',
  'emergency_phone','bank_name','bank_account','bank_branch','notes'
]);

export async function createEmployee(db: D1Database, data: Record<string, any>) {
  const fields = Object.keys(data).filter(k => EMPLOYEE_ALLOWED_FIELDS.has(k));
  if (fields.length === 0) throw new Error('No valid fields provided for employee');
  const placeholders = fields.map(() => '?').join(', ');
  const values = fields.map(f => data[f]);
  
  const result = await db.prepare(
    `INSERT INTO employees (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`
  ).bind(...values).first();
  return result;
}


// Booking operations
export async function createBooking(db: D1Database, data: {
  client_id: number;
  client_name: string;
  location: string;
  service_type: string;
  booking_date: string;
  booking_time: string;
  special_instructions?: string;
  booking_type?: string;
}) {
  const result = await db.prepare(
    `INSERT INTO bookings (client_id, client_name, location, service_type, booking_date, booking_time, special_instructions, booking_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(data.client_id, data.client_name, data.location, data.service_type, data.booking_date, data.booking_time, data.special_instructions || '', data.booking_type || 'standard').first();
  return result;
}

export async function getBookingsByClient(db: D1Database, clientId: number) {
  const result = await db.prepare('SELECT * FROM bookings WHERE client_id = ? ORDER BY booking_date DESC').bind(clientId).all();
  return result.results;
}

export async function getBookingsByCleaner(db: D1Database, cleanerId: number) {
  const result = await db.prepare('SELECT * FROM bookings WHERE cleaner_id = ? ORDER BY booking_date DESC').bind(cleanerId).all();
  return result.results;
}

export async function updateBookingStatus(db: D1Database, bookingId: number, status: string) {
  const result = await db.prepare(
    `UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`
  ).bind(status, bookingId).first();
  return result;
}

export async function assignBookingToCleaner(db: D1Database, bookingId: number, cleanerId: number) {
  const result = await db.prepare(
    `UPDATE bookings SET cleaner_id = ?, status = 'assigned', updated_at = datetime('now') WHERE id = ? RETURNING *`
  ).bind(cleanerId, bookingId).first();
  return result;
}

// Task completion / earnings
export async function recordTaskCompletion(db: D1Database, bookingId: number, cleanerId: number, earnings: number = 150) {
  const result = await db.prepare(
    `INSERT INTO task_completions (booking_id, cleaner_id, earnings) VALUES (?, ?, ?) RETURNING *`
  ).bind(bookingId, cleanerId, earnings).first();
  return result;
}

export async function getCleanerEarnings(db: D1Database, cleanerId: number) {
  const result = await db.prepare(
    `SELECT COALESCE(SUM(earnings), 0) as total_earnings, COUNT(*) as completed_jobs FROM task_completions WHERE cleaner_id = ?`
  ).bind(cleanerId).first();
  return result;
}

// Email verification functions
export async function createEmailVerificationToken(db: D1Database, userId: number, email: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await db.prepare(
    `UPDATE users SET email_verification_token = ?, email_verification_expires = ?, email_verification_sent_at = ? WHERE id = ?`
  ).bind(token, expires.toISOString(), new Date().toISOString(), userId).run();
  
  return token;
}

export async function verifyEmailToken(db: D1Database, token: string) {
  const user = await db.prepare(
    `SELECT id, email FROM users WHERE email_verification_token = ? AND email_verification_expires > datetime('now')`
  ).bind(token).first();
  
  if (user) {
    await db.prepare(
      `UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expires = NULL WHERE id = ?`
    ).bind((user as any).id).run();
    return user;
  }
  
  return null;
}

export async function isEmailVerified(db: D1Database, userId: number): Promise<boolean> {
  const result = await db.prepare('SELECT email_verified FROM users WHERE id = ?').bind(userId).first();
  return (result as any)?.email_verified === 1;
}

// Admin approval functions
export async function createAdminApprovalRequest(db: D1Database, userId: number, registrationIp?: string, userAgent?: string) {
  await db.prepare(
    `UPDATE users SET admin_approval_status = 'pending', registration_ip = ?, registration_user_agent = ? WHERE id = ?`
  ).bind(registrationIp || '', userAgent || '', userId).run();
}

export async function approveAdminUser(db: D1Database, userId: number, approvedBy: number, notes?: string) {
  await db.prepare(
    `UPDATE users SET admin_approval_status = 'approved', approved_by = ?, approved_at = ?, approval_notes = ? WHERE id = ?`
  ).bind(approvedBy, new Date().toISOString(), notes || '', userId).run();
}

export async function rejectAdminUser(db: D1Database, userId: number, rejectedBy: number, notes?: string) {
  await db.prepare(
    `UPDATE users SET admin_approval_status = 'rejected', approved_by = ?, approved_at = ?, approval_notes = ? WHERE id = ?`
  ).bind(rejectedBy, new Date().toISOString(), notes || '', userId).run();
}

export async function getPendingAdminApprovals(db: D1Database) {
  const result = await db.prepare(
    `SELECT id, email, name, role, created_at, registration_ip FROM users 
     WHERE role IN ('admin', 'super_admin') AND admin_approval_status = 'pending' AND email_verified = 1`
  ).all();
  return result.results;
}

export async function isAdminApproved(db: D1Database, userId: number): Promise<boolean> {
  const result = await db.prepare('SELECT admin_approval_status FROM users WHERE id = ?').bind(userId).first();
  return (result as any)?.admin_approval_status === 'approved';
}

// Audit logging functions
export async function logAuditEvent(db: D1Database, event: {
  user_id?: number;
  action: string;
  resource?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: string;
  success?: boolean;
  error_message?: string;
  session_id?: string;
  trace_id?: string;
}) {
  await db.prepare(
    `INSERT INTO audit_logs (user_id, action, resource, resource_type, resource_id, ip_address, user_agent, details, success, error_message, session_id, trace_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    event.user_id ?? null,
    event.action,
    event.resource ?? null,
    event.resource ?? null,
    event.resource_id ?? null,
    event.ip_address ?? null,
    event.user_agent ?? null,
    event.details ?? null,
    event.success ? 1 : 0,
    event.error_message ?? null,
    event.session_id ?? null,
    event.trace_id ?? null,
  ).run();
}

export async function getAuditLogs(db: D1Database, filters?: {
  user_id?: number;
  action?: string;
  resource?: string;
  limit?: number;
  offset?: number;
}) {
  let query = `SELECT * FROM audit_logs WHERE 1=1`;
  const params: any[] = [];
  
  if (filters?.user_id) {
    query += ` AND user_id = ?`;
    params.push(filters.user_id);
  }
  
  if (filters?.action) {
    query += ` AND action = ?`;
    params.push(filters.action);
  }
  
  if (filters?.resource) {
    query += ` AND resource = ?`;
    params.push(filters.resource);
  }
  
  query += ` ORDER BY created_at DESC`;
  
  if (filters?.limit) {
    query += ` LIMIT ?`;
    params.push(filters.limit);
    
    if (filters?.offset) {
      query += ` OFFSET ?`;
      params.push(filters.offset);
    }
  }
  
  const result = await db.prepare(query).bind(...params).all();
  return result.results;
}

// Enhanced user tracking functions
export async function updateUserLoginStats(db: D1Database, userId: number, success: boolean, ip?: string) {
  if (success) {
    await db.prepare(
      `UPDATE users SET login_count = COALESCE(login_count, 0) + 1, last_login = ?, failed_login_attempts = 0 WHERE id = ?`
    ).bind(new Date().toISOString(), userId).run();
  } else {
    await db.prepare(
      `UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1, last_failed_login = ? WHERE id = ?`
    ).bind(new Date().toISOString(), userId).run();
  }
}

export async function getUserLoginStats(db: D1Database, userId: number) {
  const result = await db.prepare(
    `SELECT login_count, last_login, failed_login_attempts, last_failed_login FROM users WHERE id = ?`
  ).bind(userId).first();
  return result;
}

// 2FA functions
export async function createTOTPSecret(db: D1Database, userId: number): Promise<string> {
  const secret = crypto.randomBytes(20).toString('hex');
  await db.prepare(
    `UPDATE users SET totp_secret = ? WHERE id = ?`
  ).bind(secret, userId).run();
  return secret;
}

export async function enableTOTP(db: D1Database, userId: number, secret: string, backupCodes: string[]): Promise<void> {
  await db.prepare(
    `UPDATE users SET totp_secret = ?, totp_enabled = 1, backup_codes = ? WHERE id = ?`
  ).bind(secret, JSON.stringify(backupCodes), userId).run();
}

export async function disableTOTP(db: D1Database, userId: number): Promise<void> {
  await db.prepare(
    `UPDATE users SET totp_secret = NULL, totp_enabled = 0, backup_codes = NULL WHERE id = ?`
  ).bind(userId).run();
}

export async function getUserTOTPSecret(db: D1Database, userId: number): Promise<string | null> {
  const result = await db.prepare(
    `SELECT totp_secret FROM users WHERE id = ? AND totp_enabled = 1`
  ).bind(userId).first();
  return (result as any)?.totp_secret || null;
}

export async function isTOTPEnabled(db: D1Database, userId: number): Promise<boolean> {
  const result = await db.prepare(
    `SELECT totp_enabled FROM users WHERE id = ?`
  ).bind(userId).first();
  return (result as any)?.totp_enabled === 1;
}

export async function getBackupCodes(db: D1Database, userId: number): Promise<string[]> {
  const result = await db.prepare(
    `SELECT backup_codes FROM users WHERE id = ? AND totp_enabled = 1`
  ).bind(userId).first();
  if ((result as any)?.backup_codes) {
    return JSON.parse((result as any).backup_codes);
  }
  return [];
}

export async function useBackupCode(db: D1Database, userId: number, code: string): Promise<boolean> {
  const user = await db.prepare(
    `SELECT backup_codes FROM users WHERE id = ? AND totp_enabled = 1`
  ).bind(userId).first();

  if (!user || !(user as any).backup_codes) {
    return false;
  }

  const backupCodes = JSON.parse((user as any).backup_codes) as string[];
  const codeIndex = backupCodes.indexOf(code);

  if (codeIndex === -1) {
    return false;
  }

  // Remove used backup code
  backupCodes.splice(codeIndex, 1);
  await db.prepare(
    `UPDATE users SET backup_codes = ? WHERE id = ?`
  ).bind(JSON.stringify(backupCodes), userId).run();

  return true;
}
