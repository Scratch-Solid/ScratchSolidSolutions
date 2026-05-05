import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const id = params.id;
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === 'true';

    if (hard) {
      await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
      await db.prepare('DELETE FROM cleaner_profiles WHERE user_id = ?').bind(id).run();
      await db.prepare('DELETE FROM business_profiles WHERE user_id = ?').bind(id).run();
      return NextResponse.json({ message: 'User hard deleted' });
    } else {
      await db.prepare('UPDATE users SET deleted = 1, soft_delete_at = ? WHERE id = ?')
        .bind(new Date().toISOString(), id).run();
      return NextResponse.json({ message: 'User soft deleted (30-day grace)' });
    }
  } catch (error) {
    const response = NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
