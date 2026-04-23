import { NextRequest, NextResponse } from 'next/server';
import { getDb, createBooking, getBookingsByDateRange, getBookingsByCleaner } from "@/lib/db";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['client', 'business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json();
    const {
      client_id,
      client_name,
      location,
      service_type,
      booking_date,
      booking_time,
      special_instructions,
      booking_type = 'standard',
      cleaning_type = 'standard',
      payment_method = 'cash',
      loyalty_discount = 0
    } = body;

    // Business contract advance verification
    const user = await db.prepare('SELECT role FROM users WHERE id = ?').bind(client_id).first();
    if (user?.role === 'business') {
      const contract = await db.prepare('SELECT * FROM contracts WHERE business_id = ? AND status = ?').bind(client_id, 'active').first();
      if (!contract) {
        return NextResponse.json({ error: 'Business account requires an active service contract to book services' }, { status: 403 });
      }
      if (contract.is_immutable === 1) {
        const bookingDate = new Date(booking_date);
        const contractStart = new Date(contract.start_date);
        if (bookingDate < contractStart) {
          return NextResponse.json({ error: 'Booking date is before contract start date' }, { status: 403 });
        }
        if (contract.end_date && bookingDate > new Date(contract.end_date)) {
          return NextResponse.json({ error: 'Booking date is after contract end date' }, { status: 403 });
        }
      }
    }

    // Check for booking conflicts
    const conflictingBookings = await getBookingsByDateRange(db, booking_date, booking_date);
    const timeConflicts = conflictingBookings?.filter((b: any) => {
      const requestedStart = booking_time;
      const requestedEnd = addHours(requestedStart, 2);
      const existingStart = b.booking_time;
      const existingEnd = addHours(existingStart, 2);
      return timeOverlap(requestedStart, requestedEnd, existingStart, existingEnd);
    });

    if (timeConflicts && timeConflicts.length > 0) {
      const alternatives = generateAlternativeTimes(booking_date, timeConflicts);
      return NextResponse.json({
        error: 'Booking conflict',
        conflicts: timeConflicts,
        alternatives
      }, { status: 409 });
    }

    const booking = await createBooking(db, {
      client_id,
      client_name,
      location,
      service_type,
      booking_date,
      booking_time,
      special_instructions,
      booking_type,
      cleaning_type,
      payment_method,
      loyalty_discount,
      status: 'pending'
    });

    const response = NextResponse.json(booking, { status: 201 });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error creating booking:', error);
    const response = NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const cleanerId = searchParams.get('cleaner_id');
    const date = searchParams.get('date');

    let bookings;
    if (cleanerId) {
      bookings = await getBookingsByCleaner(db, parseInt(cleanerId));
    } else if (clientId) {
      bookings = await getBookingsByDateRange(db, date || new Date().toISOString().split('T')[0], date || new Date().toISOString().split('T')[0]);
      bookings = bookings?.filter((b: any) => b.client_id === parseInt(clientId));
    } else {
      bookings = await getBookingsByDateRange(db, date || new Date().toISOString().split('T')[0], date || new Date().toISOString().split('T')[0]);
    }

    const response = NextResponse.json(bookings || []);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    const response = NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h + hours, m);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function timeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

function generateAlternativeTimes(date: string, conflicts: any[]): string[] {
  const allSlots = ['08:00', '10:00', '12:00', '14:00', '16:00'];
  const conflictTimes = new Set(conflicts.map((c: any) => c.booking_time));
  return allSlots.filter(slot => !conflictTimes.has(slot));
}
