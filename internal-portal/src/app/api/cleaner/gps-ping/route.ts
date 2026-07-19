export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { calculateDistance, getCoordinatesForArea } from '@/lib/geofence';
import { findActiveAssignment } from '@/lib/active-assignment';
import { geocodeAddress } from '@/lib/geocoding';

// GPS is the backup confirmation path for the Transparency Policy timeline -
// WhatsApp (START/HERE/DONE) is the primary signal a cleaner sends
// intentionally; this endpoint lets a live location ping arrive at the same
// canonical timestamps if WhatsApp never comes in (no signal, forgotten
// phone, etc). It never overwrites a timestamp WhatsApp already set - it
// only fills the gap and records its own reading for the admin comparison
// view.
const ARRIVAL_RADIUS_METERS = 150;
const MIN_DWELL_MINUTES_BEFORE_AUTO_COMPLETE = 15;

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  const staffId = (user as any).user_id || (user as any).id;

  try {
    const body = await request.json() as { lat?: number; long?: number };
    const { lat, long } = body;
    if (typeof lat !== 'number' || typeof long !== 'number') {
      return withSecurityHeaders(NextResponse.json({ error: 'lat and long are required' }, { status: 400 }), traceId);
    }

    const cleanerProfile = await db
      .prepare('SELECT paysheet_code FROM cleaner_profiles WHERE user_id = ?')
      .bind(staffId)
      .first() as { paysheet_code?: string } | null;

    const assignment = await findActiveAssignment(db, staffId, cleanerProfile?.paysheet_code);
    if (!assignment || assignment.entity_type !== 'job') {
      // No active job today, or it's on the legacy bookings-table path,
      // which the Transparency Policy timeline doesn't read from.
      return withSecurityHeaders(NextResponse.json({ confirmed: false, reason: 'no_active_job' }), traceId);
    }

    const job = await db
      .prepare(
        `SELECT id, property_address, suburb, geocoded_lat, geocoded_long,
                arrived_at, arrived_at_gps, completed_at, completed_at_gps
         FROM jobs WHERE id = ?`
      )
      .bind(assignment.entity_id)
      .first() as any;

    if (!job) {
      return withSecurityHeaders(NextResponse.json({ confirmed: false, reason: 'job_not_found' }), traceId);
    }

    let jobLat = job.geocoded_lat as number | null;
    let jobLong = job.geocoded_long as number | null;

    if (jobLat == null || jobLong == null) {
      // Self-heal: this job predates geocoding-on-ingestion, or geocoding
      // failed at the time. Try once now rather than falling back forever.
      const geocoded = await geocodeAddress(
        job.suburb ? `${job.property_address}, ${job.suburb}` : job.property_address
      );
      if (geocoded) {
        jobLat = geocoded.lat;
        jobLong = geocoded.long;
        await db
          .prepare('UPDATE jobs SET geocoded_lat = ?, geocoded_long = ?, geocoded_at = ? WHERE id = ?')
          .bind(jobLat, jobLong, new Date().toISOString(), job.id)
          .run();
      } else if (job.suburb) {
        const areaCoords = getCoordinatesForArea(job.suburb);
        if (areaCoords) {
          jobLat = areaCoords.lat;
          jobLong = areaCoords.long;
        }
      }
    }

    if (jobLat == null || jobLong == null) {
      return withSecurityHeaders(NextResponse.json({ confirmed: false, reason: 'no_location_available' }), traceId);
    }

    const distance = calculateDistance(lat, long, jobLat, jobLong);
    const nowIso = new Date().toISOString();
    const inRange = distance <= ARRIVAL_RADIUS_METERS;

    if (inRange && !job.arrived_at_gps) {
      await db
        .prepare(
          `UPDATE jobs SET arrived_at = COALESCE(arrived_at, ?), arrived_at_gps = ?, updated_at = ? WHERE id = ?`
        )
        .bind(nowIso, nowIso, nowIso, job.id)
        .run();
      logger.info(`GPS confirmed arrival for job ${job.id}, distance ${Math.round(distance)}m`);
      return withSecurityHeaders(NextResponse.json({ confirmed: true, event: 'arrived', distance: Math.round(distance) }), traceId);
    }

    if (!inRange && job.arrived_at && !job.completed_at_gps) {
      const arrivedAt = new Date(job.arrived_at_gps || job.arrived_at).getTime();
      const dwellMinutes = (Date.now() - arrivedAt) / 60000;
      if (dwellMinutes >= MIN_DWELL_MINUTES_BEFORE_AUTO_COMPLETE) {
        await db
          .prepare(
            `UPDATE jobs SET completed_at = COALESCE(completed_at, ?), completed_at_gps = ?, updated_at = ? WHERE id = ?`
          )
          .bind(nowIso, nowIso, nowIso, job.id)
          .run();
        logger.info(`GPS confirmed completion for job ${job.id} after ${Math.round(dwellMinutes)}min on site`);
        return withSecurityHeaders(NextResponse.json({ confirmed: true, event: 'completed', dwellMinutes: Math.round(dwellMinutes) }), traceId);
      }
    }

    return withSecurityHeaders(NextResponse.json({ confirmed: false, distance: Math.round(distance) }), traceId);
  } catch (error) {
    logger.error('GPS ping failed', error as Error);
    return withSecurityHeaders(NextResponse.json({ error: 'Failed to process GPS ping' }, { status: 500 }), traceId);
  }
}
