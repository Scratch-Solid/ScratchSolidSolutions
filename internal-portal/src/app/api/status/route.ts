import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';

const P95_THRESHOLD_MS = 200;
const DB_SLA_MS = 50;
const KV_SLA_MS = 30;
const VERSION = process.env.npm_package_version || '1.0.0';
const STARTED_AT = new Date().toISOString();

export async function GET(request: NextRequest) {
  const checks: Record<string, { status: 'ok' | 'fail' | 'degraded'; latencyMs?: number; error?: string; slaMs?: number }> = {};
  const alerts: string[] = [];
  const start = Date.now();

  try {
    const db = getDb(request);
    if (!db) {
      checks.database = { status: 'fail', error: 'D1 binding not available', slaMs: DB_SLA_MS };
      alerts.push('database:binding_missing');
    } else {
      const dbStart = Date.now();
      await db.prepare('SELECT 1').first();
      const dbLatency = Date.now() - dbStart;
      checks.database = {
        status: dbLatency > DB_SLA_MS ? 'degraded' : 'ok',
        latencyMs: dbLatency,
        slaMs: DB_SLA_MS,
      };
      if (dbLatency > DB_SLA_MS) alerts.push(`database:slow_p95>${DB_SLA_MS}ms`);
    }
  } catch (e: any) {
    checks.database = { status: 'fail', error: e.message, slaMs: DB_SLA_MS };
    alerts.push('database:query_failed');
  }

  try {
    const kv = (request as any).env?.CACHE_KV;
    if (kv) {
      const kvStart = Date.now();
      await kv.get('__healthcheck__');
      const kvLatency = Date.now() - kvStart;
      checks.kv = {
        status: kvLatency > KV_SLA_MS ? 'degraded' : 'ok',
        latencyMs: kvLatency,
        slaMs: KV_SLA_MS,
      };
      if (kvLatency > KV_SLA_MS) alerts.push(`kv:slow_p95>${KV_SLA_MS}ms`);
    } else {
      checks.kv = { status: 'ok', error: 'KV not bound (optional)', slaMs: KV_SLA_MS };
    }
  } catch (e: any) {
    checks.kv = { status: 'fail', error: e.message, slaMs: KV_SLA_MS };
    alerts.push('kv:operation_failed');
  }

  const totalLatency = Date.now() - start;
  const hasFail = Object.values(checks).some(c => c.status === 'fail');
  const hasDegraded = Object.values(checks).some(c => c.status === 'degraded');
  const overall = hasFail ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';

  if (totalLatency > P95_THRESHOLD_MS) alerts.push(`endpoint:p95_exceeded>${P95_THRESHOLD_MS}ms`);

  const uptimeMs = Date.now() - new Date(STARTED_AT).getTime();

  const response = NextResponse.json({
    service: 'internal-portal',
    version: VERSION,
    status: overall,
    timestamp: new Date().toISOString(),
    startedAt: STARTED_AT,
    uptimeMs,
    checks,
    alerts,
    latencyMs: totalLatency,
    p95ThresholdMs: P95_THRESHOLD_MS,
  }, { status: overall === 'unhealthy' ? 503 : 200 });

  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}
