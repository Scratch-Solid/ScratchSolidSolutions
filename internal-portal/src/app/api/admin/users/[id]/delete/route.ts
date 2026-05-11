export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { logAuditEvent } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { user: adminUser, db } = authResult;

  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const existing = await db.prepare('SELECT id, email, role FROM users WHERE id = ?').bind(userId).first();
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.prepare(
      `UPDATE users SET deleted = 1, soft_delete_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(userId).run();

    await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    await logAuditEvent(db, {
      user_id: (adminUser as any).user_id,
      action: 'user_soft_deleted',
      resource: 'user',
      resource_id: String(userId),
      ip_address: ip,
      details: `Soft-deleted user ${(existing as any).email} (role: ${(existing as any).role})`,
      success: true
    });

    return NextResponse.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
