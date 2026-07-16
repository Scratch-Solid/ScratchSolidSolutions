import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  getVerifyToken,
  recordInboundMessage,
  downloadMediaFromMeta,
} from '@/lib/whatsapp/meta-cloud';
import { getCloudflareContext } from '@/lib/runtime-context';
import { resolveStaff, findActiveAssignment } from '@/lib/active-assignment';

/**
 * Meta Cloud API WhatsApp Webhook
 *
 * GET  – Webhook verification (Meta sends hub.mode=subscribe + hub.verify_token)
 * POST – Incoming message/event payload from Meta
 */

const STATUS_KEYWORDS: Record<string, { status: string; label: string }> = {
  START: { status: 'on_way', label: 'On the Way' },
  HERE: { status: 'arrived', label: 'Arrived' },
  DONE: { status: 'completed', label: 'Completed' },
};

// ─── Webhook Verification ───
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === await getVerifyToken()) {
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
          const messageId = msg.id;

          if (msg.type === 'image' && msg.image) {
            // Handle media (image) upload
            await handleImageMessage(db, from, messageId, msg.image);
          } else if (msg.type === 'text' && msg.text?.body) {
            const messageBody = msg.text.body;
            // Record inbound message to extend 24h conversation window
            await recordInboundMessage(db, from, messageId, messageBody);
            // Handle status keywords with fuzzy matching
            await handleStatusKeyword(db, from, messageBody);
          } else {
            // Record other inbound message types
            await recordInboundMessage(db, from, messageId, `[${msg.type}]`);
          }
        }

        // ── Status updates (delivered, read, failed) ──
        for (const status of statuses) {
          console.log('[WhatsApp Meta] Message status update:', {
            id: status.id,
            status: status.status,
            timestamp: status.timestamp,
          });
          // Optionally: update a messages table delivery status
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[WhatsApp Meta] Webhook error:', error);
    return NextResponse.json({ status: 'ok' });
  }
}

// ─── Fuzzy keyword extraction ───
function extractStatusKeyword(text: string): string | null {
  const normalized = text.toUpperCase().replace(/[^A-Z]/g, '');
  if (normalized.includes('START') || normalized.includes('LEAVING') || normalized.includes('ONTHEWAY')) return 'START';
  if (normalized.includes('HERE') || normalized.includes('ARRIVED') || normalized.includes('ATLOCATION')) return 'HERE';
  if (normalized.includes('DONE') || normalized.includes('FINISHED') || normalized.includes('COMPLETE') || normalized.includes('COMPLETED')) return 'DONE';
  return null;
}

