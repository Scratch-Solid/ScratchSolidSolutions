import { NextRequest, NextResponse } from 'next/server';
import { checkAuthAndRole } from '@/lib/auth-middleware';
import { autoAssignBooking, determinePoolFromServiceType, isValidTimeSlot } from '@/lib/pool-management/pool-assignment';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkAuthAndRole(request, 'admin');
  if (!auth.authenticated || !auth.authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bookingId = parseInt(params.id);
  if (isNaN(bookingId)) {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { serviceType, assignmentDate, timeSlot } = body;

    // Validate input
    if (!serviceType || !assignmentDate) {
      return NextResponse.json({ error: 'Missing required fields: serviceType, assignmentDate' }, { status: 400 });
    }

    const validServiceTypes = ['RESIDENTIAL', 'LEKKESLAAP', 'POST_CONSTRUCTION', 'OFFICE', 'COMMERCIAL'];
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 });
    }

    if (timeSlot && !isValidTimeSlot(timeSlot)) {
      return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 });
    }

    // Get database from context (assuming it's available)
    // This would need to be adapted based on your database setup
    const db = (request as any).db;

    const result = await autoAssignBooking(
      db,
      bookingId,
      serviceType,
      assignmentDate,
      timeSlot || null
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Auto-assign booking error:', error);
    return NextResponse.json({ error: 'Failed to auto-assign booking' }, { status: 500 });
  }
}
