import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb(request);
  if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });

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
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
