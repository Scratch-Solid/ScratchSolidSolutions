import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getVerifyToken, recordInboundMessage } from '@/lib/whatsapp/meta-cloud';

/**
 * Meta Cloud API WhatsApp Webhook
 *
 * GET  – Webhook verification (Meta sends hub.mode=subscribe + hub.verify_token)
 * POST – Incoming message/event payload from Meta
 */

// ─── Webhook Verification ───
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === getVerifyToken()) {
    console.log('[WhatsApp Meta] Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[WhatsApp Meta] Webhook verification failed', { mode, token });
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// ─── Incoming Message Handler ───
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as any;

    // Meta sends entries array, each with changes
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value || {};
        const messages = value.messages || [];
        const statuses = value.statuses || [];

        const db = await getDb();
        if (!db) {
          console.error('[WhatsApp Meta] Database unavailable');
          continue;
        }

        // ── Inbound messages ──
        for (const msg of messages) {
          const from = msg.from; // sender phone number
          const messageBody = msg.text?.body || '';
          const messageId = msg.id;

          // Record inbound message to extend 24h conversation window
          await recordInboundMessage(db, from, messageId, messageBody);

          // Mirror existing Twilio webhook behaviour for START/HERE/DONE
          await handleStatusKeyword(db, from, messageBody);
        }

        // ── Status updates (delivered, read, failed) ──
        for (const status of statuses) {
          console.log('[WhatsApp Meta] Message status update:', {
            id: status.id,
            status: status.status,
            timestamp: status.timestamp,
          });
          // TODO: Update message delivery status in a messages table
        }
      }
    }

    // Meta expects 200 OK for all webhook calls
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[WhatsApp Meta] Webhook error:', error);
    // Always return 200 to Meta so they don't retry
    return NextResponse.json({ status: 'ok' });
  }
}

// ─── Helper: Mirror START/HERE/DONE behaviour ───
async function handleStatusKeyword(db: any, phone: string, body: string) {
  const STATUS_KEYWORDS: Record<string, { status: string; label: string }> = {
    START: { status: 'on_way', label: 'On the Way' },
    HERE: { status: 'arrived', label: 'Arrived' },
    DONE: { status: 'completed', label: 'Completed' },
  };

  const keyword = body.trim().toUpperCase();
  if (!STATUS_KEYWORDS[keyword]) return;

  const { status: newStatus, label } = STATUS_KEYWORDS[keyword];

  // Resolve staff member by cellphone
  const staff = await db
    .prepare(
      `SELECT id, first_name FROM staff
       WHERE REPLACE(cellphone, ' ', '') = ? AND is_active = 1
       LIMIT 1`
    )
    .bind(phone)
    .first() as { id: number; first_name: string } | null;

  const staffRecord =
    staff ??
    (await db
      .prepare(
        `SELECT user_id AS id, first_name FROM cleaner_profiles
         WHERE REPLACE(cellphone, ' ', '') = ?
         LIMIT 1`
      )
      .bind(phone)
      .first() as { id: number; first_name: string } | null);

  if (!staffRecord) {
    console.warn(`[WhatsApp Meta] Unregistered phone: ${phone}`);
    return;
  }

  // Find today's active booking assignment
  const today = new Date().toISOString().split('T')[0];
  const assignment = await db
    .prepare(
      `SELECT ba.id, ba.booking_id, b.booking_time AS time_slot
       FROM booking_assignments ba
       JOIN bookings b ON b.id = ba.booking_id
       WHERE ba.staff_id = ?
         AND b.booking_date = ?
         AND ba.assignment_status NOT IN ('completed', 'cancelled')
       ORDER BY b.booking_time ASC
       LIMIT 1`
    )
    .bind(staffRecord.id, today)
    .first() as { id: number; booking_id: number; time_slot: string } | null;

  if (!assignment) {
    console.warn(`[WhatsApp Meta] No active booking for staff ${staffRecord.id}`);
    return;
  }

  // Update booking_assignments status
  if (newStatus === 'completed') {
    await db
      .prepare(
        `UPDATE booking_assignments
         SET assignment_status = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(newStatus, assignment.id)
      .run();
  } else if (newStatus === 'arrived') {
    await db
      .prepare(
        `UPDATE booking_assignments
         SET assignment_status = ?, arrived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(newStatus, assignment.id)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE booking_assignments
         SET assignment_status = ?, started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(newStatus, assignment.id)
      .run();
  }

  // Mirror status on bookings
  await db
    .prepare(
      `UPDATE bookings SET assignment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .bind(newStatus, assignment.booking_id)
    .run();

  // Update cleaner_profiles status
  await db
    .prepare(
      `UPDATE cleaner_profiles SET status = ?, updated_at = datetime('now') WHERE user_id = ?`
    )
    .bind(newStatus === 'on_way' ? 'on_way' : newStatus, staffRecord.id)
    .run();

  console.log(
    `[WhatsApp Meta] Status updated to "${label}" for staff ${staffRecord.id} (booking ${assignment.booking_id})`
  );
}
