#!/usr/bin/env tsx
/**
 * D1 Native Migration Runner
 * Usage: npx tsx scripts/migrate.ts --local / --remote
 * Reads migrations/ directory and applies any unapplied .sql files.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface Env {
  DB: D1Database;
}

const MIGRATIONS_DIR = join(process.cwd(), 'migrations');

async function getAppliedMigrations(db: D1Database): Promise<Set<string>> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `).run();

  const result = await db.prepare('SELECT name FROM schema_migrations').all();
  return new Set((result.results as any[]).map(r => r.name));
}

async function applyMigration(db: D1Database, name: string, sql: string) {
  const statements = sql.split(/;\s*\n/).filter(s => s.trim().length > 0);
  for (const stmt of statements) {
    await db.prepare(stmt).run();
  }
  await db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').bind(name).run();
  console.log(`Applied migration: ${name}`);
}

export async function runMigrations(db: D1Database) {
  const applied = await getAppliedMigrations(db);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    await applyMigration(db, file, sql);
  }
  console.log('All migrations up to date.');
}

// CLI entrypoint
if (require.main === module) {
  const remote = process.argv.includes('--remote');
  console.log(`Running migrations ${remote ? 'remotely' : 'locally'}...`);
  // Actual DB binding injected by wrangler CLI or local dev server
}
