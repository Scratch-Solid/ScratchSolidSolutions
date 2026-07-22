export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logAuditEvent } from '@/lib/db';

// POST /api/admin/employees/[id]/promote-to-supervisor — grants an existing
// cleaner account supervisor duties (role='staff') without creating a new
// account or touching their paysheet code. Supervisor accounts created fresh
// (via Add Employee) get their own Supv-prefixed code, but that's purely
// cosmetic (see cleaner-integrations.ts) — nothing downstream parses it, so
// a promoted cleaner keeps their existing Scratch-prefixed code.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { user: adminUser, db } = authResult;

  try {
    const { id } = await params;
    const userId = Number(id);

    const target = await db.prepare(
      'SELECT id, role FROM users WHERE id = ?'
    ).bind(userId).first() as { id: number; role: string } | null;

    if (!target) {
      return withSecurityHeaders(NextResponse.json({ error: 'Employee not found' }, { status: 404 }), traceId);
    }

    if (target.role !== 'cleaner') {
      return withSecurityHeaders(NextResponse.json({ error: `Only cleaner accounts can be promoted to supervisor (current role: ${target.role})` }, { status: 400 }), traceId);
    }

    await db.prepare(
      `UPDATE users SET role = 'staff', updated_at = datetime('now') WHERE id = ?`
    ).bind(userId).run();

    const profile = await db.prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.onboarding_stage,
              s.paysheet_code, s.first_name, s.last_name, s.status, s.department
       FROM users u
       LEFT JOIN staff s ON s.user_id = u.id
       WHERE u.id = ?`
    ).bind(userId).first();

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    await logAuditEvent(db, {
      user_id: (adminUser as any).user_id ?? (adminUser as any).id,
      action: 'employee_promoted_to_supervisor',
      resource: 'user',
      resource_id: String(userId),
      ip_address: ip,
      details: JSON.stringify({ previousRole: 'cleaner', newRole: 'staff' }),
      success: true,
    });

    return withSecurityHeaders(NextResponse.json({ success: true, profile }), traceId);
  } catch (error) {
    const response = NextResponse.json({ error: `Failed to promote employee: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
