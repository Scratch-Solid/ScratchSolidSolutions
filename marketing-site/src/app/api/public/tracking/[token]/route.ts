import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

const INTERNAL_PORTAL_URL = process.env.INTERNAL_PORTAL_URL || 'https://portal.scratchsolidsolutions.org';

// Real jobs go: marketing-site booking -> Cal.com -> n8n -> internal-portal's
// `jobs` table, correlated by calcom_uid (set on this booking row once the
// Cal.com booking is created - see api/bookings/route.ts). The cleaner's
// actual timestamped status updates (On the Way/Arrived/Completed, via
// WhatsApp) live entirely in internal-portal's database, so this route asks
// internal-portal for the real status instead of reading this app's own
// booking row, which never gets a cleaner/status assigned to it directly.
async function fetchJobStatus(calcomUid: string) {
  try {
    const res = await fetch(
      `${INTERNAL_PORTAL_URL}/api/public/job-tracking?calcom_uid=${encodeURIComponent(calcomUid)}`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { found: boolean; [key: string]: any };
    return data.found ? data : null;
  } catch (error) {
    logger.error('Error fetching job status from internal-portal', error as Error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const traceId = withTracing(request);
  const { token } = await params;

  try {
    const db = await getDb();
    if (!db) {
      const response = NextResponse.json({ error: 'Database not available' }, { status: 500 });
      return withSecurityHeaders(response, traceId);
    }

    if (!token) {
      const response = NextResponse.json({ error: 'Missing token' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Get booking by tracking token
    const booking = await db.prepare(
      'SELECT * FROM bookings WHERE tracking_token = ?'
    ).bind(token).first() as any;

    if (!booking) {
      const response = NextResponse.json({ error: 'Invalid tracking token' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const jobStatus = booking.calcom_uid ? await fetchJobStatus(booking.calcom_uid) : null;

    // Prepare response data
    const responseData = {
      booking: {
        id: booking.id,
        service_name: booking.service_name,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        location: booking.location,
        status: booking.status
      },
      // Real, timestamped status from internal-portal's jobs table - the
      // actual source of truth for the Transparency Policy tracker.
      tracking: jobStatus ? {
        status: jobStatus.status,
        started_at: jobStatus.started_at,
        arrived_at: jobStatus.arrived_at,
        completed_at: jobStatus.completed_at,
        location: jobStatus.location,
      } : null,
    };

    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'private, max-age=10');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching public tracking data', error as Error);
    const response = NextResponse.json({ error: `Failed to fetch tracking data: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
