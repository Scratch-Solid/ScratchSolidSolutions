import { NextRequest, NextResponse } from 'next/server';
import { getDb, getBookingById, updateBooking } from "@/lib/db";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const booking = await getBookingById(db, parseInt(params.id));
    if (!booking) {
      const response = NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }
    const response = NextResponse.json(booking);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error fetching booking:', error);
    const response = NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json();
    const booking = await updateBooking(db, parseInt(params.id), body);
    if (!booking) {
      const response = NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }
    const response = NextResponse.json(booking);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error updating booking:', error);
    const response = NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
