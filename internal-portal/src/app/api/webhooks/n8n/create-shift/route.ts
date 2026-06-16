import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCloudflareContext } from '@/lib/runtime-context';
import { createShiftAssignmentInErpNext } from '@/lib/cleaner-integrations';

/**
 * n8n → Internal Portal: Create ERPNext Shift Assignments for a Job
 * Triggered by n8n after cleaners are assigned to a job.
 * Creates a Shift Assignment in ERPNext for each cleaner.
 *
 * Auth: Bearer token matching INTERNAL_PORTAL_N8N_WEBHOOK_SECRET
 */

interface CreateShiftPayload {
  job_id: string;
  cleaner_ids?: string[]; // paysheet_codes — optional, looked up from job if omitted
  shift_type?: string;
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
    endpoint: '/api/webhooks/n8n/create-shift',
    method: 'POST',
    auth: 'Bearer token',
  });
}

export async function POST(request: NextRequest) {
  const traceId = generateTraceId();

  try {
    // ─── Auth ───
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const { env } = await getCloudflareContext({ async: true }) as unknown as { env: any };
    const expectedSecret = env?.INTERNAL_PORTAL_N8N_WEBHOOK_SECRET;

    if (!expectedSecret || token !== expectedSecret) {
      console.warn(`[${traceId}] Unauthorized n8n create-shift attempt`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ─── Validate input ───
    const body = (await request.json()) as unknown;
    if (
      typeof body !== 'object' ||
      body === null ||
      !('job_id' in body)
    ) {
      return NextResponse.json(
        { error: 'Missing job_id', traceId },
        { status: 400 }
      );
    }
    let { job_id, cleaner_ids, shift_type = 'Full Day' } = body as CreateShiftPayload;

    const db = await getDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Database unavailable', traceId },
        { status: 503 }
      );
    }

    // ─── Fetch job ───
    const job = await db
      .prepare(
        `SELECT id, scheduled_at, property_address, status, team_members FROM jobs WHERE id = ?`
      )
      .bind(job_id)
      .first<{
        id: string;
        scheduled_at: string;
        property_address: string;
        status: string;
        team_members: string | null;
      }>();

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', job_id, traceId },
        { status: 404 }
      );
    }

    // ─── Resolve cleaner_ids from job if not provided ───
    if (!cleaner_ids || cleaner_ids.length === 0) {
      if (job.team_members) {
        try {
          const parsed = JSON.parse(job.team_members);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cleaner_ids = parsed;
          }
        } catch {
          // ignore parse error
        }
      }
    }

    if (!cleaner_ids || cleaner_ids.length === 0) {
      return NextResponse.json(
        { error: 'No cleaners assigned to this job', job_id, traceId },
        { status: 400 }
      );
    }

    const jobDate = job.scheduled_at.split('T')[0];

    // ─── Create ERPNext shift assignments ───
    const shiftResults: { cleaner_id: string; status: string; reference?: string; reason?: string }[] = [];

    for (const cleanerId of cleaner_ids) {
      const result = await createShiftAssignmentInErpNext({
        traceId,
        employeeId: cleanerId,
        shiftType: shift_type,
        startDate: jobDate,
        endDate: jobDate,
        jobReference: job.id,
      });

      shiftResults.push({
        cleaner_id: cleanerId,
        status: result.status,
        reference: result.reference,
        reason: result.reason,
      });
    }

    // ─── Update job with shift mapping ───
    const successfulShifts = shiftResults.filter((r) => r.status === 'configured');
    const shiftMapping = successfulShifts.reduce(
      (acc, r) => {
        acc[r.cleaner_id] = r.reference!;
        return acc;
      },
      {} as Record<string, string>
    );

    await db
      .prepare(
        `UPDATE jobs
         SET erpnext_shift_id = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(JSON.stringify(shiftMapping), job_id)
      .run();

    // ─── Audit log ───
    await db
      .prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        0,
        'shifts_created',
        'job',
        job_id,
        JSON.stringify({
          shift_results: shiftResults,
          shift_type,
          job_date: jobDate,
          trace_id: traceId,
        })
      )
      .run();

    return NextResponse.json(
      {
        job_id,
        shift_type,
        job_date: jobDate,
        results: shiftResults,
        successful: successfulShifts.length,
        failed: shiftResults.length - successfulShifts.length,
        traceId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`[${traceId}] Create shift error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', traceId },
      { status: 500 }
    );
  }
}
