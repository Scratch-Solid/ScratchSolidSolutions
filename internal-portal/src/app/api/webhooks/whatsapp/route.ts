import { NextRequest, NextResponse } from 'next/server';
import { whatsappGateway } from '@/lib/whatsapp/gateway';
import { getDb } from '@/lib/db';

// Map plain-text keywords to booking_assignments status values
const STATUS_KEYWORDS: Record<string, { status: string; label: string }> = {
  START: { status: 'on_way',    label: 'On the Way'  },
  HERE:  { status: 'arrived',   label: 'Arrived'     },
  DONE:  { status: 'completed', label: 'Completed'   },
};

function twimlResponse(message: string): NextResponse {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${message}</Message></Response>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } });
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from      = (formData.get('From') as string) || '';
    const to        = (formData.get('To')   as string) || '';
    const body      = (formData.get('Body') as string) || '';
    const mediaUrls = formData.getAll('MediaUrl') as string[];

    // Normalise phone: strip "whatsapp:" prefix and whitespace
    const phone   = from.replace('whatsapp:', '').replace(/\s+/g, '').trim();
    const keyword = body.trim().toUpperCase();

    // ── Status keyword handler ──────────────────────────────────────────────
    if (STATUS_KEYWORDS[keyword]) {
      const { status: newStatus, label } = STATUS_KEYWORDS[keyword];

      const db = await getDb();
      if (!db) return twimlResponse('Service temporarily unavailable. Please try again.');

      // 1. Resolve staff member by cellphone
      const staff = await db.prepare(`
        SELECT id, first_name FROM staff
        WHERE REPLACE(cellphone, ' ', '') = ? AND is_active = 1
        LIMIT 1
      `).bind(phone).first<{ id: number; first_name: string }>();

      // Fallback: check legacy cleaner_profiles table
      const staffRecord = staff ?? await db.prepare(`
        SELECT user_id AS id, first_name FROM cleaner_profiles
        WHERE REPLACE(cellphone, ' ', '') = ?
        LIMIT 1
      `).bind(phone).first<{ id: number; first_name: string }>();

      if (!staffRecord) {
        return twimlResponse('Your number is not registered. Please contact the admin office.');
      }

      // 2. Find today's active booking assignment (join bookings for date + time)
      const today = new Date().toISOString().split('T')[0];
      const assignment = await db.prepare(`
        SELECT ba.id, ba.booking_id, b.booking_time AS time_slot
        FROM booking_assignments ba
        JOIN bookings b ON b.id = ba.booking_id
        WHERE ba.staff_id = ?
          AND b.booking_date = ?
          AND ba.assignment_status NOT IN ('completed', 'cancelled')
        ORDER BY b.booking_time ASC
        LIMIT 1
      `).bind(staffRecord.id, today).first<{ id: number; booking_id: number; time_slot: string }>();

      if (!assignment) {
        return twimlResponse(`Hi ${staffRecord.first_name}! No active booking found for today. If this is an error, please contact your supervisor.`);
      }

      // 3. Update booking_assignments status
      if (newStatus === 'completed') {
        await db.prepare(`
          UPDATE booking_assignments
          SET assignment_status = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(newStatus, assignment.id).run();
      } else if (newStatus === 'arrived') {
        await db.prepare(`
          UPDATE booking_assignments
          SET assignment_status = ?, arrived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(newStatus, assignment.id).run();
      } else {
        await db.prepare(`
          UPDATE booking_assignments
          SET assignment_status = ?, started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(newStatus, assignment.id).run();
      }

      // 4. Mirror status on the parent bookings row
      await db.prepare(`
        UPDATE bookings SET assignment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(newStatus, assignment.booking_id).run();

      // 5. Also update cleaner_profiles status for dashboard sync
      await db.prepare(`
        UPDATE cleaner_profiles SET status = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).bind(newStatus === 'on_way' ? 'on_way' : newStatus, staffRecord.id).run();

      return twimlResponse(`✅ Hi ${staffRecord.first_name}! Your status has been updated to "${label}" for today's booking (slot ${assignment.time_slot}).`);
    }

    // ── Standard /command gateway ───────────────────────────────────────────
    const response = await whatsappGateway.processMessage({
      from: phone,
      to:   to.replace('whatsapp:', ''),
      body,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    });

    return twimlResponse(response);
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return twimlResponse('An error occurred. Please try again or contact your supervisor.');
  }
}
