import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { notifyPaymentReminder } from '@/lib/notifications';
import { getInvoiceStatus } from '@/lib/zoho';

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const now = new Date();
    const upcoming = new Date();
    upcoming.setDate(now.getDate() + 3);

    const { results: bookings } = await db.prepare(
      'SELECT id, client_email, client_phone, total_amount, booking_date, payment_status, invoice_id FROM bookings WHERE payment_status = ? AND booking_date <= ? AND booking_date >= ?'
    ).bind('pending', upcoming.toISOString(), now.toISOString()).all() as any;

    const reminders = [];
    for (const booking of (bookings || [])) {
      const reminder = await notifyPaymentReminder(booking.client_phone, booking.client_email, booking.total_amount, booking.booking_date);
      reminders.push({ booking_id: booking.id, sent: reminder.success });
    }

    return NextResponse.json({ reminders_sent: reminders.length, details: reminders });
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}
