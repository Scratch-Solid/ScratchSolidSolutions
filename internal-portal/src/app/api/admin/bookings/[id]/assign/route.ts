import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const body = await request.json() as { cleaner_id?: number };
    const { cleaner_id } = body;
    const bookingId = params.id;

    if (!cleaner_id) {
      return NextResponse.json({ error: 'Missing cleaner_id' }, { status: 400 });
    }

    // Verify cleaner exists and is not blocked
    const cleaner = await db.prepare(
      'SELECT * FROM cleaner_profiles WHERE user_id = ?'
    ).bind(cleaner_id).first();

    if (!cleaner) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 });
    }

    if ((cleaner as any).blocked === 1) {
      return NextResponse.json({ error: 'Cannot assign booking to blocked cleaner' }, { status: 403 });
    }

    // Update booking with cleaner assignment
    await db.prepare(
      'UPDATE bookings SET cleaner_id = ?, status = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(cleaner_id, 'assigned', bookingId).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error assigning cleaner to booking:', error);
    return NextResponse.json({ error: 'Failed to assign cleaner' }, { status: 500 });
  }
}
