import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const auth = await withAuth(request, ['admin']);
  if (auth instanceof NextResponse) return auth;
  const { user, db } = auth;

  try {
    const body = await request.json() as any;
    const { staff_id, new_pool, reason } = body;

    if (!staff_id || !new_pool) {
      return NextResponse.json({ error: 'Missing staff_id or new_pool' }, { status: 400 });
    }

    if (!['INDIVIDUAL', 'BUSINESS'].includes(new_pool)) {
      return NextResponse.json({ error: 'Invalid pool type. Must be INDIVIDUAL or BUSINESS' }, { status: 400 });
    }

    if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    // Get current pool type
    const current = await db.prepare(`SELECT pool_type FROM staff WHERE id = ?`).bind(staff_id).first<{ pool_type: string }>();

    if (!current) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Update staff pool_type
    await db.prepare(`UPDATE staff SET pool_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(new_pool, staff_id).run();

    // Record transition in audit table
    await db.prepare(`
      INSERT INTO staff_pool_transitions (staff_id, from_pool, to_pool, reason, transitioned_by, transitioned_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(staff_id, current.pool_type, new_pool, reason || 'Admin reassignment', user.id).run();

    return NextResponse.json({ success: true, staff_id, from_pool: current.pool_type, to_pool: new_pool });
  } catch (error) {
    console.error('Pool transition error:', error);
    return NextResponse.json({ error: `Failed to update pool assignment: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
