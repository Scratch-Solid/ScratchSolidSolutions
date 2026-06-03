export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

/**
 * GET /api/v2/supervisor/jobs
 * List jobs for a supervisor with optional filters.
 * Auth: supervisor or admin
 */

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin', 'staff']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const userId = authResult.user?.id;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date'); // YYYY-MM-DD
    const myJobsOnly = searchParams.get('mine') === 'true';

    let query = `
      SELECT
        j.id,
        j.calcom_uid,
        j.client_name,
        j.client_email,
        j.client_phone,
        j.property_type,
        j.property_address,
        j.property_unit_name,
        j.special_requests,
        j.service_type,
        j.scheduled_at,
        j.duration_minutes,
        j.status,
        j.supervisor_id,
        j.team_members,
        j.zoho_invoice_id,
        j.payment_status,
        j.erpnext_shift_id,
        j.created_at,
        j.updated_at
      FROM jobs j
      WHERE 1=1
    `;
    const binds: (string | number)[] = [];

    if (myJobsOnly && userId) {
      query += ' AND j.supervisor_id = ?';
      binds.push(userId);
    }

    if (status) {
      query += ' AND j.status = ?';
      binds.push(status);
    }

    if (date) {
      query += " AND date(j.scheduled_at) = ?";
      binds.push(date);
    }

    query += ' ORDER BY j.scheduled_at ASC';

    const stmt = db.prepare(query);
    const result = binds.length > 0 ? stmt.bind(...binds).all() : stmt.all();
    const jobs = (await result).results || [];

    // Parse team_members JSON for each job
    const parsedJobs = jobs.map((job: any) => ({
      ...job,
      team_members: job.team_members ? JSON.parse(job.team_members) : [],
      erpnext_shift_id: job.erpnext_shift_id ? JSON.parse(job.erpnext_shift_id) : null,
    }));

    return withSecurityHeaders(
      NextResponse.json({
        success: true,
        data: parsedJobs,
        count: parsedJobs.length,
      }),
      traceId
    );
  } catch (error) {
    console.error('Supervisor jobs fetch error:', error);
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, error: 'Failed to fetch jobs', traceId },
        { status: 500 }
      ),
      traceId
    );
  }
}
