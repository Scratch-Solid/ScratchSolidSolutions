import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const start = Date.now();
  const checks: Record<string, boolean | string> = {};

  try {
    const db = getDb(request);
    if (db) {
      const result = await db.prepare('SELECT 1 as health').first();
      checks.database = result !== null;
    } else {
      checks.database = 'D1 binding not available';
    }
  } catch (e) {
    checks.database = false;
  }

  const allHealthy = Object.values(checks).every(v => v === true);
  const duration = Date.now() - start;

  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    duration_ms: duration,
    version: process.env.APP_VERSION || 'dev',
  }, { status: allHealthy ? 200 : 503 });
}
