/**
 * @module pg-d1
 * @description PostgreSQL-backed adapter that implements the Cloudflare D1
 * prepared-statement interface (`prepare().bind().first()/.all()/.run()`).
 *
 * This lets the existing ~545 D1 query call sites run unchanged against a
 * PostgreSQL database on the Hetzner server. A small SQL-dialect translation
 * layer rewrites the SQLite-isms the codebase relies on:
 *   - `?` positional placeholders            -> `$1, $2, ...`
 *   - `datetime('now')`                      -> ISO-formatted UTC now (TEXT)
 *   - `datetime('now', '+7 days')` etc.      -> now() + interval, formatted TEXT
 *   - `CURRENT_TIMESTAMP`                     -> ISO-formatted UTC now (TEXT)
 *   - `INSERT OR IGNORE`                      -> `INSERT ... ON CONFLICT DO NOTHING`
 *
 * Timestamp columns are stored as TEXT in the canonical SQLite format
 * (`YYYY-MM-DD HH24:MI:SS`) so the application's existing string comparisons
 * (`expires_at > datetime('now')`) and `new Date(value)` parsing keep working.
 */

import { Pool } from 'pg';
import type { PoolClient } from 'pg';

// Canonical SQLite-style timestamp format used across the codebase.
const PG_NOW = `to_char((now() at time zone 'utc'), 'YYYY-MM-DD HH24:MI:SS')`;

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
    }
    pool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on('error', (err) => {
      // Prevent an idle-client error from crashing the process.
      console.error('[pg-d1] idle client error', err);
    });
  }
  return pool;
}

/**
 * Translate a SQLite/D1 SQL string + ordered bind args into a Postgres
 * parameterised query. Returns the rewritten SQL using `$n` placeholders.
 */
export function translateSql(sql: string): string {
  let out = '';
  let placeholderIndex = 0;
  let i = 0;
  // First pass: rewrite `?` -> `$n` while skipping single-quoted string literals.
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'") {
      // Copy the whole string literal verbatim (handles '' escaped quotes).
      out += ch;
      i++;
      while (i < sql.length) {
        out += sql[i];
        if (sql[i] === "'") {
          // Look-ahead for escaped quote ''
          if (sql[i + 1] === "'") {
            out += sql[i + 1];
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === '?') {
      placeholderIndex++;
      out += `$${placeholderIndex}`;
      i++;
      continue;
    }
    out += ch;
    i++;
  }

  // Second pass: dialect function translation (outside of the placeholder loop
  // these are safe because the codebase never embeds them inside string
  // literals that should be preserved).
  // datetime('now', '<modifier>')  -> now() +/- interval '<n unit>'
  out = out.replace(
    /datetime\(\s*'now'\s*,\s*'([+-])\s*(\d+)\s+(second|seconds|minute|minutes|hour|hours|day|days|month|months|year|years)'\s*\)/gi,
    (_m, sign: string, amount: string, unit: string) => {
      const op = sign === '-' ? '-' : '+';
      const normalizedUnit = unit.endsWith('s') ? unit : `${unit}s`;
      return `to_char(((now() at time zone 'utc') ${op} interval '${amount} ${normalizedUnit}'), 'YYYY-MM-DD HH24:MI:SS')`;
    }
  );
  // datetime('now')
  out = out.replace(/datetime\(\s*'now'\s*\)/gi, PG_NOW);
  // Bare CURRENT_TIMESTAMP used in queries (not DDL defaults).
  out = out.replace(/CURRENT_TIMESTAMP/gi, PG_NOW);

  // INSERT OR IGNORE -> INSERT ... ON CONFLICT DO NOTHING
  if (/INSERT\s+OR\s+IGNORE/i.test(out)) {
    out = out.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    if (/RETURNING/i.test(out)) {
      out = out.replace(/\bRETURNING\b/i, 'ON CONFLICT DO NOTHING RETURNING');
    } else {
      out = `${out.trimEnd().replace(/;?\s*$/, '')} ON CONFLICT DO NOTHING`;
    }
  }

  return out;
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: {
    changes: number;
    last_row_id: number | null;
    rows_read: number;
    rows_written: number;
    duration: number;
  };
}

class PgBoundStatement {
  constructor(private readonly sql: string, private readonly params: unknown[]) {}

  private async query(): Promise<{ rows: any[]; rowCount: number; duration: number }> {
    const started = Date.now();
    const client = getPool();
    const res = await client.query(this.sql, this.params as any[]);
    return { rows: res.rows, rowCount: res.rowCount ?? 0, duration: Date.now() - started };
  }

  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const { rows } = await this.query();
    if (rows.length === 0) return null;
    const row = rows[0];
    if (column !== undefined) {
      return (row?.[column] ?? null) as T;
    }
    return row as T;
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const { rows, rowCount, duration } = await this.query();
    return {
      results: rows as T[],
      success: true,
      meta: {
        changes: rowCount,
        last_row_id: null,
        rows_read: rows.length,
        rows_written: 0,
        duration,
      },
    };
  }

  async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const { rows, rowCount, duration } = await this.query();
    const lastRow = rows.length > 0 ? rows[rows.length - 1] : null;
    return {
      results: rows as T[],
      success: true,
      meta: {
        changes: rowCount,
        last_row_id: lastRow && typeof lastRow.id === 'number' ? lastRow.id : null,
        rows_read: 0,
        rows_written: rowCount,
        duration,
      },
    };
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    const { rows } = await this.query();
    return rows.map((r) => Object.values(r)) as T[];
  }
}

class PgPreparedStatement {
  private boundParams: unknown[] = [];
  constructor(private readonly translatedSql: string) {}

  bind(...params: unknown[]): PgBoundStatement {
    this.boundParams = params;
    return new PgBoundStatement(this.translatedSql, this.boundParams);
  }

  // Allow calling first/all/run without bind() (no parameters).
  first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    return new PgBoundStatement(this.translatedSql, []).first<T>(column);
  }
  all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return new PgBoundStatement(this.translatedSql, []).all<T>();
  }
  run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return new PgBoundStatement(this.translatedSql, []).run<T>();
  }
  raw<T = unknown[]>(): Promise<T[]> {
    return new PgBoundStatement(this.translatedSql, []).raw<T>();
  }
}

/**
 * A D1Database-compatible facade backed by PostgreSQL.
 */
export class PgD1Database {
  prepare(sql: string): PgPreparedStatement {
    return new PgPreparedStatement(translateSql(sql));
  }

  async batch<T = Record<string, unknown>>(
    statements: PgBoundStatement[]
  ): Promise<D1Result<T>[]> {
    const client: PoolClient = await getPool().connect();
    try {
      await client.query('BEGIN');
      const results: D1Result<T>[] = [];
      for (const stmt of statements) {
        results.push(await stmt.all<T>());
      }
      await client.query('COMMIT');
      return results;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async exec(sql: string): Promise<{ count: number; duration: number }> {
    const started = Date.now();
    const res = await getPool().query(translateSql(sql));
    return { count: res.rowCount ?? 0, duration: Date.now() - started };
  }
}

let dbSingleton: PgD1Database | null = null;
export function getPgD1(): PgD1Database {
  if (!dbSingleton) dbSingleton = new PgD1Database();
  return dbSingleton;
}
