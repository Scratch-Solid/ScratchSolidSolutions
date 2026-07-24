export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders, withRateLimit } from '@/lib/middleware';

// Intentionally public, no auth - this is what powers the Transparency
// Policy tracker customers see via a link. Gated by calcom_uid (a
// non-guessable UUID from Cal.com), the same trust model as marketing-site's
// own tracking_token. Consumed by marketing-site's
// /api/public/tracking/[token] route (individual bookings) and
// /api/business/job-status route (business dashboard) - never called
// directly from a browser.
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);

  const rateLimitResponse = await withRateLimit(request);
  if (rateLimitResponse) return withSecurityHeaders(rateLimitResponse, traceId);

  const { searchParams } = new URL(request.url);
  const calcomUid = searchParams.get('calcom_uid');
  if (!calcomUid) {
    return withSecurityHeaders(NextResponse.json({ error: 'calcom_uid is required' }, { status: 400 }), traceId);
  }

  const db = await getDb();
  if (!db) return withSecurityHeaders(NextResponse.json({ error: 'Database unavailable' }, { status: 503 }), traceId);

  try {
    const job = await db.prepare(
      `SELECT id, status, scheduled_at, duration_minutes, started_at, arrived_at, completed_at, updated_at
       FROM jobs WHERE calcom_uid = ?`
    ).bind(calcomUid).first() as any;

    if (!job) {
      return withSecurityHeaders(NextResponse.json({ found: false }), traceId);
    }

    const latestLocation = await db.prepare(
      `SELECT latitude, longitude, recorded_at FROM job_tracking WHERE job_id = ? ORDER BY recorded_at DESC LIMIT 1`
    ).bind(job.id).first() as any;

    // Backs the "guaranteed time on site" promise with a real, checkable
    // number rather than an unenforced claim - only computable once both
    // ends of the visit are actually timestamped. A negative result means
    // completed_at landed before arrived_at (a WhatsApp/GPS timestamp race,
    // not a real duration) - null it out here so no consumer ever has to
    // handle or accidentally display a nonsensical negative time.
    let duration: { promisedMinutes: number; actualMinutes: number } | null = null;
    if (job.arrived_at && job.completed_at) {
      const actualMinutes = Math.round((new Date(job.completed_at).getTime() - new Date(job.arrived_at).getTime()) / 60000);
      if (actualMinutes >= 0) {
        duration = { promisedMinutes: job.duration_minutes, actualMinutes };
      }
    }

    return withSecurityHeaders(
      NextResponse.json({
        found: true,
        status: job.status,
        scheduled_at: job.scheduled_at,
        started_at: job.started_at,
        arrived_at: job.arrived_at,
        completed_at: job.completed_at,
        updated_at: job.updated_at,
        duration,
        location: latestLocation
          ? { lat: latestLocation.latitude, lng: latestLocation.longitude, recorded_at: latestLocation.recorded_at }
          : null,
      }),
      traceId
    );
  } catch (error) {
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to fetch job tracking: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}
