import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const id = params.id;
    await db.prepare(
      'UPDATE weekend_requests SET status = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind('cancelled', id).run();
    const response = NextResponse.json({ message: 'Weekend request cancelled' });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    console.error('Error cancelling weekend request:', error);
    const response = NextResponse.json({ error: 'Failed to cancel weekend request' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
