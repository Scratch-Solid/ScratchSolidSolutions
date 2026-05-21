export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';
import { horizonScoper, suburbExtractor } from '@/lib/horizon/scoping';
import { autoAssignBooking, determinePoolFromServiceType, isValidTimeSlot } from '@/lib/pool-management/pool-assignment';

const VALID_TIME_SLOTS = ['08:00', '11:00', '12:00', '14:00'];

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const cleanerId = searchParams.get('cleaner_id');
    const clientId  = searchParams.get('client_id');
    const type      = searchParams.get('type');

    let query = 'SELECT * FROM bookings WHERE 1=1';
    const binds: (string | number)[] = [];
    if (cleanerId) { query += ' AND cleaner_id = ?'; binds.push(cleanerId); }
    if (clientId)  { query += ' AND client_id = ?';  binds.push(clientId); }
    if (type)      { query += ' AND booking_type = ?'; binds.push(type); }

    const role = (user as any)?.role || '';

    // Cleaners: restrict to 7-day horizon window
    if (role === 'cleaner') {
      const today = new Date().toISOString().split('T')[0];
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + 7);
      const horizonStr = horizon.toISOString().split('T')[0];
      query += ' AND booking_date >= ? AND booking_date <= ?';
      binds.push(today, horizonStr);
    }

    query += ' ORDER BY booking_date ASC LIMIT 100';

    const results = await db.prepare(query).bind(...binds).all();
    let bookings: any[] = results.results || [];

    // Horizon scoping: redact full address until 24 h before the booking
    if (role === 'cleaner') {
      bookings = bookings.map((b: any) => {
        const bookingDate = b.booking_date || b.service_date || '';
        const fullDetails = horizonScoper.canViewFullDetails(bookingDate);
        if (!fullDetails) {
          // Show suburb only, not full address
          const suburb = suburbExtractor.extractSuburb(b.location || '') || 'Area not yet disclosed';
          return { ...b, location: suburb, address_restricted: true };
        }
        return b;
      });
    }

    const response = NextResponse.json(bookings);
    response.headers.set('Cache-Control', 'private, max-age=15');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'cleaner', 'client']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  // CSRF protection
  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  try {
    const body = await request.json() as any;
    const {
      service_id, user_id, cleaner_id, booking_date, booking_time,
      notes, service_type, time_slot, location, client_name
    } = body;

    if (!booking_date || !booking_time) {
      const response = NextResponse.json({ error: 'Missing required fields: booking_date, booking_time' }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Validate time slot if provided
    const resolvedSlot = time_slot || booking_time;
    if (resolvedSlot && !VALID_TIME_SLOTS.includes(resolvedSlot)) {
      const response = NextResponse.json(
        { error: `Invalid time slot "${resolvedSlot}". Allowed: ${VALID_TIME_SLOTS.join(', ')}` },
        { status: 400 }
      );
      return withSecurityHeaders(response, traceId);
    }

    // Time slot overlap check: ensure no other booking at same slot/date/location
    if (resolvedSlot && cleaner_id) {
      const conflict = await db.prepare(`
        SELECT ba.id FROM booking_assignments ba
        WHERE ba.staff_id = ?
          AND ba.assignment_date = ?
          AND ba.time_slot = ?
          AND ba.status NOT IN ('cancelled', 'completed')
        LIMIT 1
      `).bind(cleaner_id, booking_date, resolvedSlot).first();

      if (conflict) {
        const response = NextResponse.json(
          { error: `Time slot ${resolvedSlot} on ${booking_date} is already taken for this cleaner` },
          { status: 409 }
        );
        return withSecurityHeaders(response, traceId);
      }
    }

    // Determine pool type from service type
    const resolvedServiceType = service_type || 'RESIDENTIAL';
    const poolType = determinePoolFromServiceType(resolvedServiceType);

    const booking = await db.prepare(`
      INSERT INTO bookings (
        user_id, cleaner_id, booking_date, booking_time,
        status, special_instructions, service_type, time_slot, pool_type,
        location, assignment_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
      RETURNING *
    `).bind(
      user_id || null, cleaner_id || null,
      booking_date, booking_time,
      notes || body.special_instructions || null,
      resolvedServiceType, resolvedSlot || null, poolType,
      location || null
    ).first();

    // Auto-assign for INDIVIDUAL pool bookings immediately
    if (poolType === 'INDIVIDUAL' && booking) {
      try {
        await autoAssignBooking(db, (booking as any).id, resolvedServiceType, booking_date, resolvedSlot || null);
      } catch (assignErr) {
        // Log but don't fail the booking creation — admin can assign manually
        console.warn('Auto-assign failed for booking', (booking as any).id, assignErr);
      }
    }

    const response = NextResponse.json(booking, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Booking creation error:', error);
    const response = NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
