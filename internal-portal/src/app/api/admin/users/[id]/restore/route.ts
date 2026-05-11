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
    const existing = await db.prepare('SELECT id, email, role, deleted FROM users WHERE id = ?').bind(userId).first();
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if ((existing as any).deleted !== 1) {
      return NextResponse.json({ error: 'User is not deleted' }, { status: 400 });
    }

    await db.prepare(
      `UPDATE users SET deleted = 0, soft_delete_at = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(userId).run();

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    await logAuditEvent(db, {
      user_id: (adminUser as any).user_id,
      action: 'user_restored',
      resource: 'user',
      resource_id: String(userId),
      ip_address: ip,
      details: `Restored user ${(existing as any).email} (role: ${(existing as any).role})`,
      success: true
    });

    return NextResponse.json({ success: true, message: 'User restored' });
  } catch (error) {
    console.error('Restore user error:', error);
    return NextResponse.json({ error: 'Failed to restore user' }, { status: 500 });
  }
}
