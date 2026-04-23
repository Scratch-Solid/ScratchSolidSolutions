import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

export async function GET(request: NextRequest) {
  const db = getDb(request);
  if (!db) return NextResponse.json({ error: 'Database not available' }, { status: 500 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cleaner_id = searchParams.get('cleaner_id');
    const client_id = searchParams.get('client_id');

    let query = 'SELECT * FROM bookings';
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (cleaner_id) {
      conditions.push('cleaner_id = ?');
      params.push(cleaner_id);
    }

    if (client_id) {
      conditions.push('client_id = ?');
      params.push(client_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY booking_date DESC, booking_time DESC';

    const bookings = await db.prepare(query).bind(...params).all();
    return NextResponse.json(bookings.results || []);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}
