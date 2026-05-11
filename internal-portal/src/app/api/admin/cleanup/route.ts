export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { shouldPurge } from '@/lib/data-retention';

export async function POST(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const { results: oldSessions } = await db.prepare('SELECT id, created_at FROM sessions WHERE created_at < datetime("now", "-30 days")').all() as any;
    let purged = 0;
    for (const session of (oldSessions || [])) {
      if (shouldPurge(session.created_at, 'sessions')) {
        await db.prepare('DELETE FROM sessions WHERE id = ?').bind(session.id).run();
        purged++;
      }
    }

    const { results: deletedUsers } = await db.prepare('SELECT id, soft_delete_at FROM users WHERE deleted = 1 AND soft_delete_at < datetime("now", "-30 days")').all() as any;
    let hardDeleted = 0;
    for (const user of (deletedUsers || [])) {
      if (shouldPurge(user.soft_delete_at, 'soft_deleted_users')) {
        await db.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
        await db.prepare('DELETE FROM cleaner_profiles WHERE user_id = ?').bind(user.id).run();
        await db.prepare('DELETE FROM business_profiles WHERE user_id = ?').bind(user.id).run();
        hardDeleted++;
      }
    }

    return NextResponse.json({ purged_sessions: purged, hard_deleted_users: hardDeleted });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cleanup' }, { status: 500 });
  }
}
