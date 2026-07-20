import { NextRequest, NextResponse } from 'next/server';
import { getDb, getTrainingDb } from '@/lib/db';
import { getCloudflareContext } from '@/lib/runtime-context';
import {
  resolveAssignmentPool,
  scoreAssignmentCandidates,
} from '@/lib/pool-management/pool-assignment';
import { geocodeAddress } from '@/lib/geocoding';

/**
 * n8n → Internal Portal: Booking Ingestion Webhook
 * Triggered by n8n when Cal.com confirms a booking.
 * Creates a job record and expands the property template into checklist items.
 *
 * Auth: Bearer token matching INTERNAL_PORTAL_N8N_WEBHOOK_SECRET
 */

interface BookingPayload {
  job_id?: string;
  calcom_uid: string;
  client: {
    email: string;
    name: string;
    phone: string;
  };
  service: {
    type: string;
    duration_minutes: number;
    scheduled_at: string;
  };
  property: {
    type: string;
    address: string;
    access_code?: string;
    unit_name?: string;
    special_requests?: string;
    suburb?: string;
  };
}

interface PropertyTemplateRoom {
  room_name: string;
  tasks: string[];
}

function generateJobId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `SS-${year}-${seq}`;
}

function isValidPayload(body: unknown): body is BookingPayload {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (!b.client || typeof b.client !== 'object') return false;
  if (!b.service || typeof b.service !== 'object') return false;
  if (!b.property || typeof b.property !== 'object') return false;
  const client = b.client as Record<string, unknown>;
  const service = b.service as Record<string, unknown>;
  const property = b.property as Record<string, unknown>;
  return (
    typeof b.calcom_uid === 'string' &&
    typeof client.email === 'string' &&
    typeof client.name === 'string' &&
    typeof client.phone === 'string' &&
    typeof service.type === 'string' &&
    typeof service.scheduled_at === 'string' &&
    typeof property.type === 'string' &&
    typeof property.address === 'string'
  );
}

function generateTraceId(): string {
  if (typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/n8n/booking-ingested',
    method: 'POST',
    auth: 'Bearer token',
  });
}

