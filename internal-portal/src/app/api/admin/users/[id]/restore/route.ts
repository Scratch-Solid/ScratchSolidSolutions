import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  const { db } = authResult;

  try {
    const id = params.id;
    await db.prepare('UPDATE users SET deleted = 0, soft_delete_at = NULL WHERE id = ?').bind(id).run();
    return NextResponse.json({ message: 'User restored' });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: 'Restore failed' }, { status: 500 });
  }
}
