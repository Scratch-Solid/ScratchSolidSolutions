export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cleanupExpiredData } from '@/lib/data-retention';
import { log } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const result = await cleanupExpiredData(db);

    log.audit('CRON_DATA_RETENTION_CLEANUP', 'system', {
      traceId,
      deleted: result.deleted,
      errors: result.errors,
    });

    return NextResponse.json({
      success: true,
      traceId,
      deleted: result.deleted,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] Data retention cleanup error:`, error);
    return NextResponse.json(
      { error: 'Failed to run data retention cleanup', traceId },
      { status: 500 }
    );
  }
}