export async function POST(request: NextRequest) {
  const traceId = generateTraceId();

  try {
    // ─── Auth: Bearer token validation ───
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const expectedSecret = env?.INTERNAL_PORTAL_N8N_WEBHOOK_SECRET;

    if (!expectedSecret || token !== expectedSecret) {
      console.warn(`[${traceId}] Unauthorized n8n webhook attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─── Parse & validate payload ───
    const body = await request.json();
    if (!isValidPayload(body)) {
      return NextResponse.json(
        { error: 'Invalid payload structure', traceId },
        { status: 400 }
      );
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Database unavailable', traceId },
        { status: 503 }
      );
    }

    // ─── Normalize property type ───
    const normalizedType = body.property.type
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    // ─── Fetch property template ───
    const template = await db
      .prepare('SELECT rooms_json FROM property_templates WHERE property_type = ? AND is_active = 1')
      .bind(normalizedType)
      .first<{ rooms_json: string }>();

    if (!template) {
      return NextResponse.json(
        {
          error: 'Unknown property type',
          property_type: normalizedType,
          supported: ['studio', '1_bed', '2_bed', '3_bed', '4_plus_bed', 'commercial'],
          traceId,
        },
        { status: 400 }
      );
    }

    let rooms: PropertyTemplateRoom[];
    try {
      rooms = JSON.parse(template.rooms_json) as PropertyTemplateRoom[];
    } catch {
      return NextResponse.json(
        { error: 'Corrupt property template', traceId },
        { status: 500 }
      );
    }

    // ─── Generate job ID ───
    const jobId = body.job_id || generateJobId();

    // ─── Check for duplicate Cal.com UID ───
    const existing = await db
      .prepare('SELECT id FROM jobs WHERE calcom_uid = ?')
      .bind(body.calcom_uid)
      .first<{ id: string }>();

    if (existing) {
      return NextResponse.json(
        {
          job_id: existing.id,
          calcom_uid: body.calcom_uid,
          status: 'duplicate',
          traceId,
        },
        { status: 409 }
      );
    }

    // Geocode the real address for precise GPS arrival confirmation later.
    // Best-effort - a booking with no geocode falls back to suburb-level
    // matching (see lib/geofence.ts) rather than blocking ingestion.
    const geocoded = await geocodeAddress(
      body.property.suburb ? `${body.property.address}, ${body.property.suburb}` : body.property.address
    );

    // ─── Insert job ───
    await db
      .prepare(
        `INSERT INTO jobs (
          id, calcom_uid, client_email, client_name, client_phone,
          property_type, property_address, property_access_code, property_unit_name,
          special_requests, service_type, scheduled_at, duration_minutes, status, suburb,
          geocoded_lat, geocoded_long, geocoded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        jobId,
        body.calcom_uid,
        body.client.email,
        body.client.name,
        body.client.phone,
        normalizedType,
        body.property.address,
        body.property.access_code || null,
        body.property.unit_name || null,
        body.property.special_requests || null,
        body.service.type,
        body.service.scheduled_at,
        body.service.duration_minutes || 120,
        'scheduled',
        body.property.suburb || null,
        geocoded?.lat ?? null,
        geocoded?.long ?? null,
        geocoded ? new Date().toISOString() : null
      )
      .run();

    // ─── Expand checklist from template ───
    let taskOrder = 0;
    for (const room of rooms) {
      for (const task of room.tasks) {
        taskOrder++;
        await db
          .prepare(
            `INSERT INTO job_checklists (job_id, room_name, task_name, task_order) VALUES (?, ?, ?, ?)`
          )
          .bind(jobId, room.room_name, task, taskOrder)
          .run();
      }
    }

    // ─── Auto-assign cleaners for AUTO-pool jobs ───
    // MANUAL-pool jobs (deep clean, commercial, move-in/out) are intentionally
    // left unassigned here - the admin assigns 2+ cleaners by hand via the
    // Pool Management page, since a single system pick isn't appropriate for
    // jobs that need multiple people in the booking window.
    let assignedCleaners: string[] = [];
    const serviceType = (body.service.type || 'RESIDENTIAL').toUpperCase();
    const poolType = await resolveAssignmentPool(db, body.service.type);
    const jobDate = body.service.scheduled_at.split('T')[0];
    const timeSlot = body.service.scheduled_at.split('T')[1]?.slice(0, 5) || null;

    if (poolType === 'AUTO') {
      try {
        const trainingDb = await getTrainingDb();
        if (trainingDb) {
          // Note: this scorer's same-day/same-suburb clustering check only
          // sees bookings_assignments/bookings (the direct marketing-site
          // booking path) - it can't see other jobs already assigned via
          // this Cal.com/n8n `jobs` table pathway, since the two are
          // separate systems. Passing suburb still gives a partial benefit
          // (preferring a cleaner who has a `bookings`-side job in the same
          // area that day) even though full cross-system clustering would
          // need unifying the two booking systems, which is a larger,
          // separate change.
          const candidates = await scoreAssignmentCandidates(
            db,
            trainingDb,
            jobDate,
            timeSlot as any,
            body.property.suburb
          );

          if (candidates.length > 0) {
            // cleanerId here is a cleaner_profiles.id, produced by
            // scoreAssignmentCandidates (@/lib/pool-management/pool-assignment) -
            // NOT MIGRATED to staff for the same FK reason documented there
            // (cleaner_profiles is kept around specifically so this id stays
            // resolvable).
            const cleanerIds = candidates.slice(0, 1).map((c) => c.cleanerId);
            const placeholders = cleanerIds.map(() => '?').join(',');
            const paysheetResult = await db
              .prepare(
                `SELECT paysheet_code FROM cleaner_profiles WHERE id IN (${placeholders})`
              )
              .bind(...cleanerIds)
              .all<{ paysheet_code: string }>();

            assignedCleaners = (paysheetResult.results || [])
              .map((r) => r.paysheet_code)
              .filter(Boolean);

            if (assignedCleaners.length > 0) {
              await db
                .prepare(
                  `UPDATE jobs
                   SET team_members = ?, status = 'assigned', updated_at = datetime('now')
                   WHERE id = ?`
                )
                .bind(JSON.stringify(assignedCleaners), jobId)
                .run();
            }
          }
        }
      } catch (assignErr) {
        console.warn(`[${traceId}] Auto-assign failed for job ${jobId}:`, assignErr);
      }
    }

    // ─── Log audit event ───
    await db
      .prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        0, // system user
        'job_created',
        'job',
        jobId,
        JSON.stringify({
          calcom_uid: body.calcom_uid,
          client_email: body.client.email,
          property_type: normalizedType,
          checklist_items: taskOrder,
          source: 'n8n_webhook',
          trace_id: traceId,
        })
      )
      .run();

    return NextResponse.json(
      {
        job_id: jobId,
        calcom_uid: body.calcom_uid,
        status: assignedCleaners.length > 0 ? 'assigned' : 'scheduled',
        checklist_items: taskOrder,
        team_members: assignedCleaners,
        traceId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[${traceId}] Booking ingestion error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', traceId },
      { status: 500 }
    );
  }
}