// ─── Handle status keyword (START/HERE/DONE) ───
async function handleStatusKeyword(db: any, phone: string, body: string) {
  const keyword = extractStatusKeyword(body);
  if (!keyword || !STATUS_KEYWORDS[keyword]) return;

  const { status: newStatus, label } = STATUS_KEYWORDS[keyword];

  const staffRecord = await resolveStaff(db, phone);
  if (!staffRecord) {
    console.warn(`[WhatsApp Meta] Unregistered phone: ${phone}`);
    return;
  }

  const assignment = await findActiveAssignment(db, staffRecord.id, staffRecord.paysheet_code);

  if (!assignment) {
    console.warn(`[WhatsApp Meta] No active assignment for staff ${staffRecord.id}`);
    return;
  }

  if (assignment.entity_type === 'booking') {
    // Update booking_assignments
    if (newStatus === 'completed') {
      await db.prepare(
        `UPDATE booking_assignments
         SET assignment_status = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(newStatus, assignment.assignment_id).run();
    } else if (newStatus === 'arrived') {
      await db.prepare(
        `UPDATE booking_assignments
         SET assignment_status = ?, arrived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(newStatus, assignment.assignment_id).run();
    } else {
      await db.prepare(
        `UPDATE booking_assignments
         SET assignment_status = ?, started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(newStatus, assignment.assignment_id).run();
    }
    // Mirror on bookings
    await db.prepare(
      `UPDATE bookings SET assignment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(newStatus, assignment.entity_id).run();
  } else {
    // Update jobs table. arrived_at/completed_at are the canonical,
    // client-facing timestamps - COALESCE so whichever source (WhatsApp or
    // GPS) reports first keeps its timestamp; the *_whatsapp column always
    // records this source's own report for the admin comparison view,
    // regardless of which one won the canonical slot.
    const nowIso = new Date().toISOString();
    if (newStatus === 'completed') {
      await db.prepare(
        `UPDATE jobs SET status = ?, completed_at = COALESCE(completed_at, ?), completed_at_whatsapp = ?, updated_at = ? WHERE id = ?`
      ).bind(newStatus, nowIso, nowIso, nowIso, assignment.entity_id).run();
    } else if (newStatus === 'arrived') {
      await db.prepare(
        `UPDATE jobs SET status = ?, arrived_at = COALESCE(arrived_at, ?), arrived_at_whatsapp = ?, updated_at = ? WHERE id = ?`
      ).bind(newStatus, nowIso, nowIso, nowIso, assignment.entity_id).run();
    } else {
      await db.prepare(
        `UPDATE jobs SET status = ?, started_at = COALESCE(started_at, ?), updated_at = ? WHERE id = ?`
      ).bind(newStatus, nowIso, nowIso, assignment.entity_id).run();
    }
  }

  // Update cleaner_profiles status
  await db.prepare(
    `UPDATE cleaner_profiles SET status = ?, updated_at = datetime('now') WHERE user_id = ?`
  ).bind(newStatus === 'on_way' ? 'on_way' : newStatus, staffRecord.id).run();

  console.log(
    `[WhatsApp Meta] Status updated to "${label}" for staff ${staffRecord.id} (${assignment.entity_type} ${assignment.entity_id})`
  );
}

// ─── Handle image message: download, upload to R2, record in job_photos ───
async function handleImageMessage(db: any, from: string, messageId: string, imageMeta: any) {
  const mediaId = imageMeta.id;
  if (!mediaId) return;

  // Resolve staff
  const staffRecord = await resolveStaff(db, from);
  if (!staffRecord) {
    console.warn(`[WhatsApp Meta] Unregistered phone for image: ${from}`);
    return;
  }

  // Record inbound to keep window open
  await recordInboundMessage(db, from, messageId, '[image]');

  // Find active assignment
  const assignment = await findActiveAssignment(db, staffRecord.id, staffRecord.paysheet_code);
  if (!assignment) {
    console.warn(`[WhatsApp Meta] No active assignment for image from staff ${staffRecord.id}`);
    return;
  }

  const jobId = assignment.entity_id;

  // Download media from Meta
  const media = await downloadMediaFromMeta(mediaId);
  if (!media) {
    console.warn(`[WhatsApp Meta] Failed to download media ${mediaId}`);
    return;
  }

  // Upload to R2
  try {
    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const bucket = env?.CLEANER_PHOTOS_BUCKET;
    if (!bucket) {
      console.warn('[WhatsApp Meta] CLEANER_PHOTOS_BUCKET not configured');
      return;
    }

    const timestamp = Date.now();
    const objectKey = `jobs/${jobId}/whatsapp/${timestamp}_${messageId}.jpg`;
    await bucket.put(objectKey, media.buffer, {
      httpMetadata: { contentType: media.contentType },
      customMetadata: {
        'job-id': jobId,
        'source': 'whatsapp',
        'staff-id': String(staffRecord.id),
        'message-id': messageId,
      },
    });

    const publicUrl = `${(process.env.R2_PUBLIC_BASE || 'https://uploads.scratchsolidsolutions.org').replace(/\/$/, '')}/${objectKey}`;

    // Record in job_photos
    await db.prepare(
      `INSERT INTO job_photos (job_id, room_name, photo_url, uploaded_by, uploaded_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(jobId, 'whatsapp', publicUrl, staffRecord.paysheet_code || String(staffRecord.id)).run();

    console.log(`[WhatsApp Meta] Image uploaded for job ${jobId}: ${publicUrl}`);
  } catch (err) {
    console.error('[WhatsApp Meta] R2 upload error:', err);
  }
}
