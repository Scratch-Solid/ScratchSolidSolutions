import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { autoAssignBooking, isValidTimeSlot } from '@/lib/pool-management/pool-assignment';
import { getTrainingDb } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth(request, ['admin']);
  if (auth instanceof NextResponse) return auth;
  const { user, db } = auth;

  const { id } = await params;
  const bookingId = parseInt(id);
  if (isNaN(bookingId)) {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  }

  try {
    const body = await request.json() as { assignmentDate: string; timeSlot?: string };
    const { assignmentDate, timeSlot } = body;

    // Validate input
    if (!assignmentDate) {
      return NextResponse.json({ error: 'Missing required field: assignmentDate' }, { status: 400 });
    }

    if (timeSlot && !isValidTimeSlot(timeSlot)) {
      return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 });
    }

    // Get training database
    const trainingDb = await getTrainingDb();

    if (!trainingDb) {
      return NextResponse.json({ error: 'Training database not available' }, { status: 500 });
    }

    const bookingRow = await db.prepare('SELECT suburb FROM bookings WHERE id = ?').bind(bookingId).first<{ suburb: string | null }>();

    const result = await autoAssignBooking(
      db,
      trainingDb,
      bookingId,
      assignmentDate,
      (timeSlot || null) as any,
      bookingRow?.suburb
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Auto-assign booking error:', error);
    return NextResponse.json({ error: `Failed to auto-assign booking: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
