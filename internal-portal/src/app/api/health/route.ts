import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRateLimit } from '@/lib/middleware';

export async function GET(request: Request) {
  const rateLimitResponse = await withRateLimit(request as any);
  if (rateLimitResponse) return rateLimitResponse;

  const start = Date.now();
  const checks: Record<string, boolean | string> = {};

  try {
    const db = await getDb();
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

  const response = NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    duration_ms: duration,
    version: process.env.APP_VERSION || 'dev',
  }, { status: allHealthy ? 200 : 503 });

  return response;
}
